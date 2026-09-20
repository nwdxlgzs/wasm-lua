const releaseRoot = new URL('./release/', document.baseURI);
const editorUrl = new URL('editor/wasm-lua-editor.js', releaseRoot).href;
const editorStyle = document.createElement('link');
editorStyle.rel = 'stylesheet';
editorStyle.href = new URL('editor/wasm-lua-editor.css', releaseRoot).href;
const editorStyleReady = new Promise((resolve, reject) => {
  editorStyle.onload = resolve;
  editorStyle.onerror = () => reject(new Error('无法加载 Monaco/release 编辑器样式。'));
});
document.head.append(editorStyle);

window.luaBindingReady = (async () => {
  await editorStyleReady;
  const ui = await import(/* @vite-ignore */ editorUrl);
  const root = document.querySelector('#host-app');

  const renderFiles = controller => {
    const host = root.querySelector('#files');
    const scrollTop = host.scrollTop;
    const state = controller.snapshot();
    host.replaceChildren(...state.files.map(file => {
      const button = document.createElement('button');
      button.className = 'file-row' + (file.name === state.activeFile ? ' active' : '');
      button.textContent = file.name + (file.dirty ? '  ●' : '');
      button.onclick = () => controller.openFile(file.name);
      return button;
    }));
    host.scrollTop = scrollTop;
  };

  const debugPanel = {
    mount(host) {
      const node = document.createElement('div');
      node.className = 'debug-list';
      host.append(node);
      this.host = node;
      this.scopeOpen = { locals: true, upvalues: true, globals: false };
      this.watchDraft = '';
    },
    update(_host, { controller, state }) {
      const host = this.host;
      const scrollTop = host.closest('[data-lua-component="debugPanel"]').scrollTop;
      const activeWatch = document.activeElement === host.querySelector('.watch-box');
      const selectionStart = activeWatch ? document.activeElement.selectionStart : null;
      const selectionEnd = activeWatch ? document.activeElement.selectionEnd : null;
      const section = (title, rows) => {
        const wrapper = document.createElement('section');
        wrapper.className = 'debug-section';
        const heading = document.createElement('div');
        heading.className = 'debug-heading';
        heading.textContent = title;
        wrapper.append(heading, ...rows);
        return wrapper;
      };
      const row = (label, value = '') => {
        const node = document.createElement('button');
        node.className = 'debug-row';
        node.append(Object.assign(document.createElement('span'), { textContent: label }),
          Object.assign(document.createElement('span'), { textContent: value }));
        return node;
      };
      const frames = state.stack.map(frame => {
        const node = row(frame.name, `${frame.source}:${frame.line}`);
        node.classList.toggle('active', frame.id === state.selectedFrame);
        node.onclick = async () => {
          controller.editor.setPosition({ lineNumber: frame.line, column: frame.column ?? 1 });
          controller.editor.revealLineInCenter(frame.line);
          await controller.refreshDebug(frame.id);
        };
        return node;
      });
      const variableRow = variable => {
        const node = document.createElement('div');
        node.className = 'host-variable-row';
        node.style.paddingLeft = `${8 + (variable.depth ?? 0) * 14}px`;
        const toggle = document.createElement('button');
        toggle.textContent = variable.variablesReference
          ? (variable.expanded ? '▾' : '▸') : '·';
        toggle.disabled = !variable.variablesReference;
        toggle.setAttribute('aria-label', variable.variablesReference
          ? `${variable.expanded ? '收起' : '展开'}变量 ${variable.name}`
          : `变量 ${variable.name} 没有子项`);
        toggle.onclick = () => controller.expandVariable(variable);
        const name = document.createElement('span');
        name.textContent = variable.name;
        name.title = variable.name;
        const value = document.createElement('span');
        value.className = 'variable-value';
        value.textContent = variable.value;
        value.title = variable.value;
        const edit = document.createElement('button');
        edit.textContent = '✎';
        edit.setAttribute('aria-label', `修改变量 ${variable.name}`);
        edit.onclick = () => editVariable(variable, controller);
        node.append(toggle, name, value, edit);
        return node;
      };
      const variableGroups = [
        ['locals', '局部变量'], ['upvalues', 'Upvalue'], ['globals', '全局变量']
      ].map(([key, label]) => {
        const group = section(label, []);
        const heading = group.querySelector('.debug-heading');
        const rows = state.variables.filter(variable => variable.scopeKind === key);
        const open = this.scopeOpen[key];
        const button = document.createElement('button');
        button.className = 'debug-row';
        button.textContent = `${open ? '▾' : '▸'} ${label} (${rows.length})`;
        button.setAttribute('aria-expanded', String(open));
        button.onclick = () => {
          this.scopeOpen[key] = !open;
          this.update(this.host, { controller, state: controller.snapshot() });
        };
        heading.replaceWith(button);
        if (open) group.append(...rows.map(variableRow));
        return group;
      });
      const watches = state.watches.map((watch, index) => {
        const node = row(watch.expression, watch.value);
        node.title = '双击移除监视';
        node.ondblclick = () => controller.removeWatch(index);
        return node;
      });
      const watch = document.createElement('input');
      watch.className = 'watch-box';
      watch.placeholder = '添加监视并按 Enter';
      watch.value = this.watchDraft;
      watch.oninput = () => { this.watchDraft = watch.value; };
      watch.onkeydown = event => {
        if (event.key === 'Enter' && watch.value.trim()) {
          controller.addWatch(watch.value);
          this.watchDraft = '';
          watch.value = '';
        }
      };
      const points = state.breakpoints.map(point => {
        const node = row(`${point.file ?? state.activeFile}:${point.line}`,
          point.verified === false ? '未验证' : point.condition ? '条件断点' : '断点');
        node.onclick = () => openBreakpointDialog(point, controller);
        node.title = '点击配置断点';
        return node;
      });
      host.replaceChildren(section('调用栈', frames), ...variableGroups,
        section('监视', [watch, ...watches]), section('断点', points));
      if (activeWatch) {
        watch.focus({ preventScroll: true });
        if (selectionStart != null && selectionEnd != null)
          watch.setSelectionRange(selectionStart, selectionEnd);
      }
      host.closest('[data-lua-component="debugPanel"]').scrollTop = scrollTop;
    }
  };

  const debugConsole = {
    mount(host) {
      const console = document.createElement('div');
      console.className = 'console';
      const output = document.createElement('pre');
      output.dataset.luaBind = 'output';
      const input = document.createElement('input');
      input.setAttribute('aria-label', '调试控制台表达式');
      input.dataset.luaCommandOnEnter = 'evaluate';
      input.dataset.luaEnabled = 'paused';
      input.placeholder = '暂停时求值';
      console.append(output, input);
      host.append(console);
    },
    update(host, { state }) {
      host.querySelector('pre').textContent = state.output || '运行后输出显示在这里。';
      host.querySelector('input').disabled = !state.paused;
    }
  };

  const keybindingSettings = {
    mount(host, context) {
      const backdrop = document.createElement('div');
      backdrop.className = 'dialog-backdrop';
      backdrop.hidden = true;
      const panel = document.createElement('section');
      panel.className = 'dialog';
      const title = document.createElement('h2');
      title.textContent = '宿主按键设置组件';
      const help = document.createElement('p');
      help.textContent = '点击某一功能后再按组合键。每项可独立恢复默认；Monaco 自带窗口和快捷键行为不被替换。';
      const rows = document.createElement('div');
      const error = document.createElement('div');
      error.className = 'error';
      const footer = document.createElement('footer');
      const close = document.createElement('button');
      close.textContent = '关闭';
      close.onclick = () => { backdrop.hidden = true; };
      footer.append(close);
      panel.append(title, help, rows, error, footer);
      backdrop.append(panel);
      host.append(backdrop);
      this.backdrop = backdrop;
      this.rows = rows;
      this.error = error;
      this.context = context;
      root.querySelector('#keybindings').onclick = () => {
        backdrop.hidden = false;
        this.render();
      };
    },
    update(_host, context) {
      this.context = context;
      if (!this.backdrop.hidden) this.render();
    },
    render() {
      const { controller } = this.context;
      const values = controller.getKeybindings();
      this.rows.replaceChildren(...Object.entries(ui.COMMAND_LABELS).map(([command, label]) => {
        const row = document.createElement('div');
        row.className = 'binding-row';
        const name = document.createElement('span');
        name.textContent = label;
        const record = document.createElement('button');
        record.textContent = values[command] ? ui.displayKeybinding(values[command]) : '未绑定';
        record.onclick = () => {
          record.classList.add('recording');
          record.textContent = '请按组合键…';
          record.focus();
        };
        record.onkeydown = async event => {
          if (!record.classList.contains('recording')) return;
          if (event.key === 'Escape') { this.render(); return; }
          event.preventDefault();
          event.stopPropagation();
          const binding = ui.keyboardEventToBinding(event);
          if (!binding) return;
          try {
            await controller.setKeybindings({ ...values, [command]: binding });
            this.error.textContent = '';
          } catch (cause) { this.error.textContent = cause.message; }
          this.render();
        };
        const reset = document.createElement('button');
        reset.textContent = '默认';
        reset.onclick = async () => controller.setKeybindings({
          ...values, [command]: ui.DEFAULT_KEYBINDINGS[command] ?? ''
        });
        row.append(name, record, reset);
        return row;
      }));
    }
  };

  const hostPlugin = ui.defineLuaWorkbenchPlugin({
    id: 'embedded-host-components',
    components: { debugPanel, debugConsole, keybindingSettings },
    contributions: [{
      id: 'host-action', zone: 'toolbar', order: 10,
      mount(host, { controller }) {
        const button = document.createElement('button');
        button.textContent = '宿主插件命令';
        button.onclick = () => controller.appendOutput('[宿主插件] 命令已执行\n');
        host.append(button);
      }
    }]
  });

  const binding = await ui.bindLuaWorkbench(root, {
    mode: 'debugger', storageKey: 'embedded-release-acceptance', plugins: [hostPlugin]
  });
  window.luaBinding = binding;
  root.dataset.luaArtifact = 'debug';

  const breakpointDialog = root.querySelector('#breakpoint-dialog');
  const breakpointForm = breakpointDialog.querySelector('form');
  let editingBreakpoint = null;
  const variableDialog = root.querySelector('#variable-dialog');
  const variableForm = variableDialog.querySelector('form');
  let editingVariable = null;
  function openBreakpointDialog(point, controller = binding.controller) {
    editingBreakpoint = { ...point };
    breakpointForm.elements.enabled.checked = point.enabled !== false;
    for (const name of ['condition', 'hitCondition', 'logMessage'])
      breakpointForm.elements[name].value = point[name] ?? '';
    breakpointForm.querySelector('.error').textContent = point.message ?? '';
    breakpointDialog.hidden = false;
    breakpointForm.elements.condition.focus();
  }
  function editVariable(variable) {
    editingVariable = variable;
    variableForm.querySelector('h2').textContent = `修改变量 ${variable.name}`;
    variableForm.elements.value.value = variable.value;
    variableForm.querySelector('.error').textContent = '';
    variableDialog.hidden = false;
    variableForm.elements.value.focus();
    variableForm.elements.value.select();
  }
  root.addEventListener('lua-breakpointedit', event =>
    openBreakpointDialog(event.detail.point, event.detail.controller));
  root.querySelector('#add-breakpoint').onclick = () =>
    binding.controller.toggleBreakpoint(
      binding.controller.editor.getPosition()?.lineNumber ?? 1);
  breakpointForm.onsubmit = async event => {
    event.preventDefault();
    const data = new FormData(breakpointForm);
    await binding.controller.updateBreakpoint(editingBreakpoint.line, {
      enabled: data.get('enabled') === 'on',
      condition: String(data.get('condition') ?? '').trim(),
      hitCondition: String(data.get('hitCondition') ?? '').trim(),
      logMessage: String(data.get('logMessage') ?? '').trim()
    });
    breakpointDialog.hidden = true;
  };
  breakpointForm.querySelector('[data-action="cancel"]').onclick = () => {
    breakpointDialog.hidden = true;
  };
  breakpointForm.querySelector('[data-action="remove"]').onclick = async () => {
    if (editingBreakpoint) await binding.controller.removeBreakpoint(editingBreakpoint.line);
    breakpointDialog.hidden = true;
  };
  variableForm.onsubmit = async event => {
    event.preventDefault();
    try {
      await binding.controller.setVariable(editingVariable, variableForm.elements.value.value);
      variableDialog.hidden = true;
    } catch (error) {
      variableForm.querySelector('.error').textContent = error.message;
    }
  };
  variableForm.querySelector('[data-action="cancel"]').onclick = () => {
    variableDialog.hidden = true;
  };
  const refreshHost = event => {
    renderFiles(binding.controller);
    const state = event?.detail?.state ?? binding.controller.snapshot();
    root.querySelector('#host-events').textContent =
      `${state.backend} · ${state.profile} · ${state.paused ? '暂停' : state.running ? '运行' : '空闲'}`;
    const problems = root.querySelector('#problems');
    problems.replaceChildren(...state.problems.map(problem => {
      const line = document.createElement('button');
      line.className = 'debug-row';
      line.textContent = `${problem.startLineNumber}:${problem.startColumn} ${problem.message}`;
      line.onclick = () => {
        binding.controller.editor.setPosition({ lineNumber: problem.startLineNumber,
          column: problem.startColumn });
        binding.controller.editor.focus();
      };
      return line;
    }));
  };
  root.addEventListener('lua-statechange', refreshHost);
  root.addEventListener('lua-error', event => {
    binding.controller.appendOutput(`[宿主错误] ${event.detail.error.message}\n`, 'stderr');
  });
  for (const button of root.querySelectorAll('[data-panel]')) button.onclick = () => {
    for (const item of root.querySelectorAll('[data-panel]'))
      item.classList.toggle('active', item === button);
    root.querySelector('[data-lua-component="debugConsole"]').hidden =
      button.dataset.panel !== 'console';
    root.querySelector('#problems').hidden = button.dataset.panel !== 'problems';
  };
  refreshHost();
  return binding;
})();

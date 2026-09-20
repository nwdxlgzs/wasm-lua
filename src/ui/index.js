import { LuaWorkbench } from './workbench.js';
import './styles.css';
import { registerLuaPluginOutlet } from './plugin-outlet.js';

export { bindLuaWorkbench } from './bind.js';
export {
  createLuaWorkbenchController, HOST_DEFINITION, LuaWorkbenchController, SAMPLE
} from './controller.js';
export { LuaWorkbench } from './workbench.js';
export {
  createLuaWorkbenchThemePlugin, defineLuaWorkbenchPlugin
} from './plugins.js';
export {
  COMMAND_LABELS, DEFAULT_KEYBINDINGS, displayKeybinding, parseKeybinding,
  resolveKeybindings
} from './keybindings.js';
export { keyboardEventToBinding } from './keybinding-recorder.js';

/** Register the bundled shell on demand; importing the module has no DOM side effect. */
export function registerLuaWorkbenchElement(tagName = 'lua-workbench') {
  registerLuaPluginOutlet();
  if (!customElements.get(tagName)) customElements.define(tagName, LuaWorkbench);
  return customElements.get(tagName);
}

/** Mount the bundled shell into any host-owned container. */
/**
 * @param {Element|string} target
 * @param {import('./controller.js').LuaWorkbenchOptions & {tagName?: string}} [options]
 * @returns {LuaWorkbench}
 */
export function mountLuaWorkbench(target, options = {}) {
  const host = typeof target === 'string' ? document.querySelector(target) : target;
  if (!(host instanceof Element)) throw new TypeError('找不到工作台挂载容器。');
  const tagName = options.tagName ?? 'lua-workbench';
  registerLuaWorkbenchElement(tagName);
  const element = /** @type {LuaWorkbench} */ (document.createElement(tagName));
  element.workbenchOptions = { ...options };
  for (const [name, value] of Object.entries(options)) {
    if (name === 'tagName' || value === undefined) continue;
    const attribute = name.replace(/[A-Z]/g, letter => '-' + letter.toLowerCase());
    if (typeof value === 'object' || typeof value === 'function') element[name] = value;
    else element.setAttribute(attribute, String(value));
  }
  host.append(element);
  return /** @type {LuaWorkbench} */ (element);
}

/** Dispose and detach a shell created by mountLuaWorkbench(). */
export function unmountLuaWorkbench(element) {
  if (!(element instanceof LuaWorkbench))
    throw new TypeError('unmountLuaWorkbench() 需要 LuaWorkbench 实例。');
  element.dispose();
  element.remove();
}

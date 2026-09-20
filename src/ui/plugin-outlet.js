/**
 * Imperative outlet used by the Lit shell to mount host framework components.
 * Plugins own the DOM below this element; Lit only owns the outlet itself.
 */
export class LuaPluginOutlet extends HTMLElement {
  connectedCallback() { this.remount(); }

  static get observedAttributes() { return ['mount-key']; }
  attributeChangedCallback() { if (this.isConnected) this.remount(); }

  get controller() {
    return /** @type {import('./workbench.js').LuaWorkbench|null} */ (
      this.closest('lua-workbench'))?.controller;
  }

  remount() {
    this.cleanup?.();
    this.cleanup = undefined;
    this.replaceChildren();
    const controller = this.controller;
    const mount = controller?.getPluginMount(this.getAttribute('mount-key') ?? '');
    if (!mount || mount === false) return;
    const context = controller.pluginContext(mount.plugin, {
      host: this,
      shell: this.closest('lua-workbench')
    });
    const result = mount.mount(this, context);
    if (result instanceof Node) this.append(result);
    else if (typeof result === 'function') this.cleanup = result;
    else if (result?.dispose) this.cleanup = () => result.dispose();
  }

  update() {
    const controller = this.controller;
    const mount = controller?.getPluginMount(this.getAttribute('mount-key') ?? '');
    if (!mount || mount === false) return;
    if (mount.update) mount.update(this, controller.pluginContext(mount.plugin, {
      host: this, shell: this.closest('lua-workbench')
    }));
    else this.remount();
  }

  disconnectedCallback() {
    this.cleanup?.();
    this.cleanup = undefined;
  }
}

export function registerLuaPluginOutlet() {
  if (!customElements.get('lua-plugin-outlet'))
    customElements.define('lua-plugin-outlet', LuaPluginOutlet);
}

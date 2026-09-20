/**
 * Imperative outlet used by the Lit shell to mount host framework components.
 * Plugins own the DOM below this element; Lit only owns the outlet itself.
 */
export declare class LuaPluginOutlet extends HTMLElement {
    cleanup: any;
    connectedCallback(): void;
    static get observedAttributes(): string[];
    attributeChangedCallback(): void;
    get controller(): import("./controller.js").LuaWorkbenchController;
    remount(): void;
    update(): void;
    disconnectedCallback(): void;
}
export declare function registerLuaPluginOutlet(): void;

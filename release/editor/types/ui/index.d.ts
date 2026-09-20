import { LuaWorkbench } from './workbench.js';
import './styles.css';
export { bindLuaWorkbench } from './bind.js';
export { createLuaWorkbenchController, HOST_DEFINITION, LuaWorkbenchController, SAMPLE } from './controller.js';
export { LuaWorkbench } from './workbench.js';
export { createLuaWorkbenchThemePlugin, defineLuaWorkbenchPlugin } from './plugins.js';
export { COMMAND_LABELS, DEFAULT_KEYBINDINGS, displayKeybinding, parseKeybinding, resolveKeybindings } from './keybindings.js';
export { keyboardEventToBinding } from './keybinding-recorder.js';
/** Register the bundled shell on demand; importing the module has no DOM side effect. */
export declare function registerLuaWorkbenchElement(tagName?: string): CustomElementConstructor;
/** Mount the bundled shell into any host-owned container. */
/**
 * @param {Element|string} target
 * @param {import('./controller.js').LuaWorkbenchOptions & {tagName?: string}} [options]
 * @returns {LuaWorkbench}
 */
export declare function mountLuaWorkbench(target: Element | string, options?: import('./controller.js').LuaWorkbenchOptions & {
    tagName?: string;
}): LuaWorkbench;
/** Dispose and detach a shell created by mountLuaWorkbench(). */
export declare function unmountLuaWorkbench(element: any): void;

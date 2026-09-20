import { LuaWorkbenchController } from './controller.js';
/**
 * Bind an arbitrary host-owned DOM layout to a Lua workbench controller.
 *
 * Required marker: `[data-lua-editor]`.
 * Optional markers:
 * - `[data-lua-command="run|stop|find|replace|format|setKeybindings|..."]`
 * - `[data-lua-option="backend|profile"]`
 * - `[data-lua-bind="status|output|activeFile|problemCount|..."]`
 * - `[data-lua-enabled="running|paused|idle|debugger"]`
 * - `[data-lua-visible="running|paused|idle|debugger|playground|safe|trusted|full-access|host-access"]`
 * - `[data-lua-component="debugPanel|debugConsole|..."]`
 * - `[data-lua-zone="toolbar|sidebar|bottom|..."]`
 * - `[data-lua-command-on-enter="addWatch|evaluate|searchWorkspace|..."]`
 * - `data-lua-value="#selector"` reads a host input as the command argument.
 *
 * @param {Element|string} target
 * @param {import('./controller.js').LuaWorkbenchOptions & {
 *   controller?: LuaWorkbenchController, editorHost?: HTMLElement,
 *   editorSelector?: string}} [options]
 */
export declare function bindLuaWorkbench(target: Element | string, options?: import('./controller.js').LuaWorkbenchOptions & {
    controller?: LuaWorkbenchController;
    editorHost?: HTMLElement;
    editorSelector?: string;
}): Promise<{
    root: Element;
    controller: LuaWorkbenchController;
    refresh: () => void;
    dispose(): void;
}>;

/**
 * Identity helper for editor tooling and JSDoc type inference.
 * @param {import('./controller.js').LuaWorkbenchPlugin} plugin
 * @returns {import('./controller.js').LuaWorkbenchPlugin}
 */
export declare function defineLuaWorkbenchPlugin(plugin: import('./controller.js').LuaWorkbenchPlugin): import('./controller.js').LuaWorkbenchPlugin;
/**
 * Create a theme plugin which registers a Monaco theme and maps host CSS
 * variables/classes without assuming that the bundled shell is used.
 * @param {{id: string, themeName: string,
 *   monacoTheme: import('monaco-editor').editor.IStandaloneThemeData,
 *   className?: string, variables?: Record<string, string>,
 *   editorOptions?: import('monaco-editor').editor.IStandaloneEditorConstructionOptions}}
 *   options
 * @returns {import('./controller.js').LuaWorkbenchPlugin}
 */
export declare function createLuaWorkbenchThemePlugin(options: {
    id: string;
    themeName: string;
    monacoTheme: import('monaco-editor').editor.IStandaloneThemeData;
    className?: string;
    variables?: Record<string, string>;
    editorOptions?: import('monaco-editor').editor.IStandaloneEditorConstructionOptions;
}): import('./controller.js').LuaWorkbenchPlugin;

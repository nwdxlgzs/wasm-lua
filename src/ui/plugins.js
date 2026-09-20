/**
 * Identity helper for editor tooling and JSDoc type inference.
 * @param {import('./controller.js').LuaWorkbenchPlugin} plugin
 * @returns {import('./controller.js').LuaWorkbenchPlugin}
 */
export function defineLuaWorkbenchPlugin(plugin) {
  if (!plugin || typeof plugin !== 'object' || !String(plugin.id ?? '').trim())
    throw new TypeError('工作台插件必须提供非空 id。');
  return plugin;
}

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
export function createLuaWorkbenchThemePlugin(options) {
  if (!options?.themeName || !options.monacoTheme)
    throw new TypeError('主题插件必须提供 themeName 和 monacoTheme。');
  return defineLuaWorkbenchPlugin({
    id: options.id,
    themes: [{ name: options.themeName, data: options.monacoTheme }],
    theme: options.themeName,
    editorOptions: options.editorOptions,
    hostReady({ host }) {
      const previous = new Map();
      if (options.className) host.classList.add(options.className);
      for (const [name, value] of Object.entries(options.variables ?? {})) {
        const property = name.startsWith('--') ? name : `--${name}`;
        previous.set(property, host.style.getPropertyValue(property));
        host.style.setProperty(property, String(value));
      }
      return () => {
        if (options.className) host.classList.remove(options.className);
        for (const [name, value] of previous) {
          if (value) host.style.setProperty(name, value);
          else host.style.removeProperty(name);
        }
      };
    }
  });
}

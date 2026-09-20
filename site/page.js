const releaseRoot = new URL('../release/', document.baseURI);
const style = document.createElement('link');
style.rel = 'stylesheet';
style.href = new URL('editor/wasm-lua-editor.css', releaseRoot).href;
document.head.append(style);

const editorUrl = new URL('editor/wasm-lua-editor.js', releaseRoot).href;
const { registerLuaWorkbenchElement } = await import(/* @vite-ignore */ editorUrl);
registerLuaWorkbenchElement();

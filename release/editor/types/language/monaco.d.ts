import 'monaco-editor/nls/lang/zh-cn.js';
import 'monaco-editor/features/register.all.js';
import * as monaco from 'monaco-editor/editor/editor.api.js';
import { LuaLanguageClient } from './service.js';
declare const client: LuaLanguageClient;
export { monaco, client as luaLanguageClient };
export declare function createLuaModel(source: any, uri?: string, readonly?: boolean): Promise<monaco.editor.ITextModel>;
export declare function registerDefinition(definition: any): Promise<{
    model: monaco.editor.ITextModel;
    dispose(): void;
}>;
export declare function isReadonlyModel(uri: any): any;
export declare function forgetLuaModel(uri: any): boolean;

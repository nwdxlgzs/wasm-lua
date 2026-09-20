export declare const COMMAND_LABELS: Readonly<{
    run: "运行 / 继续";
    stop: "停止并重建 VM";
    pause: "暂停";
    stepOver: "步过";
    stepIn: "步入";
    stepOut: "步出";
    runToCursor: "运行到光标";
    toggleBreakpoint: "切换断点";
    gotoLine: "跳转到行";
    find: "查找";
    replace: "替换";
    suggest: "触发补全";
    rename: "重命名";
    references: "查找引用";
    format: "格式化文档";
    commandPalette: "命令面板";
    outline: "文件大纲";
    nextProblem: "下一个问题";
    previousProblem: "上一个问题";
}>;
export declare const DEFAULT_KEYBINDINGS: Readonly<{
    run: "F5";
    stop: "Shift+F5";
    pause: "F6";
    toggleBreakpoint: "F9";
    stepOver: "F10";
    stepIn: "F11";
    stepOut: "Shift+F11";
    runToCursor: "Ctrl+F10";
    gotoLine: "Ctrl+G";
    find: "Ctrl+F";
    replace: "Ctrl+H";
    suggest: "Ctrl+Space";
    rename: "F2";
    references: "Shift+F12";
    format: "Shift+Alt+F";
    commandPalette: "F1";
    outline: "Ctrl+Shift+O";
    nextProblem: "F8";
    previousProblem: "Shift+F8";
}>;
/** @param {string} binding @returns {number} */
export declare function parseKeybinding(binding: string): number;
/** @param {Record<string, string|null|undefined>} [overrides] */
export declare function resolveKeybindings(overrides?: Record<string, string | null | undefined>): Record<string, string>;
export declare function displayKeybinding(binding: any): any;

/**
 * Browser/Node implementation for the authority-free part of Lua's os table.
 * @param {{environment?: Record<string, string>, clock?: () => number}} [options]
 */
export declare function createOsBridge(options?: {
    environment?: Record<string, string>;
    clock?: () => number;
}): {
    /** @param {string} name @param {any[]} args */
    invoke(name: string, args: any[]): {
        handled: boolean;
        value?: undefined;
    } | {
        handled: boolean;
        value: number;
    } | {
        handled: boolean;
        value: bigint;
    } | {
        handled: boolean;
        value: {
            year: bigint;
            month: bigint;
            day: bigint;
            hour: bigint;
            min: bigint;
            sec: bigint;
            wday: bigint;
            yday: bigint;
            isdst: boolean;
            timestamp: bigint;
        };
    } | {
        handled: boolean;
        value: string | {
            year: bigint;
            month: bigint;
            day: bigint;
            hour: bigint;
            min: bigint;
            sec: bigint;
            wday: bigint;
            yday: bigint;
            isdst: boolean;
        };
    };
};

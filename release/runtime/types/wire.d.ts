export declare class LuaRef {
    #private;
    /** @readonly @type {number} */
    readonly id: number;
    /** @readonly @type {string|number} */
    readonly type: string | number;
    /** @param {number} id @param {string|number} [type]
     * @param {((id: number) => void)|null} [release] @param {object|null} [owner] */
    constructor(id: number, type?: string | number, release?: ((id: number) => void) | null, owner?: object | null);
    /** @param {object} owner */
    isOwnedBy(owner: object): boolean;
    release(): void;
    toJSON(): {
        $luaRef: number;
        type: string | number;
    };
}
/** @param {any} value @returns {Uint8Array} */
export declare function encodeWire(value: any): Uint8Array;
/** @param {ArrayBuffer|Uint8Array} value @returns {any} */
export declare function decodeWire(value: ArrayBuffer | Uint8Array): any;

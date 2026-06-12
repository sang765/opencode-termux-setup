export declare function writeLn(line?: string): void;
export declare function write(line: string): void;
export declare function select(options: string[]): Promise<number | null>;
export declare function confirm(prompt: string, defaultYes?: boolean): Promise<boolean | null>;
export declare class Spinner {
    private interval;
    private frame;
    private text;
    constructor(text: string);
    start(): void;
    succeed(text?: string): void;
    fail(text?: string): void;
    stop(): void;
}
//# sourceMappingURL=ui.d.ts.map
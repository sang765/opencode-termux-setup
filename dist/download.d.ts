import { type Variant } from './variants.js';
export declare function resolveVersion(ver?: string, variant?: Variant): Promise<string>;
export declare function downloadUpstream(version: string, workDir: string, variant?: Variant): Promise<string>;
export declare function resolveLoader(loaderDir: string): Promise<string>;
//# sourceMappingURL=download.d.ts.map
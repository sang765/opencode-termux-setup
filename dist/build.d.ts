import { type VariantId } from './variants.js';
export interface BuildOptions {
    version?: string;
    pkg: 'deb' | 'pacman' | 'both';
    keepWork: boolean;
    variant?: VariantId;
}
export interface BuildResult {
    version: string;
    debPath?: string;
    pacmanPath?: string;
}
export declare function build(opts: BuildOptions): Promise<string | undefined>;
//# sourceMappingURL=build.d.ts.map
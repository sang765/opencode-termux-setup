export type VariantId = 'v1' | 'v2';
export interface Variant {
    id: VariantId;
    label: string;
    npmPkg: string;
    binName: string;
    debName: string;
    libDir: string;
    description: string;
    projectUrl: string;
    releaseTarballUrl(ver: string): string;
}
export declare const V1: Variant;
export declare const V2: Variant;
export declare function getVariant(id: VariantId): Variant;
//# sourceMappingURL=variants.d.ts.map
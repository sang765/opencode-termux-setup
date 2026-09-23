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

export const V1: Variant = {
  id: 'v1',
  label: 'OpenCode',
  npmPkg: 'opencode-linux-arm64',
  binName: 'opencode',
  debName: 'opencode',
  libDir: 'opencode',
  description: 'OpenCode CLI for Termux (AI coding assistant)',
  projectUrl: 'https://github.com/anomalyco/opencode',
  releaseTarballUrl(ver: string): string {
    return `https://github.com/anomalyco/opencode/releases/download/v${ver}/opencode-linux-arm64.tar.gz`;
  },
};

export const V2: Variant = {
  id: 'v2',
  label: 'OpenCode V2',
  npmPkg: '@opencode/cli-linux-arm64',
  binName: 'opencode2',
  debName: 'opencode2',
  libDir: 'opencode2',
  description: 'OpenCode V2 CLI for Termux (AI coding assistant)',
  projectUrl: 'https://opencode.ai/v2',
  releaseTarballUrl(ver: string): string {
    return `https://opencode.ai/files/bin/${ver}/opencode-linux-arm64.tar.gz`;
  },
};

export function getVariant(id: VariantId): Variant {
  return id === 'v2' ? V2 : V1;
}

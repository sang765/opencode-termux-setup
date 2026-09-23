export const V1 = {
    id: 'v1',
    label: 'OpenCode',
    npmPkg: 'opencode-linux-arm64',
    binName: 'opencode',
    debName: 'opencode',
    libDir: 'opencode',
    description: 'OpenCode CLI for Termux (AI coding assistant)',
    projectUrl: 'https://github.com/anomalyco/opencode',
    releaseTarballUrl(ver) {
        return `https://github.com/anomalyco/opencode/releases/download/v${ver}/opencode-linux-arm64.tar.gz`;
    },
};
export const V2 = {
    id: 'v2',
    label: 'OpenCode V2',
    npmPkg: '@opencode/cli-linux-arm64',
    binName: 'opencode2',
    debName: 'opencode2',
    libDir: 'opencode2',
    description: 'OpenCode V2 CLI for Termux (AI coding assistant)',
    projectUrl: 'https://opencode.ai/v2',
    releaseTarballUrl(ver) {
        return `https://opencode.ai/files/bin/${ver}/opencode-linux-arm64.tar.gz`;
    },
};
export function getVariant(id) {
    return id === 'v2' ? V2 : V1;
}
//# sourceMappingURL=variants.js.map
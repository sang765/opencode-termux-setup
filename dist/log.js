export function log(...msg) {
    console.error('[opencode-termux]', ...msg);
}
export function die(...msg) {
    console.error('[opencode-termux] ERROR:', ...msg);
    process.exit(1);
}
//# sourceMappingURL=log.js.map
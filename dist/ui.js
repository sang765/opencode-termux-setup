import { createInterface } from 'node:readline';
import { stdin as input, stderr } from 'node:process';
const SPINNER = ['◐', '◓', '◑', '◒'];
const CHECK = '✓';
const CROSS = '✗';
function hideCursor() { stderr.write('\x1b[?25l'); }
function showCursor() { stderr.write('\x1b[?25h'); }
function clearLine() { stderr.write('\x1b[2K\r'); }
function cursorUp(n) { stderr.write(`\x1b[${n}A`); }
function cursorDown(n) { stderr.write(`\x1b[${n}B`); }
function cursorCol(n) { stderr.write(`\x1b[${n}G`); }
export function writeLn(line = '') {
    stderr.write(line + '\n');
}
export function write(line) {
    stderr.write(line);
}
function readKey() {
    return new Promise(resolve => {
        const onData = (key) => {
            input.off('data', onData);
            const str = key.toString();
            if (str === '\x1b') {
                // Could be escape sequence, read more
                const onMore = (more) => {
                    input.off('data', onMore);
                    const s = more.toString();
                    if (s[0] === '[') {
                        if (s[1] === 'A')
                            resolve('up');
                        else if (s[1] === 'B')
                            resolve('down');
                        else
                            resolve('escape');
                    }
                    else {
                        resolve('escape');
                    }
                };
                input.once('data', onMore);
            }
            else if (str === '\r' || str === '\n') {
                resolve('enter');
            }
            else if (str === '\x03') {
                resolve('ctrl-c');
            }
            else {
                resolve(str);
            }
        };
        input.once('data', onData);
    });
}
export async function select(options) {
    if (!process.stdin.isTTY) {
        return 0;
    }
    let selected = 0;
    const render = () => {
        for (let i = 0; i < options.length; i++) {
            clearLine();
            if (i === selected) {
                stderr.write(` \x1b[36m›\x1b[0m \x1b[1;97m${options[i]}\x1b[0m\n`);
            }
            else {
                stderr.write(`   \x1b[90m${options[i]}\x1b[0m\n`);
            }
        }
    };
    hideCursor();
    render();
    // Move back up for interactive selection
    const initialLine = options.length;
    while (true) {
        const key = await readKey();
        if (key === 'up' && selected > 0) {
            selected--;
            cursorUp(initialLine);
            render();
        }
        else if (key === 'down' && selected < options.length - 1) {
            selected++;
            cursorUp(initialLine);
            render();
        }
        else if (key === 'enter') {
            // Clear menu
            cursorUp(initialLine);
            for (let i = 0; i < options.length; i++) {
                clearLine();
                stderr.write('\n');
            }
            cursorUp(initialLine + 1);
            showCursor();
            return selected;
        }
        else if (key === 'escape' || key === 'ctrl-c') {
            cursorUp(initialLine);
            for (let i = 0; i < options.length; i++) {
                clearLine();
                stderr.write('\n');
            }
            cursorUp(initialLine + 1);
            showCursor();
            return null;
        }
    }
}
export async function confirm(prompt, defaultYes = true) {
    const suffix = defaultYes ? ' [Y/n]' : ' [y/N]';
    write(prompt + suffix + ' ');
    return new Promise(resolve => {
        const rl = createInterface({ input, output: stderr });
        rl.question('', answer => {
            rl.close();
            clearLine();
            cursorCol(1);
            const a = answer.trim().toLowerCase();
            if (a === 'y' || a === 'yes')
                resolve(true);
            else if (a === 'n' || a === 'no')
                resolve(false);
            else if (a === '')
                resolve(defaultYes);
            else
                resolve(null);
        });
    });
}
export class Spinner {
    interval = null;
    frame = 0;
    text;
    constructor(text) {
        this.text = text;
    }
    start() {
        hideCursor();
        this.frame = 0;
        stderr.write(` \x1b[36m${SPINNER[0]}\x1b[0m ${this.text}`);
        this.interval = setInterval(() => {
            this.frame = (this.frame + 1) % SPINNER.length;
            clearLine();
            stderr.write(` \x1b[36m${SPINNER[this.frame]}\x1b[0m ${this.text}`);
        }, 120);
    }
    succeed(text) {
        if (this.interval)
            clearInterval(this.interval);
        clearLine();
        stderr.write(` \x1b[32m${CHECK}\x1b[0m ${text ?? this.text}\n`);
        showCursor();
    }
    fail(text) {
        if (this.interval)
            clearInterval(this.interval);
        clearLine();
        stderr.write(` \x1b[31m${CROSS}\x1b[0m ${text ?? this.text}\n`);
        showCursor();
    }
    stop() {
        if (this.interval)
            clearInterval(this.interval);
        clearLine();
        showCursor();
    }
}
//# sourceMappingURL=ui.js.map
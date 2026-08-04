import { Database } from 'bun:sqlite';
import { resolve } from 'node:path';
import { homedir } from 'node:os';
import { existsSync } from 'node:fs';
const XDG_DATA_HOME = process.env.XDG_DATA_HOME || resolve(homedir(), '.local', 'share');
const DB_PATH = resolve(XDG_DATA_HOME, 'opencode', 'opencode.db');
export function getLatestSession() {
    if (!existsSync(DB_PATH))
        return null;
    try {
        const db = new Database(DB_PATH, { readonly: true });
        const stmt = db.query('SELECT id, title FROM session ORDER BY time_created DESC LIMIT 1');
        const row = stmt.get();
        db.close();
        if (row && row.id) {
            return { id: row.id, title: row.title || `New session - ${new Date().toISOString()}` };
        }
    }
    catch {
        // database might be locked or corrupt
    }
    return null;
}
//# sourceMappingURL=session.js.map
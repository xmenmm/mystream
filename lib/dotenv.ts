import fs from 'node:fs';
import path from 'node:path';

let __loaded = false;

/** Auto-load .env (no deps) — KEY=VALUE per line, # untuk komentar.
    Dipanggil otomatis saat lib/discord atau lib/auth diimport pertama kali. */
export function loadDotEnv(): void {
  if (__loaded) return;
  __loaded = true;
  const envPath = path.join(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, 'utf8');
  for (const raw of content.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq < 0) continue;
    const k = line.slice(0, eq).trim();
    let v = line.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (!process.env[k]) process.env[k] = v;
  }
}

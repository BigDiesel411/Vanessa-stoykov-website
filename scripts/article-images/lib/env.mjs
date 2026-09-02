import fs from 'node:fs';
import path from 'node:path';
import { REPO_ROOT } from './config.mjs';

// Minimal .env loader — no dependency on dotenv. Reads KEY=VALUE lines,
// ignores comments/blank lines, strips surrounding quotes, and never
// overwrites a value already set in the real environment (so `export
// GEMINI_API_KEY=...` in your shell always wins over the file).
function parseEnvFile(text) {
  const out = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

export function loadEnv() {
  // .env.local takes priority over .env, mirroring common conventions;
  // both are gitignored so a real key never lands in version control.
  const candidates = ['.env.local', '.env'].map((f) => path.join(REPO_ROOT, f));
  for (const file of candidates) {
    if (!fs.existsSync(file)) continue;
    const parsed = parseEnvFile(fs.readFileSync(file, 'utf8'));
    for (const [key, value] of Object.entries(parsed)) {
      if (process.env[key] === undefined) process.env[key] = value;
    }
  }
}

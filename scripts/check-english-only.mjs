/**
 * Prevent accidental Urdu-script strings from appearing in the English-only app.
 * Checks all authored UI source and public-facing documentation, excluding dependencies.
 * Romanized language cannot be recognized reliably by script checks; review it in PRs.
 */
import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

const roots = ['App.tsx', 'store.tsx', 'types.ts', 'index.html', 'metadata.json', 'components', 'docs', 'README.md'];
const extensions = /\.(?:tsx?|jsx?|html|json|md)$/i;
const urduScript = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/u;
let failures = 0;
async function check(path) {
  const text = await readFile(path, 'utf8');
  for (const [index, line] of text.split(/\r?\n/u).entries()) {
    if (urduScript.test(line)) {
      console.error(`Non-English script found at ${relative('.', path)}:${index + 1}`);
      failures++;
    }
  }
}
async function scan(path) {
  const entries = await readdir(path, { withFileTypes: true });
  for (const entry of entries) {
    const child = join(path, entry.name);
    if (entry.isDirectory()) await scan(child);
    else if (entry.isFile() && extensions.test(child)) await check(child);
  }
}
for (const path of roots) {
  if (path === 'components' || path === 'docs') await scan(path);
  else await check(path);
}
const html = await readFile('index.html', 'utf8');
if (!/<html\s+lang="en"/i.test(html)) {
  console.error('Document must declare English as the primary language');
  failures++;
}
if (failures) process.exit(1);
console.log('English-only source validation passed.');

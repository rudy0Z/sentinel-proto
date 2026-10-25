// Compiles the TypeScript modules and inlines the compiled JS into harness.html so the
// harness also runs from file:// (no server, no bundler).
//
// Portable: the compiler is invoked as a Node script, not via the POSIX
// `node_modules/.bin/tsc` shim, which does not exist on Windows.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tscBin } from './browser.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
execFileSync(process.execPath, [tscBin(root), '-p', root], { stdio: 'inherit' });

const htmlPath = join(root, 'harness.html');
let html = readFileSync(htmlPath, 'utf8');
for (const [file, id] of [['terrainEngine.js', 'tte-engine-inline'], ['scenarioFixtures.js', 'tte-fixtures-inline'], ['scenarioPlayer.js', 'tte-player-inline']]) {
  const js = readFileSync(join(root, file), 'utf8');
  const safe = js.replace(/<\/script/gi, '<\\/script');
  const re = new RegExp(`(<script type="text\\/plain" id="${id}">)[\\s\\S]*?(<\\/script>)`);
  if (!re.test(html)) throw new Error(`inline marker #${id} not found in harness.html`);
  html = html.replace(re, (_, a, b) => `${a}${safe}${b}`);
  console.log(`${file} ${(js.length / 1024).toFixed(1)} KB, inlined into harness.html`);
}
writeFileSync(htmlPath, html);
// Cross-platform Chrome resolver + puppeteer launcher.
//
// The build session ran on Linux, where a hardcoded '/usr/bin/google-chrome'
// and a POSIX `node_modules/.bin/tsc` were both fine. Neither survives an
// export to a different machine: the browser path does not exist, and the
// `.bin` shim is a `.cmd` on Windows. These helpers resolve both, so the
// project runs wherever it was unpacked.
//
// Resolution order for the browser:
//   1. $CHROME                       (explicit override)
//   2. a Chrome/Edge/Chromium on PATH for this platform
//   3. the usual install locations
//   4. undefined, so puppeteer-core uses its own resolution
import puppeteer from 'puppeteer-core';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { platform } from 'node:os';

const CANDIDATES = {
  win32: [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Users\\Public\\Google\\Chrome\\Application\\chrome.exe',
  ],
  darwin: [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
  ],
  linux: [
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/snap/bin/chromium',
    '/usr/bin/microsoft-edge',
  ],
};

/** The browser executable to use, or undefined to let puppeteer decide. */
export function chromePath() {
  const override = process.env.CHROME;
  if (override) return override;
  const list = CANDIDATES[platform()] ?? CANDIDATES.linux;
  for (const p of list) if (existsSync(p)) return p;
  return undefined;
}

/** Launch Chrome headless with software GL, portable across platforms. */
export async function launch(extraArgs = []) {
  const args = [
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    ...extraArgs,
  ];
  const executablePath = chromePath();
  return puppeteer.launch({
    ...(executablePath ? { executablePath } : {}),
    headless: 'new',
    args,
  });
}

/** The TypeScript compiler entry, as a Node script, portable across platforms. */
export function tscBin(root) {
  const p = join(root, 'node_modules', 'typescript', 'bin', 'tsc');
  if (!existsSync(p)) {
    throw new Error(
      'typescript not installed — run `npm install` before building.',
    );
  }
  return p;
}

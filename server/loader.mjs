/**
 * server/loader.mjs — strip-types companion loader (v2).
 *
 * Node ESM does not resolve extensionless relative imports (Vite does).
 * The shared domain files must stay identical for browser and Node, so this
 * hook resolves them here: it appends '.ts' (or '/index.ts') to relative
 * specifiers and delegates only when the file actually exists.
 * Run: node --experimental-strip-types --import ./server/loader.mjs server/index.ts
 */
import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

export async function resolve(specifier, context, next) {
  if ((specifier.startsWith("./") || specifier.startsWith("../")) && context.parentURL) {
    const parentDir = fileURLToPath(context.parentURL).replace(/[^\\/]*$/, "");
    const base = specifier.replace(/\.js$/, "");
    for (const candidate of [base + ".ts", base + "/index.ts"]) {
      const abs = pathToFileURL(parentDir + candidate.replace(/^\.\//, "")).href;
      if (existsSync(new URL(abs).pathname.replace(/^\/([A-Za-z]:)/, "$1"))) {
        return next(candidate, context);
      }
    }
  }
  return next(specifier, context);
}

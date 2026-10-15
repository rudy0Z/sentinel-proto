// Inject atlas.json into atlas-template.html -> sentinel-flow-atlas.html (self-contained)
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const dir = dirname(fileURLToPath(import.meta.url));
const stripBom = s => s.replace(/^\uFEFF/, "");
const atlas = JSON.parse(stripBom(readFileSync(join(dir, "atlas.json"), "utf8")));
const tpl = readFileSync(join(dir, "atlas-template.html"), "utf8");
const marker = /\/\*__ATLAS_DATA__\*\/.*?\/\*__END__\*\//s;
if (!marker.test(tpl)) { console.error("marker not found"); process.exit(1); }
const out = tpl.replace(marker, "/*__ATLAS_DATA__*/" + JSON.stringify(atlas) + "/*__END__*/");
const dest = join(dir, "..", "sentinel-flow-atlas.html");
writeFileSync(dest, out);
console.log("written:", dest, (out.length / 1024).toFixed(1) + " KB");

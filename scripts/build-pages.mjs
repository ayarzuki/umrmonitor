#!/usr/bin/env node
// Bangun direktori `dist/` untuk Cloudflare Pages.
//
// Kenapa perlu: Pages mengunggah `_worker.js` apa adanya (tidak di-bundle), jadi
// `import ... from "*.json"` tidak bisa dipakai. Skrip ini menanam (inline) kedua
// dataset ke dalam satu file `_worker.js` + menyalin aset statis. Tanpa dependency,
// tanpa framework, deterministik.
//
// Pemakaian: node scripts/build-pages.mjs   → dist/_worker.js + dist/data/*.json

import { readFileSync, writeFileSync, mkdirSync, cpSync, rmSync, readdirSync, statSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const dist = join(root, "dist");

const source = readFileSync(join(root, "src/index.js"), "utf8");

// Kumpulkan semua import JSON, ganti dengan literal.
const importRe = /^import\s+(\w+)\s+from\s+"([^"]+\.json)";\s*$/gm;
const inlined = [];
let body = source.replace(importRe, (_m, name, relPath) => {
  const json = JSON.parse(readFileSync(join(root, "src", relPath), "utf8"));
  inlined.push({ name, relPath, bytes: JSON.stringify(json).length });
  return `const ${name} = ${JSON.stringify(json)};`;
});

if (/^import\s/m.test(body)) {
  console.error("GAGAL: masih ada import ESM yang tidak bisa di-inline untuk Pages.");
  console.error(body.split("\n").filter((l) => l.startsWith("import ")).join("\n"));
  process.exit(1);
}
if (!/export\s+default\s*\{/.test(body)) {
  console.error("GAGAL: _worker.js harus punya `export default { fetch }` (Pages advanced mode).");
  process.exit(1);
}

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });
writeFileSync(join(dist, "_worker.js"), body);

// Salin aset statis (public/) ke dist/, tanpa menimpa _worker.js.
cpSync(join(root, "public"), dist, { recursive: true });

// _headers: pastikan dataset di-cache lama, HTML jangan.
writeFileSync(
  join(dist, "_headers"),
  [
    "/data/*",
    "  Cache-Control: public, max-age=3600",
    "/",
    "  Cache-Control: public, max-age=300",
    "/*",
    "  Cache-Control: public, max-age=300",
    "",
  ].join("\n")
);

const size = statSync(join(dist, "_worker.js")).size;
console.log(`OK: dist/_worker.js ${(size / 1024).toFixed(1)} KiB`);
for (const x of inlined) console.log(`   inline ${x.name} ← ${x.relPath} (${(x.bytes / 1024).toFixed(1)} KiB)`);
console.log("   aset:", readdirSync(join(dist, "data")).join(", "));
if (size > 3 * 1024 * 1024) {
  console.error("GAGAL: _worker.js > 3 MiB (batas Worker/Pages free tier).");
  process.exit(1);
}

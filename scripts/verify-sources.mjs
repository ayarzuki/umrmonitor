#!/usr/bin/env node
// Verifikasi sumber: setiap nominal di scripts/sources/umk/*.json harus benar-benar
// muncul di halaman URL yang dikutip. Ini yang membedakan data terverifikasi dari
// angka karangan — jalankan sebelum build dan sebelum deploy.
//
// Pemakaian: node scripts/verify-sources.mjs [--provinsi=<slug>] [--refresh]
// Exit 1 kalau ada baris yang angkanya tidak ditemukan di sumbernya.

import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const sourceDir = join(root, "scripts/sources/umk");
const cacheDir = join(root, ".cache/sources");
const onlyProv = (process.argv.find((a) => a.startsWith("--provinsi=")) || "").split("=")[1];
const refresh = process.argv.includes("--refresh");

mkdirSync(cacheDir, { recursive: true });

function cacheName(url) {
  return url.replace(/[^a-z0-9]+/gi, "_").slice(0, 160) + ".txt";
}

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ");
}

async function fetchText(url) {
  const path = join(cacheDir, cacheName(url));
  if (!refresh && existsSync(path)) {
    const cached = readFileSync(path, "utf8");
    if (cached.length > 200) return { text: cached, from: "cache" };
  }
  try {
    const res = await fetch(url, {
      headers: {
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36",
        accept: "text/html,application/xhtml+xml,application/pdf;q=0.9,*/*;q=0.8",
        "accept-language": "id-ID,id;q=0.9,en;q=0.8",
      },
      redirect: "follow",
    });
    const raw = await res.text();
    const text = stripHtml(raw);
    writeFileSync(path, text);
    return { text, from: `http ${res.status}` };
  } catch (err) {
    return { text: "", from: `error ${err.message}` };
  }
}

function variants(n) {
  const out = new Set();
  const rounded = Math.round(n);
  const fmt = (i) => String(i).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  out.add(fmt(rounded));
  out.add(String(rounded)); // versi tanpa pemisah (dataset JSON, tabel sederhana)
  out.add(fmt(rounded).replace(/\./g, ","));
  out.add(fmt(rounded) + ",00");
  out.add(fmt(rounded).replace(/\./g, ",") + ".00");
  if (!Number.isInteger(n)) {
    const [i, d] = n.toFixed(2).split(".");
    out.add(`${fmt(Number(i))},${d}`);
    out.add(`${fmt(Number(i))}.${d}`);
  }
  return [...out];
}

function nameTokens(nama) {
  return nama
    .toLowerCase()
    .replace(/^(kabupaten|kota)\s+/, "")
    .split(/[^a-z]+/)
    .filter((t) => t.length > 2);
}
const files = readdirSync(sourceDir)
  .filter((f) => f.endsWith(".json"))
  .filter((f) => !onlyProv || f === `${onlyProv}.json`);

if (!files.length) {
  console.error("Tidak ada file sumber untuk diperiksa.");
  process.exit(1);
}

const pageCache = new Map();
let totalRows = 0;
let numberOk = 0;
const failures = [];

for (const file of files.sort()) {
  const payload = JSON.parse(readFileSync(join(sourceDir, file), "utf8"));
  const rows = payload.rows ?? [];
  const urls = (payload.sumber ?? []).map((s) => s.url).filter(Boolean);
  if (!rows.length) {
    console.log(`– ${payload.provinsi ?? file}: tanpa baris UMK (${payload.catatan || "-"})`);
    continue;
  }
  if (!urls.length) {
    failures.push({ prov: payload.provinsi ?? file, nama: "(semua)", why: "tidak ada URL sumber" });
    continue;
  }

  const pages = [];
  for (const url of urls) {
    if (!pageCache.has(url)) pageCache.set(url, await fetchText(url));
    const got = pageCache.get(url);
    pages.push({ url, ...got });
  }
  const corpus = pages.map((p) => p.text).join(" ");
  const corpusLower = corpus.toLowerCase();
  // nama kadang ditulis tanpa spasi / dengan huruf berjarak di halaman sumber
  const corpusCompact = corpusLower.replace(/[^a-z0-9]/g, "");

  let provOk = 0;
  for (const row of rows) {
    totalRows += 1;
    const hitNumber = variants(Number(row.umk)).some((v) => corpus.includes(v));
    const tokens = nameTokens(row.nama ?? "");
    const hitName = tokens.length
      ? tokens.every((t) => corpusLower.includes(t)) ||
        corpusCompact.includes(String(row.nama ?? "").toLowerCase().replace(/[^a-z0-9]/g, ""))
      : false;
    if (hitNumber && hitName) {
      provOk += 1;
      numberOk += 1;
    } else {
      failures.push({
        prov: payload.provinsi ?? file,
        nama: row.nama,
        why: !hitNumber ? `angka ${row.umk} tidak ada di halaman sumber` : "nama daerah tidak ada di halaman sumber",
      });
    }
  }
  const status = pages.map((p) => `${p.from} ${p.url}`).join(" | ");
  console.log(
    `${provOk === rows.length ? "✓" : "✗"} ${String(payload.provinsi ?? file).padEnd(24)} ${String(provOk)}/${String(rows.length)} baris terbukti   ${status}`
  );
}

console.log(`\nTotal: ${numberOk}/${totalRows} baris terbukti muncul di halaman sumber.`);
if (failures.length) {
  console.error(`\nGAGAL: ${failures.length} baris tidak terbukti`);
  for (const f of failures.slice(0, 30)) console.error(`  ✗ ${f.prov} — ${f.nama}: ${f.why}`);
  if (failures.length > 30) console.error(`  … dan ${failures.length - 30} lainnya`);
  process.exit(1);
}
console.log("SEMUA BARIS TERBUKTI DI SUMBER.");

#!/usr/bin/env node
// Gabungkan file sumber per provinsi (scripts/sources/umk/<slug>.json) menjadi
// dataset publik public/data/umk-2026.json. Deterministik: urut provinsi (ikut
// dataset UMP), lalu urut nominal menurun di dalam provinsi.
//
// Pemakaian: node scripts/build-umk.mjs [--check]
//   --check : jangan tulis file, hanya laporkan apa yang akan dihasilkan.

import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const sourceDir = join(root, "scripts/sources/umk");
const umpPath = join(root, "public/data/ump-2026.json");
const outPath = join(root, "public/data/umk-2026.json");
const DICEK_PADA = "2026-10-29";
const checkOnly = process.argv.includes("--check");

// Jumlah kabupaten/kota per provinsi (kode wilayah BPS, 514 total nasional).
// Dipakai hanya untuk menyatakan CAKUPAN secara jujur — bukan data upah.
const JML_DAERAH = {
  "aceh": 23, "bali": 9, "banten": 8, "bengkulu": 10, "di-yogyakarta": 5,
  "dki-jakarta": 6, "gorontalo": 6, "jambi": 11, "jawa-barat": 27, "jawa-tengah": 35,
  "jawa-timur": 38, "kalimantan-barat": 14, "kalimantan-selatan": 13, "kalimantan-tengah": 14,
  "kalimantan-timur": 10, "kalimantan-utara": 5, "kepulauan-bangka-belitung": 7,
  "kepulauan-riau": 7, "lampung": 15, "maluku": 11, "maluku-utara": 10,
  "nusa-tenggara-barat": 10, "nusa-tenggara-timur": 22, "papua": 9, "papua-barat": 7,
  "papua-barat-daya": 6, "papua-pegunungan": 8, "papua-selatan": 4, "papua-tengah": 8,
  "riau": 12, "sulawesi-barat": 6, "sulawesi-selatan": 24, "sulawesi-tengah": 13,
  "sulawesi-tenggara": 17, "sulawesi-utara": 15, "sumatera-barat": 19, "sumatera-selatan": 17,
  "sumatera-utara": 33,
};

const ump = JSON.parse(readFileSync(umpPath, "utf8"));
const provBySlug = new Map(ump.provinsi.map((p) => [p.slug, p]));

function slugify(text) {
  return String(text)
    .toLowerCase()
    .replace(/^kabupaten\s+/, "kabupaten-")
    .replace(/^kota\s+/, "kota-")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const errors = [];
const warnings = [];
const files = readdirSync(sourceDir).filter((f) => f.endsWith(".json"));
const regions = [];
const coverage = [];
const seenSlug = new Map();

for (const file of files.sort()) {
  const payload = JSON.parse(readFileSync(join(sourceDir, file), "utf8"));
  const slug = payload.slug ?? file.replace(/\.json$/, "");
  const prov = provBySlug.get(slug);
  if (!prov) {
    errors.push(`${file}: slug provinsi "${slug}" tidak ada di ump-2026.json`);
    continue;
  }
  const rows = Array.isArray(payload.rows) ? payload.rows : [];
  const sumberUrl = (payload.sumber ?? []).map((s) => s.url).filter(Boolean);
  if (!sumberUrl.length && rows.length) {
    errors.push(`${file}: ${rows.length} baris tapi tanpa sumber`);
  }

  let kept = 0;
  for (const row of rows) {
    const nama = String(row.nama ?? "").trim();
    const umk = Number(row.umk);
    if (!nama || !Number.isFinite(umk) || umk <= 0) {
      errors.push(`${file}: baris tidak valid (${JSON.stringify(row)})`);
      continue;
    }
    if (!/^(Kabupaten|Kota)\s/.test(nama)) {
      errors.push(`${file}: nama harus diawali "Kabupaten " atau "Kota " → "${nama}"`);
      continue;
    }
    // UMK tidak boleh di bawah UMP provinsi — itu tanda angka salah/tahun salah.
    if (umk < prov.ump - 1) {
      errors.push(
        `${file}: ${nama} umk ${umk} < UMP ${prov.provinsi} ${prov.ump} (angka tidak masuk akal)`
      );
      continue;
    }
    const jenis = nama.startsWith("Kota ") ? "Kota" : "Kabupaten";
    let citySlug = slugify(nama);
    if (seenSlug.has(citySlug) && seenSlug.get(citySlug) !== `${prov.slug}/${nama}`) {
      citySlug = `${citySlug}-${prov.slug}`;
    }
    seenSlug.set(citySlug, `${prov.slug}/${nama}`);
    regions.push({
      nama,
      jenis,
      slug: citySlug,
      provinsi: prov.provinsi,
      provinsi_slug: prov.slug,
      umk,
      ump_provinsi: prov.ump,
      selisih_ump: Math.round(umk - prov.ump),
      nomor_sk: payload.nomor_sk ?? null,
      tanggal_sk: payload.tanggal_sk ?? null,
      berlaku_dari: payload.berlaku_dari ?? "2026-01-01",
      status_verifikasi: rows.length ? "terverifikasi-sumber-dikutip" : "belum-ada-umk",
      sumber_url: sumberUrl,
      dicek_pada: DICEK_PADA,
    });
    kept += 1;
  }

  coverage.push({
    provinsi: prov.provinsi,
    slug: prov.slug,
    jumlah_umk: kept,
    jumlah_daerah: JML_DAERAH[prov.slug] ?? null,
    nomor_sk: payload.nomor_sk ?? null,
    status: payload.status ?? (kept ? "ada-umk" : "belum-terverifikasi"),
    catatan: payload.catatan ?? "",
    sumber: payload.sumber ?? [],
  });
  if (!rows.length) {
    warnings.push(`${prov.provinsi}: tidak ada UMK 2026 (${payload.catatan || "tanpa catatan"})`);
  }
}

// Urutan stabil: provinsi sesuai dataset UMP, lalu nominal menurun.
regions.sort((a, b) => {
  const ia = ump.provinsi.findIndex((p) => p.slug === a.provinsi_slug);
  const ib = ump.provinsi.findIndex((p) => p.slug === b.provinsi_slug);
  if (ia !== ib) return ia - ib;
  return b.umk - a.umk;
});

const dataset = {
  dataset: "UMK (Upah Minimum Kabupaten/Kota) Indonesia 2026",
  tahun: 2026,
  dibuat: DICEK_PADA,
  dicek_pada: DICEK_PADA,
  jumlah_kota: regions.length,
  jumlah_provinsi_dengan_umk: new Set(regions.map((r) => r.provinsi_slug)).size,
  jumlah_kab_kota_nasional: Object.values(JML_DAERAH).reduce((a, b) => a + b, 0),
  kompilasi: {
    nama: "KarirAman",
    url: "https://kariraman.com/api/v1/minimum-wages/2026.json",
    lisensi: "CC BY 4.0",
    data_per: "2026-10-08",
    diakses: DICEK_PADA,
  },
  dasar_hukum: "PP No. 49 Tahun 2025 tentang Pengupahan",
  catatan:
    "Nominal UMK 2026 per kabupaten/kota, satu baris satu daerah, dengan nomor Keputusan Gubernur dan URL sumber. " +
    "Provinsi yang tidak menetapkan UMK memakai UMP; lihat cakupan per provinsi.",
  cakupan: coverage,
  kota: regions,
};

if (errors.length) {
  console.error(`GAGAL: ${errors.length} masalah data`);
  for (const e of errors.slice(0, 40)) console.error("  ✗ " + e);
  if (errors.length > 40) console.error(`  … dan ${errors.length - 40} lainnya`);
  process.exit(1);
}

if (warnings.length) for (const w of warnings) console.warn("  ⚠ " + w);

const json = JSON.stringify(dataset, null, 1);
if (checkOnly) {
  console.log(`--check: ${regions.length} kab/kota dari ${coverage.length} provinsi (tidak ditulis)`);
} else {
  writeFileSync(outPath, json + "\n");
  console.log(
    `OK: ${regions.length} kab/kota, ${dataset.jumlah_provinsi_dengan_umk} provinsi → ${outPath} (${json.length} bytes)`
  );
}
for (const c of coverage.filter((c) => c.jumlah_umk)) {
  console.log(`  ${c.provinsi.padEnd(24)} ${String(c.jumlah_umk).padStart(3)} UMK  ${c.nomor_sk ?? "-"}`);
}

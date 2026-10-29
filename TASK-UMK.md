# TASK — UMRO Monitor: perluas ke UMK kabupaten/kota

## Konteks
Repo: `/home/ubuntu/umrmonitor` (sudah live di https://umrmonitor.aulya-yarzuki.workers.dev).
Saat ini hanya ada tabel **UMP 38 provinsi** (`public/data/ump-2026.json`, FROZEN — jangan disentuh).
Pengguna minta produk turun satu level: **sampai kabupaten/kota (UMK)**, dengan standar tampilan nominal
selalu bilangan bulat: `Rp3.932.552` — bukan `Rp3.100.881,40`. (`formatRupiah()` di `src/index.js`
sudah diperbaiki jadi pembulatan bulat; pertahankan perilaku itu.)

Dataset UMK **sudah tersedia** di `public/data/umk-2026.json` (dibuat oleh `scripts/build-umk.mjs`
dari `scripts/sources/umk/*.json`). Kamu hanya membaca dataset itu.

## Bentuk `public/data/umk-2026.json`

```json
{
  "dataset": "UMK (Upah Minimum Kabupaten/Kota) Indonesia 2026",
  "tahun": 2026, "dibuat": "2026-10-29", "dicek_pada": "2026-10-29",
  "jumlah_kota": 493, "jumlah_provinsi_dengan_umk": 32,
  "dasar_hukum": "PP No. 49 Tahun 2025 tentang Pengupahan",
  "catatan": "...",
  "cakupan": [{ "provinsi": "Jawa Barat", "slug": "jawa-barat", "jumlah_umk": 27, "nomor_sk": "...", "catatan": "", "sumber": [...] }],
  "kota": [{
    "nama": "Kota Bekasi", "jenis": "Kota", "slug": "kota-bekasi",
    "provinsi": "Jawa Barat", "provinsi_slug": "jawa-barat",
    "umk": 5999443, "ump_provinsi": 2317601, "selisih_ump": 3681842,
    "nomor_sk": "Keputusan Gubernur ...", "tanggal_sk": "2025-12-24",
    "berlaku_dari": "2026-01-01",
    "status_verifikasi": "terverifikasi-sumber-dikutip",
    "sumber_url": ["https://..."], "dicek_pada": "2026-10-29"
  }]
}
```

Jumlah baris dan provinsi bisa berubah saat dataset diperbarui — **jangan hardcode angka**, baca dari
dataset lalu bandingkan.

## Yang harus dibangun

1. **`GET /kota`** — halaman HTML daftar UMK seluruh kabupaten/kota, server-rendered (isi tabel ada di HTML pertama).
   - Badge tahun **2026**, dasar hukum, dan tulisan cakupan: `X kabupaten/kota di Y provinsi`.
   - Filter per provinsi lewat query `?provinsi=<slug>` (server-side, tetap server-rendered); tanpa filter tampilkan semua.
   - Kolom: No | Kabupaten/Kota | Provinsi | UMK 2026 | Selisih vs UMP provinsi | SK. Nama daerah link ke `/kota/<slug>`.
   - Kotak pencarian nama daerah (`#cari-kota`, id wajib) — filter client-side (progressive enhancement), tabel lengkap tetap ada di HTML.
   - Ringkasan di atas tabel: UMK tertinggi (daerah + nominal) dan terendah.
2. **`GET /kota/<slug>`** — halaman per daerah, server-rendered:
   - `<title>` SEO: `UMK <Nama> 2026 — Rp<nominal> | UMRO Monitor`.
   - Isi: UMK 2026, UMP provinsi + selisih, nomor & tanggal SK, berlaku dari, status verifikasi,
     **daftar `sumber_url` sebagai link**, `dicek_pada`, link ke `/provinsi/<provinsi_slug>` dan `/kota`.
   - Daftar 5 UMK tertinggi di provinsi yang sama sebagai pembanding.
   - Slug tak dikenal → 404 HTML.
3. **`GET /`** — tambahkan satu bagian ringkas "UMK kabupaten/kota": 5 tertinggi + 5 terendah nasional
   (dari dataset), plus tautan ke `/kota`. Tabel UMP yang sudah ada tetap.
4. **`GET /provinsi/<slug>`** — tambahkan tabel kabupaten/kota di provinsi itu (kalau ada), plus tautan
   ke `/kota?provinsi=<slug>`. Kalau provinsi tidak punya UMK, tampilkan catatan dari `cakupan[].catatan`
   (mis. DKI Jakarta: hanya UMP + upah sektoral).
5. **API JSON** (semua tetap `cache-control: public, max-age=300`, CORS seperti sekarang):
   - `GET /api/umk` → `{tahun, jumlah, kota:[...]}`; dukung `?provinsi=<slug>`.
   - `GET /api/umk/:slug` → satu daerah; 404 JSON kalau tidak ada.
   - `GET /api/meta` → tambahkan `jumlah_kota` dan `jumlah_provinsi_dengan_umk` dari dataset UMK.
6. **`scripts/validate.mjs`** — pertahankan 14 asersi yang sudah ada (jangan dihapus/dilonggarkan), lalu
   tambahkan asersi baru yang **dihitung dari dataset**, bukan angka mati:
   - `/kota` 200 dan memuat nama + nominal UMK tertinggi nasional (format `Rp<bulat>`).
   - jumlah baris tabel di `/kota` = `jumlah_kota` (hitung kemunculan `href="/kota/`).
   - `/kota/<slug-tertinggi>` 200, memuat nominal + nomor SK + minimal satu `sumber_url` sebagai link.
   - `/kota/tidak-ada` → 404.
   - `/api/umk` `jumlah` = `jumlah_kota`; `/api/umk?provinsi=jawa-barat` hanya berisi daerah Jawa Barat.
   - `/api/umk/<slug>` 200; `/api/umk/tidak-ada` → 404.
   - `/api/meta` memuat `jumlah_kota`.
   - `/provinsi/<slug-provinsi-dengan-umk>` memuat tabel kab/kota (minimal 1 `href="/kota/`).
   - tidak ada nominal rupiah berdesimal di `/`, `/kota`, `/kota/<slug>`, `/provinsi/<slug>` (asersi 7d sudah ada — perluas cakupannya).
   - Setiap halaman `/kota/<slug>` (sampel 5 daerah acak deterministik) memuat `dicek_pada`.

## Batasan keras
- JANGAN ubah `public/data/ump-2026.json`, `public/data/umk-2026.json`, `scripts/build-umk.mjs`,
  `scripts/verify-sources.mjs`, atau apa pun di `scripts/sources/`. Itu milik operator.
- Tanpa dependency runtime baru; tanpa framework; tanpa build step; tetap satu Worker + static assets.
- Jangan pakai D1 (kuota penuh). KV `umrmonitor_subs` jangan diubah.
- Jangan deploy (`wrangler deploy` / `pages deploy`) — operator yang deploy.
- Semua tulisan file di dalam `/home/ubuntu/umrmonitor`.

## Kriteria selesai (harus bisa saya ulang sendiri)
1. `node scripts/validate.mjs` → `RESULT: PASS`, exit 0, semua asersi lama masih ada.
2. `node scripts/build-umk.mjs --check` tetap jalan (kamu tidak merusak pipeline data).
3. `git status --porcelain` tidak memuat perubahan pada `public/data/ump-2026.json`,
   `public/data/umk-2026.json`, `scripts/sources/`, `scripts/build-umk.mjs`, `scripts/verify-sources.mjs`.

## Laporan akhir (format persis)
```
FILES:
<path> — <satu baris fungsi>
CHECK:
<PASS/FAIL per asersi baru, ringkas>
VALIDATE: RESULT: ... exit=...
NOTES:
<hal yang menyimpang atau tidak teruji, atau "-">
```

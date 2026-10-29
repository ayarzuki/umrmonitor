# TASK — UMRO Monitor: situs data UMP Indonesia (Cloudflare Worker + static assets)

## Konteks
Repo: `/home/ubuntu/umrmonitor` (git sudah di-init, belum ada commit).
Dataset sudah ada dan **FROZEN — jangan diubah**: `public/data/ump-2026.json` (38 provinsi, UMP 2026 + UMP 2025 + kenaikan % + nomor SK + sumber). Struktur per baris: `provinsi, slug, tahun, ump, ump_sebelumnya, kenaikan_persen, nomor_sk, berlaku_dari, status_verifikasi, sumber_url[], dicek_pada`.

Produk: **UMRO Monitor** — tabel upah minimum (UMP) Indonesia yang bertanggal dan bisa dicek sumbernya. Penggunanya staf HR/payroll UMKM, konsultan HR, vendor HRIS. Nilai jualnya: angka + tanggal berlaku + nomor SK + link sumber, bukan opini.

## Yang harus dibangun
1. **Worker Cloudflare** (`src/index.js`, ES module, `export default { fetch }`) yang melayani:
   - `GET /` → halaman HTML tabel 38 provinsi (server-rendered dari dataset, bukan fetch client-side; harus sudah ada isi tabel di HTML pertama).
   - `GET /api/ump?tahun=2026` → JSON `{tahun, jumlah, provinsi:[...]}`.
   - `GET /api/ump/:slug` → satu provinsi, 404 JSON kalau tidak ada.
   - `GET /api/top?n=5&arah=tertinggi|terendah` → n provinsi terurut nominal.
   - `GET /api/meta` → `{dataset, tahun, dibuat, jumlah_provinsi, dasar_hukum, catatan, sumber_rekapitulasi}`.
   - `POST /api/subscribe` body JSON `{email}` → validasi email regex sederhana, simpan ke KV binding `umrmonitor_subs` dengan key `sub:<email>` value JSON `{email, dibuat: ISO, tahun_minat: 2027}`, balas `{ok:true}`. Idempoten (key sama menimpa). Email invalid → 400 `{ok:false, error:"email tidak valid"}`.
   - `OPTIONS *` → CORS preflight 204.
   - Header respons API: `content-type: application/json; charset=utf-8`, `cache-control: public, max-age=300` untuk GET API, `no-store` untuk subscribe.
2. **`wrangler.toml`** — isi PERSIS ini, jangan ganti id/nama:
   - `name = "umrmonitor"`, `main = "src/index.js"`, `compatibility_date = "2026-10-01"`
   - `[assets] directory = "./public" binding = "ASSETS"` (aset statis: logo/favicon kalau ada)
   - `[[kv_namespaces]] binding = "umrmonitor_subs" id = "d0c9d46f4dc9481dac49621405370ccd"`
3. **Halaman HTML** (`GET /`), bahasa Indonesia, mobile-first, tanpa framework, tanpa CDN eksternal (semua CSS inline di `<style>`):
   - Judul: **UMRO Monitor** — tagline "Upah minimum Indonesia, bertanggal dan bisa dicek."
   - Badge tahun **2026** + `berlaku 1 Januari 2026` + dasar hukum `PP No. 49 Tahun 2025`.
   - Tabel: No | Provinsi | UMP 2026 | UMP 2025 | Kenaikan %. Nominal format `Rp5.729.876` (pemisah titik, tanpa desimal kalau bilangan bulat; kalau ada sen seperti 2.327.386,07 tampilkan 2 desimal dengan koma).
   - Kenaikan % pakai warna: hijau muda untuk >0, abu-abu untuk 0.
   - Kolom Provinsi berisi link ke `/provinsi/<slug>`.
   - Di bawah tabel: kotak "Sumber & tanggal cek" yang menampilkan setiap URL sumber sebagai link + `dicek_pada`, dan `dasar_hukum`.
   - Form subscribe: input email + tombol "Ingatkan saya saat UMP 2027 terbit", hasil submit ditulis ke `#hasil` (teks, tanpa alert()). Hook wajib persis: `#email`, `#btn-subscribe`, `#hasil`.
   - Footer: "Data dicek 29 Oktober 2026. Angka bisa berubah bila gubernur merevisi SK."
4. **Halaman `/provinsi/<slug>`** — server-rendered: nama provinsi, UMP 2026, UMP 2025, kenaikan %, nomor SK, link sumber, link balik ke tabel. `<title>` SEO: `UMP <Provinsi> 2026 — Rp<nominal> | UMRO Monitor`. Slug tidak dikenal → 404 HTML.
5. **`scripts/validate.mjs`** (Node ≥18, tanpa dependency) yang:
   - start worker lokal lewat `npx wrangler dev --port 8788 --local` (spawn), tunggu sampai `/api/meta` menjawab (poll max 90 s), jalankan seluruh baterai, lalu kill proses.
   - Terima flag `--base=<url>` untuk menguji URL yang sudah deploy (skip spawn).
   - Asersi: meta 200 & `jumlah_provinsi === 38`; `/api/ump` 38 baris; `/api/ump/jawa-barat` nominal 2317601; `/api/ump/tidak-ada` = 404; `/api/top?n=3&arah=tertinggi` = Jakarta, Papua Selatan, Papua; `/` mengandung string `Rp5.729.876` DAN `Jawa Barat` DAN `PP No. 49 Tahun 2025` di HTML mentah (bukan hanya di JS); `/provinsi/aceh` mengandung `Rp3.932.552`; POST subscribe email valid → `ok:true`; POST email invalid → 400; total kenaikan tertinggi = Sulawesi Tengah 9.08.
   - Print satu baris per asersi `PASS`/`FAIL` + ringkasan `RESULT: PASS (n/n)` atau `RESULT: FAIL`, exit code 1 saat ada FAIL.
6. **`README.md`** singkat: apa itu, cara dev lokal, cara deploy, bentuk API, sumber data & tanggal cek, dan peringatan "jangan edit public/data/ump-2026.json tanpa memperbarui dicek_pada".

## Batasan keras
- Jangan ubah, regen, atau "rapikan" `public/data/ump-2026.json`. Baca saja.
- Tanpa dependency npm runtime (devDependency `wrangler` boleh). Tanpa framework, tanpa build step.
- Jangan deploy. Jangan jalankan `wrangler deploy` / `wrangler pages deploy`. Itu langkah operator.
- Jangan menyentuh repo lain di `/home/ubuntu` (cekweb, dosenku, dll).
- Jangan pakai D1 (kuota akun penuh). Penyimpanan hanya KV `umrmonitor_subs`.
- Semua tulisan file di dalam `/home/ubuntu/umrmonitor`.

## Kriteria selesai (harus bisa saya ulang sendiri)
1. `node scripts/validate.mjs` → `RESULT: PASS` dan exit 0.
2. `git status --porcelain` menunjukkan `public/data/ump-2026.json` TIDAK berubah (bandingkan sha256 dengan nilai ini: `681d61fe82ccba2a84172c8eaefa4eb74b70ca04f425e6e9d50b5f5ece0eac1f`).
3. `grep -c "Rp5.729.876" public/data/ump-2026.json` = 0 (dataset JSON mentah tidak menyimpan string terformat; format hanya di worker) — dan `curl /` memuat string itu.

## Laporan akhir (format persis)
```
FILES:
<path> — <satu baris fungsi>
CHECK:
<PASS/FAIL per asersi, ringkas>
VALIDATE: RESULT: ... exit=...
DATASET_SHA256: <sha256 public/data/ump-2026.json>
NOTES:
<hal yang menyimpang atau tidak teruji, atau "-">
```

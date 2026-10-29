# UMRO Monitor

**UMRO Monitor** adalah situs dan API referensi Upah Minimum Provinsi (UMP) Indonesia 2026 untuk 38 provinsi yang bertanggal, menyebutkan nomor SK penetapan, dasar hukum (`PP No. 49 Tahun 2025 tentang Pengupahan`), serta tautan sumber yang dapat diverifikasi oleh tim HR/payroll UMKM, konsultan HR, dan vendor HRIS.

## Pengembangan Lokal

Pastikan Node.js (≥18) sudah terpasang, lalu jalankan server lokal Cloudflare Worker:

```bash
npx wrangler dev --port 8788 --local
```

Untuk menjalankan pengujian otomatis penuh (menyalakan worker lokal, menguji seluruh endpoint HTML & API, lalu mematikan proses):

```bash
node scripts/validate.mjs
```

Atau menguji instance yang sudah berjalan/ter-deploy:

```bash
node scripts/validate.mjs --base=https://umrmonitor.example.workers.dev
```

## Cara Deploy (Oleh Operator)

Pastikan namespace KV `umrmonitor_subs` sudah terkonfigurasi di `wrangler.toml`, lalu jalankan:

```bash
npx wrangler deploy
```

## Bentuk Endpoint & API

- `GET /` — Halaman HTML utama (server-rendered) berisi tabel perbandingan UMP 2026 & 2025 untuk 38 provinsi, tautan sumber, dan form notifikasi UMP 2027.
- `GET /provinsi/:slug` — Halaman detail UMP per provinsi (mis. `/provinsi/aceh`, `/provinsi/jawa-barat`).
- `GET /api/meta` — Metadata dataset (`{dataset, tahun, dibuat, jumlah_provinsi, dasar_hukum, catatan, sumber_rekapitulasi}`).
- `GET /api/ump?tahun=2026` — Seluruh data provinsi (`{tahun, jumlah, provinsi: [...]}`). `?tahun=2025` mengembalikan kolom pembanding (`ump_sebelumnya`); tahun lain → 404 dengan `tahun_tersedia`.
- `GET /api/ump/:slug` — Detail JSON satu provinsi berdasarkan slug (404 jika tidak ditemukan).
- `GET /api/top?n=5&arah=tertinggi|terendah` — Daftar `n` provinsi dengan nominal UMP tertinggi atau terendah.
- `POST /api/subscribe` — Mendaftarkan email notifikasi UMP 2027 ke KV `umrmonitor_subs` dengan body JSON `{"email": "nama@domain.com"}`.

## Sumber Data & Tanggal Cek

- **File dataset**: `public/data/ump-2026.json`
- **Dasar hukum**: PP No. 49 Tahun 2025 tentang Pengupahan
- **Tanggal cek (`dicek_pada`)**: `2026-10-29`
- **Sumber rekapitulasi**:
  - `https://kariraman.com/en/minimum-wage`
  - `https://pajakku.com/artikel/daftar-ump-2026-terlengkap-di-38-provinsi-indonesia`
  - `https://www.cnbcindonesia.com/news/20260106132852-4-700023/ump-2026-akhirnya-beres-diketok-upah-di-papua-pegunungan-naik-segini`
  - `https://satudata.kemnaker.go.id/data/kumpulan-data/2252`

> **Peringatan Penting**: Jangan edit `public/data/ump-2026.json` tanpa memperbarui `dicek_pada`.

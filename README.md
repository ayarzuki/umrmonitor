# UMRO Monitor

Situs + API referensi **Upah Minimum Provinsi (UMP) Indonesia 2026** untuk 38 provinsi: nominal UMP 2026, pembanding 2025, persentase kenaikan, **nomor Surat Keputusan gubernur**, dasar hukum, dan tautan sumber per baris — plus tanggal pengecekan.

Dibuat untuk staf HR/payroll UMKM, konsultan HR, dan vendor HRIS yang tiap Desember memperbarui tarif secara manual. Satu provinsi terlewat = payroll salah.

**Live:** https://umrmonitor.aulya-yarzuki.workers.dev

> Angka resmi tetap mengacu pada SK gubernur dan publikasi Kementerian Ketenagakerjaan. Repo ini menghimpun ulang dari sumber publik yang dicantumkan per baris, dan mencatat kapan terakhir dicek.

## Kenapa repo ini ada

Kebanyakan tabel UMP beredar sebagai artikel berita yang terbit sekali lalu basi: tanpa nomor SK, tanpa tanggal cek, dan sering tidak lengkap saat media menutup artikel. Di sini setiap baris data membawa `berlaku_dari`, `nomor_sk`, `status_verifikasi`, `sumber_url[]`, dan `dicek_pada` — jadi klaim "angka ini berlaku" bisa dibuktikan, bukan dipercaya.

## Isi

```
src/index.js            Worker ES module: HTML server-rendered + API JSON
public/data/ump-2026.json   Dataset beku (38 provinsi, sha256 dijaga CI)
scripts/validate.mjs    13 asersi HTML+API, exit non-zero saat gagal
wrangler.toml           Worker + static assets + KV binding
TASK.md                 Brief build aslinya (konteks keputusan)
```

Tanpa framework, tanpa build step, tanpa dependency runtime. Satu `wrangler deploy` dan jalan.

## Jalankan lokal

Butuh Node.js ≥ 18.

```bash
npm install
npx wrangler dev --port 8788 --local
```

Baterai validasi — menyalakan worker lokal sendiri, menguji 13 asersi, lalu mematikan prosesnya:

```bash
node scripts/validate.mjs
```

Menguji instance yang sudah jalan/ter-deploy:

```bash
node scripts/validate.mjs --base=https://umrmonitor.aulya-yarzuki.workers.dev
```

## API

| Endpoint | Keterangan |
|---|---|
| `GET /` | Tabel 38 provinsi, server-rendered, + form notifikasi UMP 2027 |
| `GET /provinsi/:slug` | Halaman per provinsi (SEO: "UMP Jawa Barat 2026"), 404 kalau slug tak dikenal |
| `GET /api/meta` | `{dataset, tahun, dibuat, jumlah_provinsi, dasar_hukum, catatan, sumber_rekapitulasi}` |
| `GET /api/ump?tahun=2026` | Semua provinsi. `?tahun=2025` → kolom pembanding. Tahun lain → 404 + `tahun_tersedia` |
| `GET /api/ump/:slug` | Satu provinsi (404 JSON kalau tidak ada) |
| `GET /api/top?n=5&arah=tertinggi\|terendah` | n provinsi terurut nominal |
| `POST /api/subscribe` | Body `{"email":"..."}` → disimpan di KV, balas `{ok:true}`. Email invalid → 400 |

Contoh:

```bash
curl -s https://umrmonitor.aulya-yarzuki.workers.dev/api/ump/jawa-barat | jq
curl -s "https://umrmonitor.aulya-yarzuki.workers.dev/api/top?n=3&arah=tertinggi" | jq '.provinsi[].provinsi'
```

## Deploy sendiri

1. `npx wrangler kv namespace create umrmonitor_subs` → salin `id` ke `wrangler.toml`.
2. `npx wrangler deploy`.

`wrangler.toml` memakai nama Worker `umrmonitor`; ganti kalau nama itu sudah dipakai di akunmu (subdomain `*.workers.dev` ditentukan nama Worker).

## Data

- **File:** `public/data/ump-2026.json` — 38 provinsi, sha256 `681d61f…0eac1f`
- **Dasar hukum:** PP No. 49 Tahun 2025 tentang Pengupahan
- **Dicek pada:** 2026-10-29
- **Verifikasi silang:** `kariraman.com` (38/38) dan `pajakku.com` (38/38) cocok sampai rupiah; rekapitulasi Kemnaker via CNBC Indonesia (6 Jan 2026) cocok untuk seluruh provinsi kecuali Aceh, yang SK-nya baru terbit 6 Jan 2026 sebesar Rp3.932.552 (rekapitulasi awal masih memakai angka 2025).
- **Sumber lengkap:** lihat `sumber_rekapitulasi` di `/api/meta`

**Jangan edit dataset tanpa memperbarui `dicek_pada`** — CI dan watchdog membandingkan sha256 dan akan gagal kalau berubah tanpa nilai ekspektasi ikut diperbarui.

## Lisensi

Kode: **MIT** (`LICENSE`).

Dataset: fakta publik dari SK gubernur, dihimpun ulang dengan atribusi sumber per baris — catatan lengkap di `DATA.md`.

# UMRO Monitor

Situs + API referensi **Upah Minimum Provinsi (UMP) Indonesia 2026** untuk 38 provinsi: nominal UMP 2026, pembanding 2025, persentase kenaikan, **nomor Surat Keputusan gubernur**, dasar hukum, dan tautan sumber per baris — plus tanggal pengecekan.

Dibuat untuk staf HR/payroll UMKM, konsultan HR, dan vendor HRIS yang tiap Desember memperbarui tarif secara manual. Satu provinsi terlewat = payroll salah.

**Live:** https://umrmonitor.pages.dev

> Angka resmi tetap mengacu pada SK gubernur dan publikasi Kementerian Ketenagakerjaan. Repo ini menghimpun ulang dari sumber publik yang dicantumkan per baris, dan mencatat kapan terakhir dicek.

## Kenapa repo ini ada

Kebanyakan tabel UMP beredar sebagai artikel berita yang terbit sekali lalu basi: tanpa nomor SK, tanpa tanggal cek, dan sering tidak lengkap saat media menutup artikel. Di sini setiap baris data membawa `berlaku_dari`, `nomor_sk`, `status_verifikasi`, `sumber_url[]`, dan `dicek_pada` — jadi klaim "angka ini berlaku" bisa dibuktikan, bukan dipercaya.

## Isi

```
src/index.js            Worker ES module: HTML server-rendered + API JSON
public/data/ump-2026.json   Dataset UMP beku (38 provinsi, sha256 dijaga CI)
public/data/umk-2026.json   Dataset UMK kabupaten/kota (dibangun dari scripts/sources)
scripts/sources/umk/    Sumber per provinsi: SK, URL, baris, catatan (input dataset UMK)
scripts/build-umk.mjs   Gabung sumber per provinsi → public/data/umk-2026.json
scripts/verify-sources.mjs  Buktikan tiap nominal benar-benar ada di halaman sumbernya
scripts/validate.mjs    Asersi HTML+API, exit non-zero saat gagal
wrangler.toml           Worker + static assets + KV binding
TASK.md / TASK-UMK.md   Brief build (konteks keputusan)
```

Tanpa framework, tanpa build step, tanpa dependency runtime. Satu `wrangler deploy` dan jalan.

## Data UMK (kabupaten/kota)

Dataset UMK dibangun bertahap per provinsi, bukan diketik tangan:

```bash
node scripts/build-umk.mjs        # sumber → public/data/umk-2026.json (menolak baris tak masuk akal)
node scripts/verify-sources.mjs   # fetch ulang tiap URL sumber, cek nominal + nama daerah ada di halaman
```

`verify-sources.mjs` adalah penjaga utama: ia gagal (exit 1) kalau ada satu nominal pun yang tidak
ditemukan di halaman yang dikutip. Tanpa itu, "terverifikasi" cuma klaim.

Aturan yang dipakai: UMK tidak boleh di bawah UMP provinsi; provinsi yang seluruh daerahnya memakai UMP
ditandai `tanpa-umk` dengan URL konfirmasi; provinsi yang belum ketemu sumbernya ditandai
`belum-terverifikasi` — bukan diam-diam dianggap tidak ada.


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
| `GET /` | Tabel 38 provinsi (UMP) + ringkasan 5 UMK tertinggi/terendah, server-rendered, + form notifikasi |
| `GET /kota` | Daftar UMK kabupaten/kota (semua, `?provinsi=<slug>` untuk filter), + kotak cari |
| `GET /kota/:slug` | Halaman per kabupaten/kota (SEO: "UMK Kota Bekasi 2026"), 404 kalau tak dikenal |
| `GET /provinsi/:slug` | Halaman per provinsi (SEO: "UMP Jawa Barat 2026") + tabel UMK daerahnya, 404 kalau slug tak dikenal |
| `GET /api/meta` | `{dataset, tahun, dibuat, jumlah_provinsi, jumlah_kota, jumlah_provinsi_dengan_umk, dasar_hukum, catatan, sumber_rekapitulasi}` |
| `GET /api/ump?tahun=2026` | Semua provinsi. `?tahun=2025` → kolom pembanding. Tahun lain → 404 + `tahun_tersedia` |
| `GET /api/ump/:slug` | Satu provinsi (404 JSON kalau tidak ada) |
| `GET /api/umk?provinsi=<slug>` | Semua kabupaten/kota (opsional difilter provinsi) |
| `GET /api/umk/:slug` | Satu kabupaten/kota (404 JSON kalau tidak ada) |
| `GET /api/top?n=5&arah=tertinggi\|terendah` | n provinsi terurut nominal |
| `POST /api/subscribe` | Body `{"email":"..."}` → disimpan di KV, balas `{ok:true}`. Email invalid → 400, KV tidak ter-bind → 503 (tidak pernah sukses palsu) |
| `GET /api/subscribe/jumlah` | Jumlah langganan tersimpan (agregat saja) — dipakai checker untuk membuktikan tulisan benar-benar masuk |

Contoh:

```bash
curl -s https://umrmonitor.aulya-yarzuki.workers.dev/api/ump/jawa-barat | jq
curl -s "https://umrmonitor.aulya-yarzuki.workers.dev/api/top?n=3&arah=tertinggi" | jq '.provinsi[].provinsi'
```

## Deploy sendiri

Kanonik: **Cloudflare Pages** (`umrmonitor.pages.dev`).

```bash
node scripts/build-pages.mjs      # inline dataset → dist/_worker.js + aset
npx wrangler pages deploy dist --project-name umrmonitor --branch main
```

`wrangler.pages.toml` menyimpan konfigurasi Pages (nama project + binding KV). Wrangler **tidak**
menerima path config kustom untuk `pages deploy`, jadi binding KV `umrmonitor_subs` dipasang sekali
lewat dashboard/API pada project Pages-nya.

Worker (`wrangler.toml`) masih ada sebagai jalur cadangan, tapi route `workers.dev`-nya dimatikan
(`workers_dev = false`) supaya tidak ada dua salinan isi yang sama. Untuk mengaktifkannya lagi:

```bash
npx wrangler deploy        # Worker: umrmonitor.<subdomain-akun>.workers.dev
```

## Catatan operasional

- `node scripts/validate.mjs --base=https://umrmonitor.pages.dev` menulis kunci uji ke KV
  (`sub:hrd@contoh-umkm.co.id` dan `sub:uji-validator+<timestamp>@contoh-umkm.co.id`). Hapus setelah menguji:
  `npx wrangler kv key list --namespace-id <id> --remote` lalu `kv key delete` untuk kunci berpola itu.
- KV Cloudflare *eventually consistent*: tulisan baru bisa telat ~60 detik muncul di pembacaan lain.
  Karena itu asersi `POST /api/subscribe` membaca balik lewat `/api/subscribe/jumlah` dengan polling.

## Data

- **File:** `public/data/ump-2026.json` — 38 provinsi, sha256 `681d61f…0eac1f`
- **Dasar hukum:** PP No. 49 Tahun 2025 tentang Pengupahan
- **Dicek pada:** 2026-10-29
- **Verifikasi silang:** `kariraman.com` (38/38) dan `pajakku.com` (38/38) cocok sampai rupiah; rekapitulasi Kemnaker via CNBC Indonesia (6 Jan 2026) cocok untuk seluruh provinsi kecuali Aceh, yang SK-nya baru terbit 6 Jan 2026 sebesar Rp3.932.552 (rekapitulasi awal masih memakai angka 2025).
- **Sumber lengkap:** lihat `sumber_rekapitulasi` di `/api/meta`

### UMK kabupaten/kota

- **File:** `public/data/umk-2026.json` — 398 kabupaten/kota di 29 provinsi
- **Cakupan jujur:** 398 dari 514 kabupaten/kota nasional. Provinsi yang seluruh daerahnya memakai UMP
  ditandai `tanpa-umk` (8 provinsi, dengan URL konfirmasi); sisanya belum ada di sumber yang dibaca.
  Setiap baris membawa `nomor_sk`, `berlaku_dari`, `sumber_url[]`, dan `dicek_pada`.
- **Pembuktian:** `node scripts/verify-sources.mjs` → 398/398 baris terbukti muncul di halaman sumber
  yang dikutipnya (bukan hanya "kelihatan benar").
- **Kompilasi pihak ketiga:** sebagian baris berasal dari kompilasi **KarirAman**
  (https://kariraman.com/api/v1/minimum-wages/2026.json, lisensi **CC BY 4.0**, data per 8 Oktober 2026).
  Atribusi wajib dipertahankan saat data ditampilkan ulang.

**Jangan edit dataset tanpa memperbarui `dicek_pada`** — CI dan watchdog membandingkan sha256 dan akan gagal kalau berubah tanpa nilai ekspektasi ikut diperbarui.

## Lisensi

Kode: **MIT** (`LICENSE`).

Dataset: fakta publik dari SK gubernur, dihimpun ulang dengan atribusi sumber per baris — catatan lengkap di `DATA.md`.

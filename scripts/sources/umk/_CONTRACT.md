# Kontrak data UMK 2026 (untuk agen peneliti)

Tujuan: kumpulkan **Upah Minimum Kabupaten/Kota (UMK) 2026** untuk Indonesia, satu file JSON per provinsi.
Data akan dipublikasikan di umrmonitor.aulya-yarzuki.workers.dev — setiap angka harus bisa dicek pembaca lewat URL sumber.

## Lokasi output

`/home/ubuntu/umrmonitor/scripts/sources/umk/<slug-provinsi>.json`

Slug provinsi (pakai PERSIS ini):
aceh, bali, banten, bengkulu, di-yogyakarta, dki-jakarta, gorontalo, jambi, jawa-barat,
jawa-tengah, jawa-timur, kalimantan-barat, kalimantan-selatan, kalimantan-tengah,
kalimantan-timur, kalimantan-utara, kepulauan-bangka-belitung, kepulauan-riau, lampung,
maluku, maluku-utara, nusa-tenggara-barat, nusa-tenggara-timur, papua, papua-barat,
papua-barat-daya, papua-pegunungan, papua-selatan, papua-tengah, riau, sulawesi-barat,
sulawesi-selatan, sulawesi-tengah, sulawesi-tenggara, sulawesi-utara, sumatera-barat,
sumatera-selatan, sumatera-utara

## Bentuk file

```json
{
  "provinsi": "Jawa Barat",
  "slug": "jawa-barat",
  "tahun": 2026,
  "nomor_sk": "Keputusan Gubernur Jawa Barat Nomor 561.7/Kep.862-Kesra/2025",
  "tanggal_sk": "2025-12-24",
  "berlaku_dari": "2026-01-01",
  "catatan": "",
  "sumber": [
    {"url": "https://...", "tipe": "berita", "judul": "...", "diakses": "2026-10-29"}
  ],
  "rows": [
    {"nama": "Kota Bekasi", "jenis": "Kota", "umk": 5999443},
    {"nama": "Kabupaten Bandung", "jenis": "Kabupaten", "umk": 3972202}
  ]
}
```

Kalau provinsi TIDAK menetapkan UMK 2026 (mis. DKI Jakarta hanya UMP + upah sektoral), tetap tulis filenya dengan `"rows": []` dan `"catatan"` yang menjelaskan sebabnya + URL sumber.

## Aturan keras

1. **Angka bukan karangan.** Setiap `umk` harus muncul secara literal di salah satu halaman `sumber` (bentuk `5.999.443`, `5,999.443`, atau `5999443`). Kalau tidak muncul di teks halaman, jangan masukkan angkanya.
2. **UMK, bukan UMP, bukan UMSK.** Jangan masukkan upah minimum sektoral. Jangan masukkan angka 2025.
3. `nomor_sk` = nomor Keputusan Gubernur yang menetapkan UMK provinsi itu (satu SK untuk seluruh kab/kota di provinsi tersebut, kalau memang begitu). Kalau sumber tidak menyebut nomor SK, isi `null` dan sebutkan di `catatan`.
4. `nama` pakai awalan "Kabupaten " atau "Kota " sesuai sumber. `jenis` = "Kabupaten" atau "Kota".
5. Simpan `umk` sebagai angka; kalau sumber menulis sen (mis. 3.360.078,06) simpan `3360078.06` apa adanya. Pembulatan hanya urusan tampilan.
6. Prioritaskan sumber: (a) JDIH/SK resmi provinsi, (b) media arus utama (detik, kompas, kontan, bisnis, tempo, antara, cnbc indonesia, katadata, hukumonline). **Jangan** pakai situs konten AI/SEO tanpa byline sebagai satu-satunya sumber.
7. Kalau dua sumber kredibel berbeda angka untuk daerah yang sama: jangan dirata-rata, jangan pilih diam-diam — masukkan angka yang cocok dengan sumber resmi/SK, dan tulis selisihnya di `catatan`.
8. Minimal satu `sumber` harus memuat **seluruh** baris provinsi itu (tabel lengkap), bukan cuma 3 daerah tertinggi.
9. Cakupan: semua kabupaten/kota di provinsi itu yang punya UMK 2026. Kalau ada kab/kota yang tidak menetapkan UMK, tulis namanya di `catatan`.

## Verifikasi sebelum lapor

1. Buka setiap `sumber` sekali lagi, konfirmasi HTTP 200 dan angka-angkanya ada di teks.
2. Cek semua `umk` ≥ UMP provinsi 2026 (lihat `/home/ubuntu/umrmonitor/public/data/ump-2026.json`). UMK di bawah UMP = salah, perbaiki atau buang.
3. Cek tidak ada duplikat `nama` dan tidak ada nominal 0/null.
4. `python3 -c "import json;d=json.load(open('<file>'));print(len(d['rows']))"` harus jalan tanpa error.

## Laporan akhir

Sebutkan: file yang ditulis, jumlah baris per provinsi, sumber utama yang dipakai, dan provinsi yang tidak punya UMK beserta alasannya. Jangan mengaku selesai untuk provinsi yang filenya belum ada.

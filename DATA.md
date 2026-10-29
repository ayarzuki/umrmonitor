# Catatan Data

Kode di repositori ini berlisensi MIT (lihat `LICENSE`). Catatan di bawah ini
berlaku untuk **dataset**, bukan kode.

## `public/data/ump-2026.json`

- Berisi **fakta** upah minimum provinsi yang ditetapkan pemerintah daerah
  Indonesia melalui Surat Keputusan Gubernur, dihimpun ulang dari sumber
  publik yang dicantumkan per baris pada field `sumber_url`.
- Setiap baris membawa `berlaku_dari`, `nomor_sk`, `status_verifikasi`, dan
  `dicek_pada` agar bisa ditelusuri ulang.
- Dataset disediakan **apa adanya** untuk keperluan referensi. Angka resmi
  tetap mengacu pada SK gubernur dan publikasi Kementerian Ketenagakerjaan.
- Nomor SK dicatat sebagaimana tertulis di sumber; beberapa provinsi
  menerbitkan SK tanpa nomor lengkap, dan itu ditandai di dataset.
- Isi dataset **tidak** boleh diubah tanpa memperbarui `dicek_pada`. CI
  (`.github/workflows/validate.yml`) dan watchdog membandingkan sha256 dan akan
  gagal kalau berubah tanpa nilai ekspektasi ikut diperbarui.

## Bukan nasihat hukum

Situs dan data ini bukan nasihat hukum atau ketenagakerjaan. Untuk keputusan
pengupahan, rujuk SK gubernur dan peraturan yang berlaku.

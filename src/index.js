import dataset from "../public/data/ump-2026.json";
import umkDataset from "../public/data/umk-2026.json";

const CORS_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "Content-Type, Accept",
};

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function formatRupiah(num) {
  // Standar tampilan: SELALU bilangan bulat, tanpa desimal — "Rp3.932.552".
  // Nilai dengan sen (mis. 3.100.881,40) dibulatkan ke rupiah terdekat.
  const n = Number(num);
  if (!Number.isFinite(n)) return "—";
  const bulat = Math.round(n);
  const formattedInt = String(bulat).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `Rp${formattedInt}`;
}

function formatTanggalID(iso) {
  // "2026-01-01" -> "1 Januari 2026" (konvensi Indonesia, dipakai di badge & footer).
  const bulan = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
  ];
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso ?? ""));
  if (!m) return String(iso ?? "");
  const [, y, mo, d] = m;
  return `${Number(d)} ${bulan[Number(mo) - 1] ?? mo} ${y}`;
}

function formatPersen(num) {
  // Konvensi Indonesia: koma sebagai pemisah desimal (6,7% bukan 6.7%).
  const n = Number(num);
  if (!Number.isFinite(n)) return "—";
  const teks = Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100);
  return `${teks.replace(".", ",")}%`;
}

function jsonResponse(data, status = 200, cacheControl = "public, max-age=300") {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": cacheControl,
      ...CORS_HEADERS,
    },
  });
}

function htmlResponse(html, status = 200) {
  return new Response(html, {
    status,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=300",
      ...CORS_HEADERS,
    },
  });
}

const BASE_STYLES = `
  :root {
    --bg: #f8fafc;
    --surface: #ffffff;
    --border: #e2e8f0;
    --text: #0f172a;
    --muted: #475569;
    --primary: #0f766e;
    --primary-hover: #115e59;
    --green-bg: #dcfce7;
    --green-text: #166534;
    --gray-bg: #f1f5f9;
    --gray-text: #475569;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    background: var(--bg);
    color: var(--text);
    line-height: 1.5;
  }
  .container {
    max-width: 1080px;
    margin: 0 auto;
    padding: 1rem;
  }
  header {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 1.25rem;
    margin-bottom: 1.25rem;
  }
  h1 {
    margin: 0 0 0.25rem 0;
    font-size: 1.6rem;
    letter-spacing: -0.02em;
  }
  .tagline {
    margin: 0 0 0.85rem 0;
    color: var(--muted);
    font-size: 1rem;
  }
  .badges {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  .badge {
    display: inline-block;
    padding: 0.25rem 0.65rem;
    border-radius: 999px;
    font-size: 0.82rem;
    font-weight: 600;
    background: #e0f2fe;
    color: #0369a1;
    border: 1px solid #bae6fd;
  }
  .badge-year {
    background: #0f766e;
    color: #ffffff;
    border-color: #0f766e;
  }
  .table-wrap {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 10px;
    overflow-x: auto;
    margin-bottom: 1.25rem;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.92rem;
  }
  th, td {
    padding: 0.65rem 0.75rem;
    border-bottom: 1px solid var(--border);
    text-align: left;
    white-space: nowrap;
  }
  th {
    background: #f1f5f9;
    font-weight: 600;
    color: #1e293b;
  }
  td.num, th.num {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
  tbody tr:hover {
    background: #f8fafc;
  }
  a {
    color: var(--primary);
    text-decoration: none;
    font-weight: 500;
  }
  a:hover {
    text-decoration: underline;
  }
  .pct-badge {
    display: inline-block;
    padding: 0.15rem 0.5rem;
    border-radius: 6px;
    font-weight: 600;
    font-size: 0.84rem;
  }
  .pct-up {
    background-color: var(--green-bg);
    color: var(--green-text);
  }
  .pct-zero {
    background-color: var(--gray-bg);
    color: var(--gray-text);
  }
  .box {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 1.25rem;
    margin-bottom: 1.25rem;
  }
  .box h2 {
    margin: 0 0 0.75rem 0;
    font-size: 1.15rem;
  }
  .source-list {
    margin: 0.5rem 0;
    padding-left: 1.25rem;
  }
  .source-list li {
    margin-bottom: 0.35rem;
    word-break: break-all;
  }
  .sub-form {
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
    max-width: 480px;
  }
  .sub-form input[type="email"] {
    padding: 0.6rem 0.75rem;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    font-size: 0.95rem;
  }
  .sub-form button {
    padding: 0.65rem 1rem;
    border: none;
    border-radius: 6px;
    background: var(--primary);
    color: #ffffff;
    font-weight: 600;
    font-size: 0.95rem;
    cursor: pointer;
  }
  .sub-form button:hover {
    background: var(--primary-hover);
  }
  #hasil {
    margin-top: 0.5rem;
    font-size: 0.9rem;
    font-weight: 500;
  }
  .dl-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 0.65rem;
    margin: 1rem 0;
  }
  .dl-item {
    padding: 0.65rem 0.85rem;
    background: #f8fafc;
    border: 1px solid var(--border);
    border-radius: 8px;
  }
  .dl-label {
    font-size: 0.8rem;
    color: var(--muted);
    margin-bottom: 0.2rem;
  }
  .dl-val {
    font-size: 1.05rem;
    font-weight: 600;
  }
  footer {
    text-align: center;
    color: var(--muted);
    font-size: 0.85rem;
    padding: 1rem 0 2rem 0;
  }
  @media (min-width: 640px) {
    .container { padding: 1.5rem; }
    .sub-form { flex-direction: row; align-items: center; max-width: 640px; }
    .sub-form input[type="email"] { flex: 1; }
    .dl-grid { grid-template-columns: repeat(2, 1fr); }
  }
`;

function formatSelisih(num) {
  const n = Number(num);
  if (!Number.isFinite(n)) return "—";
  const bulat = Math.round(n);
  if (bulat > 0) return `+${formatRupiah(bulat)}`;
  if (bulat < 0) return `-${formatRupiah(Math.abs(bulat))}`;
  return "Rp0";
}

function renderHomePage() {
  const rowsHtml = dataset.provinsi
    .map((p, idx) => {
      const pctClass = p.kenaikan_persen > 0 ? "pct-badge pct-up" : "pct-badge pct-zero";
      return `<tr>
        <td>${idx + 1}</td>
        <td><a href="/provinsi/${escapeHtml(p.slug)}">${escapeHtml(p.provinsi)}</a></td>
        <td class="num">${formatRupiah(p.ump)}</td>
        <td class="num">${formatRupiah(p.ump_sebelumnya)}</td>
        <td class="num"><span class="${pctClass}">${formatPersen(p.kenaikan_persen)}</span></td>
      </tr>`;
    })
    .join("\n");

  const sortedUmkDesc = [...umkDataset.kota].sort((a, b) => b.umk - a.umk);
  const sortedUmkAsc = [...umkDataset.kota].sort((a, b) => a.umk - b.umk);
  const top5Umk = sortedUmkDesc.slice(0, 5);
  const bottom5Umk = sortedUmkAsc.slice(0, 5);

  const renderMiniUmkRows = (list) =>
    list
      .map(
        (k, i) => `<tr>
          <td>${i + 1}</td>
          <td><a href="/kota/${escapeHtml(k.slug)}">${escapeHtml(k.nama)}</a></td>
          <td><a href="/provinsi/${escapeHtml(k.provinsi_slug)}">${escapeHtml(k.provinsi)}</a></td>
          <td class="num">${formatRupiah(k.umk)}</td>
        </tr>`
      )
      .join("\n");

  const tanggalCek = dataset.provinsi[0]?.dicek_pada || dataset.dibuat;
  const sumberLinks = dataset.sumber_rekapitulasi
    .map(
      (url) =>
        `<li><a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(url)}</a> (dicek ${escapeHtml(formatTanggalID(tanggalCek))})</li>`
    )
    .join("\n");

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>UMRO Monitor — Upah minimum Indonesia, bertanggal dan bisa dicek.</title>
  <meta name="description" content="Tabel Upah Minimum Provinsi (UMP) Indonesia 2026 lengkap 38 provinsi dan UMK Kabupaten/Kota beserta nomor SK, dasar hukum PP No. 49 Tahun 2025, dan tautan sumber.">
  <style>${BASE_STYLES}</style>
</head>
<body>
  <div class="container">
    <header>
      <h1>UMRO Monitor</h1>
      <p class="tagline">Upah minimum Indonesia, bertanggal dan bisa dicek.</p>
      <div class="badges">
        <span class="badge badge-year">2026</span>
        <span class="badge">berlaku 1 Januari 2026</span>
        <span class="badge">${escapeHtml(dataset.dasar_hukum)}</span>
      </div>
      <p style="margin:0.85rem 0 0 0;"><a href="/kota">Lihat tabel UMK ${escapeHtml(umkDataset.jumlah_kota)} kabupaten/kota di ${escapeHtml(umkDataset.jumlah_provinsi_dengan_umk)} provinsi &rarr;</a></p>
    </header>

    <main>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>No</th>
              <th>Provinsi</th>
              <th class="num">UMP 2026</th>
              <th class="num">UMP 2025</th>
              <th class="num">Kenaikan %</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>

      <section class="box" id="umk-kabupaten-kota">
        <h2>UMK kabupaten/kota 2026</h2>
        <p>Cakupan: <strong>${escapeHtml(umkDataset.jumlah_kota)} kabupaten/kota di ${escapeHtml(umkDataset.jumlah_provinsi_dengan_umk)} provinsi</strong>. <a href="/kota">Lihat daftar lengkap UMK kabupaten/kota &rarr;</a></p>
        <div class="dl-grid">
          <div>
            <h3 style="margin:0 0 0.5rem 0;font-size:1rem;">5 UMK Tertinggi Nasional</h3>
            <div class="table-wrap" style="margin-bottom:0;">
              <table>
                <thead>
                  <tr>
                    <th>No</th>
                    <th>Kabupaten/Kota</th>
                    <th>Provinsi</th>
                    <th class="num">UMK 2026</th>
                  </tr>
                </thead>
                <tbody>
                  ${renderMiniUmkRows(top5Umk)}
                </tbody>
              </table>
            </div>
          </div>
          <div>
            <h3 style="margin:0 0 0.5rem 0;font-size:1rem;">5 UMK Terendah Nasional</h3>
            <div class="table-wrap" style="margin-bottom:0;">
              <table>
                <thead>
                  <tr>
                    <th>No</th>
                    <th>Kabupaten/Kota</th>
                    <th>Provinsi</th>
                    <th class="num">UMK 2026</th>
                  </tr>
                </thead>
                <tbody>
                  ${renderMiniUmkRows(bottom5Umk)}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      <section class="box" id="sumber-data">
        <h2>Sumber &amp; tanggal cek</h2>
        <p><strong>Dasar hukum:</strong> ${escapeHtml(dataset.dasar_hukum)}</p>
        <p><strong>Tanggal cek:</strong> ${escapeHtml(formatTanggalID(tanggalCek))}</p>
        <p>${escapeHtml(dataset.catatan)}</p>
        <ul class="source-list">
          ${sumberLinks}
        </ul>
      </section>

      <section class="box" id="subscribe-box">
        <h2>Notifikasi UMP 2027</h2>
        <form id="form-subscribe" class="sub-form" onsubmit="return false;">
          <input type="email" id="email" name="email" placeholder="nama@perusahaan.co.id" required aria-label="Alamat email">
          <button type="submit" id="btn-subscribe">Ingatkan saya saat UMP 2027 terbit</button>
        </form>
        <div id="hasil" role="status" aria-live="polite"></div>
      </section>
    </main>

    <footer>
      Data dicek 29 Oktober 2026. Angka bisa berubah bila gubernur merevisi SK.
    </footer>
  </div>

  <script>
    (function () {
      var form = document.getElementById("form-subscribe");
      var emailInput = document.getElementById("email");
      var btn = document.getElementById("btn-subscribe");
      var hasil = document.getElementById("hasil");

      async function submitSubscribe(e) {
        if (e) e.preventDefault();
        var email = (emailInput.value || "").trim();
        hasil.textContent = "Memproses...";
        btn.disabled = true;
        try {
          var res = await fetch("/api/subscribe", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ email: email })
          });
          var data = await res.json();
          if (res.ok && data.ok) {
            hasil.textContent = "Terdaftar: " + email + " akan diingatkan saat UMP 2027 terbit.";
            emailInput.value = "";
          } else {
            hasil.textContent = "Gagal: " + (data.error || "email tidak valid");
          }
        } catch (err) {
          hasil.textContent = "Gagal menghubungi server.";
        } finally {
          btn.disabled = false;
        }
      }

      form.addEventListener("submit", submitSubscribe);
    })();
  </script>
</body>
</html>`;
}

function renderProvinsiPage(p) {
  const ump2026Formatted = formatRupiah(p.ump);
  const ump2025Formatted = formatRupiah(p.ump_sebelumnya);
  const pctClass = p.kenaikan_persen > 0 ? "pct-badge pct-up" : "pct-badge pct-zero";
  const sumberLinks = (p.sumber_url || [])
    .map(
      (url) =>
        `<li><a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(url)}</a></li>`
    )
    .join("\n");

  const kotaProv = umkDataset.kota.filter((k) => k.provinsi_slug === p.slug);
  const cakupanProv = (umkDataset.cakupan || []).find((c) => c.slug === p.slug);

  let umkSectionHtml = "";
  if (kotaProv.length > 0) {
    const kotaRows = kotaProv
      .map(
        (k, idx) => `<tr>
          <td>${idx + 1}</td>
          <td><a href="/kota/${escapeHtml(k.slug)}">${escapeHtml(k.nama)}</a></td>
          <td class="num">${formatRupiah(k.umk)}</td>
          <td class="num">${formatSelisih(k.selisih_ump)}</td>
          <td>${escapeHtml(k.nomor_sk || "—")}</td>
        </tr>`
      )
      .join("\n");

    umkSectionHtml = `<section class="box" id="umk-provinsi">
      <h2>UMK Kabupaten/Kota di ${escapeHtml(p.provinsi)} (${kotaProv.length} daerah)</h2>
      ${cakupanProv && cakupanProv.catatan ? `<p>${escapeHtml(cakupanProv.catatan)}</p>` : ""}
      <p><a href="/kota?provinsi=${escapeHtml(p.slug)}">Filter daftar UMK untuk ${escapeHtml(p.provinsi)} &rarr;</a></p>
      <div class="table-wrap" style="margin-bottom:0;">
        <table>
          <thead>
            <tr>
              <th>No</th>
              <th>Kabupaten/Kota</th>
              <th class="num">UMK 2026</th>
              <th class="num">Selisih vs UMP provinsi</th>
              <th>SK</th>
            </tr>
          </thead>
          <tbody>
            ${kotaRows}
          </tbody>
        </table>
      </div>
    </section>`;
  } else {
    const catatanTidakAda =
      (cakupanProv && cakupanProv.catatan) ||
      "Provinsi ini tidak menetapkan UMK kabupaten/kota terpisah; seluruh wilayah menggunakan UMP provinsi.";
    umkSectionHtml = `<section class="box" id="umk-provinsi">
      <h2>UMK Kabupaten/Kota di ${escapeHtml(p.provinsi)}</h2>
      <p>${escapeHtml(catatanTidakAda)}</p>
      <p><a href="/kota?provinsi=${escapeHtml(p.slug)}">Lihat halaman UMK (${escapeHtml(p.provinsi)})</a> | <a href="/kota">Lihat seluruh UMK kabupaten/kota &rarr;</a></p>
    </section>`;
  }

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>UMP ${escapeHtml(p.provinsi)} 2026 — ${ump2026Formatted} | UMRO Monitor</title>
  <meta name="description" content="UMP ${escapeHtml(p.provinsi)} 2026 sebesar ${ump2026Formatted} (naik ${formatPersen(p.kenaikan_persen)} dari 2025: ${ump2025Formatted}). SK: ${escapeHtml(p.nomor_sk)}.">
  <style>${BASE_STYLES}</style>
</head>
<body>
  <div class="container">
    <header>
      <p style="margin:0 0 0.5rem 0;"><a href="/">&larr; Kembali ke tabel 38 provinsi</a> | <a href="/kota">Daftar UMK Kabupaten/Kota</a></p>
      <h1>UMP ${escapeHtml(p.provinsi)} 2026</h1>
      <p class="tagline">UMRO Monitor — Upah minimum Indonesia, bertanggal dan bisa dicek.</p>
      <div class="badges">
        <span class="badge badge-year">${escapeHtml(p.tahun)}</span>
        <span class="badge">berlaku ${escapeHtml(formatTanggalID(p.berlaku_dari))}</span>
        <span class="badge">${escapeHtml(dataset.dasar_hukum)}</span>
      </div>
    </header>

    <main>
      <section class="box">
        <h2>Rincian Ketetapan Upah Minimum Provinsi</h2>
        <div class="dl-grid">
          <div class="dl-item">
            <div class="dl-label">Provinsi</div>
            <div class="dl-val">${escapeHtml(p.provinsi)}</div>
          </div>
          <div class="dl-item">
            <div class="dl-label">UMP 2026</div>
            <div class="dl-val">${ump2026Formatted}</div>
          </div>
          <div class="dl-item">
            <div class="dl-label">UMP 2025</div>
            <div class="dl-val">${ump2025Formatted}</div>
          </div>
          <div class="dl-item">
            <div class="dl-label">Kenaikan</div>
            <div class="dl-val"><span class="${pctClass}">${formatPersen(p.kenaikan_persen)}</span></div>
          </div>
          <div class="dl-item">
            <div class="dl-label">Nomor SK / Penetapan</div>
            <div class="dl-val">${escapeHtml(p.nomor_sk)}</div>
          </div>
          <div class="dl-item">
            <div class="dl-label">Tanggal Berlaku &amp; Verifikasi</div>
            <div class="dl-val">${escapeHtml(formatTanggalID(p.berlaku_dari))} (${escapeHtml(p.status_verifikasi)}, dicek ${escapeHtml(formatTanggalID(p.dicek_pada))})</div>
          </div>
        </div>

        <h3>Sumber Verifikasi</h3>
        <ul class="source-list">
          ${sumberLinks}
        </ul>
        <p style="margin-top:1rem;"><a href="/">&larr; Lihat perbandingan UMP 38 provinsi Indonesia</a></p>
      </section>

      ${umkSectionHtml}
    </main>

    <footer>
      Data dicek 29 Oktober 2026. Angka bisa berubah bila gubernur merevisi SK.
    </footer>
  </div>
</body>
</html>`;
}

function renderKotaListPage(provinsiSlug) {
  const allKota = umkDataset.kota || [];
  const filteredKota = provinsiSlug
    ? allKota.filter((k) => k.provinsi_slug === provinsiSlug)
    : allKota;

  const basisRingkasan = filteredKota.length > 0 ? filteredKota : allKota;
  const sortedDesc = [...basisRingkasan].sort((a, b) => b.umk - a.umk);
  const sortedAsc = [...basisRingkasan].sort((a, b) => a.umk - b.umk);
  const tertinggi = sortedDesc[0];
  const terendah = sortedAsc[0];

  const rowsHtml = filteredKota
    .map(
      (k, idx) => `<tr data-nama="${escapeHtml(k.nama.toLowerCase())}" data-provinsi="${escapeHtml(k.provinsi.toLowerCase())}">
        <td>${idx + 1}</td>
        <td><a href="/kota/${escapeHtml(k.slug)}">${escapeHtml(k.nama)}</a></td>
        <td><a href="/provinsi/${escapeHtml(k.provinsi_slug)}">${escapeHtml(k.provinsi)}</a></td>
        <td class="num">${formatRupiah(k.umk)}</td>
        <td class="num">${formatSelisih(k.selisih_ump)}</td>
        <td>${escapeHtml(k.nomor_sk || "—")}</td>
      </tr>`
    )
    .join("\n");

  const provinsiOptions = (umkDataset.cakupan || [])
    .filter((c) => c.jumlah_umk > 0)
    .map(
      (c) =>
        `<option value="${escapeHtml(c.slug)}"${c.slug === provinsiSlug ? " selected" : ""}>${escapeHtml(c.provinsi)} (${escapeHtml(c.jumlah_umk)})</option>`
    )
    .join("\n");

  const cakupanProv = provinsiSlug
    ? (umkDataset.cakupan || []).find((c) => c.slug === provinsiSlug)
    : null;

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Daftar UMK Kabupaten/Kota Indonesia ${escapeHtml(umkDataset.tahun)} | UMRO Monitor</title>
  <meta name="description" content="Tabel Upah Minimum Kabupaten/Kota (UMK) Indonesia ${escapeHtml(umkDataset.tahun)}: ${escapeHtml(umkDataset.jumlah_kota)} kabupaten/kota di ${escapeHtml(umkDataset.jumlah_provinsi_dengan_umk)} provinsi beserta selisih terhadap UMP dan nomor SK.">
  <style>${BASE_STYLES}</style>
</head>
<body>
  <div class="container">
    <header>
      <p style="margin:0 0 0.5rem 0;"><a href="/">&larr; Kembali ke tabel UMP 38 provinsi</a></p>
      <h1>Daftar UMK Kabupaten/Kota ${escapeHtml(umkDataset.tahun)}</h1>
      <p class="tagline">Cakupan: ${escapeHtml(umkDataset.jumlah_kota)} kabupaten/kota di ${escapeHtml(umkDataset.jumlah_provinsi_dengan_umk)} provinsi${umkDataset.jumlah_kab_kota_nasional ? ` — dari ${escapeHtml(umkDataset.jumlah_kab_kota_nasional)} kabupaten/kota nasional` : ""}.</p>
      <p class="tagline" style="font-size:0.82rem;">Setiap baris mencantumkan nomor SK dan URL sumber. Daerah yang belum tercatat di sini memakai UMP provinsinya, atau UMK-nya belum kami temukan di sumber yang dibaca — bukan berarti tidak ada.</p>
      <div class="badges">
        <span class="badge badge-year">${escapeHtml(umkDataset.tahun)}</span>
        <span class="badge">${escapeHtml(umkDataset.dasar_hukum)}</span>
        <span class="badge">${escapeHtml(umkDataset.jumlah_kota)} kabupaten/kota di ${escapeHtml(umkDataset.jumlah_provinsi_dengan_umk)} provinsi</span>
      </div>
    </header>

    <main>
      <section class="box" id="ringkasan-umk">
        <h2>Ringkasan UMK ${provinsiSlug && cakupanProv ? escapeHtml(cakupanProv.provinsi) : "Nasional"}</h2>
        <div class="dl-grid">
          <div class="dl-item">
            <div class="dl-label">UMK Tertinggi</div>
            <div class="dl-val">${tertinggi ? `${escapeHtml(tertinggi.nama)} — ${formatRupiah(tertinggi.umk)}` : "—"}</div>
          </div>
          <div class="dl-item">
            <div class="dl-label">UMK Terendah</div>
            <div class="dl-val">${terendah ? `${escapeHtml(terendah.nama)} — ${formatRupiah(terendah.umk)}` : "—"}</div>
          </div>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:0.75rem;align-items:center;margin-top:0.75rem;">
          <div style="flex:1;min-width:220px;">
            <label for="cari-kota" style="display:block;font-size:0.82rem;color:var(--muted);margin-bottom:0.25rem;">Cari kabupaten/kota:</label>
            <input type="search" id="cari-kota" placeholder="Ketik nama kabupaten atau kota..." style="width:100%;padding:0.55rem 0.75rem;border:1px solid #cbd5e1;border-radius:6px;font-size:0.95rem;">
          </div>
          <form method="GET" action="/kota" style="display:flex;gap:0.5rem;align-items:flex-end;flex-wrap:wrap;">
            <div>
              <label for="pilih-provinsi" style="display:block;font-size:0.82rem;color:var(--muted);margin-bottom:0.25rem;">Filter provinsi:</label>
              <select id="pilih-provinsi" name="provinsi" style="padding:0.55rem 0.75rem;border:1px solid #cbd5e1;border-radius:6px;font-size:0.95rem;">
                <option value="">Semua provinsi (${escapeHtml(umkDataset.jumlah_kota)})</option>
                ${provinsiOptions}
              </select>
            </div>
            <button type="submit" style="padding:0.58rem 0.9rem;border:none;border-radius:6px;background:var(--primary);color:#fff;font-weight:600;cursor:pointer;">Terapkan</button>
            ${provinsiSlug ? `<a href="/kota" style="padding:0.55rem 0.65rem;">Reset</a>` : ""}
          </form>
        </div>
        ${provinsiSlug && filteredKota.length === 0 ? `<p style="margin-top:0.75rem;">${escapeHtml(cakupanProv?.catatan || "Tidak ada data UMK untuk filter provinsi ini.")}</p>` : ""}
      </section>

      <div class="table-wrap">
        <table id="tabel-kota">
          <thead>
            <tr>
              <th>No</th>
              <th>Kabupaten/Kota</th>
              <th>Provinsi</th>
              <th class="num">UMK 2026</th>
              <th class="num">Selisih vs UMP provinsi</th>
              <th>SK</th>
            </tr>
          </thead>
          <tbody id="tbody-kota">
            ${rowsHtml}
          </tbody>
        </table>
      </div>
    </main>

    <footer>
      Data dicek ${escapeHtml(formatTanggalID(umkDataset.dicek_pada))}. Angka bisa berubah bila gubernur merevisi SK.<br>
      Sebagian data berasal dari kompilasi <a href="${escapeHtml(umkDataset.kompilasi?.url || "https://kariraman.com/")}" target="_blank" rel="noopener noreferrer">${escapeHtml(umkDataset.kompilasi?.nama || "KarirAman")}</a>${umkDataset.kompilasi?.lisensi ? ` (lisensi ${escapeHtml(umkDataset.kompilasi.lisensi)})` : ""}${umkDataset.kompilasi?.data_per ? `, data per ${escapeHtml(formatTanggalID(umkDataset.kompilasi.data_per))}` : ""}; tiap baris tetap mencantumkan URL sumber aslinya.
    </footer>
  </div>

  <script>
    (function () {
      var input = document.getElementById("cari-kota");
      var tbody = document.getElementById("tbody-kota");
      if (!input || !tbody) return;
      var rows = Array.prototype.slice.call(tbody.querySelectorAll("tr"));
      input.addEventListener("input", function () {
        var q = (input.value || "").toLowerCase().trim();
        for (var i = 0; i < rows.length; i++) {
          var tr = rows[i];
          var text = (tr.getAttribute("data-nama") || "") + " " + (tr.getAttribute("data-provinsi") || "");
          tr.style.display = !q || text.indexOf(q) !== -1 ? "" : "none";
        }
      });
    })();
  </script>
</body>
</html>`;
}

function renderKotaDetailPage(k) {
  const umkFormatted = formatRupiah(k.umk);
  const umpProvFormatted = formatRupiah(k.ump_provinsi);
  const selisihFormatted = formatSelisih(k.selisih_ump);
  const sumberLinks = (k.sumber_url || [])
    .map(
      (url) =>
        `<li><a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(url)}</a></li>`
    )
    .join("\n");

  const top5Provinsi = umkDataset.kota
    .filter((item) => item.provinsi_slug === k.provinsi_slug)
    .sort((a, b) => b.umk - a.umk)
    .slice(0, 5);

  const top5Rows = top5Provinsi
    .map(
      (item, idx) => `<tr>
        <td>${idx + 1}</td>
        <td><a href="/kota/${escapeHtml(item.slug)}">${escapeHtml(item.nama)}</a>${item.slug === k.slug ? " <strong>(daerah ini)</strong>" : ""}</td>
        <td class="num">${formatRupiah(item.umk)}</td>
        <td class="num">${formatSelisih(item.selisih_ump)}</td>
      </tr>`
    )
    .join("\n");

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>UMK ${escapeHtml(k.nama)} 2026 — ${umkFormatted} | UMRO Monitor</title>
  <meta name="description" content="UMK ${escapeHtml(k.nama)} (${escapeHtml(k.provinsi)}) tahun 2026 sebesar ${umkFormatted}, selisih ${selisihFormatted} terhadap UMP ${escapeHtml(k.provinsi)} (${umpProvFormatted}). SK: ${escapeHtml(k.nomor_sk || "—")}.">
  <style>${BASE_STYLES}</style>
</head>
<body>
  <div class="container">
    <header>
      <p style="margin:0 0 0.5rem 0;"><a href="/kota">&larr; Semua UMK Kabupaten/Kota</a> | <a href="/provinsi/${escapeHtml(k.provinsi_slug)}">Provinsi ${escapeHtml(k.provinsi)}</a></p>
      <h1>UMK ${escapeHtml(k.nama)} 2026</h1>
      <p class="tagline">Provinsi <a href="/provinsi/${escapeHtml(k.provinsi_slug)}">${escapeHtml(k.provinsi)}</a> — UMRO Monitor</p>
      <div class="badges">
        <span class="badge badge-year">2026</span>
        <span class="badge">berlaku ${escapeHtml(formatTanggalID(k.berlaku_dari))}</span>
        <span class="badge">${escapeHtml(umkDataset.dasar_hukum)}</span>
      </div>
    </header>

    <main>
      <section class="box">
        <h2>Rincian Ketetapan UMK ${escapeHtml(k.nama)}</h2>
        <div class="dl-grid">
          <div class="dl-item">
            <div class="dl-label">Kabupaten/Kota</div>
            <div class="dl-val">${escapeHtml(k.nama)} (${escapeHtml(k.jenis)})</div>
          </div>
          <div class="dl-item">
            <div class="dl-label">Provinsi</div>
            <div class="dl-val"><a href="/provinsi/${escapeHtml(k.provinsi_slug)}">${escapeHtml(k.provinsi)}</a></div>
          </div>
          <div class="dl-item">
            <div class="dl-label">UMK 2026</div>
            <div class="dl-val">${umkFormatted}</div>
          </div>
          <div class="dl-item">
            <div class="dl-label">UMP Provinsi &amp; Selisih</div>
            <div class="dl-val">${umpProvFormatted} (${selisihFormatted})</div>
          </div>
          <div class="dl-item">
            <div class="dl-label">Nomor &amp; Tanggal SK</div>
            <div class="dl-val">${escapeHtml(k.nomor_sk || "—")} (${escapeHtml(formatTanggalID(k.tanggal_sk))})</div>
          </div>
          <div class="dl-item">
            <div class="dl-label">Berlaku Dari &amp; Status Verifikasi</div>
            <div class="dl-val">berlaku ${escapeHtml(formatTanggalID(k.berlaku_dari))} — ${escapeHtml(k.status_verifikasi)} (dicek ${escapeHtml(formatTanggalID(k.dicek_pada))})</div>
          </div>
        </div>

        <h3>Sumber Verifikasi (sumber_url)</h3>
        <ul class="source-list">
          ${sumberLinks}
        </ul>
        <p style="margin-top:1rem;">
          <a href="/provinsi/${escapeHtml(k.provinsi_slug)}">&larr; Lihat UMP &amp; daftar UMK Provinsi ${escapeHtml(k.provinsi)}</a> |
          <a href="/kota">Lihat seluruh UMK kabupaten/kota Indonesia</a>
        </p>
      </section>

      <section class="box" id="pembanding-provinsi">
        <h2>5 UMK Tertinggi di Provinsi ${escapeHtml(k.provinsi)}</h2>
        <div class="table-wrap" style="margin-bottom:0;">
          <table>
            <thead>
              <tr>
                <th>No</th>
                <th>Kabupaten/Kota</th>
                <th class="num">UMK 2026</th>
                <th class="num">Selisih vs UMP</th>
              </tr>
            </thead>
            <tbody>
              ${top5Rows}
            </tbody>
          </table>
        </div>
      </section>
    </main>

    <footer>
      Data dicek ${escapeHtml(formatTanggalID(k.dicek_pada))}. Angka bisa berubah bila gubernur merevisi SK.
    </footer>
  </div>
</body>
</html>`;
}

function render404Page(slug) {
  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Halaman Tidak Ditemukan (404) | UMRO Monitor</title>
  <style>${BASE_STYLES}</style>
</head>
<body>
  <div class="container">
    <header>
      <h1>404 — Halaman Tidak Ditemukan</h1>
      <p class="tagline">Data <code>${escapeHtml(slug)}</code> tidak tersedia dalam dataset 2026.</p>
      <p><a href="/">&larr; Kembali ke tabel UMP 38 provinsi</a> | <a href="/kota">Daftar UMK Kabupaten/Kota</a></p>
    </header>
  </div>
</body>
</html>`;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const { pathname, searchParams } = url;
    const method = request.method.toUpperCase();

    if (method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: CORS_HEADERS,
      });
    }

    // GET /
    if (method === "GET" && (pathname === "/" || pathname === "/index.html")) {
      return htmlResponse(renderHomePage(), 200);
    }

    // GET /kota
    if (method === "GET" && (pathname === "/kota" || pathname === "/kota/")) {
      const provSlug = (searchParams.get("provinsi") || "").trim();
      return htmlResponse(renderKotaListPage(provSlug), 200);
    }

    // GET /kota/:slug
    if (method === "GET" && pathname.startsWith("/kota/")) {
      const slug = decodeURIComponent(pathname.slice("/kota/".length)).replace(/\/+$/, "");
      const found = umkDataset.kota.find((k) => k.slug === slug);
      if (!found) {
        return htmlResponse(render404Page(slug), 404);
      }
      return htmlResponse(renderKotaDetailPage(found), 200);
    }

    // GET /provinsi/:slug
    if (method === "GET" && pathname.startsWith("/provinsi/")) {
      const slug = decodeURIComponent(pathname.slice("/provinsi/".length)).replace(/\/+$/, "");
      const found = dataset.provinsi.find((p) => p.slug === slug);
      if (!found) {
        return htmlResponse(render404Page(slug), 404);
      }
      return htmlResponse(renderProvinsiPage(found), 200);
    }

    // GET /api/meta
    if (method === "GET" && pathname === "/api/meta") {
      return jsonResponse({
        dataset: dataset.dataset,
        tahun: dataset.tahun,
        dibuat: dataset.dibuat,
        jumlah_provinsi: dataset.jumlah_provinsi,
        jumlah_kota: umkDataset.jumlah_kota,
        jumlah_provinsi_dengan_umk: umkDataset.jumlah_provinsi_dengan_umk,
        dasar_hukum: dataset.dasar_hukum,
        catatan: dataset.catatan,
        sumber_rekapitulasi: dataset.sumber_rekapitulasi,
      });
    }

    // GET /api/umk
    if (method === "GET" && pathname === "/api/umk") {
      const provSlug = (searchParams.get("provinsi") || "").trim();
      const list = provSlug
        ? umkDataset.kota.filter((k) => k.provinsi_slug === provSlug)
        : umkDataset.kota;
      return jsonResponse({
        tahun: umkDataset.tahun,
        jumlah: list.length,
        kota: list,
      });
    }

    // GET /api/umk/:slug
    if (method === "GET" && pathname.startsWith("/api/umk/")) {
      const slug = decodeURIComponent(pathname.slice("/api/umk/".length)).replace(/\/+$/, "");
      const found = umkDataset.kota.find((k) => k.slug === slug);
      if (!found) {
        return jsonResponse({ ok: false, error: "Kabupaten/kota tidak ditemukan", slug }, 404);
      }
      return jsonResponse(found, 200);
    }

    // GET /api/ump — tahun 2026 (dataset utama) dan 2025 (kolom ump_sebelumnya).
    // Tahun lain ditolak 404 dengan daftar tahun yang tersedia, bukan array kosong yang ambigu.
    if (method === "GET" && pathname === "/api/ump") {
      const tahunParam = searchParams.get("tahun");
      const tahun = tahunParam ? Number(tahunParam) : dataset.tahun;
      if (tahun === dataset.tahun) {
        return jsonResponse({
          tahun,
          jumlah: dataset.provinsi.length,
          provinsi: dataset.provinsi,
        });
      }
      if (tahun === 2025) {
        // UMP 2025 diambil dari kolom ump_sebelumnya; kenaikan % 2025 tidak dihitung
        // karena dataset ini tidak memuat UMP 2024.
        const list = dataset.provinsi.map((p) => ({
          provinsi: p.provinsi,
          slug: p.slug,
          tahun: 2025,
          ump: p.ump_sebelumnya,
          sumber_url: p.sumber_url,
          dicek_pada: p.dicek_pada,
          catatan: "Nilai UMP 2025 dipakai sebagai pembanding di dataset ini.",
        }));
        return jsonResponse({ tahun, jumlah: list.length, provinsi: list });
      }
      return jsonResponse(
        {
          ok: false,
          error: `tahun ${tahunParam} tidak tersedia`,
          tahun_tersedia: [2025, dataset.tahun],
        },
        404,
        "no-store"
      );
    }

    // GET /api/ump/:slug
    if (method === "GET" && pathname.startsWith("/api/ump/")) {
      const slug = decodeURIComponent(pathname.slice("/api/ump/".length)).replace(/\/+$/, "");
      const found = dataset.provinsi.find((p) => p.slug === slug);
      if (!found) {
        return jsonResponse({ ok: false, error: "Provinsi tidak ditemukan", slug }, 404);
      }
      return jsonResponse(found, 200);
    }

    // GET /api/top?n=5&arah=tertinggi|terendah
    if (method === "GET" && pathname === "/api/top") {
      const rawN = parseInt(searchParams.get("n") || "5", 10);
      const n = Number.isFinite(rawN) && rawN > 0 ? Math.min(rawN, dataset.provinsi.length) : 5;
      const arah = (searchParams.get("arah") || "tertinggi").toLowerCase();
      const sorted = [...dataset.provinsi].sort((a, b) =>
        arah === "terendah" ? a.ump - b.ump : b.ump - a.ump
      );
      const sliced = sorted.slice(0, n);
      return jsonResponse({
        tahun: dataset.tahun,
        arah: arah === "terendah" ? "terendah" : "tertinggi",
        n,
        jumlah: sliced.length,
        provinsi: sliced,
      });
    }

    // POST /api/subscribe
    if (method === "POST" && pathname === "/api/subscribe") {
      let body = {};
      try {
        body = await request.json();
      } catch {
        return jsonResponse({ ok: false, error: "email tidak valid" }, 400, "no-store");
      }
      const rawEmail = typeof body?.email === "string" ? body.email.trim() : "";
      if (!rawEmail || !EMAIL_REGEX.test(rawEmail)) {
        return jsonResponse({ ok: false, error: "email tidak valid" }, 400, "no-store");
      }
      const email = rawEmail.toLowerCase();
      const record = {
        email,
        dibuat: new Date().toISOString(),
        tahun_minat: 2027,
      };
      if (!env || !env.umrmonitor_subs) {
        // Jangan pernah balas ok:true kalau tidak ada tempat menyimpan — itu sukses palsu.
        return jsonResponse(
          { ok: false, error: "penyimpanan langganan belum dikonfigurasi" },
          503,
          "no-store"
        );
      }
      try {
        await env.umrmonitor_subs.put(`sub:${email}`, JSON.stringify(record));
      } catch {
        return jsonResponse({ ok: false, error: "gagal menyimpan langganan" }, 500, "no-store");
      }
      return jsonResponse({ ok: true }, 200, "no-store");
    }

    // GET /api/subscribe/jumlah — bukti bahwa penyimpanan benar-benar bekerja.
    // Hanya agregat (jumlah), tidak pernah membocorkan alamat email.
    if (method === "GET" && pathname === "/api/subscribe/jumlah") {
      if (!env || !env.umrmonitor_subs) {
        return jsonResponse({ ok: false, error: "penyimpanan belum dikonfigurasi" }, 503);
      }
      let cursor;
      let jumlah = 0;
      do {
        const page = await env.umrmonitor_subs.list({ prefix: "sub:", cursor });
        jumlah += page.keys.length;
        cursor = page.list_complete ? undefined : page.cursor;
      } while (cursor);
      return jsonResponse({ ok: true, jumlah }, 200, "no-store");
    }

    // Static assets fallback if bound
    if (env && env.ASSETS && typeof env.ASSETS.fetch === "function") {
      const assetRes = await env.ASSETS.fetch(request);
      if (assetRes.status !== 404) {
        return assetRes;
      }
    }

    if (pathname.startsWith("/api/")) {
      return jsonResponse({ ok: false, error: "Endpoint tidak ditemukan" }, 404);
    }

    return htmlResponse(render404Page(pathname), 404);
  },
};

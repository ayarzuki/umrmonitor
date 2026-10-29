import dataset from "../public/data/ump-2026.json";

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
  const n = Number(num);
  const cents = Math.round(n * 100) % 100;
  const isInt = Number.isInteger(n) || cents === 0;
  const fixed = n.toFixed(2);
  const [intPart, decPart] = fixed.split(".");
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  if (isInt) {
    return `Rp${formattedInt}`;
  }
  return `Rp${formattedInt},${decPart}`;
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

  const tanggalCek = dataset.provinsi[0]?.dicek_pada || dataset.dibuat;
  const sumberLinks = dataset.sumber_rekapitulasi
    .map(
      (url) =>
        `<li><a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(url)}</a> (dicek_pada: <code>${escapeHtml(tanggalCek)}</code>)</li>`
    )
    .join("\n");

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>UMRO Monitor — Upah minimum Indonesia, bertanggal dan bisa dicek.</title>
  <meta name="description" content="Tabel Upah Minimum Provinsi (UMP) Indonesia 2026 lengkap 38 provinsi beserta nomor SK, dasar hukum PP No. 49 Tahun 2025, dan tautan sumber.">
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

      <section class="box" id="sumber-data">
        <h2>Sumber &amp; tanggal cek</h2>
        <p><strong>Dasar hukum:</strong> ${escapeHtml(dataset.dasar_hukum)}</p>
        <p><strong>Tanggal cek (dicek_pada):</strong> <code>${escapeHtml(tanggalCek)}</code></p>
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
      <p style="margin:0 0 0.5rem 0;"><a href="/">&larr; Kembali ke tabel 38 provinsi</a></p>
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
    </main>

    <footer>
      Data dicek 29 Oktober 2026. Angka bisa berubah bila gubernur merevisi SK.
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
      <h1>404 — Provinsi Tidak Ditemukan</h1>
      <p class="tagline">Data provinsi <code>${escapeHtml(slug)}</code> tidak tersedia dalam dataset UMP 2026.</p>
      <p><a href="/">&larr; Kembali ke tabel UMP 38 provinsi</a></p>
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
        dasar_hukum: dataset.dasar_hukum,
        catatan: dataset.catatan,
        sumber_rekapitulasi: dataset.sumber_rekapitulasi,
      });
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
      if (env && env.umrmonitor_subs) {
        await env.umrmonitor_subs.put(`sub:${email}`, JSON.stringify(record));
      }
      return jsonResponse({ ok: true }, 200, "no-store");
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

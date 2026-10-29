import { spawn } from "node:child_process";
import fs from "node:fs";

const umkDataset = JSON.parse(
  fs.readFileSync(new URL("../public/data/umk-2026.json", import.meta.url), "utf8")
);

function formatRupiahBulat(num) {
  const bulat = Math.round(Number(num));
  return "Rp" + String(bulat).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

const args = process.argv.slice(2);
const baseArg = args.find((a) => a.startsWith("--base="));
const baseUrl = baseArg
  ? baseArg.slice("--base=".length).replace(/\/+$/, "")
  : "http://127.0.0.1:8788";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer(url, timeoutMs = 90000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${url}/api/meta`);
      if (res.ok) {
        return true;
      }
    } catch {
      // ignore until server is ready
    }
    await sleep(500);
  }
  return false;
}

async function run() {
  let child = null;

  if (!baseArg) {
    child = spawn("npx", ["wrangler", "dev", "--port", "8788", "--local"], {
      stdio: ["ignore", "pipe", "pipe"],
      detached: true,
    });
  }

  const cleanup = () => {
    if (child && child.pid) {
      try {
        process.kill(-child.pid, "SIGTERM");
      } catch {
        try {
          child.kill("SIGTERM");
        } catch {
          // ignore
        }
      }
    }
  };

  process.on("SIGINT", () => {
    cleanup();
    process.exit(1);
  });
  process.on("SIGTERM", () => {
    cleanup();
    process.exit(1);
  });

  const results = [];
  function check(name, condition, detail = "") {
    const status = condition ? "PASS" : "FAIL";
    const suffix = detail ? ` (${detail})` : "";
    console.log(`${status}: ${name}${suffix}`);
    results.push({ name, passed: Boolean(condition) });
  }

  try {
    const ready = await waitForServer(baseUrl, 90000);
    if (!ready) {
      console.log("FAIL: Worker gagal siap dalam 90 detik");
      console.log("RESULT: FAIL (0/10)");
      cleanup();
      process.exit(1);
    }

    // 1. meta 200 & jumlah_provinsi === 38
    {
      const res = await fetch(`${baseUrl}/api/meta`);
      const body = await res.json();
      check(
        "GET /api/meta status 200 & jumlah_provinsi === 38",
        res.status === 200 && body.jumlah_provinsi === 38,
        `status=${res.status}, jumlah_provinsi=${body.jumlah_provinsi}`
      );
    }

    // 2. /api/ump 38 baris + 10. total kenaikan tertinggi = Sulawesi Tengah 9.08
    let umpList = [];
    {
      const res = await fetch(`${baseUrl}/api/ump?tahun=2026`);
      const body = await res.json();
      umpList = Array.isArray(body.provinsi) ? body.provinsi : [];
      check(
        "GET /api/ump mengembalikan 38 baris provinsi",
        res.status === 200 && body.jumlah === 38 && umpList.length === 38,
        `jumlah=${umpList.length}`
      );
    }

    // 3. /api/ump/jawa-barat nominal 2317601
    {
      const res = await fetch(`${baseUrl}/api/ump/jawa-barat`);
      const body = await res.json();
      check(
        "GET /api/ump/jawa-barat nominal 2317601",
        res.status === 200 && body.ump === 2317601,
        `ump=${body.ump}`
      );
    }

    // 3b. /api/ump?tahun=2025 = 38 baris pembanding; tahun tak dikenal = 404
    {
      const res25 = await fetch(`${baseUrl}/api/ump?tahun=2025`);
      const b25 = await res25.json();
      const ok25 =
        res25.status === 200 &&
        b25.jumlah === 38 &&
        b25.provinsi.some((p) => p.provinsi === "Jawa Barat" && p.ump === 2191232);
      const res30 = await fetch(`${baseUrl}/api/ump?tahun=2030`);
      const b30 = await res30.json();
      const ok30 = res30.status === 404 && Array.isArray(b30.tahun_tersedia);
      check(
        "GET /api/ump?tahun=2025 = 38 baris pembanding, tahun 2030 = 404",
        ok25 && ok30,
        `2025 jumlah=${b25.jumlah} status30=${res30.status}`
      );
    }

    // 4. /api/ump/tidak-ada = 404
    {
      const res = await fetch(`${baseUrl}/api/ump/tidak-ada`);
      check(
        "GET /api/ump/tidak-ada mengembalikan 404",
        res.status === 404,
        `status=${res.status}`
      );
    }

    // 5. /api/top?n=3&arah=tertinggi = DKI Jakarta, Papua Pegunungan, Papua Selatan (urutan persis)
    {
      const res = await fetch(`${baseUrl}/api/top?n=3&arah=tertinggi`);
      const body = await res.json();
      const list = Array.isArray(body.provinsi) ? body.provinsi : [];
      const names = list.map((p) => p.provinsi);
      const nasional = Array.isArray(body.provinsi)
        ? list.map((p) => Number(p.ump))
        : [];
      const expected = ["DKI Jakarta", "Papua Pegunungan", "Papua Selatan"];
      const exact = names.length === 3 && expected.every((n, i) => names[i] === n);
      const descending = nasional.every((v, i) => i === 0 || nasional[i - 1] >= v);
      check(
        "GET /api/top?n=3&arah=tertinggi = DKI Jakarta, Papua Pegunungan, Papua Selatan (urut turun)",
        res.status === 200 && exact && descending,
        `top3=${names.join(", ")}`
      );
    }

    // 6. / mengandung string Rp5.729.876 DAN Jawa Barat DAN PP No. 49 Tahun 2025 di HTML mentah
    {
      const res = await fetch(`${baseUrl}/`);
      const html = await res.text();
      const htmlWithoutScripts = html.replace(/<script[\s\S]*?<\/script>/gi, "");
      const ok =
        res.status === 200 &&
        htmlWithoutScripts.includes("Rp5.729.876") &&
        htmlWithoutScripts.includes("Jawa Barat") &&
        htmlWithoutScripts.includes("PP No. 49 Tahun 2025");
      check(
        "GET / mengandung Rp5.729.876, Jawa Barat, dan PP No. 49 Tahun 2025 di HTML mentah",
        ok,
        `status=${res.status}`
      );
    }

    // 7. /provinsi/aceh mengandung Rp3.932.552
    {
      const res = await fetch(`${baseUrl}/provinsi/aceh`);
      const html = await res.text();
      check(
        "GET /provinsi/aceh mengandung Rp3.932.552",
        res.status === 200 && html.includes("Rp3.932.552"),
        `status=${res.status}`
      );
    }

    // 7b. Desimal persen pakai koma (konvensi Indonesia): 9,08% bukan 9.08%
    {
      const res = await fetch(`${baseUrl}/`);
      const html = await res.text();
      const comma = html.includes("9,08%");
      const dot = html.includes("9.08%");
      check(
        "GET / menampilkan persen desimal dengan koma (9,08%, bukan 9.08%)",
        res.status === 200 && comma && !dot,
        `comma=${comma}, dot=${dot}`
      );
    }

    // 7c. Tanggal tampil dalam format Indonesia, bukan ISO mentah
    {
      const res = await fetch(`${baseUrl}/provinsi/sulawesi-tengah`);
      const html = await res.text();
      const ok =
        res.status === 200 &&
        html.includes("berlaku 1 Januari 2026") &&
        !html.includes("berlaku 2026-01-01");
      check("GET /provinsi/* menampilkan tanggal Indonesia (1 Januari 2026), bukan ISO", ok, `status=${res.status}`);
    }

    const sortedUmk = [...umkDataset.kota].sort((a, b) => b.umk - a.umk);
    const topKota = sortedUmk[0];
    const topKotaRp = formatRupiahBulat(topKota.umk);
    const provDenganUmk =
      umkDataset.cakupan.find((c) => c.jumlah_umk > 0)?.slug || topKota.provinsi_slug;

    // 7d. Semua nominal rupiah bilangan bulat — tidak ada "Rp3.100.881,40"
    {
      const pages = [
        "/",
        "/kota",
        `/kota/${topKota.slug}`,
        "/provinsi/sulawesi-tengah",
        "/provinsi/aceh",
        `/provinsi/${provDenganUmk}`,
      ];
      const offenders = [];
      for (const p of pages) {
        const res = await fetch(`${baseUrl}${p}`);
        const html = await res.text();
        const found = html.match(/Rp\d{1,3}(?:\.\d{3})*,\d{2}\b/g) || [];
        if (found.length) offenders.push(`${p}: ${found.slice(0, 3).join(", ")}`);
      }
      check(
        "Semua nominal rupiah bilangan bulat (tanpa sen)",
        offenders.length === 0,
        offenders.length ? offenders.join(" | ") : "tidak ada Rp dengan desimal"
      );
    }

    // 8. POST subscribe email valid -> ok:true
    {
      const res = await fetch(`${baseUrl}/api/subscribe`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "hrd@contoh-umkm.co.id" }),
      });
      const body = await res.json();
      check(
        "POST /api/subscribe email valid -> ok:true",
        res.status === 200 && body.ok === true,
        `status=${res.status}, ok=${body.ok}`
      );
    }

    // 9. POST email invalid -> 400
    {
      const res = await fetch(`${baseUrl}/api/subscribe`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "bukan-email-valid" }),
      });
      const body = await res.json();
      check(
        "POST /api/subscribe email invalid -> 400",
        res.status === 400 && body.ok === false,
        `status=${res.status}, error=${body.error}`
      );
    }

    // 10. total kenaikan tertinggi = Sulawesi Tengah 9.08
    {
      const sortedByKenaikan = [...umpList].sort(
        (a, b) => b.kenaikan_persen - a.kenaikan_persen
      );
      const top = sortedByKenaikan[0];
      check(
        "Total kenaikan tertinggi = Sulawesi Tengah 9.08%",
        top && top.provinsi === "Sulawesi Tengah" && top.kenaikan_persen === 9.08,
        `top=${top?.provinsi} (${top?.kenaikan_persen}%)`
      );
    }

    // 11. /kota 200 dan memuat nama + nominal UMK tertinggi nasional (format Rp<bulat>) + #cari-kota
    let kotaHtml = "";
    {
      const res = await fetch(`${baseUrl}/kota`);
      kotaHtml = await res.text();
      const ok =
        res.status === 200 &&
        kotaHtml.includes(topKota.nama) &&
        kotaHtml.includes(topKotaRp) &&
        kotaHtml.includes('id="cari-kota"');
      check(
        `GET /kota 200 & memuat UMK tertinggi nasional (${topKota.nama} ${topKotaRp})`,
        ok,
        `status=${res.status}, top=${topKota.nama} ${topKotaRp}`
      );
    }

    // 12. jumlah baris tabel di /kota = jumlah_kota (hitung kemunculan href="/kota/)
    {
      const hrefCount = (kotaHtml.match(/href="\/kota\//g) || []).length;
      check(
        "Jumlah baris tabel di /kota === jumlah_kota (hitung href=\"/kota/\")",
        hrefCount === umkDataset.jumlah_kota,
        `hrefCount=${hrefCount}, jumlah_kota=${umkDataset.jumlah_kota}`
      );
    }

    // 13. /kota/<slug-tertinggi> 200, memuat nominal + nomor SK + minimal satu sumber_url sebagai link
    {
      const res = await fetch(`${baseUrl}/kota/${topKota.slug}`);
      const html = await res.text();
      const hasSumberLink =
        Array.isArray(topKota.sumber_url) &&
        topKota.sumber_url.length > 0 &&
        topKota.sumber_url.some((u) => html.includes(`href="${u}"`));
      const ok =
        res.status === 200 &&
        html.includes(topKotaRp) &&
        (!topKota.nomor_sk || html.includes(topKota.nomor_sk)) &&
        hasSumberLink;
      check(
        `GET /kota/${topKota.slug} 200 & memuat nominal + nomor SK + link sumber_url`,
        ok,
        `status=${res.status}, hasSumberLink=${hasSumberLink}`
      );
    }

    // 14. /kota/tidak-ada -> 404
    {
      const res = await fetch(`${baseUrl}/kota/tidak-ada`);
      check(
        "GET /kota/tidak-ada mengembalikan 404",
        res.status === 404,
        `status=${res.status}`
      );
    }

    // 15. /api/umk jumlah = jumlah_kota; /api/umk?provinsi=jawa-barat hanya berisi daerah Jawa Barat
    {
      const resAll = await fetch(`${baseUrl}/api/umk`);
      const bodyAll = await resAll.json();
      const resJabar = await fetch(`${baseUrl}/api/umk?provinsi=jawa-barat`);
      const bodyJabar = await resJabar.json();
      const expectedJabarCount = umkDataset.kota.filter(
        (k) => k.provinsi_slug === "jawa-barat"
      ).length;
      const onlyJabar =
        Array.isArray(bodyJabar.kota) &&
        bodyJabar.kota.length === expectedJabarCount &&
        bodyJabar.kota.every((k) => k.provinsi_slug === "jawa-barat");
      const ok =
        resAll.status === 200 &&
        bodyAll.jumlah === umkDataset.jumlah_kota &&
        Array.isArray(bodyAll.kota) &&
        bodyAll.kota.length === umkDataset.jumlah_kota &&
        resJabar.status === 200 &&
        onlyJabar;
      check(
        "GET /api/umk jumlah === jumlah_kota & ?provinsi=jawa-barat hanya berisi daerah Jawa Barat",
        ok,
        `all=${bodyAll.jumlah}/${umkDataset.jumlah_kota}, jabar=${bodyJabar.jumlah}/${expectedJabarCount}`
      );
    }

    // 16. /api/umk/<slug> 200; /api/umk/tidak-ada -> 404
    {
      const resOk = await fetch(`${baseUrl}/api/umk/${topKota.slug}`);
      const bodyOk = await resOk.json();
      const res404 = await fetch(`${baseUrl}/api/umk/tidak-ada`);
      const ok =
        resOk.status === 200 &&
        bodyOk.slug === topKota.slug &&
        bodyOk.umk === topKota.umk &&
        res404.status === 404;
      check(
        `GET /api/umk/${topKota.slug} 200 & GET /api/umk/tidak-ada 404`,
        ok,
        `statusOk=${resOk.status}, status404=${res404.status}`
      );
    }

    // 17. /api/meta memuat jumlah_kota
    {
      const res = await fetch(`${baseUrl}/api/meta`);
      const body = await res.json();
      const ok =
        res.status === 200 &&
        body.jumlah_kota === umkDataset.jumlah_kota &&
        body.jumlah_provinsi_dengan_umk === umkDataset.jumlah_provinsi_dengan_umk;
      check(
        "GET /api/meta memuat jumlah_kota & jumlah_provinsi_dengan_umk",
        ok,
        `jumlah_kota=${body.jumlah_kota}, jumlah_provinsi_dengan_umk=${body.jumlah_provinsi_dengan_umk}`
      );
    }

    // 18. /provinsi/<slug-provinsi-dengan-umk> memuat tabel kab/kota (minimal 1 href="/kota/)
    {
      const res = await fetch(`${baseUrl}/provinsi/${provDenganUmk}`);
      const html = await res.text();
      const count = (html.match(/href="\/kota\//g) || []).length;
      check(
        `GET /provinsi/${provDenganUmk} memuat tabel kab/kota (minimal 1 href="/kota/")`,
        res.status === 200 && count >= 1,
        `status=${res.status}, hrefKotaCount=${count}`
      );
    }

    // 19. Setiap halaman /kota/<slug> (sampel 5 daerah acak deterministik) memuat dicek_pada
    {
      const sampleCount = 5;
      const samples = [];
      for (let i = 0; i < sampleCount; i++) {
        const idx = Math.floor(((i * 73 + 17) % umkDataset.kota.length));
        samples.push(umkDataset.kota[idx]);
      }
      const missing = [];
      for (const s of samples) {
        const res = await fetch(`${baseUrl}/kota/${s.slug}`);
        const html = await res.text();
        // dicek_pada tampil format Indonesia ("29 Oktober 2026"), bukan ISO.
        const bulan = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
        const [th, bl, tg] = String(s.dicek_pada).split("-");
        const tanggalID = `${Number(tg)} ${bulan[Number(bl) - 1]} ${th}`;
        if (res.status !== 200 || !html.includes(tanggalID) || !html.includes("Data dicek")) {
          missing.push(s.slug);
        }
      }
      check(
        "Sampel 5 halaman /kota/<slug> acak deterministik memuat dicek_pada",
        missing.length === 0,
        missing.length
          ? `missing=${missing.join(",")}`
          : `5/5 OK (${samples.map((s) => s.slug).join(", ")})`
      );
    }

    // 20. ANCHOR: nominal patokan yang angkanya tidak diambil dari dataset, supaya
    // kerusakan/geseran data ketahuan. Nilai-nilai ini sudah dicocokkan ke SK/berita
    // di scripts/sources/umk/<provinsi>.json dan lolos verify-sources.mjs.
    {
      const anchors = [
        { slug: "kota-bekasi", rp: "Rp5.999.443" },
        { slug: "kota-surabaya", rp: "Rp5.288.796" },
        { slug: "kota-bandung", rp: "Rp4.737.678" },
        { slug: "kota-makassar", rp: "Rp4.148.179" },
        { slug: "kota-banda-aceh", rp: "Rp4.162.965" },
      ];
      const wrong = [];
      for (const a of anchors) {
        const res = await fetch(`${baseUrl}/kota/${a.slug}`);
        const html = await res.text();
        if (res.status !== 200 || !html.includes(a.rp)) wrong.push(`${a.slug}≠${a.rp}`);
      }
      check(
        "Anchor 5 nominal UMK cocok dengan SK/berita (bukan dari dataset)",
        wrong.length === 0,
        wrong.length ? wrong.join(" | ") : "5/5 cocok"
      );
    }

    // 21. POST /api/subscribe benar-benar menyimpan (baca balik lewat /api/subscribe/jumlah).
    // Ini menutup celah "sukses palsu": dulu worker membalas ok:true meski KV tidak ter-bind.
    {
      const jumlahUrl = `${baseUrl}/api/subscribe/jumlah`;
      const before = await (await fetch(jumlahUrl)).json();
      const email = `uji-validator+${Date.now()}@contoh-umkm.co.id`;
      const post = await fetch(`${baseUrl}/api/subscribe`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const postBody = await post.json();
      // KV Cloudflare eventually consistent: jumlah bisa telat sampai ~60 detik.
      let after = await (await fetch(jumlahUrl)).json();
      const deadline = Date.now() + 75000;
      while (
        typeof after.jumlah === "number" &&
        typeof before.jumlah === "number" &&
        after.jumlah === before.jumlah &&
        Date.now() < deadline
      ) {
        await sleep(5000);
        after = await (await fetch(jumlahUrl)).json();
      }
      const grew = typeof before.jumlah === "number" && after.jumlah === before.jumlah + 1;
      check(
        "POST /api/subscribe benar-benar menambah 1 langganan (dibaca balik dari KV)",
        post.status === 200 && postBody.ok === true && grew,
        `status=${post.status}, ok=${postBody.ok}, sebelum=${before.jumlah}, sesudah=${after.jumlah}` +
          (grew ? "" : " — catatan: jalankan ulang setelah kunci uji dihapus")
      );
    }

    // 22. Tidak ada tanggal ISO mentah di HTML yang dilihat manusia (API JSON tetap ISO).
    {
      const pages = ["/", "/kota", "/kota/kota-bekasi", "/provinsi/jawa-barat"];
      const offenders = [];
      for (const p of pages) {
        const res = await fetch(`${baseUrl}${p}`);
        let html = await res.text();
        html = html.replace(/<script[\s\S]*?<\/script>/gi, " ");
        const found = html.match(/\b20\d\d-\d\d-\d\d\b/g) || [];
        if (found.length) offenders.push(`${p}: ${[...new Set(found)].slice(0, 3).join(",")}`);
      }
      check(
        "Tanggal di HTML tampil format Indonesia (tidak ada ISO mentah)",
        offenders.length === 0,
        offenders.length ? offenders.join(" | ") : "bersih di 4 halaman"
      );
    }

    const passed = results.filter((r) => r.passed).length;
    const total = results.length;
    if (passed === total) {
      console.log(`RESULT: PASS (${passed}/${total})`);
      cleanup();
      process.exit(0);
    } else {
      console.log(`RESULT: FAIL (${passed}/${total})`);
      cleanup();
      process.exit(1);
    }
  } catch (err) {
    console.error("ERROR:", err);
    console.log("RESULT: FAIL");
    cleanup();
    process.exit(1);
  }
}

run();

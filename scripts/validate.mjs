import { spawn } from "node:child_process";

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

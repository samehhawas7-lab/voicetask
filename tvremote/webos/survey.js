"use strict";
// ============================================================
// مسح البيت — جردُ ما في الشبكة وتسميته
//
// سأل صاحب البيت أن أدخل شبكته لأعرف أجهزته. ولا سبيل لي إلى ذلك —
// وحسنٌ ألّا يكون — لكن خادمه داخلها، فيمسحها هو ويعرض ما وجد.
//
// وثلاثة مصادر يكمل بعضها بعضاً:
//   • SSDP     — الأجهزة تعلن أسماءها الحقيقية، فلا نخمّنها
//   • البطاقة  — بادئتها تدلّ على المصنّع
//   • المنافذ  — نصافحها لنتأكّد، فالمنفذ المفتوح ليس دليلاً وحده
//
// وهنا تُجمع دوال المسح التي تفرّقت في الملفات، فيستعملها الجميع.
// ============================================================

const net = require("net");
const dgram = require("dgram");
const http = require("http");
const https = require("https");
const os = require("os");
const { macOf } = require("./wol");

// ---------- أدوات مشتركة ----------

/** أجهزة البيت وحدها: 100.64.0.0/10 شبكة Tailscale الخاصة، لا يسكنها
 *  تلفزيون ولا مكيف — ومسحُها ضياعُ وقتٍ وطرقٌ على أجهزة ليست من بيته */
function isTailnet(addr) {
  const p = addr.split(".").map(Number);
  return p[0] === 100 && p[1] >= 64 && p[1] <= 127;
}

function subnets() {
  const out = [];
  for (const list of Object.values(os.networkInterfaces())) {
    for (const i of list || []) {
      const fam = typeof i.family === "string" ? i.family : `IPv${i.family}`;
      if (fam !== "IPv4" || i.internal || isTailnet(i.address)) continue;
      const p = i.address.split(".").slice(0, 3).join(".");
      if (!out.includes(p)) out.push(p);
    }
  }
  return out;
}

function portOpenOn(ip, port, timeout = 700) {
  return new Promise((res) => {
    const c = new net.Socket();
    let done = false;
    const end = (v) => { if (!done) { done = true; c.destroy(); res(v); } };
    c.setTimeout(timeout);
    c.once("connect", () => end(true));
    c.once("timeout", () => end(false));
    c.once("error", () => end(false));
    c.connect(port, ip);
  });
}

/** يوزّع عملاً على عمّال متوازين — نمطٌ تكرّر، فجُمع */
async function pool(items, workers, fn) {
  const out = [];
  let idx = 0;
  await Promise.all(Array.from({ length: workers }, async () => {
    while (idx < items.length) {
      const item = items[idx++];
      const r = await fn(item);
      if (r !== undefined && r !== null && r !== false) out.push(r);
    }
  }));
  return out;
}

async function sweep(ip, ports, workers, timeout) {
  const open = await pool(ports, workers, async (p) =>
    (await portOpenOn(ip, p, timeout)) ? p : null);
  return open.sort((a, b) => a - b);
}

// ---------- المصنّع من بادئة البطاقة ----------
// منتقاةٌ لأجهزة البيوت. قاعدة OUI الكاملة ثلاثة ميغابايت لا تُبرَّر
// على لابتوب مساحته ضيّقة، وهذه تغطّي الغالب.
const OUI = {
  "00:1a:11": "جوجل", "f4:f5:d8": "جوجل", "54:60:09": "جوجل", "a4:77:33": "جوجل",
  "6c:ad:f8": "كروم كاست", "b0:47:bf": "كروم كاست",
  "00:16:6c": "سامسونج", "5c:49:7d": "سامسونج", "a4:cf:99": "سامسونج",
  "8c:79:f5": "سامسونج", "d8:57:ef": "سامسونج", "78:bd:bc": "سامسونج",
  "50:32:37": "سامسونج", "e8:50:8b": "سامسونج", "c0:d3:c0": "سامسونج",
  "00:1c:62": "إل جي", "a8:23:fe": "إل جي", "cc:2d:8c": "إل جي",
  "3c:cd:93": "إل جي", "b4:e6:2a": "إل جي", "58:a2:b5": "إل جي",
  "10:68:3f": "إل جي", "c4:36:6c": "إل جي",
  "24:0a:c4": "Espressif (غالباً Tuya)", "30:ae:a4": "Espressif (غالباً Tuya)",
  "84:0d:8e": "Espressif (غالباً Tuya)", "b4:e6:2d": "Espressif (غالباً Tuya)",
  "d8:f1:5b": "Espressif (غالباً Tuya)", "cc:50:e3": "Espressif (غالباً Tuya)",
  "7c:df:a1": "Espressif (غالباً Tuya)", "a4:cf:12": "Espressif (غالباً Tuya)",
  "68:c6:3a": "Espressif (غالباً Tuya)", "ec:fa:bc": "Espressif (غالباً Tuya)",
  "50:02:91": "Espressif (غالباً Tuya)", "18:fe:34": "Espressif (غالباً Tuya)",
  "5c:cf:7f": "Espressif (غالباً Tuya)", "60:01:94": "Espressif (غالباً Tuya)",
  "2c:f4:32": "Espressif (غالباً Tuya)", "dc:4f:22": "Espressif (غالباً Tuya)",
  "00:e0:4c": "Realtek (أجهزة صينية)",
  "80:a0:01": "بروجيكتر أندرويد", "40:a3:6b": "Allwinner",
  "00:1e:c2": "آبل", "ac:bc:32": "آبل", "f0:18:98": "آبل", "dc:a9:04": "آبل",
  "a4:83:e7": "آبل", "3c:15:c2": "آبل", "90:81:2a": "آبل",
  "00:e0:fc": "هواوي", "48:46:fb": "هواوي", "80:fb:06": "هواوي",
  "d0:7a:b5": "هواوي", "e0:24:7f": "هواوي", "f4:9f:f3": "هواوي",
  "50:c7:bf": "TP-Link", "b0:be:76": "TP-Link", "1c:3b:f3": "TP-Link",
  "68:ff:7b": "TP-Link", "ac:84:c6": "TP-Link",
  "fc:65:de": "أمازون", "44:65:0d": "أمازون", "68:37:e9": "أمازون",
  "0c:47:c9": "أمازون", "74:c2:46": "أمازون",
  "70:2c:1f": "Hisense", "4c:ed:de": "Hisense",
  "e4:7d:bd": "EZVIZ / Hikvision", "bc:ad:28": "Hikvision", "44:47:cc": "Hikvision",
  "c8:3a:35": "شاومي", "64:09:80": "شاومي", "78:11:dc": "شاومي",
};

function vendorOf(mac) {
  if (!mac) return "";
  return OUI[mac.slice(0, 8).toLowerCase()] || "";
}

// ---------- SSDP: الأجهزة تعلن أسماءها ----------

const SSDP_MSG = Buffer.from(
  "M-SEARCH * HTTP/1.1\r\n" +
  "HOST: 239.255.255.250:1900\r\n" +
  'MAN: "ssdp:discover"\r\n' +
  "MX: 2\r\n" +
  "ST: ssdp:all\r\n\r\n", "ascii");

/** يجمع ردود SSDP: لكل عنوان عنوانُ وصفه */
function ssdpProbe(waitMs = 3500) {
  return new Promise((resolve) => {
    const found = new Map();
    let sock;
    try { sock = dgram.createSocket({ type: "udp4", reuseAddr: true }); }
    catch { return resolve(found); }

    const done = () => { try { sock.close(); } catch {} resolve(found); };

    sock.on("error", done);
    sock.on("message", (msg, rinfo) => {
      const text = msg.toString("ascii");
      const loc = (text.match(/^LOCATION:\s*(\S+)/im) || [])[1];
      const server = (text.match(/^SERVER:\s*(.+)$/im) || [])[1];
      const prev = found.get(rinfo.address) || {};
      found.set(rinfo.address, {
        location: prev.location || loc || "",
        server: (prev.server || server || "").trim(),
      });
    });

    sock.bind(() => {
      try { sock.setBroadcast(true); } catch {}
      // مرّتان: الحزمة قد تضيع، وتكرارها أرخص من إغفال جهاز
      sock.send(SSDP_MSG, 0, SSDP_MSG.length, 1900, "239.255.255.250");
      setTimeout(() => {
        try { sock.send(SSDP_MSG, 0, SSDP_MSG.length, 1900, "239.255.255.250"); } catch {}
      }, 900);
      setTimeout(done, waitMs);
    });
  });
}

/** يجلب وصف الجهاز فيخرج منه اسمه ومصنّعه — بلا تخمين */
function fetchDescription(url, timeout = 3000) {
  return new Promise((resolve) => {
    let mod;
    try { mod = url.startsWith("https:") ? https : http; } catch { return resolve(null); }
    const req = mod.get(url, { timeout, rejectUnauthorized: false }, (res) => {
      let body = "";
      res.on("data", (c) => { body += c; if (body.length > 65536) res.destroy(); });
      res.on("end", () => {
        const tag = (t) => (body.match(new RegExp("<" + t + "[^>]*>([^<]+)</" + t + ">", "i")) || [])[1];
        const name = tag("friendlyName") || tag("roomName") || "";
        resolve({
          name: name ? name.trim() : "",
          maker: (tag("manufacturer") || "").trim(),
          model: (tag("modelName") || "").trim(),
        });
      });
    });
    req.on("timeout", () => { req.destroy(); resolve(null); });
    req.on("error", () => resolve(null));
  });
}

// ---------- بصمات المنافذ ----------

const FINGERPRINTS = [
  { port: 3001, label: "تلفزيون webOS", kind: "webos", verdict: "supported", page: "dev-tv" },
  { port: 3000, label: "تلفزيون webOS (غير مشفّر)", kind: "webos", verdict: "supported", page: "dev-tv" },
  { port: 5555, label: "ADB على الشبكة", kind: "android", verdict: "supported", page: "dev-proj" },
  { port: 6668, label: "جهاز Tuya", kind: "tuya", verdict: "known" },
  { port: 8009, label: "Chromecast", kind: "cast", verdict: "unknown" },
  { port: 8001, label: "تلفزيون سامسونج", kind: "samsung", verdict: "known" },
  { port: 8002, label: "تلفزيون سامسونج (مشفّر)", kind: "samsung", verdict: "known" },
  { port: 9197, label: "سامسونج (DLNA)", kind: "samsung", verdict: "known" },
  { port: 554,  label: "كاميرا RTSP", kind: "camera", verdict: "known" },
  { port: 6466, label: "ريموت أندرويد", kind: "androidtv", verdict: "known" },
  { port: 6467, label: "إقران ريموت أندرويد", kind: "androidtv", verdict: "known" },
  { port: 8080, label: "واجهة ويب", kind: "web", verdict: "unknown" },
  { port: 80,   label: "واجهة ويب", kind: "web", verdict: "unknown" },
  { port: 443,  label: "واجهة ويب مشفّرة", kind: "web", verdict: "unknown" },
  { port: 22,   label: "SSH", kind: "ssh", verdict: "unknown" },
];

const QUICK_PORTS = FINGERPRINTS.map((f) => f.port);

/** المنفذ المفتوح ليس دليلاً: نصافح webOS و ADB لنتأكّد */
function verifyWebOS(ip, port) {
  return new Promise((resolve) => {
    const req = https.get({ host: ip, port, path: "/", rejectUnauthorized: false, timeout: 2500 },
      (r) => {
        let body = "";
        r.on("data", (c) => { body += c; if (body.length > 512) r.destroy(); });
        r.on("end", () => resolve(/hello/i.test(body)));
        r.on("error", () => resolve(false));
      });
    req.on("timeout", () => { req.destroy(); resolve(false); });
    req.on("error", () => resolve(false));
  });
}

/**
 * يمسح الشبكة كلها ويصف ما وجد.
 * @param {(m:string)=>void} log
 * @param {{adbProbe?:Function}} deps حقنُ فاحص ADB كيلا تتشابك الوحدات
 */
async function surveyNetwork(log = () => {}, deps = {}) {
  const bases = subnets();
  if (!bases.length) return { ok: false, why: "ما لقيت شبكة محلية", devices: [] };

  const started = Date.now();
  log("survey: sweeping " + bases.map((b) => b + ".x").join(", "));

  // ١) SSDP أولاً: يعمل في أثناء ما نمسح المنافذ
  const ssdpPromise = ssdpProbe();

  // ٢) مسح المنافذ المميِّزة على كل عنوان
  const targets = [];
  for (const b of bases) for (let i = 1; i <= 254; i++) targets.push(b + "." + i);

  const hits = await pool(targets, 96, async (ip) => {
    const open = [];
    for (const port of QUICK_PORTS) {
      if (await portOpenOn(ip, port, 500)) open.push(port);
      if (open.length >= 6) break;            // يكفي للتعريف
    }
    return open.length ? { ip, open } : null;
  });

  const ssdp = await ssdpPromise;
  log("survey: " + hits.length + " host(s) with open ports, " + ssdp.size + " announced over SSDP");

  // ٣) نضمّ من أعلن عن نفسه ولم يفتح منفذاً نعرفه
  for (const ip of ssdp.keys()) {
    if (!hits.some((h) => h.ip === ip)) hits.push({ ip, open: [] });
  }

  // ٤) نصف كل جهاز
  const devices = await pool(hits, 12, async (h) => {
    const mac = await macOf(h.ip);
    const info = ssdp.get(h.ip);
    let desc = null;
    if (info && info.location) desc = await fetchDescription(info.location);

    const marks = [];
    for (const port of h.open) {
      const f = FINGERPRINTS.find((x) => x.port === port);
      if (f) marks.push(Object.assign({}, f));
    }

    // نتحقّق مما ندّعيه
    for (const m of marks) {
      if (m.kind === "webos") {
        m.confirmed = await verifyWebOS(h.ip, m.port);
        if (!m.confirmed) { m.verdict = "unknown"; m.label = "منفذ " + m.port; }
      } else if (m.kind === "android" && deps.adbProbe) {
        const r = await deps.adbProbe(h.ip, m.port);
        m.confirmed = r.ok;
        if (!r.ok) { m.verdict = "known"; m.why = r.why; }
      }
    }

    const best = marks.find((m) => m.verdict === "supported") ||
                 marks.find((m) => m.verdict === "known") || marks[0] || null;

    return {
      ip: h.ip,
      mac: mac || "",
      vendor: vendorOf(mac) || (desc && desc.maker) || "",
      name: (desc && desc.name) || "",
      model: (desc && desc.model) || "",
      server: (info && info.server) || "",
      ports: h.open,
      marks,
      kind: best ? best.kind : "",
      label: best ? best.label : "",
      page: best ? best.page || "" : "",
      verdict: best ? best.verdict : "unknown",
    };
  });

  devices.sort((a, b) => Number(a.ip.split(".")[3]) - Number(b.ip.split(".")[3]));
  const secs = ((Date.now() - started) / 1000).toFixed(1);
  log("survey: done in " + secs + "s — " + devices.length + " device(s)");
  return { ok: true, devices, seconds: Number(secs), subnets: bases };
}

module.exports = {
  surveyNetwork, subnets, portOpenOn, sweep, pool,
  vendorOf, ssdpProbe, fetchDescription, FINGERPRINTS, OUI,
};

"use strict";
// ============================================================
// ماسح الشبكة — يعرض الأجهزة المتصلة بشبكة البيت
//
// نافع في موضعين:
//   • التأكد أن جهازاً بلا شاشة يعمل ويتصل بالواي فاي
//   • إيجاد عناوين الأجهزة قبل ربطها (تلفزيون، مكيف، كاميرا)
//
// التشغيل:  node scan.js
// ============================================================

const { exec } = require("child_process");
const os = require("os");
const net = require("net");

// المنافذ الشائعة تدل على نوع الجهاز حين يستجيب لأحدها
const HINTS = [
  [3001, "تلفزيون webOS"],
  [3000, "تلفزيون webOS"],
  [8009, "كروم كاست"],
  [554,  "كاميرا (RTSP)"],
  [8080, "كاميرا أو خادم"],
  [8022, "Termux SSH"],
  [22,   "SSH"],
  [80,   "واجهة ويب"],
  [6668, "جهاز Tuya"],
];

function subnets() {
  const out = [];
  for (const list of Object.values(os.networkInterfaces())) {
    for (const i of list || []) {
      const fam = typeof i.family === "string" ? i.family : `IPv${i.family}`;
      if (fam !== "IPv4" || i.internal) continue;
      const p = i.address.split(".").slice(0, 3).join(".");
      if (!out.includes(p)) out.push(p);
    }
  }
  return out;
}

const ping = (ip) => new Promise((res) =>
  exec(`ping -c 1 -W 1 ${ip}`, (err) => res(!err)));

function tcp(ip, port, timeout = 700) {
  return new Promise((res) => {
    const s = new net.Socket();
    let done = false;
    const end = (ok) => { if (!done) { done = true; s.destroy(); res(ok); } };
    s.setTimeout(timeout);
    s.once("connect", () => end(true));
    s.once("timeout", () => end(false));
    s.once("error", () => end(false));
    s.connect(port, ip);
  });
}

// جدول ARP يكشف أجهزة لا ترد على ping — وكثير من الجوالات كذلك
function arpTable() {
  return new Promise((res) => {
    exec("ip neigh show 2>/dev/null || cat /proc/net/arp 2>/dev/null", (err, out) => {
      const found = new Map();
      for (const line of (out || "").split("\n")) {
        const ip = (line.match(/(\d{1,3}(?:\.\d{1,3}){3})/) || [])[1];
        const mac = (line.match(/([0-9a-f]{2}(?::[0-9a-f]{2}){5})/i) || [])[1];
        if (ip && mac && !/00:00:00:00:00:00/.test(mac)) found.set(ip, mac);
      }
      res(found);
    });
  });
}

(async () => {
  const nets = subnets();
  if (!nets.length) {
    console.log("ما لقيت شبكة — تأكد من اتصال الواي فاي");
    return;
  }

  console.log("مسح الشبكة " + nets.map(n => n + ".x").join(" و ") + " …");
  console.log("(يأخذ نحو دقيقة)");
  console.log("");

  const targets = [];
  for (const p of nets) for (let i = 1; i <= 254; i++) targets.push(`${p}.${i}`);

  // ping متوازٍ ليوقظ الأجهزة ويملأ جدول ARP
  const alive = [];
  let idx = 0;
  await Promise.all(Array.from({ length: 48 }, async () => {
    while (idx < targets.length) {
      const ip = targets[idx++];
      if (await ping(ip)) alive.push(ip);
    }
  }));

  const arp = await arpTable();
  for (const ip of arp.keys()) if (!alive.includes(ip)) alive.push(ip);

  alive.sort((a, b) => Number(a.split(".")[3]) - Number(b.split(".")[3]));

  if (!alive.length) {
    console.log("ما ظهر أي جهاز — جرّب تشغيل المسح من جهاز على نفس الشبكة");
    return;
  }

  console.log("الأجهزة الظاهرة (" + alive.length + "):");
  console.log("");
  for (const ip of alive) {
    const tags = [];
    for (const [port, label] of HINTS) {
      if (await tcp(ip, port)) tags.push(label + ":" + port);
    }
    const mac = arp.get(ip);
    console.log("  " + ip.padEnd(16) +
                (mac ? mac + "  " : "".padEnd(19)) +
                (tags.length ? tags.join(" · ") : ""));
  }
  console.log("");
  console.log("قارن القائمة قبل تشغيل الجهاز وبعده — العنوان الجديد هو جهازك.");
})();

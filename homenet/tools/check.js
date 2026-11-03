"use strict";
// ============================================================
// فحص الجاهزية — شغّله قبل التشغيل الأول:
//     npm run check
//
// يجيب على أربعة أسئلة:
//   ١) هل نسخة Node كافية؟
//   ٢) هل المنفذ ٥٣ متاح لنا؟ وإن لا، فمن يشغله وكيف نفرّغه؟
//   ٣) ما العنوان الذي نكتبه في الراوتر؟
//   ٤) هل يصل هذا الجهاز لخوادم DNS الخارجية أصلاً؟
// ============================================================

const os = require("os");
const fs = require("fs");
const net = require("net");
const dgram = require("dgram");
const path = require("path");
const { execFileSync } = require("child_process");
const dnsm = require("../lib/dns");

const PLATFORM = process.platform;      // linux | darwin | win32
const DNS_PORT = Number(process.env.HOMENET_DNS_PORT || 53);
const WEB_PORT = Number(process.env.HOMENET_PORT || 8081);

let problems = 0;
let warnings = 0;

function ok(msg, detail) { console.log(`  ✅ ${msg}` + (detail ? `\n      ${detail}` : "")); }
function warn(msg, detail) { warnings++; console.log(`  ⚠️  ${msg}` + (detail ? `\n      ${detail}` : "")); }
function bad(msg, detail) { problems++; console.log(`  ❌ ${msg}` + (detail ? `\n      ${detail}` : "")); }
function head(t) { console.log(`\n${t}`); }

// ---------- ١) نسخة Node ----------
function checkNode() {
  head("‏١) نسخة Node");
  const major = Number(process.versions.node.split(".")[0]);
  if (major >= 18) ok(`Node ${process.versions.node}`);
  else bad(`Node ${process.versions.node} قديمة`, "التطبيق يحتاج 18 فأحدث — حدّثها من nodejs.org");
}

// ---------- ٢) المنفذ ----------
function tryBindUdp(port) {
  return new Promise((resolve) => {
    const s = dgram.createSocket({ type: "udp4", reuseAddr: true });
    s.once("error", (e) => { try { s.close(); } catch { /* */ } resolve(e.code || e.message); });
    s.bind(port, "0.0.0.0", () => { s.close(() => resolve(null)); });
  });
}

function tryBindTcp(port) {
  return new Promise((resolve) => {
    const s = net.createServer();
    s.once("error", (e) => { try { s.close(); } catch { /* */ } resolve(e.code || e.message); });
    s.listen(port, "0.0.0.0", () => s.close(() => resolve(null)));
  });
}

// من يشغل المنفذ؟ نحاول معرفته بأدوات النظام
function whoHoldsPort(port) {
  try {
    if (PLATFORM === "win32") {
      const out = execFileSync("netstat", ["-ano", "-p", "UDP"], { encoding: "utf8", timeout: 5000 });
      const line = out.split("\n").find((l) => new RegExp(`:${port}\\s`).test(l));
      if (!line) return "";
      const pid = line.trim().split(/\s+/).pop();
      try {
        const tl = execFileSync("tasklist", ["/fi", `pid eq ${pid}`, "/fo", "csv", "/nh"], { encoding: "utf8", timeout: 5000 });
        return `${tl.split(",")[0].replace(/"/g, "")} (PID ${pid})`;
      } catch { return `PID ${pid}`; }
    }
    // لينكس وماك
    const out = execFileSync("lsof", ["-nP", `-iUDP:${port}`], { encoding: "utf8", timeout: 5000 });
    const line = out.split("\n")[1];
    if (!line) return "";
    const parts = line.trim().split(/\s+/);
    return `${parts[0]} (PID ${parts[1]})`;
  } catch { return ""; }
}

function portFixHint(code) {
  if (code === "EACCES") {
    if (PLATFORM === "win32") return "افتح موجّه الأوامر أو PowerShell بصلاحية مسؤول (Run as administrator).";
    return "المنفذ ٥٣ محجوز للنظام. إما:\n        sudo node server.js\n      أو (الأنظف، مرة واحدة):\n        sudo setcap 'cap_net_bind_service=+ep' $(which node)";
  }
  if (code === "EADDRINUSE") {
    const who = whoHoldsPort(DNS_PORT);
    let hint = "المنفذ مشغول بخادم DNS آخر." + (who ? ` يشغله الآن: ${who}` : "");
    if (PLATFORM === "linux") {
      hint += "\n      على أوبنتو/دبيان غالباً systemd-resolved:\n" +
        "        sudo systemctl disable --now systemd-resolved\n" +
        "        sudo rm -f /etc/resolv.conf && echo 'nameserver 127.0.0.1' | sudo tee /etc/resolv.conf";
    } else if (PLATFORM === "win32") {
      hint += "\n      على ويندوز غالباً خدمة مشاركة الاتصال:  net stop SharedAccess";
    }
    return hint;
  }
  return "";
}

async function checkPorts() {
  head(`‏٢) المنافذ (DNS: ${DNS_PORT}، اللوحة: ${WEB_PORT})`);

  const udp = await tryBindUdp(DNS_PORT);
  if (!udp) ok(`المنفذ ${DNS_PORT}/UDP متاح`);
  else bad(`تعذّر حجز المنفذ ${DNS_PORT}/UDP — ${udp}`, portFixHint(udp));

  const tcp = await tryBindTcp(DNS_PORT);
  if (!tcp) ok(`المنفذ ${DNS_PORT}/TCP متاح`);
  else warn(`تعذّر حجز المنفذ ${DNS_PORT}/TCP — ${tcp}`, "الأغلبية تسأل عبر UDP، فالتطبيق يشتغل، لكن بعض الأجهزة تحتاج TCP.");

  const web = await tryBindTcp(WEB_PORT);
  if (!web) ok(`منفذ اللوحة ${WEB_PORT} متاح`);
  else bad(`منفذ اللوحة ${WEB_PORT} مشغول — ${web}`, `غيّره:  HOMENET_PORT=8082 node server.js`);

  // تنبيه خاص بلينكس: حتى لو نجح الحجز، قد يكون resolv.conf يشير للمحلي
  if (PLATFORM === "linux") {
    try {
      const rc = fs.readFileSync("/etc/resolv.conf", "utf8");
      if (rc.includes("127.0.0.53")) {
        warn("هذا الجهاز نفسه يستعمل systemd-resolved كـ DNS",
          "بعد تشغيل التطبيق، اجعله يستعمل نفسه:\n" +
          "        echo 'nameserver 127.0.0.1' | sudo tee /etc/resolv.conf");
      }
    } catch { /* لا بأس */ }
  }
}

// ---------- ٣) عنوان الجهاز في الشبكة ----------
function privateRank(ip) {
  if (ip.startsWith("192.168.")) return 0;
  if (/^10\./.test(ip)) return 1;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(ip)) return 2;
  if (ip.startsWith("169.254.")) return 9;   // عنوان تلقائي = لا شبكة فعلية
  return 5;
}

function checkAddress() {
  head("‏٣) عنوان هذا الجهاز في شبكة البيت");
  const found = [];
  for (const [iface, addrs] of Object.entries(os.networkInterfaces())) {
    for (const a of addrs || []) {
      if (a.family !== "IPv4" || a.internal) continue;
      found.push({ iface, ip: a.address, mac: a.mac, rank: privateRank(a.address) });
    }
  }
  if (!found.length) {
    bad("ما لقينا أي عنوان شبكة", "تأكد أن الجهاز متصل بالراوتر (يُفضّل بسلك).");
    return null;
  }
  found.sort((a, b) => a.rank - b.rank);
  for (const f of found) {
    const note = f.rank === 9 ? " ← عنوان تلقائي، يعني ما وصله DHCP" : "";
    console.log(`     • ${f.ip}  على ${f.iface}  (${f.mac})${note}`);
  }
  const best = found[0];
  if (best.rank === 9) {
    bad("العنوان الوحيد تلقائي (169.254.x.x)", "الجهاز غير متصل بالراوتر فعلياً.");
    return null;
  }
  if (found.filter((f) => f.rank < 5).length > 1) {
    warn("للجهاز أكثر من عنوان في الشبكة",
      "اختر عنوان الواجهة الموصولة بالراوتر، ويُفضّل تعطيل الواي‑فاي والاكتفاء بالسلك.");
  }
  ok(`العنوان المرشَّح: ${best.ip}`);
  return best.ip;
}

// ---------- ٤) الوصول للخارج ----------
function askUpstream(server, name = "example.com") {
  return new Promise((resolve) => {
    const sock = dgram.createSocket("udp4");
    const q = dnsm.buildQuery(0x4242, name, dnsm.TYPE.A);
    const timer = setTimeout(() => { try { sock.close(); } catch { /* */ } resolve(null); }, 3000);
    sock.on("message", (buf) => {
      clearTimeout(timer);
      try { sock.close(); } catch { /* */ }
      const msg = dnsm.parseMessage(buf);
      if (!msg) return resolve(null);
      const a = dnsm.extractAddresses(buf, msg);
      resolve(a.A.length ? dnsm.ipToString(a.A[0]) : null);
    });
    sock.on("error", () => { clearTimeout(timer); resolve(null); });
    sock.send(q, 53, server);
  });
}

async function checkUpstream() {
  head("‏٤) الوصول لخوادم DNS الخارجية");
  const servers = ["1.1.1.1", "8.8.8.8"];
  let any = false;
  for (const s of servers) {
    const ip = await askUpstream(s);
    if (ip) { ok(`${s} يجيب (example.com → ${ip})`); any = true; }
    else warn(`${s} لم يجب خلال ٣ ثوانٍ`);
  }
  if (!any) {
    bad("ما وصلنا لأي خادم DNS خارجي",
      "إمّا لا إنترنت على هذا الجهاز، أو الراوتر/الجدار الناري يحجب المنفذ ٥٣ للخارج.\n" +
      "      لو كنت قد حجبت المنفذ ٥٣ عمداً (لمنع الالتفاف) فاستثنِ هذا الجهاز.");
  }
}

// ---------- ٥) مجلد البيانات ----------
function checkData() {
  head("‏٥) مجلد البيانات");
  const dir = process.env.HOMENET_DATA || path.join(__dirname, "..", "data");
  try {
    fs.mkdirSync(dir, { recursive: true });
    const probe = path.join(dir, ".write-test");
    fs.writeFileSync(probe, "ok");
    fs.unlinkSync(probe);
    ok(`قابل للكتابة: ${dir}`);
    const cfg = path.join(dir, "config.json");
    if (fs.existsSync(cfg)) ok("توجد إعدادات محفوظة من تشغيل سابق");
    else console.log("      (أول تشغيل سيُنشئ الإعدادات ويطبع رمز دخول اللوحة)");
  } catch (e) {
    bad(`ما نقدر نكتب في ${dir}`, e.message);
  }
}

// ---------- ٦) المنطقة الزمنية ----------
function checkTz() {
  head("‏٦) ساعة الجهاز");
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "غير معروفة";
  const now = new Date();
  const t = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  console.log(`      المنطقة: ${tz} · الساعة الآن: ${t}`);
  if (/UTC|GMT/i.test(tz)) {
    warn("ساعة الجهاز على التوقيت العالمي",
      "أوقات النوم والجداول تعتمد ساعة الجهاز. اضبط منطقتك:\n" +
      "        sudo timedatectl set-timezone Asia/Riyadh     (لينكس)\n" +
      "      أو ضع  TZ=Asia/Riyadh  قبل أمر التشغيل.");
  } else {
    ok("المنطقة الزمنية مضبوطة — الجداول ستعمل على التوقيت الصحيح");
  }
}

// ---------- الخلاصة ----------
// صياغة عربية سليمة للعدد: مفرد، مثنّى، جمع قلّة، ثم تمييز مفرد منصوب
function arabicCount(n, { one, two, few, many }) {
  if (n === 1) return one;
  if (n === 2) return two;
  if (n <= 10) return `${n} ${few}`;
  return `${n} ${many}`;
}
const PROBLEM_WORDS = { one: "مشكلة واحدة", two: "مشكلتان", few: "مشاكل", many: "مشكلة" };
const WARN_WORDS = { one: "تنبيه واحد", two: "تنبيهان", few: "تنبيهات", many: "تنبيهاً" };

function summary(ip) {
  head("———————————————————————————————————————");
  if (problems) {
    const p = arabicCount(problems, PROBLEM_WORDS);
    console.log(`\n  ❌ يمنع التشغيل: ${p}.`);
    if (warnings) console.log(`     ومعها ${arabicCount(warnings, WARN_WORDS)} لا تمنع التشغيل لكن تستحق النظر.`);
    console.log("     عالج ما فوق ثم أعد:  npm run check\n");
    process.exitCode = 1;
    return;
  }
  console.log(`\n  ✅ الجهاز جاهز` + (warnings ? ` (مع ${arabicCount(warnings, WARN_WORDS)} فوق)` : "") + ".\n");
  console.log("  الخطوات الباقية:\n");
  console.log("   ‏١. شغّل الخادم:");
  console.log(PLATFORM === "win32"
    ? "        node server.js          (من نافذة بصلاحية مسؤول)"
    : "        sudo node server.js");
  console.log("      واحفظ رمز دخول اللوحة الذي سيُطبع.\n");
  if (ip) {
    console.log("   ‏٢. في الراوتر → LAN → DHCP → DNS Server اكتب:\n");
    console.log(`        ${ip}\n`);
    console.log("      واترك الخانة الثانية فارغة (أي خادم احتياطي = ثغرة تتجاوز الفلترة).");
    console.log(`      واحجز هذا العنوان لهذا الجهاز في DHCP حتى لا يتغيّر.\n`);
    console.log(`   ‏٣. افتح اللوحة:  http://${ip}:${WEB_PORT}\n`);
  }
  console.log("   ‏٤. أعد تشغيل أجهزة البيت (أو أطفئ الواي‑فاي وشغّله) لتأخذ الإعداد الجديد.\n");
  console.log("  تنبيه مهم: لو نام هذا الجهاز أو انطفأ، ينقطع الإنترنت عن البيت كله.");
  console.log("  عطّل السكون، واقرأ قسم «تشغيله دائماً» في README.\n");
}

(async () => {
  console.log("\n════ فحص جاهزية «شبكة البيت» ════");
  console.log(`  النظام: ${PLATFORM} · ${os.release()}`);
  checkNode();
  await checkPorts();
  const ip = checkAddress();
  await checkUpstream();
  checkData();
  checkTz();
  summary(ip);
})();

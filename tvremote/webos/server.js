"use strict";
// ============================================================
// خادم ريموت webOS — يشتغل على جهاز داخل شبكة البيت
//
// لماذا هذا الخادم أصلاً؟
//   التلفزيون يمنح المتصفحات أذونات محدودة: يسمح بالصوت والتطبيقات
//   والكتابة، ويرفض الإدخال بـ 401 insufficient permissions.
//   أما البرامج العادية فيمنحها أذوناته كاملة. هذا الخادم برنامج
//   عادي، فيتصل بالتلفزيون بأذونات تامة ويمرّر أوامر جوالك إليه —
//   فتعمل أزرار التنقل ولوحة اللمس.
//
//   جوالك ──HTTP──▶ هذا الخادم ──wss──▶ التلفزيون
//
// التشغيل:  node server.js            (يبحث عن التلفزيون تلقائياً)
//           TV_IP=192.168.8.77 node server.js
// ============================================================

const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const { WebSocketServer, WebSocket } = require("ws");
const { discover } = require("./discover");

// حين يعمل الخادم خدمةً في الخلفية لا سبيل لتمرير متغيّرات البيئة إليه،
// فيقرأ إعداداته من ملف بجانبه يكتبه المنصّب
function fileConfig() {
  try {
    const raw = fs.readFileSync(path.join(__dirname, "config.json"), "utf8");
    return JSON.parse(raw.replace(/^﻿/, ""));   // محرّرات ويندوز تضيف BOM خفيّاً
  } catch {
    return {};
  }
}
const CFG = fileConfig();

const PORT = Number(process.env.PORT || CFG.port || 8099);
const TV_PORT = Number(process.env.TV_PORT || CFG.tvPort || 3001);
const PAGE = path.join(__dirname, "..", "..", "tv.html");

// عنوان التلفزيون متغيّر لا ثابت: الراوتر يمنحه عنواناً جديداً بعد كل
// إعادة تشغيل، وكثير من راوترات الجيل الخامس لا تتيح حجزه. فبدل أن
// نُلزم صاحب البيت بضبط راوتره، يعثر الخادم على التلفزيون بنفسه.
let tvIp = process.env.TV_IP || CFG.tvIp || "";
let seeking = null;                 // وعد المسح الجاري، كيلا نمسح مرّتين معاً

function saveTvIp(ip) {
  if (!ip || ip === CFG.tvIp) return;
  CFG.tvIp = ip;
  try {
    fs.writeFileSync(path.join(__dirname, "config.json"),
      JSON.stringify({ tvIp: ip, tvPort: TV_PORT, port: PORT }, null, 2));
  } catch { /* القرص للقراءة فقط أحياناً — لا يمنع العمل */ }
}

/** يتحقّق من العنوان المعروف، وإن سقط بحث عن التلفزيون في الشبكة */
function ensureTv() {
  if (seeking) return seeking;
  seeking = discover(log, tvIp)
    .then((ip) => {
      if (ip && ip !== tvIp) { log("عنوان التلفزيون صار " + ip); saveTvIp(ip); }
      if (ip) tvIp = ip;
      return ip;
    })
    .finally(() => { seeking = null; });
  return seeking;
}

// ---------- تقديم الواجهة ----------
// نحقن راية تخبر الصفحة أنها تعمل خلف خادم، فتوجّه اتصالها إليه
function servePage(res) {
  let html;
  try {
    html = fs.readFileSync(PAGE, "utf8");
  } catch {
    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    return res.end("ما لقيت ملف tv.html بجذر المستودع");
  }
  const flag = `<script>window.__TV_PROXY__=${JSON.stringify(tvIp || "auto")};</script>\n`;
  html = html.replace("<script>", flag + "<script>");
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
  res.end(html);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");
  if (url.pathname === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ ok: true, tv: tvIp || null, seeking: !!seeking }));
  }
  // زر يدوي لإعادة البحث حين يُنقل التلفزيون أو يتبدّل عنوانه
  if (url.pathname === "/find-tv") {
    return ensureTv().then((ip) => {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: !!ip, tv: ip || null }));
    });
  }
  servePage(res);
});

// ---------- جسر المقابس ----------
// كل مقبس من المتصفح يقابله مقبس إلى التلفزيون، والرسائل تمرّ بينهما
// كما هي. الفارق الوحيد — وهو المقصود — أن اتصالنا بالتلفزيون لا يحمل
// ترويسة Origin، فيعامله التلفزيون معاملة البرامج لا صفحات الويب.
const wss = new WebSocketServer({ server });

// نستبدل المضيف بعنوان التلفزيون المعروف ونُبقي المنفذ والمسار: قناة
// المؤشّر تأتي بمنفذ ومسار خاصّين. وفي هذا أمنٌ أيضاً — يستحيل أن يُمرَّر
// الاتصال إلى مضيف آخر مهما طلبت الصفحة.
function retarget(raw) {
  if (process.env.TV_URL) {                    // للاختبار أو منفذ غير معتاد
    const base = process.env.TV_URL.replace(/\/+$/, "");
    try { const u = new URL(raw); return base + (u.pathname === "/" ? "" : u.pathname); }
    catch { return base; }
  }
  try {
    const u = new URL(raw);
    if (!/^wss?:$/.test(u.protocol)) return null;
    u.hostname = tvIp;
    return u.toString();
  } catch { return null; }
}

wss.on("connection", async (client, req) => {
  const url = new URL(req.url, "http://localhost");
  const raw = url.searchParams.get("target") || `wss://0.0.0.0:${TV_PORT}`;

  if (!tvIp && !process.env.TV_URL) await ensureTv();
  if (!tvIp && !process.env.TV_URL) {
    return client.close(1011, "ما وجدت التلفزيون في الشبكة");
  }

  const queue = [];
  let ready = false;
  let upstream = null;
  let searched = false;             // نبحث مرة واحدة لكل اتصال، لا مرّتين

  // 1004 و1005 و1006 و1015 محجوزة: يرفض البروتوكول إرسالها، ومحاولة
  // تمرير رمز إغلاق التلفزيون كما هو تُسقط الخادم كلّه
  const sendable = (c) =>
    (c >= 1000 && c <= 4999 && ![1004, 1005, 1006, 1015].includes(c)) ? c : 1011;

  const bail = (code, why) => {
    if (client.readyState !== WebSocket.OPEN) return;
    try { client.close(sendable(code), why || ""); } catch { client.terminate(); }
  };

  function open() {
    const target = retarget(raw);
    if (!target) return bail(1008, "هدف غير صالح");

    log("→ فتح قناة إلى " + target);
    upstream = new WebSocket(target, {
      rejectUnauthorized: false,   // شهادة التلفزيون موقّعة ذاتياً
      handshakeTimeout: 8000,
      // بلا ترويسة Origin عمداً — هي سبب تقييد التلفزيون للمتصفحات
    });

    upstream.on("open", () => {
      ready = true;
      log("✓ التلفزيون رد على " + target);
      for (const m of queue.splice(0)) upstream.send(m);
    });

    upstream.on("message", (data) => {
      if (client.readyState === WebSocket.OPEN) client.send(data.toString());
    });

    upstream.on("close", (code, reason) => {
      if (!ready) return;          // فشل الوصل يعالجه معالج الخطأ أدناه
      log("✗ أُغلقت قناة التلفزيون (" + code + (reason ? " " + reason : "") + ")");
      bail(code, reason && reason.toString());
    });

    // تعذّر الوصول غالباً يعني أن الراوتر أعطى التلفزيون عنواناً جديداً،
    // فنبحث عنه مرة ونعيد المحاولة بدل أن نُفشل الطلب على المستخدم
    upstream.on("error", async (e) => {
      log("✗ خطأ نحو التلفزيون: " + e.message);
      if (ready || searched || process.env.TV_URL) return bail(1011, "تعذّر الوصول للتلفزيون");
      searched = true;
      const before = tvIp;
      const found = await ensureTv();
      if (found && found !== before && client.readyState === WebSocket.OPEN) {
        log("أعيد المحاولة على " + found);
        return open();
      }
      bail(1011, "تعذّر الوصول للتلفزيون");
    });
  }

  client.on("message", (data) => {
    const text = data.toString();
    if (ready && upstream) upstream.send(text);
    else queue.push(text);          // الأوامر المبكرة تنتظر جهوز القناة
  });

  client.on("close", () => { try { upstream && upstream.close(); } catch {} });
  client.on("error", () => { try { upstream && upstream.close(); } catch {} });

  open();
});

function log(msg) {
  console.log(new Date().toLocaleTimeString("en-GB") + "  " + msg);
}

// ---------- عناوين الجهاز على الشبكة ----------
function localAddresses() {
  const nets = require("os").networkInterfaces();
  const out = [];
  for (const name of Object.keys(nets)) {
    for (const i of nets[name] || []) {
      const fam = typeof i.family === "string" ? i.family : `IPv${i.family}`;
      if (fam === "IPv4" && !i.internal) out.push(i.address);
    }
  }
  return out;
}

server.listen(PORT, "0.0.0.0", () => {
  const addrs = localAddresses();
  console.log("──────────────────────────────────────────");
  console.log("  ريموت KMC — الخادم يعمل");
  console.log("");
  console.log("  افتح من جوالك:");
  for (const a of addrs) console.log(`     http://${a}:${PORT}`);
  if (!addrs.length) console.log("     (ما لقيت عنواناً — تأكد من اتصال الواي فاي)");
  console.log("");
  console.log("  التلفزيون: " + (tvIp ? tvIp + ":" + TV_PORT : "يُبحث عنه…"));
  console.log("──────────────────────────────────────────");

  // نتحقّق من العنوان المحفوظ فور الإقلاع، فيكون جاهزاً قبل أول ضغطة زر
  if (!process.env.TV_URL) ensureTv();
});

module.exports = server;

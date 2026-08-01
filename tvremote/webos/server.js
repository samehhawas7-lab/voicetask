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
const TV_IP = process.env.TV_IP || CFG.tvIp || "";
const TV_PORT = Number(process.env.TV_PORT || CFG.tvPort || 3001);
const PAGE = path.join(__dirname, "..", "..", "tv.html");

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
  const flag = `<script>window.__TV_PROXY__=${JSON.stringify(TV_IP || "auto")};</script>\n`;
  html = html.replace("<script>", flag + "<script>");
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
  res.end(html);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");
  if (url.pathname === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ ok: true, tv: TV_IP || null }));
  }
  servePage(res);
});

// ---------- جسر المقابس ----------
// كل مقبس من المتصفح يقابله مقبس إلى التلفزيون، والرسائل تمرّ بينهما
// كما هي. الفارق الوحيد — وهو المقصود — أن اتصالنا بالتلفزيون لا يحمل
// ترويسة Origin، فيعامله التلفزيون معاملة البرامج لا صفحات الويب.
const wss = new WebSocketServer({ server });

wss.on("connection", (client, req) => {
  const url = new URL(req.url, "http://localhost");
  let target = url.searchParams.get("target") || `wss://${TV_IP}:${TV_PORT}`;

  // TV_URL يفرض الوجهة كاملة (للاختبار أو لتلفزيون بمنفذ غير معتاد)
  if (process.env.TV_URL) {
    const base = process.env.TV_URL.replace(/\/+$/, "");
    let suffix = "";
    try { const u = new URL(target); suffix = u.pathname === "/" ? "" : u.pathname; } catch {}
    target = base + suffix;
  }

  if (!/^wss?:\/\//.test(target)) {
    client.close(1008, "هدف غير صالح");
    return;
  }

  // لا نسمح بتمرير الاتصال إلى أي مضيف: الخادم جسر للتلفزيون وحده
  if (TV_IP) {
    let host = "";
    try { host = new URL(target).hostname; } catch {}
    if (host !== TV_IP && !process.env.TV_URL) {
      log("✗ رُفض هدف خارج التلفزيون: " + target);
      return client.close(1008, "هدف غير مسموح");
    }
  }

  log("→ فتح قناة إلى " + target);

  const upstream = new WebSocket(target, {
    rejectUnauthorized: false,   // شهادة التلفزيون موقّعة ذاتياً
    handshakeTimeout: 8000,
    // بلا ترويسة Origin عمداً — هي سبب تقييد التلفزيون للمتصفحات
  });

  const queue = [];
  let ready = false;

  upstream.on("open", () => {
    ready = true;
    log("✓ التلفزيون رد على " + target);
    for (const m of queue.splice(0)) upstream.send(m);
  });

  upstream.on("message", (data) => {
    if (client.readyState === WebSocket.OPEN) client.send(data.toString());
  });

  upstream.on("close", (code, reason) => {
    log("✗ أُغلقت قناة التلفزيون (" + code + (reason ? " " + reason : "") + ")");
    if (client.readyState === WebSocket.OPEN) client.close(code >= 1000 && code <= 4999 ? code : 1011);
  });

  upstream.on("error", (e) => {
    log("✗ خطأ نحو التلفزيون: " + e.message);
    try { client.close(1011, "تعذّر الوصول للتلفزيون"); } catch {}
  });

  client.on("message", (data) => {
    const text = data.toString();
    if (ready) upstream.send(text);
    else queue.push(text);          // الأوامر المبكرة تنتظر جهوز القناة
  });

  client.on("close", () => { try { upstream.close(); } catch {} });
  client.on("error", () => { try { upstream.close(); } catch {} });
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
  console.log("  التلفزيون: " + (TV_IP ? TV_IP + ":" + TV_PORT : "يُحدَّد من الصفحة"));
  console.log("──────────────────────────────────────────");
});

module.exports = server;

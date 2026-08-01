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
const { discover, verify } = require("./discover");
const { wake, macOf } = require("./wol");
const adb = require("./adb");
const { spawn } = require("child_process");

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
let tvMac = CFG.tvMac || "";        // يلزم لإيقاظه وهو مطفأ
let seeking = null;                 // وعد المسح الجاري، كيلا نمسح مرّتين معاً

// البروجيكتر: جهاز أندرويد يُتحكَّم به عبر ADB لا عبر SSAP
let projIp = process.env.PROJ_IP || CFG.projIp || "";
const PROJ_PORT = Number(process.env.PROJ_PORT || CFG.projPort || 5555);

function saveConfig() {
  try {
    fs.writeFileSync(path.join(__dirname, "config.json"),
      JSON.stringify(Object.assign({}, CFG, { tvIp, tvMac, projIp, tvPort: TV_PORT, port: PORT }), null, 2));
  } catch { /* القرص للقراءة فقط أحياناً — لا يمنع العمل */ }
}

// عنوان البطاقة لا يظهر في جدول ARP إلا لمن خاطبناه حديثاً، فنلتقطه
// والتلفزيون شغّال ونحفظه — لأننا سنحتاجه بالضبط حين يكون مطفأً
async function rememberMac() {
  if (!tvIp) return;
  const mac = await macOf(tvIp);
  if (mac && mac !== tvMac) {
    tvMac = mac;
    log("TV MAC address: " + mac);
    saveConfig();
  }
}

/** يتحقّق من العنوان المعروف، وإن سقط بحث عن التلفزيون في الشبكة */
function ensureTv() {
  if (seeking) return seeking;
  seeking = discover(log, tvIp)
    .then(async (ip) => {
      if (ip && ip !== tvIp) { log("TV address is now " + ip); tvIp = ip; saveConfig(); }
      if (ip) { tvIp = ip; await rememberMac(); }
      return ip;
    })
    .finally(() => { seeking = null; });
  return seeking;
}

/**
 * يوقظ التلفزيون ثم ينتظر ظهوره على الشبكة.
 * الحزمة تصل في جزء من الثانية، لكن webOS يأخذ نحو عشر ثوانٍ حتى يفتح
 * منفذه — فننتظر بدل أن نُبلّغ بالنجاح قبل أوانه.
 */
async function powerOn() {
  if (!tvMac) {
    await ensureTv();               // قد يكون شغّالاً فنلتقط بطاقته الآن
    if (!tvMac) return { ok: false, why: "ما أعرف عنوان بطاقة التلفزيون بعد — شغّله مرة واحدة يدوياً وأنا أحفظه" };
  }
  try {
    const n = await wake(tvMac);
    log("wake packet sent to " + tvMac + " (x" + n + ")");
  } catch (e) {
    return { ok: false, why: "تعذّر إرسال حزمة الإيقاظ: " + e.message };
  }
  for (let i = 0; i < 12; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    if (await verify(tvIp)) { log("OK  TV is awake"); return { ok: true, tv: tvIp }; }
  }
  return { ok: false, why: "أُرسلت الحزمة لكن التلفزيون ما استجاب — فعّل «تشغيل التلفزيون عبر Wi-Fi» من إعداداته" };
}


// ---------- البروجيكتر عبر ADB ----------
// كل ما يُمرَّر إلى صدفة الجهاز يُقيَّد بمحارف بعينها. الوصل إلى صدفة
// بصلاحيات واسعة عبر واجهة ويب لا يُترك بلا حَجر مهما بدا الطلب بريئاً.
const KEYNAME = /^[A-Z0-9_]{1,32}$/;
const PKGNAME = /^[a-zA-Z0-9._]{1,128}$/;

// ما نعرضه من تطبيقات، ولكلٍّ أسماء حزمٍ تختلف بين الأجهزة
const PROJ_APPS = [
  { key: "youtube", name: "يوتيوب",       glyph: "\u25B6", color: "#e02f2f",
    pkgs: ["com.google.android.youtube.tv", "com.google.android.youtube", "com.liskovsoft.smarttubetv.beta"] },
  { key: "netflix", name: "نتفلكس",       glyph: "N",  color: "#c9302c",
    pkgs: ["com.netflix.ninja", "com.netflix.mediaclient"] },
  { key: "disney",  name: "ديزني بلس",    glyph: "D",  color: "#1f4bb8",
    pkgs: ["com.disney.disneyplus"] },
  { key: "prime",   name: "أمازون برايم", glyph: "P",  color: "#1f8fb8",
    pkgs: ["com.amazon.amazonvideo.livingroom", "com.amazon.avod.thirdpartyclient"] },
  { key: "browser", name: "المتصفح",      glyph: "\u{1F310}", color: "#31708f",
    pkgs: ["com.android.chrome", "com.android.browser", "org.chromium.webview_shell"] },
];

let projApps = null;          // ما وُجد منها فعلاً على الجهاز

/** يمسح الشبكة عن جهاز يفتح منفذ ADB */
async function findProjector() {
  const { subnets } = require("./discover");
  const net2 = require("net");
  const open = (ip) => new Promise((res) => {
    const c = new net2.Socket(); let done = false;
    const end = (v) => { if (!done) { done = true; c.destroy(); res(v); } };
    c.setTimeout(700);
    c.once("connect", () => end(true));
    c.once("timeout", () => end(false));
    c.once("error", () => end(false));
    c.connect(PROJ_PORT, ip);
  });
  for (const base of subnets()) {
    const ips = [];
    for (let i = 1; i <= 254; i++) ips.push(base + "." + i);
    let idx = 0;
    const hits = [];
    await Promise.all(Array.from({ length: 64 }, async () => {
      while (idx < ips.length) { const ip = ips[idx++]; if (await open(ip)) hits.push(ip); }
    }));
    for (const ip of hits) {
      const r = await adb.probe(ip, PROJ_PORT);
      if (r.ok) return ip;
    }
  }
  return null;
}

async function projShell(cmd) {
  if (!projIp) {
    const found = await findProjector();
    if (!found) throw new Error("ما وجدت البروجيكتر — تأكد أنه شغّال وأن «تصحيح USB عبر الشبكة» مفعّل");
    projIp = found; saveConfig(); log("projector found at " + found);
  }
  return adb.shell(projIp, cmd, PROJ_PORT);
}

/** يسأل الجهاز عن الحزم المنصّبة مرة واحدة، ويطابقها بما نعرضه */
async function projectorApps() {
  if (projApps) return projApps;
  const out = await projShell("pm list packages");
  const have = new Set(out.split(/\r?\n/).map((l) => l.replace("package:", "").trim()).filter(Boolean));
  projApps = PROJ_APPS.map((a) => {
    const pkg = a.pkgs.find((p) => have.has(p));
    return pkg ? { key: a.key, name: a.name, glyph: a.glyph, color: a.color, pkg } : null;
  }).filter(Boolean);
  return projApps;
}


// ---------- التحديث الذاتي ----------
// كل ميزة كانت تُسلَّم بأمرٍ يُلصق في PowerShell على اللابتوب، وهي أكثر
// خطوة تعثّر فيها صاحب البيت. فصار الخادم يحدّث نفسه بطلبٍ من التطبيق.
const REPO = "samehhawas7-lab/voicetask";
const INSTALLER = "https://raw.githubusercontent.com/" + REPO + "/main/tvremote/windows/install.ps1";
const VERSION_FILE = path.join(__dirname, "..", "windows", "version.json");

function installedVersion() {
  try {
    const raw = fs.readFileSync(VERSION_FILE, "utf8");
    return JSON.parse(raw.replace(/^\uFEFF/, ""));
  } catch { return { sha: "", installedAt: null }; }
}

// نسأل GitHub عن آخر تعديل، ونحفظ الجواب عشر دقائق: الصفحة تسأل كل
// خمس ثوانٍ وهي مفتوحة، ولا معنى لإرهاق الخدمة بذلك
let latestCache = { at: 0, sha: "" };
function latestSha() {
  if (Date.now() - latestCache.at < 600000) return Promise.resolve(latestCache.sha);
  return new Promise((resolve) => {
    const req = https.get({
      host: "api.github.com",
      path: "/repos/" + REPO + "/commits/main",
      headers: { "User-Agent": "kmc-remote", "Accept": "application/vnd.github.sha" },
      timeout: 6000,
    }, (r) => {
      let body = "";
      r.on("data", (c) => { body += c; if (body.length > 4096) r.destroy(); });
      r.on("end", () => {
        const sha = /^[0-9a-f]{40}$/.test(body.trim()) ? body.trim() : "";
        if (sha) latestCache = { at: Date.now(), sha };
        resolve(sha);
      });
    });
    req.on("timeout", () => { req.destroy(); resolve(""); });
    req.on("error", () => resolve(""));      // بلا إنترنت: لا نعرف، ولا نضجّ
  });
}

let updating = false;

function startUpdate() {
  if (process.platform !== "win32" && !process.env.UPDATE_CMD) {
    return { ok: false, code: 501, why: "التحديث الذاتي لويندوز وحده" };
  }
  if (updating) return { ok: false, code: 409, why: "التحديث جارٍ بالفعل" };
  updating = true;

  const logFile = path.join(__dirname, "..", "windows", "update.log");
  const cmd = process.env.UPDATE_CMD || "powershell.exe";
  const args = process.env.UPDATE_CMD ? [] : [
    "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command",
    "& { irm '" + INSTALLER + "' | iex } *> '" + logFile + "'",
  ];

  try {
    // منفصلاً وجوباً: المنصّب يقتل عمليات node التابعة للمشروع، وهذا
    // الخادم منها. ولولا الفصل لمات المنصّب مع من أطلقه قبل أن يُتمّ.
    const child = spawn(cmd, args, {
      detached: true,
      stdio: "ignore",
      windowsHide: true,
      shell: !!process.env.UPDATE_CMD,
    });
    child.unref();
    log("update started -> " + logFile);
    return { ok: true, log: logFile };
  } catch (e) {
    updating = false;
    return { ok: false, code: 500, why: e.message };
  }
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
  const json = (code, body) => {
    res.writeHead(code, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
    res.end(JSON.stringify(body));
  };

  // النقاط المغيِّرة تشغّل أوامر على أجهزة البيت، وواحدة منها تشغّل
  // منصِّباً بصلاحيات النظام. وصفحةُ ويبٍ خبيثة تُفتح في الجوال تستطيع
  // طرقَ عنوانٍ في الشبكة المحلية بصورة مخفيّة. فيُشترط فيها أمران:
  //   • أن تكون POST — فالصور والوسوم لا تُصدر إلا GET
  //   • ألّا تحمل Origin من مضيف آخر — وغيابه مقبول، إذ لا يرسله
  //     المتصفح في طلبات نفس الأصل، وهي حالتنا
  const CHANGING = ["/update", "/power-on", "/find-tv",
                    "/proj/find", "/proj/key", "/proj/app", "/proj/wake", "/proj/sleep"];
  if (CHANGING.includes(url.pathname)) {
    if (req.method !== "POST") {
      return json(405, { ok: false, why: "هذه النقطة تُطلب بـ POST" });
    }
    const origin = req.headers.origin;
    if (origin) {
      let host = "";
      try { host = new URL(origin).host; } catch {}
      if (host !== req.headers.host) {
        log("blocked cross-origin " + req.method + " " + url.pathname + " from " + origin);
        return json(403, { ok: false, why: "طلب من أصل آخر" });
      }
    }
  }

  if (url.pathname === "/version") {
    const inst = installedVersion();
    return latestSha().then((latest) => json(200, {
      ok: true,
      installed: inst.sha || null,
      installedAt: inst.installedAt || null,
      latest: latest || null,
      updateAvailable: !!(latest && inst.sha && latest !== inst.sha),
      updating,
    }));
  }
  if (url.pathname === "/update") {
    const r = startUpdate();
    return json(r.ok ? 200 : (r.code || 500), r);
  }

  if (url.pathname === "/health") {
    return json(200, { ok: true, tv: tvIp || null, mac: tvMac || null, seeking: !!seeking });
  }
  // زر يدوي لإعادة البحث حين يُنقل التلفزيون أو يتبدّل عنوانه
  if (url.pathname === "/find-tv") {
    return ensureTv().then((ip) => json(200, { ok: !!ip, tv: ip || null, mac: tvMac || null }));
  }
  // إيقاظه وهو مطفأ — ما لا يقدر عليه المتصفح وحده
  if (url.pathname === "/power-on") {
    return powerOn().then((r) => json(r.ok ? 200 : 503, r))
                    .catch((e) => json(500, { ok: false, why: e.message }));
  }
  // ---------- البروجيكتر ----------
  if (url.pathname.startsWith("/proj/")) {
    const what = url.pathname.slice(6);
    const fail = (e) => json(503, { ok: false, why: e.message });

    if (what === "health") {
      return (projIp ? adb.probe(projIp, PROJ_PORT) : Promise.resolve({ ok: false, why: "لم يُحدَّد عنوانه بعد" }))
        .then((r) => json(200, Object.assign({ ip: projIp || null }, r)))
        .catch((e) => fail(e));
    }
    if (what === "find") {
      return findProjector().then((ip) => {
        if (ip) { projIp = ip; projApps = null; saveConfig(); }
        return json(200, { ok: !!ip, ip: ip || null });
      }).catch(fail);
    }
    if (what === "apps") {
      return projectorApps().then((a) => json(200, { ok: true, apps: a })).catch(fail);
    }
    if (what === "key") {
      const name = url.searchParams.get("name") || "";
      if (!KEYNAME.test(name)) return json(400, { ok: false, why: "اسم زرّ غير صالح" });
      return projShell("input keyevent KEYCODE_" + name)
        .then(() => json(200, { ok: true })).catch(fail);
    }
    if (what === "app") {
      const pkg = url.searchParams.get("pkg") || "";
      if (!PKGNAME.test(pkg)) return json(400, { ok: false, why: "اسم حزمة غير صالح" });
      return projShell("monkey -p " + pkg + " -c android.intent.category.LAUNCHER 1")
        .then(() => json(200, { ok: true })).catch(fail);
    }
    // الإيقاظ: WAKEUP يوقظ ولا يُطفئ، بخلاف POWER الذي يقلب الحالة
    if (what === "wake") {
      return projShell("input keyevent KEYCODE_WAKEUP")
        .then(() => json(200, { ok: true })).catch(fail);
    }
    if (what === "sleep") {
      return projShell("input keyevent KEYCODE_SLEEP")
        .then(() => json(200, { ok: true })).catch(fail);
    }
    return json(404, { ok: false, why: "غير معروف" });
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

    log("->  opening channel to " + target);
    upstream = new WebSocket(target, {
      rejectUnauthorized: false,   // شهادة التلفزيون موقّعة ذاتياً
      handshakeTimeout: 8000,
      // بلا ترويسة Origin عمداً — هي سبب تقييد التلفزيون للمتصفحات
    });

    upstream.on("open", () => {
      ready = true;
      log("OK  TV answered on " + target);
      // التلفزيون شغّال يقيناً الآن، وهذه أوثق لحظة لالتقاط بطاقته:
      // لا تظهر في جدول ARP إلا لمن خُوطب حديثاً، ولا تُعرف وهو مطفأ
      rememberMac().catch(() => {});
      for (const m of queue.splice(0)) upstream.send(m);
    });

    upstream.on("message", (data) => {
      if (client.readyState === WebSocket.OPEN) client.send(data.toString());
    });

    upstream.on("close", (code, reason) => {
      if (!ready) return;          // فشل الوصل يعالجه معالج الخطأ أدناه
      log("--  TV channel closed (" + code + (reason ? " " + reason : "") + ")");
      bail(code, reason && reason.toString());
    });

    // تعذّر الوصول غالباً يعني أن الراوتر أعطى التلفزيون عنواناً جديداً،
    // فنبحث عنه مرة ونعيد المحاولة بدل أن نُفشل الطلب على المستخدم
    upstream.on("error", async (e) => {
      log("ERR error towards TV: " + e.message);
      if (ready || searched || process.env.TV_URL) return bail(1011, "تعذّر الوصول للتلفزيون");
      searched = true;
      const before = tvIp;
      const found = await ensureTv();
      if (found && found !== before && client.readyState === WebSocket.OPEN) {
        log("retrying on " + found);
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

// المنفذ محجوز أحياناً بنسخة قديمة من الخادم لم تُقتل. كان الفشل صامتاً
// فتُعيد حلقة run.cmd المحاولة أبداً بلا بيان — فنقولها صريحة في السجل.
// ws يعيد بثّ أخطاء الخادم على نفسه، فيلزم الإنصات للاثنين وإلا بقي
// الخطأ بلا معالج فينهار البرنامج برسالة مبهمة
function onFatal(e) {
  if (e.code === "EADDRINUSE") {
    console.log("ERR port " + PORT + " is already in use - another copy of the server is still running.");
    console.log("    fix: Stop-ScheduledTask \"KMC TV Remote\"; Get-Process node | Stop-Process -Force");
  } else {
    console.log("ERR server error: " + e.message);
  }
  process.exit(1);
}
server.on("error", onFatal);
wss.on("error", onFatal);

server.listen(PORT, "0.0.0.0", () => {
  const addrs = localAddresses();
  console.log("──────────────────────────────────────────");
  console.log("  KMC TV Remote - server running");
  console.log("");
  console.log("  open on your phone:");
  for (const a of addrs) console.log(`     http://${a}:${PORT}`);
  if (!addrs.length) console.log("     (no address found - check the Wi-Fi connection)");
  console.log("");
  console.log("  TV: " + (tvIp ? tvIp + ":" + TV_PORT : "searching..."));
  console.log("──────────────────────────────────────────");

  // نتحقّق من العنوان المحفوظ فور الإقلاع، فيكون جاهزاً قبل أول ضغطة زر
  if (!process.env.TV_URL) ensureTv();
});

module.exports = server;
// سطحٌ للاختبار وحده: يسمح بفحص قراءة النسخة ومقارنتها بلا شبكة
module.exports.__test = { latestSha, installedVersion, startUpdate };

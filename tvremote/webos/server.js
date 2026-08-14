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
const { wake, macOf, probeStandby } = require("./wol");
const adb = require("./adb");
const { TuyaCloud, REGIONS } = require("./tuya-cloud");
const { TuyaDevice } = require("./tuya");
const survey = require("./survey");
const { HuaweiRouter, probe: routerProbe, find: routerFind } = require("./router");
const { harden } = require("./secure");
const islam = require("./islam");
const selfupdate = require("./selfupdate");
const tls = require("./tls");
const tuyaScan = require("./tuya-scan");
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
// بطاقتاه معاً — السلكية واللاسلكية — فلا نعرف أيّهما يتصل بها
let tvMacs = Array.isArray(CFG.tvMacs) && CFG.tvMacs.length
  ? CFG.tvMacs.slice() : (tvMac ? [tvMac] : []);
let seeking = null;                 // وعد المسح الجاري، كيلا نمسح مرّتين معاً

// البروجيكتر: جهاز أندرويد يُتحكَّم به عبر ADB لا عبر SSAP
let projIp = process.env.PROJ_IP || CFG.projIp || "";
const PROJ_PORT = Number(process.env.PROJ_PORT || CFG.projPort || 5555);

function saveConfig() {
  try {
    fs.writeFileSync(path.join(__dirname, "config.json"),
      JSON.stringify(Object.assign({}, CFG, { tvIp, tvMac, tvMacs, projIp, autoUpdate, tvPort: TV_PORT, port: PORT }), null, 2));
  } catch { /* القرص للقراءة فقط أحياناً — لا يمنع العمل */ }
}

// عنوان البطاقة لا يظهر في جدول ARP إلا لمن خاطبناه حديثاً، فنلتقطه
// والتلفزيون شغّال ونحفظه — لأننا سنحتاجه بالضبط حين يكون مطفأً
async function rememberMac() {
  if (!tvIp) return;
  const mac = await macOf(tvIp);
  if (mac && !tvMacs.includes(mac)) {
    tvMacs.push(mac);
    tvMac = tvMacs[0];
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
  if (!tvMacs.length) {
    await ensureTv();               // قد يكون شغّالاً فنلتقط بطاقته الآن
    if (!tvMacs.length) {
      return { ok: false, why: "ما أعرف عنوان بطاقة التلفزيون بعد — شغّله مرة واحدة يدوياً وأنا أحفظه" };
    }
  }
  // جولةٌ واحدة قد تُخطئ الموعد: بطاقةُ التلفزيون النائم تصغي متقطّعةً،
  // وإن كان قد أُطفئ لتوّه فهو ما يزال يهبط إلى السبات فيُهمل ما يصله.
  // رأينا في السجلّ ليلةً واحدة: جولتان نجحتا وثالثةٌ لم تنجح. فتُعاد
  // الجولة مرّةً قبل أن نُعلن الفشل — وهي أقلُّ كلفةً من إعلانٍ كاذب.
  let info = null, total = 0;
  for (let round = 0; round < 2; round++) {
    try {
      info = await wake(tvMacs, { ip: tvIp, bursts: round ? 8 : 12 });
      total += info.sent;
      log("wake" + (round ? " (again)" : "") + ": " + info.sent + " packets to " +
          info.targets.join(", ") + " for " + info.macs.join(", ") +
          (info.pinned ? " (neighbour pinned)" : ""));
    } catch (e) {
      if (round) break;
      return { ok: false, why: "تعذّر إرسال حزمة الإيقاظ: " + e.message };
    }
    // ننتظر: webOS يأخذ نحو عشر ثوانٍ ليفتح منفذه بعد الإقلاع.
    // ونبحث عنه في الشبكة كل حين — فقد يعود بعنوانٍ غير الذي كان،
    // فنحسبه نائماً وهو مستيقظ على عنوانٍ آخر
    const waits = round ? 20 : 30;
    for (let i = 0; i < waits; i++) {
      if (tvIp && await verify(tvIp)) {
        log("OK  TV is awake at " + tvIp);
        return { ok: true, tv: tvIp, mac: tvMac, macs: info.macs, sent: total };
      }
      if (i === 9 || i === 19) {
        const found = await discover(log, tvIp).catch(() => null);
        if (found) {
          if (found !== tvIp) { log("TV came back at " + found); tvIp = found; saveConfig(); }
          return { ok: true, tv: found, mac: tvMac, macs: info.macs, sent: total };
        }
      }
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  return {
    ok: false,
    mac: tvMac,
    macs: info ? info.macs : tvMacs,
    sent: total,
    targets: info ? info.targets : [],
    pinned: info ? info.pinned : false,
    why: "أُرسلت " + total + " حزمة في جولتين، ولـ" +
         (info ? info.macs.length : tvMacs.length) + " بطاقة، والتلفزيون ما استجاب. " +
         "وقد بحثتُ عنه في الشبكة فما وجدته.",
  };
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
  for (const base of survey.subnets()) {
    const ips = [];
    for (let i = 1; i <= 254; i++) ips.push(base + "." + i);
    const hits = await survey.pool(ips, 64, async (ip) =>
      (await portOpenOn(ip, PROJ_PORT, 700)) ? ip : null);
    for (const ip of hits) {
      const r = await adb.probe(ip, PROJ_PORT);
      if (r.ok) return ip;
    }
  }
  return null;
}

/* أزرارُ التنقّل تُجمع دفعةً.

   كلُّ `input keyevent` يستدعي آلةَ جافا كاملةً على الجهاز — نصفَ
   ثانيةٍ وأكثر على عتادٍ ضعيف. والأصابع أسرع: خمسُ ضغطاتٍ متتالية
   كانت تصير خمسَ آلاتٍ متتابعة، فيجمد البروجيكتر ثم تنفجر الضغطاتُ
   دفعةً متأخّرة فيتجاوز المؤشّرُ هدفَه. وهذا هو «التعليق» الذي شُكي.

   فالضغطاتُ المتلاحقة تُضمّ في استدعاءٍ واحد (input يقبل مفاتيحَ
   عدّة)، والزرُّ يُجاب فوراً لا بعد التنفيذ، وما فاض عن ثمانٍ
   **يُهمل** — كما يفعل الجهاز نفسه حين يشغَل: ضياعُ ضغطةٍ خيرٌ من
   جهازٍ مخنوق. */
let projPending = [];
let projPumping = false;
function projKey(name) {
  if (projPending.length >= 8) return { ok: true, dropped: true };
  projPending.push("KEYCODE_" + name);
  if (!projPumping) {
    projPumping = true;
    (async () => {
      try {
        while (projPending.length) {
          const batch = projPending.splice(0, projPending.length);
          await projShell("input keyevent " + batch.join(" "));
        }
      } catch (e) {
        projPending = [];
        log("proj: key batch failed — " + e.message);
      } finally { projPumping = false; }
    })();
  }
  return { ok: true, queued: projPending.length };
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



/**
 * فحص جهاز: أي منافذ يفتحها، وأيّها ADB حقيقيّ.
 *
 * أندرويد ١١ فصل «تصحيح USB عبر الشبكة» القديم — منفذ ٥٥٥٥ ثابت — عن
 * «تصحيح لاسلكي» الجديد الذي يفتح منفذاً عشوائياً بين 30000 و49999
 * ويطلب اقتراناً برمز. فلا يكفي أن نسأل عن ٥٥٥٥ ونحكم.
 *
 * فنجرّب المنافذ المعروفة أولاً، فإن خلت مسحنا المدى العشوائي — وهو
 * عشرون ألف منفذ على مضيف واحد، تُقطع في نحو نصف دقيقة بمهلة قصيرة.
 */
const PROBE_PORTS = [
  [5555, "ADB على الشبكة"],
  [5556, "ADB (منفذ بديل)"],
  [5037, "خادم ADB"],
  [6466, "ريموت أندرويد (أوامر)"],
  [6467, "ريموت أندرويد (إقران)"],
  [8009, "Cast"],
  [8080, "واجهة ويب"],
  [7000, "AirPlay"],
];

// المسحُ نفسه تفرّق في ثلاثة ملفات، فجُمع في survey.js ويُستعمل منه
const { portOpenOn, sweep } = survey;

async function probeDevice(ip, wide) {
  const found = [];
  for (const [port, label] of PROBE_PORTS) {
    if (await portOpenOn(ip, port)) found.push({ port, label });
  }

  let wideHits = [];
  if (wide && !found.some((f) => f.port === 5555)) {
    const range = [];
    for (let p = 30000; p < 50000; p++) range.push(p);
    wideHits = await sweep(ip, range, 400, 350);
    for (const port of wideHits) found.push({ port, label: "تصحيح لاسلكي (أندرويد ١١)" });
  }

  // المنفذ المفتوح لا يعني ADB: نصافح لنتأكّد
  for (const f of found) {
    if (f.port === 5555 || f.port === 5556 || wideHits.includes(f.port)) {
      const r = await adb.probe(ip, f.port);
      f.adb = r.ok;
      if (r.ok) f.banner = r.banner;
      else f.why = r.why;
    }
  }
  return { ip, found, wide: !!wide };
}


// ---------- المكيفات عبر Tuya ----------
// الأسرار في ملف منفصل عن الإعدادات: هي وحدها ما لا يجوز أن يُشارَك،
// وفصلُها يجعل ذلك بيّناً لا يحتاج تذكيراً.
const SECRETS = path.join(__dirname, "secrets.json");

function loadSecrets() {
  try {
    const raw = fs.readFileSync(SECRETS, "utf8");
    return JSON.parse(raw.replace(/^\uFEFF/, ""));
  } catch { return { accessId: "", accessSecret: "", region: "eu", devices: [], rooms: {} }; }
}
function saveSecrets(v) {
  try {
    // الوراثة تقع عند الإنشاء وحده: الكتابة فوق ملفٍ قائم تُبقي صلاحياته
    const fresh = !fs.existsSync(SECRETS);
    fs.writeFileSync(SECRETS, JSON.stringify(v, null, 2), { mode: 0o600 });
    if (fresh) harden(SECRETS, log);
  } catch (e) { log("could not save secrets: " + e.message); }
}

let acSecrets = loadSecrets();
const acDevices = new Map();          // معرّف الجهاز ← جلسة محلية

function acDevice(room) {
  const id = acSecrets.rooms && acSecrets.rooms[room];
  if (!id) return null;
  const meta = (acSecrets.devices || []).find((d) => d.id === id);
  if (!meta) return null;
  if (!acDevices.has(id)) {
    acDevices.set(id, new TuyaDevice({
      id: meta.id, key: meta.localKey, ip: meta.ip, version: meta.version,
    }));
  }
  return { dev: acDevices.get(id), meta };
}

/** ما يُعرض للصفحة: بلا مفاتيح — لا تُرسل إلى المتصفح بحال */
function publicDevices() {
  return (acSecrets.devices || []).map((d) => ({
    id: d.id, name: d.name, category: d.category,
    online: d.online, model: d.model,
    infrared: d.category === "wnykq" || d.category === "infrared_ac",
  }));
}

// حَجرٌ على ما يُرسَل إلى المكيف: القيم تُقيَّد بمدى ومجموعة، فلا
// يُمرَّر إلى الجهاز ما جاء من الشبكة كما جاء
const AC_MODES = ["cold", "hot", "wind", "wet", "auto"];
const AC_FANS  = ["low", "mid", "high", "auto", "1", "2", "3", "4"];

function sanitizeAc(body) {
  const out = {};
  if (typeof body.on === "boolean") out.on = body.on;
  if (body.setTemp !== undefined) {
    const t = Number(body.setTemp);
    if (!Number.isFinite(t) || t < 16 || t > 30) throw new Error("الحرارة بين ١٦ و٣٠");
    out.setTemp = Math.round(t);
  }
  if (body.mode !== undefined) {
    if (!AC_MODES.includes(String(body.mode))) throw new Error("وضع غير معروف");
    out.mode = String(body.mode);
  }
  if (body.fan !== undefined) {
    if (!AC_FANS.includes(String(body.fan))) throw new Error("سرعة غير معروفة");
    out.fan = String(body.fan);
  }
  if (typeof body.swing === "boolean") out.swing = body.swing;
  if (!Object.keys(out).length) throw new Error("لا تغيير مطلوب");
  return out;
}

/** يجلب الأجهزة من السحابة ويحفظ مفاتيحها — يُستدعى مرة عند الربط */
async function acLink({ accessId, accessSecret, region }) {
  const cloud = new TuyaCloud({ accessId, accessSecret, region });
  const list = await cloud.devices();
  if (!list.length) {
    throw new Error("ما وجدت أجهزة — تأكّد أنك ربطت حساب Smart Life بالمشروع");
  }
  acSecrets = Object.assign({}, acSecrets, {
    accessId, accessSecret, region: region || "eu",
    devices: list,
    linkedAt: new Date().toISOString(),
  });
  saveSecrets(acSecrets);
  acDevices.clear();
  log("tuya linked: " + list.length + " device(s)");
  return publicDevices();
}

// ---------- التحديث الذاتي ----------
// كل ميزة كانت تُسلَّم بأمرٍ يُلصق في PowerShell على اللابتوب، وهي أكثر
// خطوة تعثّر فيها صاحب البيت. فصار الخادم يحدّث نفسه بطلبٍ من التطبيق.
// ---------- الراوتر ----------
// كلمته تُحفظ مع أسرار Tuya في الملف نفسه بصلاحية 0600، ولا تُرسل
// إلى المتصفح بحال.
let routerSession = null;

function routerCfg() { return acSecrets.router || null; }

function routerOf() {
  const c = routerCfg();
  if (!c || !c.host || !c.password) return null;
  if (!routerSession || routerSession.host !== c.host) {
    routerSession = new HuaweiRouter({ host: c.host, username: c.username, password: c.password });
  }
  return routerSession;
}

/** بطاقات هذا اللابتوب — لا يُحجب الجهاز الذي يشغّل الريموت */
function ownMacs() {
  const nets = require("os").networkInterfaces();
  const out = new Set();
  for (const list of Object.values(nets)) {
    for (const i of list || []) {
      if (i.mac && i.mac !== "00:00:00:00:00:00") out.add(i.mac.toLowerCase());
    }
  }
  return out;
}

/** عنوان الطالب — نُسقط بادئة IPv6 المُغلَّفة كي يُقارَن بجدول الراوتر */
function clientIp(req) {
  const a = (req.socket && req.socket.remoteAddress) || "";
  return a.replace(/^::ffff:/, "");
}

/**
 * الحَرَس: من يملك حجب جهازٍ يملك حجب نفسه. والواجهة تُتجاوَز،
 * فيقع المنع هنا — لا هناك. (القاعدة الرابعة عشرة)
 */
async function guardBlock(req, macs) {
  const mine = ownMacs();
  const hosts = await routerOf().hosts();
  const ip = clientIp(req);
  const asking = hosts.find((h) => h.ip === ip);
  for (const raw of macs) {
    const m = String(raw).toLowerCase();
    if (mine.has(m)) throw new Error("هذه بطاقة اللابتوب نفسه — حجبُها يقطع الريموت");
    if (asking && asking.mac === m) throw new Error("هذا هو جهازك الذي تطلب منه الآن");
  }
}

/** إطفاء الواي‑فاي يقتل الخادم إن كان عليه — ولا زرّ يعيده بعدها */
async function guardWifiOff(index) {
  const mine = ownMacs();
  const hosts = await routerOf().hosts();
  const nets = (await routerOf().wlan());
  const target = nets.find((s) => s.index === String(index));
  const here = hosts.find((h) => mine.has(h.mac));
  if (!here) return;                       // اللابتوب ليس على الواي‑فاي — فلا خطر
  if (!target) return;
  if (!target.guest) {
    throw new Error("اللابتوب متصل بهذه الشبكة — إطفاؤها يقطع الخادم ولا سبيل لإعادته إلا يدوياً");
  }
}

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
      path: "/repos/" + REPO + "/commits/" + encodeURIComponent(CFG.branch || "main"),
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
// التنصيب الكامل دون دقيقتين، فستٌّ مهلةٌ سخيّة لا تسبق منصِّباً بطيئاً
const LATCH_MS = Number(process.env.UPDATE_LATCH_MS) || 6 * 60 * 1000;
let updateLatch = null;
let waking = null;          // حال آخر إيقاظ، يُسأل عنه بدل أن يُنتظر
let islamFetching = false;
let audioProbing = false;
let saving = null;          // حفظُ سورةٍ جارٍ — تقدّمه يُسأل عنه
let surveyCache = { at: 0, data: null };
let surveyRunning = false;
let autoUpdate = CFG.autoUpdate !== false;      // مفعّل ما لم يُطفأ صراحةً
let lastCheck = { at: null, found: false };
// نتيجةُ آخر تحديث — تُقرأ من الصفحة، فيُعرف سببُ التعثّر بلا سجلّ
let lastUpdateResult = null;
let httpsBusy = false;
let tuyaSniffing = false;

function startUpdate() {
  if (updating) return { ok: false, code: 409, why: "التحديث جارٍ بالفعل" };
  updating = true;

  const logFile = selfupdate.LOG_FILE;

  // العلَم يُفَكّ بمهلة: لو تعثّر التحديث في مكانٍ لم نتوقّعه بقي
  // مرفوعاً أبداً فأقفل التحديث اليدويّ والتلقائيّ معاً
  clearTimeout(updateLatch);
  updateLatch = setTimeout(() => {
    if (!updating) return;
    updating = false;
    log("update did not finish in " + (LATCH_MS / 60000) + " min - unlatched; see " + logFile);
  }, LATCH_MS);
  if (updateLatch.unref) updateLatch.unref();

  // node يحدّث نفسه: يجلب ويقيس ثم يستبدل دفعةً ثم يخرج، و run.cmd
  // يعيده. ولا بوويرشيل في الطريق — وكان هو موضع الانكسار الصامت
  selfupdate.selfUpdate({ repo: REPO, branch: CFG.branch || "main", log })
    .then((r) => {
      updating = false;
      clearTimeout(updateLatch);
      if (!r.ok) {
        log("update failed: " + r.why);
        lastUpdateResult = { ok: false, why: r.why, at: Date.now(),
                             needsInstaller: !!r.needsInstaller };
        return;
      }
      lastUpdateResult = { ok: true, sha: r.sha, at: Date.now() };
      log("update done (" + r.sha.slice(0, 7) + ") - restarting in 2s");
      // مهلةٌ قصيرة ليصل الجواب إلى الصفحة قبل أن ينقطع الخادم
      setTimeout(() => process.exit(0), 2000);
    })
    .catch((e) => {
      updating = false;
      clearTimeout(updateLatch);
      log("update crashed: " + e.message);
      lastUpdateResult = { ok: false, why: e.message, at: Date.now() };
    });

  log("update started -> " + logFile);
  return { ok: true, log: logFile };
}


/**
 * التحديث الذاتي الدوريّ.
 *
 * صاحب البيت كان ينسخ أمراً من محادثة إلى واتساب إلى الويب إلى اللابتوب
 * في كل دفعة. فصار الخادم يتفقّد المستودع ويحدّث نفسه.
 *
 * ويؤجَّل ما دام أحدٌ موصولاً، فالتحديث يقطع الريموت نحو دقيقة ولا
 * يُقطع على أحدٍ وهو يستعمله. لكن التأجيل لا يكون أبداً: التطبيق يفتح
 * مقبساً ما دامت صفحة التلفزيون مفتوحة والتلفزيون شغّال، فلو تُرك
 * الشرط مطلقاً لَما تحدّث الخادم قطّ. فبعد ثماني تأجيلات — أربع ساعات
 * — يمضي على أي حال؛ والتطبيق يعيد الوصل خلال ثانيتين.
 *
 * والمنصّب يحتفظ بنسخة ويرجع إليها إن لم يقلع الجديد، فلا يبقى البيت
 * بلا ريموت بسبب دفعة معطوبة.
 */
const MAX_DEFERRALS = 8;
let deferrals = 0;

async function autoCheck() {
  if (!autoUpdate || updating) return;
  const latest = await latestSha();
  const inst = installedVersion();
  lastCheck = { at: new Date().toISOString(), found: !!(latest && inst.sha && latest !== inst.sha) };
  if (!lastCheck.found) { deferrals = 0; return; }

  const busy = wss.clients.size;
  if (busy > 0 && ++deferrals <= MAX_DEFERRALS) {
    log("update available but " + busy + " client(s) connected - deferred (" +
        deferrals + "/" + MAX_DEFERRALS + ")");
    return;
  }
  log("update available (" + latest.slice(0, 7) + ") - starting" +
      (busy ? " despite " + busy + " client(s) after " + deferrals + " deferrals" : ""));
  deferrals = 0;
  startUpdate();
}

// ---------- تقديم الواجهة ----------
// نحقن راية تخبر الصفحة أنها تعمل خلف خادم، فتوجّه اتصالها إليه
const { mushafShell } = require("./mushaf-shell");

function servePage(res, app) {
  let html;
  try {
    html = fs.readFileSync(PAGE, "utf8");
  } catch {
    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    return res.end("ما لقيت ملف tv.html بجذر المستودع");
  }
  // ختمُ بناءٍ يُحقن مع الصفحة. التحديث صار يقع تلقائياً بلا علم أحد،
  // وتطبيقُ الشاشة الرئيسية في آيفون قد يبقى على نسخته القديمة. فتقارن
  // الصفحةُ ختمَها بما عند الخادم وتُعيد تحميل نفسها إن تخلّفت.
  let stamp = "";
  try { stamp = String(fs.statSync(PAGE).mtimeMs | 0); } catch {}
  // وفاهمُ الأمر المنطوق يُحقن مع الصفحة لا يُطلب بعدها.
  //
  // **ولماذا؟** كان `<script src="/voice.js">` وسمَ تحميلٍ حاجزاً:
  // المتصفّح يقف عنده فلا يرسم شيئاً حتى يصله الملف. فإن تعثّر الطلب
  // — والخادم يُعاد تشغيله، والشبكة تتقلّب — بقيت الشاشة سوداء وقد
  // نزلت الصفحة كاملة. **فالصفحة لا يجوز أن تحتاج طلباً ثانياً
  // لتُرسم** (القاعدة الخامسة عشرة). وهو ملفٌّ واحد ما زال، يُقاس في
  // node ويُحقن هنا — لا نسختان تفترقان.
  let voiceSrc = "";
  try { voiceSrc = fs.readFileSync(path.join(__dirname, "voice.js"), "utf8"); } catch {}
  const isMushaf = app === "mushaf";
  const flag = `<script>window.__TV_PROXY__=${JSON.stringify(tvIp || "auto")};` +
               `window.__BUILD__=${JSON.stringify(stamp)};` +
               `window.__APP__=${JSON.stringify(isMushaf ? "mushaf" : "remote")};</script>\n` +
               (isMushaf
                 ? '<link rel="manifest" href="/mushaf/manifest.webmanifest">\n' +
                   '<script>if("serviceWorker" in navigator)' +
                   'addEventListener("load",function(){' +
                   'navigator.serviceWorker.register("/mushaf-sw.js",{scope:"/"})' +
                   '.catch(function(){});});</script>\n'
                 : "") +
               (voiceSrc ? "<script>\n" + voiceSrc + "\n</script>\n" : "");
  if (isMushaf) html = mushafShell(html);
  // بدالةٍ لا بنصّ: `String.replace` تُفسّر `$&` و`` $` `` في نصّ
  // البديل، فيوم يدخل أحدها في voice.js تنسخ الصفحةُ نفسها في نفسها
  // وتخرج مسخاً صامتاً. والدالّة لا تُفسّر شيئاً.
  html = html.replace("<script>", () => flag + "<script>");
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
  const CHANGING = ["/update", "/auto-update", "/power-on", "/find-tv", "/tv-mac",
                    "/ac/link", "/ac/assign", "/ac/hall/set", "/ac/bed/set",
                    "/proj/find", "/proj/key", "/proj/app", "/proj/wake", "/proj/sleep",
                    "/router/link", "/router/find", "/router/block", "/router/wifi",
                    "/router/reboot", "/restart", "/static-ip", "/ssh/enable",
                    "/islam/fetch", "/islam/place",
                    "/islam/audio/probe", "/islam/audio/save", "/islam/audio/stop",
                    "/https/enable"];
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

  // التلفزيون نفسه أوثق من جدول ARP: الجدول قد يعطي بطاقة الراوتر أو
  // بطاقةَ منفذٍ سلكيٍّ غير مستعمل، والتلفزيون يعرف بطاقته يقيناً
  if (url.pathname === "/tv-mac") {
    let body = "";
    req.on("data", (c) => { body += c; if (body.length > 512) req.destroy(); });
    return req.on("end", () => {
      // التلفزيون له بطاقتان، ولا نعرف أيّهما التي يتصل بها الآن.
      // فنحفظهما معاً ونوقظهما معاً — أرخص من أن نخطئ فنصمت
      let list = [];
      try {
        const b = JSON.parse(body || "{}");
        list = Array.isArray(b.macs) ? b.macs : (b.mac ? [b.mac] : []);
      } catch {}
      const good = list.map((m) => String(m || "").toLowerCase())
        .filter((m) => /^([0-9a-f]{2}:){5}[0-9a-f]{2}$/.test(m) && !/^(00:){5}00$/.test(m))
        .filter((m, i, a) => a.indexOf(m) === i);
      if (!good.length) return json(400, { ok: false, why: "عنوان بطاقة غير صالح" });

      const before = tvMacs.join(",");
      for (const m of good) if (!tvMacs.includes(m)) tvMacs.push(m);
      tvMac = tvMacs[0];
      if (tvMacs.join(",") !== before) {
        saveConfig();
        log("TV reported its MAC(s): " + tvMacs.join(", "));
      }
      json(200, { ok: true, mac: tvMac, macs: tvMacs });
    });
  }

  // جردُ ما في البيت. ثقيل (٢٥٤ مضيفاً) فتُحفظ نتيجته عشر دقائق
  if (url.pathname === "/survey") {
    const fresh = url.searchParams.get("fresh") === "1";
    if (!fresh && surveyCache.at && Date.now() - surveyCache.at < 600000) {
      return json(200, Object.assign({ cached: true }, surveyCache.data));
    }
    if (surveyRunning) return json(200, { ok: true, running: true, devices: [] });
    surveyRunning = true;
    return survey.surveyNetwork(log, {
      adbProbe: adb.probe,
      // الراوتر مصدرٌ رابع إن كان مربوطاً — وإلا مضى المسح بلا حاجةٍ إليه
      routerHosts: routerOf() ? () => routerOf().hosts() : null,
    })
      .then((r) => { surveyCache = { at: Date.now(), data: r }; json(200, r); })
      .catch((e) => json(500, { ok: false, why: e.message, devices: [] }))
      .finally(() => { surveyRunning = false; });
  }

  // ---------- الشهادة ----------
  // زرٌّ في الجوّال يستصدرها، فلا يُقام إلى اللابتوب لأجلها
  if (url.pathname === "/https") {
    const c = tls.current();
    return tls.dnsName().then((d) => json(200, {
      ok: true,
      have: !!c, name: (c && c.name) || d.name || null,
      at: (c && c.at) || null,
      port: HTTPS_PORT,
      serving: !!secureServer,
      why: d.name ? "" : d.why,
      url: (c && c.name) ? "https://" + c.name + ":" + HTTPS_PORT : null,
    }));
  }

  if (url.pathname === "/https/enable") {
    if (httpsBusy) return json(200, { ok: true, running: true });
    httpsBusy = true;
    return tls.issue(log)
      .then((r) => {
        if (r.ok && !secureServer) startSecure();
        return json(r.ok ? 200 : 502, Object.assign(r, {
          url: r.ok ? "https://" + r.name + ":" + HTTPS_PORT : null,
        }));
      })
      .catch((e) => json(500, { ok: false, why: e.message }))
      .finally(() => { httpsBusy = false; });
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
      autoUpdate,
      branch: CFG.branch || "main",
      lastCheck: lastCheck.at,
      // سببُ تعثّر آخر محاولة يُعرض في الصفحة نفسها — لا يُبحث عنه
      // في سجلّ على اللابتوب
      last: lastUpdateResult,
    }));
  }

  // سجلّ آخر تحديث — يُقرأ من الجوّال بدل القيام إلى اللابتوب لقراءته.
  // ولا CORS عليه، فلا تقرأه صفحةٌ من أصل آخر ولو طلبته.
  if (url.pathname === "/update-log") {
    const f = path.join(__dirname, "..", "windows", "update.log");
    let text = "";
    try {
      const buf = fs.readFileSync(f);
      text = buf.slice(Math.max(0, buf.length - 12000)).toString("utf8");
    } catch (e) { text = "ما وجدت سجلّاً — لم يجرِ تحديث بعد أو حُذف"; }
    res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" });
    return res.end(text);
  }

  // بابُ الطوارئ: صدفةٌ لا تمرّ بهذا الخادم، فتعمل ولو مات.
  // والمفتاح العامّ يُمرَّر إلى PowerShell، فلا يُقبل إلا بصيغته
  // الصارمة: نوعٌ معروف، وقاعدةُ ٦٤ خالصة، وتعليقٌ بلا محارف خطرة.
  if (url.pathname === "/ssh/enable") {
    return readJson(req, 8192).then((b) => {
      const key = String(b.publicKey || "").trim();
      // سطرٌ واحد لا غير: محرف السطر يفتح بابَ سطرٍ ثانٍ في الملف
      if (/[\r\n]/.test(key)) return json(400, { ok: false, why: "المفتاح سطرٌ واحد" });
      const m = key.match(
        /^(ssh-ed25519|ssh-rsa|ecdsa-sha2-nistp(?:256|384|521)) ([A-Za-z0-9+/]+={0,3})( [^\s"'`$;&|<>]{0,64})?$/);
      if (!m) return json(400, { ok: false, why: "هذا ليس مفتاحاً عامّاً صالحاً — انسخ سطر id_ed25519.pub كاملاً" });
      if (m[2].length < 40) return json(400, { ok: false, why: "المفتاح أقصر مما ينبغي" });
      if (key.length > 1024) return json(400, { ok: false, why: "المفتاح أطول مما ينبغي" });

      if (process.platform !== "win32" && !process.env.PS_CMD) {
        return json(501, { ok: false, why: "هذه لويندوز وحده" });
      }
      const script = path.join(__dirname, "..", "windows", "ssh.ps1");
      const logFile = path.join(__dirname, "..", "windows", "ssh.log");
      const cmd = process.env.PS_CMD || "powershell.exe";
      // المفتاح وسيطٌ مستقلّ لا جزءٌ من سطر أوامر يُفسَّر
      const args = process.env.PS_CMD ? [] : [
        "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", script, "-PublicKey", key,
      ];
      try {
        const child = spawn(cmd, args, {
          detached: true, stdio: "ignore", windowsHide: true, shell: !!process.env.PS_CMD,
        });
        child.unref();
        log("ssh enable requested (" + m[1] + ") -> " + logFile);
        return json(200, { ok: true, why: "يُجهَّز — راجع سجلّ SSH بعد دقيقة" });
      } catch (e) {
        return json(500, { ok: false, why: e.message });
      }
    }).catch((e) => json(400, { ok: false, why: e.message }));
  }

  if (url.pathname === "/ssh/log") {
    const f = path.join(__dirname, "..", "windows", "ssh.log");
    let text = "";
    try {
      const buf = fs.readFileSync(f);
      text = buf.slice(Math.max(0, buf.length - 12000)).toString("utf8");
    } catch { text = "لم يُجهَّز بابُ الطوارئ بعد"; }
    res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" });
    return res.end(text);
  }

  // ---------- القسم الإسلاميّ ----------
  if (url.pathname.startsWith("/islam/")) {
    const rest = url.pathname.slice(7);

    // الموضع: الرياض سلفاً، ويُعدَّل من الصفحة إن انتقل
    const lat = Number(url.searchParams.get("lat")) || Number(CFG.lat) || 24.7136;
    const lon = Number(url.searchParams.get("lon")) || Number(CFG.lon) || 46.6753;
    const tz  = url.searchParams.has("tz") ? Number(url.searchParams.get("tz"))
              : (CFG.tz != null ? Number(CFG.tz) : 3);

    if (rest === "status") {
      const files = {};
      for (const [k, s] of Object.entries(islam.SOURCES)) {
        files[k] = { file: s.file, label: s.label, credit: s.credit, have: islam.have(s.file) };
      }
      return json(200, { ok: true, files, ready: Object.values(files).every((f) => f.have) });
    }

    if (rest === "fetch") {
      if (islamFetching) return json(200, { ok: true, running: true });
      islamFetching = true;
      return islam.ensureData(log)
        .then((r) => json(200, Object.assign({ ok: r.ready }, r)))
        .catch((e) => json(500, { ok: false, why: e.message }))
        .finally(() => { islamFetching = false; });
    }

    // النصوص: تُقدَّم من القرص، ولا تُقدَّم إلا بعد أن اجتازت القياس
    // — فوجودُ الملف يعني أنه تُحقِّق منه قبل أن يُكتب
    if (rest.startsWith("data/")) {
      const want = rest.slice(5);
      const src = Object.values(islam.SOURCES).find((s) => s.file === want);
      if (!src) return json(404, { ok: false, why: "غير معروف" });
      const p = path.join(islam.DATA, src.file);
      if (!fs.existsSync(p)) {
        return json(404, { ok: false, why: "لم يُنزَّل بعد", need: true });
      }
      const type = src.binary ? "font/woff2" : "application/json; charset=utf-8";
      res.writeHead(200, { "Content-Type": type, "Cache-Control": "public, max-age=604800" });
      return fs.createReadStream(p).pipe(res);
    }

    // ---------- التلاوة ----------
    // القرّاء ومصادرهم: ما قِيس منها في هذا البيت، لا ما ظننتُه أنا
    if (rest === "audio/reciters") {
      const picked = CFG.reciters || {};
      const list = islam.RECITERS.map((r) => ({
        key: r.key, name: r.name, note: r.note, teacher: !!r.teacher,
        ready: !!picked[r.key], saved: 0,
      }));
      return json(200, { ok: true, reciters: list, probed: !!CFG.recitersProbedAt,
                         at: CFG.recitersProbedAt || null });
    }

    if (rest === "audio/probe") {
      if (audioProbing) return json(200, { ok: true, running: true });
      audioProbing = true;
      const only = url.searchParams.get("r") || null;
      return islam.probeReciters(log, only)
        .then((r) => {
          const picked = Object.assign({}, CFG.reciters || {});
          for (const [k, v] of Object.entries(r)) {
            if (v.url) picked[k] = v.url; else delete picked[k];
          }
          CFG.reciters = picked;
          CFG.recitersProbedAt = new Date().toISOString();
          saveConfig();
          return json(200, { ok: true, result: r, picked });
        })
        .catch((e) => json(500, { ok: false, why: e.message }))
        .finally(() => { audioProbing = false; });
    }

    // آيةٌ واحدة: من القرص إن كانت محفوظة، وإلا تُجلب وتُحفظ ثم تُقدَّم.
    // فالاستماع نفسه يبني المكتبة شيئاً فشيئاً
    if (rest === "audio/ayah") {
      const r = String(url.searchParams.get("r") || "");
      const s = Number(url.searchParams.get("s")), a = Number(url.searchParams.get("a"));
      const tpl = (CFG.reciters || {})[r];
      if (!tpl) return json(404, { ok: false, why: "هذا القارئ لم يُقَس بعد", need: "probe" });
      let file;
      try { file = islam.ayahFile(r, s, a); } catch (e) { return json(400, { ok: false, why: e.message }); }
      const send = () => {
        const st = fs.statSync(file);
        res.writeHead(200, {
          "Content-Type": "audio/mpeg", "Content-Length": st.size,
          "Cache-Control": "public, max-age=31536000",
        });
        fs.createReadStream(file).pipe(res);
      };
      if (islam.haveAyah(r, s, a)) return send();
      return islam.fetchAyah(r, tpl, s, a).then(send)
        .catch((e) => json(502, { ok: false, why: e.message }));
    }

    // حفظُ سورةٍ كاملة للاستماع بلا إنترنت
    if (rest === "audio/save") {
      const r = String(url.searchParams.get("r") || "");
      const s = Number(url.searchParams.get("s"));
      const tpl = (CFG.reciters || {})[r];
      if (!tpl) return json(404, { ok: false, why: "هذا القارئ لم يُقَس بعد", need: "probe" });
      if (!(s >= 1 && s <= 114)) return json(400, { ok: false, why: "رقم سورة خارج المدى" });
      if (saving && !saving.done) return json(200, { ok: true, running: true, at: saving });
      const total = islam.SURA_AYAHS[s - 1];
      saving = { r, s, done: false, n: 0, total, failed: 0, why: "" };
      const mine = saving;
      (async () => {
        for (let a = 1; a <= total; a++) {
          try { await islam.fetchAyah(r, tpl, s, a); } catch { mine.failed++; }
          mine.n = a;
          if (mine.stop) break;
        }
        mine.done = true;
        log("audio: saved sura " + s + " for " + r + " — " +
            (total - mine.failed) + "/" + total);
      })();
      return json(200, { ok: true, started: true, total });
    }

    // سورةٌ في ملفٍّ واحد يُنزَّل إلى الجوّال.
    //
    // **ولماذا ملفٌّ لا تخزينٌ في المتصفّح؟** تخزينُ سفاري محدودُ
    // المساحة، ويُمحى حين تضيق الذاكرة أو يطول تركُ التطبيق — فيفتح
    // صاحبُه المصحف يوماً فيجده فارغاً بلا سبب. والملفُّ ملكُه: لا
    // يمسحه أحد، ويعمل في السيّارة ومن أيّ مشغّل.
    //
    // ولا يُجمع إلا ما هو محفوظٌ كاملاً — فلا يُقدَّم نصفُ سورة.
    if (rest === "audio/sura") {
      const r = String(url.searchParams.get("r") || "");
      const s = Number(url.searchParams.get("s"));
      if (!(CFG.reciters || {})[r]) return json(404, { ok: false, why: "هذا القارئ لم يُقَس بعد" });
      if (!(s >= 1 && s <= 114)) return json(400, { ok: false, why: "رقم سورة خارج المدى" });
      const st = islam.suraSaved(r, s);
      if (st.have < st.total) {
        return json(409, { ok: false, why: "احفظ السورة أوّلاً", have: st.have, total: st.total });
      }
      const files = [];
      let bytes = 0;
      for (let a = 1; a <= st.total; a++) {
        const f = islam.ayahFile(r, s, a);
        files.push(f);
        bytes += fs.statSync(f).size;
      }
      // الاسم بالعربية يحتاج الصيغة المرمَّزة، وإلا خرج مسوخاً في الجوّال
      let name = "sura-" + String(s).padStart(3, "0");
      try {
        const meta = islam.readJson("suras.json")[s - 1];
        if (meta && meta.name) {
          name = String(meta.name).replace(/[ـً-ْٰ]/g, "").replace(/[\\/:*?"<>|]/g, "").trim();
        }
      } catch {}
      const utf8 = encodeURIComponent(name + ".mp3");
      res.writeHead(200, {
        "Content-Type": "audio/mpeg",
        "Content-Length": bytes,
        "Content-Disposition": "attachment; filename=\"" + "sura-" + s + ".mp3\"; " +
                               "filename*=UTF-8''" + utf8,
        "Cache-Control": "no-store",
      });
      // واحداً بعد واحد: لا نجمع مئات الميغابايت في الذاكرة
      let i = 0;
      const next = () => {
        if (i >= files.length || res.writableEnded) return res.end();
        const rs = fs.createReadStream(files[i++]);
        rs.on("error", () => res.end());
        rs.on("end", next);
        rs.pipe(res, { end: false });
      };
      log("audio: sending sura " + s + " (" + st.total + " ayahs, " +
          Math.round(bytes / 1048576) + " MB) for " + r);
      return next();
    }

    if (rest === "audio/stop") {
      if (saving && !saving.done) { saving.stop = true; log("audio: save cancelled"); }
      return json(200, { ok: true });
    }

    if (rest === "audio/status") {
      const r = String(url.searchParams.get("r") || "");
      const s = Number(url.searchParams.get("s"));
      const out = { ok: true, saving: saving && !saving.done ? saving : null };
      if ((CFG.reciters || {})[r] && s >= 1 && s <= 114) out.sura = islam.suraSaved(r, s);
      return json(200, out);
    }

    if (rest === "times") {
      const d = url.searchParams.get("date")
        ? new Date(url.searchParams.get("date") + "T12:00:00Z") : new Date();
      const opts = { method: url.searchParams.get("method") || "ummAlQura",
                     hanafi: url.searchParams.get("hanafi") === "1" };
      const t = islam.prayerTimes(d, lat, lon, tz, opts);
      const out = {};
      for (const k of ["fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"]) out[k] = islam.hhmm(t[k]);
      return json(200, { ok: true, times: out, raw: t, method: t.method, lat, lon, tz });
    }

    if (rest === "qibla") {
      return json(200, { ok: true, bearing: Number(islam.qibla(lat, lon).toFixed(2)),
                         km: islam.distanceToKaaba(lat, lon), lat, lon });
    }

    if (rest === "place") {
      return readJson(req, 512).then((b) => {
        const la = Number(b.lat), lo = Number(b.lon), z = Number(b.tz);
        if (!(la >= -90 && la <= 90) || !(lo >= -180 && lo <= 180) || !(z >= -12 && z <= 14)) {
          return json(400, { ok: false, why: "إحداثيات خارج المدى" });
        }
        CFG.lat = la; CFG.lon = lo; CFG.tz = z;
        saveConfig();
        return json(200, { ok: true, lat: la, lon: lo, tz: z });
      }).catch((e) => json(400, { ok: false, why: e.message }));
    }

    return json(404, { ok: false, why: "نقطة غير معروفة" });
  }

  // هل يمكن تشغيله وهو مطفأ؟ قياسٌ لا تخمين — القاعدة الأولى.
  // قارئة، فتبقى GET.
  if (url.pathname === "/wake-check") {
    const what = url.searchParams.get("what") === "proj" ? "proj" : "tv";
    const ip = what === "proj" ? projIp : tvIp;
    const port = what === "proj" ? PROJ_PORT : TV_PORT;
    const name = what === "proj" ? "البروجيكتر" : "التلفزيون";
    if (!ip) {
      return json(200, { ok: true, verdict: "unknown", what,
                         why: "لا أعرف عنوانه بعد — شغّله مرّة وأنا أحفظه" });
    }
    // شغّالٌ الآن؟ فلا معنى للفحص: المقصود قياسه وهو مطفأ
    return portOpenOn(ip, port, 1500).then(async (up) => {
      if (up) {
        return json(200, { ok: true, verdict: "awake", what, ip,
                           why: name + " يعمل الآن. أطفئه، وانتظر دقيقتين، ثم أعد الفحص." });
      }
      const r = await probeStandby(ip);
      const verdict = r.alive ? "reachable" : "dead";
      log("wake-check " + what + " (" + ip + "): " + verdict + " — " + r.why);
      return json(200, { ok: true, verdict, what, ip, mac: r.mac || null,
                         pinned: !!r.static, why: r.why });
    }).catch((e) => json(500, { ok: false, why: e.message }));
  }

  // سجلّ الخادم نفسه — كسجلّ التحديث، يُقرأ من الجوّال لا من اللابتوب
  if (url.pathname === "/server-log") {
    const f = path.join(__dirname, "..", "windows", "server.log");
    let text = "";
    try {
      const buf = fs.readFileSync(f);
      text = buf.slice(Math.max(0, buf.length - 12000)).toString("utf8");
    } catch { text = "ما وجدت سجلّاً — قد يكون الخادم يعمل من نافذةٍ لا من المهمّة"; }
    res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" });
    return res.end(text);
  }

  // تثبيت عنوان اللابتوب. والسكربت يختبر البوّابة بعد التغيير ويرجع
  // إلى التوزيع التلقائي إن انقطع — فالقاعدة الرابعة محقّقةٌ فيه،
  // ولا يُبنى لها حَرَسٌ ثانٍ هنا
  if (url.pathname === "/static-ip") {
    if (process.platform !== "win32" && !process.env.PS_CMD) {
      return json(501, { ok: false, why: "هذه لويندوز وحده" });
    }
    const script = path.join(__dirname, "..", "windows", "set-static-ip.ps1");
    const logFile = path.join(__dirname, "..", "windows", "static-ip.log");
    const cmd = process.env.PS_CMD || "powershell.exe";
    const args = process.env.PS_CMD ? [] : [
      "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", script,
    ];
    try {
      const child = spawn(cmd, args, {
        detached: true, stdio: "ignore", windowsHide: true, shell: !!process.env.PS_CMD,
      });
      child.unref();
      log("static-ip requested -> " + logFile);
      return json(200, { ok: true, why: "بدأ التثبيت — يتحقّق من نفسه ويرجع إن انقطع" });
    } catch (e) {
      return json(500, { ok: false, why: e.message });
    }
  }

  // إعادة تشغيل الخادم. run.cmd حلقةٌ تُعيده بعد خمس ثوانٍ إن خرج،
  // فالخروج إعادةُ تشغيل. وبها يُفَكّ ما علِق في الذاكرة — كقفل
  // التحديث — من غير أن يُقام إلى اللابتوب، ومن خارج البيت أصلاً.
  if (url.pathname === "/restart") {
    log("restart requested - exiting; run.cmd will bring the server back");
    json(200, { ok: true, back: "خمس ثوانٍ تقريباً" });
    // نُمهل الردَّ أن يخرج قبل أن نموت
    return setTimeout(() => process.exit(0), 400);
  }
  if (url.pathname === "/auto-update") {
    let body = "";
    req.on("data", (c) => { body += c; if (body.length > 256) req.destroy(); });
    return req.on("end", () => {
      try {
        const want = JSON.parse(body || "{}").on;
        if (typeof want === "boolean" && want !== autoUpdate) {
          autoUpdate = want; saveConfig(); log("auto-update " + (want ? "on" : "off"));
        }
      } catch {}
      json(200, { ok: true, autoUpdate });
    });
  }
  if (url.pathname === "/update") {
    const r = startUpdate();
    return json(r.ok ? 200 : (r.code || 500), r);
  }

  // فاهمُ الأمر المنطوق — ملفٌّ واحد يعمل هنا وفي المتصفّح، فما
  // قِيس في node هو نفسه ما يفهم في الجوّال
  // كشفُ أجهزة Tuya: نُنصت لما تعلنه الأجهزة عن نفسها، فلا يُدَّعى
  // على جهازٍ أنه Tuya حتى يقولها هو
  if (url.pathname === "/tuya/sniff") {
    if (tuyaSniffing) return json(200, { ok: true, running: true });
    tuyaSniffing = true;
    const secs = Math.min(30, Math.max(5, Number(url.searchParams.get("s")) || 15));
    return tuyaScan.sniff(secs * 1000, log)
      .then((r) => {
        // ما نعرفه منها سلفاً يُعلَّم، فيُعرف الجديد من القديم
        const known = new Set(Object.values(acSecrets.rooms || {}).filter(Boolean));
        const named = new Map((acSecrets.devices || []).map((d) => [d.id, d.name || ""]));
        r.devices = r.devices.map((d) => Object.assign({}, d, {
          known: known.has(d.id),
          name: named.get(d.id) || "",
        }));
        return json(200, r);
      })
      .catch((e) => json(500, { ok: false, why: e.message }))
      .finally(() => { tuyaSniffing = false; });
  }

  // يبقى للتوافق — والصفحة لم تعد تحتاجه. ويُقرأ دفعةً لا بمجرى:
  // المجرى إن أخطأ بعد إرسال الترويسة بقي الطلب معلّقاً إلى الأبد،
  // وخطؤه بلا معالج يُسقط الخادم كلَّه. وأيُّهما وقع رأى صاحب البيت
  // شاشةً سوداء لا يعرف سببها.
  if (url.pathname === "/voice.js") {
    let src;
    try { src = fs.readFileSync(path.join(__dirname, "voice.js")); }
    catch (e) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      return res.end("// voice.js غير موجود: " + e.message);
    }
    res.writeHead(200, { "Content-Type": "application/javascript; charset=utf-8",
                         "Content-Length": src.length, "Cache-Control": "no-store" });
    return res.end(src);
  }

  if (url.pathname === "/health") {
    let stamp = "";
    try { stamp = String(fs.statSync(PAGE).mtimeMs | 0); } catch {}
    return json(200, { ok: true, tv: tvIp || null, mac: tvMac || null, macs: tvMacs, seeking: !!seeking,
                       build: stamp, away: tailnetAddress() });
  }
  // زر يدوي لإعادة البحث حين يُنقل التلفزيون أو يتبدّل عنوانه
  if (url.pathname === "/find-tv") {
    return ensureTv().then((ip) => json(200, { ok: !!ip, tv: ip || null, mac: tvMac || null }));
  }
  // إيقاظه وهو مطفأ — ما لا يقدر عليه المتصفح وحده
  // الإيقاظ يستغرق نحو ثلاث دقائق: ثلاثون ثانية دفعاتٍ، ثم انتظارُ
  // عودة التلفزيون. وسفاري يتخلّى عن الطلب بعد دقيقة — فكان الزرّ
  // يُعلن الفشل دائماً ولو أفاق التلفزيون بعده.
  // فيُردّ فوراً، ويُتابَع الأثر بسؤالٍ متكرّر (القاعدة الخامسة:
  // النجاح يُقاس بالأثر — لكن لا يُقاس والطالب معلَّق).
  if (url.pathname === "/power-on") {
    if (waking && !waking.done) {
      return json(200, { ok: true, started: true, already: true, since: waking.at });
    }
    waking = { at: Date.now(), done: false, ok: false, why: "" };
    const mine = waking;
    powerOn()
      .then((r) => Object.assign(mine, r, { done: true }))
      .catch((e) => Object.assign(mine, { done: true, ok: false, why: e.message }));
    return json(200, { ok: true, started: true, since: mine.at });
  }

  if (url.pathname === "/power-on/status") {
    if (!waking) return json(200, { ok: true, idle: true });
    return json(200, {
      ok: true, done: waking.done, woke: !!waking.ok,
      why: waking.why || "", tv: waking.tv || null,
      sent: waking.sent || 0, pinned: !!waking.pinned,
      seconds: Math.round((Date.now() - waking.at) / 1000),
    });
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
    if (what === "scan") {
      const ip = url.searchParams.get("ip") || projIp || CFG.projIp || "";
      if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) return json(400, { ok: false, why: "عنوان غير صالح" });
      const wide = url.searchParams.get("wide") === "1";
      log("probing " + ip + (wide ? " (wide sweep)" : ""));
      return probeDevice(ip, wide)
        .then((r) => json(200, Object.assign({ ok: true }, r)))
        .catch(fail);
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
      // أوّلَ مرّةٍ فقط يُنتظر العثورُ عليه — ليصل خبرُ «ما وجدته» لصاحبه
      if (!projIp) {
        return projShell("input keyevent KEYCODE_" + name)
          .then(() => json(200, { ok: true })).catch(fail);
      }
      return json(200, projKey(name));
    }
    if (what === "app") {
      const pkg = url.searchParams.get("pkg") || "";
      if (!PKGNAME.test(pkg)) return json(400, { ok: false, why: "اسم حزمة غير صالح" });
      // `am start` لا `monkey`: الأخير مولّدُ ضغطاتٍ عشوائية لا مُشغّل
      // تطبيقات — وإن لم يجد ما يفتحه ضغط أزراراً من عنده، فيقفز
      // الجهاز إلى شاشته الرئيسية. وهو تفسيرُ ما كان يقع.
      return projShell("am start -a android.intent.action.MAIN " +
                       "-c android.intent.category.LAUNCHER -p " + pkg)
        .then((out) => {
          // `am` يكتب سببَ الفشل ولا يرفع خطأ — فيُقرأ ما كتب
          if (/Error|Exception|does not exist|no activity/i.test(out || "")) {
            return json(502, { ok: false, why: "لم يُفتح: " + String(out).split("\n")[0].slice(0, 120) });
          }
          return json(200, { ok: true, out: out || "" });
        }).catch(fail);
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

  // ---------- المكيفات ----------
  // ---------- الراوتر ----------
  if (url.pathname.startsWith("/router/")) {
    const rest = url.pathname.slice(8);
    const fail = (e) => json(503, { ok: false, why: e.message });
    const readBody = () => new Promise((res) => {
      let b = "";
      req.on("data", (c) => { b += c; if (b.length > 4096) req.destroy(); });
      req.on("end", () => { try { res(JSON.parse(b || "{}")); } catch { res({}); } });
    });
    const r = routerOf();
    const needLink = () => json(400, { ok: false, linked: false, why: "لم يُربط الراوتر بعد" });

    // ربطٌ يُتحقّق منه بدخولٍ فعليّ قبل أن يُحفظ (القاعدة الرابعة)
    if (rest === "link") {
      return readBody().then(async (b) => {
        const pass = String(b.password || "");
        const user = String(b.username || "admin").trim() || "admin";
        if (!pass) return json(400, { ok: false, why: "اكتب كلمة الدخول" });
        let host = String(b.host || "").trim();
        if (!host) {
          const f = await routerFind(survey.subnets());
          if (!f.ok) return json(404, { ok: false, why: f.why });
          host = f.host;
        } else {
          const p = await routerProbe(host);
          if (!p.ok) return json(404, { ok: false, why: p.why });
        }
        const test = new HuaweiRouter({ host, username: user, password: pass });
        try { await test.login(); }
        catch (e) { return json(401, { ok: false, why: e.message }); }
        acSecrets = Object.assign({}, acSecrets, {
          router: { host, username: user, password: pass, linkedAt: new Date().toISOString() },
        });
        saveSecrets(acSecrets);
        routerSession = test;
        log("router linked at " + host);
        // لا تُعاد الكلمة ولا صداها
        return json(200, { ok: true, linked: true, host });
      }).catch(fail);
    }

    if (rest === "find") {
      return routerFind(survey.subnets())
        .then((f) => json(f.ok ? 200 : 404, f)).catch(fail);
    }

    if (!r) return needLink();

    if (rest === "state") {
      return Promise.all([
        r.information().catch(() => ({})), r.status().catch(() => ({})),
        r.signal().catch(() => ({})), r.traffic().catch(() => ({})),
        r.wlan().catch(() => []),
      ]).then(([info, st, sig, tr, wifi]) =>
        json(200, { ok: true, linked: true, host: routerCfg().host,
                    info, status: st, signal: sig, traffic: tr, wifi }))
       .catch(fail);
    }

    if (rest === "hosts") {
      return r.hosts().then(async (hosts) => {
        const mine = ownMacs();
        const ip = clientIp(req);
        // ما لا يجوز حجبه يُوسَم هنا أيضاً، فلا تعرض الواجهة زرّاً لا يعمل
        return json(200, { ok: true, hosts: hosts.map((h) => Object.assign({}, h, {
          self: h.ip === ip,
          server: mine.has(h.mac),
          blockable: !(h.ip === ip || mine.has(h.mac)),
        })) });
      }).catch(fail);
    }

    if (rest === "block") {
      return readBody().then(async (b) => {
        const macs = Array.isArray(b.macs) ? b.macs : [];
        await guardBlock(req, macs);
        await r.setBlocked(macs);
        log("router block list set (" + macs.length + ")");
        return json(200, { ok: true, macs });
      }).catch((e) => json(400, { ok: false, why: e.message }));
    }

    if (rest === "wifi") {
      return readBody().then(async (b) => {
        const index = String(b.index === undefined ? 0 : b.index);
        const on = b.on === true;
        if (!on) await guardWifiOff(index);
        await r.setWifi(index, on);
        return json(200, { ok: true, index, on });
      }).catch((e) => json(400, { ok: false, why: e.message }));
    }

    if (rest === "reboot") {
      return r.reboot().then(() => {
        log("router reboot requested");
        return json(200, { ok: true });
      }).catch(fail);
    }

    return json(404, { ok: false, why: "نقطة غير معروفة" });
  }

  if (url.pathname.startsWith("/ac/")) {
    const rest = url.pathname.slice(4);
    const fail = (e) => json(503, { ok: false, why: e.message });
    const readBody = () => new Promise((res) => {
      let b = "";
      req.on("data", (c) => { b += c; if (b.length > 4096) req.destroy(); });
      req.on("end", () => { try { res(JSON.parse(b || "{}")); } catch { res({}); } });
    });

    if (rest === "devices") {
      return json(200, {
        ok: true,
        linked: !!acSecrets.accessId,
        region: acSecrets.region || "eu",
        regions: Object.keys(REGIONS),
        devices: publicDevices(),
        rooms: acSecrets.rooms || {},
      });
    }
    if (rest === "link") {
      return readBody().then((b) => {
        const id = String(b.accessId || "").trim();
        const sec = String(b.accessSecret || "").trim();
        const reg = String(b.region || "eu").trim();
        if (!/^[a-z0-9]{16,40}$/i.test(id) || !/^[a-z0-9]{16,64}$/i.test(sec)) {
          return json(400, { ok: false, why: "المفتاح أو السرّ غير مكتمل — انسخهما كاملين" });
        }
        if (!REGIONS[reg]) return json(400, { ok: false, why: "منطقة غير معروفة" });
        return acLink({ accessId: id, accessSecret: sec, region: reg })
          .then((devs) => json(200, { ok: true, devices: devs }))
          .catch((e) => json(502, { ok: false, why: e.message }));
      });
    }
    if (rest === "assign") {
      return readBody().then((b) => {
        const room = String(b.room || "");
        const devId = String(b.id || "");
        if (room !== "hall" && room !== "bed") return json(400, { ok: false, why: "غرفة غير معروفة" });
        if (!(acSecrets.devices || []).some((d) => d.id === devId)) {
          return json(400, { ok: false, why: "جهاز غير معروف" });
        }
        acSecrets.rooms = Object.assign({}, acSecrets.rooms, { [room]: devId });
        saveSecrets(acSecrets);
        acDevices.delete(devId);
        log("ac room " + room + " -> " + devId);
        json(200, { ok: true, rooms: acSecrets.rooms });
      });
    }

    const m = rest.match(/^(hall|bed)\/(state|set)$/);
    if (m) {
      const entry = acDevice(m[1]);
      if (!entry) return json(404, { ok: false, why: "لم يُربط مكيف بهذه الغرفة بعد" });
      // الأشعة عمياء: لا تُخبر بحالتها، فلا نعرض حرارةً مكذوبة
      const blind = entry.meta.category === "wnykq" || entry.meta.category === "infrared_ac";

      if (m[2] === "state") {
        return entry.dev.state()
          .then((st) => json(200, Object.assign({ ok: true, blind, name: entry.meta.name }, st)))
          .catch(fail);
      }
      return readBody().then((b) => {
        let changes;
        try { changes = sanitizeAc(b); } catch (e) { return json(400, { ok: false, why: e.message }); }
        return entry.dev.apply(changes)
          .then((st) => json(200, Object.assign({ ok: true, blind }, st)))
          .catch(fail);
      });
    }
    return json(404, { ok: false, why: "غير معروف" });
  }

  // ---------- تطبيق المصحف ----------
  if (url.pathname === "/mushaf-sw.js") {
    let sw = "";
    try { sw = fs.readFileSync(path.join(__dirname, "mushaf-sw.js"), "utf8"); }
    catch { return json(404, { ok: false, why: "ما لقيت عامل الخدمة" }); }
    res.writeHead(200, {
      "Content-Type": "application/javascript; charset=utf-8",
      // بلا هذه الترويسة لا يتجاوز نطاقُ العامل مجلّده، فلا يحفظ
      // بيانات المصحف وهي تحت /islam
      "Service-Worker-Allowed": "/",
      "Cache-Control": "no-store",
    });
    return res.end(sw);
  }
  if (url.pathname === "/mushaf/manifest.webmanifest") {
    res.writeHead(200, { "Content-Type": "application/manifest+json; charset=utf-8" });
    return res.end(JSON.stringify({
      name: "المصحف", short_name: "المصحف",
      start_url: "/mushaf", scope: "/", display: "standalone",
      dir: "rtl", lang: "ar",
      background_color: "#12161b", theme_color: "#12161b",
      icons: [{ src: "/mushaf/icon.png", sizes: "180x180", type: "image/png" }],
    }));
  }
  if (url.pathname === "/mushaf/icon.png") {
    // الأيقونة في الصفحة نفسها، فلا يُحمل في المستودع ملفٌّ ثانٍ لها
    let page = "";
    try { page = fs.readFileSync(PAGE, "utf8"); } catch {}
    const m = /apple-touch-icon"[^>]*base64,([A-Za-z0-9+/=]+)/.exec(page);
    if (!m) return json(404, { ok: false, why: "لا أيقونة" });
    const buf = Buffer.from(m[1], "base64");
    res.writeHead(200, { "Content-Type": "image/png", "Content-Length": buf.length,
                         "Cache-Control": "public, max-age=86400" });
    return res.end(buf);
  }
  if (url.pathname === "/mushaf" || url.pathname === "/mushaf/") {
    return servePage(res, "mushaf");
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

  // فحصٌ سريع قبل فتح القناة. مهلة مصافحة WebSocket ثماني ثوانٍ،
  // والصفحة تستسلم عند خمس — فكان المستخدم يرى «ما فيه رد» الغامضة
  // بدل السبب. وهذا الفحص لا يكلّف شيئاً والتلفزيون شغّال: يردّ في
  // أجزاء من الثانية. ولا يبطئ إلا حين يكون مطفأً، وهو حين نريده.
  if (tvIp && !process.env.TV_URL && !(await portOpenOn(tvIp, TV_PORT, 1500))) {
    log("TV at " + tvIp + " is not answering - likely off");
    return client.close(1011, "التلفزيون مطفأ أو خارج الشبكة");
  }

  const queue = [];
  let ready = false;
  let upstream = null;
  let searched = false;             // نبحث مرة واحدة لكل اتصال، لا مرّتين

  // ---------- النبض ----------
  // قناة الأزرار تجلس ساكنةً تماماً بين ضغطتين، فتقطعها مهلةُ السكون
  // في الطريق — رأيناها تموت بعد خمسٍ وعشرين ثانية برمز 1006.
  // فيطرقها الخادم بـ ping، والمتصفّح يردّ pong في طبقة البروتوكول
  // بلا سطرِ JavaScript. وبه يبقى الطريق دافئاً، ويُكتشف الموتُ في
  // دورةٍ واحدة بدل انتظار TCP.
  const BEAT_MS = Number(process.env.WS_BEAT_MS) || 20000;
  const seen = { client: Date.now(), upstream: 0 };
  const idleOf = (who) => seen[who] ? ((Date.now() - seen[who]) / 1000).toFixed(1) : "?";
  let beat = null;
  let alive = { client: true, upstream: true };

  client.on("pong", () => { alive.client = true; seen.client = Date.now(); });

  function startBeat() {
    stopBeat();
    beat = setInterval(() => {
      for (const [who, sock] of [["client", client], ["upstream", upstream]]) {
        if (!sock || sock.readyState !== WebSocket.OPEN) continue;
        if (!alive[who]) {
          log("--  no pong from " + who + " for one beat - terminating");
          try { sock.terminate(); } catch {}
          continue;
        }
        alive[who] = false;
        try { sock.ping(); } catch {}
      }
    }, BEAT_MS);
    // لا يمنع خروجَ العملية: الخادم يُقتل في أثناء التحديث
    if (beat.unref) beat.unref();
  }
  // المؤقّت يُنظَّف عند كل إغلاق، وإلا تراكم مع كل إعادة وصل — وهي
  // متكرّرة هنا بطبعها — حتى يُثقل الخادم
  function stopBeat() { if (beat) { clearInterval(beat); beat = null; } }

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

    upstream.on("pong", () => { alive.upstream = true; seen.upstream = Date.now(); });

    upstream.on("open", () => {
      ready = true;
      alive.upstream = true;
      seen.upstream = Date.now();
      log("OK  TV answered on " + target);
      // التلفزيون شغّال يقيناً الآن، وهذه أوثق لحظة لالتقاط بطاقته:
      // لا تظهر في جدول ARP إلا لمن خُوطب حديثاً، ولا تُعرف وهو مطفأ
      rememberMac().catch(() => {});
      for (const m of queue.splice(0)) upstream.send(m);
    });

    upstream.on("message", (data) => {
      seen.upstream = Date.now();
      if (client.readyState === WebSocket.OPEN) client.send(data.toString());
    });

    upstream.on("close", (code, reason) => {
      if (!ready) return;          // فشل الوصل يعالجه معالج الخطأ أدناه
      // زمنُ السكون مع الرمز: به نعرف أهو انقطاعُ سكونٍ أم تبدُّلُ طريق،
      // فنقيس بدل أن نخمّن
      log("--  TV channel closed (" + code + (reason ? " " + reason : "") +
          ") after " + idleOf("upstream") + "s idle");
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
    seen.client = Date.now();
    if (ready && upstream) upstream.send(text);
    else queue.push(text);          // الأوامر المبكرة تنتظر جهوز القناة
  });

  client.on("close", (code) => {
    log("--  browser channel closed (" + code + ") after " + idleOf("client") + "s idle");
    stopBeat();
    try { upstream && upstream.close(); } catch {}
  });
  client.on("error", () => { stopBeat(); try { upstream && upstream.close(); } catch {} });

  startBeat();
  open();
});

/** يقرأ جسماً JSON بحدٍّ أعلى، فلا يُغرق الخادمَ طلبٌ بلا نهاية */
function readJson(req, limit = 4096) {
  return new Promise((resolve, reject) => {
    let b = "";
    req.on("data", (c) => {
      b += c;
      if (b.length > limit) { req.destroy(); reject(new Error("الطلب أكبر مما يُقبل")); }
    });
    req.on("end", () => { try { resolve(JSON.parse(b || "{}")); } catch { resolve({}); } });
    req.on("error", () => reject(new Error("انقطع الطلب")));
  });
}

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

// عنوان الشبكة الخاصة (Tailscale) يقع في 100.64.0.0/10، وهو المدى الذي
// حجزته RFC 6598 لشبكات المشغّلين فلا يتعارض مع شبكة البيت. وبه وحده
// يصل الجوّال إلى الخادم وهو خارج البيت — فيُميَّز عن عناوين الواي‑فاي
function tailnetAddress() {
  return localAddresses().find((a) => {
    const p = a.split(".").map(Number);
    return p[0] === 100 && p[1] >= 64 && p[1] <= 127;
  }) || null;
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

/**
 * خادمٌ مشفَّر بجوار العادي — لا بدلاً منه.
 *
 * سفاري يمنع الميكروفون والحافظة ومستشعر الاتجاه على http. فبلا هذا
 * لا أوامرَ صوتية ولا بوصلةٌ تدور، مهما أُتقنت الشيفرة.
 *
 * والعادي يبقى: هو طريق النجاة إن انتهت الشهادة أو تعطّل Tailscale
 * (القاعدة الخامسة عشرة — ما يُنقذ لا يمرّ بما قد ينكسر).
 */
const HTTPS_PORT = Number(process.env.HTTPS_PORT || CFG.httpsPort || 8443);
let secureServer = null;

function startSecure() {
  if (process.env.NO_HTTPS) return;
  const cert = tls.load();
  if (!cert) return;
  try {
    secureServer = https.createServer({ key: cert.key, cert: cert.cert }, server.listeners("request")[0]);
    // المقابس تُرقّى على الخادمين معاً، وإلا عمل الريموت على العادي وحده
    secureServer.on("upgrade", (req, sock, head) => {
      wss.handleUpgrade(req, sock, head, (ws) => wss.emit("connection", ws, req));
    });
    secureServer.on("error", (e) => {
      log("https listen failed: " + e.message);
      secureServer = null;
    });
    secureServer.listen(HTTPS_PORT, "0.0.0.0", () => {
      console.log("  secure: https://" + cert.name + ":" + HTTPS_PORT + "   <- الصوت والبوصلة يعملان هنا");
      log("https ready on " + HTTPS_PORT + " for " + cert.name);
    });
  } catch (e) {
    log("https could not start: " + e.message);
    secureServer = null;
  }
}

server.listen(PORT, "0.0.0.0", () => {
  const addrs = localAddresses();
  console.log("──────────────────────────────────────────");
  console.log("  KMC TV Remote - server running");
  console.log("");
  console.log("  open on your phone:");
  const away = tailnetAddress();
  for (const a of addrs) {
    console.log(`     http://${a}:${PORT}` + (a === away ? "   <- works from anywhere" : ""));
  }
  if (!addrs.length) console.log("     (no address found - check the Wi-Fi connection)");
  if (!away) console.log("     (outside access not set up - run windows\\tailscale.ps1)");
  console.log("");
  console.log("  TV: " + (tvIp ? tvIp + ":" + TV_PORT : "searching..."));
  console.log("──────────────────────────────────────────");

  startSecure();

  // حارسُ النفق: خادمُنا أثبتُ ما في البيت، فليحرس ما هو أهشّ منه.
  // أوّلُ تفقّدٍ بعد دقيقة، ثم كل خمس — ولا يفعل شيئاً ما دام قائماً
  if (!process.env.NO_TAILNET_WATCH) {
    const watch = () => tls.keepUp(log).catch(() => {});
    setTimeout(watch, 60000).unref();
    setInterval(watch, 300000).unref();
  }

  // نتحقّق من العنوان المحفوظ فور الإقلاع، فيكون جاهزاً قبل أول ضغطة زر
  if (!process.env.TV_URL) ensureTv();

  // أول تفقّد بعد دقيقتين — لا فور الإقلاع، كيلا يتحدّث بعد تحديثٍ توّاً
  if (!process.env.NO_AUTO_UPDATE) {
    setTimeout(autoCheck, 120000);
    setInterval(autoCheck, 1800000).unref();     // كل نصف ساعة
  }
});

module.exports = server;
// سطحٌ للاختبار وحده: يسمح بفحص قراءة النسخة ومقارنتها بلا شبكة
module.exports.__test = { latestSha, installedVersion, startUpdate, autoCheck, wss };

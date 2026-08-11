"use strict";
// ============================================================
// store.js — الإعدادات والقواعد والسجل.
// كل شيء ملفات JSON محلية: لا قاعدة بيانات ولا سحابة.
// بيانات تصفّح العائلة ما تغادر جهازك.
// ============================================================

const fs = require("fs");
const path = require("path");
const readline = require("readline");

const ROOT = path.join(__dirname, "..");
const DATA = process.env.HOMENET_DATA || path.join(ROOT, "data");
const LOGS = path.join(DATA, "logs");
const STATS = path.join(DATA, "stats");
const LISTS = path.join(DATA, "lists");
const CONFIG_FILE = path.join(DATA, "config.json");

for (const d of [DATA, LOGS, STATS, LISTS]) fs.mkdirSync(d, { recursive: true });

// ---------- الوقت المحلي ----------
function pad(n) { return String(n).padStart(2, "0"); }
function dayKey(ts = Date.now()) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function minutesOfDay(ts = Date.now()) {
  const d = new Date(ts);
  return d.getHours() * 60 + d.getMinutes();
}

// ---------- الإعدادات الافتراضية ----------
function defaultConfig() {
  return {
    version: 1,
    settings: {
      upstream: ["1.1.1.1", "8.8.8.8"],
      blockMode: "zero",          // zero | nxdomain
      safeSearch: true,
      paused: false,              // قطع النت عن الجميع
      pauseUntil: 0,
      alertWebhook: "",           // أي رابط يستقبل POST بصيغة JSON
      telegramToken: "",
      telegramChat: "",
      logRetentionDays: 30,
      newDeviceProfile: "guest",
    },
    profiles: [
      {
        id: "child", name: "طفل",
        categories: ["adult", "gambling", "dating", "bypass", "ads", "social"],
        safeSearch: true,
        curfew: [{ label: "وقت النوم", from: "21:00", to: "06:30", days: [0, 1, 2, 3, 4, 5, 6] }],
        block: [], allow: [],
      },
      {
        id: "teen", name: "مراهق",
        categories: ["adult", "gambling", "dating", "bypass"],
        safeSearch: true,
        curfew: [{ label: "وقت النوم", from: "23:30", to: "06:00", days: [0, 1, 2, 3, 4, 5, 6] }],
        block: [], allow: [],
      },
      {
        id: "adult", name: "بالغ",
        categories: [], safeSearch: false, curfew: [], block: [], allow: [],
      },
      {
        id: "guest", name: "ضيف / غير معروف",
        categories: ["adult", "gambling", "bypass"],
        safeSearch: true, curfew: [], block: [], allow: [],
      },
    ],
    devices: {},
    rules: { block: [], allow: [] },
    customLists: {},
  };
}

// ---------- تحميل / حفظ ----------
let config = defaultConfig();

function load() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const raw = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8"));
      const base = defaultConfig();
      config = {
        ...base, ...raw,
        settings: { ...base.settings, ...(raw.settings || {}) },
        rules: { ...base.rules, ...(raw.rules || {}) },
        devices: raw.devices || {},
        profiles: Array.isArray(raw.profiles) && raw.profiles.length ? raw.profiles : base.profiles,
        customLists: raw.customLists || {},
      };
    }
  } catch (e) {
    console.error("[store] تعذّرت قراءة الإعدادات، بدأنا بالافتراضي:", e.message);
    config = defaultConfig();
  }
  loadTodayStats();
  return config;
}

let saveTimer = null;
function save(immediate = false) {
  if (saveTimer) clearTimeout(saveTimer);
  const write = () => {
    saveTimer = null;
    try {
      const tmp = CONFIG_FILE + ".tmp";
      fs.writeFileSync(tmp, JSON.stringify(config, null, 2));
      fs.renameSync(tmp, CONFIG_FILE);
    } catch (e) {
      console.error("[store] فشل حفظ الإعدادات:", e.message);
    }
  };
  if (immediate) write(); else saveTimer = setTimeout(write, 400);
}

function getConfig() { return config; }

// ---------- السجل الحيّ ----------
const RECENT_MAX = 3000;
const recent = [];           // الأحدث في النهاية
let seq = 0;
const dedupe = new Map();    // ip|domain|action -> {idx بالتسلسل, t}
const DEDUPE_MS = 15000;

const alerts = [];           // تنبيهات المواقع الخطرة
const ALERTS_MAX = 500;

let logBuffer = [];
let logDay = dayKey();

function flushLogs() {
  if (!logBuffer.length) return;
  const day = logDay;
  const lines = logBuffer.map((e) => JSON.stringify(e)).join("\n") + "\n";
  logBuffer = [];
  fs.appendFile(path.join(LOGS, `${day}.jsonl`), lines, (err) => {
    if (err) console.error("[store] فشل كتابة السجل:", err.message);
  });
}
setInterval(flushLogs, 1000).unref();

// إحصاءات اليوم في الذاكرة
let statsDay = dayKey();
let stats = {};   // deviceId -> {total, blocked, domains:{}, cats:{}}

function loadTodayStats() {
  statsDay = dayKey();
  try {
    const f = path.join(STATS, `${statsDay}.json`);
    if (fs.existsSync(f)) stats = JSON.parse(fs.readFileSync(f, "utf8"));
    else stats = {};
  } catch { stats = {}; }
}

function saveStats() {
  try {
    const tmp = path.join(STATS, `${statsDay}.json.tmp`);
    fs.writeFileSync(tmp, JSON.stringify(stats));
    fs.renameSync(tmp, path.join(STATS, `${statsDay}.json`));
  } catch (e) { /* لا نُسقط الخادم لأجل ملف إحصاء */ }
}
setInterval(saveStats, 20000).unref();

function rollIfNewDay() {
  const today = dayKey();
  if (today !== statsDay) {
    flushLogs();
    saveStats();
    statsDay = today;
    logDay = today;
    stats = {};
    pruneOldLogs();
  }
}
setInterval(rollIfNewDay, 30000).unref();

function bumpStats(ev) {
  const id = ev.dev || "unknown";
  const s = stats[id] || (stats[id] = { total: 0, blocked: 0, domains: {}, cats: {} });
  s.total++;
  if (ev.act === "block") {
    s.blocked++;
    if (ev.cat) s.cats[ev.cat] = (s.cats[ev.cat] || 0) + 1;
  }
  s.domains[ev.q] = (s.domains[ev.q] || 0) + 1;
}

const listeners = new Set();
function onEvent(fn) { listeners.add(fn); return () => listeners.delete(fn); }

// نضيف حدثاً واحداً؛ الطلبات المكررة خلال ١٥ ثانية تُجمَع في سطر واحد
function addEvent(ev) {
  rollIfNewDay();
  ev.t = ev.t || Date.now();
  const key = `${ev.ip}|${ev.q}|${ev.act}`;
  const prev = dedupe.get(key);
  if (prev && ev.t - prev.t < DEDUPE_MS) {
    prev.t = ev.t;
    const item = recent.find((r) => r.n === prev.n);
    if (item) {
      item.c = (item.c || 1) + 1;
      item.t = ev.t;
      bumpStats(ev);
      for (const fn of listeners) fn({ type: "update", event: item });
      return item;
    }
  }
  ev.n = ++seq;
  ev.c = 1;
  dedupe.set(key, { n: ev.n, t: ev.t });
  if (dedupe.size > 20000) dedupe.clear();

  recent.push(ev);
  if (recent.length > RECENT_MAX) recent.splice(0, recent.length - RECENT_MAX);
  logBuffer.push(ev);
  if (logBuffer.length > 500) flushLogs();
  bumpStats(ev);
  for (const fn of listeners) fn({ type: "event", event: ev });
  return ev;
}

function addAlert(alert) {
  alert.t = alert.t || Date.now();
  alert.id = ++seq;
  alerts.push(alert);
  if (alerts.length > ALERTS_MAX) alerts.splice(0, alerts.length - ALERTS_MAX);
  for (const fn of listeners) fn({ type: "alert", alert });
  return alert;
}

function getRecent(sinceN = 0, limit = 300) {
  const out = [];
  for (let i = recent.length - 1; i >= 0 && out.length < limit; i--) {
    if (recent[i].n > sinceN) out.push(recent[i]); else if (sinceN) break;
  }
  return out;
}

function getAlerts(limit = 100) { return alerts.slice(-limit).reverse(); }
function clearAlerts() { alerts.length = 0; }

function getStats(day) {
  if (!day || day === statsDay) return stats;
  try {
    const f = path.join(STATS, `${day}.json`);
    if (fs.existsSync(f)) return JSON.parse(fs.readFileSync(f, "utf8"));
  } catch { /* تجاهل */ }
  return {};
}

function listDays() {
  try {
    return fs.readdirSync(LOGS).filter((f) => f.endsWith(".jsonl")).map((f) => f.replace(".jsonl", "")).sort().reverse();
  } catch { return []; }
}

// بحث في سجل يوم معيّن — نقرأ الملف سطراً سطراً حتى لا نُحمّل الذاكرة
function searchDay(day, { q = "", dev = "", act = "", limit = 500 } = {}) {
  return new Promise((resolve) => {
    const file = path.join(LOGS, `${day}.jsonl`);
    if (!fs.existsSync(file)) return resolve([]);
    if (day === logDay) flushLogs();
    const needle = q.trim().toLowerCase();
    const out = [];
    const rl = readline.createInterface({ input: fs.createReadStream(file), crlfDelay: Infinity });
    rl.on("line", (line) => {
      if (!line) return;
      let e;
      try { e = JSON.parse(line); } catch { return; }
      if (needle && !e.q.includes(needle)) return;
      if (dev && e.dev !== dev) return;
      if (act && e.act !== act) return;
      out.push(e);
      if (out.length > limit * 4) out.splice(0, out.length - limit * 4);
    });
    rl.on("close", () => resolve(out.slice(-limit).reverse()));
    rl.on("error", () => resolve([]));
  });
}

function pruneOldLogs() {
  const keep = Number(config.settings.logRetentionDays || 30);
  const cutoff = dayKey(Date.now() - keep * 86400000);
  for (const dir of [LOGS, STATS]) {
    try {
      for (const f of fs.readdirSync(dir)) {
        const day = f.split(".")[0];
        if (/^\d{4}-\d{2}-\d{2}$/.test(day) && day < cutoff) fs.unlinkSync(path.join(dir, f));
      }
    } catch { /* تجاهل */ }
  }
}

// ---------- القوائم المحمَّلة من الإنترنت ----------
function saveList(cat, domains) {
  fs.writeFileSync(path.join(LISTS, `${cat}.txt`), domains.join("\n"));
}
function readList(cat) {
  try {
    const f = path.join(LISTS, `${cat}.txt`);
    if (!fs.existsSync(f)) return [];
    return fs.readFileSync(f, "utf8").split("\n").map((s) => s.trim()).filter(Boolean);
  } catch { return []; }
}
function listSizes() {
  const out = {};
  try {
    for (const f of fs.readdirSync(LISTS)) {
      if (!f.endsWith(".txt")) continue;
      const cat = f.replace(".txt", "");
      out[cat] = readList(cat).length;
    }
  } catch { /* تجاهل */ }
  return out;
}

function shutdown() {
  flushLogs();
  saveStats();
  save(true);
}

module.exports = {
  DATA, LOGS, LISTS,
  load, save, getConfig, defaultConfig,
  dayKey, minutesOfDay,
  addEvent, addAlert, onEvent, getRecent, getAlerts, clearAlerts,
  getStats, listDays, searchDay, pruneOldLogs,
  saveList, readList, listSizes, shutdown,
};

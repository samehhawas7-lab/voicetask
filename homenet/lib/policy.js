"use strict";
// ============================================================
// policy.js — محرّك القرار: هل نسمح لهذا الطلب أم نحجبه؟
//
// ترتيب الأحكام (الأول يفوز):
//   ١) قائمة السماح (عامة / للملف / للجهاز)  → سماح
//   ٢) إيقاف النت عن كل البيت                  → حجب
//   ٣) قطع النت عن هذا الجهاز                  → حجب
//   ٤) جدول المنع (وقت النوم/المذاكرة)         → حجب
//   ٥) قائمة الحجب اليدوية                     → حجب
//   ٦) فئة محجوبة في ملف الجهاز                → حجب
//   ٧) غير ذلك                                  → سماح
// ============================================================

const { CATEGORIES } = require("./categories");
const store = require("./store");

// ترتيب البناء: الفئات الأخطر تُكتب أخيراً فتغلب عند التعارض
const BUILD_ORDER = ["ads", "games", "video", "social", "dating", "bypass", "gambling", "adult"];

let index = new Map();      // نطاق -> فئة
let indexSize = 0;

function normalize(domain) {
  return String(domain || "").trim().toLowerCase().replace(/\.$/, "").replace(/^\*\./, "");
}

function rebuildIndex() {
  const cfg = store.getConfig();
  const map = new Map();
  for (const cat of BUILD_ORDER) {
    const seed = CATEGORIES[cat] ? CATEGORIES[cat].domains : [];
    for (const d of seed) map.set(normalize(d), cat);
    // القوائم المحمَّلة من الإنترنت (قد تكون بمئات الآلاف)
    for (const d of store.readList(cat)) {
      const n = normalize(d);
      if (n) map.set(n, cat);
    }
    // إضافات المستخدم لكل فئة
    for (const d of (cfg.customLists[cat] || [])) map.set(normalize(d), cat);
  }
  index = map;
  indexSize = map.size;
  return indexSize;
}

// نبحث عن النطاق ثم آبائه: ads.x.pornhub.com ينطبق عليه pornhub.com
function lookupCategory(domain) {
  let d = domain;
  for (let i = 0; i < 12; i++) {
    const hit = index.get(d);
    if (hit) return hit;
    const dot = d.indexOf(".");
    if (dot < 0) return null;
    d = d.slice(dot + 1);
    if (!d.includes(".")) return index.get(d) || null;
  }
  return null;
}

function inSet(domain, list) {
  if (!list || !list.length) return null;
  const set = list instanceof Set ? list : new Set(list.map(normalize));
  let d = domain;
  for (let i = 0; i < 12; i++) {
    if (set.has(d)) return d;
    const dot = d.indexOf(".");
    if (dot < 0) return null;
    d = d.slice(dot + 1);
  }
  return null;
}

// ---------- الجداول الزمنية ----------
function hhmmToMinutes(s) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(s || "").trim());
  if (!m) return null;
  return Math.min(23, Number(m[1])) * 60 + Math.min(59, Number(m[2]));
}

function windowActive(win, now = new Date()) {
  const from = hhmmToMinutes(win.from);
  const to = hhmmToMinutes(win.to);
  if (from === null || to === null) return false;
  const day = now.getDay();
  const cur = now.getHours() * 60 + now.getMinutes();
  const days = Array.isArray(win.days) && win.days.length ? win.days : [0, 1, 2, 3, 4, 5, 6];
  if (from === to) return false;
  if (from < to) {
    return days.includes(day) && cur >= from && cur < to;
  }
  // نافذة تعبر منتصف الليل: ٢١:٠٠ → ٠٦:٣٠
  if (cur >= from) return days.includes(day);
  const yesterday = (day + 6) % 7;
  return cur < to && days.includes(yesterday);
}

function activeCurfew(profile, now = new Date()) {
  for (const win of (profile.curfew || [])) {
    if (win.enabled === false) continue;
    if (windowActive(win, now)) return win;
  }
  return null;
}

function profileOf(device) {
  const cfg = store.getConfig();
  const id = (device && device.profile) || cfg.settings.newDeviceProfile || "guest";
  return cfg.profiles.find((p) => p.id === id) || cfg.profiles[cfg.profiles.length - 1];
}

// ---------- القرار ----------
function decide(rawDomain, device, now = Date.now()) {
  const cfg = store.getConfig();
  const domain = normalize(rawDomain);
  const profile = profileOf(device);
  const cat = lookupCategory(domain);

  // ١) السماح الصريح يتقدّم على كل شيء
  if (inSet(domain, cfg.rules.allow) ||
      inSet(domain, profile.allow) ||
      (device && inSet(domain, device.allow))) {
    return { action: "allow", why: "allowlist", cat };
  }

  // ٢) إيقاف عام
  const paused = cfg.settings.paused && (!cfg.settings.pauseUntil || cfg.settings.pauseUntil > now);
  if (paused) return { action: "block", why: "paused", cat, label: "النت موقوف عن البيت" };

  // ٣) قطع عن الجهاز
  if (device && device.blockedUntil && device.blockedUntil > now) {
    return { action: "block", why: "device-paused", cat, label: "النت مقطوع عن هذا الجهاز" };
  }

  // ٤) جدول المنع — إلا إذا مُنح الجهاز تمديداً
  const grace = device && device.graceUntil && device.graceUntil > now;
  if (!grace) {
    const win = activeCurfew(profile, new Date(now));
    if (win) return { action: "block", why: "curfew", cat, label: win.label || "خارج وقت الاستخدام" };
  }

  // ٥) حجب يدوي
  if (inSet(domain, cfg.rules.block) ||
      inSet(domain, profile.block) ||
      (device && inSet(domain, device.block))) {
    return { action: "block", why: "blocklist", cat, label: "محجوب يدوياً" };
  }

  // ٦) فئة محجوبة
  if (cat && (profile.categories || []).includes(cat)) {
    return { action: "block", why: "category", cat, label: CATEGORIES[cat] ? CATEGORIES[cat].label : cat };
  }

  return { action: "allow", why: "ok", cat };
}

function isDangerous(cat) {
  return !!(cat && CATEGORIES[cat] && CATEGORIES[cat].danger);
}

function safeSearchEnabled(device) {
  const cfg = store.getConfig();
  if (!cfg.settings.safeSearch) return false;
  const profile = profileOf(device);
  return profile.safeSearch !== false;
}

module.exports = {
  rebuildIndex, lookupCategory, decide, normalize, profileOf,
  activeCurfew, windowActive, hhmmToMinutes, isDangerous, safeSearchEnabled,
  get indexSize() { return indexSize; },
};

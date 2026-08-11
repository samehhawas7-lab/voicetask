"use strict";
// ============================================================
// شبكة البيت — خادم واحد يشغّل شيئين:
//   ١) خادم DNS على المنفذ ٥٣: يرى كل طلب موقع ويطبّق القواعد.
//   ٢) لوحة تحكم ويب على المنفذ ٨٠٨١: تعرض وتضبط.
//
// لازم يشتغل على جهاز داخل البيت (راسبيري باي، لابتوب قديم،
// أو أي جهاز يظل مفتوحاً)، ويُشار إليه من إعدادات DNS في الراوتر.
// التفاصيل في README.md
// ============================================================

const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const store = require("./lib/store");
const policy = require("./lib/policy");
const devices = require("./lib/devices");
const lists = require("./lib/lists");
const notify = require("./lib/notify");
const { DnsServer } = require("./lib/resolver");
const { CATEGORIES } = require("./lib/categories");

const WEB_PORT = Number(process.env.HOMENET_PORT || 8081);
const DNS_PORT = Number(process.env.HOMENET_DNS_PORT || 53);
const BIND = process.env.HOMENET_BIND || "0.0.0.0";
const PUBLIC_DIR = path.join(__dirname, "public");

store.load();
policy.rebuildIndex();

// ---------- رمز الدخول ----------
const cfg = store.getConfig();
if (process.env.HOMENET_PIN) cfg.settings.pin = String(process.env.HOMENET_PIN);
if (!cfg.settings.pin) {
  cfg.settings.pin = String(crypto.randomInt(100000, 999999));
  store.save(true);
  console.log("\n  ⚠️  أُنشئ رمز دخول للوحة: " + cfg.settings.pin + "  (غيّره من الإعدادات)\n");
}
const SALT = crypto.randomBytes(16).toString("hex"); // يتغيّر عند كل تشغيل: يُبطل الجلسات القديمة
function tokenFor(pin) {
  return crypto.createHmac("sha256", SALT).update(String(pin)).digest("hex").slice(0, 32);
}

// ---------- أدوات HTTP ----------
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".webmanifest": "application/manifest+json",
};

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
}

function readBody(req, limit = 512 * 1024) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (c) => {
      data += c;
      if (data.length > limit) { reject(new Error("حجم الطلب كبير")); req.destroy(); }
    });
    req.on("end", () => {
      if (!data) return resolve({});
      try { resolve(JSON.parse(data)); } catch { reject(new Error("صيغة JSON غير صحيحة")); }
    });
    req.on("error", reject);
  });
}

function cookies(req) {
  const out = {};
  for (const part of String(req.headers.cookie || "").split(";")) {
    const i = part.indexOf("=");
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

function authorized(req) {
  const want = tokenFor(store.getConfig().settings.pin);
  const c = cookies(req);
  if (c.homenet && crypto.timingSafeEqual(Buffer.from(c.homenet.padEnd(32).slice(0, 32)), Buffer.from(want))) return true;
  const hdr = req.headers["x-homenet-pin"];
  if (hdr && String(hdr) === String(store.getConfig().settings.pin)) return true;
  return false;
}

function serveStatic(req, res, pathname) {
  const rel = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const file = path.join(PUBLIC_DIR, rel);
  if (!file.startsWith(PUBLIC_DIR)) { res.writeHead(403); return res.end("ممنوع"); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }); return res.end("غير موجود"); }
    res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream", "Cache-Control": "no-cache" });
    res.end(data);
  });
}

// ---------- الحالة المعروضة ----------
function publicSettings() {
  const s = store.getConfig().settings;
  return {
    upstream: s.upstream, blockMode: s.blockMode, safeSearch: s.safeSearch,
    paused: s.paused, pauseUntil: s.pauseUntil,
    alertWebhook: s.alertWebhook ? "معدّ" : "", hasWebhook: !!s.alertWebhook,
    telegramChat: s.telegramChat, hasTelegram: !!(s.telegramToken && s.telegramChat),
    logRetentionDays: s.logRetentionDays, newDeviceProfile: s.newDeviceProfile,
  };
}

function stateSnapshot(dns) {
  const c = store.getConfig();
  const today = store.getStats();
  return {
    status: dns.status(),
    settings: publicSettings(),
    profiles: c.profiles,
    devices: devices.list().map((d) => ({
      ...d,
      display: devices.displayName(d),
      stats: today[d.id] || { total: 0, blocked: 0 },
      online: Date.now() - (d.lastSeen || 0) < 5 * 60 * 1000,
      curfew: (() => {
        const p = policy.profileOf(d);
        const w = policy.activeCurfew(p);
        return w ? (w.label || "خارج وقت الاستخدام") : "";
      })(),
    })),
    rules: c.rules,
    categories: Object.fromEntries(Object.entries(CATEGORIES).map(([k, v]) => [k, { label: v.label, danger: !!v.danger, seed: v.domains.length }])),
    customLists: c.customLists,
    listSizes: store.listSizes(),
    indexSize: policy.indexSize,
    alerts: store.getAlerts(30),
    day: store.dayKey(),
  };
}

function findDevice(id) {
  return store.getConfig().devices[id] || null;
}

function uniqDomains(arr) {
  return [...new Set((arr || []).map((d) => policy.normalize(d)).filter(Boolean))];
}

// ---------- الخادم ----------
const dns = new DnsServer({ port: DNS_PORT, host: BIND });

const web = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  const p = url.pathname;

  try {
    // تسجيل الدخول متاح دائماً
    if (p === "/api/login" && req.method === "POST") {
      const body = await readBody(req);
      if (String(body.pin || "") === String(store.getConfig().settings.pin)) {
        res.setHeader("Set-Cookie", `homenet=${tokenFor(store.getConfig().settings.pin)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${30 * 86400}`);
        return sendJson(res, 200, { ok: true });
      }
      return sendJson(res, 401, { ok: false, error: "الرمز غير صحيح" });
    }
    if (p === "/api/logout") {
      res.setHeader("Set-Cookie", "homenet=; Path=/; HttpOnly; Max-Age=0");
      return sendJson(res, 200, { ok: true });
    }

    // الملفات الثابتة (الصفحة نفسها تطلب رمز الدخول)
    if (!p.startsWith("/api/")) return serveStatic(req, res, p);

    if (!authorized(req)) return sendJson(res, 401, { error: "يلزم رمز الدخول" });

    // ---------- قراءة ----------
    if (p === "/api/state") return sendJson(res, 200, stateSnapshot(dns));

    if (p === "/api/events") {
      const since = Number(url.searchParams.get("since") || 0);
      return sendJson(res, 200, { events: store.getRecent(since, 400) });
    }

    if (p === "/api/stats") {
      const day = url.searchParams.get("day") || store.dayKey();
      const all = store.getStats(day);
      const dev = url.searchParams.get("dev");
      if (dev) {
        const s = all[dev] || { total: 0, blocked: 0, domains: {}, cats: {} };
        const top = Object.entries(s.domains || {}).sort((a, b) => b[1] - a[1]).slice(0, 60);
        return sendJson(res, 200, { day, dev, total: s.total, blocked: s.blocked, cats: s.cats || {}, top });
      }
      const summary = {};
      const merged = {};
      for (const [id, s] of Object.entries(all)) {
        summary[id] = { total: s.total, blocked: s.blocked, cats: s.cats || {} };
        for (const [d, n] of Object.entries(s.domains || {})) merged[d] = (merged[d] || 0) + n;
      }
      const top = Object.entries(merged).sort((a, b) => b[1] - a[1]).slice(0, 60);
      return sendJson(res, 200, { day, summary, top });
    }

    if (p === "/api/days") return sendJson(res, 200, { days: store.listDays() });

    if (p === "/api/search") {
      const day = url.searchParams.get("day") || store.dayKey();
      const out = await store.searchDay(day, {
        q: url.searchParams.get("q") || "",
        dev: url.searchParams.get("dev") || "",
        act: url.searchParams.get("act") || "",
        limit: 400,
      });
      return sendJson(res, 200, { day, events: out });
    }

    if (p === "/api/stream") {
      res.writeHead(200, {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      });
      res.write("retry: 3000\n\n");
      const off = store.onEvent((m) => {
        try { res.write(`data: ${JSON.stringify(m)}\n\n`); } catch { /* */ }
      });
      const ping = setInterval(() => { try { res.write(": ping\n\n"); } catch { /* */ } }, 25000);
      req.on("close", () => { off(); clearInterval(ping); });
      return;
    }

    // ---------- كتابة ----------
    if (req.method !== "POST") return sendJson(res, 405, { error: "طريقة غير مدعومة" });
    const body = await readBody(req);
    const c = store.getConfig();

    if (p === "/api/pause") {
      const minutes = Number(body.minutes || 0);
      c.settings.paused = !!body.on;
      c.settings.pauseUntil = body.on && minutes > 0 ? Date.now() + minutes * 60000 : 0;
      store.save();
      return sendJson(res, 200, { ok: true, settings: publicSettings() });
    }

    if (p === "/api/device") {
      const dev = findDevice(body.id);
      if (!dev) return sendJson(res, 404, { error: "جهاز غير معروف" });
      if (typeof body.name === "string") dev.name = body.name.slice(0, 60);
      if (typeof body.note === "string") dev.note = body.note.slice(0, 200);
      if (body.profile && c.profiles.some((x) => x.id === body.profile)) dev.profile = body.profile;
      const minutes = Number(body.minutes || 0);
      if (body.action === "cut") dev.blockedUntil = minutes > 0 ? Date.now() + minutes * 60000 : Date.now() + 100 * 365 * 86400000;
      if (body.action === "open") { dev.blockedUntil = 0; dev.graceUntil = 0; }
      if (body.action === "grace") dev.graceUntil = Date.now() + (minutes > 0 ? minutes : 30) * 60000;
      if (body.action === "forget") delete c.devices[dev.id];
      dev.isNew = false;
      store.save();
      return sendJson(res, 200, { ok: true, devices: stateSnapshot(dns).devices });
    }

    if (p === "/api/rules") {
      const kind = body.kind === "allow" ? "allow" : "block";
      const domain = policy.normalize(body.domain);
      if (!domain || !domain.includes(".")) return sendJson(res, 400, { error: "اكتب نطاقاً صحيحاً مثل example.com" });
      let target;
      if (body.scope === "device") {
        const dev = findDevice(body.id);
        if (!dev) return sendJson(res, 404, { error: "جهاز غير معروف" });
        target = dev;
      } else if (body.scope === "profile") {
        target = c.profiles.find((x) => x.id === body.id);
        if (!target) return sendJson(res, 404, { error: "ملف غير معروف" });
      } else {
        target = c.rules;
      }
      target[kind] = uniqDomains(target[kind]);
      const other = kind === "block" ? "allow" : "block";
      target[other] = uniqDomains(target[other]).filter((d) => d !== domain);
      if (body.remove) target[kind] = target[kind].filter((d) => d !== domain);
      else if (!target[kind].includes(domain)) target[kind].push(domain);
      store.save();
      dns.cache.clear();
      return sendJson(res, 200, { ok: true, rules: c.rules, state: stateSnapshot(dns) });
    }

    if (p === "/api/profile") {
      const prof = c.profiles.find((x) => x.id === body.id);
      if (!prof) return sendJson(res, 404, { error: "ملف غير معروف" });
      if (typeof body.name === "string" && body.name.trim()) prof.name = body.name.trim().slice(0, 40);
      if (Array.isArray(body.categories)) prof.categories = body.categories.filter((k) => CATEGORIES[k]);
      if (typeof body.safeSearch === "boolean") prof.safeSearch = body.safeSearch;
      if (Array.isArray(body.curfew)) {
        prof.curfew = body.curfew.slice(0, 10).map((w) => ({
          label: String(w.label || "").slice(0, 40) || "منع",
          from: /^\d{1,2}:\d{2}$/.test(w.from) ? w.from : "21:00",
          to: /^\d{1,2}:\d{2}$/.test(w.to) ? w.to : "06:00",
          days: Array.isArray(w.days) ? w.days.map(Number).filter((d) => d >= 0 && d <= 6) : [0, 1, 2, 3, 4, 5, 6],
          enabled: w.enabled !== false,
        }));
      }
      store.save();
      dns.cache.clear();
      return sendJson(res, 200, { ok: true, profiles: c.profiles });
    }

    if (p === "/api/settings") {
      const s = c.settings;
      if (Array.isArray(body.upstream)) {
        const ok = body.upstream.map((x) => String(x).trim()).filter((x) => /^\d{1,3}(\.\d{1,3}){3}(#\d{1,5})?$/.test(x));
        if (ok.length) s.upstream = ok;
      }
      if (typeof body.safeSearch === "boolean") s.safeSearch = body.safeSearch;
      if (body.blockMode === "zero" || body.blockMode === "nxdomain") s.blockMode = body.blockMode;
      // الأسرار لا تُرسل للمتصفح، فالحقل الفارغ يعني «لا تغيّر»؛ المسح بطلب صريح
      if (typeof body.alertWebhook === "string" && body.alertWebhook.trim()) s.alertWebhook = body.alertWebhook.trim();
      if (typeof body.telegramToken === "string" && body.telegramToken.trim()) s.telegramToken = body.telegramToken.trim();
      if (body.clear === "webhook") s.alertWebhook = "";
      if (body.clear === "telegram") { s.telegramToken = ""; s.telegramChat = ""; }
      if (typeof body.telegramChat === "string") s.telegramChat = body.telegramChat.trim();
      if (body.logRetentionDays) s.logRetentionDays = Math.max(1, Math.min(365, Number(body.logRetentionDays)));
      if (body.newDeviceProfile && c.profiles.some((x) => x.id === body.newDeviceProfile)) s.newDeviceProfile = body.newDeviceProfile;
      if (body.pin && /^\d{4,12}$/.test(String(body.pin))) {
        s.pin = String(body.pin);
        res.setHeader("Set-Cookie", `homenet=${tokenFor(s.pin)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${30 * 86400}`);
      }
      if (Array.isArray(body.customList) && body.customCat && CATEGORIES[body.customCat]) {
        c.customLists[body.customCat] = uniqDomains(body.customList);
        policy.rebuildIndex();
      }
      store.save();
      dns.cache.clear();
      return sendJson(res, 200, { ok: true, settings: publicSettings() });
    }

    if (p === "/api/lists/update") {
      const report = await lists.update(Array.isArray(body.cats) ? body.cats : null);
      const size = policy.rebuildIndex();
      dns.cache.clear();
      return sendJson(res, 200, { ok: true, report, indexSize: size, listSizes: store.listSizes() });
    }

    if (p === "/api/alerts/clear") { store.clearAlerts(); return sendJson(res, 200, { ok: true }); }

    if (p === "/api/notify/test") {
      const ok = await notify.test();
      return sendJson(res, 200, { ok, error: ok ? "" : "لم ينجح الإرسال — تأكد من الرابط أو رمز البوت" });
    }

    return sendJson(res, 404, { error: "مسار غير معروف" });
  } catch (e) {
    return sendJson(res, 500, { error: e.message });
  }
});

dns.start();
web.listen(WEB_PORT, BIND, () => {
  console.log(`[web] لوحة التحكم: http://localhost:${WEB_PORT}  (ومن الجوال: http://<عنوان-هذا-الجهاز>:${WEB_PORT})`);
  console.log(`[web] فهرس الحجب: ${policy.indexSize} نطاق`);
});

for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, () => {
    console.log("\n[homenet] إيقاف…");
    store.shutdown();
    dns.stop();
    web.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 1500).unref();
  });
}

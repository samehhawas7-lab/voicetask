"use strict";
// ============================================================
// notify.js — تنبيه ولي الأمر خارج اللوحة.
// خياران: رابط ويب‑هوك عام (POST بصيغة JSON)، أو رسالة تلجرام.
// نحدّ التنبيهات: تنبيه واحد لكل (جهاز + فئة) كل عشر دقائق،
// حتى لا يتحوّل جوالك إلى إنذار متواصل من صفحة واحدة.
// ============================================================

const https = require("https");
const http = require("http");
const { URL } = require("url");
const store = require("./store");

const lastSent = new Map();
const COOLDOWN = 10 * 60 * 1000;

function postJson(urlStr, payload) {
  return new Promise((resolve) => {
    let u;
    try { u = new URL(urlStr); } catch { return resolve(false); }
    const body = JSON.stringify(payload);
    const lib = u.protocol === "http:" ? http : https;
    const req = lib.request(
      {
        hostname: u.hostname,
        port: u.port || (u.protocol === "http:" ? 80 : 443),
        path: u.pathname + u.search,
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Length": Buffer.byteLength(body),
        },
        timeout: 8000,
      },
      (res) => { res.resume(); resolve(res.statusCode < 400); }
    );
    req.on("error", () => resolve(false));
    req.on("timeout", () => { req.destroy(); resolve(false); });
    req.end(body);
  });
}

function arabicTime(ts) {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

async function push(alert) {
  const s = store.getConfig().settings;
  const key = `${alert.dev}|${alert.cat}`;
  const now = Date.now();
  if (lastSent.get(key) && now - lastSent.get(key) < COOLDOWN) return;
  lastSent.set(key, now);

  const text =
    `🚫 محاولة دخول محجوبة\n` +
    `الجهاز: ${alert.name}\n` +
    `الموقع: ${alert.q}\n` +
    `التصنيف: ${alert.catLabel}\n` +
    `الوقت: ${arabicTime(alert.t || now)}`;

  if (s.alertWebhook) await postJson(s.alertWebhook, { ...alert, text });

  if (s.telegramToken && s.telegramChat) {
    await postJson(`https://api.telegram.org/bot${s.telegramToken}/sendMessage`, {
      chat_id: s.telegramChat,
      text,
    });
  }
}

// اختبار الإعدادات من اللوحة
async function test() {
  const s = store.getConfig().settings;
  const payload = { test: true, text: "✅ تجربة تنبيه من تطبيق شبكة البيت" };
  let ok = false;
  if (s.alertWebhook) ok = await postJson(s.alertWebhook, payload) || ok;
  if (s.telegramToken && s.telegramChat) {
    ok = await postJson(`https://api.telegram.org/bot${s.telegramToken}/sendMessage`, {
      chat_id: s.telegramChat, text: payload.text,
    }) || ok;
  }
  return ok;
}

module.exports = { push, test, postJson };

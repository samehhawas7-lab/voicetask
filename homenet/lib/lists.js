"use strict";
// ============================================================
// lists.js — تحديث قوائم الحجب من مصادر عامة.
// القوائم المدمجة بذرة صغيرة؛ هذي تجلب عشرات الآلاف من النطاقات
// وتخزّنها في data/lists/<الفئة>.txt لتُقرأ عند بناء الفهرس.
// ============================================================

const https = require("https");
const http = require("http");
const { URL } = require("url");
const store = require("./store");
const { REMOTE_LISTS } = require("./categories");

function fetch(urlStr, redirects = 4) {
  return new Promise((resolve, reject) => {
    let u;
    try { u = new URL(urlStr); } catch (e) { return reject(new Error("رابط غير صالح")); }
    const lib = u.protocol === "http:" ? http : https;
    const req = lib.get(urlStr, { timeout: 30000, headers: { "User-Agent": "homenet/1.0" } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && redirects > 0) {
        res.resume();
        return fetch(new URL(res.headers.location, urlStr).toString(), redirects - 1).then(resolve, reject);
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error("رد غير متوقع: " + res.statusCode));
      }
      const chunks = [];
      let size = 0;
      res.on("data", (c) => {
        size += c.length;
        if (size > 60 * 1024 * 1024) { req.destroy(); return reject(new Error("الملف كبير جداً")); }
        chunks.push(c);
      });
      res.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    });
    req.on("timeout", () => { req.destroy(); reject(new Error("انتهت المهلة")); });
    req.on("error", reject);
  });
}

const SKIP = new Set(["localhost", "localhost.localdomain", "local", "broadcasthost", "ip6-localhost", "ip6-loopback", "0.0.0.0"]);

// نقبل صيغتين: ملف hosts (عنوان ثم نطاق) أو نطاق في كل سطر
function parseList(text) {
  const out = new Set();
  for (const raw of text.split("\n")) {
    let line = raw.trim();
    if (!line || line[0] === "#" || line[0] === "!") continue;
    const hash = line.indexOf("#");
    if (hash > 0) line = line.slice(0, hash).trim();
    const parts = line.split(/\s+/);
    let domain = parts.length > 1 ? parts[1] : parts[0];
    domain = domain.toLowerCase().replace(/^\*\./, "").replace(/\.$/, "");
    if (!domain || !domain.includes(".") || SKIP.has(domain)) continue;
    if (!/^[a-z0-9._-]+$/.test(domain)) continue;
    out.add(domain);
  }
  return [...out];
}

// تحديث فئة واحدة أو كل الفئات
async function update(cats) {
  const wanted = cats && cats.length ? cats : Object.keys(REMOTE_LISTS);
  const report = {};
  for (const cat of wanted) {
    const urls = REMOTE_LISTS[cat] || [];
    const all = new Set();
    const errors = [];
    for (const url of urls) {
      try {
        const text = await fetch(url);
        for (const d of parseList(text)) all.add(d);
      } catch (e) {
        errors.push(`${url}: ${e.message}`);
      }
    }
    if (all.size) {
      store.saveList(cat, [...all]);
      report[cat] = { count: all.size, errors };
    } else {
      report[cat] = { count: 0, errors: errors.length ? errors : ["لم نحصل على أي نطاق"] };
    }
  }
  return report;
}

module.exports = { update, parseList, fetch };

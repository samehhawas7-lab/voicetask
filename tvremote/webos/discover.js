"use strict";
// ============================================================
// إيجاد التلفزيون في الشبكة بلا عنوان مكتوب سلفاً
//
// لماذا؟ عنوان التلفزيون يتغيّر بعد إعادة تشغيل الراوتر، وكثير من
// راوترات الجيل الخامس لا تتيح حجز العناوين أصلاً. فبدل أن نطالب
// المستخدم بضبط راوتره، نجعل الخادم يعثر على التلفزيون بنفسه.
//
// كيف نميّزه؟ تلفزيونات webOS تفتح المنفذ 3001 وتردّ على طلب HTTPS
// عادي بعبارة "Hello world" — بصمة كافية وسريعة.
// ============================================================

const net = require("net");
const https = require("https");

// شبكات البيت وحدها — نسخة واحدة في survey.js تستثني شبكة Tailscale
// الخاصة، ولا نكرّرها هنا فتفترقا يوماً
const { subnets } = require("./survey");

const TV_PORT = 3001;

function portOpen(ip, port, timeout = 900) {
  return new Promise((res) => {
    const s = new net.Socket();
    let done = false;
    const end = (ok) => { if (!done) { done = true; s.destroy(); res(ok); } };
    s.setTimeout(timeout);
    s.once("connect", () => end(true));
    s.once("timeout", () => end(false));
    s.once("error", () => end(false));
    s.connect(port, ip);
  });
}

// البصمة: تلفزيونات webOS تردّ على GID عادي بـ "Hello world"
function isWebOS(ip, port = TV_PORT, timeout = 2500) {
  return new Promise((res) => {
    const req = https.get(
      { host: ip, port, path: "/", rejectUnauthorized: false, timeout },
      (r) => {
        let body = "";
        r.on("data", (c) => { body += c; if (body.length > 512) r.destroy(); });
        r.on("end", () => res(/hello/i.test(body)));
        r.on("error", () => res(false));
      }
    );
    req.on("timeout", () => { req.destroy(); res(false); });
    req.on("error", () => res(false));
  });
}

/** هل ما زال هذا العنوان تلفزيوناً؟ فحص واحد سريع */
async function verify(ip, port = TV_PORT) {
  if (!ip) return false;
  if (!(await portOpen(ip, port, 1200))) return false;
  return isWebOS(ip, port);
}

/**
 * مسح الشبكة المحلية بحثاً عن تلفزيون webOS.
 * @param {(msg:string)=>void} log
 * @param {string} prefer عنوان يُجرَّب أولاً قبل المسح الكامل
 * @returns {Promise<string|null>}
 */
async function discover(log = () => {}, prefer = "") {
  if (prefer && (await verify(prefer))) return prefer;

  const bases = subnets();
  if (!bases.length) { log("no local network found"); return null; }

  log("searching for the TV in " + bases.map((b) => b + ".x").join(" and ") + " ...");

  const targets = [];
  for (const b of bases) {
    for (let i = 1; i <= 254; i++) {
      const ip = `${b}.${i}`;
      if (ip !== prefer) targets.push(ip);
    }
  }

  // نمسح المنفذ أولاً لأنه رخيص، ثم نتحقّق من البصمة للقلّة التي فتحته
  const open = [];
  let idx = 0;
  await Promise.all(Array.from({ length: 64 }, async () => {
    while (idx < targets.length) {
      const ip = targets[idx++];
      if (await portOpen(ip, TV_PORT)) open.push(ip);
    }
  }));

  for (const ip of open) {
    if (await isWebOS(ip)) { log("OK  TV found at " + ip); return ip; }
  }

  log(open.length
    ? "" + open.length + " host(s) had the port open but none is a webOS TV"
    : "no TV found - check it is plugged in and on the same network");
  return null;
}

module.exports = { discover, verify, subnets };

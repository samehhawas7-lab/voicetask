// ============================================================
// مصر VPN — أين أنا؟  v1.0.0
// يخبر التطبيق: من أين يظهر جوالك الآن، ومن أين تظهر البوّابة
// المسار: /api/where
// ============================================================

"use strict";
const http = require("http");
const https = require("https");
const net = require("net");
const tls = require("tls");
const { URL } = require("url");

const EGRESS = String(process.env.EGYPT_PROXY || "").split(",").map(s => s.trim()).filter(Boolean);
const CODE_SET = !!String(process.env.VPN_CODE || "").trim();
const WG_ENDPOINT = String(process.env.WG_ENDPOINT || "").trim();
const WG_SERVER_PUBKEY = String(process.env.WG_SERVER_PUBKEY || "").trim();
const TIMEOUT = 12000;

// خدمات تُخبرنا بعنواننا الظاهر ودولته
const LOOKUPS = [
  { url: "https://ipwho.is/", pick: (j) => ({ ip: j.ip, country: j.country_code, name: j.country, city: j.city, isp: j.connection && j.connection.isp }) },
  { url: "https://ipinfo.io/json", pick: (j) => ({ ip: j.ip, country: j.country, name: j.country, city: j.city, isp: j.org }) },
  { url: "https://api.country.is/", pick: (j) => ({ ip: j.ip, country: j.country, name: j.country }) },
];

const AR_COUNTRY = { EG: "مصر", SA: "السعودية", AE: "الإمارات", KW: "الكويت", QA: "قطر", BH: "البحرين", OM: "عُمان", JO: "الأردن", US: "أمريكا", DE: "ألمانيا", FR: "فرنسا", GB: "بريطانيا", NL: "هولندا", TR: "تركيا", IE: "أيرلندا", SG: "سنغافورة" };
const FLAG = (cc) => (cc && /^[A-Za-z]{2}$/.test(cc))
  ? String.fromCodePoint(...cc.toUpperCase().split("").map(c => 0x1f1e6 + c.charCodeAt(0) - 65))
  : "🏳️";

// ---------- البوّابة ----------
function parseEgress(raw) {
  try {
    const u = new URL(raw);
    return {
      kind: u.protocol.startsWith("socks") ? "socks5" : "http",
      host: u.hostname,
      port: Number(u.port) || (u.protocol.startsWith("socks") ? 1080 : 8080),
      user: decodeURIComponent(u.username || ""),
      pass: decodeURIComponent(u.password || ""),
    };
  } catch { return null; }
}

function connectHttpTunnel(eg, host, port) {
  return new Promise((resolve, reject) => {
    const headers = { Host: `${host}:${port}` };
    if (eg.user || eg.pass) headers["Proxy-Authorization"] = "Basic " + Buffer.from(`${eg.user}:${eg.pass}`).toString("base64");
    const req = http.request({ host: eg.host, port: eg.port, method: "CONNECT", path: `${host}:${port}`, headers, timeout: TIMEOUT });
    req.once("connect", (res, socket) => {
      if (res.statusCode !== 200) { socket.destroy(); return reject(new Error(`CONNECT ${res.statusCode}`)); }
      socket.setTimeout(0);
      resolve(socket);
    });
    req.once("timeout", () => req.destroy(new Error("مهلة البوّابة")));
    req.once("error", reject);
    req.end();
  });
}

function connectSocks5(eg, host, port) {
  return new Promise((resolve, reject) => {
    const sock = net.connect({ host: eg.host, port: eg.port, timeout: TIMEOUT });
    const fail = (e) => { sock.destroy(); reject(e instanceof Error ? e : new Error(String(e))); };
    let stage = 0;
    sock.once("error", fail);
    sock.once("timeout", () => fail(new Error("مهلة البوّابة")));
    sock.once("connect", () => {
      const methods = (eg.user || eg.pass) ? [0x00, 0x02] : [0x00];
      sock.write(Buffer.from([0x05, methods.length, ...methods]));
    });
    sock.on("data", (d) => {
      if (stage === 0) {
        if (d[0] !== 0x05) return fail(new Error("SOCKS غير صالح"));
        if (d[1] === 0x02) {
          const u = Buffer.from(eg.user), p = Buffer.from(eg.pass);
          sock.write(Buffer.concat([Buffer.from([0x01, u.length]), u, Buffer.from([p.length]), p]));
          stage = 1;
        } else if (d[1] === 0x00) { stage = 2; go(); }
        else return fail(new Error("توثيق غير مدعوم"));
      } else if (stage === 1) {
        if (d[1] !== 0x00) return fail(new Error("بيانات الدخول مرفوضة"));
        stage = 2; go();
      } else {
        if (d[1] !== 0x00) return fail(new Error(`الوجهة مرفوضة (${d[1]})`));
        sock.removeAllListeners("data");
        sock.removeListener("error", fail);
        sock.setTimeout(0);
        resolve(sock);
      }
    });
    function go() {
      const h = Buffer.from(host);
      sock.write(Buffer.concat([Buffer.from([0x05, 0x01, 0x00, 0x03, h.length]), h, Buffer.from([port >> 8, port & 0xff])]));
    }
  });
}

// createConnection تُسنَد على الكائن لا في الخيارات، وإلّا خرج الطلب مباشرةً
// فأخبرَنا بموقع خادم النشر بدل موقع البوّابة المصرية.
function agentFor(eg, hostname) {
  if (!eg) return https.globalAgent;
  const agent = new https.Agent({ keepAlive: false });
  agent.createConnection = (opts, cb) => {
    const open = eg.kind === "socks5" ? connectSocks5 : connectHttpTunnel;
    open(eg, hostname, 443)
      .then((socket) => cb(null, tls.connect({ socket, servername: hostname, ALPNProtocols: ["http/1.1"] })))
      .catch(cb);
  };
  return agent;
}

function getJson(url, eg) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request({
      hostname: u.hostname,
      path: u.pathname + u.search,
      method: "GET",
      headers: { host: u.host, accept: "application/json", "user-agent": "egypt-vpn/1.0" },
      agent: agentFor(eg, u.hostname),
      timeout: TIMEOUT,
    }, (res) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.once("end", () => {
        try { resolve(JSON.parse(Buffer.concat(chunks).toString("utf8"))); }
        catch (e) { reject(new Error("ردّ غير مفهوم")); }
      });
    });
    req.once("timeout", () => req.destroy(new Error("انتهت المهلة")));
    req.once("error", reject);
    req.end();
  });
}

async function locate(eg) {
  let last = "لا توجد خدمة استجابت";
  for (const svc of LOOKUPS) {
    try {
      const j = await getJson(svc.url, eg);
      const r = svc.pick(j) || {};
      if (r.ip) {
        const cc = String(r.country || "").toUpperCase();
        return { ok: true, ip: r.ip, country: cc, flag: FLAG(cc), label: AR_COUNTRY[cc] || r.name || cc || "غير معروف", city: r.city || "", isp: r.isp || "" };
      }
    } catch (e) { last = e.message; }
  }
  return { ok: false, error: last };
}

// ذاكرة قصيرة حتّى لا نُرهق الخدمات
let cache = { at: 0, data: null };

module.exports = async function handler(req, res) {
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");

  const cc = String(req.headers["x-vercel-ip-country"] || "").toUpperCase();
  const city = req.headers["x-vercel-ip-city"] ? decodeURIComponent(String(req.headers["x-vercel-ip-city"])) : "";
  const ip = String(req.headers["x-forwarded-for"] || req.socket.remoteAddress || "").split(",")[0].trim();

  const you = {
    ip,
    country: cc,
    flag: FLAG(cc),
    label: AR_COUNTRY[cc] || cc || "غير معروف",
    city,
    inEgypt: cc === "EG",
  };

  const now = Date.now();
  let gate;
  if (cache.data && now - cache.at < 60000) {
    gate = cache.data;
  } else {
    const eg = EGRESS.length ? parseEgress(EGRESS[0]) : null;
    const found = await locate(eg);
    gate = {
      configured: EGRESS.length > 0,
      count: EGRESS.length,
      kind: eg ? eg.kind : "direct",
      ...found,
      inEgypt: found.ok && found.country === "EG",
    };
    cache = { at: now, data: gate };
  }

  res.end(JSON.stringify({
    you,
    gate,
    tunnel: {
      endpoint: WG_ENDPOINT,
      serverKey: WG_SERVER_PUBKEY,
      ready: !!(WG_ENDPOINT && WG_SERVER_PUBKEY),
    },
    codeRequired: CODE_SET,
    at: new Date().toISOString(),
  }, null, 2));
};

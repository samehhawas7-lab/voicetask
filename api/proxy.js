// ============================================================
// مصر VPN — بوّابة التصفّح  v1.0.0
// تجلب الصفحة من بوّابة مصرية ثمّ تعيد كتابة روابطها لتعمل داخل المتصفّح
// المسار: /api/proxy?u=<العنوان>
// ============================================================

"use strict";
const http = require("http");
const https = require("https");
const net = require("net");
const tls = require("tls");
const zlib = require("zlib");
const { URL } = require("url");

// ---------- إعدادات ----------
const EGRESS = String(process.env.EGYPT_PROXY || "").split(",").map(s => s.trim()).filter(Boolean);
const CODE = String(process.env.VPN_CODE || "").trim();
const MAX_HTML = 8 * 1024 * 1024;   // أكبر صفحة نعيد كتابتها
const TIMEOUT = 20000;

// ترويسات لا تُمرَّر إلى الموقع الهدف
const DROP_REQ = new Set([
  "host", "connection", "keep-alive", "proxy-authorization", "proxy-connection",
  "upgrade", "te", "trailer", "transfer-encoding", "content-length", "cookie",
  "accept-encoding", "x-forwarded-for", "x-forwarded-host", "x-forwarded-proto",
  "x-real-ip", "x-vercel-id", "x-vercel-deployment-url", "x-vercel-forwarded-for",
  "forwarded", "referer", "origin", "sec-fetch-site", "sec-fetch-mode", "sec-fetch-dest",
  "sec-fetch-user", "sec-ch-ua", "sec-ch-ua-mobile", "sec-ch-ua-platform",
]);

// ترويسات لا تُمرَّر إلى المتصفّح
const DROP_RES = new Set([
  "content-encoding", "content-length", "transfer-encoding", "connection", "keep-alive",
  "content-security-policy", "content-security-policy-report-only", "x-frame-options",
  "cross-origin-opener-policy", "cross-origin-embedder-policy", "cross-origin-resource-policy",
  "strict-transport-security", "public-key-pins", "report-to", "nel", "alt-svc",
  "permissions-policy", "feature-policy", "set-cookie", "location", "link",
]);

// ============================================================
// البوّابة: نفق CONNECT أو SOCKS5 إلى الخادم المصري
// ============================================================
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

function pickEgress() {
  if (!EGRESS.length) return null;
  const raw = EGRESS[Math.floor(Math.random() * EGRESS.length)];
  return parseEgress(raw);
}

// نفق عبر بروكسي HTTP بطريقة CONNECT
function connectHttpTunnel(eg, host, port) {
  return new Promise((resolve, reject) => {
    const headers = { Host: `${host}:${port}` };
    if (eg.user || eg.pass) {
      headers["Proxy-Authorization"] = "Basic " + Buffer.from(`${eg.user}:${eg.pass}`).toString("base64");
    }
    const req = http.request({ host: eg.host, port: eg.port, method: "CONNECT", path: `${host}:${port}`, headers, timeout: TIMEOUT });
    req.once("connect", (res, socket) => {
      if (res.statusCode !== 200) { socket.destroy(); return reject(new Error(`بوّابة رفضت الاتصال (${res.statusCode})`)); }
      socket.setTimeout(0);
      resolve(socket);
    });
    req.once("timeout", () => { req.destroy(new Error("انتهت مهلة البوّابة")); });
    req.once("error", reject);
    req.end();
  });
}

// نفق عبر SOCKS5
function connectSocks5(eg, host, port) {
  return new Promise((resolve, reject) => {
    const sock = net.connect({ host: eg.host, port: eg.port, timeout: TIMEOUT });
    const fail = (e) => { sock.destroy(); reject(e instanceof Error ? e : new Error(String(e))); };
    let stage = 0;
    sock.once("error", fail);
    sock.once("timeout", () => fail(new Error("انتهت مهلة البوّابة")));
    sock.once("connect", () => {
      const methods = (eg.user || eg.pass) ? [0x00, 0x02] : [0x00];
      sock.write(Buffer.from([0x05, methods.length, ...methods]));
    });
    sock.on("data", (data) => {
      if (stage === 0) {
        if (data[0] !== 0x05) return fail(new Error("بوّابة SOCKS غير صالحة"));
        if (data[1] === 0x02) {
          const u = Buffer.from(eg.user), p = Buffer.from(eg.pass);
          sock.write(Buffer.concat([Buffer.from([0x01, u.length]), u, Buffer.from([p.length]), p]));
          stage = 1;
        } else if (data[1] === 0x00) { stage = 2; sendConnect(); }
        else return fail(new Error("البوّابة تطلب توثيقاً غير مدعوم"));
      } else if (stage === 1) {
        if (data[1] !== 0x00) return fail(new Error("بيانات دخول البوّابة مرفوضة"));
        stage = 2; sendConnect();
      } else if (stage === 2) {
        if (data[1] !== 0x00) return fail(new Error(`البوّابة رفضت الوجهة (${data[1]})`));
        sock.removeAllListeners("data");
        sock.removeListener("error", fail);
        sock.setTimeout(0);
        resolve(sock);
      }
    });
    function sendConnect() {
      const h = Buffer.from(host);
      sock.write(Buffer.concat([Buffer.from([0x05, 0x01, 0x00, 0x03, h.length]), h, Buffer.from([port >> 8, port & 0xff])]));
    }
  });
}

function openTunnel(eg, host, port) {
  return eg.kind === "socks5" ? connectSocks5(eg, host, port) : connectHttpTunnel(eg, host, port);
}

// وكيل يوجّه كلّ اتصال عبر البوّابة المصرية.
// ملاحظة: لا بدّ من إسناد createConnection على الكائن نفسه — فالوكيل لا يقرؤها
// من الخيارات، ولو أُهملت لخرج الطلبُ مباشرةً وانكشف عنوانك الحقيقي.
function agentFor(target) {
  const eg = pickEgress();
  const secure = target.protocol === "https:";
  if (!eg) return secure ? https.globalAgent : http.globalAgent;
  const agent = new (secure ? https.Agent : http.Agent)({ keepAlive: false, maxSockets: 8 });
  const host = target.hostname;
  const port = Number(target.port) || (secure ? 443 : 80);
  agent.createConnection = (opts, cb) => {
    openTunnel(eg, host, port).then((socket) => {
      cb(null, secure ? tls.connect({ socket, servername: host, ALPNProtocols: ["http/1.1"] }) : socket);
    }).catch(cb);
  };
  return agent;
}

// ============================================================
// الطلب إلى الموقع الهدف
// ============================================================
function upstream(target, { method, headers, body }) {
  return new Promise((resolve, reject) => {
    const mod = target.protocol === "https:" ? https : http;
    const req = mod.request({
      method,
      protocol: target.protocol,
      hostname: target.hostname,
      port: target.port || undefined,
      path: target.pathname + target.search,
      headers: { ...headers, host: target.host },
      agent: agentFor(target),
      timeout: TIMEOUT,
    }, resolve);
    req.once("timeout", () => req.destroy(new Error("انتهت مهلة الموقع")));
    req.once("error", reject);
    if (body && body.length) req.write(body);
    req.end();
  });
}

function drainBody(stream, encoding, limit) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    stream.on("data", (c) => {
      size += c.length;
      if (size > limit) { stream.destroy(); return reject(new Error("الصفحة أكبر من الحدّ المسموح")); }
      chunks.push(c);
    });
    stream.once("error", reject);
    stream.once("end", () => {
      const buf = Buffer.concat(chunks);
      const enc = String(encoding || "").toLowerCase();
      try {
        if (enc === "gzip") return resolve(zlib.gunzipSync(buf));
        if (enc === "deflate") return resolve(zlib.inflateSync(buf));
        if (enc === "br") return resolve(zlib.brotliDecompressSync(buf));
      } catch { /* نُعيد الأصل كما هو */ }
      resolve(buf);
    });
  });
}

// ============================================================
// إعادة كتابة الروابط
// ============================================================
const PREFIX = "/api/proxy?u=";

function proxied(raw, base) {
  const v = String(raw || "").trim();
  if (!v) return v;
  // روابط لا تُلمَس
  if (/^(data:|blob:|javascript:|about:|mailto:|tel:|sms:|whatsapp:|#)/i.test(v)) return v;
  try {
    const abs = new URL(v, base);
    if (abs.protocol !== "http:" && abs.protocol !== "https:") return v;
    return PREFIX + encodeURIComponent(abs.href);
  } catch { return v; }
}

function rewriteCss(css, base) {
  return String(css)
    .replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/gi, (m, q, u) => `url(${q}${proxied(u, base)}${q})`)
    .replace(/@import\s+(['"])([^'"]+)\1/gi, (m, q, u) => `@import ${q}${proxied(u, base)}${q}`);
}

function rewriteSrcset(value, base) {
  return String(value).split(",").map((part) => {
    const s = part.trim();
    if (!s) return "";
    const sp = s.indexOf(" ");
    const url = sp === -1 ? s : s.slice(0, sp);
    const rest = sp === -1 ? "" : s.slice(sp);
    return proxied(url, base) + rest;
  }).filter(Boolean).join(", ");
}

const URL_ATTRS = ["href", "src", "action", "formaction", "poster", "data-src", "data-href", "data-url", "data-lazy-src", "data-background"];

function rewriteHtml(html, base, targetHref) {
  let out = String(html);

  // نزع ما يكسر البوّابة
  out = out.replace(/<meta[^>]+http-equiv=["']?content-security-policy["']?[^>]*>/gi, "");
  out = out.replace(/\s+integrity=(["'])[^"']*\1/gi, "");
  out = out.replace(/\s+nonce=(["'])[^"']*\1/gi, "");
  out = out.replace(/<base[^>]*>/gi, "");

  // <style> ... </style>
  out = out.replace(/(<style[^>]*>)([\s\S]*?)(<\/style>)/gi, (m, a, css, b) => a + rewriteCss(css, base) + b);

  // خصائص تحمل روابط
  const attrRe = new RegExp(`\\s(${URL_ATTRS.join("|")})\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "gi");
  out = out.replace(attrRe, (m, name, dq, sq, uq) => {
    const val = dq !== undefined ? dq : sq !== undefined ? sq : uq;
    const q = dq !== undefined ? '"' : sq !== undefined ? "'" : '"';
    return ` ${name}=${q}${proxied(val, base)}${q}`;
  });

  // srcset / imagesrcset
  out = out.replace(/\s(srcset|imagesrcset)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi, (m, name, dq, sq) => {
    const val = dq !== undefined ? dq : sq;
    const q = dq !== undefined ? '"' : "'";
    return ` ${name}=${q}${rewriteSrcset(val, base)}${q}`;
  });

  // style="... url(...) ..."
  out = out.replace(/\sstyle\s*=\s*"([^"]*)"/gi, (m, css) => ` style="${rewriteCss(css, base).replace(/"/g, "&quot;")}"`);

  // <meta http-equiv="refresh" content="0; url=...">
  out = out.replace(/(<meta[^>]+http-equiv=["']?refresh["']?[^>]*content=["'])([^"']+)(["'])/gi,
    (m, a, content, b) => a + content.replace(/url\s*=\s*(.+)$/i, (mm, u) => "url=" + proxied(u.trim(), base)) + b);

  const runtime = clientRuntime(targetHref);
  if (/<head[^>]*>/i.test(out)) out = out.replace(/<head[^>]*>/i, (m) => m + runtime);
  else out = runtime + out;
  return out;
}

// النصّ الذي يُحقن في الصفحة ليصحّح ما يفوت إعادة الكتابة
function clientRuntime(targetHref) {
  return `<script data-egypt-vpn="1">(function(){
  var BASE=${JSON.stringify(targetHref)}, P=${JSON.stringify(PREFIX)};
  function abs(u){ try{ return new URL(u, BASE).href; }catch(e){ return null; } }
  function wrap(u){
    if(u==null) return u;
    if(u&&typeof u==='object'&&u.url) return u;
    var s=String(u);
    if(!s||/^(data:|blob:|javascript:|about:|mailto:|tel:|#)/i.test(s)) return u;
    if(s.indexOf(P)===0||s.indexOf(location.origin+P)===0) return u;
    var a=abs(s); if(!a) return u;
    return P+encodeURIComponent(a);
  }
  window.__egyptVpn={base:BASE,wrap:wrap};
  var of=window.fetch;
  if(of) window.fetch=function(input,init){
    try{
      if(typeof input==='string') input=wrap(input);
      else if(input&&input.url) input=new Request(wrap(input.url),input);
    }catch(e){}
    return of.call(this,input,init);
  };
  var oo=XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open=function(m,u){
    try{ arguments[1]=wrap(u); }catch(e){}
    return oo.apply(this,arguments);
  };
  ['pushState','replaceState'].forEach(function(k){
    var o=history[k];
    history[k]=function(s,t,u){
      if(u!=null){ try{ BASE=abs(u)||BASE; u=wrap(u); }catch(e){} }
      return o.call(history,s,t,u);
    };
  });
  var ow=window.open;
  window.open=function(u){ var a=[].slice.call(arguments); if(a[0]) a[0]=wrap(a[0]); return ow.apply(window,a); };
  // روابط تُضاف بعد التحميل (SPA)
  document.addEventListener('click',function(e){
    var a=e.target&&e.target.closest&&e.target.closest('a[href]');
    if(!a) return;
    var h=a.getAttribute('href');
    if(!h||h.charAt(0)==='#') return;
    if(h.indexOf(P)===0||h.indexOf(location.origin+P)===0) return;
    if(/^(javascript:|mailto:|tel:|data:|blob:)/i.test(h)) return;
    var w=wrap(h); if(w&&w!==h){ e.preventDefault(); location.href=w; }
  },true);
  // إعلام الصفحة الحاضنة بالعنوان الحالي
  try{ parent.postMessage({egyptVpn:'nav',url:BASE},'*'); }catch(e){}
})();</script>`;
}

// ============================================================
// الكعكات: نعزل كعكات كلّ موقع عن الآخر
// ============================================================
function hostTag(host) {
  let h = 5381;
  for (let i = 0; i < host.length; i++) h = ((h * 33) ^ host.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

function cookiesFor(req, host) {
  const tag = "v" + hostTag(host) + "_";
  const raw = String(req.headers.cookie || "");
  const out = [];
  for (const part of raw.split(";")) {
    const s = part.trim();
    const eq = s.indexOf("=");
    if (eq < 1) continue;
    const name = s.slice(0, eq);
    if (!name.startsWith(tag)) continue;
    out.push(name.slice(tag.length) + "=" + s.slice(eq + 1));
  }
  return out.join("; ");
}

function rewriteSetCookie(list, host) {
  const tag = "v" + hostTag(host) + "_";
  return (list || []).map((c) => {
    const parts = String(c).split(";");
    const kv = parts.shift().trim();
    const eq = kv.indexOf("=");
    if (eq < 1) return null;
    const cooked = [tag + kv.slice(0, eq) + "=" + kv.slice(eq + 1)];
    for (const p of parts) {
      const t = p.trim();
      const low = t.toLowerCase();
      if (low.startsWith("domain=") || low.startsWith("path=") || low === "secure" || low.startsWith("samesite=")) continue;
      cooked.push(t);
    }
    cooked.push("Path=/api/proxy", "SameSite=Lax", "Secure");
    return cooked.join("; ");
  }).filter(Boolean);
}

// ============================================================
// صفحات الخدمة
// ============================================================
function page(res, status, title, body) {
  res.statusCode = status;
  res.setHeader("content-type", "text/html; charset=utf-8");
  res.end(`<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
<style>body{background:#0b1020;color:#e7ecff;font:16px/1.9 system-ui,-apple-system,"Segoe UI",sans-serif;margin:0;display:grid;place-items:center;min-height:100vh;padding:24px}
.card{max-width:520px;background:#141a30;border:1px solid #263257;border-radius:18px;padding:28px;text-align:center}
h1{font-size:20px;margin:0 0 12px}p{color:#a9b6dd;margin:8px 0}a,button{display:inline-block;margin-top:16px;background:#c8102e;color:#fff;border:0;border-radius:12px;padding:12px 22px;font:inherit;text-decoration:none;cursor:pointer}
input{width:100%;box-sizing:border-box;margin-top:14px;padding:12px;border-radius:12px;border:1px solid #2b3a66;background:#0e1428;color:#e7ecff;font:inherit;text-align:center}</style>
<div class="card">${body}</div></html>`);
}

function askCode(res, back) {
  page(res, 401, "رمز الدخول", `<h1>🔒 رمز الدخول</h1>
<p>هذه البوّابة خاصّة. أدخل الرمز للمتابعة.</p>
<form method="GET" action="/api/proxy">
<input type="password" name="code" placeholder="الرمز" autofocus>
<input type="hidden" name="u" value="${String(back || "").replace(/"/g, "&quot;")}">
<button type="submit">دخول</button></form>`);
}

// ============================================================
// المعالِج
// ============================================================
module.exports = async function handler(req, res) {
  const here = new URL(req.url, "http://x");
  const raw = here.searchParams.get("u") || "";
  const code = here.searchParams.get("code") || "";

  // بوّابة الرمز
  if (CODE) {
    const cookie = String(req.headers.cookie || "");
    const ok = code === CODE || new RegExp(`(?:^|;\\s*)vpn_code=${CODE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:;|$)`).test(cookie);
    if (!ok) return askCode(res, raw);
    if (code === CODE) res.setHeader("set-cookie", `vpn_code=${CODE}; Path=/; Max-Age=2592000; HttpOnly; Secure; SameSite=Lax`);
  }

  if (!raw) {
    return page(res, 400, "لا يوجد عنوان", `<h1>لم تحدّد موقعاً</h1><p>افتح التطبيق واكتب عنوان الموقع.</p><a href="/vpn.html">رجوع للتطبيق</a>`);
  }

  let target;
  try {
    target = new URL(/^https?:\/\//i.test(raw) ? raw : "https://" + raw);
    if (!/^https?:$/.test(target.protocol)) throw new Error("بروتوكول غير مدعوم");
    if (!target.hostname.includes(".")) throw new Error("اسم نطاق غير صالح");
  } catch (e) {
    return page(res, 400, "عنوان غير صالح", `<h1>عنوان غير صالح</h1><p>${e.message}</p><a href="/vpn.html">رجوع للتطبيق</a>`);
  }

  // منع الدوران على أنفسنا وعلى الشبكات الداخلية
  if (/^(127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(target.hostname) || target.hostname === "localhost" || /^172\.(1[6-9]|2\d|3[01])\./.test(target.hostname)) {
    return page(res, 403, "ممنوع", `<h1>عنوان داخلي</h1><p>لا يمكن فتح عناوين الشبكة الداخلية.</p><a href="/vpn.html">رجوع</a>`);
  }

  // ترويسات الطلب
  const headers = {};
  for (const [k, v] of Object.entries(req.headers)) {
    if (!DROP_REQ.has(k.toLowerCase())) headers[k] = v;
  }
  headers["accept-encoding"] = "gzip, deflate";
  headers["accept-language"] = headers["accept-language"] || "ar-EG,ar;q=0.9,en-US;q=0.8,en;q=0.7";
  headers["user-agent"] = headers["user-agent"] || "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
  const jar = cookiesFor(req, target.hostname);
  if (jar) headers.cookie = jar;
  const refererFor = here.searchParams.get("ref");
  if (refererFor) headers.referer = refererFor;

  // الجسم (POST وأخواته)
  let body = null;
  if (!["GET", "HEAD"].includes(req.method)) {
    body = await readBody(req);
    if (body && body.length) headers["content-length"] = String(body.length);
  }

  let up;
  try {
    up = await upstream(target, { method: req.method, headers, body });
  } catch (e) {
    const hint = EGRESS.length
      ? "تعذّر الوصول عبر البوّابة المصرية. جرّب مرّة أخرى، أو تأكّد من إعداد <code>EGYPT_PROXY</code>."
      : "لم تُضبط بوّابة مصرية بعد (<code>EGYPT_PROXY</code>)، والاتصال المباشر فشل.";
    // موقع لا يدعم التشفير: نعرض تجربته بـ http بدل تركِ المستعمل في طريقٍ مسدود
    const plain = target.protocol === "https:"
      ? `<p><a href="${PREFIX + encodeURIComponent("http://" + target.host + target.pathname + target.search)}">جرّبه بلا تشفير (http)</a></p>`
      : "";
    return page(res, 502, "تعذّر الفتح", `<h1>تعذّر فتح الموقع</h1><p>${e.message}</p><p>${hint}</p>${plain}<a href="/vpn.html">رجوع للتطبيق</a>`);
  }

  // التحويلات: نُبقيها داخل البوّابة
  const status = up.statusCode || 502;
  if (status >= 300 && status < 400 && up.headers.location) {
    up.resume();
    res.statusCode = status;
    applyCookies(res, up, target.hostname);
    res.setHeader("location", proxied(up.headers.location, target.href));
    return res.end();
  }

  const ctype = String(up.headers["content-type"] || "");
  const isHtml = /text\/html|application\/xhtml/i.test(ctype);
  const isCss = /text\/css/i.test(ctype);

  for (const [k, v] of Object.entries(up.headers)) {
    if (!DROP_RES.has(k.toLowerCase())) res.setHeader(k, v);
  }
  applyCookies(res, up, target.hostname);
  res.statusCode = status;

  if (!isHtml && !isCss) {
    // نمرّر كما هو (صور، فيديو، ملفّات)
    if (up.headers["content-encoding"]) res.setHeader("content-encoding", up.headers["content-encoding"]);
    if (up.headers["content-length"]) res.setHeader("content-length", up.headers["content-length"]);
    return up.pipe(res);
  }

  let buf;
  try {
    buf = await drainBody(up, up.headers["content-encoding"], MAX_HTML);
  } catch (e) {
    return page(res, 502, "تعذّر القراءة", `<h1>تعذّرت قراءة الصفحة</h1><p>${e.message}</p><a href="/vpn.html">رجوع</a>`);
  }

  const charset = (ctype.match(/charset=([\w-]+)/i) || [])[1];
  const text = decodeText(buf, charset);
  const out = isHtml ? rewriteHtml(text, target.href, target.href) : rewriteCss(text, target.href);
  const outBuf = Buffer.from(out, "utf8");
  res.setHeader("content-type", isHtml ? "text/html; charset=utf-8" : "text/css; charset=utf-8");
  res.setHeader("content-length", String(outBuf.length));
  res.end(outBuf);
};

function applyCookies(res, up, host) {
  const sc = up.headers["set-cookie"];
  if (sc && sc.length) {
    const prev = res.getHeader("set-cookie");
    const list = rewriteSetCookie(sc, host);
    res.setHeader("set-cookie", prev ? [].concat(prev, list) : list);
  }
}

function decodeText(buf, charset) {
  const cs = String(charset || "utf-8").toLowerCase();
  try {
    if (/^(utf-?8|us-ascii)$/.test(cs)) return buf.toString("utf8");
    return new TextDecoder(cs).decode(buf);
  } catch { return buf.toString("utf8"); }
}

function readBody(req) {
  // منصّة النشر قد تكون قرأت الجسم قبلنا
  if (req.body !== undefined && req.body !== null) {
    if (Buffer.isBuffer(req.body)) return Promise.resolve(req.body);
    if (typeof req.body === "string") return Promise.resolve(Buffer.from(req.body));
    const ct = String(req.headers["content-type"] || "");
    if (/x-www-form-urlencoded/i.test(ct)) {
      return Promise.resolve(Buffer.from(new URLSearchParams(req.body).toString()));
    }
    return Promise.resolve(Buffer.from(JSON.stringify(req.body)));
  }
  return new Promise((resolve) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.once("end", () => resolve(Buffer.concat(chunks)));
    req.once("error", () => resolve(Buffer.alloc(0)));
  });
}

// للاختبار المحلّي
module.exports._internal = { rewriteHtml, rewriteCss, rewriteSrcset, proxied, rewriteSetCookie, cookiesFor, parseEgress };

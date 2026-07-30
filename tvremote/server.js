"use strict";
// ============================================================
// KMC Web Remote — خادم محلي يشغّل واجهة ويب للتحكم بالتلفزيون
//
// مهم: هذا الخادم لازم يشتغل على جهاز داخل نفس شبكة التلفزيون
// (لابتوب / راسبيري باي / جوال فيه Termux). ما ينفع على Vercel
// لأن السيرفرات السحابية ما توصل لشبكتك المنزلية.
// ============================================================

const http = require("http");
const fs = require("fs");
const path = require("path");
const { TvController } = require("./lib/tv");
const { discover } = require("./lib/discover");
const { APP_LINKS, KEY_MAP } = require("./lib/keys");

const PORT = Number(process.env.PORT || 8099);
const HOST = process.env.BIND || "0.0.0.0";
// اختياري: رمز حماية. لو تم ضبطه، كل الطلبات تحتاجه.
const ACCESS_TOKEN = (process.env.REMOTE_TOKEN || "").trim();

const PUBLIC_DIR = path.join(__dirname, "public");
const tv = new TvController();

// ---------- أدوات مساعدة ----------
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

function readBody(req, limit = 64 * 1024) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
      if (data.length > limit) {
        reject(new Error("حجم الطلب كبير"));
        req.destroy();
      }
    });
    req.on("end", () => {
      if (!data) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch {
        reject(new Error("صيغة JSON غير صحيحة"));
      }
    });
    req.on("error", reject);
  });
}

function authorized(req, url) {
  if (!ACCESS_TOKEN) return true;
  const header = req.headers["x-remote-token"];
  if (header && header === ACCESS_TOKEN) return true;
  if (url.searchParams.get("token") === ACCESS_TOKEN) return true;
  return false;
}

// ---------- الملفات الثابتة ----------
function serveStatic(req, res, pathname) {
  const rel = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const filePath = path.join(PUBLIC_DIR, rel);
  // حماية من الخروج خارج مجلد public
  if (!filePath.startsWith(PUBLIC_DIR + path.sep) && filePath !== path.join(PUBLIC_DIR, "index.html")) {
    return sendJson(res, 403, { error: "ممنوع" });
  }
  fs.readFile(filePath, (err, buf) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      return res.end("غير موجود");
    }
    res.writeHead(200, {
      "Content-Type": MIME[path.extname(filePath)] || "application/octet-stream",
      "Cache-Control": "no-cache",
    });
    res.end(buf);
  });
}

// ---------- بث الحالة المباشر (SSE) ----------
const sseClients = new Set();

function broadcast(state) {
  const payload = `data: ${JSON.stringify(state)}\n\n`;
  for (const res of sseClients) {
    try {
      res.write(payload);
    } catch {
      sseClients.delete(res);
    }
  }
}

tv.on("state", broadcast);

// ---------- المسارات ----------
async function handleApi(req, res, url) {
  const p = url.pathname;
  const method = req.method;

  if (p === "/api/state" && method === "GET") {
    return sendJson(res, 200, tv.state());
  }

  if (p === "/api/events" && method === "GET") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });
    res.write(`data: ${JSON.stringify(tv.state())}\n\n`);
    sseClients.add(res);
    const ping = setInterval(() => {
      try {
        res.write(": ping\n\n");
      } catch {
        /* ينتهي مع close */
      }
    }, 25000);
    req.on("close", () => {
      clearInterval(ping);
      sseClients.delete(res);
    });
    return;
  }

  if (p === "/api/connect" && method === "POST") {
    const body = await readBody(req);
    return sendJson(res, 200, await tv.connect(body.host, { forcePair: !!body.forcePair }));
  }

  if (p === "/api/code" && method === "POST") {
    const body = await readBody(req);
    return sendJson(res, 200, await tv.submitCode(body.code));
  }

  if (p === "/api/key" && method === "POST") {
    const body = await readBody(req);
    tv.sendKey(body.key);
    return sendJson(res, 200, { ok: true, key: body.key });
  }

  if (p === "/api/power" && method === "POST") {
    tv.sendPower();
    return sendJson(res, 200, { ok: true });
  }

  if (p === "/api/app" && method === "POST") {
    const body = await readBody(req);
    const link = APP_LINKS[body.app] || body.link;
    tv.sendAppLink(link);
    return sendJson(res, 200, { ok: true, link });
  }

  if (p === "/api/text" && method === "POST") {
    const body = await readBody(req);
    const count = await tv.sendText(body.text);
    return sendJson(res, 200, { ok: true, sent: count });
  }

  if (p === "/api/disconnect" && method === "POST") {
    tv.disconnect();
    return sendJson(res, 200, tv.state());
  }

  if (p === "/api/forget" && method === "POST") {
    const body = await readBody(req);
    return sendJson(res, 200, tv.forget(body.host));
  }

  if (p === "/api/discover" && method === "GET") {
    const result = await discover();
    return sendJson(res, 200, result);
  }

  if (p === "/api/keys" && method === "GET") {
    return sendJson(res, 200, { keys: Object.keys(KEY_MAP), apps: Object.keys(APP_LINKS) });
  }

  return sendJson(res, 404, { error: "مسار غير معروف" });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

  if (!authorized(req, url)) {
    return sendJson(res, 401, { error: "رمز الوصول مطلوب" });
  }

  if (url.pathname.startsWith("/api/")) {
    try {
      await handleApi(req, res, url);
    } catch (err) {
      if (!res.headersSent) {
        sendJson(res, 400, { error: err && err.message ? err.message : "خطأ غير متوقع" });
      }
    }
    return;
  }

  serveStatic(req, res, url.pathname);
});

server.listen(PORT, HOST, () => {
  const { localSubnets } = require("./lib/discover");
  const hints = localSubnets().map((s) => `${s}.x`);
  console.log("──────────────────────────────────────────");
  console.log("  KMC Web Remote شغّال");
  console.log(`  محلياً:  http://localhost:${PORT}`);
  console.log(`  الشبكة:  http://<IP جهازك>:${PORT}   (${hints.join(", ") || "لا توجد شبكة"})`);
  if (ACCESS_TOKEN) console.log("  الحماية: رمز وصول مفعّل (REMOTE_TOKEN)");
  else console.log("  الحماية: مفتوح لكل من في الشبكة — اضبط REMOTE_TOKEN لتقييده");
  console.log("──────────────────────────────────────────");
});

// إعادة اتصال تلقائي بآخر تلفزيون مقترن عند التشغيل
const { readStore } = require("./lib/tv");
const store = readStore();
if (store.lastHost && (store.devices || {})[store.lastHost]) {
  tv.connect(store.lastHost).catch((e) => console.error("[tv] اتصال تلقائي فشل:", e.message));
}

module.exports = server;

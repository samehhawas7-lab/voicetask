"use strict";
// ============================================================
// تلفزيون webOS وهمي — للاختبار فقط، مو جزء من التطبيق
// يحاكي بروتوكول SSAP: الإقران، الأوامر، ومقبس الأزرار
//
// التشغيل:  node mock-tv.js [port]
// ============================================================

const http = require("http");
const { WebSocketServer } = require("ws");

const PORT = Number(process.argv[2] || 3000);
const CLIENT_KEY = "mock-client-key-0001";

const log = [];               // سجل كل ما يستقبله التلفزيون الوهمي
let volume = 12;
let muted = false;

const server = http.createServer((req, res) => {
  // نقطة فحص للاختبارات: ترجع سجل الأوامر المستلمة
  if (req.url === "/__log") {
    res.writeHead(200, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
    return res.end(JSON.stringify(log));
  }
  res.writeHead(404).end();
});

const wss = new WebSocketServer({ noServer: true });
const pointerWss = new WebSocketServer({ noServer: true });

const POINTER_PATH = "/resources/abc123/netinput.pointer.sock";

server.on("upgrade", (req, socket, head) => {
  const target = req.url.startsWith(POINTER_PATH) ? pointerWss : wss;
  target.handleUpgrade(req, socket, head, (ws) => target.emit("connection", ws, req));
});

// ---------- قناة التحكم ----------
wss.on("connection", (ws) => {
  ws.on("message", (raw) => {
    let msg;
    try { msg = JSON.parse(raw.toString()); } catch { return; }
    log.push({ type: msg.type, uri: msg.uri || null, payload: msg.payload || null });

    // الإقران
    if (msg.type === "register") {
      const hasKey = msg.payload && msg.payload["client-key"] === CLIENT_KEY;
      const respond = () => ws.send(JSON.stringify({
        type: "registered", id: msg.id, payload: { "client-key": CLIENT_KEY }
      }));
      if (hasKey) {
        respond();                       // مفتاح معروف: نقبل فوراً
      } else {
        // إقران جديد: التلفزيون يعرض سؤالاً ثم يوافق المستخدم
        ws.send(JSON.stringify({ type: "response", id: msg.id, payload: { pairingType: "PROMPT" } }));
        setTimeout(respond, 300);
      }
      return;
    }

    if (msg.type !== "request" && msg.type !== "subscribe") return;

    const reply = (payload) => ws.send(JSON.stringify({
      type: "response", id: msg.id, payload: Object.assign({ returnValue: true }, payload)
    }));

    switch (msg.uri) {
      case "ssap://com.webos.service.networkinput/getPointerInputSocket":
        return reply({ socketPath: `ws://127.0.0.1:${PORT}${POINTER_PATH}` });

      case "ssap://audio/getVolume":
        return reply({ volume, muted });

      case "ssap://audio/volumeUp":
        volume = Math.min(100, volume + 1);
        reply({});
        return ws.send(JSON.stringify({ type: "response", id: findSub(ws, "ssap://audio/getVolume"), payload: { volume, muted } }));

      case "ssap://audio/volumeDown":
        volume = Math.max(0, volume - 1);
        return reply({});

      case "ssap://audio/setMute":
        muted = !!(msg.payload && msg.payload.mute);
        return reply({ muted });

      case "ssap://com.webos.applicationManager/listLaunchPoints":
        return reply({ launchPoints: [
          { id: "netflix",            title: "Netflix",     icon: "" },
          { id: "youtube.leanback.v4",title: "YouTube",     icon: "" },
          { id: "com.webos.app.livetv", title: "Live TV",   icon: "" },
          { id: "amazon",             title: "Prime Video", icon: "" },
          { id: "com.webos.app.hdmi1",title: "HDMI 1",      icon: "" }
        ]});

      case "ssap://com.webos.applicationManager/getForegroundAppInfo":
        return reply({ appId: "netflix" });

      default:
        return reply({});
    }
  });
});

// نتتبّع الاشتراكات ببساطة عشان نقدر نبث تحديث الصوت
const subs = new Map();
wss.on("connection", (ws) => {
  ws.on("message", (raw) => {
    try {
      const m = JSON.parse(raw.toString());
      if (m.type === "subscribe") {
        if (!subs.has(ws)) subs.set(ws, {});
        subs.get(ws)[m.uri] = m.id;
      }
    } catch {}
  });
});
function findSub(ws, uri) {
  const map = subs.get(ws);
  return map ? map[uri] : "unknown";
}

// ---------- مقبس الأزرار ----------
pointerWss.on("connection", (ws) => {
  ws.on("message", (raw) => {
    const text = raw.toString();
    const name = (text.match(/name:(\w+)/) || [])[1];
    if (name) log.push({ type: "button", name });
  });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`تلفزيون webOS وهمي على ws://127.0.0.1:${PORT}`);
});

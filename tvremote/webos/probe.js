"use strict";
// ============================================================
// فاحص التلفزيون — يُشغَّل من الجهاز داخل الشبكة
//
// يرفض التلفزيون منحنا الإدخال بـ 401 حتى مع الاتصال من برنامج عادي،
// فالسبب في هوية التطبيق لا في المتصفح. هذا الفاحص يستقصي الأمر:
//   ١. أي المنافذ مفتوحة على التلفزيون
//   ٢. أي عناوين خدمة الإدخال يستجيب لها
//   ٣. هل يتحقق التلفزيون من توقيع بطاقة التعريف أصلاً
//   ٤. أي الأذونات مُنحت فعلاً
//
// التشغيل:  TV_IP=192.168.8.77 node probe.js
// ============================================================

const net = require("net");
const { WebSocket } = require("ws");

const TV = process.env.TV_IP || "192.168.8.77";
const PORT = Number(process.env.TV_PORT || 3001);

const line = (t) => console.log(t);
const head = (t) => { console.log(""); console.log("── " + t + " " + "─".repeat(Math.max(0, 46 - t.length))); };

// ---------- ١) فحص المنافذ ----------
function probePort(port, timeout = 1200) {
  return new Promise((resolve) => {
    const s = new net.Socket();
    let done = false;
    const end = (open) => { if (!done) { done = true; s.destroy(); resolve(open); } };
    s.setTimeout(timeout);
    s.once("connect", () => end(true));
    s.once("timeout", () => end(false));
    s.once("error", () => end(false));
    s.connect(port, TV);
  });
}

async function scanPorts() {
  head("المنافذ المفتوحة على التلفزيون");
  const ports = [80, 443, 1900, 3000, 3001, 3005, 8080, 8001, 9955, 9998, 36866, 1754];
  const open = [];
  for (const p of ports) {
    if (await probePort(p)) { open.push(p); line("  ✓ " + p + " مفتوح"); }
  }
  if (!open.length) line("  ✗ ما فيه منفذ مفتوح — التلفزيون نائم؟");
  return open;
}

// ---------- بطاقة التعريف القياسية ----------
const SIGNED = {
  created: "20140509",
  appId: "com.lge.test",
  vendorId: "com.lge",
  localizedAppNames: { "": "LG Remote App", "ko-KR": "리모트 앱", "zxx-XX": "ЛГ Rэмotэ AПП" },
  localizedVendorNames: { "": "LG Electronics" },
  permissions: ["TEST_SECURE","CONTROL_INPUT_TEXT","CONTROL_MOUSE_AND_KEYBOARD",
    "READ_INSTALLED_APPS","READ_LGE_SDX","READ_NOTIFICATIONS","SEARCH","WRITE_SETTINGS",
    "WRITE_NOTIFICATION_ALERT","CONTROL_POWER","READ_CURRENT_CHANNEL","READ_RUNNING_APPS",
    "READ_UPDATE_INFO","UPDATE_FROM_REMOTE_APP","READ_LGE_TV_INPUT_EVENTS","READ_TV_CURRENT_TIME"],
  serial: "2f930e2d2cfe083771f68e4fe7bb07"
};
const PERMS = ["LAUNCH","LAUNCH_WEBAPP","APP_TO_APP","CLOSE","TEST_OPEN","TEST_PROTECTED",
  "CONTROL_AUDIO","CONTROL_DISPLAY","CONTROL_INPUT_JOYSTICK","CONTROL_INPUT_MEDIA_RECORDING",
  "CONTROL_INPUT_MEDIA_PLAYBACK","CONTROL_INPUT_TV","CONTROL_POWER","READ_APP_STATUS",
  "READ_CURRENT_CHANNEL","READ_INPUT_DEVICE_LIST","READ_NETWORK_STATE","READ_RUNNING_APPS",
  "READ_TV_CHANNEL_LIST","WRITE_NOTIFICATION_TOAST","READ_POWER_STATE","READ_COUNTRY_INFO",
  "READ_SETTINGS","CONTROL_TV_SCREEN","CONTROL_TV_STANBY","CONTROL_FAVORITE_GROUP",
  "CONTROL_USER_INFO","CHECK_BLUETOOTH_DEVICE","CONTROL_BLUETOOTH","CONTROL_TIMER_INFO",
  "STB_INTERNAL_CONNECTION","CONTROL_RECORDING","READ_RECORDING_STATE","WRITE_RECORDING_LIST",
  "READ_RECORDING_LIST","READ_RECORDING_SCHEDULE","WRITE_RECORDING_SCHEDULE",
  "READ_STORAGE_DEVICE_LIST","READ_TV_PROGRAM_INFO","CONTROL_BOX_CHANNEL",
  "READ_TV_ACR_AUTH_TOKEN","READ_TV_CONTENT_STATE","READ_TV_CURRENT_TIME",
  "ADD_LAUNCHER_CHANNEL","SET_CHANNEL_SKIP","CONTROL_CHANNEL_BLOCK","DELETE_SELECT_CHANNEL",
  "CONTROL_CHANNEL_GROUP","SCAN_TV_CHANNELS","CONTROL_TV_POWER","CONTROL_WOL"];
const SIGNATURE = "eyJhbGdvcml0aG0iOiJSU0EtU0hBMjU2Iiwia2V5SWQiOiJ0ZXN0LXNpZ25pbmctY2VydCIsInNpZ25hdHVyZVZlcnNpb24iOjF9.hrVRgjCwXVvE2OOSpDZ58hR+59aFNwYDyjQgKk3auukd7pcegmE2CzPCa0bJ0ZsRAcKkCTJrWo5iDzNhMBWRyaMOv5zWSrthlf7G128qvIlpMT0YNY+n/FaOHE73uLrS/g7swl3/qH/BGFG2Hu4RlL48eb3lLKqTt2xKHdCs6Cd4RMfJPYnzgvI4BNrFUKsjkcu+WD4OO2A27Pq1n50cMchmcaXadJhGrOqH5YmHdOCj5NSHzJYrsW0HPlpuAx/ECMeIZYDh6RMqaFM2DXzdKX9NmmyqzJ3o/0lkk/N97gfVRLW5hA29yeAwaCViZNCP8iC9aO0q9fQojoa7NQnAtw==";

function manifest(extraSigned) {
  const signed = Object.assign({}, SIGNED);
  if (extraSigned) signed.permissions = SIGNED.permissions.concat(extraSigned);
  return {
    manifestVersion: 1, appVersion: "1.1", signed,
    permissions: PERMS,
    signatures: [{ signatureVersion: 1, signature: SIGNATURE }]
  };
}

// ---------- جلسة SSAP ----------
// نجرّب المشفّر ثم العادي — يختلف المفتوح باختلاف الطراز
async function session(opts) {
  const urls = [`wss://${TV}:${PORT}`, `ws://${TV}:3000`];
  let last;
  for (const u of urls) {
    try { return await sessionAt(u, opts || {}); }
    catch (e) { last = e; }
  }
  throw last;
}

function sessionAt(url, { extraSigned, key } = {}) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url, { rejectUnauthorized: false, handshakeTimeout: 8000 });
    const pending = new Map();
    let n = 0;
    const timer = setTimeout(() => { try { ws.close(); } catch {} reject(new Error("مهلة الإقران")); }, 20000);

    ws.on("open", () => {
      const payload = { forcePairing: false, pairingType: "PROMPT", manifest: manifest(extraSigned) };
      if (key) payload["client-key"] = key;
      ws.send(JSON.stringify({ type: "register", id: "register_0", payload }));
    });

    ws.on("message", (raw) => {
      let m; try { m = JSON.parse(raw.toString()); } catch { return; }
      if (m.type === "registered") {
        clearTimeout(timer);
        return resolve({
          url,
          key: m.payload && m.payload["client-key"],
          ask(uri, payload) {
            return new Promise((res) => {
              const id = "p" + (++n);
              pending.set(id, res);
              const msg = { type: "request", id, uri };
              if (payload) msg.payload = payload;
              ws.send(JSON.stringify(msg));
              setTimeout(() => { if (pending.delete(id)) res({ __timeout: true }); }, 4000);
            });
          },
          close(){ try { ws.close(); } catch {} }
        });
      }
      const r = pending.get(m.id);
      if (r) { pending.delete(m.id); r(m); }
    });

    ws.on("error", (e) => { clearTimeout(timer); reject(e); });
    ws.on("close", (c) => { clearTimeout(timer); reject(new Error("أُغلق قبل الإقران (" + c + ")")); });
  });
}

const brief = (m) => {
  if (!m) return "بلا رد";
  if (m.__timeout) return "مهلة";
  if (m.type === "error") return "✗ " + (m.error || "خطأ");
  const p = m.payload || {};
  if (p.socketPath) return "✓✓ عنوان: " + p.socketPath;
  if (p.returnValue === false) return "✗ " + (p.errorText || p.errorCode || "رفض");
  return "✓ " + JSON.stringify(p).slice(0, 110);
};

// ---------- التشغيل ----------
(async () => {
  line("فحص التلفزيون " + TV + ":" + PORT);
  await scanPorts();

  head("الإقران بالبطاقة القياسية");
  let s;
  try {
    s = await session();
    line("  ✓ تم الإقران عبر " + s.url);
  } catch (e) {
    line("  ✗ فشل: " + e.message);
    line("  (وافق من شاشة التلفزيون ثم أعد التشغيل)");
    process.exit(1);
  }

  head("عناوين الإدخال المحتملة");
  const uris = [
    "ssap://com.webos.service.networkinput/getPointerInputSocket",
    "ssap://com.webos.service.networkinput/getPointerInputSocket/",
    "ssap://networkinput/getPointerInputSocket",
    "ssap://com.webos.service.remoteinput/getPointerInputSocket",
    "ssap://com.webos.service.ime/registerRemoteKeyboard",
    "ssap://com.webos.service.ime/sendEnterKey",
    "ssap://com.webos.service.ime/insertText",
    "ssap://com.webos.service.magicremote/getPointerInputSocket",
    "ssap://system.launcher/getAppState",
    "ssap://com.webos.applicationManager/listLaunchPoints"
  ];
  for (const u of uris) {
    const r = await s.ask(u, u.includes("insertText") ? { text: "", replace: false } : undefined);
    line("  " + u.replace("ssap://", "").padEnd(56) + brief(r));
  }

  head("ماذا مُنحنا فعلاً");
  for (const [name, uri] of [
    ["الصوت", "ssap://audio/getVolume"],
    ["القنوات", "ssap://tv/getCurrentChannel"],
    ["النظام", "ssap://system/getSystemInfo"],
    ["الخدمات", "ssap://api/getServiceList"]
  ]) line("  " + name.padEnd(10) + brief(await s.ask(uri)));

  s.close();

  // هل يتحقق التلفزيون من التوقيع؟ نطلب أذونات إدخال داخل الكتلة الموقّعة.
  head("هل يتحقق التلفزيون من توقيع البطاقة؟");
  try {
    const s2 = await session({ extraSigned: ["CONTROL_INPUT_JOYSTICK", "CONTROL_INPUT_TV", "CONTROL_MOUSE_AND_KEYBOARD"] });
    line("  ⚠ قَبِل بطاقة معدّلة — التوقيع غير مُتحقَّق منه!");
    const r = await s2.ask("ssap://com.webos.service.networkinput/getPointerInputSocket");
    line("  الإدخال بعد التعديل: " + brief(r));
    s2.close();
  } catch (e) {
    line("  ✓ رفض البطاقة المعدّلة (" + e.message + ") — التوقيع مُتحقَّق منه");
    line("  إذن لا سبيل لطلب أذونات أوسع دون توقيع من LG");
  }

  line("");
  line("انتهى الفحص. أرسل هذا الناتج كاملاً.");
  process.exit(0);
})();

"use strict";
// ============================================================
// فاحص الأذونات — يبحث عن تركيبة تفتح خدمة الإدخال
//
// كشف الفحص الأول ثلاثاً:
//   • خدمة الإدخال موجودة (ردّت 401 لا 404)
//   • التلفزيون لا يتحقق من توقيع البطاقة، فيقبل ما نضعه فيها
//   • المنفذ 3000 مفتوح ولم يُجرَّب قط
//
// فيجرّب هذا الفاحص المصفوفة كلها: منفذان × هويات × مجموعات أذونات،
// ويبلّغ بأي تركيبة فتحت الإدخال إن وُجدت.
//
// التشغيل:  TV_IP=192.168.8.77 node probe2.js
// ============================================================

const { WebSocket } = require("ws");

const TV = process.env.TV_IP || "192.168.8.77";
const INPUT = "ssap://com.webos.service.networkinput/getPointerInputSocket";
const APPS = "ssap://com.webos.applicationManager/listLaunchPoints";

const SIGNATURE = "eyJhbGdvcml0aG0iOiJSU0EtU0hBMjU2Iiwia2V5SWQiOiJ0ZXN0LXNpZ25pbmctY2VydCIsInNpZ25hdHVyZVZlcnNpb24iOjF9.hrVRgjCwXVvE2OOSpDZ58hR+59aFNwYDyjQgKk3auukd7pcegmE2CzPCa0bJ0ZsRAcKkCTJrWo5iDzNhMBWRyaMOv5zWSrthlf7G128qvIlpMT0YNY+n/FaOHE73uLrS/g7swl3/qH/BGFG2Hu4RlL48eb3lLKqTt2xKHdCs6Cd4RMfJPYnzgvI4BNrFUKsjkcu+WD4OO2A27Pq1n50cMchmcaXadJhGrOqH5YmHdOCj5NSHzJYrsW0HPlpuAx/ECMeIZYDh6RMqaFM2DXzdKX9NmmyqzJ3o/0lkk/N97gfVRLW5hA29yeAwaCViZNCP8iC9aO0q9fQojoa7NQnAtw==";

// كل الأذونات المعروفة في webOS — ما دام التوقيع غير مُتحقَّق منه فلنطلبها كلها
const ALL = ["TEST_SECURE","TEST_OPEN","TEST_PROTECTED","CONTROL_INPUT_TEXT",
  "CONTROL_MOUSE_AND_KEYBOARD","CONTROL_INPUT_JOYSTICK","CONTROL_INPUT_TV",
  "CONTROL_INPUT_MEDIA_PLAYBACK","CONTROL_INPUT_MEDIA_RECORDING","READ_INPUT_DEVICE_LIST",
  "READ_INSTALLED_APPS","READ_LGE_SDX","READ_NOTIFICATIONS","SEARCH","WRITE_SETTINGS",
  "WRITE_NOTIFICATION_ALERT","WRITE_NOTIFICATION_TOAST","CONTROL_POWER","CONTROL_TV_POWER",
  "CONTROL_TV_SCREEN","CONTROL_TV_STANBY","CONTROL_AUDIO","CONTROL_DISPLAY","CONTROL_WOL",
  "READ_CURRENT_CHANNEL","READ_RUNNING_APPS","READ_APP_STATUS","READ_UPDATE_INFO",
  "UPDATE_FROM_REMOTE_APP","READ_LGE_TV_INPUT_EVENTS","READ_TV_CURRENT_TIME",
  "READ_TV_CHANNEL_LIST","READ_NETWORK_STATE","READ_POWER_STATE","READ_SETTINGS",
  "LAUNCH","LAUNCH_WEBAPP","APP_TO_APP","CLOSE","READ_COUNTRY_INFO","CONTROL_USER_INFO",
  "CONTROL_BLUETOOTH","CHECK_BLUETOOTH_DEVICE","CONTROL_TIMER_INFO","STB_INTERNAL_CONNECTION"];

const BASE = ["TEST_SECURE","CONTROL_INPUT_TEXT","CONTROL_MOUSE_AND_KEYBOARD",
  "READ_INSTALLED_APPS","READ_LGE_SDX","READ_NOTIFICATIONS","SEARCH","WRITE_SETTINGS",
  "WRITE_NOTIFICATION_ALERT","CONTROL_POWER","READ_CURRENT_CHANNEL","READ_RUNNING_APPS",
  "READ_UPDATE_INFO","UPDATE_FROM_REMOTE_APP","READ_LGE_TV_INPUT_EVENTS","READ_TV_CURRENT_TIME"];

function manifest(appId, perms) {
  return {
    manifestVersion: 1, appVersion: "1.1",
    signed: {
      created: "20140509", appId, vendorId: "com.lge",
      localizedAppNames: { "": "LG Remote App", "ko-KR": "리모트 앱", "zxx-XX": "ЛГ Rэмotэ AПП" },
      localizedVendorNames: { "": "LG Electronics" },
      permissions: perms,
      serial: "2f930e2d2cfe083771f68e4fe7bb07"
    },
    permissions: perms,
    signatures: [{ signatureVersion: 1, signature: SIGNATURE }]
  };
}

function attempt(url, appId, perms) {
  return new Promise((resolve) => {
    let ws, n = 0, settled = false;
    const pending = new Map();
    const done = (r) => { if (!settled) { settled = true; try { ws.close(); } catch {} resolve(r); } };
    const timer = setTimeout(() => done({ err: "مهلة" }), 15000);

    try { ws = new WebSocket(url, { rejectUnauthorized: false, handshakeTimeout: 6000 }); }
    catch (e) { clearTimeout(timer); return done({ err: e.message }); }

    const ask = (uri) => new Promise((res) => {
      const id = "q" + (++n);
      pending.set(id, res);
      ws.send(JSON.stringify({ type: "request", id, uri }));
      setTimeout(() => { if (pending.delete(id)) res("مهلة"); }, 4000);
    });

    ws.on("open", () => ws.send(JSON.stringify({
      type: "register", id: "register_0",
      payload: { forcePairing: false, pairingType: "PROMPT", manifest: manifest(appId, perms) }
    })));

    ws.on("message", async (raw) => {
      let m; try { m = JSON.parse(raw.toString()); } catch { return; }
      if (m.type === "registered") {
        clearTimeout(timer);
        const inp = await ask(INPUT);
        const apps = await ask(APPS);
        return done({ input: inp, apps });
      }
      const r = pending.get(m.id);
      if (r) {
        pending.delete(m.id);
        r(m.type === "error" ? (m.error || "خطأ")
          : (m.payload && m.payload.socketPath) ? "✓✓ " + m.payload.socketPath
          : "✓ مسموح");
      }
    });

    ws.on("error", (e) => { clearTimeout(timer); done({ err: e.message.slice(0, 40) }); });
    ws.on("close", () => { clearTimeout(timer); done({ err: "أُغلق قبل الإقران" }); });
  });
}

(async () => {
  console.log("فحص الأذونات على " + TV);
  console.log("");

  const urls = [["3001 مشفّر", `wss://${TV}:3001`], ["3000 عادي", `ws://${TV}:3000`]];
  const ids  = ["com.lge.test", "com.lge.app.remote", "com.webos.app.remote", "lgtv"];
  const sets = [["أساسية", BASE], ["كاملة", ALL]];

  let win = null;
  for (const [pname, url] of urls) {
    for (const [sname, perms] of sets) {
      for (const appId of ids) {
        const label = (pname + " · " + sname + " · " + appId).padEnd(46);
        const r = await attempt(url, appId, perms);
        if (r.err) { console.log(label + "— " + r.err); continue; }
        console.log(label + "إدخال: " + String(r.input).slice(0, 34) + "  |  تطبيقات: " + String(r.apps).slice(0, 14));
        if (String(r.input).startsWith("✓✓")) { win = { url, appId, sname, path: r.input }; }
      }
    }
  }

  console.log("");
  if (win) {
    console.log("★★★ وُجدت تركيبة تفتح الإدخال ★★★");
    console.log("   القناة: " + win.url);
    console.log("   الهوية: " + win.appId + " · أذونات " + win.sname);
    console.log("   " + win.path);
  } else {
    console.log("✗ لا تركيبة تفتح الإدخال — التلفزيون يحجبه عن كل هوية جُرّبت.");
  }
  process.exit(0);
})();

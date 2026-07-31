/* ============================================================
   ريموت KMC — نسخة قابلة للحقن (مولّدة آلياً من tv.html)
   لا تعدّل هذا الملف — عدّل tv.html ثم شغّل:
       node tvremote/build-inject.js
   ============================================================ */
(function(){
  "use strict";

  if (window.__kmcRemoteLoaded) { location.reload(); return; }
  window.__kmcRemoteLoaded = true;

  var doc = document;

  // نمسح صفحة التلفزيون ونبني مكانها الواجهة، مع الحفاظ على الأصل
  doc.documentElement.setAttribute("lang", "ar");
  doc.documentElement.setAttribute("dir", "rtl");
  doc.title = "ريموت KMC";

  var head = doc.head || doc.getElementsByTagName("head")[0];
  head.innerHTML = "";

  var vp = doc.createElement("meta");
  vp.name = "viewport";
  vp.content = "width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no";
  head.appendChild(vp);

  var reset = doc.createElement("style");
  reset.textContent = "\n/* ============================================================\n   ريموت KMC — webOS — ملف واحد مستقل، يشتغل بدون خادم\n   ============================================================ */\n:root{\n  --bg:#0b0d12; --surface:#151922; --surface-2:#1d222d; --surface-3:#262c3a;\n  --line:#2c3342; --text:#e8ecf4; --muted:#8a94a8;\n  --accent:#3d8bff; --accent-dim:#1e4a8c;\n  --danger:#e5484d; --ok:#30a46c; --warn:#f5a524; --radius:16px;\n}\n*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}\n[hidden]{display:none !important}\nhtml,body{margin:0;padding:0;background:var(--bg);color:var(--text);\n  font-family:\"SF Arabic\",\"Noto Kufi Arabic\",-apple-system,BlinkMacSystemFont,\"Segoe UI\",Tahoma,sans-serif;\n  overscroll-behavior:none}\nbody{min-height:100dvh;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)}\n.shell{max-width:420px;margin:0 auto;padding:12px 14px 32px}\n\n.topbar{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 4px 16px}\n.brand{display:flex;align-items:center;gap:10px}\n.brand-name{font-size:17px;font-weight:700}\n.brand-sub{font-size:12px;color:var(--muted);margin-top:2px}\n.dot{width:10px;height:10px;border-radius:50%;background:var(--muted);flex:none;transition:background .25s,box-shadow .25s}\n.dot.ready{background:var(--ok);box-shadow:0 0 0 4px rgba(48,163,108,.16)}\n.dot.busy{background:var(--warn);box-shadow:0 0 0 4px rgba(245,165,36,.16)}\n.dot.error{background:var(--danger);box-shadow:0 0 0 4px rgba(229,72,77,.16)}\n.icon-btn{width:40px;height:40px;border-radius:12px;border:1px solid var(--line);\n  background:var(--surface);color:var(--text);font-size:18px;cursor:pointer}\n\n.panel{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius);padding:18px 16px;margin-bottom:16px}\n.panel-title{margin:0 0 14px;font-size:15px;font-weight:700}\n.field{margin-bottom:18px}.field:last-child{margin-bottom:0}\n.field label{display:block;font-size:12px;color:var(--muted);margin-bottom:8px}\n.row{display:flex;gap:8px}.row input{flex:1;min-width:0}\ninput[type=text]{background:var(--surface-2);border:1px solid var(--line);border-radius:12px;color:var(--text);\n  padding:12px 14px;font-size:16px;font-family:inherit;width:100%;outline:none;direction:ltr;text-align:right}\ninput[type=text]:focus{border-color:var(--accent)}\ninput::placeholder{color:#5c6579}\n.hint{font-size:11.5px;color:var(--muted);margin:8px 0 0;line-height:1.7}\n.btn{background:var(--accent);color:#fff;border:none;border-radius:12px;padding:12px 18px;font-size:14px;\n  font-weight:600;font-family:inherit;cursor:pointer;white-space:nowrap;transition:transform .08s,filter .15s}\n.btn:active{transform:scale(.97);filter:brightness(.9)}\n.btn:disabled{opacity:.5}\n.btn.ghost{background:var(--surface-2);border:1px solid var(--line);color:var(--text)}\n.btn.wide{width:100%;margin-top:8px}\n.btn.small{padding:10px 14px;font-size:13px}\n.notice{background:rgba(61,139,255,.09);border:1px solid var(--accent-dim);border-radius:12px;\n  padding:12px 14px;font-size:12.5px;line-height:1.8;color:#cfe0ff;margin-top:14px}\n\n.remote{display:flex;flex-direction:column;gap:14px}\n.key{background:var(--surface-2);border:1px solid var(--line);border-radius:14px;color:var(--text);\n  font-size:19px;font-family:inherit;height:54px;cursor:pointer;display:flex;align-items:center;\n  justify-content:center;transition:transform .06s,background .12s;user-select:none}\n.key:active,.key.pressed{background:var(--surface-3);transform:scale(.94)}\n.key.accent{background:var(--accent-dim);border-color:#2f5f9e}\n.key.power{color:var(--danger);font-size:22px}\n.key.tall{height:60px;font-size:22px}\n.key.small{height:44px;width:52px;font-size:17px;flex:none}\n.row-3{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}\n.row-5{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;direction:ltr}\n.row-5 .key{height:48px;font-size:15px;letter-spacing:-2px}\n\n.dpad{position:relative;width:100%;aspect-ratio:1;max-width:260px;margin:4px auto;\n  background:radial-gradient(circle at 50% 50%,var(--surface-2) 0 32%,var(--surface) 32% 100%);\n  border:1px solid var(--line);border-radius:50%}\n.dpad-btn{position:absolute;border:none;background:transparent;cursor:pointer;width:34%;height:34%;transition:background .12s}\n.dpad-btn::after{content:\"\";position:absolute;inset:0;margin:auto;width:0;height:0;border:9px solid transparent}\n.dpad-btn:active,.dpad-btn.pressed{background:rgba(61,139,255,.14)}\n.dpad-btn.up{top:2%;left:33%;border-radius:50% 50% 8px 8px}\n.dpad-btn.down{bottom:2%;left:33%;border-radius:8px 8px 50% 50%}\n.dpad-btn.left{left:2%;top:33%;border-radius:50% 8px 8px 50%}\n.dpad-btn.right{right:2%;top:33%;border-radius:8px 50% 50% 8px}\n.dpad-btn.up::after{border-bottom-color:var(--text);margin-bottom:14px}\n.dpad-btn.down::after{border-top-color:var(--text);margin-top:14px}\n.dpad-btn.left::after{border-right-color:var(--text);margin-right:14px}\n.dpad-btn.right::after{border-left-color:var(--text);margin-left:14px}\n.dpad-ok{position:absolute;inset:0;margin:auto;width:34%;height:34%;border-radius:50%;\n  background:var(--surface-3);border:1px solid var(--line);color:var(--text);font-size:15px;\n  font-weight:700;font-family:inherit;cursor:pointer;transition:transform .07s,background .12s}\n.dpad-ok:active,.dpad-ok.pressed{background:var(--accent-dim);transform:scale(.92)}\n\n.rockers{display:grid;grid-template-columns:1fr 1.15fr 1fr;gap:10px;align-items:center}\n.rocker{display:flex;flex-direction:column;gap:6px;background:var(--surface);border:1px solid var(--line);\n  border-radius:var(--radius);padding:8px}\n.rocker-label{text-align:center;font-size:11px;color:var(--muted)}\n.rocker-mid{display:flex;flex-direction:column;gap:8px}\n.rocker-mid .key{height:44px;font-size:15px}\n\n.typing{display:flex;gap:8px;align-items:center}\n.typing input{flex:1;min-width:0;direction:rtl;text-align:right}\n\n.apps{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;max-height:212px;overflow-y:auto;\n  -webkit-overflow-scrolling:touch}\n.app{background:var(--surface-2);border:1px solid var(--line);border-radius:12px;color:var(--text);\n  font-size:10.5px;font-family:inherit;font-weight:600;min-height:62px;cursor:pointer;padding:6px 3px;\n  display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;\n  transition:transform .07s,background .12s;overflow:hidden}\n.app:active{background:var(--surface-3);transform:scale(.95)}\n.app img{width:26px;height:26px;border-radius:6px;object-fit:cover}\n.app span{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}\n\n.numpad-wrap{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius);padding:12px 14px}\n.numpad-wrap summary{cursor:pointer;font-size:13px;color:var(--muted);list-style:none}\n.numpad-wrap summary::-webkit-details-marker{display:none}\n.numpad-wrap summary::before{content:\"▾ \"}\n.numpad-wrap[open] summary::before{content:\"▴ \"}\n.numpad{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:12px}\n.numpad .key{height:48px;font-size:17px}\n\n.now-playing{text-align:center;font-size:11.5px;color:var(--muted);padding:6px;direction:ltr;word-break:break-all}\n.vol-badge{display:inline-block;background:var(--surface-3);border-radius:999px;padding:2px 10px;font-size:11px;color:var(--text)}\n\n.proto{background:var(--surface);border:1px solid var(--accent-dim);border-radius:var(--radius);padding:12px 14px}\n.proto-head{display:flex;justify-content:space-between;align-items:center;font-size:12.5px;\n  color:#cfe0ff;font-weight:600;margin-bottom:8px}\n.proto-head button{background:var(--surface-2);border:1px solid var(--line);color:var(--muted);\n  border-radius:8px;padding:5px 12px;font-size:11px;font-family:inherit;cursor:pointer}\n.proto pre{background:#0d1017;border:1px solid var(--line);border-radius:10px;padding:10px;\n  font-size:10px;line-height:1.65;color:#8fd0a0;direction:ltr;text-align:left;\n  white-space:pre-wrap;word-break:break-word;height:170px;overflow-y:auto;margin:0 0 10px}\n.demo-tag{background:var(--warn);color:#3d2c00;font-size:10px;font-weight:700;\n  border-radius:6px;padding:2px 7px;margin-right:6px}\n\n.diag{margin-top:14px;border-top:1px solid var(--line);padding-top:12px}\n.diag summary{cursor:pointer;font-size:12px;color:var(--muted);list-style:none}\n.diag summary::-webkit-details-marker{display:none}\n.diag summary::before{content:\"▾ \"}\n.diag[open] summary::before{content:\"▴ \"}\n.diag pre{background:#0d1017;border:1px solid var(--line);border-radius:10px;padding:10px;\n  font-size:10.5px;line-height:1.7;color:#a9b4c7;direction:ltr;text-align:left;\n  white-space:pre-wrap;word-break:break-word;max-height:220px;overflow-y:auto;margin:10px 0}\n\n.toast{position:fixed;left:50%;bottom:calc(24px + env(safe-area-inset-bottom));transform:translateX(-50%);\n  background:var(--surface-3);border:1px solid var(--line);color:var(--text);padding:12px 18px;\n  border-radius:12px;font-size:13px;max-width:90vw;text-align:center;z-index:50;\n  box-shadow:0 8px 28px rgba(0,0,0,.45)}\n.toast.error{border-color:var(--danger)}\n@media (prefers-reduced-motion:reduce){*{animation:none !important;transition:none !important}}\n";
  head.appendChild(reset);

  doc.body.innerHTML = "\n<div class=\"shell\">\n\n  <header class=\"topbar\">\n    <div class=\"brand\">\n      <span class=\"dot\" id=\"statusDot\"></span>\n      <div>\n        <div class=\"brand-name\">ريموت KMC</div>\n        <div class=\"brand-sub\" id=\"statusText\">غير متصل</div>\n      </div>\n    </div>\n    <button class=\"icon-btn\" id=\"settingsBtn\" aria-label=\"الإعدادات\">⚙</button>\n  </header>\n\n  <!-- ===== التوصيل ===== -->\n  <section class=\"panel\" id=\"setupPanel\">\n    <h2 class=\"panel-title\">توصيل التلفزيون</h2>\n    <div class=\"field\">\n      <label for=\"ipInput\">عنوان IP للتلفزيون</label>\n      <div class=\"row\">\n        <input id=\"ipInput\" type=\"text\" inputmode=\"decimal\" placeholder=\"192.168.8.77\" autocomplete=\"off\">\n        <button class=\"btn\" id=\"connectBtn\">توصيل</button>\n      </div>\n      <p class=\"hint\">تلقاه في: الإعدادات ← الاتصال ← إعدادات Wi-Fi ← متقدم</p>\n    </div>\n\n    <div class=\"field\">\n      <button class=\"btn ghost wide\" id=\"demoBtn\">🧪 جرّب بدون تلفزيون — وضع التعلّم</button>\n      <p class=\"hint\">تلفزيون محاكى داخل الصفحة. تضغط الأزرار وتشوف رسائل\n        البروتوكول الحقيقية اللي كانت راح تنرسل. ما يحتاج شبكة ولا شهادات.</p>\n    </div>\n    <div id=\"setupNotice\" class=\"notice\" hidden></div>\n\n    <details class=\"diag\" id=\"diagWrap\">\n      <summary>تفاصيل تقنية</summary>\n      <pre id=\"diagLog\"></pre>\n      <button class=\"btn ghost wide\" id=\"copyDiagBtn\">نسخ التفاصيل</button>\n    </details>\n  </section>\n\n  <!-- ===== انتظار الموافقة ===== -->\n  <section class=\"panel\" id=\"pairPanel\" hidden>\n    <h2 class=\"panel-title\">وافق من التلفزيون</h2>\n    <p class=\"hint\" style=\"font-size:13px\">\n      ظهرت على شاشة التلفزيون رسالة تسأل عن السماح لهذا الجهاز.<br>\n      اضغط <b>«موافق / Yes»</b> بريموت التلفزيون الأصلي.<br><br>\n      مرة وحدة بس — بعدها يتذكرك.\n    </p>\n    <button class=\"btn ghost wide\" id=\"cancelPairBtn\">إلغاء</button>\n  </section>\n\n  <!-- ===== الريموت ===== -->\n  <main class=\"remote\" id=\"remote\" hidden>\n    <div class=\"row-3\">\n      <button class=\"key power\" data-cmd=\"power\" title=\"إطفاء\">⏻</button>\n      <button class=\"key\" data-cmd=\"mute\" title=\"كتم\">🔇</button>\n      <button class=\"key\" data-btn=\"MENU\" title=\"القائمة\">☰</button>\n    </div>\n\n    <div class=\"dpad\">\n      <button class=\"dpad-btn up\"    data-btn=\"UP\"    aria-label=\"فوق\"></button>\n      <button class=\"dpad-btn down\"  data-btn=\"DOWN\"  aria-label=\"تحت\"></button>\n      <button class=\"dpad-btn left\"  data-btn=\"LEFT\"  aria-label=\"يسار\"></button>\n      <button class=\"dpad-btn right\" data-btn=\"RIGHT\" aria-label=\"يمين\"></button>\n      <button class=\"dpad-ok\"        data-btn=\"ENTER\">OK</button>\n    </div>\n\n    <div class=\"row-3\">\n      <button class=\"key\" data-btn=\"BACK\" title=\"رجوع\">↩</button>\n      <button class=\"key\" data-btn=\"HOME\" title=\"الرئيسية\">⌂</button>\n      <button class=\"key\" data-btn=\"EXIT\" title=\"خروج\">✕</button>\n    </div>\n\n    <div class=\"rockers\">\n      <div class=\"rocker\">\n        <button class=\"key tall\" data-cmd=\"volUp\" data-repeat>＋</button>\n        <span class=\"rocker-label\" id=\"volLabel\">الصوت</span>\n        <button class=\"key tall\" data-cmd=\"volDown\" data-repeat>－</button>\n      </div>\n      <div class=\"rocker-mid\">\n        <button class=\"key\" data-btn=\"INFO\" title=\"معلومات\">ℹ</button>\n        <button class=\"key\" data-cmd=\"livetv\" title=\"التلفزيون\">TV</button>\n        <button class=\"key\" data-btn=\"CC\" title=\"ترجمة\">CC</button>\n      </div>\n      <div class=\"rocker\">\n        <button class=\"key tall\" data-cmd=\"chUp\" data-repeat>▲</button>\n        <span class=\"rocker-label\">القناة</span>\n        <button class=\"key tall\" data-cmd=\"chDown\" data-repeat>▼</button>\n      </div>\n    </div>\n\n    <div class=\"row-5\">\n      <button class=\"key\" data-cmd=\"rewind\" title=\"إرجاع\">◀◀</button>\n      <button class=\"key\" data-cmd=\"play\" title=\"تشغيل\">▶</button>\n      <button class=\"key accent\" data-cmd=\"pause\" title=\"إيقاف مؤقت\">❚❚</button>\n      <button class=\"key\" data-cmd=\"stop\" title=\"إيقاف\">■</button>\n      <button class=\"key\" data-cmd=\"forward\" title=\"تقديم\">▶▶</button>\n    </div>\n\n    <!-- الكتابة: webOS يدعم العربي هنا -->\n    <div class=\"typing\">\n      <input id=\"textInput\" type=\"text\" placeholder=\"اكتب بالعربي أو الإنجليزي…\" autocomplete=\"off\">\n      <button class=\"btn small\" id=\"sendTextBtn\">إرسال</button>\n      <button class=\"key small\" data-cmd=\"del\" title=\"مسح\">⌫</button>\n    </div>\n\n    <div class=\"apps\" id=\"appsGrid\"></div>\n\n    <details class=\"numpad-wrap\">\n      <summary>لوحة الأرقام</summary>\n      <div class=\"numpad\">\n        <button class=\"key\" data-btn=\"1\">1</button>\n        <button class=\"key\" data-btn=\"2\">2</button>\n        <button class=\"key\" data-btn=\"3\">3</button>\n        <button class=\"key\" data-btn=\"4\">4</button>\n        <button class=\"key\" data-btn=\"5\">5</button>\n        <button class=\"key\" data-btn=\"6\">6</button>\n        <button class=\"key\" data-btn=\"7\">7</button>\n        <button class=\"key\" data-btn=\"8\">8</button>\n        <button class=\"key\" data-btn=\"9\">9</button>\n        <button class=\"key\" data-btn=\"DASH\">−</button>\n        <button class=\"key\" data-btn=\"0\">0</button>\n        <button class=\"key\" data-btn=\"ENTER\">↵</button>\n      </div>\n    </details>\n\n    <!-- يظهر في وضع التعلّم فقط: الرسائل الفعلية على السلك -->\n    <div class=\"proto\" id=\"protoWrap\" hidden>\n      <div class=\"proto-head\">\n        <span>📡 رسائل البروتوكول</span>\n        <button id=\"protoClear\">مسح</button>\n      </div>\n      <pre id=\"protoLog\"></pre>\n      <p class=\"hint\" style=\"margin:0\">\n        <b>request</b> = أمر JSON على قناة التحكم (المنفذ 3001).<br>\n        <b>button</b> = نص خام على قناة الأزرار — أسرع، لهذا التنقل يستخدمها.\n      </p>\n    </div>\n\n    <div class=\"now-playing\" id=\"nowPlaying\" hidden></div>\n  </main>\n\n  <div class=\"toast\" id=\"toast\" hidden></div>\n</div>\n\n";

  // ---------- منطق التطبيق ----------

/* ============================================================
   بروتوكول SSAP الخاص بـ webOS
   - قناة التحكم:  ws://<ip>:3000  أو  wss://<ip>:3001
   - قناة الأزرار: مقبس منفصل نطلب عنوانه من التلفزيون
   ============================================================ */

const $ = (id) => document.getElementById(id);

// ---------- سجل التشخيص ----------
// الهدف: لو ما اشتغل شي، يعرف المستخدم وين وقف بالضبط بدل "ما بيعمل شي"
const diagLines = [];
function diag(line){
  const t = new Date().toLocaleTimeString("en-GB");
  diagLines.push(t + "  " + line);
  const el = document.getElementById("diagLog");
  if (el){
    el.textContent = diagLines.join("\n");
    el.scrollTop = el.scrollHeight;
  }
}

// بطاقة تعريف التطبيق — التلفزيون يطلبها عند الإقران
const MANIFEST = {
  manifestVersion: 1,
  appVersion: "1.1",
  signed: {
    created: "20140509",
    appId: "com.lge.test",
    vendorId: "com.lge",
    localizedAppNames: { "": "KMC Web Remote", "ar-SA": "ريموت KMC" },
    localizedVendorNames: { "": "LG Electronics" },
    permissions: ["TEST_SECURE","CONTROL_INPUT_TEXT","CONTROL_MOUSE_AND_KEYBOARD",
      "READ_INSTALLED_APPS","READ_LGE_SDX","READ_NOTIFICATIONS","SEARCH","WRITE_SETTINGS",
      "WRITE_NOTIFICATION_ALERT","CONTROL_POWER","READ_CURRENT_CHANNEL","READ_RUNNING_APPS",
      "READ_UPDATE_INFO","UPDATE_FROM_REMOTE_APP","READ_LGE_TV_INPUT_EVENTS","READ_TV_CURRENT_TIME"],
    serial: "2f930e2d2cfe083771f68e4fe7bb07"
  },
  permissions: ["LAUNCH","LAUNCH_WEBAPP","APP_TO_APP","CLOSE","TEST_OPEN","TEST_PROTECTED",
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
    "CONTROL_CHANNEL_GROUP","SCAN_TV_CHANNELS","CONTROL_TV_POWER","CONTROL_WOL"],
  signatures: [{
    signatureVersion: 1,
    signature: "eyJhbGdvcml0aG0iOiJSU0EtU0hBMjU2Iiwia2V5SWQiOiJ0ZXN0LXNpZ25pbmctY2VydCIsInNpZ25hdHVyZVZlcnNpb24iOjF9.hrVRgjCwXVvE2OOSpDZ58hR+59aFNwYDyjQgKk3auukd7pcegmE2CzPCa0bJ0ZsRAcKkCTJrWo5iDzNhMBWRyaMOv5zWSrthlf7G128qvIlpMT0YNY+n/FaOHE73uLrS/g7swl3/qH/BGFG2Hu4RlL48eb3lLKqTt2xKHdCs6Cd4RMfJPYnzgvI4BNrFUKsjkcu+WD4OO2A27Pq1n50cMchmcaXadJhGrOqH5YmHdOCj5NSHzJYrsW0HPlpuAx/ECMeIZYDh6RMqaFM2DXzdKX9NmmyqzJ3o/0lkk/N97gfVRLW5hA29yeAwaCViZNCP8iC9aO0q9fQojoa7NQnAtw=="
  }]
};

// أوامر SSAP المستخدمة
const SSAP = {
  power:   "ssap://system/turnOff",
  volUp:   "ssap://audio/volumeUp",
  volDown: "ssap://audio/volumeDown",
  setMute: "ssap://audio/setMute",
  getVol:  "ssap://audio/getVolume",
  chUp:    "ssap://tv/channelUp",
  chDown:  "ssap://tv/channelDown",
  play:    "ssap://media.controls/play",
  pause:   "ssap://media.controls/pause",
  stop:    "ssap://media.controls/stop",
  rewind:  "ssap://media.controls/rewind",
  forward: "ssap://media.controls/fastForward",
  launch:  "ssap://system.launcher/launch",
  apps:    "ssap://com.webos.applicationManager/listLaunchPoints",
  fgApp:   "ssap://com.webos.applicationManager/getForegroundAppInfo",
  insert:  "ssap://com.webos.service.ime/insertText",
  del:     "ssap://com.webos.service.ime/deleteCharacters",
  enter:   "ssap://com.webos.service.ime/sendEnterKey",
  pointer: "ssap://com.webos.service.networkinput/getPointerInputSocket"
};

// تخزين بسيط يتحمّل منع التخزين في بعض المتصفحات
const store = {
  get(k){ try { return localStorage.getItem(k); } catch { return this._m && this._m[k]; } },
  set(k,v){ try { localStorage.setItem(k,v); } catch { (this._m = this._m||{})[k]=v; } },
  del(k){ try { localStorage.removeItem(k); } catch { if(this._m) delete this._m[k]; } }
};

// ---------- المتحكم ----------
class WebOSRemote {
  constructor(){
    this.ws = null;
    this.pointer = null;
    this.ip = null;
    this.counter = 0;
    this.pending = new Map();
    this.status = "disconnected";
    this.onStatus = () => {};
    this.onVolume = () => {};
    this.onApp = () => {};
    this.onApps = () => {};
  }

  _set(status, detail){
    this.status = status;
    this.onStatus(status, detail);
  }

  // الصفحة على https تفرض wss؛ غير كذا نجرّب العادي أول لأنه بدون مشاكل شهادات
  _urls(ip){
    return location.protocol === "https:"
      ? ["wss://" + ip + ":3001"]
      : ["ws://" + ip + ":3000", "wss://" + ip + ":3001"];
  }

  async connect(ip){
    this.disconnect();
    this.ip = ip;
    const urls = this._urls(ip);
    let lastError = null;

    diag("── محاولة اتصال بـ " + ip + " ──");
    diag("الصفحة مفتوحة عبر: " + location.protocol);
    diag("سيتم تجربة: " + urls.join("  ثم  "));

    for (let i = 0; i < urls.length; i++){
      const url = urls[i];
      this._set("connecting", "جاري التجربة " + (i+1) + " من " + urls.length + "…");
      diag("→ " + url);
      try {
        await this._open(url);
        diag("✓ نجح الاتصال");
        return;
      } catch (e) {
        lastError = e;
        diag("✗ " + e.message);
      }
    }
    diag("انتهت كل المحاولات بالفشل");
    this._set("error", lastError ? lastError.message : "تعذّر الاتصال");
  }

  _open(url){
    return new Promise((resolve, reject) => {
      let ws;
      try { ws = new WebSocket(url); } catch (e) { return reject(new Error("رابط غير صالح")); }

      // مهلة قصيرة: التلفزيون المطفي ما يرد أبداً، وما نبي المستخدم ينتظر طويل
      const timer = setTimeout(() => {
        try { ws.close(); } catch {}
        reject(new Error("ما فيه رد خلال ٥ ثوانٍ"));
      }, 5000);

      let settled = false;
      const done = (fn, arg) => { if (settled) return; settled = true; clearTimeout(timer); fn(arg); };

      ws.onopen = () => {
        this.ws = ws;
        diag("   المقبس انفتح، جاري إرسال طلب الإقران");
        const key = store.get("webos_key_" + this.ip);
        diag("   مفتاح محفوظ: " + (key ? "نعم" : "لا — التلفزيون بيسأل عن الموافقة"));
        const payload = { forcePairing:false, pairingType:"PROMPT", manifest: MANIFEST };
        if (key) payload["client-key"] = key;
        ws.send(JSON.stringify({ type:"register", id:"register_0", payload }));
        // ما نعتبرها ناجحة إلا بعد ردّ registered
        if (!key) this._set("pairing");
      };

      ws.onmessage = (event) => {
        let msg;
        try { msg = JSON.parse(event.data); } catch { return; }

        if (msg.type === "registered" && msg.payload && msg.payload["client-key"]){
          store.set("webos_key_" + this.ip, msg.payload["client-key"]);
          store.set("webos_ip", this.ip);
          this._set("ready");
          this._afterReady();
          return done(resolve);
        }

        if (msg.type === "error" && msg.id === "register_0"){
          // مفتاح قديم مرفوض: نمسحه ونعيد الإقران
          store.del("webos_key_" + this.ip);
          return done(reject, new Error("رُفض الإقران — جرّب مرة ثانية"));
        }

        const entry = this.pending.get(msg.id);
        if (entry){
          if (!entry.keep) this.pending.delete(msg.id);
          entry.handler(msg.payload || {});
        }
      };

      ws.onerror = () => {
        diag("   خطأ في المقبس (غالباً: المنفذ مقفل، أو شهادة مرفوضة، أو المتصفح منع الاتصال)");
        done(reject, new Error("فشل الاتصال بـ " + url));
      };
      ws.onclose = () => {
        if (this.ws === ws){ this.ws = null; if (this.status === "ready") this._set("disconnected"); }
        done(reject, new Error("انقطع الاتصال"));
      };
    });
  }

  // بعد الجاهزية: نفتح قناة الأزرار ونشترك في الصوت والتطبيق الحالي
  async _afterReady(){
    try {
      const res = await this.request(SSAP.pointer);
      if (res && res.socketPath) this._openPointer(res.socketPath);
    } catch {}
    this.subscribe(SSAP.getVol, (p) => this.onVolume(p));
    this.subscribe(SSAP.fgApp, (p) => this.onApp(p && p.appId));
    this.request(SSAP.apps).then((p) => {
      if (p && p.launchPoints) this.onApps(p.launchPoints);
    }).catch(() => {});
  }

  _openPointer(path){
    try {
      const ws = new WebSocket(path);
      ws.onopen = () => { this.pointer = ws; };
      ws.onclose = () => { if (this.pointer === ws) this.pointer = null; };
      ws.onerror = () => {};
    } catch {}
  }

  _send(type, uri, payload, handler, keep){
    if (!this.ws || this.ws.readyState !== 1) throw new Error("التلفزيون غير متصل");
    const id = "cmd_" + (++this.counter);
    if (handler) this.pending.set(id, { handler, keep });
    this.ws.send(JSON.stringify({ type, id, uri, payload: payload || {} }));
    return id;
  }

  request(uri, payload){
    return new Promise((resolve, reject) => {
      let id;
      const timer = setTimeout(() => { this.pending.delete(id); reject(new Error("انتهت المهلة")); }, 6000);
      try {
        id = this._send("request", uri, payload, (p) => { clearTimeout(timer); resolve(p); }, false);
      } catch (e) { clearTimeout(timer); reject(e); }
    });
  }

  subscribe(uri, handler){
    try { this._send("subscribe", uri, null, handler, true); } catch {}
  }

  // زر من قناة الأزرار (أسرع بكثير من SSAP للتنقل)
  button(name){
    if (!this.pointer || this.pointer.readyState !== 1) throw new Error("قناة الأزرار غير جاهزة");
    this.pointer.send("type:button\nname:" + name + "\n\n");
  }

  disconnect(){
    for (const s of [this.ws, this.pointer]){
      if (s) { try { s.onclose = null; s.close(); } catch {} }
    }
    this.ws = this.pointer = null;
    this.pending.clear();
    this._set("disconnected");
  }

  forget(){
    if (this.ip) store.del("webos_key_" + this.ip);
    store.del("webos_ip");
    this.disconnect();
  }
}

// ============================================================
//  الواجهة
// ============================================================
const tv = new WebOSRemote();
let muted = false;

let toastTimer = null;
function toast(msg, isError){
  const el = $("toast");
  el.textContent = msg;
  el.classList.toggle("error", !!isError);
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.hidden = true, 2600);
}
function buzz(ms){ if (navigator.vibrate) navigator.vibrate(ms || 12); }

const STATUS_TEXT = {
  disconnected:"غير متصل", connecting:"جاري الاتصال…",
  pairing:"بانتظار موافقتك على التلفزيون", ready:"متصل", error:"فشل الاتصال"
};

tv.onStatus = (status, detail) => {
  const dot = $("statusDot");
  dot.className = "dot";
  if (status === "ready") dot.classList.add("ready");
  else if (status === "error") dot.classList.add("error");
  else if (status !== "disconnected") dot.classList.add("busy");

  $("statusText").textContent = detail || (status === "ready" && tv.ip ? "متصل بـ " + tv.ip : STATUS_TEXT[status]);

  $("remote").hidden     = status !== "ready";
  $("pairPanel").hidden  = status !== "pairing";
  $("setupPanel").hidden = (status === "ready" || status === "pairing");
  $("connectBtn").disabled = status === "connecting";

  if (status === "error") showTroubleshoot(detail);
};

tv.onVolume = (p) => {
  if (!p || typeof p.volume !== "number") return;
  muted = !!p.muted;
  $("volLabel").innerHTML = '<span class="vol-badge">' + (muted ? "مكتوم" : p.volume) + '</span>';
};

tv.onApp = (appId) => {
  const el = $("nowPlaying");
  el.hidden = !appId;
  el.textContent = appId || "";
};

// شبكة التطبيقات تُبنى من التطبيقات المثبتة فعلاً على التلفزيون
tv.onApps = (points) => {
  const grid = $("appsGrid");
  grid.innerHTML = "";
  const skip = /^(com\.webos\.app\.(hdmi|component|av|externalinput)|com\.webos\.exampleapp)/;
  points
    .filter(p => p.id && p.title && !skip.test(p.id))
    .sort((a,b) => (a.title||"").localeCompare(b.title||""))
    .forEach(p => {
      const btn = document.createElement("button");
      btn.className = "app";
      if (p.icon){
        const img = document.createElement("img");
        img.src = p.icon;
        img.onerror = () => img.remove();
        btn.appendChild(img);
      }
      const label = document.createElement("span");
      label.textContent = p.title;
      btn.appendChild(label);
      btn.onclick = () => {
        buzz();
        tv.request(SSAP.launch, { id: p.id }).catch(e => toast(e.message, true));
      };
      grid.appendChild(btn);
    });
};

// ---------- تنفيذ الأوامر ----------
function runCmd(cmd){
  switch (cmd){
    case "power":
      if (!confirm("إطفاء التلفزيون؟\n\nتنبيه: ما تقدر تشغّله مرة ثانية من هذا التطبيق.")) return;
      return tv.request(SSAP.power);
    case "mute":   return tv.request(SSAP.setMute, { mute: !muted });
    case "volUp":  return tv.request(SSAP.volUp);
    case "volDown":return tv.request(SSAP.volDown);
    case "chUp":   return tv.request(SSAP.chUp);
    case "chDown": return tv.request(SSAP.chDown);
    case "play":   return tv.request(SSAP.play);
    case "pause":  return tv.request(SSAP.pause);
    case "stop":   return tv.request(SSAP.stop);
    case "rewind": return tv.request(SSAP.rewind);
    case "forward":return tv.request(SSAP.forward);
    case "del":    return tv.request(SSAP.del, { count: 1 });
    case "livetv": return tv.request(SSAP.launch, { id: "com.webos.app.livetv" });
    default: return Promise.reject(new Error("أمر غير معروف"));
  }
}

function bind(){
  // أزرار قناة الأزرار (التنقل والأرقام)
  document.querySelectorAll("[data-btn]").forEach(el => {
    const name = el.dataset.btn;
    el.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      el.classList.add("pressed");
      buzz();
      try { tv.button(name); } catch (err) { toast(err.message, true); }
    });
    const off = () => el.classList.remove("pressed");
    el.addEventListener("pointerup", off);
    el.addEventListener("pointerleave", off);
    el.addEventListener("pointercancel", off);
    el.addEventListener("contextmenu", e => e.preventDefault());
  });

  // أوامر SSAP، مع تكرار عند الضغط المطوّل
  document.querySelectorAll("[data-cmd]").forEach(el => {
    const cmd = el.dataset.cmd;
    const repeatable = el.hasAttribute("data-repeat");
    let holdTimer = null, repeatTimer = null;

    const fire = () => { runCmd(cmd).catch(e => toast(e.message, true)); };

    el.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      el.classList.add("pressed");
      buzz();
      fire();
      if (repeatable){
        holdTimer = setTimeout(() => { repeatTimer = setInterval(fire, 200); }, 450);
      }
    });
    const stop = () => {
      el.classList.remove("pressed");
      clearTimeout(holdTimer); clearInterval(repeatTimer);
      holdTimer = repeatTimer = null;
    };
    el.addEventListener("pointerup", stop);
    el.addEventListener("pointerleave", stop);
    el.addEventListener("pointercancel", stop);
    el.addEventListener("contextmenu", e => e.preventDefault());
  });

  // لوحة مفاتيح الكمبيوتر
  const KEYS = { ArrowUp:"UP", ArrowDown:"DOWN", ArrowLeft:"LEFT", ArrowRight:"RIGHT",
                 Enter:"ENTER", Backspace:"BACK", Escape:"EXIT", Home:"HOME" };
  document.addEventListener("keydown", (e) => {
    if (e.target.tagName === "INPUT") return;
    if (tv.status !== "ready") return;
    const name = KEYS[e.key];
    if (name){ e.preventDefault(); try { tv.button(name); } catch {} return; }
    if (e.key === "+"){ e.preventDefault(); runCmd("volUp").catch(()=>{}); }
    if (e.key === "-"){ e.preventDefault(); runCmd("volDown").catch(()=>{}); }
  });

  $("connectBtn").onclick = () => {
    const ip = $("ipInput").value.trim();
    if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) return toast("اكتب عنوان IP صحيح", true);
    store.set("webos_ip", ip);
    tv.connect(ip);
  };
  $("ipInput").addEventListener("keydown", e => { if (e.key === "Enter") $("connectBtn").click(); });

  $("cancelPairBtn").onclick = () => tv.disconnect();

  $("settingsBtn").onclick = () => {
    if (tv.status === "ready"){
      if (confirm("قطع الاتصال؟")) tv.disconnect();
    } else if (confirm("نسيان الإقران المحفوظ والبدء من جديد؟")){
      tv.forget();
      toast("تم المسح");
    }
  };

  $("sendTextBtn").onclick = () => {
    const input = $("textInput");
    const text = input.value;
    if (!text) return;
    tv.request(SSAP.insert, { text: text, replace: false })
      .then(() => { input.value = ""; })
      .catch(e => toast(e.message, true));
  };
  $("textInput").addEventListener("keydown", e => {
    if (e.key === "Enter"){ e.preventDefault(); $("sendTextBtn").click(); }
  });
}

// تنزيل نسخة محلية من الصفحة نفسها — تتخطى قيود HTTPS كلياً
async function downloadLocalCopy(){
  const btn = $("dlBtn");
  if (btn){ btn.disabled = true; btn.textContent = "جاري التحضير…"; }
  try {
    const res = await fetch(location.href, { cache: "no-store" });
    const html = await res.text();
    const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "remote-kmc.html";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 2000);
    diag("تم تجهيز النسخة المحلية للتنزيل");
    toast("اختر «تنزيل» ثم افتحه من تطبيق الملفات");
  } catch (e){
    diag("فشل تجهيز النسخة المحلية: " + e.message);
    toast("تعذّر التحميل: " + e.message, true);
  } finally {
    if (btn){ btn.disabled = false; btn.textContent = "⬇︎ حفظ نسخة تشتغل بدون شهادة"; }
  }
}

// نصائح عند فشل الاتصال — تختلف حسب طريقة فتح الصفحة
function showTroubleshoot(detail){
  const box = $("setupNotice");
  const secure = location.protocol === "https:";
  box.hidden = false;

  if (!secure){
    box.innerHTML =
      "<b>تأكد من التالي:</b><br>" +
      "• التلفزيون مشغّل (مو نائم)<br>" +
      "• جوالك والتلفزيون على نفس الواي فاي<br>" +
      "• عنوان IP صحيح — يتغير أحياناً بعد إعادة تشغيل الراوتر";
    return;
  }

  box.innerHTML =
    "<b>هذي الصفحة على HTTPS، والمتصفح يمنعها من مكالمة التلفزيون.</b><br><br>" +
    "<b>الحل الأسهل ↓</b><br>" +
    "احفظ نسخة على جوالك وافتحها من تطبيق «الملفات» — تشتغل مباشرة بدون أي شهادات.";

  const btn = document.createElement("button");
  btn.className = "btn wide";
  btn.id = "dlBtn";
  btn.textContent = "⬇︎ حفظ نسخة تشتغل بدون شهادة";
  btn.onclick = downloadLocalCopy;
  box.appendChild(btn);

  const alt = document.createElement("p");
  alt.className = "hint";
  alt.innerHTML = "<b>أو</b> اقبل شهادة التلفزيون: افتح " +
    "<code style='direction:ltr;display:inline-block'>https://" +
    ($("ipInput").value.trim() || "IP") + ":3001</code> ← «إظهار التفاصيل» ← " +
    "<b>انزل لآخر الصفحة</b> ← «زيارة هذا الموقع».";
  box.appendChild(alt);
}

// ---------- التشغيل ----------
bind();

// بصمة البيئة — تكشف فوراً إذا كان المتصفح مقيّداً
diag("التطبيق حُمّل بنجاح (JavaScript يعمل)");
diag("العنوان: " + location.protocol + "//" + (location.host || "ملف محلي"));
diag("WebSocket متوفر: " + (typeof WebSocket !== "undefined" ? "نعم" : "لا ← المتصفح مقيّد"));
try { localStorage.setItem("__t","1"); localStorage.removeItem("__t"); diag("التخزين المحلي: يعمل"); }
catch { diag("التخزين المحلي: محظور ← بيطلب الإقران كل مرة"); }
diag("المتصفح: " + navigator.userAgent);

$("copyDiagBtn").onclick = () => {
  const text = diagLines.join("\n");
  const done = () => toast("تم النسخ — الصقها في المحادثة");
  if (navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(text).then(done, () => toast("انسخها يدوياً من فوق", true));
  } else {
    toast("انسخها يدوياً من فوق", true);
  }
};

const savedIp = store.get("webos_ip");
if (savedIp){
  $("ipInput").value = savedIp;
  if (store.get("webos_key_" + savedIp)) tv.connect(savedIp);
}


  // ---------- إضافات خاصة بوضع الحقن ----------
  // الصفحة مفتوحة على التلفزيون نفسه، فعنوانه معروف: هو المضيف الحالي
  (function(){
    var host = location.hostname;
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)){
      var input = document.getElementById("ipInput");
      input.value = host;
      diag("وضع الحقن: التطبيق يعمل داخل صفحة التلفزيون " + host);
      diag("الاتصال سيكون من نفس المصدر — بلا قيود شهادات");
      if (tv.status !== "ready") tv.connect(host);
    } else {
      diag("تحذير: هذي الصفحة مو صفحة التلفزيون (" + host + ")");
      diag("افتح " + "http://<عنوان-التلفزيون>:3000" + " ثم شغّل الاختصار من هناك");
    }
  })();

})();

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
  reset.textContent = "\n/* ============================================================\n   ريموت KMC — webOS — واجهة متعددة الصفحات\n   ============================================================ */\n:root{\n  --bg:#0b0d12; --surface:#151922; --surface-2:#1d222d; --surface-3:#2a3140;\n  --line:#2c3342; --text:#e8ecf4; --muted:#8a94a8;\n  --accent:#3d8bff; --accent-dim:#1e4a8c; --nav:#4a5468;\n  --danger:#e5484d; --ok:#30a46c; --warn:#f5a524; --radius:16px;\n}\n*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}\n[hidden]{display:none !important}\nhtml,body{margin:0;padding:0;background:var(--bg);color:var(--text);\n  font-family:\"SF Arabic\",\"Noto Kufi Arabic\",-apple-system,BlinkMacSystemFont,\"Segoe UI\",Tahoma,sans-serif;\n  overscroll-behavior:none;height:100%}\nbody{display:flex;flex-direction:column;height:100dvh;\n  padding:env(safe-area-inset-top) 0 env(safe-area-inset-bottom)}\n\n/* ---------- الرأس ---------- */\n.topbar{display:flex;align-items:center;justify-content:space-between;gap:12px;direction:ltr;\n  padding:10px 16px 12px;border-bottom:1px solid var(--line);flex:none}\n.title{text-align:center;flex:1;min-width:0;direction:rtl}\n.title h1{font-size:17px;font-weight:700;margin:0}\n.title .model{font-size:12px;color:var(--muted);margin-top:2px;direction:ltr}\n.icon-btn{width:44px;height:44px;border-radius:12px;border:1px solid var(--line);\n  background:var(--surface);color:var(--text);font-size:19px;cursor:pointer;flex:none}\n.icon-btn:active{background:var(--surface-2)}\n.pw-btn{width:52px;height:52px;border-radius:50%;border:none;background:var(--danger);\n  color:#fff;font-size:24px;cursor:pointer;flex:none;transition:transform .08s,filter .15s;\n  box-shadow:0 3px 12px rgba(229,72,77,.35)}\n.pw-btn:active{transform:scale(.92);filter:brightness(.85)}\n.pw-btn:disabled{background:var(--surface-2);color:var(--muted);box-shadow:none}\n.dot{width:9px;height:9px;border-radius:50%;background:var(--muted);flex:none;\n  transition:background .25s,box-shadow .25s;margin-inline-start:6px}\n.dot.ready{background:var(--ok);box-shadow:0 0 0 3px rgba(48,163,108,.18)}\n.dot.busy{background:var(--warn);box-shadow:0 0 0 3px rgba(245,165,36,.18)}\n.dot.error{background:var(--danger);box-shadow:0 0 0 3px rgba(229,72,77,.18)}\n\n/* ---------- الصفحات ---------- */\n.warnbar{display:flex;align-items:center;gap:10px;background:rgba(245,165,36,.12);\n  border-bottom:1px solid rgba(245,165,36,.4);padding:10px 16px;font-size:12px;color:#f0d59a;flex:none}\n.warnbar span{flex:1;line-height:1.6}\n.warnbar button{background:var(--surface-2);border:1px solid var(--line);color:var(--text);\n  border-radius:10px;padding:8px 12px;font-size:12px;font-family:inherit;cursor:pointer;flex:none}\n.pages{flex:1;display:flex;overflow-x:auto;overflow-y:hidden;scroll-snap-type:x mandatory;direction:ltr;\n  -webkit-overflow-scrolling:touch;scrollbar-width:none}\n.pages::-webkit-scrollbar{display:none}\n.page{flex:0 0 100%;scroll-snap-align:center;overflow-y:auto;padding:16px 16px 8px;direction:rtl;\n  -webkit-overflow-scrolling:touch}\n.page-title{font-size:12px;color:var(--muted);text-align:center;margin:0 0 14px}\n.dots{display:flex;justify-content:center;gap:8px;padding:12px 0 8px;flex:none;direction:ltr}\n.dots i{width:7px;height:7px;border-radius:50%;background:var(--surface-3);\n  transition:background .25s,transform .25s}\n.dots i.on{background:var(--accent);transform:scale(1.25)}\n\n/* ---------- الأزرار ---------- */\n.key{background:var(--surface-2);border:1px solid var(--line);border-radius:14px;color:var(--text);\n  font-size:15px;font-weight:600;font-family:inherit;height:56px;cursor:pointer;display:flex;\n  align-items:center;justify-content:center;transition:transform .06s,background .12s;user-select:none}\n.key:active,.key.pressed{background:var(--surface-3);transform:scale(.94)}\n.key.nav{background:var(--nav);border-color:#59637a}\n.key.nav:active,.key.nav.pressed{background:#5c6880}\n.key.big{font-size:19px}\n.key.sm{height:46px;font-size:13px}\n.grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:10px}\n.grid3.media{direction:ltr}\n.grid4{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:10px}\n\n/* الهزّازات: صوت وقنوات */\n.rockers{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:10px}\n.rocker{background:var(--surface-2);border:1px solid var(--line);border-radius:16px;\n  display:flex;flex-direction:column;overflow:hidden}\n.rocker button{background:none;border:none;color:var(--text);font-size:22px;font-family:inherit;\n  height:56px;cursor:pointer;transition:background .12s}\n.rocker button:active{background:var(--surface-3)}\n.rocker span{text-align:center;font-size:11px;color:var(--muted);padding:6px 0;\n  border-block:1px solid var(--line)}\n.mid{display:flex;flex-direction:column;gap:10px}\n.mid .key{height:56px}\n\n/* عجلة التنقل */\n.dpad{position:relative;width:100%;aspect-ratio:1;max-width:250px;margin:6px auto 12px;\n  background:radial-gradient(circle at 50% 50%,var(--surface-2) 0 31%,var(--surface) 31% 100%);\n  border:1px solid var(--line);border-radius:50%}\n.dpad-btn{position:absolute;border:none;background:transparent;cursor:pointer;width:34%;height:34%;\n  transition:background .12s}\n.dpad-btn::after{content:\"\";position:absolute;inset:0;margin:auto;width:0;height:0;border:10px solid transparent}\n.dpad-btn:active,.dpad-btn.pressed{background:rgba(61,139,255,.16)}\n.dpad-btn.up{top:1%;left:33%;border-radius:50% 50% 8px 8px}\n.dpad-btn.down{bottom:1%;left:33%;border-radius:8px 8px 50% 50%}\n.dpad-btn.left{left:1%;top:33%;border-radius:50% 8px 8px 50%}\n.dpad-btn.right{right:1%;top:33%;border-radius:8px 50% 50% 8px}\n.dpad-btn.up::after{border-bottom-color:var(--text);margin-bottom:15px}\n.dpad-btn.down::after{border-top-color:var(--text);margin-top:15px}\n.dpad-btn.left::after{border-right-color:var(--text);margin-right:15px}\n.dpad-btn.right::after{border-left-color:var(--text);margin-left:15px}\n.dpad-ok{position:absolute;inset:0;margin:auto;width:36%;height:36%;border-radius:50%;\n  background:var(--surface-3);border:1px solid var(--line);color:var(--text);font-size:15px;\n  font-weight:700;font-family:inherit;cursor:pointer;transition:transform .07s,background .12s}\n.dpad-ok:active,.dpad-ok.pressed{background:var(--accent-dim);transform:scale(.92)}\n\n/* أزرار ملوّنة */\n.colors{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:4px}\n.colors button{height:42px;border:1px solid var(--line);border-radius:12px;background:var(--surface-2);\n  cursor:pointer;display:flex;align-items:center;justify-content:center}\n.colors button:active{background:var(--surface-3)}\n.colors i{display:block;width:32px;height:7px;border-radius:4px}\n\n/* لوحة اللمس */\n.pad{background:var(--surface-2);border:1px solid var(--line);border-radius:18px;\n  height:min(46vh,340px);margin-bottom:12px;touch-action:none;position:relative;\n  display:flex;align-items:center;justify-content:center}\n.pad.active{background:var(--surface-3);border-color:var(--accent-dim)}\n.pad p{color:var(--muted);font-size:12.5px;text-align:center;margin:0;padding:0 24px;line-height:1.9;\n  pointer-events:none}\n\n/* التطبيقات */\n.apps{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}\n.app{background:var(--surface-2);border:1px solid var(--line);border-radius:16px;color:var(--text);\n  font-size:11px;font-family:inherit;font-weight:600;aspect-ratio:1;cursor:pointer;padding:8px;\n  display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;\n  transition:transform .07s,background .12s;overflow:hidden}\n.app:active{background:var(--surface-3);transform:scale(.94)}\n.app img{width:46px;height:46px;border-radius:10px;object-fit:cover}\n.app span{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}\n.empty{color:var(--muted);font-size:13px;text-align:center;padding:40px 20px;line-height:2}\n\n/* لوحة الأرقام والكتابة */\n.numpad{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;max-width:300px;margin:0 auto 16px}\n.numpad .key{height:60px;font-size:21px}\n.typing{display:flex;gap:8px;align-items:center;margin-bottom:12px}\n.typing input{flex:1;min-width:0}\n\n/* ---------- الإعداد ---------- */\n.setup{padding:20px 16px;overflow-y:auto;flex:1}\n.panel{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius);\n  padding:18px 16px;margin-bottom:14px}\n.panel-title{margin:0 0 14px;font-size:15px;font-weight:700}\n.field{margin-bottom:18px}.field:last-child{margin-bottom:0}\n.field label{display:block;font-size:12px;color:var(--muted);margin-bottom:8px}\n.row{display:flex;gap:8px}.row input{flex:1;min-width:0}\ninput[type=text]{background:var(--surface-2);border:1px solid var(--line);border-radius:12px;\n  color:var(--text);padding:13px 14px;font-size:16px;font-family:inherit;width:100%;outline:none;\n  direction:ltr;text-align:right}\ninput[type=text]:focus{border-color:var(--accent)}\ninput::placeholder{color:#5c6579}\n.hint{font-size:11.5px;color:var(--muted);margin:8px 0 0;line-height:1.7}\n.btn{background:var(--accent);color:#fff;border:none;border-radius:12px;padding:13px 18px;\n  font-size:14px;font-weight:600;font-family:inherit;cursor:pointer;white-space:nowrap;\n  transition:transform .08s,filter .15s}\n.btn:active{transform:scale(.97);filter:brightness(.9)}\n.btn:disabled{opacity:.5}\n.btn.ghost{background:var(--surface-2);border:1px solid var(--line);color:var(--text)}\n.btn.wide{width:100%;margin-top:8px}\n.notice{background:rgba(61,139,255,.09);border:1px solid var(--accent-dim);border-radius:12px;\n  padding:12px 14px;font-size:12.5px;line-height:1.8;color:#cfe0ff;margin-top:14px}\n.diag{margin-top:14px;border-top:1px solid var(--line);padding-top:12px}\n.diag summary{cursor:pointer;font-size:12px;color:var(--muted);list-style:none}\n.diag summary::-webkit-details-marker{display:none}\n.diag summary::before{content:\"▾ \"}\n.diag[open] summary::before{content:\"▴ \"}\n.diag pre{background:#0d1017;border:1px solid var(--line);border-radius:10px;padding:10px;\n  font-size:10.5px;line-height:1.7;color:#a9b4c7;direction:ltr;text-align:left;\n  white-space:pre-wrap;word-break:break-word;max-height:220px;overflow-y:auto;margin:10px 0}\n\n.toast{position:fixed;left:50%;bottom:calc(28px + env(safe-area-inset-bottom));\n  transform:translateX(-50%);background:var(--surface-3);border:1px solid var(--line);\n  color:var(--text);padding:12px 18px;border-radius:12px;font-size:13px;max-width:90vw;\n  text-align:center;z-index:50;box-shadow:0 8px 28px rgba(0,0,0,.45)}\n.toast.error{border-color:var(--danger)}\n@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}\n";
  head.appendChild(reset);

  doc.body.innerHTML = "\n<header class=\"topbar\">\n  <button class=\"icon-btn\" id=\"settingsBtn\" aria-label=\"الإعدادات\">⚙</button>\n  <div class=\"title\">\n    <h1 id=\"pageTitle\">ريموت KMC</h1>\n    <div class=\"model\" id=\"modelName\">غير متصل</div>\n  </div>\n  <span class=\"dot\" id=\"statusDot\"></span>\n  <button class=\"pw-btn\" id=\"powerBtn\" aria-label=\"الطاقة\">⏻</button>\n</header>\n\n<!-- ===== الإعداد ===== -->\n<div class=\"setup\" id=\"setupPanel\">\n  <div class=\"panel\">\n    <h2 class=\"panel-title\">توصيل التلفزيون</h2>\n    <div class=\"field\">\n      <label for=\"ipInput\">عنوان IP للتلفزيون</label>\n      <div class=\"row\">\n        <input id=\"ipInput\" type=\"text\" inputmode=\"decimal\" placeholder=\"192.168.8.77\" autocomplete=\"off\">\n        <button class=\"btn\" id=\"connectBtn\">توصيل</button>\n      </div>\n      <p class=\"hint\">تلقاه في: الإعدادات ← الاتصال ← Wi-Fi ← متقدم</p>\n    </div>\n    <div id=\"setupNotice\" class=\"notice\" hidden></div>\n    <details class=\"diag\" id=\"diagWrap\">\n      <summary>تفاصيل تقنية</summary>\n      <pre id=\"diagLog\"></pre>\n      <button class=\"btn ghost wide\" id=\"copyDiagBtn\">نسخ التفاصيل</button>\n    </details>\n  </div>\n</div>\n\n<!-- ===== انتظار الموافقة ===== -->\n<div class=\"setup\" id=\"pairPanel\" hidden>\n  <div class=\"panel\">\n    <h2 class=\"panel-title\">وافق من التلفزيون</h2>\n    <p class=\"hint\" style=\"font-size:13.5px\">\n      ظهرت على شاشة التلفزيون رسالة تسأل عن السماح لهذا الجهاز.<br>\n      اضغط <b>«موافق»</b> بريموت التلفزيون الأصلي.<br><br>\n      مرة وحدة بس — بعدها يتذكرك.\n    </p>\n    <button class=\"btn ghost wide\" id=\"cancelPairBtn\">إلغاء</button>\n  </div>\n</div>\n\n<div class=\"warnbar\" id=\"padWarn\" hidden>\n  <span id=\"padWarnText\"></span>\n  <button id=\"padRetry\">إعادة المحاولة</button>\n</div>\n\n<!-- ===== الصفحات ===== -->\n<div class=\"pages\" id=\"pages\" hidden>\n\n  <!-- ١) التحكم -->\n  <section class=\"page\" data-name=\"التحكم عن بعد\">\n    <div class=\"rockers\">\n      <div class=\"rocker\">\n        <button data-cmd=\"volUp\" data-repeat>＋</button>\n        <span id=\"volLabel\">الصوت</span>\n        <button data-cmd=\"volDown\" data-repeat>－</button>\n      </div>\n      <div class=\"mid\">\n        <button class=\"key\" data-cmd=\"mute\">🔇</button>\n        <button class=\"key\" data-btn=\"INFO\">INFO</button>\n      </div>\n      <div class=\"rocker\">\n        <button data-cmd=\"chUp\" data-repeat>▲</button>\n        <span>القناة</span>\n        <button data-cmd=\"chDown\" data-repeat>▼</button>\n      </div>\n    </div>\n\n    <div class=\"grid3\">\n      <button class=\"key\" data-btn=\"GUIDE\">GUIDE</button>\n      <button class=\"key\" data-btn=\"HOME\">HOME</button>\n      <button class=\"key\" data-cmd=\"web\">WEB</button>\n    </div>\n\n    <div class=\"dpad\">\n      <button class=\"dpad-btn up\"    data-btn=\"UP\"    aria-label=\"فوق\"></button>\n      <button class=\"dpad-btn down\"  data-btn=\"DOWN\"  aria-label=\"تحت\"></button>\n      <button class=\"dpad-btn left\"  data-btn=\"LEFT\"  aria-label=\"يسار\"></button>\n      <button class=\"dpad-btn right\" data-btn=\"RIGHT\" aria-label=\"يمين\"></button>\n      <button class=\"dpad-ok\"        data-btn=\"ENTER\">OK</button>\n    </div>\n\n    <div class=\"grid3\">\n      <button class=\"key\" data-btn=\"BACK\">BACK</button>\n      <button class=\"key\" data-cmd=\"livetv\">TV</button>\n      <button class=\"key\" data-btn=\"EXIT\">EXIT</button>\n    </div>\n\n    <div class=\"grid3\">\n      <button class=\"key sm\" data-btn=\"MENU\">SETTINGS</button>\n      <button class=\"key sm\" data-btn=\"CC\">CC</button>\n      <button class=\"key sm\" data-btn=\"SEARCH\">SEARCH</button>\n    </div>\n\n    <div class=\"colors\">\n      <button data-btn=\"RED\"><i style=\"background:#e5484d\"></i></button>\n      <button data-btn=\"GREEN\"><i style=\"background:#7bc043\"></i></button>\n      <button data-btn=\"YELLOW\"><i style=\"background:#f5c518\"></i></button>\n      <button data-btn=\"BLUE\"><i style=\"background:#3d8bff\"></i></button>\n    </div>\n  </section>\n\n  <!-- ٢) لوحة اللمس -->\n  <section class=\"page\" data-name=\"لوحة اللمس\">\n    <div class=\"grid3\">\n      <button class=\"key\" data-btn=\"BACK\">BACK</button>\n      <button class=\"key\" data-btn=\"HOME\">HOME</button>\n      <button class=\"key\" data-cmd=\"web\">WEB</button>\n    </div>\n\n    <div class=\"pad\" id=\"pad\">\n      <p>مرّر بإصبعك لتحريك المؤشر على التلفزيون<br>وانقر للاختيار</p>\n    </div>\n\n    <div class=\"grid3 media\">\n      <button class=\"key big\" data-cmd=\"rewind\">◀◀</button>\n      <button class=\"key big\" data-cmd=\"pause\">❚❚</button>\n      <button class=\"key big\" data-cmd=\"forward\">▶▶</button>\n    </div>\n    <div class=\"grid3 media\">\n      <button class=\"key big\" data-cmd=\"stop\">■</button>\n      <button class=\"key big\" data-cmd=\"play\">▶</button>\n      <button class=\"key\" data-btn=\"SEARCH\">SEARCH</button>\n    </div>\n  </section>\n\n  <!-- ٣) التطبيقات -->\n  <section class=\"page\" data-name=\"التطبيقات\">\n    <div class=\"apps\" id=\"appsGrid\"></div>\n    <div class=\"empty\" id=\"appsEmpty\">جاري جلب التطبيقات من التلفزيون…</div>\n  </section>\n\n  <!-- ٤) الأرقام والكتابة -->\n  <section class=\"page\" data-name=\"الأرقام والكتابة\">\n    <div class=\"typing\">\n      <input id=\"textInput\" type=\"text\" placeholder=\"اكتب بالعربي أو الإنجليزي…\" autocomplete=\"off\">\n      <button class=\"btn\" id=\"sendTextBtn\">إرسال</button>\n    </div>\n    <div class=\"grid3\">\n      <button class=\"key sm\" data-cmd=\"del\">⌫ مسح</button>\n      <button class=\"key sm\" data-btn=\"ENTER\">↵ إدخال</button>\n      <button class=\"key sm\" data-btn=\"EXIT\">خروج</button>\n    </div>\n    <div class=\"numpad\">\n      <button class=\"key\" data-btn=\"1\">1</button>\n      <button class=\"key\" data-btn=\"2\">2</button>\n      <button class=\"key\" data-btn=\"3\">3</button>\n      <button class=\"key\" data-btn=\"4\">4</button>\n      <button class=\"key\" data-btn=\"5\">5</button>\n      <button class=\"key\" data-btn=\"6\">6</button>\n      <button class=\"key\" data-btn=\"7\">7</button>\n      <button class=\"key\" data-btn=\"8\">8</button>\n      <button class=\"key\" data-btn=\"9\">9</button>\n      <button class=\"key\" data-btn=\"DASH\">−</button>\n      <button class=\"key\" data-btn=\"0\">0</button>\n      <button class=\"key\" data-cmd=\"del\">⌫</button>\n    </div>\n    <div class=\"grid3\">\n      <button class=\"key sm\" data-cmd=\"input\">INPUT</button>\n      <button class=\"key sm\" data-btn=\"LIST\">LIST</button>\n      <button class=\"key sm\" data-btn=\"QMENU\">Q.MENU</button>\n    </div>\n  </section>\n\n</div>\n\n<div class=\"dots\" id=\"dots\" hidden></div>\n<div class=\"toast\" id=\"toast\" hidden></div>\n";

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

// بطاقة تعريف التطبيق — التلفزيون يطلبها عند الإقران.
//
// ⚠️ محتوى كتلة signed موقّع رقمياً بالتوقيع في signatures أدناه.
// أي تعديل داخلها — حتى تغيير اسم التطبيق — يُبطل التوقيع فيغلق
// التلفزيون الاتصال فور استلام الطلب. تُترك كما هي حرفياً.
const MANIFEST = {
  manifestVersion: 1,
  appVersion: "1.1",
  signed: {
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
  pointer: "ssap://com.webos.service.networkinput/getPointerInputSocket",
  sysInfo: "ssap://system/getSystemInfo",
  screenOff: "ssap://com.webos.service.tvpower/power/turnOffScreen",
  screenOn:  "ssap://com.webos.service.tvpower/power/turnOnScreen",
  toast:   "ssap://system.notifications/createToast"
};

// تخزين بسيط يتحمّل منع التخزين في بعض المتصفحات
const store = {
  get(k){ try { return localStorage.getItem(k); } catch { return this._m && this._m[k]; } },
  set(k,v){ try { localStorage.setItem(k,v); } catch { (this._m = this._m||{})[k]=v; } },
  del(k){ try { localStorage.removeItem(k); } catch { if(this._m) delete this._m[k]; } }
};

// ============================================================
//  جسر المقابس
//
//  التلفزيون يفحص ترويسة Origin ويرفض كل اتصال قادم من صفحة ويب.
//  والمتصفح لا يسمح بتعديل هذه الترويسة… إلا أن الصفحة داخل إطار
//  معزول (sandbox بلا allow-same-origin) تحمل أصلاً معتماً فترسل
//  القيمة "null" — وهذه يقبلها التلفزيون.
//
//  لذلك تُفتح كل المقابس داخل الإطار، وتتبادل الصفحة معه الرسائل
//  عبر postMessage. الصنف RelaySocket يحاكي واجهة WebSocket نفسها
//  فيبقى بقية الكود كما هو دون تغيير.
// ============================================================

const RELAY_DOC =
  '<!DOCTYPE html><meta charset="utf-8"><script>(function(){' +
  'var socks={};' +
  'function post(o){parent.postMessage(JSON.stringify(o),"*")}' +
  'window.addEventListener("message",function(ev){' +
  'var m;try{m=JSON.parse(ev.data)}catch(e){return}' +
  'if(m.op==="open"){' +
  'try{var w=new WebSocket(m.url);socks[m.id]=w;' +
  'w.onopen=function(){post({id:m.id,ev:"open"})};' +
  'w.onmessage=function(e){post({id:m.id,ev:"message",data:String(e.data)})};' +
  'w.onerror=function(){post({id:m.id,ev:"error"})};' +
  'w.onclose=function(e){post({id:m.id,ev:"close",code:e.code,reason:e.reason});delete socks[m.id]};' +
  '}catch(e){post({id:m.id,ev:"close",code:0,reason:e.message})}' +
  '}else if(m.op==="send"){if(socks[m.id])try{socks[m.id].send(m.data)}catch(e){}}' +
  'else if(m.op==="close"){if(socks[m.id])try{socks[m.id].close()}catch(e){}}' +
  '});post({ev:"ready"});})()<\/script>';

const relay = {
  frame: null,
  ready: null,
  sockets: new Map(),
  seq: 0,

  init(){
    if (this.ready) return this.ready;
    this.ready = new Promise((resolve, reject) => {
      const frame = document.createElement("iframe");
      frame.setAttribute("sandbox", "allow-scripts"); // بلا allow-same-origin ⇒ أصل معتم
      frame.style.display = "none";
      frame.srcdoc = RELAY_DOC;

      const onMsg = (ev) => {
        if (ev.source !== frame.contentWindow) return;
        let m; try { m = JSON.parse(ev.data); } catch { return; }
        if (m.ev === "ready"){ diag("جسر المقابس جاهز (أصل معتم)"); return resolve(); }
        const sock = this.sockets.get(m.id);
        if (sock) sock._handle(m);
      };

      window.addEventListener("message", onMsg);
      document.body.appendChild(frame);
      this.frame = frame;
      setTimeout(() => reject(new Error("تعذّر تجهيز الجسر")), 5000);
    });
    return this.ready;
  },

  post(msg){
    if (this.frame && this.frame.contentWindow){
      this.frame.contentWindow.postMessage(JSON.stringify(msg), "*");
    }
  }
};

// واجهة مطابقة لـ WebSocket، لكن الاتصال الفعلي يجري داخل الإطار
class RelaySocket {
  constructor(url){
    this.url = url;
    this.readyState = 0;
    this.onopen = this.onmessage = this.onclose = this.onerror = null;
    this._id = "s" + (++relay.seq);
    relay.sockets.set(this._id, this);
    relay.init().then(
      () => relay.post({ id: this._id, op: "open", url }),
      (e) => this._handle({ ev: "close", code: 0, reason: e.message })
    );
  }

  _handle(m){
    if (m.ev === "open"){
      this.readyState = 1;
      if (this.onopen) this.onopen();
    } else if (m.ev === "message"){
      if (this.onmessage) this.onmessage({ data: m.data });
    } else if (m.ev === "error"){
      if (this.onerror) this.onerror();
    } else if (m.ev === "close"){
      this.readyState = 3;
      relay.sockets.delete(this._id);
      if (this.onclose) this.onclose({ code: m.code, reason: m.reason });
    }
  }

  send(data){ relay.post({ id: this._id, op: "send", data }); }

  close(){
    relay.post({ id: this._id, op: "close" });
    this.readyState = 3;
    relay.sockets.delete(this._id);
  }
}

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
    this.onReady = () => {};
    this.onPointer = () => {};
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
      try { ws = new RelaySocket(url); } catch (e) { return reject(new Error("رابط غير صالح")); }

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
          this.controlUrl = url;   // نبني عليها عنوان قناة الأزرار
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
      ws.onclose = (ev) => {
        const code = ev && ev.code;
        const why = "رمز " + code + (ev && ev.reason ? " — " + ev.reason : "");
        diag("   أُغلق الاتصال من الطرف الآخر (" + why + ")");

        // 1008 = رفض سياسة. التلفزيون يفحص ترويسة Origin ويرفض المتصفحات
        // كلها بلا استثناء — حتى القادمة من مصدره هو. والمتصفح ممنوع من
        // تعديل هذه الترويسة، فلا سبيل لتجاوزها من صفحة ويب إطلاقاً.
        if (code === 1008) this.originBlocked = true;

        if (this.ws === ws){
          this.ws = null;
          if (this.status === "ready"){
            this._stopHeartbeat();
            this._set("disconnected");
            this._scheduleReconnect();
          }
        }
        done(reject, new Error(code === 1008
          ? "التلفزيون يرفض التحكم من المتصفحات"
          : "التلفزيون أغلق الاتصال (" + why + ")"));
      };
    });
  }

  // التلفزيون يغلق أي اتصال يبقى خاملاً دقيقتين تقريباً، فنرسل طلباً
  // خفيفاً بانتظام ليبقى حياً ما دامت الصفحة مفتوحة.
  _startHeartbeat(){
    this._stopHeartbeat();
    this._hb = setInterval(() => {
      if (this.status !== "ready") return;
      this.request(SSAP.getVol).catch(() => {});
    }, 20000);
  }

  _stopHeartbeat(){
    if (this._hb){ clearInterval(this._hb); this._hb = null; }
  }

  // انقطاع غير مقصود: نعيد الوصل تلقائياً بالمفتاح المحفوظ دون إزعاج المستخدم
  _scheduleReconnect(){
    if (this._reconnectTimer || !this.ip) return;
    if (!store.get("webos_key_" + this.ip)) return; // بلا مفتاح يلزم موافقة يدوية
    diag("انقطع الاتصال — إعادة الوصل بعد ثانيتين");
    this._reconnectTimer = setTimeout(() => {
      this._reconnectTimer = null;
      if (this.status !== "ready") this.connect(this.ip);
    }, 2000);
  }

  // بعد الجاهزية: نفتح قناة الأزرار ونشترك في الصوت والتطبيق الحالي
  async _afterReady(){
    this._startHeartbeat();
    this.onReady();
    try {
      const path = await this._askPointerPath();
      diag("عنوان قناة الأزرار من التلفزيون: " + path);
      this._openPointer(path);
    } catch (e){
      diag("⚠ فشل طلب قناة الأزرار: " + e.message);
      this.onPointer(false, e.message);
    }
    this.subscribe(SSAP.getVol, (p) => this.onVolume(p));
    this.subscribe(SSAP.fgApp, (p) => this.onApp(p && p.appId));
    this.request(SSAP.apps).then((p) => {
      if (p && p.launchPoints) this.onApps(p.launchPoints);
    }).catch(() => {});
  }

  // التلفزيون يعطي أحياناً عنواناً غير مشفّر على منفذ 3000، وهو مقفل في
  // بعض الأجهزة ويمنعه المتصفح أصلاً داخل صفحة مشفّرة. نأخذ المسار فقط
  // ونعيد بناء العنوان على نفس القناة التي نجح عليها الاتصال.
  _pointerUrl(raw){
    let path = raw;
    try {
      const u = new URL(raw);
      path = u.pathname + (u.search || "");
    } catch {
      const i = raw.indexOf("/", raw.indexOf("//") + 2);
      if (i > -1) path = raw.slice(i);
    }
    // القاعدة تُؤخذ من القناة التي نجح عليها الاتصال فعلاً، لا من قيمة ثابتة
    const base = (this.controlUrl || "wss://" + this.ip + ":3001").replace(/\/+$/, "");
    return base + path;
  }

  // نجرّب العنوان المعاد بناؤه ثم العنوان الأصلي كما أعطاه التلفزيون،
  // لأن أي واحد منهما قد يكون الصحيح حسب طراز الجهاز وإصدار نظامه.
  // بعض الطرازات ترد أولاً بردٍّ بلا عنوان ثم ترسل العنوان في رسالة تالية،
  // فنُبقي المستمع حياً ونأخذ أول ردّ يحمل socketPath فعلاً.
  async _askPointerPath(){
    // نجرّب الطلب العادي ثم الاشتراك، فبعض الطرازات لا ترد إلا على أحدهما
    for (const kind of ["request", "subscribe"]){
      try {
        return await this._askPointerVia(kind);
      } catch (e){
        diag("   " + kind + " ما نفع: " + e.message);
        if (kind === "subscribe") throw e;
      }
    }
  }

  _askPointerVia(kind){
    return new Promise((resolve, reject) => {
      let id, done = false;
      const finish = (fn, arg) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        this.pending.delete(id);
        fn(arg);
      };
      const timer = setTimeout(
        () => finish(reject, new Error("ما رد بعنوان خلال ٦ ثوانٍ")), 6000);

      try {
        id = this._send(kind, SSAP.pointer, null, (payload) => {
          const raw = JSON.stringify(payload || {});
          diag("   رد التلفزيون: " + raw.slice(0, 240));
          this.lastPointerReply = raw.slice(0, 160);
          if (payload && payload.socketPath) return finish(resolve, payload.socketPath);
          if (payload && payload.returnValue === false){
            const why = payload.errorText || payload.errorCode || "رفض بلا سبب معلن";
            return finish(reject, new Error("التلفزيون رفض الطلب: " + why));
          }
          // ردّ بلا عنوان ولا خطأ: ننتظر الرسالة التالية حتى تنتهي المهلة
        }, true);
      } catch (e){ finish(reject, e); }
    });
  }

  async retryPointer(){
    if (this.status !== "ready") throw new Error("التلفزيون غير متصل");
    diag("── إعادة محاولة قناة الأزرار ──");
    const path = await this._askPointerPath();
    diag("العنوان الجديد: " + path);
    this._openPointer(path);
  }

  _openPointer(raw){
    const candidates = [];
    const rebuilt = this._pointerUrl(raw);
    candidates.push(rebuilt);
    if (raw !== rebuilt) candidates.push(raw);

    const attempt = (i) => {
      if (i >= candidates.length){
        diag("✗ فشلت كل عناوين قناة الأزرار — أزرار التنقل لن تعمل");
        this.onPointer(false, "التلفزيون رفض فتح قناة الأزرار");
        return;
      }
      const url = candidates[i];
      diag("محاولة قناة الأزرار " + (i+1) + "/" + candidates.length + ": " + url);
      let settled = false, openedAt = 0;
      try {
        const ws = new RelaySocket(url);
        ws.onopen = () => {
          settled = true;
          openedAt = Date.now();
          this.pointer = ws;
          diag("✓ قناة الأزرار جاهزة عبر " + url);
          this.onPointer(true);
        };
        ws.onclose = (ev) => {
          const code = ev && ev.code;
          if (this.pointer === ws) this.pointer = null;

          if (!settled){
            settled = true;
            diag("   أُغلقت قبل أن تفتح (رمز " + code + ") — نجرّب التالي");
            return attempt(i + 1);
          }

          // فتحٌ يتبعه إغلاق فوري رفضٌ مقنّع، لا انقطاع عارض،
          // فنكمل إلى العنوان التالي بدل أن نحسبها ناجحة
          const quick = Date.now() - openedAt < 3000;
          diag("   " + (quick ? "أُغلقت فور فتحها" : "انقطعت") + " (رمز " + code + ")");
          this.onPointer(false, "التلفزيون أغلق قناة الأزرار (رمز " + code + ")");
          if (quick) attempt(i + 1);
        };
        ws.onerror = () => diag("   خطأ في المقبس");
      } catch (e){
        diag("   تعذّر الفتح: " + e.message);
        attempt(i + 1);
      }
    };

    attempt(0);
  }

  _send(type, uri, payload, handler, keep){
    if (!this.ws || this.ws.readyState !== 1) throw new Error("التلفزيون غير متصل");
    const id = "cmd_" + (++this.counter);
    if (handler) this.pending.set(id, { handler, keep });
    // بعض خدمات webOS ترفض الطلب إن حمل payload فارغاً، فنحذفه إن لم يكن مطلوباً
    const msg = { type, id, uri };
    if (payload && Object.keys(payload).length) msg.payload = payload;
    this.ws.send(JSON.stringify(msg));
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
    if (!this.pointer || this.pointer.readyState !== 1){
      diag("✗ الزر " + name + " لم يُرسل — قناة الأزرار غير جاهزة");
      throw new Error("قناة الأزرار غير جاهزة");
    }
    this.pointer.send("type:button\nname:" + name + "\n\n");
    if (!this._btnLogged){ this._btnLogged = true; diag("✓ أول زر أُرسل بنجاح (" + name + ")"); }
  }

  disconnect(){
    this._stopHeartbeat();
    if (this._reconnectTimer){ clearTimeout(this._reconnectTimer); this._reconnectTimer = null; }
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
let screenIsOff = false;   // هل الشاشة مطفأة الآن؟

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

  const ready = status === "ready";
  $("pages").hidden      = !ready;
  if (!ready) $("padWarn").hidden = true;
  $("dots").hidden       = !ready;
  $("pairPanel").hidden  = status !== "pairing";
  $("setupPanel").hidden = (ready || status === "pairing");
  $("powerBtn").disabled = !ready;
  $("connectBtn").disabled = status === "connecting";

  if (!ready) $("modelName").textContent = detail || STATUS_TEXT[status] || status;
  if (status === "error") showTroubleshoot(detail);
};

tv.onVolume = (p) => {
  if (!p || typeof p.volume !== "number") return;
  muted = !!p.muted;
  $("volLabel").innerHTML = '<span class="vol-badge">' + (muted ? "مكتوم" : p.volume) + '</span>';
};

tv.onApp = (appId) => {
  // نُبرز التطبيق الشغّال حالياً في شبكة التطبيقات بدل شريط منفصل
  document.querySelectorAll(".app").forEach(el => {
    el.style.borderColor = (el.dataset.appId === appId) ? "var(--accent)" : "";
  });
};

tv.onApps = (points) => {
  const grid = $("appsGrid");
  grid.innerHTML = "";
  const skip = /^(com\.webos\.app\.(hdmi|component|av|externalinput)|com\.webos\.exampleapp)/;
  const list = points.filter(p => p.id && p.title && !skip.test(p.id))
                     .sort((a,b) => (a.title||"").localeCompare(b.title||""));
  $("appsEmpty").hidden = list.length > 0;
  if (!list.length){ $("appsEmpty").textContent = "ما فيه تطبيقات — تأكد إن التلفزيون مشغّل"; return; }

  list.forEach(p => {
    const btn = document.createElement("button");
    btn.className = "app";
    btn.dataset.appId = p.id;
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

// حالة قناة الأزرار تُعرض أمام المستخدم مباشرة بدل أن تبقى في السجل
tv.onPointer = (ok, reason) => {
  const bar = $("padWarn");
  bar.hidden = !!ok;
  if (!ok){
    let text = "أزرار التنقل ولوحة اللمس معطّلة — " + (reason || "قناة الأزرار مغلقة");
    if (tv.lastPointerReply) text += "  ·  رد التلفزيون: " + tv.lastPointerReply;
    $("padWarnText").textContent = text;
  }
};

// اسم الطراز في الرأس — لمسة تعريفية مثل التطبيقات الاحترافية
tv.onReady = () => {
  tv.request(SSAP.sysInfo).then(info => {
    const model = info && (info.modelName || info.model);
    $("modelName").textContent = model ? "webOS TV " + model : "متصل بـ " + tv.ip;
  }).catch(() => { $("modelName").textContent = "متصل بـ " + tv.ip; });
};

// ---------- تنفيذ الأوامر ----------
function runCmd(cmd){
  switch (cmd){
    case "power":
      // إطفاء كامل: التلفزيون يدخل السكون وإيقاظه يحتاج حزمة شبكة
      // لا يستطيع المتصفح إرسالها، فلا رجعة منه إلا بالريموت الأصلي
      if (!confirm("إطفاء كامل للتلفزيون؟\n\nما راح تقدر تشغّله من جوالك — تحتاج الريموت الأصلي.\n\nلو تبي إطفاء ترجع منه، اضغط الزر ضغطة قصيرة بدل المطوّلة.")) return Promise.resolve();
      return tv.request(SSAP.power);
    case "screenOff": return tv.request(SSAP.screenOff);
    case "screenOn":  return tv.request(SSAP.screenOn);
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
    case "web":    return tv.request(SSAP.launch, { id: "com.webos.app.browser" });
    case "input":  return tv.request(SSAP.launch, { id: "com.webos.app.inputcommon" });
    default: return Promise.reject(new Error("أمر غير معروف"));
  }
}

// ---------- الصفحات ولوحة اللمس ----------
function setupPages(){
  const pages = $("pages");
  const sections = [...pages.querySelectorAll(".page")];
  const dots = $("dots");

  sections.forEach(() => dots.appendChild(document.createElement("i")));
  const marks = [...dots.children];

  const sync = () => {
    // العرض يساوي صفراً ما دامت الصفحات مخفية، فنحرس القسمة
    const w = pages.clientWidth || 1;
    let i = Math.round(pages.scrollLeft / w);
    if (!Number.isFinite(i)) i = 0;
    const idx = Math.min(Math.max(i, 0), sections.length - 1);
    marks.forEach((m, n) => m.classList.toggle("on", n === idx));
    $("pageTitle").textContent = sections[idx].dataset.name;
  };

  pages.addEventListener("scroll", () => {
    clearTimeout(pages._t);
    pages._t = setTimeout(sync, 60);
  });
  marks.forEach((m, n) => m.onclick = () => {
    pages.scrollTo({ left: n * pages.clientWidth, behavior: "smooth" });
  });
  sync();
}

// لوحة اللمس: تحرّك المؤشر على التلفزيون عبر قناة الأزرار
function setupTouchpad(){
  const pad = $("pad");
  let last = null, moved = 0;

  const send = (msg) => {
    if (!tv.pointer || tv.pointer.readyState !== 1) return;
    tv.pointer.send(msg);
  };

  pad.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    pad.setPointerCapture(e.pointerId);
    pad.classList.add("active");
    last = { x: e.clientX, y: e.clientY };
    moved = 0;
  });

  pad.addEventListener("pointermove", (e) => {
    if (!last) return;
    const dx = e.clientX - last.x, dy = e.clientY - last.y;
    if (!dx && !dy) return;
    moved += Math.abs(dx) + Math.abs(dy);
    last = { x: e.clientX, y: e.clientY };
    // المؤشر على التلفزيون يتحرك بعكس اتجاه المحور الأفقي في الواجهة العربية؟ لا:
    // الإحداثيات فيزيائية، فنرسلها كما هي
    send("type:move\ndx:" + Math.round(dx) + "\ndy:" + Math.round(dy) + "\ndown:0\n\n");
  });

  const end = (e) => {
    if (!last) return;
    pad.classList.remove("active");
    if (moved < 8){ buzz(); send("type:click\n\n"); }  // نقرة قصيرة = اختيار
    last = null;
    try { pad.releasePointerCapture(e.pointerId); } catch {}
  };
  pad.addEventListener("pointerup", end);
  pad.addEventListener("pointercancel", end);
  pad.addEventListener("contextmenu", (e) => e.preventDefault());
}

function bind(){
  setupPages();
  setupTouchpad();

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

  // زر الطاقة: ضغطة = إطفاء/تشغيل الشاشة (ذهاب وإياب من الجوال)
  //            ضغطة مطوّلة = إطفاء كامل (لا رجعة منه إلا بالريموت الأصلي)
  (function(){
    const btn = $("powerBtn");
    let holdTimer = null, held = false;

    const paint = () => {
      btn.textContent = screenIsOff ? "☀" : "⏻";
      btn.style.background = screenIsOff ? "var(--ok)" : "";
      btn.setAttribute("aria-label", screenIsOff ? "تشغيل الشاشة" : "إطفاء الشاشة");
    };

    btn.addEventListener("pointerdown", () => {
      held = false;
      holdTimer = setTimeout(() => {
        held = true;
        buzz(35);
        runCmd("power").catch(e => toast(e.message, true));
      }, 800);
    });

    const release = () => {
      clearTimeout(holdTimer);
      if (held) return;
      buzz(20);
      const next = !screenIsOff;
      runCmd(next ? "screenOff" : "screenOn").then(() => {
        screenIsOff = next;
        paint();
        toast(next ? "أُطفئت الشاشة — اضغط الزر مرة ثانية لتشغيلها" : "رجعت الشاشة");
      }).catch(() => {
        toast("تلفزيونك ما يدعم إطفاء الشاشة — اضغط مطوّلاً للإطفاء الكامل", true);
      });
    };

    btn.addEventListener("pointerup", release);
    btn.addEventListener("pointerleave", () => clearTimeout(holdTimer));
    btn.addEventListener("pointercancel", () => clearTimeout(holdTimer));
    btn.addEventListener("contextmenu", e => e.preventDefault());
    paint();
  })();

  $("padRetry").onclick = () => {
    const btn = $("padRetry");
    btn.disabled = true; btn.textContent = "جاري…";
    tv.retryPointer()
      .then(() => toast("تمت إعادة المحاولة"))
      .catch(e => toast(e.message, true))
      .finally(() => { btn.disabled = false; btn.textContent = "إعادة المحاولة"; });
  };

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

  // الرفض بسبب Origin نهائي — لا تحايل عليه، فنقولها صراحة
  if (tv.originBlocked){
    box.innerHTML =
      "<b>تلفزيونك يرفض التحكم من المتصفحات — وهذا بتصميمه، مو عطل.</b><br><br>" +
      "كل اتصال من متصفح يحمل ترويسة <code>Origin</code>، والتلفزيون يفحصها " +
      "ويرفضها حماية من صفحات الويب الخبيثة. والمتصفح ممنوع من تعديلها، " +
      "فما فيه أي طريقة تتجاوزها من صفحة ويب.<br><br>" +
      "<b>البدائل:</b><br>" +
      "• تطبيق أصلي من الأب ستور — التطبيقات الأصلية لا ترسل هذه الترويسة<br>" +
      "• خادم صغير داخل شبكتك يتوسّط بينك وبين التلفزيون";
    return;
  }

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

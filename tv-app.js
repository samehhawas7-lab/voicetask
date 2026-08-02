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
  reset.textContent = "\n/* ============================================================\n   ريموت KMC — webOS — واجهة متعددة الصفحات\n   ============================================================ */\n:root{\n  /* لوحة دافئة هادئة: الرماديّ الفحميّ أرحم للعين ليلاً من الأسود الصرف،\n     والفيروزيّ لهجةٌ ساكنة لا تُجهد كالأزرق الفاقع */\n  --bg:#12161b; --surface:#191f26; --surface-2:#222932; --surface-3:#2d3742;\n  --line:#2a333d; --text:#e7ecf1; --muted:#8f9bab;\n  --accent:#4db6a5; --accent-dim:#2c6f66; --nav:#3c4653;\n  --danger:#d9635f; --ok:#4fae7f; --warn:#e3ac52; --radius:18px;\n}\n*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}\n[hidden]{display:none !important}\nhtml,body{margin:0;padding:0;background:var(--bg);color:var(--text);\n  touch-action:manipulation;overscroll-behavior:none;\n  font-family:\"SF Arabic\",\"Noto Kufi Arabic\",-apple-system,BlinkMacSystemFont,\"Segoe UI\",Tahoma,sans-serif;\n  overscroll-behavior:none;height:100%}\nbody{display:flex;flex-direction:column;height:100dvh;\n  padding:env(safe-area-inset-top) 0 env(safe-area-inset-bottom)}\n\n/* ---------- الرأس ---------- */\n.topbar{display:flex;align-items:center;justify-content:space-between;gap:12px;direction:ltr;\n  padding:10px 16px 12px;border-bottom:1px solid var(--line);flex:none}\n.title{text-align:center;flex:1;min-width:0;direction:rtl}\n.title h1{font-size:17px;font-weight:700;margin:0}\n.title .model{font-size:12px;color:var(--muted);margin-top:2px;direction:ltr}\n.icon-btn{width:44px;height:44px;border-radius:12px;border:1px solid var(--line);\n  background:var(--surface);color:var(--text);font-size:19px;cursor:pointer;flex:none}\n.icon-btn:active{background:var(--surface-2)}\n.pw-btn{width:52px;height:52px;border-radius:50%;border:none;background:var(--danger);\n  color:#fff;font-size:24px;cursor:pointer;flex:none;transition:transform .08s,filter .15s;\n  box-shadow:0 3px 12px rgba(229,72,77,.35)}\n.pw-btn:active{transform:scale(.92);filter:brightness(.85)}\n.pw-btn:disabled{background:var(--surface-2);color:var(--muted);box-shadow:none}\n.dot{width:9px;height:9px;border-radius:50%;background:var(--muted);flex:none;\n  transition:background .25s,box-shadow .25s;margin-inline-start:6px}\n.dot.ready{background:var(--ok);box-shadow:0 0 0 3px rgba(48,163,108,.18)}\n.dot.busy{background:var(--warn);box-shadow:0 0 0 3px rgba(245,165,36,.18)}\n.dot.error{background:var(--danger);box-shadow:0 0 0 3px rgba(229,72,77,.18)}\n\n/* ---------- الصفحات ---------- */\n.warnbar{background:rgba(245,165,36,.12);border-bottom:1px solid rgba(245,165,36,.4);\n  padding:10px 16px;font-size:12px;color:#f0d59a;flex:none}\n.warnbar span{display:block;line-height:1.7;word-break:break-word;max-height:5.2em;overflow-y:auto}\n.warnbar .acts{display:flex;gap:8px;margin-top:8px}\n.key.blocked,.dpad-btn.blocked,.dpad-ok.blocked{opacity:.3;pointer-events:none}\n.pad.blocked{opacity:.35}\n.pad.blocked p::after{content:\"\\A\\A(معطّلة — التلفزيون يمنع الإدخال من المتصفحات)\";white-space:pre}\n.warnbar button{background:var(--surface-2);border:1px solid var(--line);color:var(--text);\n  border-radius:10px;padding:9px 12px;font-size:12px;font-family:inherit;cursor:pointer;flex:1}\n.pages{flex:1;display:flex;overflow-x:auto;overflow-y:hidden;scroll-snap-type:x mandatory;direction:ltr;\n  -webkit-overflow-scrolling:touch;scrollbar-width:none}\n.pages::-webkit-scrollbar{display:none}\n.page{flex:0 0 100%;scroll-snap-align:center;overflow-y:auto;padding:16px 16px 8px;direction:rtl;\n  -webkit-overflow-scrolling:touch}\n.page-title{font-size:12px;color:var(--muted);text-align:center;margin:0 0 14px}\n.dots{display:flex;justify-content:center;gap:8px;padding:12px 0 8px;flex:none;direction:ltr}\n.dots i{width:7px;height:7px;border-radius:50%;background:var(--surface-3);\n  transition:background .25s,transform .25s}\n.dots i.on{background:var(--accent);transform:scale(1.25)}\n\n/* ---------- الأزرار ---------- */\n.key{background:var(--surface-2);border:1px solid var(--line);border-radius:14px;color:var(--text);\n  font-size:15px;font-weight:600;font-family:inherit;height:56px;cursor:pointer;display:flex;\n  align-items:center;justify-content:center;transition:transform .06s,background .12s;user-select:none}\n.key:active,.key.pressed{background:var(--surface-3);transform:scale(.94)}\n.key.nav{background:var(--nav);border-color:#59637a}\n.key.nav:active,.key.nav.pressed{background:#5c6880}\n.key.big{font-size:19px}\n.key.sm{height:46px;font-size:13px}\n.grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:10px}\n.grid3.media{direction:ltr}\n.grid4{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:10px}\n\n/* الهزّازات: صوت وقنوات */\n.rockers{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:10px}\n.rocker{background:var(--surface-2);border:1px solid var(--line);border-radius:16px;\n  display:flex;flex-direction:column;overflow:hidden}\n.rocker button{background:none;border:none;color:var(--text);font-size:22px;font-family:inherit;\n  height:56px;cursor:pointer;transition:background .12s}\n.rocker button:active{background:var(--surface-3)}\n.rocker span{text-align:center;font-size:11px;color:var(--muted);padding:6px 0;\n  border-block:1px solid var(--line)}\n.mid{display:flex;flex-direction:column;gap:10px}\n.mid .key{height:56px}\n\n/* عجلة التنقل */\n.dpad{position:relative;width:100%;aspect-ratio:1;max-width:250px;margin:6px auto 12px;\n  background:radial-gradient(circle at 50% 50%,var(--surface-2) 0 31%,var(--surface) 31% 100%);\n  border:1px solid var(--line);border-radius:50%}\n.dpad-btn{position:absolute;border:none;background:transparent;cursor:pointer;width:34%;height:34%;\n  transition:background .12s}\n.dpad-btn::after{content:\"\";position:absolute;inset:0;margin:auto;width:0;height:0;border:10px solid transparent}\n.dpad-btn:active,.dpad-btn.pressed{background:rgba(61,139,255,.16)}\n.dpad-btn.up{top:1%;left:33%;border-radius:50% 50% 8px 8px}\n.dpad-btn.down{bottom:1%;left:33%;border-radius:8px 8px 50% 50%}\n.dpad-btn.left{left:1%;top:33%;border-radius:50% 8px 8px 50%}\n.dpad-btn.right{right:1%;top:33%;border-radius:8px 50% 50% 8px}\n.dpad-btn.up::after{border-bottom-color:var(--text);margin-bottom:15px}\n.dpad-btn.down::after{border-top-color:var(--text);margin-top:15px}\n.dpad-btn.left::after{border-right-color:var(--text);margin-right:15px}\n.dpad-btn.right::after{border-left-color:var(--text);margin-left:15px}\n.dpad-ok{position:absolute;inset:0;margin:auto;width:36%;height:36%;border-radius:50%;\n  background:var(--surface-3);border:1px solid var(--line);color:var(--text);font-size:15px;\n  font-weight:700;font-family:inherit;cursor:pointer;transition:transform .07s,background .12s}\n.dpad-ok:active,.dpad-ok.pressed{background:var(--accent-dim);transform:scale(.92)}\n\n/* أزرار ملوّنة */\n.colors{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:4px}\n.colors button{height:42px;border:1px solid var(--line);border-radius:12px;background:var(--surface-2);\n  cursor:pointer;display:flex;align-items:center;justify-content:center}\n.colors button:active{background:var(--surface-3)}\n.colors i{display:block;width:32px;height:7px;border-radius:4px}\n\n/* صفحة الأوامر */\n.card{background:var(--surface-2);border:1px solid var(--line);border-radius:16px;\n  padding:14px;margin-bottom:12px}\n.card h3{margin:0 0 8px;font-size:13.5px;font-weight:700}\n.card p{margin:0 0 10px;font-size:12px;color:var(--muted);line-height:1.85}\n.code{direction:ltr;text-align:left;background:var(--surface);border:1px solid var(--line);\n  border-radius:10px;padding:10px;font-size:11px;line-height:1.6;\n  font-family:ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--text);\n  overflow-x:auto;white-space:pre;margin:0 0 8px}\n.info{display:grid;grid-template-columns:auto 1fr;gap:7px 14px;font-size:12.5px;margin:0}\n.info dt{color:var(--muted)}\n.info dd{margin:0;direction:ltr;text-align:left;font-family:ui-monospace,Menlo,monospace;\n  overflow-wrap:anywhere}\n.act-row{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px}\n.toggle{display:flex;align-items:center;justify-content:space-between;gap:14px;\n  margin-top:14px;padding-top:14px;border-top:1px solid var(--line);cursor:pointer}\n.toggle b{display:block;font-size:13px;font-weight:650}\n.toggle small{display:block;font-size:11.5px;color:var(--muted);line-height:1.7;margin-top:3px}\n.toggle input{appearance:none;-webkit-appearance:none;width:46px;height:27px;flex:none;\n  border-radius:14px;background:var(--surface-3);border:1px solid var(--line);\n  position:relative;cursor:pointer;transition:background .18s}\n.toggle input::after{content:\"\";position:absolute;top:2px;inset-inline-start:2px;\n  width:21px;height:21px;border-radius:50%;background:var(--muted);transition:.18s}\n.toggle input:checked{background:var(--accent-dim);border-color:var(--accent)}\n.toggle input:checked::after{inset-inline-start:21px;background:var(--accent)}\n.chip{display:inline-block;background:var(--warn);color:#231a08;border-radius:8px;\n  padding:2px 8px;font-size:10.5px;font-weight:700;vertical-align:middle;margin-inline-start:6px}\n.steps{margin-top:12px;font-size:12.5px;line-height:2.1;color:var(--muted)}\n.steps div{display:flex;align-items:center;gap:9px}\n.steps i{width:16px;height:16px;border-radius:50%;border:1.5px solid var(--line);flex:none;\n  display:flex;align-items:center;justify-content:center;font-size:9px;font-style:normal}\n.steps div.now{color:var(--text)}\n.steps div.now i{border-color:var(--accent);border-top-color:transparent;\n  animation:spin 1s linear infinite}\n.steps div.done{color:var(--text)}\n.steps div.done i{background:var(--ok);border-color:var(--ok);color:#08210f}\n.steps div.fail i{background:var(--danger);border-color:var(--danger);color:#2b0d0d}\n@keyframes spin{to{transform:rotate(360deg)}}\n\n/* لوحة اللمس */\n.pad{background:var(--surface-2);border:1px solid var(--line);border-radius:18px;\n  height:min(46vh,340px);margin-bottom:12px;touch-action:none;position:relative;\n  display:flex;align-items:center;justify-content:center}\n.pad.active{background:var(--surface-3);border-color:var(--accent-dim)}\n.pad p{color:var(--muted);font-size:12.5px;text-align:center;margin:0;padding:0 24px;line-height:1.9;\n  pointer-events:none}\n\n/* التطبيقات */\n.empty{color:var(--muted);font-size:13px;text-align:center;padding:40px 20px;line-height:2}\n\n/* لوحة الأرقام والكتابة */\n.numpad{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;max-width:300px;margin:0 auto 16px}\n.numpad .key{height:60px;font-size:21px}\n.typing{display:flex;gap:8px;align-items:center;margin-bottom:12px}\n.typing input{flex:1;min-width:0}\n\n/* ---------- الإعداد ---------- */\n.setup{padding:20px 16px;overflow-y:auto;flex:1}\n.panel{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius);\n  padding:18px 16px;margin-bottom:14px}\n.panel-title{margin:0 0 14px;font-size:15px;font-weight:700}\n.field{margin-bottom:18px}.field:last-child{margin-bottom:0}\n.field label{display:block;font-size:12px;color:var(--muted);margin-bottom:8px}\n.row{display:flex;gap:8px}.row input{flex:1;min-width:0}\ninput[type=text]{background:var(--surface-2);border:1px solid var(--line);border-radius:12px;\n  color:var(--text);padding:13px 14px;font-size:16px;font-family:inherit;width:100%;outline:none;\n  direction:ltr;text-align:right}\ninput[type=text]:focus{border-color:var(--accent)}\ninput::placeholder{color:#5c6579}\n.hint{font-size:11.5px;color:var(--muted);margin:8px 0 0;line-height:1.7}\n.btn{background:var(--accent);color:#fff;border:none;border-radius:12px;padding:13px 18px;\n  font-size:14px;font-weight:600;font-family:inherit;cursor:pointer;white-space:nowrap;\n  transition:transform .08s,filter .15s}\n.btn:active{transform:scale(.97);filter:brightness(.9)}\n.btn:disabled{opacity:.5}\n.btn.ghost{background:var(--surface-2);border:1px solid var(--line);color:var(--text)}\n.btn.wide{width:100%;margin-top:8px}\n.notice{background:rgba(61,139,255,.09);border:1px solid var(--accent-dim);border-radius:12px;\n  padding:12px 14px;font-size:12.5px;line-height:1.8;color:#cfe0ff;margin-top:14px}\n.diag{margin-top:14px;border-top:1px solid var(--line);padding-top:12px}\n.diag summary{cursor:pointer;font-size:12px;color:var(--muted);list-style:none}\n.diag summary::-webkit-details-marker{display:none}\n.diag summary::before{content:\"▾ \"}\n.diag[open] summary::before{content:\"▴ \"}\n.diag pre{background:#0d1017;border:1px solid var(--line);border-radius:10px;padding:10px;\n  font-size:10.5px;line-height:1.7;color:#a9b4c7;direction:ltr;text-align:left;\n  white-space:pre-wrap;word-break:break-word;max-height:220px;overflow-y:auto;margin:10px 0}\n\n.toast{position:fixed;left:50%;bottom:calc(28px + env(safe-area-inset-bottom));\n  transform:translateX(-50%);background:var(--surface-3);border:1px solid var(--line);\n  color:var(--text);padding:12px 18px;border-radius:12px;font-size:13px;max-width:90vw;\n  text-align:center;z-index:50;box-shadow:0 8px 28px rgba(0,0,0,.45)}\n.toast.error{border-color:var(--danger)}\n\n/* ---------- الشاشات ---------- */\n/* لا سحب أفقيّ بعد اليوم: شاشة رئيسية، وكل جهاز صفحة واحدة طويلة.\n   السحب الأفقيّ يُضيع المستخدم ويصطدم بتمرير الصفحة نفسها. */\n.screens{flex:1;overflow:hidden;position:relative;display:flex}\n.screen{position:absolute;inset:0;overflow-y:auto;overflow-x:hidden;\n  -webkit-overflow-scrolling:touch;padding:14px 16px 28px;\n  opacity:0;pointer-events:none;transform:translateX(12px);\n  transition:opacity .22s ease,transform .22s ease}\n.screen.on{opacity:1;pointer-events:auto;transform:none;position:relative;flex:1}\n\n/* ---------- الشاشة الرئيسية ---------- */\n.hero{text-align:center;padding:22px 0 26px}\n.hero h2{margin:0;font-size:25px;font-weight:800;letter-spacing:.2px;\n  background:linear-gradient(120deg,var(--accent),#8fd6c8);\n  -webkit-background-clip:text;background-clip:text;color:transparent}\n.hero p{margin:8px 0 0;font-size:12.5px;color:var(--muted)}\n.tiles{display:grid;grid-template-columns:repeat(2,1fr);gap:13px}\n.tile{background:var(--surface-2);border:1px solid var(--line);border-radius:20px;\n  padding:20px 12px 16px;display:flex;flex-direction:column;align-items:center;gap:10px;\n  color:var(--text);font-family:inherit;cursor:pointer;position:relative;\n  transition:transform .1s,background .15s,border-color .15s}\n.tile:active{transform:scale(.96);background:var(--surface-3)}\n.tile svg{width:38px;height:38px;stroke:var(--accent);fill:none;\n  stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}\n.tile b{font-size:14px;font-weight:650;line-height:1.3;text-align:center}\n.tile small{font-size:10.5px;color:var(--muted)}\n.tile .pip{position:absolute;top:12px;left:12px;width:8px;height:8px;border-radius:50%;\n  background:var(--surface-3)}\n.tile .pip.live{background:var(--ok);box-shadow:0 0 0 3px rgba(79,174,127,.16)}\n.tile .pip.wait{background:var(--warn)}\n.tile.soon svg{stroke:var(--muted)}\n.tile.soon b{color:var(--muted)}\n\n/* ---------- أقسام داخل صفحة الجهاز ---------- */\n.sec{margin:0 0 22px}\n.sec-h{display:flex;align-items:center;gap:9px;margin:0 0 11px}\n.sec-h span{font-size:11.5px;color:var(--muted);font-weight:600;letter-spacing:.4px}\n.sec-h::after{content:\"\";flex:1;height:1px;background:var(--line)}\n\n/* ---------- التطبيقات ---------- */\n.apps{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}\n.app{background:var(--surface-2);border:1px solid var(--line);border-radius:18px;\n  padding:14px 8px 11px;display:flex;flex-direction:column;align-items:center;gap:9px;\n  color:var(--text);font-family:inherit;cursor:pointer;transition:transform .1s,background .15s}\n.app:active{transform:scale(.95);background:var(--surface-3)}\n.app img{width:46px;height:46px;border-radius:13px;object-fit:cover;display:block}\n.app .glyph{width:46px;height:46px;border-radius:13px;display:flex;align-items:center;\n  justify-content:center;font-size:19px;font-weight:800;color:#fff;letter-spacing:-.5px}\n.app span{font-size:11.5px;text-align:center;line-height:1.35}\n.more-btn{width:100%;margin-top:12px;background:none;border:1px dashed var(--line);\n  color:var(--muted);border-radius:14px;height:42px;font-family:inherit;font-size:12.5px;\n  cursor:pointer}\n.more-btn:active{background:var(--surface-2)}\n\n/* ---------- سرعة لوحة اللمس ---------- */\n.speed{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:10px}\n.speed button{background:var(--surface-2);border:1px solid var(--line);border-radius:12px;\n  color:var(--muted);height:38px;font-size:12px;font-family:inherit;cursor:pointer}\n.speed button.on{background:var(--accent-dim);border-color:var(--accent);color:var(--text)}\n\n/* ---------- بطاقة «قيد الإعداد» ---------- */\n.todo{background:var(--surface-2);border:1px solid var(--line);border-radius:var(--radius);\n  padding:18px}\n.todo h3{margin:0 0 10px;font-size:15px}\n.todo p{margin:0 0 12px;font-size:12.5px;color:var(--muted);line-height:1.9}\n.todo ul{margin:0;padding-inline-start:20px;font-size:12.5px;color:var(--muted);line-height:2}\n.todo .badge{display:inline-block;background:var(--surface-3);color:var(--warn);\n  border-radius:8px;padding:3px 9px;font-size:11px;margin-bottom:11px}\n\n@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}\n";
  head.appendChild(reset);

  doc.body.innerHTML = "\n<svg width=\"0\" height=\"0\" style=\"position:absolute\" aria-hidden=\"true\"><defs>\n  <symbol id=\"i-tv\" viewBox=\"0 0 24 24\"><rect x=\"2\" y=\"4\" width=\"20\" height=\"13\" rx=\"2\"/><path d=\"M8 21h8M12 17v4\"/></symbol>\n  <symbol id=\"i-proj\" viewBox=\"0 0 24 24\"><rect x=\"2\" y=\"6\" width=\"16\" height=\"11\" rx=\"2.5\"/><circle cx=\"9\" cy=\"11.5\" r=\"3.2\"/><path d=\"M18 9.5l4-2.5M18 14l4 2.5M5 20l1-3M15 20l-1-3\"/></symbol>\n  <symbol id=\"i-ac\" viewBox=\"0 0 24 24\"><rect x=\"2\" y=\"4\" width=\"20\" height=\"8\" rx=\"2\"/><path d=\"M6 8.5h12M6 16c1.6 0 1.6 2 3.2 2M13 16c1.6 0 1.6 2 3.2 2M6 19.5c1.6 0 1.6 2 3.2 2M13 19.5c1.6 0 1.6 2 3.2 2\"/></symbol>\n  <symbol id=\"i-wash\" viewBox=\"0 0 24 24\"><rect x=\"4\" y=\"2\" width=\"16\" height=\"20\" rx=\"2.5\"/><circle cx=\"12\" cy=\"14\" r=\"4.5\"/><path d=\"M8 6h.01M11 6h.01\"/></symbol>\n  <symbol id=\"i-dish\" viewBox=\"0 0 24 24\"><rect x=\"3\" y=\"2\" width=\"18\" height=\"20\" rx=\"2.5\"/><path d=\"M3 8h18\"/><circle cx=\"12\" cy=\"15\" r=\"3.5\"/><path d=\"M6.5 5h5\"/></symbol>\n  <symbol id=\"i-tool\" viewBox=\"0 0 24 24\"><path d=\"M14.5 4.5a4.5 4.5 0 00-6 5.9L4 15v4h4l4.6-4.5a4.5 4.5 0 005.9-6l-2.8 2.8-2.6-.6-.6-2.6z\"/></symbol>\n</defs></svg>\n\n<header class=\"topbar\">\n  <button class=\"icon-btn\" id=\"backBtn\" aria-label=\"رجوع\" hidden>‹</button>\n  <button class=\"icon-btn\" id=\"settingsBtn\" aria-label=\"الإعدادات\">⚙</button>\n  <div class=\"title\">\n    <h1 id=\"pageTitle\">حبيبتي نون</h1>\n    <div class=\"model\" id=\"modelName\">اختر جهازاً</div>\n  </div>\n  <span class=\"dot\" id=\"statusDot\"></span>\n  <button class=\"pw-btn\" id=\"powerBtn\" aria-label=\"الطاقة\" hidden>⏻</button>\n</header>\n\n<main class=\"screens\" id=\"screens\">\n\n<!-- ===== الشاشة الرئيسية ===== -->\n<section class=\"screen on\" id=\"home\" data-title=\"البيت\" data-sub=\"اختر جهازاً\">\n  <div class=\"hero\">\n    <h2>حبيبتي نون</h2>\n    <p>كل أجهزة البيت في مكان واحد</p>\n  </div>\n  <div class=\"tiles\">\n    <button class=\"tile\" data-go=\"dev-tv\">\n      <i class=\"pip\" id=\"pipTv\"></i>\n      <svg><use href=\"#i-tv\"></use></svg><b>التلفاز</b><small>KMC · webOS</small>\n    </button>\n    <button class=\"tile soon\" data-go=\"dev-proj\">\n      <i class=\"pip\" id=\"pipProj\"></i>\n      <svg><use href=\"#i-proj\"></use></svg><b>البروجيكتر</b><small>XL2-220</small>\n    </button>\n    <button class=\"tile soon\" data-go=\"dev-ac-hall\">\n      <i class=\"pip\"></i>\n      <svg><use href=\"#i-ac\"></use></svg><b>مكيف الصالة</b><small>ماندو بلس</small>\n    </button>\n    <button class=\"tile soon\" data-go=\"dev-ac-bed\">\n      <i class=\"pip\"></i>\n      <svg><use href=\"#i-ac\"></use></svg><b>مكيف غرفة النوم</b><small>ماندو بلس</small>\n    </button>\n    <button class=\"tile soon\" data-go=\"dev-washer\">\n      <i class=\"pip\"></i>\n      <svg><use href=\"#i-wash\"></use></svg><b>غسالة الملابس</b><small>—</small>\n    </button>\n    <button class=\"tile soon\" data-go=\"dev-dish\">\n      <i class=\"pip\"></i>\n      <svg><use href=\"#i-dish\"></use></svg><b>غسالة الأطباق</b><small>سامسونج</small>\n    </button>\n    <button class=\"tile\" data-go=\"dev-maint\" style=\"grid-column:1/-1\">\n      <i class=\"pip\" id=\"pipMaint\"></i>\n      <svg><use href=\"#i-tool\"></use></svg><b>الصيانة والأوامر</b><small>حالة الخادم وأوامره</small>\n    </button>\n  </div>\n</section>\n\n<!-- ===== التلفاز ===== -->\n<section class=\"screen\" id=\"dev-tv\" data-title=\"التلفاز\" data-sub=\"غير متصل\">\n\n  <div class=\"setup\" id=\"setupPanel\">\n    <div class=\"panel\">\n      <h2 class=\"panel-title\">توصيل التلفزيون</h2>\n      <div class=\"field\">\n        <label for=\"ipInput\">عنوان IP للتلفزيون</label>\n        <div class=\"row\">\n          <input id=\"ipInput\" type=\"text\" inputmode=\"decimal\" placeholder=\"192.168.8.77\" autocomplete=\"off\">\n          <button class=\"btn\" id=\"connectBtn\">توصيل</button>\n        </div>\n        <p class=\"hint\">الخادم يبحث عنه وحده — لا يلزمك كتابته عادةً</p>\n      </div>\n      <button class=\"btn ghost wide\" id=\"wakeBtn\" hidden>تشغيل التلفزيون وهو مطفأ</button>\n      <div id=\"setupNotice\" class=\"notice\" hidden></div>\n      <details class=\"diag\" id=\"diagWrap\">\n        <summary>تفاصيل تقنية</summary>\n        <pre id=\"diagLog\"></pre>\n        <button class=\"btn ghost wide\" id=\"copyDiagBtn\">نسخ التفاصيل</button>\n      </details>\n    </div>\n  </div>\n\n  <div class=\"setup\" id=\"pairPanel\" hidden>\n    <div class=\"panel\">\n      <h2 class=\"panel-title\">وافق من التلفزيون</h2>\n      <p class=\"hint\" style=\"font-size:13.5px\">\n        ظهرت على شاشة التلفزيون رسالة تسأل عن السماح لهذا الجهاز.<br>\n        اضغط <b>«موافق»</b> بريموت التلفزيون الأصلي.<br><br>\n        مرة وحدة بس — بعدها يتذكرك.\n      </p>\n      <button class=\"btn ghost wide\" id=\"cancelPairBtn\">إلغاء</button>\n    </div>\n  </div>\n\n  <div class=\"warnbar\" id=\"padWarn\" hidden>\n    <span id=\"padWarnText\"></span>\n    <div class=\"acts\">\n      <button id=\"padRetry\">إعادة المحاولة</button>\n      <button id=\"padRepair\">إقران جديد</button>\n    </div>\n  </div>\n\n  <div id=\"tvRemote\" hidden>\n\n    <div class=\"sec\">\n      <div class=\"sec-h\"><span>الصوت والقنوات</span></div>\n      <div class=\"rockers\">\n        <div class=\"rocker\">\n          <button data-cmd=\"volUp\" data-repeat>＋</button>\n          <span id=\"volLabel\">الصوت</span>\n          <button data-cmd=\"volDown\" data-repeat>－</button>\n        </div>\n        <div class=\"mid\">\n          <button class=\"key\" data-cmd=\"mute\">🔇</button>\n          <button class=\"key\" data-btn=\"INFO\">INFO</button>\n        </div>\n        <div class=\"rocker\">\n          <button data-cmd=\"chUp\" data-repeat>▲</button>\n          <span>القناة</span>\n          <button data-cmd=\"chDown\" data-repeat>▼</button>\n        </div>\n      </div>\n    </div>\n\n    <div class=\"sec\">\n      <div class=\"sec-h\"><span>التنقل</span></div>\n      <div class=\"grid3\">\n        <button class=\"key\" data-btn=\"GUIDE\">GUIDE</button>\n        <button class=\"key\" data-btn=\"HOME\">HOME</button>\n        <button class=\"key\" data-cmd=\"web\">WEB</button>\n      </div>\n      <div class=\"dpad\">\n        <button class=\"dpad-btn up\"    data-btn=\"UP\"    aria-label=\"فوق\"></button>\n        <button class=\"dpad-btn down\"  data-btn=\"DOWN\"  aria-label=\"تحت\"></button>\n        <button class=\"dpad-btn left\"  data-btn=\"LEFT\"  aria-label=\"يسار\"></button>\n        <button class=\"dpad-btn right\" data-btn=\"RIGHT\" aria-label=\"يمين\"></button>\n        <button class=\"dpad-ok\"        data-btn=\"ENTER\">OK</button>\n      </div>\n      <div class=\"grid3\">\n        <button class=\"key\" data-btn=\"BACK\">BACK</button>\n        <button class=\"key\" data-cmd=\"livetv\">TV</button>\n        <button class=\"key\" data-btn=\"EXIT\">EXIT</button>\n      </div>\n    </div>\n\n    <div class=\"sec\">\n      <div class=\"sec-h\"><span>التطبيقات</span></div>\n      <div class=\"apps\" id=\"appsGrid\"></div>\n      <div class=\"empty\" id=\"appsEmpty\">جاري جلب التطبيقات من التلفزيون…</div>\n      <button class=\"more-btn\" id=\"moreApps\" hidden>عرض بقية التطبيقات</button>\n    </div>\n\n    <div class=\"sec\">\n      <div class=\"sec-h\"><span>لوحة اللمس</span></div>\n      <div class=\"speed\" id=\"padSpeed\">\n        <button data-speed=\"slow\">دقيق</button>\n        <button data-speed=\"mid\" class=\"on\">متوسط</button>\n        <button data-speed=\"fast\">سريع</button>\n      </div>\n      <div class=\"pad\" id=\"pad\">\n        <p>مرّر بإصبعك لتحريك المؤشر على التلفزيون<br>وانقر للاختيار</p>\n      </div>\n    </div>\n\n    <div class=\"sec\">\n      <div class=\"sec-h\"><span>التشغيل</span></div>\n      <div class=\"grid3 media\">\n        <button class=\"key big\" data-cmd=\"rewind\">◀◀</button>\n        <button class=\"key big\" data-cmd=\"pause\">❚❚</button>\n        <button class=\"key big\" data-cmd=\"forward\">▶▶</button>\n      </div>\n      <div class=\"grid3 media\">\n        <button class=\"key big\" data-cmd=\"stop\">■</button>\n        <button class=\"key big\" data-cmd=\"play\">▶</button>\n        <button class=\"key\" data-btn=\"SEARCH\">SEARCH</button>\n      </div>\n    </div>\n\n    <div class=\"sec\">\n      <div class=\"sec-h\"><span>الكتابة والأرقام</span></div>\n      <div class=\"typing\">\n        <input id=\"textInput\" type=\"text\" placeholder=\"اكتب بالعربي أو الإنجليزي…\" autocomplete=\"off\">\n        <button class=\"btn\" id=\"sendTextBtn\">إرسال</button>\n      </div>\n      <div class=\"numpad\">\n        <button class=\"key\" data-btn=\"1\">1</button>\n        <button class=\"key\" data-btn=\"2\">2</button>\n        <button class=\"key\" data-btn=\"3\">3</button>\n        <button class=\"key\" data-btn=\"4\">4</button>\n        <button class=\"key\" data-btn=\"5\">5</button>\n        <button class=\"key\" data-btn=\"6\">6</button>\n        <button class=\"key\" data-btn=\"7\">7</button>\n        <button class=\"key\" data-btn=\"8\">8</button>\n        <button class=\"key\" data-btn=\"9\">9</button>\n        <button class=\"key\" data-btn=\"DASH\">−</button>\n        <button class=\"key\" data-btn=\"0\">0</button>\n        <button class=\"key\" data-cmd=\"del\">⌫</button>\n      </div>\n      <div class=\"grid3\">\n        <button class=\"key sm\" data-cmd=\"del\">⌫ مسح</button>\n        <button class=\"key sm\" data-btn=\"ENTER\">↵ إدخال</button>\n        <button class=\"key sm\" data-btn=\"EXIT\">خروج</button>\n      </div>\n    </div>\n\n    <div class=\"sec\">\n      <div class=\"sec-h\"><span>أزرار إضافية</span></div>\n      <div class=\"grid3\">\n        <button class=\"key sm\" data-btn=\"MENU\">SETTINGS</button>\n        <button class=\"key sm\" data-btn=\"CC\">CC</button>\n        <button class=\"key sm\" data-cmd=\"input\">INPUT</button>\n      </div>\n      <div class=\"grid3\">\n        <button class=\"key sm\" data-btn=\"LIST\">LIST</button>\n        <button class=\"key sm\" data-btn=\"QMENU\">Q.MENU</button>\n        <button class=\"key sm\" data-btn=\"SEARCH\">SEARCH</button>\n      </div>\n      <div class=\"colors\">\n        <button data-btn=\"RED\"><i style=\"background:#d9635f\"></i></button>\n        <button data-btn=\"GREEN\"><i style=\"background:#7bc043\"></i></button>\n        <button data-btn=\"YELLOW\"><i style=\"background:#e3ac52\"></i></button>\n        <button data-btn=\"BLUE\"><i style=\"background:#4d8fd9\"></i></button>\n      </div>\n    </div>\n\n  </div>\n</section>\n\n<!-- ===== البروجيكتر ===== -->\n<section class=\"screen\" id=\"dev-proj\" data-title=\"البروجيكتر\" data-sub=\"XL2-220\">\n\n  <div class=\"todo\" id=\"projSetup\">\n    <span class=\"badge\" id=\"projBadge\">جاري الفحص…</span>\n    <h3 id=\"projHead\">أبحث عن البروجيكتر</h3>\n    <p id=\"projWhy\">الاتصال عبر ADB — وهو ما يعطي كل زرّ وتشغيل التطبيقات\n       والإيقاظ من السكون.</p>\n    <div class=\"act-row\" style=\"margin-bottom:0\">\n      <button class=\"key sm\" id=\"projFind\">بحث عنه</button>\n      <button class=\"key sm\" id=\"projHelp\">كيف أفعّله؟</button>\n    </div>\n  </div>\n\n  <div id=\"projRemote\" hidden>\n\n    <div class=\"sec\">\n      <div class=\"sec-h\"><span>الطاقة والصوت</span></div>\n      <div class=\"rockers\">\n        <div class=\"rocker\">\n          <button data-pk=\"VOLUME_UP\">＋</button>\n          <span>الصوت</span>\n          <button data-pk=\"VOLUME_DOWN\">－</button>\n        </div>\n        <div class=\"mid\">\n          <button class=\"key\" data-pk=\"VOLUME_MUTE\">🔇</button>\n          <button class=\"key\" id=\"projWake\">تشغيل</button>\n        </div>\n        <div class=\"rocker\">\n          <button data-pk=\"MEDIA_FAST_FORWARD\">▶▶</button>\n          <span>التقديم</span>\n          <button data-pk=\"MEDIA_REWIND\">◀◀</button>\n        </div>\n      </div>\n    </div>\n\n    <div class=\"sec\">\n      <div class=\"sec-h\"><span>التنقل</span></div>\n      <div class=\"grid3\">\n        <button class=\"key\" data-pk=\"MENU\">MENU</button>\n        <button class=\"key\" data-pk=\"HOME\">HOME</button>\n        <button class=\"key\" data-pk=\"BACK\">BACK</button>\n      </div>\n      <div class=\"dpad\">\n        <button class=\"dpad-btn up\"    data-pk=\"DPAD_UP\"    aria-label=\"فوق\"></button>\n        <button class=\"dpad-btn down\"  data-pk=\"DPAD_DOWN\"  aria-label=\"تحت\"></button>\n        <button class=\"dpad-btn left\"  data-pk=\"DPAD_LEFT\"  aria-label=\"يسار\"></button>\n        <button class=\"dpad-btn right\" data-pk=\"DPAD_RIGHT\" aria-label=\"يمين\"></button>\n        <button class=\"dpad-ok\"        data-pk=\"DPAD_CENTER\">OK</button>\n      </div>\n    </div>\n\n    <div class=\"sec\">\n      <div class=\"sec-h\"><span>التطبيقات</span></div>\n      <div class=\"apps\" id=\"projApps\"></div>\n      <div class=\"empty\" id=\"projAppsEmpty\">جاري قراءة التطبيقات من الجهاز…</div>\n    </div>\n\n    <div class=\"sec\">\n      <div class=\"sec-h\"><span>التشغيل</span></div>\n      <div class=\"grid3 media\">\n        <button class=\"key big\" data-pk=\"MEDIA_PREVIOUS\">◀◀</button>\n        <button class=\"key big\" data-pk=\"MEDIA_PLAY_PAUSE\">❚❚</button>\n        <button class=\"key big\" data-pk=\"MEDIA_NEXT\">▶▶</button>\n      </div>\n      <div class=\"grid3\">\n        <button class=\"key sm\" data-pk=\"MEDIA_STOP\">إيقاف</button>\n        <button class=\"key sm\" data-pk=\"SEARCH\">بحث</button>\n        <button class=\"key sm\" id=\"projSleep\">إطفاء الشاشة</button>\n      </div>\n    </div>\n\n  </div>\n</section>\n\n<!-- ===== المكيفات ===== -->\n<section class=\"screen\" id=\"dev-ac-hall\" data-title=\"مكيف الصالة\" data-sub=\"ماندو بلس · قيد الإعداد\">\n  <div class=\"todo\">\n    <span class=\"badge\">ينقص مفتاح الربط</span>\n    <h3>المكيف يعمل بتطبيق Smart Life</h3>\n    <p>وهو من منظومة Tuya. للتحكم به من هنا نحتاج مفتاحه المحليّ، ويُستخرج\n       مرة واحدة ثم يعمل إلى الأبد بلا إنترنت.</p>\n    <ul>\n      <li>صورة شاشة المكيف من تطبيق Smart Life</li>\n      <li>معرفة نوعه: واي فاي داخله، أم جهاز أشعة أمامه</li>\n    </ul>\n  </div>\n</section>\n\n<section class=\"screen\" id=\"dev-ac-bed\" data-title=\"مكيف غرفة النوم\" data-sub=\"ماندو بلس · قيد الإعداد\">\n  <div class=\"todo\">\n    <span class=\"badge\">ينقص مفتاح الربط</span>\n    <h3>كمكيف الصالة</h3>\n    <p>نفس المنظومة ونفس المطلوب. يُضبطان معاً في خطوة واحدة.</p>\n  </div>\n</section>\n\n<!-- ===== الغسالتان ===== -->\n<section class=\"screen\" id=\"dev-washer\" data-title=\"غسالة الملابس\" data-sub=\"قيد الإعداد\">\n  <div class=\"todo\">\n    <span class=\"badge\">ينقص التعريف</span>\n    <h3>ما زلت لا أعرف نوعها</h3>\n    <p>ولكل شركة منظومتها: سامسونج بـ SmartThings، وغيرها بـ Smart Life أو\n       تطبيق خاص.</p>\n    <ul>\n      <li>ما ماركتها؟</li>\n      <li>هل هي موصولة بالواي فاي أصلاً؟ وبأي تطبيق؟</li>\n    </ul>\n  </div>\n</section>\n\n<section class=\"screen\" id=\"dev-dish\" data-title=\"غسالة الأطباق\" data-sub=\"سامسونج · قيد الإعداد\">\n  <div class=\"todo\">\n    <span class=\"badge\">ينقص الربط</span>\n    <h3>سامسونج — عبر SmartThings</h3>\n    <p>يلزم رمز وصول من حساب SmartThings، يُنشأ مرة ويُحفظ في الخادم.</p>\n    <ul>\n      <li>هل الغسالة مضافة في تطبيق SmartThings؟</li>\n    </ul>\n  </div>\n</section>\n\n<!-- ===== الصيانة ===== -->\n<section class=\"screen\" id=\"dev-maint\" data-title=\"الصيانة والأوامر\" data-sub=\"حالة الخادم\">\n  <div class=\"card\">\n    <h3>الحالة</h3>\n    <dl class=\"info\">\n      <dt>الخادم</dt>      <dd id=\"infoServer\">—</dd>\n      <dt>التلفزيون</dt>   <dd id=\"infoTv\">—</dd>\n      <dt>بطاقة الشبكة</dt><dd id=\"infoMac\">—</dd>\n      <dt>القناة</dt>      <dd id=\"infoLink\">—</dd>\n      <dt>النسخة</dt>      <dd id=\"infoVer\">—</dd>\n    </dl>\n  </div>\n\n  <div class=\"act-row\">\n    <button class=\"key sm\" id=\"cmdWake\">تشغيل التلفزيون</button>\n    <button class=\"key sm\" id=\"cmdFind\">بحث عن التلفزيون</button>\n    <button class=\"key sm\" id=\"cmdRepair\">إقران جديد</button>\n    <button class=\"key sm\" id=\"cmdReload\">تحديث الصفحة</button>\n  </div>\n\n  <div class=\"card\">\n    <h3>تحديث الخادم <span class=\"chip\" id=\"updChip\" hidden>يوجد تحديث</span></h3>\n    <p id=\"updNote\">يجلب آخر نسخة ويعيد تشغيل الخادم وحده — بلا لمس اللابتوب.</p>\n    <button class=\"key\" id=\"updBtn\" style=\"width:100%\">تحديث الآن</button>\n    <label class=\"toggle\" id=\"autoRow\">\n      <span>\n        <b>تحديث تلقائي</b>\n        <small id=\"autoNote\">يتفقّد كل نصف ساعة ويحدّث حين لا يكون أحد يستعمل الريموت</small>\n      </span>\n      <input type=\"checkbox\" id=\"autoChk\">\n    </label>\n    <div class=\"steps\" id=\"updSteps\" hidden></div>\n    <details style=\"margin-top:12px\">\n      <summary style=\"font-size:12px;color:var(--muted);cursor:pointer\">\n        الطريقة اليدوية — إن تعذّر الوصول للخادم</summary>\n      <p style=\"margin-top:10px\">على اللابتوب: زر ويندوز ← <b>powershell</b> ←\n         بالزر الأيمن ← تشغيل كمسؤول ← <b>Esc</b> ← الصق.</p>\n      <div class=\"code\" data-copy>irm https://raw.githubusercontent.com/samehhawas7-lab/voicetask/main/tvremote/windows/install.ps1 | iex</div>\n      <button class=\"key sm\" data-copy-for=\"prev\">نسخ</button>\n    </details>\n  </div>\n\n  <div class=\"card\">\n    <h3>تثبيت عنوان اللابتوب</h3>\n    <p>يمنع تبدّل العنوان بعد إعادة تشغيل الراوتر. يتحقّق من بقاء\n       الاتصال ويرجع وحده إن انقطع.</p>\n    <div class=\"code\" data-copy>powershell -ExecutionPolicy Bypass -File C:\\kmc-remote\\tvremote\\windows\\set-static-ip.ps1</div>\n    <button class=\"key sm\" data-copy-for=\"prev\">نسخ</button>\n  </div>\n\n  <div class=\"card\">\n    <h3>إعادة تشغيل الخادم</h3>\n    <p>حين يتوقف الريموت ولا ينفع التحديث.</p>\n    <div class=\"code\" data-copy>Stop-ScheduledTask \"KMC TV Remote\"; Start-ScheduledTask \"KMC TV Remote\"</div>\n    <button class=\"key sm\" data-copy-for=\"prev\">نسخ</button>\n  </div>\n\n  <div class=\"card\">\n    <h3>سجل الخادم</h3>\n    <p>آخر أربعين سطراً — ابعثها لي عند أي خلل.</p>\n    <div class=\"code\" data-copy>Get-Content C:\\kmc-remote\\tvremote\\windows\\server.log -Tail 40</div>\n    <button class=\"key sm\" data-copy-for=\"prev\">نسخ</button>\n  </div>\n\n  <div class=\"card\">\n    <h3>لا يشتغل التلفزيون بزرّ «تشغيل»؟</h3>\n    <p>الخادم يرسل حزمة الإيقاظ إلى ثلاث وجهات وخمس دفعات. فإن لم يستجب\n       فالسبب في التلفزيون لا في الشبكة. تحقّق من اثنين بريموته الأصلي:</p>\n    <p style=\"color:var(--text)\">\n      <b>١)</b> الإعدادات ← عام ← الأجهزة ← إعدادات إضافية ←\n      <b>تشغيل التلفاز بالهاتف المحمول</b> ← فعّل <b>«قم بالتشغيل عبر Wi-Fi»</b>\n      <br><br>\n      <b>٢)</b> الإعدادات ← عام ← <b>Quick Start+</b> ← فعّله\n    </p>\n    <p>الثاني هو ما يُبقي بطاقة الشبكة مغذّاة في السكون. وبدونه تنام\n       البطاقة مع التلفزيون فلا تسمع شيئاً — وهذا أشيع سبب.</p>\n  </div>\n\n  <div class=\"card\">\n    <h3>تفاصيل تقنية</h3>\n    <p>سجل هذه الجلسة داخل الجوال.</p>\n    <div class=\"code\" id=\"cmdDiag\" style=\"max-height:180px;white-space:pre-wrap\"></div>\n    <button class=\"key sm\" id=\"cmdCopyDiag\">نسخ التفاصيل</button>\n  </div>\n</section>\n\n</main>\n<div class=\"toast\" id=\"toast\" hidden></div>\n";

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
    permissions: ["TEST_SECURE","TEST_OPEN","TEST_PROTECTED","CONTROL_INPUT_TEXT",
    "CONTROL_MOUSE_AND_KEYBOARD","CONTROL_INPUT_JOYSTICK","CONTROL_INPUT_TV",
    "CONTROL_INPUT_MEDIA_PLAYBACK","CONTROL_INPUT_MEDIA_RECORDING","READ_INPUT_DEVICE_LIST",
    "READ_INSTALLED_APPS","READ_LGE_SDX","READ_NOTIFICATIONS","SEARCH","WRITE_SETTINGS",
    "WRITE_NOTIFICATION_ALERT","WRITE_NOTIFICATION_TOAST","CONTROL_POWER","CONTROL_TV_POWER",
    "CONTROL_TV_SCREEN","CONTROL_TV_STANBY","CONTROL_AUDIO","CONTROL_DISPLAY","CONTROL_WOL",
    "READ_CURRENT_CHANNEL","READ_RUNNING_APPS","READ_APP_STATUS","READ_UPDATE_INFO",
    "UPDATE_FROM_REMOTE_APP","READ_LGE_TV_INPUT_EVENTS","READ_TV_CURRENT_TIME",
    "READ_TV_CHANNEL_LIST","READ_NETWORK_STATE","READ_POWER_STATE","READ_SETTINGS",
    "LAUNCH","LAUNCH_WEBAPP","APP_TO_APP","CLOSE","READ_COUNTRY_INFO","CONTROL_USER_INFO",
    "CONTROL_BLUETOOTH","CHECK_BLUETOOTH_DEVICE","CONTROL_TIMER_INFO","STB_INTERNAL_CONNECTION"],
    serial: "2f930e2d2cfe083771f68e4fe7bb07"
  },
  // القائمتان متطابقتان عمداً: اختلافهما يجعل التلفزيون يمنح أذونات أضيق
  // بلا بيان، فتعمل بعض الوظائف دون بعض.
  permissions: ["TEST_SECURE","TEST_OPEN","TEST_PROTECTED","CONTROL_INPUT_TEXT",
    "CONTROL_MOUSE_AND_KEYBOARD","CONTROL_INPUT_JOYSTICK","CONTROL_INPUT_TV",
    "CONTROL_INPUT_MEDIA_PLAYBACK","CONTROL_INPUT_MEDIA_RECORDING","READ_INPUT_DEVICE_LIST",
    "READ_INSTALLED_APPS","READ_LGE_SDX","READ_NOTIFICATIONS","SEARCH","WRITE_SETTINGS",
    "WRITE_NOTIFICATION_ALERT","WRITE_NOTIFICATION_TOAST","CONTROL_POWER","CONTROL_TV_POWER",
    "CONTROL_TV_SCREEN","CONTROL_TV_STANBY","CONTROL_AUDIO","CONTROL_DISPLAY","CONTROL_WOL",
    "READ_CURRENT_CHANNEL","READ_RUNNING_APPS","READ_APP_STATUS","READ_UPDATE_INFO",
    "UPDATE_FROM_REMOTE_APP","READ_LGE_TV_INPUT_EVENTS","READ_TV_CURRENT_TIME",
    "READ_TV_CHANNEL_LIST","READ_NETWORK_STATE","READ_POWER_STATE","READ_SETTINGS",
    "LAUNCH","LAUNCH_WEBAPP","APP_TO_APP","CLOSE","READ_COUNTRY_INFO","CONTROL_USER_INFO",
    "CONTROL_BLUETOOTH","CHECK_BLUETOOTH_DEVICE","CONTROL_TIMER_INFO","STB_INTERNAL_CONNECTION"],
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
  launchAlt: "ssap://com.webos.applicationManager/launch",
  apps:    "ssap://com.webos.applicationManager/listLaunchPoints",
  fgApp:   "ssap://com.webos.applicationManager/getForegroundAppInfo",
  insert:  "ssap://com.webos.service.ime/insertText",
  del:     "ssap://com.webos.service.ime/deleteCharacters",
  enter:   "ssap://com.webos.service.ime/sendEnterKey",
  pointer: "ssap://com.webos.service.networkinput/getPointerInputSocket",
  sysInfo: "ssap://system/getSystemInfo",
  screenOff: "ssap://com.webos.service.tvpower/power/turnOffScreen",
  screenOn:  "ssap://com.webos.service.tvpower/power/turnOnScreen",
  toast:   "ssap://system.notifications/createToast",
  services: "ssap://api/getServiceList"
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
    if (typeof window.__TV_PROXY__ !== "undefined"){
      // خلف الخادم نفتح المقبس مباشرة — الخادم هو من يخاطب التلفزيون
      this._direct = new WebSocket(url);
      this._direct.onopen    = () => this._handle({ ev: "open" });
      this._direct.onmessage = (e) => this._handle({ ev: "message", data: String(e.data) });
      this._direct.onerror   = () => this._handle({ ev: "error" });
      this._direct.onclose   = (e) => this._handle({ ev: "close", code: e.code, reason: e.reason });
      return;
    }
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

  send(data){
    if (this._direct) return this._direct.send(data);
    relay.post({ id: this._id, op: "send", data });
  }

  close(){
    if (this._direct){ try { this._direct.close(); } catch {} }
    else relay.post({ id: this._id, op: "close" });
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
  get viaServer(){ return typeof window.__TV_PROXY__ !== "undefined"; }

  _urls(ip){
    // خلف خادم البيت: نكلّم الخادم، وهو يكلّم التلفزيون بأذونات كاملة
    if (this.viaServer){
      return [location.origin.replace(/^http/, "ws") +
              "/?target=" + encodeURIComponent("wss://" + ip + ":3001")];
    }
    return location.protocol === "https:"
      ? ["wss://" + ip + ":3001"]
      : ["ws://" + ip + ":3000", "wss://" + ip + ":3001"];
  }

  async connect(ip, opts){
    this.disconnect();
    this.ip = ip;
    this._forcePair = !!(opts && opts.forcePair);
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
        const key = this._forcePair ? null : store.get("webos_key_" + this.ip);
        diag("   مفتاح محفوظ: " + (key ? "نعم" : this._forcePair
          ? "تجاهلناه عمداً — إقران جديد" : "لا — التلفزيون بيسأل عن الموافقة"));
        const payload = { forcePairing: false, pairingType:"PROMPT", manifest: MANIFEST };
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
          entry.handler(msg.payload || {}, msg);
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
      const has = await this._checkInputService();
      const note = has === null ? "" :
        (has ? " · خدمة الإدخال موجودة في التلفزيون"
             : " · التلفزيون لا يوفّر خدمة الإدخال أصلاً");
      this.onPointer(false, e.message + note);
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
    if (this.viaServer){
      return location.origin.replace(/^http/, "ws") + "/?target=" +
             encodeURIComponent("wss://" + this.ip + ":3001" + path);
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
        id = this._send(kind, SSAP.pointer, null, (payload, msg) => {
          const raw = JSON.stringify(msg || payload || {});
          diag("   رد التلفزيون (" + kind + "): " + raw.slice(0, 300));
          this.lastPointerReply = raw.slice(0, 200);
          if (payload && payload.socketPath) return finish(resolve, payload.socketPath);
          const why = (msg && (msg.error || msg.errorText)) ||
                      (payload && (payload.errorText || payload.errorCode));
          if (why || (msg && msg.type === "error")){
            return finish(reject, new Error("التلفزيون رفض: " + (why || "بلا سبب معلن")));
          }
          // ردّ بلا عنوان ولا خطأ: ننتظر الرسالة التالية حتى تنتهي المهلة
        }, true);
      } catch (e){ finish(reject, e); }
    });
  }

  // قائمة خدمات التلفزيون تحسم ما إذا كانت خدمة الإدخال موجودة أصلاً
  async _checkInputService(){
    try {
      const list = await this.request(SSAP.services);
      const names = ((list && list.services) || []).map(x => x.name).filter(Boolean);
      diag("خدمات التلفزيون (" + names.length + "): " + names.join(", ").slice(0, 500));
      return names.some(n => /networkinput/i.test(n));
    } catch (e){
      diag("تعذّر جلب قائمة الخدمات: " + e.message);
      return null;
    }
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

  // إقران من الصفر: يمسح المنح القديمة ليطلب التلفزيون موافقة جديدة
  async repair(){
    const ip = this.ip;
    if (!ip) throw new Error("ما فيه عنوان تلفزيون");
    diag("── إقران جديد: مسح المفتاح القديم ──");
    store.del("webos_key_" + ip);
    this.disconnect();
    await new Promise(r => setTimeout(r, 400));
    return this.connect(ip, { forcePair: true });
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
  $("tvRemote").hidden   = !ready;
  if (!ready) $("padWarn").hidden = true;
  $("pairPanel").hidden  = status !== "pairing";
  $("setupPanel").hidden = (ready || status === "pairing");
  $("powerBtn").disabled = !ready;
  const pip = $("pipTv");
  if (pip) pip.className = "pip" + (ready ? " live" : (status === "disconnected" ? "" : " wait"));
  if (typeof screenSub === "function") screenSub("dev-tv", ready ? "متصل" : (STATUS_TEXT[status] || status));
  $("connectBtn").disabled = status === "connecting";

  // حالة التلفزيون تخصّ صفحته وحدها: كانت تكتب فوق عنوان الشاشة
  // الرئيسية فتقول «غير متصل» وليس ثمّة ما يُتصل به هناك أصلاً
  if (!ready && currentScreen === "dev-tv"){
    $("modelName").textContent = detail || STATUS_TEXT[status] || status;
  }
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

let installedApps = [];

// أسماء التطبيقات تختلف بين الطرازات، فنستخرجها من التلفزيون نفسه
// بدل الاعتماد على معرّف ثابت قد لا يوجد عنده.
function findApp(kind){
  const rules = {
    web:    [/browser/i, /^com\.webos\.app\.browser$/i, /متصفح|إنترنت|web|internet/i],
    livetv: [/livetv/i, /^com\.webos\.app\.livetv$/i, /live\s*tv|بث|تلفزيون/i],
    input:  [/inputcommon|externalinput/i, /^com\.webos\.app\.hdmi/i, /input|hdmi|مدخل/i]
  }[kind] || [];
  for (const re of rules){
    const hit = installedApps.find(a => re.test(a.id) || re.test(a.title || ""));
    if (hit) return hit.id;
  }
  return null;
}

// تختلف خدمة الإطلاق بين الطرازات، فنجرّب المعروفتين قبل أن نُعلن الفشل
let lastLaunch = { id: null, at: 0 };

async function launchApp(id, params){
  // الضغطات المتكررة ترسل أوامر متزاحمة يبطئ التلفزيون في هضمها،
  // فنتجاهل تكرار التطبيق نفسه خلال ثانيتين.
  const now = Date.now();
  if (lastLaunch.id === id && now - lastLaunch.at < 2000){
    diag("تجاهلت ضغطة مكررة على " + id);
    toast("جاري الفتح… امنح التلفزيون لحظة");
    return;
  }
  lastLaunch = { id, at: now };

  const payload = params ? { id, params } : { id };
  const wait = (ms) => new Promise(r => setTimeout(r, ms));

  // يقرّ التلفزيون بقبول الأمر ولو لم ينفّذه، فلا يكفي ردّه دليلاً.
  // نتحقق من التطبيق الشغّال فعلاً، وننتقل إلى الخدمة الأخرى إن لم يتغيّر.
  for (const uri of [SSAP.launch, SSAP.launchAlt]){
    const name = uri.replace("ssap://", "");
    try {
      const r = await tv.request(uri, payload);
      if (r && r.returnValue === false){
        diag("إطلاق " + id + " عبر " + name + ": ✗ " + (r.errorText || r.errorCode || "رفض"));
        continue;
      }
      diag("قبل التلفزيون الأمر عبر " + name + " — نتحقق من الأثر");
    } catch (e){
      diag("إطلاق " + id + " عبر " + name + ": ✗ " + e.message);
      continue;
    }

    await wait(1600);
    let fg = null;
    try { fg = await tv.request(SSAP.fgApp); } catch {}
    const running = fg && fg.appId;
    if (running === id){
      diag("✓ فُتح " + id + " فعلاً عبر " + name);
      return true;
    }
    diag("✗ الأمر قُبل ولم يتغيّر الشغّال (لا يزال " + (running || "غير معروف") + ")");
  }

  throw new Error("التلفزيون يقبل الأمر ولا يفتح التطبيق");
}

function launchKind(kind, fallback){
  const id = findApp(kind) || fallback;
  if (!id) return Promise.reject(new Error("ما لقيت هذا التطبيق على تلفزيونك"));
  return launchApp(id);
}

// التطبيقات الأساسية أولاً وبأيقوناتها.
// التلفزيون يعطي عشرات التطبيقات بترتيب أبجديّ، فيضيع المطلوب بينها.
// وأيقوناته يقدّمها على منفذه غير المشفّر، فقد تسقط — ولها بديل مرسوم.
const MAIN_APPS = [
  { name:"يوتيوب",       test:/youtube/i,                 color:"#e02f2f", glyph:"▶" },
  { name:"نتفلكس",       test:/netflix/i,                 color:"#c9302c", glyph:"N" },
  { name:"ديزني بلس",    test:/disney/i,                  color:"#1f4bb8", glyph:"D" },
  { name:"أمازون برايم", test:/(amazon|primevideo|lovefilm)/i, color:"#1f8fb8", glyph:"P" },
  { name:"المتصفح",      test:/browser/i,                 color:"#31708f", glyph:"\u{1F310}" },
];

function appTile(p, preset){
  const btn = document.createElement("button");
  btn.className = "app";
  btn.dataset.appId = p.id;

  const fallback = () => {
    const g = document.createElement("div");
    g.className = "glyph";
    g.style.background = preset ? preset.color : "var(--surface-3)";
    g.textContent = preset ? preset.glyph : (p.title || "?").trim().charAt(0);
    return g;
  };

  const icon = p.icon || p.largeIcon || p.mediumLargeIcon;
  if (icon){
    const img = document.createElement("img");
    img.src = icon;
    img.alt = "";
    img.loading = "lazy";
    img.onerror = () => { img.replaceWith(fallback()); };
    btn.appendChild(img);
  } else {
    btn.appendChild(fallback());
  }

  const label = document.createElement("span");
  label.textContent = preset ? preset.name : p.title;
  btn.appendChild(label);
  btn.onclick = () => { buzz(); launchApp(p.id, p.params).catch(e => toast(e.message, true)); };
  return btn;
}

tv.onApps = (points) => {
  installedApps = points || [];
  const grid = $("appsGrid");
  grid.innerHTML = "";
  const skip = /^(com\.webos\.app\.(hdmi|component|av|externalinput)|com\.webos\.exampleapp)/;
  const all = (points || []).filter(p => p.id && p.title && !skip.test(p.id));

  $("appsEmpty").hidden = all.length > 0;
  if (!all.length){ $("appsEmpty").textContent = "ما فيه تطبيقات — تأكد إن التلفزيون مشغّل"; return; }

  const chosen = new Set();
  MAIN_APPS.forEach(preset => {
    const hit = all.find(p => !chosen.has(p.id) && (preset.test.test(p.id) || preset.test.test(p.title)));
    if (!hit) return;
    chosen.add(hit.id);
    grid.appendChild(appTile(hit, preset));
  });

  const rest = all.filter(p => !chosen.has(p.id))
                  .sort((a,b) => (a.title||"").localeCompare(b.title||""));
  const more = $("moreApps");
  more.hidden = !rest.length;
  let open = false;
  more.onclick = () => {
    open = !open;
    if (open) rest.forEach(p => grid.appendChild(appTile(p, null)));
    else [...grid.children].slice(chosen.size).forEach(n => n.remove());
    more.textContent = open ? "إخفاء بقية التطبيقات" : "عرض بقية التطبيقات";
    buzz(10);
  };
};

// حالة قناة الأزرار تُعرض أمام المستخدم مباشرة بدل أن تبقى في السجل
tv.onPointer = (ok, reason) => {
  const bar = $("padWarn");
  bar.hidden = !!ok;

  // ما لا يعمل يجب أن يبدو معطّلاً، لا أن يوهم المستخدم بأنه صالح
  document.querySelectorAll("[data-btn]").forEach(el => el.classList.toggle("blocked", !ok));
  const pad = $("pad");
  if (pad) pad.classList.toggle("blocked", !ok);
  if (!ok){
    const denied = /401|permission/i.test(reason || "") ||
                   /401|permission/i.test(tv.lastPointerReply || "");
    $("padWarnText").textContent = denied
      ? "التلفزيون يمنع الإدخال من المتصفحات، فأزرار التنقل ولوحة اللمس معطّلة. "
        + "بقية الريموت يعمل كاملاً."
      : "أزرار التنقل معطّلة — " + (reason || "قناة الأزرار مغلقة");
  }
};

// اسم الطراز في الرأس — لمسة تعريفية مثل التطبيقات الاحترافية
tv.onReady = () => {
  // بطاقةُ الشبكة من التلفزيون نفسه أوثق من استنتاجها من جدول ARP،
  // وعليها يقوم إيقاظه وهو مطفأ. نسألها مرة عند كل جهوز.
  if (onServer){
    tv.request("ssap://com.webos.service.connectionmanager/getinfo").then(net => {
      const pick = (o) => (o && typeof o.macAddress === "string") ? o.macAddress : "";
      const mac = (pick(net && net.wifiInfo) || pick(net && net.wifi) ||
                   pick(net && net.wiredInfo) || pick(net && net.wired) || "").toLowerCase();
      if (!/^([0-9a-f]{2}:){5}[0-9a-f]{2}$/.test(mac)) return;
      diag("بطاقة التلفزيون من التلفزيون نفسه: " + mac);
      fetch("/tv-mac", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mac }),
      }).then(() => paintInfo()).catch(() => {});
    }).catch(() => {});
  }

  tv.request(SSAP.sysInfo).then(info => {
    const model = info && (info.modelName || info.model);
    $("modelName").textContent = model ? "webOS TV " + model : "متصل بـ " + tv.ip;
  }).catch(() => { $("modelName").textContent = "متصل بـ " + tv.ip; });
};

// ---------- تنفيذ الأوامر ----------
function runCmd(cmd){
  switch (cmd){
    case "power":
      // إطفاء كامل: التلفزيون يدخل السكون. وإيقاظه يحتاج حزمة شبكة لا
      // يملكها المتصفح — لكن الخادم يملكها، فمع الخادم الإطفاء ذو رجعة
      if (!confirm(onServer
            ? "إطفاء كامل للتلفزيون؟\n\nتقدر ترجّعه من التطبيق — زر «تشغيل التلفزيون» في صفحة الأوامر."
            : "إطفاء كامل للتلفزيون؟\n\nما راح تقدر تشغّله من جوالك — تحتاج الريموت الأصلي.\n\nلو تبي إطفاء ترجع منه، اضغط الزر ضغطة قصيرة بدل المطوّلة."))
        return Promise.resolve();
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
    case "livetv": return launchKind("livetv", "com.webos.app.livetv");
    case "web":    return launchKind("web", "com.webos.app.browser");
    case "input":  return launchKind("input", "com.webos.app.inputcommon");
    default: return Promise.reject(new Error("أمر غير معروف"));
  }
}

// ---------- الموجّه بين الشاشات ----------
// شاشة رئيسية وصفحة لكل جهاز. لا سحب أفقيّ: كان يصطدم بتمرير الصفحة
// نفسها فيقع المستخدم بين تنقّلين لا يريد أحدهما.
let currentScreen = "home";

function screenSub(id, text){
  const el = document.getElementById(id);
  if (el) el.dataset.sub = text;
  if (currentScreen === id) $("modelName").textContent = text;
}

function show(id){
  const target = document.getElementById(id);
  if (!target) return;
  document.querySelectorAll(".screen").forEach(sc => sc.classList.toggle("on", sc === target));
  currentScreen = id;
  $("pageTitle").textContent = target.dataset.title || "";
  $("modelName").textContent = target.dataset.sub || "";
  $("backBtn").hidden = (id === "home");
  $("settingsBtn").hidden = (id !== "dev-tv");   // أمراه للتلفزيون: قطع الاتصال ونسيان الإقران
  $("powerBtn").hidden = (id !== "dev-tv");
  target.scrollTop = 0;
  if (id === "dev-tv" && tv.status === "disconnected"){
    const ip = $("ipInput").value.trim() || store.get("webos_ip");
    if (ip && store.get("webos_key_" + ip)) tv.connect(ip);
  }
  if (id === "dev-maint"){ paintInfo(); if (window.__checkVersion) window.__checkVersion(); }
  if (id === "dev-proj" && window.__projCheck) window.__projCheck();
}


/* قفل التكبير: ضغطة خاطئة كانت تُكبّر الصفحة فتفسد المقاسات ويبدو
   التطبيق هشّاً. سفاري يتجاهل user-scalable، فتُمنع الإيماءة صراحةً. */
["gesturestart","gesturechange","gestureend"].forEach(ev =>
  document.addEventListener(ev, e => e.preventDefault(), { passive:false }));
document.addEventListener("dblclick", e => e.preventDefault(), { passive:false });

function setupRouter(){
  document.querySelectorAll("[data-go]").forEach(el => {
    el.onclick = () => { buzz(); show(el.dataset.go); };
  });
  $("backBtn").onclick = () => { buzz(); show("home"); };
  // زرّ الرجوع في الجوال يعود للشاشة الرئيسية لا يخرج من التطبيق
  addEventListener("popstate", () => { if (currentScreen !== "home") show("home"); });
  show("home");
}

// لوحة اللمس: تحرّك المؤشر على التلفزيون عبر قناة الأزرار
function setupTouchpad(){
  const pad = $("pad");
  let last = null, moved = 0;

  // الكسور كانت تُهدر بالتقريب، فالحركة البطيئة — وهي أدقّها — تضيع.
  // فنراكمها ونرسل الصحيح ونحتفظ بالباقي للحركة التالية.
  let accX = 0, accY = 0, pending = false;
  const SPEED = { slow: 0.55, mid: 1, fast: 1.7 };
  let sens = SPEED[store.get("pad_speed") || "mid"] || 1;

  const speedBox = $("padSpeed");
  if (speedBox){
    const paint = (k) => speedBox.querySelectorAll("button")
      .forEach(b => b.classList.toggle("on", b.dataset.speed === k));
    paint(store.get("pad_speed") || "mid");
    speedBox.querySelectorAll("button").forEach(b => b.onclick = () => {
      sens = SPEED[b.dataset.speed]; store.set("pad_speed", b.dataset.speed);
      paint(b.dataset.speed); buzz(10);
    });
  }

  const send = (msg) => {
    if (!tv.pointer || tv.pointer.readyState !== 1) return;
    tv.pointer.send(msg);
  };

  // إرسالة واحدة لكل إطار: إغراق المقبس يؤخّر المؤشر ويجعله يقفز
  const flush = () => {
    pending = false;
    const ix = Math.trunc(accX), iy = Math.trunc(accY);
    if (!ix && !iy) return;
    accX -= ix; accY -= iy;
    send("type:move\ndx:" + ix + "\ndy:" + iy + "\ndown:0\n\n");
  };

  pad.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    pad.setPointerCapture(e.pointerId);
    pad.classList.add("active");
    last = { x: e.clientX, y: e.clientY };
    moved = 0; accX = accY = 0;
  });

  pad.addEventListener("pointermove", (e) => {
    if (!last) return;
    const dx = e.clientX - last.x, dy = e.clientY - last.y;
    if (!dx && !dy) return;
    moved += Math.abs(dx) + Math.abs(dy);
    last = { x: e.clientX, y: e.clientY };
    accX += dx * sens; accY += dy * sens;
    if (!pending){ pending = true; requestAnimationFrame(flush); }
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
  setupRouter();
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

  // يجمّد النظام الصفحة حين تُترك فينقطع المقبس، فنصل فور العودة إليها
  // بدل انتظار مهلة إعادة الوصل.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible") return;
    if (tv.status === "ready" || tv.status === "connecting" || !tv.ip) return;
    diag("عادت الصفحة للواجهة — إعادة وصل فورية");
    tv.connect(tv.ip);
  });

  $("padRepair").onclick = () => {
    if (!confirm("إقران جديد؟\n\nبيطلع سؤال على شاشة التلفزيون، اضغط «موافق» بالريموت الأصلي.\nهذا يجدّد الأذونات وقد يحل مشكلة أزرار التنقل.")) return;
    const btn = $("padRepair");
    btn.disabled = true; btn.textContent = "جاري…";
    tv.repair()
      .then(() => toast("وافق من شاشة التلفزيون"))
      .catch(e => toast(e.message, true))
      .finally(() => { btn.disabled = false; btn.textContent = "إقران جديد"; });
  };

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

/* ============================================================
   الإيقاظ وصفحة الأوامر — لا تعملان إلا خلف الخادم
   المتصفح لا يملك UDP ولا البثّ العام، فالإيقاظ من عنده مستحيل.
   أما الخادم فبرنامج عادي يرسل الحزمة في جزء من الثانية.
   ============================================================ */
const onServer = typeof window.__TV_PROXY__ !== "undefined";

function wakeTv(btn){
  if (!onServer){
    toast("الإيقاظ يحتاج الخادم — افتح الريموت من عنوان اللابتوب", true);
    return Promise.resolve(false);
  }
  const label = btn ? btn.textContent : "";
  if (btn){ btn.disabled = true; btn.textContent = "جاري الإيقاظ…"; }
  diag("أطلب من الخادم إيقاظ التلفزيون");
  toast("أُرسلت إشارة التشغيل — يأخذ نحو عشر ثوانٍ");

  return post("/power-on")
    .then(r => {
      if (r.ok){
        diag("استيقظ التلفزيون على " + r.tv);
        toast("اشتغل التلفزيون");
        if (tv.status === "disconnected") tv.connect(r.tv || $("ipInput").value.trim());
        return true;
      }
      diag("فشل الإيقاظ: " + r.why);
      toast(r.why || "ما استجاب التلفزيون", true);
      return false;
    })
    .catch(e => { diag("خطأ في الإيقاظ: " + e.message); toast("تعذّر الوصول للخادم", true); return false; })
    .finally(() => { if (btn){ btn.disabled = false; btn.textContent = label; } });
}

(function setupCommandsPage(){
  const wake = $("wakeBtn");
  if (wake){
    wake.hidden = !onServer;
    wake.onclick = () => wakeTv(wake);
  }

  const cw = $("cmdWake");
  if (cw) cw.onclick = () => wakeTv(cw);

  const cf = $("cmdFind");
  if (cf) cf.onclick = () => {
    if (!onServer) return toast("يحتاج الخادم", true);
    cf.disabled = true; const t = cf.textContent; cf.textContent = "جاري البحث…";
    post("/find-tv")
      .then(r => { paintInfo(); toast(r.ok ? "التلفزيون على " + r.tv : "ما لقيته في الشبكة", !r.ok); })
      .catch(() => toast("تعذّر الوصول للخادم", true))
      .finally(() => { cf.disabled = false; cf.textContent = t; });
  };

  const cr = $("cmdRepair");
  if (cr) cr.onclick = () => $("padRepair").click();

  const cl = $("cmdReload");
  if (cl) cl.onclick = () => location.reload();

  // زر نسخ لكل كتلة أمر — النسخ من الشاشة على الجوال متعب
  document.querySelectorAll("[data-copy-for]").forEach(btn => {
    const code = btn.previousElementSibling;
    btn.onclick = () => {
      const text = code ? code.textContent : "";
      if (navigator.clipboard && navigator.clipboard.writeText){
        navigator.clipboard.writeText(text)
          .then(() => toast("نُسخ — الصقه في PowerShell"),
                () => toast("انسخه يدوياً من فوق", true));
      } else toast("انسخه يدوياً من فوق", true);
    };
  });

  const cd = $("cmdCopyDiag");
  if (cd) cd.onclick = () => $("copyDiagBtn").click();
})();


/* ============================================================
   البروجيكتر — أندرويد عبر ADB
   الخادم هو من يتكلّم ADB؛ المتصفح لا يملك مقابس خام. فالصفحة تطلب
   منه بأوامر بسيطة، وهو يقيّد ما يُمرَّر إلى صدفة الجهاز.
   ============================================================ */
(function setupProjector(){
  const setup = $("projSetup"), remote = $("projRemote");
  if (!setup) return;

  const say = (badge, head, why) => {
    $("projBadge").textContent = badge;
    $("projHead").textContent = head;
    $("projWhy").textContent = why;
  };

  function paint(r){
    const live = r && r.ok;
    remote.hidden = !live;
    setup.hidden = live;
    const pip = $("pipProj");
    if (pip) pip.className = "pip" + (live ? " live" : "");
    const tile = document.querySelector('[data-go="dev-proj"]');
    if (tile) tile.classList.toggle("soon", !live);
    screenSub("dev-proj", live ? "متصل · " + r.ip : "غير متصل");
    if (live) loadApps();
  }

  function check(){
    if (!onServer){
      say("يحتاج الخادم", "افتح الريموت من عنوان اللابتوب",
          "ADB يحتاج مقبساً خاماً لا يملكه المتصفح، فيتولّاه الخادم.");
      return;
    }
    say("جاري الفحص…", "أتحقّق من البروجيكتر", "لحظة…");
    fetch("/proj/health", { cache:"no-store" }).then(r => r.json()).then(r => {
      if (r.ok) return paint(r);
      say("غير متصل", "ما وصلت إليه بعد", r.why || "");
      paint(r);
    }).catch(() => { say("خطأ", "تعذّر الوصول للخادم", ""); });
  }

  $("projFind").onclick = () => {
    const b = $("projFind"); b.disabled = true; b.textContent = "جاري البحث…";
    say("جاري البحث…", "أمسح الشبكة", "أبحث عن جهاز يفتح منفذ ADB — يأخذ نحو نصف دقيقة.");
    post("/proj/find").then(r => {
      if (r.ok){ toast("وجدته على " + r.ip); check(); }
      else { toast("ما لقيته في الشبكة", true); say("لم يُوجد", "ما وجدت جهازاً يقبل ADB",
             "فعّل «تصحيح USB عبر الشبكة» من خيارات المطوّر في البروجيكتر."); }
    }).catch(() => toast("تعذّر الوصول للخادم", true))
      .finally(() => { b.disabled = false; b.textContent = "بحث عنه"; });
  };

  $("projHelp").onclick = () => alert(
    "لتفعيل ADB في البروجيكتر:\n\n" +
    "١) الإعدادات ← حول الجهاز\n" +
    "٢) اضغط «رقم الإصدار» سبع مرات حتى تظهر «صرت مطوّراً»\n" +
    "٣) ارجع ← خيارات المطوّر\n" +
    "٤) فعّل «تصحيح USB» و«تصحيح USB عبر الشبكة» أو ADB over network\n\n" +
    "ثم اضغط «بحث عنه». ستظهر على شاشة البروجيكتر رسالة تسأل عن السماح — وافق عليها، وعلّم «دائماً»."
  );

  const press = (name, el) => {
    if (!name) return;
    buzz(12);
    if (el) { el.classList.add("pressed"); setTimeout(() => el.classList.remove("pressed"), 110); }
    post("/proj/key?name=" + encodeURIComponent(name))
      .then(r => { if (!r.ok) toast(r.why || "ما استجاب البروجيكتر", true); })
      .catch(() => toast("تعذّر الوصول للخادم", true));
  };

  document.querySelectorAll("#dev-proj [data-pk]").forEach(el => {
    el.addEventListener("click", () => press(el.dataset.pk, el));
  });

  $("projWake").onclick  = () => { buzz(20); post("/proj/wake").then(()=>toast("أُرسلت إشارة التشغيل")); };
  $("projSleep").onclick = () => { buzz(20); post("/proj/sleep").then(()=>toast("أُطفئت الشاشة")); };

  let appsLoaded = false;
  function loadApps(){
    if (appsLoaded) return;
    appsLoaded = true;
    fetch("/proj/apps", { cache:"no-store" }).then(r => r.json()).then(r => {
      const grid = $("projApps"), empty = $("projAppsEmpty");
      grid.innerHTML = "";
      if (!r.ok || !r.apps || !r.apps.length){
        empty.hidden = false;
        empty.textContent = "ما لقيت تطبيقاً معروفاً على الجهاز";
        return;
      }
      empty.hidden = true;
      r.apps.forEach(a => {
        const btn = document.createElement("button");
        btn.className = "app";
        const g = document.createElement("div");
        g.className = "glyph"; g.style.background = a.color; g.textContent = a.glyph;
        const s2 = document.createElement("span"); s2.textContent = a.name;
        btn.append(g, s2);
        btn.onclick = () => {
          buzz();
          post("/proj/app?pkg=" + encodeURIComponent(a.pkg))
            .then(r2 => toast(r2.ok ? "فُتح " + a.name : (r2.why || "ما فُتح"), !r2.ok))
            .catch(() => toast("تعذّر الوصول للخادم", true));
        };
        grid.appendChild(btn);
      });
    }).catch(() => { appsLoaded = false; });
  }

  // نفحصه أول ما تُفتح صفحته لا عند تحميل التطبيق: المسح يكلّف
  window.__projCheck = check;
})();


/* ============================================================
   التحديث من داخل التطبيق
   الخادم يقتل نفسه في أثنائه ثم يعود بالمهمة المجدولة، فالانقطاع
   متوقَّع لا خطأ. نستطلع /health حتى يردّ، ثم نعيد تحميل الصفحة
   لتُحمَّل الواجهة الجديدة معه.
   ============================================================ */
function post(path){
  return fetch(path, { method:"POST", cache:"no-store" }).then(r => r.json());
}

(function setupUpdate(){
  const btn = $("updBtn"), box = $("updSteps"), chip = $("updChip"), note = $("updNote");
  if (!btn) return;

  const STEPS = ["يُطلب التحديث", "يُنزَّل ويُثبَّت", "يُعاد تشغيل الخادم", "تم"];
  let state = [];

  const draw = () => {
    box.innerHTML = "";
    STEPS.forEach((t, i) => {
      const d = document.createElement("div");
      d.className = state[i] || "";
      const ic = document.createElement("i");
      ic.textContent = state[i] === "done" ? "✓" : (state[i] === "fail" ? "✕" : "");
      d.append(ic, document.createTextNode(t));
      box.appendChild(d);
    });
  };
  const mark = (i, v) => { state[i] = v; draw(); };

  btn.onclick = () => {
    if (!onServer) return toast("افتح الريموت من عنوان اللابتوب أولاً", true);
    if (!confirm("تحديث الخادم؟\n\nينقطع الريموت نحو دقيقة ثم يعود وحده.")) return;

    btn.disabled = true;
    box.hidden = false;
    state = ["now", "", "", ""];
    draw();

    post("/update").then(r => {
      if (!r.ok){ mark(0, "fail"); toast(r.why || "تعذّر بدء التحديث", true); btn.disabled = false; return; }
      mark(0, "done"); mark(1, "now");
      waitForServer();
    }).catch(() => {
      // انقطاع الاتصال هنا وارد: قد يموت الخادم قبل أن يصلنا ردّه
      mark(0, "done"); mark(1, "now");
      waitForServer();
    });
  };

  // ثلاث مراحل نراها من الخارج: يعمل الآن، ثم ينقطع، ثم يعود
  function waitForServer(){
    const started = Date.now();
    let sawDown = false;
    const tick = () => {
      if (Date.now() - started > 180000){
        mark(1, "fail");
        toast("طال الانتظار — راجع update.log على اللابتوب", true);
        btn.disabled = false;
        return;
      }
      fetch("/health", { cache:"no-store" }).then(r => r.json()).then(() => {
        if (!sawDown) return setTimeout(tick, 3000);      // لم ينقطع بعد
        mark(1, "done"); mark(2, "done"); mark(3, "done");
        toast("تم التحديث — تُعاد الصفحة الآن");
        setTimeout(() => location.reload(), 1200);
      }).catch(() => {
        if (!sawDown){ sawDown = true; mark(1, "done"); mark(2, "now"); }
        setTimeout(tick, 3000);
      });
    };
    setTimeout(tick, 4000);
  }

  const chk = $("autoChk");
  if (chk) chk.onchange = () => {
    fetch("/auto-update", {
      method:"POST", headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ on: chk.checked }),
    }).then(r => r.json())
      .then(r => toast(r.autoUpdate ? "التحديث التلقائي مفعّل" : "أُطفئ التحديث التلقائي"))
      .catch(() => { chk.checked = !chk.checked; toast("تعذّر الحفظ", true); });
  };

  window.__checkVersion = () => {
    if (!onServer){ note.textContent = "التحديث يحتاج الخادم."; btn.disabled = true; return; }
    fetch("/version", { cache:"no-store" }).then(r => r.json()).then(v => {
      const when = v.installedAt
        ? new Date(v.installedAt).toLocaleDateString("ar", { day:"numeric", month:"long" })
        : "غير معروف";
      const el = $("infoVer");
      if (el) el.textContent = when + (v.updateAvailable ? " · يوجد أحدث" : "");
      chip.hidden = !v.updateAvailable;
      const pip = $("pipMaint");
      if (pip) pip.className = "pip" + (v.updateAvailable ? " wait" : "");
      note.textContent = v.updateAvailable
        ? "يوجد إصدار أحدث. الضغط يجلبه ويعيد تشغيل الخادم وحده."
        : "أنت على آخر نسخة. الضغط يعيد التثبيت على أي حال.";
      if (chk) chk.checked = v.autoUpdate !== false;
      const an = $("autoNote");
      if (an) an.textContent = v.autoUpdate === false
        ? "مطفأ — لن يتحدّث إلا بضغطك"
        : "يتفقّد كل نصف ساعة ويحدّث حين لا يكون أحد يستعمل الريموت"
          + (v.lastCheck ? " · آخر تفقّد " + new Date(v.lastCheck)
              .toLocaleTimeString("ar", { hour:"2-digit", minute:"2-digit" }) : "");
    }).catch(() => {});
  };
})();

function paintInfo(){
  const set = (id, v) => { const el = $(id); if (el) el.textContent = v; };
  const home = document.getElementById("home");
  if (home){
    home.dataset.sub = onServer ? "الخادم يعمل · " + location.hostname : "اختر جهازاً";
    if (currentScreen === "home") $("modelName").textContent = home.dataset.sub;
  }
  set("infoServer", onServer ? location.host : "بلا خادم (اتصال مباشر)");
  set("infoTv", tv.ip || "—");
  set("infoLink", tv.status === "connected"
      ? (tv.pointer && tv.pointer.readyState === 1 ? "متصلة + أزرار التنقل" : "متصلة بلا أزرار تنقل")
      : "غير متصلة");
  const dl = $("cmdDiag");
  if (dl) dl.textContent = diagLines.slice(-40).join("\n");

  if (!onServer) return set("infoMac", "—");
  fetch("/health", { cache: "no-store" }).then(r => r.json())
    .then(h => { set("infoTv", h.tv || tv.ip || "—"); set("infoMac", h.mac || "غير معروف بعد"); })
    .catch(() => set("infoMac", "—"));
}
setInterval(() => { if (!document.hidden) paintInfo(); }, 5000);
paintInfo();
if (window.__checkVersion) window.__checkVersion();

if (onServer){
  diag("وضع الخادم: الأوامر تمر عبر " + location.host + " بأذونات كاملة");
  const fromServer = window.__TV_PROXY__;
  if (fromServer && fromServer !== "auto"){
    $("ipInput").value = fromServer;
    store.set("webos_ip", fromServer);
  } else {
    // الخادم لم يكن قد عثر على التلفزيون حين قدّم الصفحة، فنسأله بعد قليل
    // بدل أن نطالب صاحب البيت بكتابة عنوان يعرفه الخادم أصلاً
    fetch("/health", { cache: "no-store" }).then(r => r.json()).then(h => {
      if (!h.tv || $("ipInput").value.trim()) return;
      $("ipInput").value = h.tv;
      store.set("webos_ip", h.tv);
      diag("الخادم عثر على التلفزيون: " + h.tv);
      if (store.get("webos_key_" + h.tv) && tv.status === "disconnected") tv.connect(h.tv);
    }).catch(() => {});
  }
}

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
      // التطبيق قد يكون بدأ الاتصال بالمفتاح المحفوظ، فلا نفتح اتصالاً ثانياً فوقه
      if (tv.status === "disconnected") tv.connect(host);
    } else {
      diag("تحذير: هذي الصفحة مو صفحة التلفزيون (" + host + ")");
      diag("افتح " + "http://<عنوان-التلفزيون>:3000" + " ثم شغّل الاختصار من هناك");
    }
  })();

})();

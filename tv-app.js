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
  reset.textContent = "\n/* ============================================================\n   ريموت KMC — webOS — واجهة متعددة الصفحات\n   ============================================================ */\n:root{\n  /* لوحة دافئة هادئة: الرماديّ الفحميّ أرحم للعين ليلاً من الأسود الصرف،\n     والفيروزيّ لهجةٌ ساكنة لا تُجهد كالأزرق الفاقع */\n  --bg:#12161b; --surface:#191f26; --surface-2:#222932; --surface-3:#2d3742;\n  --line:#2a333d; --text:#e7ecf1; --muted:#8f9bab;\n  --accent:#4db6a5; --accent-dim:#2c6f66; --nav:#3c4653;\n  --danger:#d9635f; --ok:#4fae7f; --warn:#e3ac52; --radius:18px;\n}\n/* ---------- ملء الشاشة ----------\n   سفاري في الآيفون لا يعرف Fullscreen API (هي للآيباد والفيديو\n   وحدهما)، فلا يُنادى عليها ويُرجى. الصفحةُ تملأ الشاشة بالتخطيط\n   نفسه: يُطوى الرأسُ وما حول الورقة، وتمتدّ الورقةُ إلى الحوافّ.\n   وهذا يعمل حيث لا تعمل تلك، ويعمل في التطبيق المثبَّت كذلك. */\nhtml[data-imm=\"1\"] .topbar,\nhtml[data-imm=\"1\"] #islam-quran > #qMarg{ display:none !important }\n/* في الريموت اللوحةُ مبسوطةٌ دائماً — فملءُ الشاشة يطويها كما كان\n   يطوي البطاقات، وإلا غطّت أزرارَ الصفحات */\nhtml[data-imm=\"1\"] #qOpts[data-flat=\"1\"]{ display:none !important }\n/* لوحةُ الخيارات في ملء الشاشة: تطفو من أسفل فوق الصفحة، لا تُخرِج منها */\nhtml[data-imm=\"1\"] #qOpts:not([hidden]){\n  position:fixed;inset-inline:0;bottom:0;z-index:60;\n  max-height:74dvh;overflow-y:auto;background:var(--bg);\n  border-top:1px solid var(--line);border-radius:18px 18px 0 0;\n  padding:12px 14px calc(env(safe-area-inset-bottom) + 74px);\n  box-shadow:0 -12px 40px rgba(0,0,0,.35)}\n/* والسحبُ الأفقيّ للتقليب لا يتنازعه المتصفّح */\n#islam-quran{touch-action:pan-y}\nhtml[data-imm=\"1\"] .screen{ padding:0 }\nhtml[data-imm=\"1\"] #qSheet{\n  border:none;border-radius:0;min-height:100dvh;\n  /* حواشٍ كحواشي المصحف المطبوع: كلُّ ملّيمترٍ يُترك هنا يُقتطع من\n     قامة الحرف — قارنّاها بمصحفٍ مطبوعٍ فضاقت */\n  padding:calc(env(safe-area-inset-top) + 40px) 6px calc(env(safe-area-inset-bottom) + 56px);\n  display:flex;flex-direction:column }\n/* والأسطرُ تُرصّ رصَّ المصحف: التباعدُ الرحب يأكل قامةَ الحرف.\n   وخطُّ المجمّع مصمَّمٌ لهذا الرصّ فلا تتصادم علاماتُه */\nhtml[data-imm=\"1\"] .qtext{ line-height:2.08; word-spacing:0 }\nhtml[data-imm=\"1\"] .qbsml{ line-height:1.9; margin:2px 0 6px }\nhtml[data-imm=\"1\"] .qsura{ margin:8px 2px 6px; padding:6px 8px }\nhtml[data-imm=\"1\"] .qtext .num{ min-width:21px;height:21px;line-height:19px;\n  font-size:10px;margin:0 3px }\nhtml[data-imm=\"1\"] #qBody{ flex:1 }\nhtml[data-imm=\"1\"] .qnav{\n  position:fixed;inset-inline:0;bottom:0;z-index:40;margin:0;\n  padding:8px 13px calc(env(safe-area-inset-bottom) + 8px);\n  background:var(--bg);border-top:1px solid var(--line) }\n/* زرُّ الخروج ظاهرٌ دائماً: من دخل ملء الشاشة ولم يجد له باباً\n   يخرج منه ظنّ التطبيق قد عُطِّل (القاعدة الثانية عشرة) */\n#qImmBar{ position:fixed;top:calc(env(safe-area-inset-top) + 6px);inset-inline-start:6px;\n  z-index:41;display:none;gap:6px }\nhtml[data-imm=\"1\"] #qImmBar{ display:flex }\n#qImmBar button{ width:32px;height:32px;border-radius:50%;\n  border:1px solid var(--line);background:var(--surface);color:var(--muted);\n  font-size:14px;font-family:inherit;cursor:pointer;opacity:.72 }\n#qImmBar button:active{ opacity:1 }\n\n/* ---------- الخلفيات ----------\n   لكلٍّ لوحةٌ كاملة لا خلفيةٌ وحدها: لو بُدّلت الخلفية دون النصّ\n   والحدود لصار في الشاشة نصٌّ فاتحٌ على ورقٍ فاتح. والتباين مقصود:\n   نصُّ المصحف يُقرأ طويلاً، فلا يُترك رماديّاً على رماديّ. */\nhtml[data-theme=\"black\"]{            /* أسود عميق — يوفّر بطارية شاشات OLED */\n  --bg:#000000; --surface:#0a0d11; --surface-2:#12161b; --surface-3:#1c232b;\n  --line:#232b34; --text:#e9eef3; --muted:#8b96a5;\n}\nhtml[data-theme=\"paper\"]{            /* ورقيّ — كالمصحف المطبوع */\n  --bg:#efe7d5; --surface:#faf5e8; --surface-2:#f5efdf; --surface-3:#e8dfc9;\n  --line:#d8ccae; --text:#2a2721; --muted:#6b6353;\n  --accent:#1d6f5e; --accent-dim:#c3e0d7; --nav:#d6c9a8;\n  --danger:#a8332f; --ok:#2a7349; --warn:#8f6415;\n}\nhtml[data-theme=\"light\"]{            /* فاتح — لضوء النهار الشديد */\n  --bg:#eef1f5; --surface:#ffffff; --surface-2:#f6f8fa; --surface-3:#e7ebf0;\n  --line:#d6dce4; --text:#1a1f26; --muted:#5d6875;\n  --accent:#1a7f70; --accent-dim:#bfe3dc; --nav:#cfd6de;\n  --danger:#b3322e; --ok:#237a4c; --warn:#8a6212;\n}\nhtml[data-theme=\"green\"]{            /* أخضر داكن — أهدأ ما جرّبت للقراءة الطويلة */\n  --bg:#0e1a15; --surface:#13241d; --surface-2:#182d24; --surface-3:#20392e;\n  --line:#26402f; --text:#e4efe7; --muted:#8ba496;\n  --accent:#5cc0a0; --accent-dim:#2b6b56; --nav:#345245;\n}\n\n/* ---------- المصحف المصوَّر ----------\n   صفحةُ طبعة المدينة بخطّ المجمّع: لكلّ صفحةٍ خطُّها وأشكالُ كلماتها\n   المحفورة. السطرُ لا يلتفّ — كلماتُه أرواحُ الطباعة نفسها — فيُفرش\n   بالتساوي حتى الحاشيتين كما في الورق */\n.qpage{margin:0 auto}\n.qline{display:flex;justify-content:space-between;align-items:baseline;\n  white-space:nowrap;line-height:var(--qlh,1.9);direction:rtl}\n.qline.qshort{justify-content:center;gap:.14em}\n.qline .ay{cursor:pointer;border-radius:6px}\n.qline .ay.sel{background:var(--accent-dim)}\n.qline .ay.now{background:var(--accent-dim);box-shadow:inset 0 0 0 1px var(--accent)}\n.qcfnote{font-size:10.5px;color:var(--muted);opacity:.8}\n\n/* ---------- ألوان التجويد ----------\n   ولا يُلوَّن إلا ما في النصّ من علامات: السكون سكونٌ مكتوب، والشدّة\n   شدّةٌ مكتوبة. فلا استنتاج ولا ظنّ — وما لا علامة له لا لون له. */\n.tj-ikhfa  { color:#5fb56a }\n.tj-idghg  { color:#2f9c62 }\n.tj-idghn  { color:#7f93ad }\n.tj-iqlab  { color:#6f7fd8 }\n.tj-ikhfash{ color:#5fb56a }\n.tj-idghsh { color:#2f9c62 }\n.tj-madd   { color:#e2504a }\n.tj-maddn  { color:#e0908a }\n.tj-ghunna { color:#3fa869 }\n.tj-qalqala{ color:#3f9ed6 }\n.tj-shadda { color:#9c74d4 }\n.tj-sukun  { color:#d1922f }\n.tj-tanween{ color:#c05fa2 }\n.tj-wasl   { color:var(--muted) }\nhtml[data-theme=\"paper\"] .tj-ikhfa, html[data-theme=\"paper\"] .tj-ikhfash,\nhtml[data-theme=\"light\"] .tj-ikhfa, html[data-theme=\"light\"] .tj-ikhfash{ color:#2b7a38 }\nhtml[data-theme=\"paper\"] .tj-idghg, html[data-theme=\"paper\"] .tj-idghsh,\nhtml[data-theme=\"light\"] .tj-idghg, html[data-theme=\"light\"] .tj-idghsh{ color:#186b41 }\nhtml[data-theme=\"paper\"] .tj-idghn,\nhtml[data-theme=\"light\"] .tj-idghn  { color:#566d86 }\nhtml[data-theme=\"paper\"] .tj-iqlab,\nhtml[data-theme=\"light\"] .tj-iqlab  { color:#3f4fae }\nhtml[data-theme=\"paper\"] .tj-madd,\nhtml[data-theme=\"light\"] .tj-madd   { color:#c3312b }\nhtml[data-theme=\"paper\"] .tj-maddn,\nhtml[data-theme=\"light\"] .tj-maddn  { color:#c4675f }\nhtml[data-theme=\"paper\"] .tj-ghunna,\nhtml[data-theme=\"light\"] .tj-ghunna { color:#1f7844 }\nhtml[data-theme=\"paper\"] .tj-qalqala,\nhtml[data-theme=\"light\"] .tj-qalqala{ color:#1b6f9e }\nhtml[data-theme=\"paper\"] .tj-shadda,\nhtml[data-theme=\"light\"] .tj-shadda { color:#6f45ab }\nhtml[data-theme=\"paper\"] .tj-sukun,\nhtml[data-theme=\"light\"] .tj-sukun  { color:#946012 }\nhtml[data-theme=\"paper\"] .tj-tanween,\nhtml[data-theme=\"light\"] .tj-tanween{ color:#96317a }\n/* وزنُ خطّ المصحف: الخطُّ العثمانيّ نسخةٌ واحدة الوزن، فالتغميقُ\n   يصنعه المتصفّح. «غامق» وزنٌ صناعيّ، و«أغمق» يزيد تحبيرَ الحواف */\nhtml[data-qbold=\"1\"] .qtext, html[data-qbold=\"1\"] .qbsml{ font-weight:700 }\nhtml[data-qbold=\"2\"] .qtext, html[data-qbold=\"2\"] .qbsml{\n  font-weight:700; -webkit-text-stroke:.015em currentColor }\n.tjlegend{display:flex;flex-wrap:wrap;gap:7px;margin-top:10px}\n.tjlegend span{font-size:11px;border:1px solid var(--line);border-radius:999px;\n  padding:3px 10px;background:var(--surface)}\n*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}\n[hidden]{display:none !important}\nhtml,body{margin:0;padding:0;background:var(--bg);color:var(--text);\n  touch-action:manipulation;overscroll-behavior:none;\n  font-family:\"SF Arabic\",\"Noto Kufi Arabic\",-apple-system,BlinkMacSystemFont,\"Segoe UI\",Tahoma,sans-serif;\n  overscroll-behavior:none;height:100%}\nbody{display:flex;flex-direction:column;height:100dvh;overflow:hidden;\n  padding:env(safe-area-inset-top) 0 env(safe-area-inset-bottom)}\n\n/* ---------- الرأس ---------- */\n.topbar{display:flex;align-items:center;justify-content:space-between;gap:12px;direction:ltr;\n  padding:10px 16px 12px;border-bottom:1px solid var(--line);flex:none}\n.title{text-align:center;flex:1;min-width:0;direction:rtl}\n.title h1{font-size:17px;font-weight:700;margin:0}\n.title .model{font-size:12px;color:var(--muted);margin-top:2px;direction:ltr}\n.icon-btn{width:44px;height:44px;border-radius:12px;border:1px solid var(--line);\n  background:var(--surface);color:var(--text);font-size:19px;cursor:pointer;flex:none}\n.icon-btn:active{background:var(--surface-2)}\n.pw-btn{width:52px;height:52px;border-radius:50%;border:none;background:var(--danger);\n  color:#fff;font-size:24px;cursor:pointer;flex:none;transition:transform .08s,filter .15s;\n  box-shadow:0 3px 12px rgba(229,72,77,.35)}\n.pw-btn:active{transform:scale(.92);filter:brightness(.85)}\n.pw-btn:disabled{background:var(--surface-2);color:var(--muted);box-shadow:none}\n.dot{width:9px;height:9px;border-radius:50%;background:var(--muted);flex:none;\n  transition:background .25s,box-shadow .25s;margin-inline-start:6px}\n.dot.ready{background:var(--ok);box-shadow:0 0 0 3px rgba(48,163,108,.18)}\n.dot.busy{background:var(--warn);box-shadow:0 0 0 3px rgba(245,165,36,.18)}\n.dot.error{background:var(--danger);box-shadow:0 0 0 3px rgba(229,72,77,.18)}\n\n/* ---------- الصفحات ---------- */\n.warnbar{background:rgba(245,165,36,.12);border-bottom:1px solid rgba(245,165,36,.4);\n  padding:10px 16px;font-size:12px;color:#f0d59a;flex:none}\n.warnbar span{display:block;line-height:1.7;word-break:break-word;max-height:5.2em;overflow-y:auto}\n.warnbar .acts{display:flex;gap:8px;margin-top:8px}\n.key.blocked,.dpad-btn.blocked,.dpad-ok.blocked{opacity:.3;pointer-events:none}\n.pad.blocked{opacity:.35}\n.pad.blocked p::after{content:\"\\A\\A(معطّلة — التلفزيون يمنع الإدخال من المتصفحات)\";white-space:pre}\n.warnbar button{background:var(--surface-2);border:1px solid var(--line);color:var(--text);\n  border-radius:10px;padding:9px 12px;font-size:12px;font-family:inherit;cursor:pointer;flex:1}\n.pages{flex:1;display:flex;overflow-x:auto;overflow-y:hidden;scroll-snap-type:x mandatory;direction:ltr;\n  -webkit-overflow-scrolling:touch;scrollbar-width:none}\n.pages::-webkit-scrollbar{display:none}\n.page{flex:0 0 100%;scroll-snap-align:center;overflow-y:auto;padding:16px 16px 8px;direction:rtl;\n  -webkit-overflow-scrolling:touch}\n.page-title{font-size:12px;color:var(--muted);text-align:center;margin:0 0 14px}\n.dots{display:flex;justify-content:center;gap:8px;padding:12px 0 8px;flex:none;direction:ltr}\n.dots i{width:7px;height:7px;border-radius:50%;background:var(--surface-3);\n  transition:background .25s,transform .25s}\n.dots i.on{background:var(--accent);transform:scale(1.25)}\n\n/* ---------- الأزرار ---------- */\n.key{background:var(--surface-2);border:1px solid var(--line);border-radius:14px;color:var(--text);\n  font-size:15px;font-weight:600;font-family:inherit;height:56px;cursor:pointer;display:flex;\n  align-items:center;justify-content:center;transition:transform .06s,background .12s;user-select:none}\n.key:active,.key.pressed{background:var(--surface-3);transform:scale(.94)}\n.key.danger{border-color:var(--danger);color:var(--danger)}\n.key.nav{background:var(--nav);border-color:#59637a}\n.key.nav:active,.key.nav.pressed{background:#5c6880}\n.key.big{font-size:19px}\n.key.sm{height:46px;font-size:13px}\n.grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:10px}\n.grid3.media{direction:ltr}\n.grid4{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:10px}\n\n/* الهزّازات: صوت وقنوات */\n.rockers{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:10px}\n.rocker{background:var(--surface-2);border:1px solid var(--line);border-radius:16px;\n  display:flex;flex-direction:column;overflow:hidden}\n.rocker button{background:none;border:none;color:var(--text);font-size:22px;font-family:inherit;\n  height:56px;cursor:pointer;transition:background .12s}\n.rocker button:active{background:var(--surface-3)}\n.rocker span{text-align:center;font-size:11px;color:var(--muted);padding:6px 0;\n  border-block:1px solid var(--line)}\n.mid{display:flex;flex-direction:column;gap:10px}\n.mid .key{height:56px}\n\n/* عجلة التنقل */\n.dpad{position:relative;width:100%;aspect-ratio:1;max-width:250px;margin:6px auto 12px;\n  background:radial-gradient(circle at 50% 50%,var(--surface-2) 0 31%,var(--surface) 31% 100%);\n  border:1px solid var(--line);border-radius:50%}\n.dpad-btn{position:absolute;border:none;background:transparent;cursor:pointer;width:34%;height:34%;\n  transition:background .12s}\n.dpad-btn::after{content:\"\";position:absolute;inset:0;margin:auto;width:0;height:0;border:10px solid transparent}\n.dpad-btn:active,.dpad-btn.pressed{background:rgba(61,139,255,.16)}\n.dpad-btn.up{top:1%;left:33%;border-radius:50% 50% 8px 8px}\n.dpad-btn.down{bottom:1%;left:33%;border-radius:8px 8px 50% 50%}\n.dpad-btn.left{left:1%;top:33%;border-radius:50% 8px 8px 50%}\n.dpad-btn.right{right:1%;top:33%;border-radius:8px 50% 50% 8px}\n.dpad-btn.up::after{border-bottom-color:var(--text);margin-bottom:15px}\n.dpad-btn.down::after{border-top-color:var(--text);margin-top:15px}\n.dpad-btn.left::after{border-right-color:var(--text);margin-right:15px}\n.dpad-btn.right::after{border-left-color:var(--text);margin-left:15px}\n.dpad-ok{position:absolute;inset:0;margin:auto;width:36%;height:36%;border-radius:50%;\n  background:var(--surface-3);border:1px solid var(--line);color:var(--text);font-size:15px;\n  font-weight:700;font-family:inherit;cursor:pointer;transition:transform .07s,background .12s}\n.dpad-ok:active,.dpad-ok.pressed{background:var(--accent-dim);transform:scale(.92)}\n\n/* أزرار ملوّنة */\n.colors{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:4px}\n.colors button{height:42px;border:1px solid var(--line);border-radius:12px;background:var(--surface-2);\n  cursor:pointer;display:flex;align-items:center;justify-content:center}\n.colors button:active{background:var(--surface-3)}\n.colors i{display:block;width:32px;height:7px;border-radius:4px}\n\n/* صفحة الأوامر */\n.card{background:var(--surface-2);border:1px solid var(--line);border-radius:16px;\n  padding:14px;margin-bottom:12px}\n.card h3{margin:0 0 8px;font-size:13.5px;font-weight:700}\n.card p{margin:0 0 10px;font-size:12px;color:var(--muted);line-height:1.85}\n.code{direction:ltr;text-align:left;background:var(--surface);border:1px solid var(--line);\n  border-radius:10px;padding:10px;font-size:11px;line-height:1.6;\n  font-family:ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--text);\n  overflow-x:auto;white-space:pre;margin:0 0 8px}\n.info{display:grid;grid-template-columns:auto 1fr;gap:7px 14px;font-size:12.5px;margin:0}\n.info dt{color:var(--muted)}\n.info dd{margin:0;direction:ltr;text-align:left;font-family:ui-monospace,Menlo,monospace;\n  overflow-wrap:anywhere}\n.dev{background:var(--surface-2);border:1px solid var(--line);border-radius:16px;\n  padding:14px 15px;display:grid;gap:6px}\n.dev.sup{border-color:var(--accent-dim)}\n.dev-top{display:flex;align-items:center;justify-content:space-between;gap:10px}\n.dev b{font-size:14px;font-weight:650}\n.dev .meta{font-size:11.5px;color:var(--muted);direction:ltr;text-align:left;\n  font-family:ui-monospace,Menlo,monospace;overflow-wrap:anywhere}\n.dev .tagline{font-size:12px;color:var(--muted);line-height:1.8}\n.dev .go{background:var(--accent-dim);border:1px solid var(--accent);color:var(--text);\n  border-radius:11px;height:34px;padding:0 14px;font-size:12px;font-family:inherit;\n  cursor:pointer;flex:none}\n.dev .flag{font-size:10.5px;border-radius:8px;padding:3px 9px;flex:none;\n  background:var(--surface-3);color:var(--muted)}\n.dev .flag.sup{background:var(--accent-dim);color:var(--text)}\n.dev .flag.kn{background:var(--surface-3);color:var(--warn)}\n.offbar{background:linear-gradient(180deg,var(--surface-2),var(--surface));\n  border:1px solid var(--line);border-radius:20px;padding:22px 18px;margin-bottom:16px;\n  text-align:center}\n.offbar b{display:block;font-size:17px;font-weight:750;margin-bottom:8px}\n.offbar p{margin:0 0 16px;font-size:12.5px;color:var(--muted);line-height:1.9}\n.offbar .key{width:100%;height:58px;font-size:16px;background:var(--ok);\n  border-color:transparent;color:#08210f}\n.ac-dial{display:grid;grid-template-columns:64px 1fr 64px;gap:14px;align-items:center;direction:ltr;\n  background:var(--surface-2);border:1px solid var(--line);border-radius:22px;\n  padding:22px 16px;margin-bottom:20px}\n.ac-dial button{height:64px;border-radius:50%;border:1px solid var(--line);\n  background:var(--surface-3);color:var(--text);font-size:28px;font-family:inherit;cursor:pointer;\n  transition:transform .08s,background .15s}\n.ac-dial button:active{transform:scale(.92);background:var(--accent-dim)}\n.ac-mid{text-align:center;direction:rtl}\n.ac-mid b{display:block;font-size:46px;font-weight:800;line-height:1;letter-spacing:-1px}\n.ac-mid b::after{content:\"\\B0\";font-size:26px;font-weight:600;color:var(--muted)}\n.ac-mid small{display:block;font-size:11.5px;color:var(--muted);margin-top:8px}\n.ac-remote.off .ac-mid b{color:var(--muted);opacity:.45}\n.key.on{background:var(--accent-dim);border-color:var(--accent)}\n.ac-power{background:var(--danger);border-color:transparent;color:#fff}\n.ac-power.on{background:var(--ok);border-color:transparent}\n.ac-msg{font-size:12px;color:var(--muted);line-height:1.9;min-height:1em}\n.ac-msg.bad{color:var(--danger)}\n.field select{width:100%;background:var(--surface);border:1px solid var(--line);\n  color:var(--text);border-radius:12px;height:46px;padding:0 12px;font-family:inherit;font-size:14px}\n.act-row{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px}\n.toggle{display:flex;align-items:center;justify-content:space-between;gap:14px;\n  margin-top:14px;padding-top:14px;border-top:1px solid var(--line);cursor:pointer}\n.toggle b{display:block;font-size:13px;font-weight:650}\n.toggle small{display:block;font-size:11.5px;color:var(--muted);line-height:1.7;margin-top:3px}\n.toggle input{appearance:none;-webkit-appearance:none;width:46px;height:27px;flex:none;\n  border-radius:14px;background:var(--surface-3);border:1px solid var(--line);\n  position:relative;cursor:pointer;transition:background .18s}\n.toggle input::after{content:\"\";position:absolute;top:2px;inset-inline-start:2px;\n  width:21px;height:21px;border-radius:50%;background:var(--muted);transition:.18s}\n.toggle input:checked{background:var(--accent-dim);border-color:var(--accent)}\n.toggle input:checked::after{inset-inline-start:21px;background:var(--accent)}\n.chip{display:inline-block;background:var(--warn);color:#231a08;border-radius:8px;\n  padding:2px 8px;font-size:10.5px;font-weight:700;vertical-align:middle;margin-inline-start:6px}\n.steps{margin-top:12px;font-size:12.5px;line-height:2.1;color:var(--muted)}\n.steps div{display:flex;align-items:center;gap:9px}\n.steps i{width:16px;height:16px;border-radius:50%;border:1.5px solid var(--line);flex:none;\n  display:flex;align-items:center;justify-content:center;font-size:9px;font-style:normal}\n.steps div.now{color:var(--text)}\n.steps div.now i{border-color:var(--accent);border-top-color:transparent;\n  animation:spin 1s linear infinite}\n.steps div.done{color:var(--text)}\n.steps div.done i{background:var(--ok);border-color:var(--ok);color:#08210f}\n.steps div.fail i{background:var(--danger);border-color:var(--danger);color:#2b0d0d}\n@keyframes spin{to{transform:rotate(360deg)}}\n\n/* لوحة اللمس */\n.pad{background:var(--surface-2);border:1px solid var(--line);border-radius:18px;\n  height:min(46vh,340px);margin-bottom:12px;touch-action:none;position:relative;\n  display:flex;align-items:center;justify-content:center}\n.pad.active{background:var(--surface-3);border-color:var(--accent-dim)}\n.pad p{color:var(--muted);font-size:12.5px;text-align:center;margin:0;padding:0 24px;line-height:1.9;\n  pointer-events:none}\n\n/* التطبيقات */\n.empty{color:var(--muted);font-size:13px;text-align:center;padding:40px 20px;line-height:2}\n\n/* لوحة الأرقام والكتابة */\n.numpad{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;max-width:300px;margin:0 auto 16px}\n.numpad .key{height:60px;font-size:21px}\n.typing{display:flex;gap:8px;align-items:center;margin-bottom:12px}\n.typing input{flex:1;min-width:0}\n\n/* ---------- الإعداد ---------- */\n.setup{padding:20px 16px;overflow-y:auto;flex:1}\n.panel{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius);\n  padding:18px 16px;margin-bottom:14px}\n.panel-title{margin:0 0 14px;font-size:15px;font-weight:700}\n.field{margin-bottom:18px}.field:last-child{margin-bottom:0}\n.field label{display:block;font-size:12px;color:var(--muted);margin-bottom:8px}\n.row{display:flex;gap:8px}.row input{flex:1;min-width:0}\ninput[type=text]{background:var(--surface-2);border:1px solid var(--line);border-radius:12px;\n  color:var(--text);padding:13px 14px;font-size:16px;font-family:inherit;width:100%;outline:none;\n  direction:ltr;text-align:right}\ninput[type=text]:focus{border-color:var(--accent)}\ninput::placeholder{color:#5c6579}\n.hint{font-size:11.5px;color:var(--muted);margin:8px 0 0;line-height:1.7}\n/* ---------- القسم الإسلاميّ ---------- */\n@font-face{font-family:\"Uthmani\";src:url(\"/islam/data/uthmanic.woff2\") format(\"woff2\");\n  font-display:swap}\n.qbar{display:flex;gap:8px;align-items:center;margin-bottom:12px;flex-wrap:wrap}\n.qbar select{flex:1;min-width:130px;background:var(--surface-2);color:var(--text);\n  border:1px solid var(--line);border-radius:12px;height:40px;padding:0 10px;\n  font-family:inherit;font-size:13px}\n/* الصفحة تُعرض كصفحة المصحف: نصٌّ متّصلٌ مضبوط الطرفين، لا آيةٌ في\n   كلّ سطر. وحدودُ الصفحات هي حدودُ مصحف المدينة نفسها */\n.qsheet{background:var(--surface-2);border:1px solid var(--line);border-radius:18px;\n  padding:16px 15px 8px;overflow:hidden}\n.qtext{font-family:\"Uthmani\",\"SF Arabic\",\"Noto Naskh Arabic\",serif;\n  font-size:var(--qsize,21px);line-height:2.55;text-align:justify;text-align-last:center;\n  word-spacing:.02em}\n.qtext .ay{cursor:pointer;border-radius:7px;transition:background .12s}\n.qtext .ay.sel{background:var(--accent-dim)}\n/* رقم الآية بخطّ الواجهة لا بخطّ المصحف: الخطّ العثمانيّ لا أرقام\n   فيه، فكانت تُرسم مسوخاً صغيرة داخل الدائرة */\n.qtext .num{display:inline-block;min-width:25px;height:25px;line-height:23px;\n  border:1px solid var(--accent-dim);border-radius:50%;text-align:center;\n  font-size:11px;color:var(--accent);margin:0 5px;vertical-align:middle;\n  font-family:\"SF Arabic\",\"Noto Kufi Arabic\",-apple-system,sans-serif}\n/* عنوان السورة يقع في وسط الصفحة كما في المصحف، لا في رأسها وحده */\n.qsura{text-align:center;background:var(--surface);border:1px solid var(--accent-dim);\n  border-radius:12px;padding:8px 10px;margin:14px 2px 10px}\n.qsura b{display:block;font-size:15.5px;font-weight:700}\n.qsura small{color:var(--muted);font-size:11px}\n.qbsml{text-align:center;font-family:\"Uthmani\",\"SF Arabic\",serif;font-size:calc(var(--qsize,21px) * .86);\n  color:var(--accent);margin:6px 0 10px;line-height:2.1}\n.qfoot{display:flex;justify-content:space-between;align-items:center;gap:8px;\n  margin-top:14px;padding-top:9px;border-top:1px solid var(--line);\n  font-size:11px;color:var(--muted)}\n.qpg{border:1px solid var(--accent-dim);border-radius:999px;padding:3px 13px;\n  color:var(--accent);font-weight:700;font-size:12px}\n.qnav{display:flex;gap:8px;align-items:center;margin-top:12px}\n.qnav .key{flex:1}\n.qjump{width:74px;height:40px;text-align:center;background:var(--surface-2);\n  color:var(--text);border:1px solid var(--line);border-radius:12px;\n  font-family:inherit;font-size:14px;font-weight:600}\n/* ---------- الأمر الصوتيّ ---------- */\n.mic-row{display:flex;align-items:center;gap:14px;background:var(--surface-2);\n  border:1px solid var(--line);border-radius:18px;padding:12px 14px;margin-bottom:14px}\n.mic{width:54px;height:54px;flex:0 0 54px;border-radius:50%;border:1px solid var(--accent-dim);\n  background:var(--surface);color:var(--accent);display:grid;place-items:center;\n  cursor:pointer;transition:transform .12s,background .12s}\n.mic:active{transform:scale(.94)}\n.mic[disabled]{opacity:.45;color:var(--muted);border-color:var(--line)}\n/* النبض يقول «أنا أسمع الآن» — ولا ينبض إلا وهو يسمع فعلاً */\n.mic.on{background:var(--accent-dim);color:var(--text);animation:micpulse 1.2s ease-in-out infinite}\n@keyframes micpulse{0%,100%{box-shadow:0 0 0 0 var(--accent-dim)}50%{box-shadow:0 0 0 10px transparent}}\n.mic-txt{min-width:0;flex:1}\n.mic-txt b{display:block;font-size:14px}\n.mic-txt small{display:block;color:var(--muted);font-size:11.5px;line-height:1.7;\n  overflow:hidden;text-overflow:ellipsis}\n.qplay{margin-top:12px}\n.qopts{display:flex;gap:10px;flex-wrap:wrap}\n.qopts label{flex:1;min-width:120px;font-size:11.5px;color:var(--muted);\n  display:flex;flex-direction:column;gap:5px}\n.qopts select{background:var(--surface-2);color:var(--text);border:1px solid var(--line);\n  border-radius:10px;height:36px;padding:0 8px;font-family:inherit;font-size:13px}\n/* الآية التي تُتلى الآن: تُميَّز عن الملموسة، فإحداهما للتفسير والأخرى للسمع */\n.qtext .ay.now{background:var(--accent-dim);box-shadow:inset 0 0 0 1px var(--accent)}\n/* الهامش: يُفصل بحدٍّ جانبيّ وخطٍّ أصغر، فيُقرأ حاشيةً لا متناً */\n.marg{margin:9px 4px 2px;padding:9px 12px;border-inline-start:2px solid var(--accent-dim);\n  background:var(--surface);border-radius:0 10px 10px 0;font-size:13px;line-height:2.05;\n  color:var(--muted)}\n.marg b{color:var(--accent);font-size:11px;display:block;margin-bottom:4px;font-weight:600}\n.zekr{background:var(--surface-2);border:1px solid var(--line);border-radius:16px;padding:14px 15px}\n.zekr .t{font-family:\"Uthmani\",\"SF Arabic\",serif;font-size:17px;line-height:2.3;white-space:pre-wrap}\n.zekr .v{font-size:12px;color:var(--muted);line-height:1.9;margin-top:9px}\n.zekr .r{font-size:11px;color:var(--accent);margin-top:5px}\n.zekr .c{float:inline-start;background:var(--accent-dim);border:1px solid var(--accent);\n  color:var(--text);border-radius:50%;width:42px;height:42px;font-size:15px;font-weight:700;\n  font-family:inherit;cursor:pointer;margin-inline-end:11px}\n.zekr .c.done{background:var(--ok);border-color:var(--ok);color:#08210f}\n.qibdial{position:relative;width:190px;height:190px;margin:0 auto;border-radius:50%;\n  border:2px solid var(--line);background:var(--surface);display:grid;place-items:center}\n.qibdial span{font-size:30px;color:var(--accent-dim)}\n.qibneedle{position:absolute;inset:0;border-radius:50%;\n  background:conic-gradient(from calc(var(--qib,0deg) - 3deg), var(--accent) 0 6deg, transparent 6deg)}\n.addrtip{background:var(--surface-2);border:1px solid var(--warn);border-radius:16px;\n  padding:14px 15px;margin:0 0 14px}\n.addrtip b{display:block;font-size:14px;font-weight:700;margin-bottom:6px;color:var(--warn)}\n.addrtip p{margin:0 0 10px;font-size:12px;color:var(--muted);line-height:1.8}\n.btn{background:var(--accent);color:#fff;border:none;border-radius:12px;padding:13px 18px;\n  font-size:14px;font-weight:600;font-family:inherit;cursor:pointer;white-space:nowrap;\n  transition:transform .08s,filter .15s}\n.btn:active{transform:scale(.97);filter:brightness(.9)}\n.btn:disabled{opacity:.5}\n.btn.ghost{background:var(--surface-2);border:1px solid var(--line);color:var(--text)}\n.btn.wide{width:100%;margin-top:8px}\n.notice{background:rgba(61,139,255,.09);border:1px solid var(--accent-dim);border-radius:12px;\n  padding:12px 14px;font-size:12.5px;line-height:1.8;color:#cfe0ff;margin-top:14px}\n.diag{margin-top:14px;border-top:1px solid var(--line);padding-top:12px}\n.diag summary{cursor:pointer;font-size:12px;color:var(--muted);list-style:none}\n.diag summary::-webkit-details-marker{display:none}\n.diag summary::before{content:\"▾ \"}\n.diag[open] summary::before{content:\"▴ \"}\n.diag pre{background:#0d1017;border:1px solid var(--line);border-radius:10px;padding:10px;\n  font-size:10.5px;line-height:1.7;color:#a9b4c7;direction:ltr;text-align:left;\n  white-space:pre-wrap;word-break:break-word;max-height:220px;overflow-y:auto;margin:10px 0}\n\n.toast{position:fixed;left:50%;bottom:calc(28px + env(safe-area-inset-bottom));\n  transform:translateX(-50%);background:var(--surface-3);border:1px solid var(--line);\n  color:var(--text);padding:12px 18px;border-radius:12px;font-size:13px;max-width:90vw;\n  text-align:center;z-index:50;box-shadow:0 8px 28px rgba(0,0,0,.45)}\n.toast.error{border-color:var(--danger)}\n\n/* ---------- الشاشات ---------- */\n/* لا سحب أفقيّ بعد اليوم: شاشة رئيسية، وكل جهاز صفحة واحدة طويلة.\n   السحب الأفقيّ يُضيع المستخدم ويصطدم بتمرير الصفحة نفسها. */\n.screens{flex:1;overflow:hidden;position:relative;display:flex}\n.screen{position:absolute;inset:0;overflow-y:auto;overflow-x:hidden;\n  -webkit-overflow-scrolling:touch;padding:14px 16px 28px;\n  opacity:0;pointer-events:none;transform:translateX(12px);\n  transition:opacity .22s ease,transform .22s ease}\n.screen.on{opacity:1;pointer-events:auto;transform:none;position:relative;flex:1}\n\n/* ---------- الشاشة الرئيسية ---------- */\n.hero{text-align:center;padding:22px 0 26px}\n.hero h2{margin:0;font-size:25px;font-weight:800;letter-spacing:.2px;\n  background:linear-gradient(120deg,var(--accent),#8fd6c8);\n  -webkit-background-clip:text;background-clip:text;color:transparent}\n.hero p{margin:8px 0 0;font-size:12.5px;color:var(--muted)}\n.tiles{display:grid;grid-template-columns:repeat(2,1fr);gap:13px}\n.tile{background:var(--surface-2);border:1px solid var(--line);border-radius:20px;\n  padding:20px 12px 16px;display:flex;flex-direction:column;align-items:center;gap:10px;\n  color:var(--text);font-family:inherit;cursor:pointer;position:relative;\n  transition:transform .1s,background .15s,border-color .15s}\n.tile:active{transform:scale(.96);background:var(--surface-3)}\n.tile svg{width:38px;height:38px;stroke:var(--accent);fill:none;\n  stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}\n.tile b{font-size:14px;font-weight:650;line-height:1.3;text-align:center}\n.tile small{font-size:10.5px;color:var(--muted)}\n.tile .pip{position:absolute;top:12px;left:12px;width:8px;height:8px;border-radius:50%;\n  background:var(--surface-3)}\n.tile .pip.live{background:var(--ok);box-shadow:0 0 0 3px rgba(79,174,127,.16)}\n.tile .pip.wait{background:var(--warn)}\n.tile.soon svg{stroke:var(--muted)}\n.tile.soon b{color:var(--muted)}\n\n/* ---------- أقسام داخل صفحة الجهاز ---------- */\n.sec{margin:0 0 22px}\n.sec-h{display:flex;align-items:center;gap:9px;margin:0 0 11px}\n.sec-h span{font-size:11.5px;color:var(--muted);font-weight:600;letter-spacing:.4px}\n.sec-h::after{content:\"\";flex:1;height:1px;background:var(--line)}\n\n/* ---------- التطبيقات ---------- */\n.apps{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}\n.app{background:var(--surface-2);border:1px solid var(--line);border-radius:18px;\n  padding:14px 8px 11px;display:flex;flex-direction:column;align-items:center;gap:9px;\n  color:var(--text);font-family:inherit;cursor:pointer;transition:transform .1s,background .15s}\n.app:active{transform:scale(.95);background:var(--surface-3)}\n.app img{width:46px;height:46px;border-radius:13px;object-fit:cover;display:block}\n.app .glyph{width:46px;height:46px;border-radius:13px;display:flex;align-items:center;\n  justify-content:center;font-size:19px;font-weight:800;color:#fff;letter-spacing:-.5px}\n.app span{font-size:11.5px;text-align:center;line-height:1.35}\n.more-btn{width:100%;margin-top:12px;background:none;border:1px dashed var(--line);\n  color:var(--muted);border-radius:14px;height:42px;font-family:inherit;font-size:12.5px;\n  cursor:pointer}\n.more-btn:active{background:var(--surface-2)}\n\n/* ---------- سرعة لوحة اللمس ---------- */\n.speed{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:10px}\n.speed button{background:var(--surface-2);border:1px solid var(--line);border-radius:12px;\n  color:var(--muted);height:38px;font-size:12px;font-family:inherit;cursor:pointer}\n.speed button.on{background:var(--accent-dim);border-color:var(--accent);color:var(--text)}\n\n/* ---------- بطاقة «قيد الإعداد» ---------- */\n.todo{background:var(--surface-2);border:1px solid var(--line);border-radius:var(--radius);\n  padding:18px}\n.todo h3{margin:0 0 10px;font-size:15px}\n.todo p{margin:0 0 12px;font-size:12.5px;color:var(--muted);line-height:1.9}\n.todo ul{margin:0;padding-inline-start:20px;font-size:12.5px;color:var(--muted);line-height:2}\n.todo .badge{display:inline-block;background:var(--surface-3);color:var(--warn);\n  border-radius:8px;padding:3px 9px;font-size:11px;margin-bottom:11px}\n\n@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}\n";
  head.appendChild(reset);

  doc.body.innerHTML = "\n<svg width=\"0\" height=\"0\" style=\"position:absolute\" aria-hidden=\"true\"><defs>\n  <symbol id=\"i-tv\" viewBox=\"0 0 24 24\"><rect x=\"2\" y=\"4\" width=\"20\" height=\"13\" rx=\"2\"/><path d=\"M8 21h8M12 17v4\"/></symbol>\n  <symbol id=\"i-proj\" viewBox=\"0 0 24 24\"><rect x=\"2\" y=\"6\" width=\"16\" height=\"11\" rx=\"2.5\"/><circle cx=\"9\" cy=\"11.5\" r=\"3.2\"/><path d=\"M18 9.5l4-2.5M18 14l4 2.5M5 20l1-3M15 20l-1-3\"/></symbol>\n  <symbol id=\"i-ac\" viewBox=\"0 0 24 24\"><rect x=\"2\" y=\"4\" width=\"20\" height=\"8\" rx=\"2\"/><path d=\"M6 8.5h12M6 16c1.6 0 1.6 2 3.2 2M13 16c1.6 0 1.6 2 3.2 2M6 19.5c1.6 0 1.6 2 3.2 2M13 19.5c1.6 0 1.6 2 3.2 2\"/></symbol>\n  <symbol id=\"i-wash\" viewBox=\"0 0 24 24\"><rect x=\"4\" y=\"2\" width=\"16\" height=\"20\" rx=\"2.5\"/><circle cx=\"12\" cy=\"14\" r=\"4.5\"/><path d=\"M8 6h.01M11 6h.01\"/></symbol>\n  <symbol id=\"i-dish\" viewBox=\"0 0 24 24\"><rect x=\"3\" y=\"2\" width=\"18\" height=\"20\" rx=\"2.5\"/><path d=\"M3 8h18\"/><circle cx=\"12\" cy=\"15\" r=\"3.5\"/><path d=\"M6.5 5h5\"/></symbol>\n  <symbol id=\"i-scan\" viewBox=\"0 0 24 24\"><circle cx=\"12\" cy=\"12\" r=\"2\"/><circle cx=\"12\" cy=\"12\" r=\"6.5\"/><circle cx=\"12\" cy=\"12\" r=\"10.5\"/><path d=\"M12 12l7-6\"/></symbol>\n  <symbol id=\"i-islam\" viewBox=\"0 0 24 24\"><path d=\"M17.5 5.5a7.5 7.5 0 100 13 8.5 8.5 0 110-13z\"/><path d=\"M19.6 8.2l.8 1.9 2 .2-1.5 1.3.45 2-1.75-1.1-1.75 1.1.45-2-1.5-1.3 2-.2z\"/></symbol>\n  <symbol id=\"i-router\" viewBox=\"0 0 24 24\"><rect x=\"2\" y=\"13\" width=\"20\" height=\"8\" rx=\"2\"/><path d=\"M6 17h.01M9.5 17h.01\"/><path d=\"M12 10V7\"/><path d=\"M8.5 6.5a5 5 0 017 0\"/><path d=\"M6 4a8.5 8.5 0 0112 0\"/></symbol>\n  <symbol id=\"i-tool\" viewBox=\"0 0 24 24\"><path d=\"M14.5 4.5a4.5 4.5 0 00-6 5.9L4 15v4h4l4.6-4.5a4.5 4.5 0 005.9-6l-2.8 2.8-2.6-.6-.6-2.6z\"/></symbol>\n</defs></svg>\n\n<header class=\"topbar\">\n  <button class=\"icon-btn\" id=\"backBtn\" aria-label=\"رجوع\" hidden>‹</button>\n  <button class=\"icon-btn\" id=\"settingsBtn\" aria-label=\"الإعدادات\">⚙</button>\n  <div class=\"title\">\n    <h1 id=\"pageTitle\">حبيبتي نون</h1>\n    <div class=\"model\" id=\"modelName\">اختر جهازاً</div>\n  </div>\n  <span class=\"dot\" id=\"statusDot\"></span>\n  <button class=\"pw-btn\" id=\"powerBtn\" aria-label=\"الطاقة\" hidden>⏻</button>\n</header>\n\n<main class=\"screens\" id=\"screens\">\n\n<!-- ===== الشاشة الرئيسية ===== -->\n<section class=\"screen on\" id=\"home\" data-title=\"البيت\" data-sub=\"اختر جهازاً\">\n  <div class=\"hero\">\n    <h2>حبيبتي نون</h2>\n    <p>كل أجهزة البيت في مكان واحد</p>\n  </div>\n\n  <!-- يظهر حين تُفتح الصفحة من عنوان البيت وثمّة عنوانٌ يعمل خارجه -->\n  <div class=\"addrtip\" id=\"addrTip\" hidden>\n    <b>احفظ هذا العنوان بدلاً منه</b>\n    <p>الذي فتحتَ منه يعمل داخل البيت وحده، ويتبدّل مع إعادة تشغيل\n       الراوتر. وهذا يعمل في البيت وخارجه سواء:</p>\n    <div class=\"code\" id=\"addrTipUrl\"></div>\n    <div class=\"act-row\" style=\"margin-bottom:0\">\n      <button class=\"key sm\" id=\"addrTipCopy\">انسخه</button>\n      <button class=\"key sm\" id=\"addrTipHide\">لا تُذكّرني</button>\n    </div>\n  </div>\n  <!-- الأمر بالصوت: زرٌّ واحد، ويقول ما فهم قبل أن ينفّذ -->\n  <div class=\"mic-row\">\n    <button class=\"mic\" id=\"micBtn\" aria-label=\"أمرٌ صوتيّ\">\n      <svg viewBox=\"0 0 24 24\" width=\"26\" height=\"26\" fill=\"none\" stroke=\"currentColor\"\n           stroke-width=\"1.9\" stroke-linecap=\"round\" stroke-linejoin=\"round\">\n        <path d=\"M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z\"/>\n        <path d=\"M19 10v2a7 7 0 0 1-14 0v-2\"/><path d=\"M12 19v3\"/>\n      </svg>\n    </button>\n    <div class=\"mic-txt\"><b id=\"micState\">قل أمرك</b><small id=\"micHeard\"></small></div>\n  </div>\n\n  <div class=\"tiles\">\n    <button class=\"tile\" data-go=\"dev-tv\">\n      <i class=\"pip\" id=\"pipTv\"></i>\n      <svg><use href=\"#i-tv\"></use></svg><b>التلفاز</b><small>KMC · webOS</small>\n    </button>\n    <button class=\"tile soon\" data-go=\"dev-proj\">\n      <i class=\"pip\" id=\"pipProj\"></i>\n      <svg><use href=\"#i-proj\"></use></svg><b>البروجيكتر</b><small>XL2-220</small>\n    </button>\n    <button class=\"tile soon\" data-go=\"dev-ac-hall\">\n      <i class=\"pip\" id=\"pipAcHall\"></i>\n      <svg><use href=\"#i-ac\"></use></svg><b>مكيف الصالة</b><small>ماندو بلس</small>\n    </button>\n    <button class=\"tile soon\" data-go=\"dev-ac-bed\">\n      <i class=\"pip\" id=\"pipAcBed\"></i>\n      <svg><use href=\"#i-ac\"></use></svg><b>مكيف غرفة النوم</b><small>ماندو بلس</small>\n    </button>\n    <button class=\"tile soon\" data-go=\"dev-washer\">\n      <i class=\"pip\"></i>\n      <svg><use href=\"#i-wash\"></use></svg><b>غسالة الملابس</b><small>—</small>\n    </button>\n    <button class=\"tile soon\" data-go=\"dev-dish\">\n      <i class=\"pip\"></i>\n      <svg><use href=\"#i-dish\"></use></svg><b>غسالة الأطباق</b><small>سامسونج</small>\n    </button>\n    <button class=\"tile\" data-go=\"dev-islam\" style=\"grid-column:1/-1\">\n      <svg><use href=\"#i-islam\"></use></svg><b>إسلامي</b><small>المصحف · الأذكار · المواقيت · القبلة</small>\n    </button>\n    <button class=\"tile\" data-go=\"dev-router\">\n      <i class=\"pip\" id=\"pipRouter\"></i>\n      <svg><use href=\"#i-router\"></use></svg><b>الراوتر</b><small>الشبكة ومن عليها</small>\n    </button>\n    <button class=\"tile\" data-go=\"dev-survey\">\n      <svg><use href=\"#i-scan\"></use></svg><b>أجهزة البيت</b><small>امسح واعرف ما فيها</small>\n    </button>\n    <button class=\"tile\" data-go=\"dev-maint\" style=\"grid-column:1/-1\">\n      <i class=\"pip\" id=\"pipMaint\"></i>\n      <svg><use href=\"#i-tool\"></use></svg><b>الصيانة والأوامر</b><small>حالة الخادم وأوامره</small>\n    </button>\n  </div>\n</section>\n\n<!-- ===== التلفاز ===== -->\n<section class=\"screen\" id=\"dev-tv\" data-title=\"التلفاز\" data-sub=\"غير متصل\">\n\n  <div class=\"offbar\" id=\"tvOff\" hidden>\n    <b>التلفزيون مطفأ</b>\n    <p>«إطفاء الشاشة» ينتهي بإطفاء كامل بعد مدة — وعندها لا يفتحه إلا\n       الإيقاظ الشبكي.</p>\n    <button class=\"key\" id=\"tvOffWake\">تشغيل التلفزيون</button>\n    <button class=\"key sm\" id=\"tvWakeCheck\" style=\"width:100%;margin-top:10px;\n      background:var(--surface-2);color:var(--text)\">هل يمكن تشغيله وهو مطفأ؟</button>\n    <div id=\"tvWakeMsg\" class=\"hint\" style=\"text-align:start\"></div>\n  </div>\n\n  <div class=\"setup\" id=\"setupPanel\">\n    <div class=\"panel\">\n      <h2 class=\"panel-title\">توصيل التلفزيون</h2>\n      <div class=\"field\">\n        <label for=\"ipInput\">عنوان IP للتلفزيون</label>\n        <div class=\"row\">\n          <input id=\"ipInput\" type=\"text\" inputmode=\"decimal\" placeholder=\"192.168.8.77\" autocomplete=\"off\">\n          <button class=\"btn\" id=\"connectBtn\">توصيل</button>\n        </div>\n        <p class=\"hint\">الخادم يبحث عنه وحده — لا يلزمك كتابته عادةً</p>\n      </div>\n      <button class=\"btn ghost wide\" id=\"wakeBtn\" hidden>تشغيل التلفزيون وهو مطفأ</button>\n      <div id=\"setupNotice\" class=\"notice\" hidden></div>\n      <details class=\"diag\" id=\"diagWrap\">\n        <summary>تفاصيل تقنية</summary>\n        <pre id=\"diagLog\"></pre>\n        <button class=\"btn ghost wide\" id=\"copyDiagBtn\">نسخ التفاصيل</button>\n      </details>\n    </div>\n  </div>\n\n  <div class=\"setup\" id=\"pairPanel\" hidden>\n    <div class=\"panel\">\n      <h2 class=\"panel-title\">وافق من التلفزيون</h2>\n      <p class=\"hint\" style=\"font-size:13.5px\">\n        ظهرت على شاشة التلفزيون رسالة تسأل عن السماح لهذا الجهاز.<br>\n        اضغط <b>«موافق»</b> بريموت التلفزيون الأصلي.<br><br>\n        مرة وحدة بس — بعدها يتذكرك.\n      </p>\n      <button class=\"btn ghost wide\" id=\"cancelPairBtn\">إلغاء</button>\n    </div>\n  </div>\n\n  <div class=\"warnbar\" id=\"padWarn\" hidden>\n    <span id=\"padWarnText\"></span>\n    <div class=\"acts\">\n      <button id=\"padRetry\">إعادة المحاولة</button>\n      <button id=\"padRepair\">إقران جديد</button>\n    </div>\n  </div>\n\n  <div id=\"tvRemote\" hidden>\n\n    <div class=\"sec\">\n      <div class=\"sec-h\"><span>الصوت والقنوات</span></div>\n      <div class=\"rockers\">\n        <div class=\"rocker\">\n          <button data-cmd=\"volUp\" data-repeat>＋</button>\n          <span id=\"volLabel\">الصوت</span>\n          <button data-cmd=\"volDown\" data-repeat>－</button>\n        </div>\n        <div class=\"mid\">\n          <button class=\"key\" data-cmd=\"mute\">🔇</button>\n          <button class=\"key\" data-btn=\"INFO\">INFO</button>\n        </div>\n        <div class=\"rocker\">\n          <button data-cmd=\"chUp\" data-repeat>▲</button>\n          <span>القناة</span>\n          <button data-cmd=\"chDown\" data-repeat>▼</button>\n        </div>\n      </div>\n    </div>\n\n    <div class=\"sec\">\n      <div class=\"sec-h\"><span>التنقل</span></div>\n      <div class=\"grid3\">\n        <button class=\"key\" data-btn=\"GUIDE\">GUIDE</button>\n        <button class=\"key\" data-btn=\"HOME\">HOME</button>\n        <button class=\"key\" data-cmd=\"web\">WEB</button>\n      </div>\n      <div class=\"dpad\">\n        <button class=\"dpad-btn up\"    data-btn=\"UP\"    aria-label=\"فوق\"></button>\n        <button class=\"dpad-btn down\"  data-btn=\"DOWN\"  aria-label=\"تحت\"></button>\n        <button class=\"dpad-btn left\"  data-btn=\"LEFT\"  aria-label=\"يسار\"></button>\n        <button class=\"dpad-btn right\" data-btn=\"RIGHT\" aria-label=\"يمين\"></button>\n        <button class=\"dpad-ok\"        data-btn=\"ENTER\">OK</button>\n      </div>\n      <div class=\"grid3\">\n        <button class=\"key\" data-btn=\"BACK\">BACK</button>\n        <button class=\"key\" data-cmd=\"livetv\">TV</button>\n        <button class=\"key\" data-btn=\"EXIT\">EXIT</button>\n      </div>\n    </div>\n\n    <div class=\"sec\">\n      <div class=\"sec-h\"><span>التطبيقات</span></div>\n      <div class=\"apps\" id=\"appsGrid\"></div>\n      <div class=\"empty\" id=\"appsEmpty\">جاري جلب التطبيقات من التلفزيون…</div>\n      <button class=\"more-btn\" id=\"moreApps\" hidden>عرض بقية التطبيقات</button>\n    </div>\n\n    <div class=\"sec\">\n      <div class=\"sec-h\"><span>لوحة اللمس</span></div>\n      <div class=\"speed\" id=\"padSpeed\">\n        <button data-speed=\"slow\">دقيق</button>\n        <button data-speed=\"mid\" class=\"on\">متوسط</button>\n        <button data-speed=\"fast\">سريع</button>\n      </div>\n      <div class=\"pad\" id=\"pad\">\n        <p>مرّر بإصبعك لتحريك المؤشر على التلفزيون<br>وانقر للاختيار</p>\n      </div>\n    </div>\n\n    <div class=\"sec\">\n      <div class=\"sec-h\"><span>التشغيل</span></div>\n      <div class=\"grid3 media\">\n        <button class=\"key big\" data-cmd=\"rewind\">◀◀</button>\n        <button class=\"key big\" data-cmd=\"pause\">❚❚</button>\n        <button class=\"key big\" data-cmd=\"forward\">▶▶</button>\n      </div>\n      <div class=\"grid3 media\">\n        <button class=\"key big\" data-cmd=\"stop\">■</button>\n        <button class=\"key big\" data-cmd=\"play\">▶</button>\n        <button class=\"key\" data-btn=\"SEARCH\">SEARCH</button>\n      </div>\n    </div>\n\n    <div class=\"sec\">\n      <div class=\"sec-h\"><span>الكتابة والأرقام</span></div>\n      <div class=\"typing\">\n        <input id=\"textInput\" type=\"text\" placeholder=\"اكتب بالعربي أو الإنجليزي…\" autocomplete=\"off\">\n        <button class=\"btn\" id=\"sendTextBtn\">إرسال</button>\n      </div>\n      <div class=\"numpad\">\n        <button class=\"key\" data-btn=\"1\">1</button>\n        <button class=\"key\" data-btn=\"2\">2</button>\n        <button class=\"key\" data-btn=\"3\">3</button>\n        <button class=\"key\" data-btn=\"4\">4</button>\n        <button class=\"key\" data-btn=\"5\">5</button>\n        <button class=\"key\" data-btn=\"6\">6</button>\n        <button class=\"key\" data-btn=\"7\">7</button>\n        <button class=\"key\" data-btn=\"8\">8</button>\n        <button class=\"key\" data-btn=\"9\">9</button>\n        <button class=\"key\" data-btn=\"DASH\">−</button>\n        <button class=\"key\" data-btn=\"0\">0</button>\n        <button class=\"key\" data-cmd=\"del\">⌫</button>\n      </div>\n      <div class=\"grid3\">\n        <button class=\"key sm\" data-cmd=\"del\">⌫ مسح</button>\n        <button class=\"key sm\" data-btn=\"ENTER\">↵ إدخال</button>\n        <button class=\"key sm\" data-btn=\"EXIT\">خروج</button>\n      </div>\n    </div>\n\n    <div class=\"sec\">\n      <div class=\"sec-h\"><span>أزرار إضافية</span></div>\n      <div class=\"grid3\">\n        <button class=\"key sm\" data-btn=\"MENU\">SETTINGS</button>\n        <button class=\"key sm\" data-btn=\"CC\">CC</button>\n        <button class=\"key sm\" data-cmd=\"input\">INPUT</button>\n      </div>\n      <div class=\"grid3\">\n        <button class=\"key sm\" data-btn=\"LIST\">LIST</button>\n        <button class=\"key sm\" data-btn=\"QMENU\">Q.MENU</button>\n        <button class=\"key sm\" data-btn=\"SEARCH\">SEARCH</button>\n      </div>\n      <div class=\"colors\">\n        <button data-btn=\"RED\"><i style=\"background:#d9635f\"></i></button>\n        <button data-btn=\"GREEN\"><i style=\"background:#7bc043\"></i></button>\n        <button data-btn=\"YELLOW\"><i style=\"background:#e3ac52\"></i></button>\n        <button data-btn=\"BLUE\"><i style=\"background:#4d8fd9\"></i></button>\n      </div>\n    </div>\n\n  </div>\n</section>\n\n<!-- ===== البروجيكتر ===== -->\n<section class=\"screen\" id=\"dev-proj\" data-title=\"البروجيكتر\" data-sub=\"XL2-220\">\n\n  <div class=\"todo\" id=\"projSetup\">\n    <span class=\"badge\" id=\"projBadge\">جاري الفحص…</span>\n    <h3 id=\"projHead\">أبحث عن البروجيكتر</h3>\n    <p id=\"projWhy\">الاتصال عبر ADB — وهو ما يعطي كل زرّ وتشغيل التطبيقات\n       والإيقاظ من السكون.</p>\n    <div class=\"act-row\" style=\"margin-bottom:0\">\n      <button class=\"key sm\" id=\"projFind\">بحث عنه</button>\n      <button class=\"key sm\" id=\"projHelp\">كيف أفعّله؟</button>\n      <button class=\"key sm\" id=\"projScan\">افحص الجهاز</button>\n      <button class=\"key sm\" id=\"projScanWide\">فحص شامل</button>\n      <button class=\"key sm\" id=\"projWakeCheck\">هل يُشغَّل وهو مطفأ؟</button>\n    </div>\n    <div id=\"projWakeMsg\" class=\"hint\" style=\"text-align:start\"></div>\n    <div class=\"code\" id=\"projReport\" hidden style=\"margin-top:12px;white-space:pre-wrap\"></div>\n  </div>\n\n  <div id=\"projRemote\" hidden>\n\n    <div class=\"sec\">\n      <div class=\"sec-h\"><span>الطاقة والصوت</span></div>\n      <div class=\"rockers\">\n        <div class=\"rocker\">\n          <button data-pk=\"VOLUME_UP\">＋</button>\n          <span>الصوت</span>\n          <button data-pk=\"VOLUME_DOWN\">－</button>\n        </div>\n        <div class=\"mid\">\n          <button class=\"key\" data-pk=\"VOLUME_MUTE\">🔇</button>\n          <button class=\"key\" id=\"projWake\" title=\"يوقظه من إطفاء الشاشة، لا من الإطفاء الكامل\">أيقظ الشاشة</button>\n        </div>\n        <div class=\"rocker\">\n          <button data-pk=\"MEDIA_FAST_FORWARD\">▶▶</button>\n          <span>التقديم</span>\n          <button data-pk=\"MEDIA_REWIND\">◀◀</button>\n        </div>\n      </div>\n    </div>\n\n    <div class=\"sec\">\n      <div class=\"sec-h\"><span>التنقل</span></div>\n      <div class=\"grid3\">\n        <button class=\"key\" data-pk=\"MENU\">MENU</button>\n        <button class=\"key\" data-pk=\"HOME\">HOME</button>\n        <button class=\"key\" data-pk=\"BACK\">BACK</button>\n      </div>\n      <div class=\"dpad\">\n        <button class=\"dpad-btn up\"    data-pk=\"DPAD_UP\"    aria-label=\"فوق\"></button>\n        <button class=\"dpad-btn down\"  data-pk=\"DPAD_DOWN\"  aria-label=\"تحت\"></button>\n        <button class=\"dpad-btn left\"  data-pk=\"DPAD_LEFT\"  aria-label=\"يسار\"></button>\n        <button class=\"dpad-btn right\" data-pk=\"DPAD_RIGHT\" aria-label=\"يمين\"></button>\n        <button class=\"dpad-ok\"        data-pk=\"DPAD_CENTER\">OK</button>\n      </div>\n    </div>\n\n    <div class=\"sec\">\n      <div class=\"sec-h\"><span>التطبيقات</span></div>\n      <div class=\"apps\" id=\"projApps\"></div>\n      <div class=\"empty\" id=\"projAppsEmpty\">جاري قراءة التطبيقات من الجهاز…</div>\n    </div>\n\n    <div class=\"sec\">\n      <div class=\"sec-h\"><span>التشغيل</span></div>\n      <div class=\"grid3 media\">\n        <button class=\"key big\" data-pk=\"MEDIA_PREVIOUS\">◀◀</button>\n        <button class=\"key big\" data-pk=\"MEDIA_PLAY_PAUSE\">❚❚</button>\n        <button class=\"key big\" data-pk=\"MEDIA_NEXT\">▶▶</button>\n      </div>\n      <div class=\"grid3\">\n        <button class=\"key sm\" data-pk=\"MEDIA_STOP\">إيقاف</button>\n        <button class=\"key sm\" data-pk=\"SEARCH\">بحث</button>\n        <button class=\"key sm\" id=\"projSleep\">إطفاء الشاشة</button>\n      </div>\n    </div>\n\n  </div>\n</section>\n\n<!-- ===== المكيفات ===== -->\n<section class=\"screen\" id=\"dev-ac-hall\" data-title=\"مكيف الصالة\" data-sub=\"ماندو بلس\">\n\n  <div class=\"todo ac-setup\" data-room=\"hall\" hidden>\n    <span class=\"badge\">يلزم الربط مرة واحدة</span>\n    <h3>المكيف يعمل بتطبيق Smart Life</h3>\n    <p>وهو من منظومة Tuya. وأجهزتها <b>لا تُفصح عن مفتاحها إلا من\n       سحابتها</b> — فيُجلب مرة واحدة، ثم يتكلّم الخادم مع المكيف مباشرةً\n       في الشبكة ولا نحتاج الإنترنت بعدها أبداً.</p>\n    <ol style=\"font-size:12.5px;color:var(--muted);line-height:2.2;padding-inline-start:20px;margin:0 0 14px\">\n      <li>افتح <b>iot.tuya.com</b> وأنشئ حساباً مجانياً</li>\n      <li>Cloud ← <b>Create Cloud Project</b> — اختر منطقة قريبة</li>\n      <li>Devices ← <b>Link App Account</b> ← امسح رمز QR من Smart Life\n          («أنا» ← الإعدادات ← مسح الرمز)</li>\n      <li>Overview ← انسخ <b>Access ID</b> و<b>Access Secret</b></li>\n    </ol>\n    <div class=\"field\"><label>Access ID</label>\n      <input class=\"ac-id\" type=\"text\" autocomplete=\"off\" spellcheck=\"false\" dir=\"ltr\"></div>\n    <div class=\"field\"><label>Access Secret</label>\n      <input class=\"ac-secret\" type=\"password\" autocomplete=\"off\" spellcheck=\"false\" dir=\"ltr\"></div>\n    <div class=\"field\"><label>المنطقة</label>\n      <select class=\"ac-region\">\n        <option value=\"eu\">أوروبا الوسطى</option>\n        <option value=\"us\">أمريكا</option>\n        <option value=\"in\">الهند</option>\n        <option value=\"cn\">الصين</option>\n      </select></div>\n    <button class=\"key ac-link\" style=\"width:100%\">اربط الحساب</button>\n    <p class=\"ac-msg\" style=\"margin:12px 0 0\"></p>\n    <p style=\"margin-top:14px;font-size:11.5px\">\n      المفتاحان يُحفظان على لابتوبك وحده ولا يُرسلان إلى أحد.</p>\n  </div>\n\n  <div class=\"todo ac-choose\" data-room=\"hall\" hidden>\n    <span class=\"badge\">اختر الجهاز</span>\n    <h3>أيّها مكيف الصالة؟</h3>\n    <div class=\"ac-list\" style=\"display:grid;gap:10px;margin-top:12px\"></div>\n  </div>\n\n  <div class=\"ac-remote\" data-room=\"hall\" hidden>\n    <div class=\"ac-dial\">\n      <button class=\"ac-minus\" aria-label=\"أبرد\">−</button>\n      <div class=\"ac-mid\">\n        <b class=\"ac-temp\">--</b>\n        <small class=\"ac-room\">—</small>\n      </div>\n      <button class=\"ac-plus\" aria-label=\"أدفأ\">+</button>\n    </div>\n\n    <div class=\"sec\">\n      <div class=\"sec-h\"><span>الوضع</span></div>\n      <div class=\"grid3\">\n        <button class=\"key sm ac-mode\" data-v=\"cold\">تبريد</button>\n        <button class=\"key sm ac-mode\" data-v=\"hot\">تدفئة</button>\n        <button class=\"key sm ac-mode\" data-v=\"wind\">مروحة</button>\n      </div>\n      <div class=\"grid3\">\n        <button class=\"key sm ac-mode\" data-v=\"wet\">تجفيف</button>\n        <button class=\"key sm ac-mode\" data-v=\"auto\">تلقائي</button>\n        <button class=\"key sm ac-swing\">أرجحة</button>\n      </div>\n    </div>\n\n    <div class=\"sec\">\n      <div class=\"sec-h\"><span>المروحة</span></div>\n      <div class=\"grid3\">\n        <button class=\"key sm ac-fan\" data-v=\"low\">هادئة</button>\n        <button class=\"key sm ac-fan\" data-v=\"mid\">متوسطة</button>\n        <button class=\"key sm ac-fan\" data-v=\"high\">قوية</button>\n      </div>\n    </div>\n\n    <button class=\"key ac-power\" style=\"width:100%;height:64px;font-size:17px\">تشغيل / إطفاء</button>\n    <p class=\"ac-msg\" style=\"margin:12px 0 0;text-align:center\"></p>\n  </div>\n</section>\n\n<section class=\"screen\" id=\"dev-ac-bed\" data-title=\"مكيف غرفة النوم\" data-sub=\"ماندو بلس\">\n\n  <div class=\"todo ac-setup\" data-room=\"bed\" hidden>\n    <span class=\"badge\">يلزم الربط مرة واحدة</span>\n    <h3>المكيف يعمل بتطبيق Smart Life</h3>\n    <p>وهو من منظومة Tuya. وأجهزتها <b>لا تُفصح عن مفتاحها إلا من\n       سحابتها</b> — فيُجلب مرة واحدة، ثم يتكلّم الخادم مع المكيف مباشرةً\n       في الشبكة ولا نحتاج الإنترنت بعدها أبداً.</p>\n    <ol style=\"font-size:12.5px;color:var(--muted);line-height:2.2;padding-inline-start:20px;margin:0 0 14px\">\n      <li>افتح <b>iot.tuya.com</b> وأنشئ حساباً مجانياً</li>\n      <li>Cloud ← <b>Create Cloud Project</b> — اختر منطقة قريبة</li>\n      <li>Devices ← <b>Link App Account</b> ← امسح رمز QR من Smart Life\n          («أنا» ← الإعدادات ← مسح الرمز)</li>\n      <li>Overview ← انسخ <b>Access ID</b> و<b>Access Secret</b></li>\n    </ol>\n    <div class=\"field\"><label>Access ID</label>\n      <input class=\"ac-id\" type=\"text\" autocomplete=\"off\" spellcheck=\"false\" dir=\"ltr\"></div>\n    <div class=\"field\"><label>Access Secret</label>\n      <input class=\"ac-secret\" type=\"password\" autocomplete=\"off\" spellcheck=\"false\" dir=\"ltr\"></div>\n    <div class=\"field\"><label>المنطقة</label>\n      <select class=\"ac-region\">\n        <option value=\"eu\">أوروبا الوسطى</option>\n        <option value=\"us\">أمريكا</option>\n        <option value=\"in\">الهند</option>\n        <option value=\"cn\">الصين</option>\n      </select></div>\n    <button class=\"key ac-link\" style=\"width:100%\">اربط الحساب</button>\n    <p class=\"ac-msg\" style=\"margin:12px 0 0\"></p>\n    <p style=\"margin-top:14px;font-size:11.5px\">\n      المفتاحان يُحفظان على لابتوبك وحده ولا يُرسلان إلى أحد.</p>\n  </div>\n\n  <div class=\"todo ac-choose\" data-room=\"bed\" hidden>\n    <span class=\"badge\">اختر الجهاز</span>\n    <h3>أيّها مكيف غرفة النوم؟</h3>\n    <div class=\"ac-list\" style=\"display:grid;gap:10px;margin-top:12px\"></div>\n  </div>\n\n  <div class=\"ac-remote\" data-room=\"bed\" hidden>\n    <div class=\"ac-dial\">\n      <button class=\"ac-minus\" aria-label=\"أبرد\">−</button>\n      <div class=\"ac-mid\">\n        <b class=\"ac-temp\">--</b>\n        <small class=\"ac-room\">—</small>\n      </div>\n      <button class=\"ac-plus\" aria-label=\"أدفأ\">+</button>\n    </div>\n\n    <div class=\"sec\">\n      <div class=\"sec-h\"><span>الوضع</span></div>\n      <div class=\"grid3\">\n        <button class=\"key sm ac-mode\" data-v=\"cold\">تبريد</button>\n        <button class=\"key sm ac-mode\" data-v=\"hot\">تدفئة</button>\n        <button class=\"key sm ac-mode\" data-v=\"wind\">مروحة</button>\n      </div>\n      <div class=\"grid3\">\n        <button class=\"key sm ac-mode\" data-v=\"wet\">تجفيف</button>\n        <button class=\"key sm ac-mode\" data-v=\"auto\">تلقائي</button>\n        <button class=\"key sm ac-swing\">أرجحة</button>\n      </div>\n    </div>\n\n    <div class=\"sec\">\n      <div class=\"sec-h\"><span>المروحة</span></div>\n      <div class=\"grid3\">\n        <button class=\"key sm ac-fan\" data-v=\"low\">هادئة</button>\n        <button class=\"key sm ac-fan\" data-v=\"mid\">متوسطة</button>\n        <button class=\"key sm ac-fan\" data-v=\"high\">قوية</button>\n      </div>\n    </div>\n\n    <button class=\"key ac-power\" style=\"width:100%;height:64px;font-size:17px\">تشغيل / إطفاء</button>\n    <p class=\"ac-msg\" style=\"margin:12px 0 0;text-align:center\"></p>\n  </div>\n</section>\n\n<!-- ===== الغسالتان ===== -->\n<section class=\"screen\" id=\"dev-washer\" data-title=\"غسالة الملابس\" data-sub=\"قيد الإعداد\">\n  <div class=\"todo\">\n    <span class=\"badge\">ينقص التعريف</span>\n    <h3>ما زلت لا أعرف نوعها</h3>\n    <p>ولكل شركة منظومتها: سامسونج بـ SmartThings، وغيرها بـ Smart Life أو\n       تطبيق خاص.</p>\n    <ul>\n      <li>ما ماركتها؟</li>\n      <li>هل هي موصولة بالواي فاي أصلاً؟ وبأي تطبيق؟</li>\n    </ul>\n  </div>\n</section>\n\n<section class=\"screen\" id=\"dev-dish\" data-title=\"غسالة الأطباق\" data-sub=\"سامسونج · قيد الإعداد\">\n  <div class=\"todo\">\n    <span class=\"badge\">ينقص الربط</span>\n    <h3>سامسونج — عبر SmartThings</h3>\n    <p>يلزم رمز وصول من حساب SmartThings، يُنشأ مرة ويُحفظ في الخادم.</p>\n    <ul>\n      <li>هل الغسالة مضافة في تطبيق SmartThings؟</li>\n    </ul>\n  </div>\n</section>\n\n<!-- ===== إسلامي ===== -->\n<section class=\"screen\" id=\"dev-islam\" data-title=\"إسلامي\" data-sub=\"المصحف والأذكار والمواقيت\">\n  <div class=\"card\" id=\"islamNeed\" hidden>\n    <h3>تنزيل النصوص</h3>\n    <p>المصحف والتفسيران والأذكار وتخطيط الصفحات — نحو خمسة ميغابايت،\n       تُنزَّل مرّة على اللابتوب ثم يعمل القسم بلا إنترنت أبداً.</p>\n    <p style=\"color:var(--warn)\">ولا يُحفظ نصٌّ حتى تُعدّ آياته وتُطابَق\n       الجدول المعتمد، ولا تُقبل الصفحات حتى تقع بدايات الأجزاء الثلاثين\n       في مواضعها — فما لم يجتز القياس لا يُعرض منه حرف.</p>\n    <button class=\"key sm\" id=\"islamGet\" style=\"width:100%\">نزّلها الآن</button>\n    <div id=\"islamGetMsg\" class=\"hint\"></div>\n  </div>\n\n  <div class=\"tiles\" id=\"islamTiles\" hidden style=\"margin-top:0\">\n    <button class=\"tile\" data-go=\"islam-quran\" style=\"grid-column:1/-1\">\n      <svg><use href=\"#i-islam\"></use></svg><b>المصحف</b><small>بصفحات مصحف المدينة ٦٠٤</small>\n    </button>\n    <button class=\"tile\" data-go=\"islam-azkar\"><b>الأذكار</b><small>بالمراجع</small></button>\n    <button class=\"tile\" data-go=\"islam-times\"><b>المواقيت</b><small>أمّ القرى</small></button>\n    <button class=\"tile\" data-go=\"islam-qibla\" style=\"grid-column:1/-1\"><b>القبلة</b><small>الاتجاه والمسافة</small></button>\n  </div>\n\n  <div class=\"card\" id=\"islamCredit\" hidden>\n    <h3>المصادر</h3>\n    <dl class=\"info\" id=\"islamCreditList\"></dl>\n  </div>\n</section>\n\n<!-- المصحف -->\n<section class=\"screen\" id=\"islam-quran\" data-title=\"المصحف\" data-sub=\"—\" data-back=\"dev-islam\">\n  <div class=\"qsheet\" id=\"qSheet\">\n    <div id=\"qBody\"></div>\n    <div class=\"qfoot\" id=\"qFoot\" hidden>\n      <span id=\"qFootSura\"></span>\n      <span class=\"qpg\" id=\"qFootPage\"></span>\n      <span id=\"qFootJuz\"></span>\n    </div>\n  </div>\n  <div class=\"qnav\">\n    <button class=\"key sm\" id=\"qPrev\">السابقة ›</button>\n    <input id=\"qGo\" class=\"qjump\" inputmode=\"numeric\" pattern=\"[0-9]*\" aria-label=\"رقم الصفحة\">\n    <button class=\"key sm\" id=\"qNext\">‹ التالية</button>\n    <button class=\"key sm\" id=\"qGear\" aria-label=\"الخيارات\" style=\"flex:0 0 52px\">⚙</button>\n  </div>\n\n  <!-- الإعدادات كلُّها خلف زرّ: صفحةُ المصحف تُترك لصاحبها.\n       وفي ملء الشاشة تنفتح لوحةً سفليةً فوق الصفحة، كما في المصاحف -->\n  <div id=\"qOpts\">\n  <div class=\"act-row\" id=\"qOptsHead\" hidden style=\"margin:0 0 10px\">\n    <button class=\"key sm\" id=\"qHub\">الأقسام: الأذكار والمواقيت والقبلة</button>\n    <button class=\"key sm\" id=\"qOptsClose\" style=\"flex:0 0 100px\">إغلاق</button>\n  </div>\n  <div class=\"qbar\">\n    <select id=\"qSura\"></select>\n    <button class=\"key sm\" id=\"qTafsirWhich\">الميسَّر</button>\n    <button class=\"key sm\" id=\"qSmaller\">ﻉ−</button>\n    <button class=\"key sm\" id=\"qBigger\">ﻉ+</button>\n    <button class=\"key sm\" id=\"qImm\">ملء الشاشة</button>\n  </div>\n\n  <div class=\"card qplay\">\n    <div class=\"qbar\" style=\"margin-bottom:10px\">\n      <select id=\"qReciter\"></select>\n      <button class=\"key sm\" id=\"qPlay\">▶ استمع</button>\n    </div>\n    <!-- زرُّ القياس ظاهرٌ دائماً: كان يظهر حين لا قارئ، فلم يكن\n         لمن أراد أن يعيد القياس أو يزيد قارئاً بابٌ يدخل منه -->\n    <button class=\"key sm\" id=\"qProbe\" style=\"width:100%;margin-bottom:8px\">اقرأ القرّاء</button>\n    <!-- نسخةٌ قديمة لا تعرف قارئاً أضفناه: يُقال ذلك صراحةً، فلا\n         يُطارَد سببٌ في المصدر وعلّتُه أنّ التحديث لم يصل -->\n    <div id=\"qOld\" class=\"hint\" hidden\n         style=\"color:var(--warn);white-space:pre-wrap;margin-bottom:8px\"></div>\n    <div class=\"qopts\">\n      <label>التكرار\n        <select id=\"qRepeat\">\n          <option value=\"1\">مرّة</option><option value=\"2\">مرّتين</option>\n          <option value=\"3\">٣</option><option value=\"5\">٥</option>\n          <option value=\"7\">٧</option><option value=\"10\">١٠</option>\n          <option value=\"0\">بلا نهاية</option>\n        </select>\n      </label>\n      <label>المدى\n        <select id=\"qScope\">\n          <option value=\"page\">الصفحة</option>\n          <option value=\"ayah\">الآية وحدها</option>\n          <option value=\"sura\">السورة</option>\n        </select>\n      </label>\n    </div>\n    <div id=\"qPlayMsg\" class=\"hint\"></div>\n    <div class=\"act-row\" style=\"margin:10px 0 0\">\n      <button class=\"key sm\" id=\"qSave\">احفظ السورة على الخادم</button>\n      <button class=\"key sm\" id=\"qGet\">نزّلها إلى جوّالك</button>\n    </div>\n    <div id=\"qSaveMsg\" class=\"hint\"></div>\n  </div>\n\n  <!-- المظهر: الخلفية وألوان التجويد -->\n  <div class=\"card\">\n    <h3>المظهر</h3>\n    <div class=\"qopts\">\n      <label>الخلفية\n        <select id=\"qTheme\">\n          <option value=\"dark\">فحميّ — الافتراضيّ</option>\n          <option value=\"black\">أسود عميق</option>\n          <option value=\"paper\">ورقيّ — كالمصحف المطبوع</option>\n          <option value=\"light\">فاتح</option>\n          <option value=\"green\">أخضر داكن</option>\n        </select>\n      </label>\n      <label>سُمك الخطّ\n        <select id=\"qBold\">\n          <option value=\"1\">غامق — الافتراضيّ</option>\n          <option value=\"2\">أغمق</option>\n          <option value=\"0\">عاديّ</option>\n        </select>\n      </label>\n      <label>المصحف\n        <select id=\"qTajweed\">\n          <option value=\"3\">المصوَّر — طبعة المدينة</option>\n          <option value=\"0\">نصّيّ — بلا ألوان</option>\n          <option value=\"1\">مجوَّد — بأحكامه</option>\n          <option value=\"2\">مجوَّد + علامات الضبط</option>\n        </select>\n      </label>\n    </div>\n    <div id=\"qTajLegend\" class=\"tjlegend\" hidden></div>\n    <p class=\"hint\" id=\"qTajNote\" hidden></p>\n    <div class=\"act-row\" style=\"margin-top:10px\">\n      <button class=\"key sm\" id=\"qFit\">ملاءمة الصفحة لطول الشاشة</button>\n    </div>\n  </div>\n  </div><!-- /qOpts -->\n\n  <div id=\"qMarg\"></div>\n  <div id=\"qImmBar\">\n    <button id=\"qFull\" aria-label=\"خروج من ملء الشاشة\">✕</button>\n    <button id=\"qImmSmaller\" aria-label=\"خطٌّ أصغر\">ﻉ−</button>\n    <button id=\"qImmBigger\" aria-label=\"خطٌّ أكبر\">ﻉ+</button>\n  </div>\n  <audio id=\"qAudio\" preload=\"none\"></audio>\n</section>\n\n<!-- الأذكار -->\n<section class=\"screen\" id=\"islam-azkar\" data-title=\"الأذكار\" data-sub=\"—\" data-back=\"dev-islam\">\n  <div class=\"qbar\"><select id=\"zCat\"></select></div>\n  <div id=\"zBody\" style=\"display:grid;gap:12px\"></div>\n</section>\n\n<!-- المواقيت -->\n<section class=\"screen\" id=\"islam-times\" data-title=\"مواقيت الصلاة\" data-sub=\"—\" data-back=\"dev-islam\">\n  <div class=\"card\" id=\"tNext\" style=\"text-align:center\">\n    <h3 id=\"tNextName\">—</h3>\n    <div id=\"tNextIn\" style=\"font-size:26px;font-weight:700;color:var(--accent)\">—</div>\n  </div>\n  <div class=\"card\"><dl class=\"info\" id=\"tList\"></dl></div>\n  <div class=\"card\">\n    <h3>الموضع</h3>\n    <p id=\"tPlace\" class=\"hint\" style=\"margin:0 0 10px\"></p>\n    <div class=\"act-row\" style=\"margin-bottom:0\">\n      <button class=\"key sm\" id=\"tHanafi\">العصر: الجمهور</button>\n    </div>\n  </div>\n</section>\n\n<!-- القبلة -->\n<section class=\"screen\" id=\"islam-qibla\" data-title=\"القبلة\" data-sub=\"—\" data-back=\"dev-islam\">\n  <div class=\"card\" style=\"text-align:center\">\n    <div id=\"qibDial\" class=\"qibdial\"><div class=\"qibneedle\" id=\"qibNeedle\"></div><span>ﻙ</span></div>\n    <div id=\"qibDeg\" style=\"font-size:30px;font-weight:750;margin-top:14px\">—</div>\n    <div id=\"qibWord\" class=\"hint\" style=\"font-size:13px\"></div>\n    <button class=\"btn ghost\" id=\"qibStart\" hidden style=\"margin-top:14px\">شغّل البوصلة</button>\n    <div id=\"qibLive\" class=\"hint\" style=\"font-size:12px;margin-top:9px;white-space:pre-wrap\"></div>\n  </div>\n  <div class=\"card\">\n    <h3>كيف تستعمله</h3>\n    <p id=\"qibHow\">—</p>\n  </div>\n</section>\n\n<!-- ===== الراوتر ===== -->\n<section class=\"screen\" id=\"dev-router\" data-title=\"الراوتر\" data-sub=\"الشبكة ومن عليها\">\n\n  <!-- الربط: يظهر مرّة واحدة، ثم لا يعود -->\n  <div class=\"card\" id=\"rtLink\" hidden>\n    <h3>اربط الراوتر</h3>\n    <p>اكتب كلمة الدخول التي تفتح بها صفحة الراوتر — تُحفظ في لابتوبك\n       وحده بصلاحية مقيّدة، ولا تُرسل إلى المتصفح ولا إلى أحد.</p>\n    <div class=\"field\"><label>العنوان</label>\n      <input id=\"rtHost\" type=\"text\" inputmode=\"url\" spellcheck=\"false\"\n             placeholder=\"يُبحث عنه تلقائياً\" dir=\"ltr\"></div>\n    <div class=\"field\"><label>المستخدم</label>\n      <input id=\"rtUser\" type=\"text\" value=\"admin\" spellcheck=\"false\" dir=\"ltr\"></div>\n    <div class=\"field\"><label>كلمة الدخول</label>\n      <input id=\"rtPass\" type=\"password\" autocomplete=\"off\" spellcheck=\"false\" dir=\"ltr\"></div>\n    <div class=\"act-row\" style=\"margin-bottom:0\">\n      <button class=\"key sm\" id=\"rtSave\">ادخل واحفظ</button>\n      <button class=\"key sm\" id=\"rtFind\">ابحث عن الراوتر</button>\n    </div>\n    <div id=\"rtLinkMsg\" class=\"hint\"></div>\n  </div>\n\n  <!-- الحالة -->\n  <div class=\"card\" id=\"rtState\" hidden>\n    <h3>الحالة</h3>\n    <dl class=\"info\">\n      <dt>الطراز</dt>    <dd id=\"rtModel\">—</dd>\n      <dt>الشبكة</dt>    <dd id=\"rtNet\">—</dd>\n      <dt>الإشارة</dt>   <dd id=\"rtBars\">—</dd>\n      <dt>المُنزَّل</dt> <dd id=\"rtDown\">—</dd>\n      <dt>المُرفَع</dt>  <dd id=\"rtUp\">—</dd>\n      <dt>مدّة التشغيل</dt><dd id=\"rtUptime\">—</dd>\n    </dl>\n  </div>\n\n  <!-- الواي‑فاي -->\n  <div class=\"card\" id=\"rtWifiCard\" hidden>\n    <h3>الواي‑فاي</h3>\n    <div id=\"rtWifi\" style=\"display:grid;gap:9px\"></div>\n  </div>\n\n  <!-- الأجهزة المتصلة -->\n  <div class=\"card\" id=\"rtHostsCard\" hidden>\n    <h3>المتصلون الآن</h3>\n    <p style=\"margin-top:-4px\">جهازك واللابتوب لا يُحجبان — الخادم يرفض\n       ذلك ولو طُلب منه.</p>\n    <div id=\"rtHosts\" style=\"display:grid;gap:9px\"></div>\n  </div>\n\n  <!-- أدوات -->\n  <div class=\"card\" id=\"rtTools\" hidden>\n    <h3>أدوات</h3>\n    <div class=\"act-row\" style=\"margin-bottom:0\">\n      <button class=\"key sm danger\" id=\"rtReboot\">إعادة تشغيل الراوتر</button>\n    </div>\n    <div class=\"hint\">إعادة التشغيل تقطع الإنترنت عن البيت نحو دقيقتين،\n      وتقطع وصولك من خارج البيت حتى يعود.</div>\n  </div>\n\n  <div id=\"rtMsg\" class=\"empty\" hidden></div>\n</section>\n\n<!-- ===== أجهزة البيت ===== -->\n<section class=\"screen\" id=\"dev-survey\" data-title=\"أجهزة البيت\" data-sub=\"ما وجدناه في الشبكة\">\n  <div class=\"card\">\n    <h3>جردُ ما في بيتك</h3>\n    <p>يمسح الخادم شبكتك، ويسأل الأجهزة عن أسمائها، ويتعرّف على مصنّعيها\n       من عناوين بطاقاتها. ثم يقول لك أيّها نستطيع إضافته.</p>\n    <p style=\"color:var(--warn)\">المسح يقع على لابتوبك وحده. لا تُرسل\n       نتيجته إلى أحد — ولا إليّ.</p>\n    <div class=\"act-row\" style=\"margin-bottom:0\">\n      <button class=\"key sm\" id=\"svScan\">امسح الشبكة</button>\n      <button class=\"key sm\" id=\"svFresh\">مسح جديد</button>\n    </div>\n  </div>\n\n  <!-- أجهزة Tuya تُعلن عن نفسها كل بضع ثوان. فمن أعلن فهو منها\n       يقيناً، ومن سكت لم يُدَّعَ عليه شيء -->\n  <div class=\"card\">\n    <h3>أجهزة Tuya القابلة للتحكّم</h3>\n    <p>تطبيقات «ماندو» و«TSmartLife» و«Smart Life» كلّها واجهةٌ واحدة\n       تحتها. وأجهزتها تُعلن عن نفسها في الشبكة — فنُنصت خمس عشرة ثانية\n       ونرى من نادى.</p>\n    <button class=\"key sm\" id=\"tuScan\" style=\"width:100%\">أنصِت الآن</button>\n    <div id=\"tuMsg\" class=\"hint\"></div>\n    <div id=\"tuList\" style=\"display:grid;gap:8px;margin-top:10px\"></div>\n  </div>\n  <div id=\"svMsg\" class=\"empty\" hidden></div>\n  <div id=\"svList\" style=\"display:grid;gap:11px\"></div>\n</section>\n\n<!-- ===== الصيانة ===== -->\n<section class=\"screen\" id=\"dev-maint\" data-title=\"الصيانة والأوامر\" data-sub=\"حالة الخادم\">\n  <div class=\"card\">\n    <h3>الحالة</h3>\n    <dl class=\"info\">\n      <dt>الخادم</dt>      <dd id=\"infoServer\">—</dd>\n      <dt>من خارج البيت</dt><dd id=\"infoAway\" style=\"cursor:pointer\" title=\"اضغط لنسخه\">—</dd>\n      <dt>التلفزيون</dt>   <dd id=\"infoTv\">—</dd>\n      <dt>بطاقة الشبكة</dt><dd id=\"infoMac\">—</dd>\n      <dt>القناة</dt>      <dd id=\"infoLink\">—</dd>\n      <dt>النسخة</dt>      <dd id=\"infoVer\">—</dd>\n    </dl>\n  </div>\n\n  <div class=\"act-row\">\n    <button class=\"key sm\" id=\"cmdWake\">تشغيل التلفزيون</button>\n    <button class=\"key sm\" id=\"cmdFind\">بحث عن التلفزيون</button>\n    <button class=\"key sm\" id=\"cmdRepair\">إقران جديد</button>\n    <button class=\"key sm\" id=\"cmdReload\">تحديث الصفحة</button>\n    <button class=\"key sm\" id=\"cmdRestart\">إعادة تشغيل الخادم</button>\n    <button class=\"key sm\" id=\"cmdLog\">سجلّ آخر تحديث</button>\n    <button class=\"key sm\" id=\"cmdSrvLog\">سجلّ الخادم</button>\n    <button class=\"key sm\" id=\"cmdStatic\">تثبيت عنوان اللابتوب</button>\n  </div>\n  <div id=\"updLog\" class=\"code\" style=\"max-height:260px;overflow:auto;white-space:pre-wrap\" hidden></div>\n\n  <!-- الاتصال المشفَّر: بدونه لا ميكروفون ولا بوصلة، وهو قيدُ سفاري -->\n  <div class=\"card\" id=\"tlsCard\">\n    <h3>اتصالٌ مشفَّر <span class=\"chip\" id=\"tlsChip\" hidden>يعمل</span></h3>\n    <p id=\"tlsNote\" class=\"hint\" style=\"margin-top:0\">\n      سفاري يمنع الميكروفون والحافظة والبوصلة على العنوان غير المشفَّر.\n      وTailscale يمنح شهادةً حقيقية لجهازك، فتعمل الثلاثة.\n    </p>\n    <button class=\"key sm\" id=\"tlsBtn\" style=\"width:100%\">استصدر الشهادة</button>\n    <div id=\"tlsMsg\" class=\"hint\"></div>\n    <div class=\"code\" id=\"tlsUrl\" data-copy hidden></div>\n    <button class=\"key sm\" id=\"tlsCopy\" data-copy-for=\"prev\" hidden style=\"width:100%\">نسخ العنوان</button>\n  </div>\n\n  <div class=\"card\">\n    <h3>تحديث الخادم <span class=\"chip\" id=\"updChip\" hidden>يوجد تحديث</span></h3>\n    <p id=\"updNote\">يجلب آخر نسخة ويعيد تشغيل الخادم وحده — بلا لمس اللابتوب.</p>\n    <button class=\"key\" id=\"updBtn\" style=\"width:100%\">تحديث الآن</button>\n    <label class=\"toggle\" id=\"autoRow\">\n      <span>\n        <b>تحديث تلقائي</b>\n        <small id=\"autoNote\">يتفقّد كل نصف ساعة ويحدّث حين لا يكون أحد يستعمل الريموت</small>\n      </span>\n      <input type=\"checkbox\" id=\"autoChk\">\n    </label>\n    <div class=\"steps\" id=\"updSteps\" hidden></div>\n    <details style=\"margin-top:12px\">\n      <summary style=\"font-size:12px;color:var(--muted);cursor:pointer\">\n        الطريقة اليدوية — إن تعذّر الوصول للخادم</summary>\n      <p style=\"margin-top:10px\">على اللابتوب: زر ويندوز ← <b>powershell</b> ←\n         بالزر الأيمن ← تشغيل كمسؤول ← <b>Esc</b> ← الصق.</p>\n      <div class=\"code\" data-copy>irm https://raw.githubusercontent.com/samehhawas7-lab/voicetask/main/tvremote/windows/install.ps1 | iex</div>\n      <button class=\"key sm\" data-copy-for=\"prev\">نسخ</button>\n    </details>\n  </div>\n\n  <div class=\"card\">\n    <h3>مفتاح الطوارئ</h3>\n    <p>كل زرٍّ في هذه الصفحة يسقط بسقوط الخادم — فإن مات، لم يبق إلا\n       القيام إلى اللابتوب. وهذا بابٌ <b>لا يمرّ به</b>، فيعمل ولو مات.</p>\n    <p style=\"color:var(--warn)\">وهو يفتح صدفة أوامر على اللابتوب.\n       مقصورةٌ على شبكتك الخاصة، وبالمفتاح لا بكلمة المرور — ومن ليس\n       في شبكتك لا يرى المنفذ أصلاً.</p>\n    <p>من تطبيق SSH في جوّالك (Termius أو Blink) ولّد زوج مفاتيح مرّة،\n       ثم الصق هنا <b>المفتاح العامّ</b> — الذي يبدأ بـ <code>ssh-ed25519</code>.\n       ولا تُرسل الخاصّ إلى أحد، ولا إليّ.</p>\n    <div class=\"field\"><label>المفتاح العامّ</label>\n      <input id=\"sshKey\" type=\"text\" autocomplete=\"off\" spellcheck=\"false\"\n             placeholder=\"ssh-ed25519 AAAA… me@iphone\" dir=\"ltr\"></div>\n    <div class=\"act-row\" style=\"margin-bottom:0\">\n      <button class=\"key sm\" id=\"sshGo\">سلّح الباب</button>\n      <button class=\"key sm\" id=\"sshLog\">سجلّ التجهيز</button>\n    </div>\n    <div id=\"sshMsg\" class=\"hint\"></div>\n  </div>\n\n  <div class=\"card\">\n    <h3>لا يشتغل التلفزيون بزرّ «تشغيل»؟</h3>\n    <p>الخادم يرسل حزمة الإيقاظ إلى ثلاث وجهات وخمس دفعات. فإن لم يستجب\n       فالسبب في التلفزيون لا في الشبكة. تحقّق من اثنين بريموته الأصلي:</p>\n    <p style=\"color:var(--text)\">\n      <b>١)</b> الإعدادات ← عام ← الأجهزة ← إعدادات إضافية ←\n      <b>تشغيل التلفاز بالهاتف المحمول</b> ← فعّل <b>«قم بالتشغيل عبر Wi-Fi»</b>\n      <br><br>\n      <b>٢)</b> الإعدادات ← عام ← <b>Quick Start+</b> ← فعّله\n    </p>\n    <p>الثاني هو ما يُبقي بطاقة الشبكة مغذّاة في السكون. وبدونه تنام\n       البطاقة مع التلفزيون فلا تسمع شيئاً — وهذا أشيع سبب.</p>\n  </div>\n\n  <div class=\"card\">\n    <h3>تفاصيل تقنية</h3>\n    <p>سجل هذه الجلسة داخل الجوال.</p>\n    <div class=\"code\" id=\"cmdDiag\" style=\"max-height:180px;white-space:pre-wrap\"></div>\n    <button class=\"key sm\" id=\"cmdCopyDiag\">نسخ التفاصيل</button>\n  </div>\n</section>\n\n</main>\n<div class=\"toast\" id=\"toast\" hidden></div>\n<!-- فاهمُ الأمر المنطوق يحقنه الخادم فوق هذا السطر — ملفٌّ واحد\n     يعمل في node وفي المتصفّح. ولا يُطلب بوسمٍ حاجز: الصفحة لا يجوز\n     أن تحتاج طلباً ثانياً لتُرسم -->\n";

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

      // خلف الخادم نُمهله قليلاً: هو يفحص التلفزيون ويغلق القناة بسببٍ
      // مفهوم — «التلفزيون مطفأ» — وكانت المهلة القصيرة تسبقه، فيرى
      // المستخدم «ما فيه رد» الغامضة بدل الجواب.
      // ونقرأ الراية مباشرةً لا من onServer: هذه الشفرة أسبق منه في الملف.
      const behindServer = typeof window.__TV_PROXY__ !== "undefined";
      const timer = setTimeout(() => {
        try { ws.close(); } catch {}
        reject(new Error("ما فيه رد من التلفزيون"));
      }, behindServer ? 9000 : 5000);

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
        // 1011 مع سببٍ نصّيّ يأتي من خادمنا لا من التلفزيون، وهو تشخيصٌ
        // مفهوم بذاته — فيُعرض كما هو لا مغلّفاً بجملة تُشوّشه
        const rsn = ev && ev.reason ? String(ev.reason) : "";
        const mine = code === 1011 && /[\u0600-\u06FF]/.test(rsn);
        done(reject, new Error(
          code === 1008 ? "التلفزيون يرفض التحكم من المتصفحات"
          : mine       ? rsn
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
  //
  // والمحاولة الأولى فورية: أكثر الانقطاعات عابرة — مهلةُ سكونٍ في
  // الطريق أو تبدّلُ مسار — فتُشفى قبل أن يشعر بها من يضغط زرّاً.
  // ثم تتراجع إن تكرّر الفشل، فلا نُغرق تلفزيوناً مطفأً بالمحاولات.
  _scheduleReconnect(){
    if (this._reconnectTimer || !this.ip) return;
    if (!store.get("webos_key_" + this.ip)) return; // بلا مفتاح يلزم موافقة يدوية
    const tries = this._retries || 0;
    const wait = tries === 0 ? 0 : Math.min(2000 * Math.pow(2, tries - 1), 8000);
    this._retries = tries + 1;
    diag(wait ? "انقطع الاتصال — إعادة الوصل بعد " + (wait / 1000) + "ث"
              : "انقطع الاتصال — إعادة الوصل فوراً");
    this._reconnectTimer = setTimeout(() => {
      this._reconnectTimer = null;
      if (this.status !== "ready") this.connect(this.ip);
    }, wait);
  }

  // بعد الجاهزية: نفتح قناة الأزرار ونشترك في الصوت والتطبيق الحالي
  async _afterReady(){
    this._retries = 0;          // نجح الوصل، فيعود التراجع إلى أوّله
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
  // حين يكون السبب أن التلفزيون مطفأ، يُقدَّم زرُّ تشغيله على كل شيء:
  // كان صاحب البيت يقف أمام رسالةٍ ولا يرى ما يفعل
  const offBar = $("tvOff");
  if (offBar){
    const isOff = !ready && onServer && /مطفأ|خارج الشبكة/.test(String(detail || ""));
    offBar.hidden = !isOff;
    const sp = $("setupPanel");
    if (sp && isOff) sp.hidden = true;
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
      // للتلفزيون بطاقتان: سلكية ولاسلكية. وكنّا نختار واحدة، فإن
      // أخذنا الساكنة ذهبت حزمة الإيقاظ إلى بطاقةٍ لا تنصت — وصمت.
      // فنرسلهما معاً ويوقظهما الخادم معاً.
      const pick = (o) => (o && typeof o.macAddress === "string") ? o.macAddress : "";
      const macs = [pick(net && net.wifiInfo), pick(net && net.wifi),
                    pick(net && net.wiredInfo), pick(net && net.wired)]
        .map(m => String(m || "").toLowerCase())
        .filter(m => /^([0-9a-f]{2}:){5}[0-9a-f]{2}$/.test(m) && !/^(00:){5}00$/.test(m))
        .filter((m, i, a) => a.indexOf(m) === i);
      if (!macs.length) return;
      diag("بطاقات التلفزيون من التلفزيون نفسه: " + macs.join(" · "));
      fetch("/tv-mac", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ macs }),
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
/* وضعُ المصحف: التطبيق نفسه، وصفحتان تفترقان فيما يُعرض.
   شاشاتُ الأجهزة نُزعت في الخادم، وما بقي هنا تسميةٌ وبداية. */
const MUSHAF_APP = window.__APP__ === "mushaf";
const HOME = MUSHAF_APP ? "dev-islam" : "home";
/* مستقلٌّ بلا خادم: الصفحة من استضافةٍ عامّة، والنصوص معها، والحسابُ
   كلُّه فيها. فلا لابتوب يلزم ولا نفق. */
const NOSRV = !!window.__STANDALONE__;
// الموضع: الرياض سلفاً — نفسُ افتراض الخادم حرفاً
const PLACE = { lat: 24.7136, lon: 46.6753, tz: 3 };

let currentScreen = HOME;

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
  $("backBtn").hidden = (id === HOME);
  $("settingsBtn").hidden = (id !== "dev-tv");   // أمراه للتلفزيون: قطع الاتصال ونسيان الإقران
  $("powerBtn").hidden = (id !== "dev-tv");
  target.scrollTop = 0;
  if (id === "dev-tv" && tv.status === "disconnected"){
    const ip = $("ipInput").value.trim() || store.get("webos_ip");
    if (ip && store.get("webos_key_" + ip)) tv.connect(ip);
  }
  if (id === "dev-maint"){ paintInfo(); if (window.__checkVersion) window.__checkVersion();
                           if (window.__tlsCheck) window.__tlsCheck(); }
  if (id === "dev-proj" && window.__projCheck) window.__projCheck();
  if (id === "dev-ac-hall" && window.__acCheck) window.__acCheck("hall");
  if (id === "dev-ac-bed"  && window.__acCheck) window.__acCheck("bed");
  if (id === "dev-survey" && window.__survey) window.__survey();
  if (id === "dev-router" && window.__router) window.__router();
  if (id === "dev-islam"   && window.__islamHub)    window.__islamHub();
  if (id === "islam-quran" && window.__islamQuran)  window.__islamQuran();
  // ملء الشاشة للمصحف وحده: لو تبع صاحبَه إلى شاشة الأجهزة لاختفى
  // رأسُ الصفحة وما فيه من أزرار
  if (id !== "islam-quran") document.documentElement.setAttribute("data-imm", "0");
  else if (window.__quranImm && window.__quranImm())
    document.documentElement.setAttribute("data-imm", "1");
  // الخروج من المصحف يُسكت التلاوة: صوتٌ يتبعك إلى شاشةٍ أخرى بلا
  // زرٍّ يوقفه إزعاجٌ لا ميزة
  if (id !== "islam-quran" && window.__islamHush)   window.__islamHush();
  if (id === "islam-azkar" && window.__islamAzkar)  window.__islamAzkar();
  if (id === "islam-times" && window.__islamTimes)  window.__islamTimes();
  if (id === "islam-qibla" && window.__islamQibla)  window.__islamQibla();
  // في تطبيق المصحف لا «بيت» يُرجع إليه: أوّلُ الشاشات هي شاشتُه

  // ومستشعر الاتجاه يُطفأ بالخروج: قراءةٌ مستمرّة لشاشةٍ لا تُرى
  // استنزافٌ للبطارية بلا فائدة
  if (id !== "islam-qibla" && window.__qiblaHush)   window.__qiblaHush();
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
  // الشاشة قد تكون متفرّعة عن أخرى، فترجع إليها لا إلى الرئيسية
  const backOf = () => {
    const el = document.getElementById(currentScreen);
    return (el && el.dataset.back) || HOME;
  };
  $("backBtn").onclick = () => { buzz(); show(backOf()); };
  // زرّ الرجوع في الجوال يعود خطوة لا يخرج من التطبيق
  addEventListener("popstate", () => { if (currentScreen !== HOME) show(backOf()); });
  // تطبيقُ المصحف يفتح على المصحف نفسه — وآخرُ صفحةٍ محفوظةٌ أصلاً
  // فيعود إليها. والأقسامُ الأخرى بابُها زرُّ «الأقسام» في الخيارات
  show(MUSHAF_APP ? "islam-quran" : HOME);
}

// لوحة اللمس: تحرّك المؤشر على التلفزيون عبر قناة الأزرار
function setupTouchpad(){
  if (MUSHAF_APP) return;   // لا لوحةَ لمسٍ بلا تلفزيون
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
  // وما بعد الموجّه كلُّه ربطُ أزرارِ أجهزة: لوحةُ اللمس وأزرارُ
  // التلفزيون وحقلُ عنوانه. وليس منها شيءٌ في تطبيق المصحف
  if (MUSHAF_APP) return;
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

/**
 * نسخٌ يعمل على http.
 *
 * `navigator.clipboard` **غير موجودة أصلاً** على عنوانٍ غير مشفَّر —
 * لا تفشل بل تكون undefined. وصفحتنا على http://100.x. فكانت كلّ
 * أزرار النسخ تسقط إلى «انسخه يدوياً» ولا تنسخ شيئاً.
 *
 * والبديل القديم `execCommand("copy")` لا يشترط أصلاً مشفَّراً، فهو
 * يعمل حيث تعجز الجديدة. فتُجرَّب الجديدة إن وُجدت، وإلا فالقديمة.
 */
function copyText(text, okMsg){
  const done = () => toast(okMsg || "نُسخ");
  const legacy = () => {
    const t = document.createElement("textarea");
    t.value = text;
    t.setAttribute("readonly", "");
    t.style.cssText = "position:fixed;top:0;left:0;opacity:0;pointer-events:none";
    document.body.appendChild(t);
    // سفاري لا ينسخ من حقلٍ لم يُحدَّد مداه صراحةً
    t.select();
    t.setSelectionRange(0, text.length);
    let ok = false;
    try { ok = document.execCommand("copy"); } catch {}
    document.body.removeChild(t);
    ok ? done() : toast("تعذّر النسخ — اضغط مطوّلاً على النصّ وانسخه", true);
  };
  if (navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(text).then(done).catch(legacy);
  } else legacy();
}

// زرُّ نسخ التشخيص في شاشة الصيانة، وهي ليست في تطبيق المصحف
if ($("copyDiagBtn")) $("copyDiagBtn").onclick = () =>
  copyText(diagLines.join("\n"), "تم النسخ — الصقها في المحادثة");

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
  toast("أُرسلت الحزم — قد يأخذ دقيقتين، وأتابعه لك");

  const stop = (msg, bad) => {
    if (btn){ btn.disabled = false; btn.textContent = label; }
    if (msg) toast(msg, bad);
  };

  // الخادم يردّ فوراً ثم يعمل في الخلفية: دفعاتُ الإيقاظ نحو نصف
  // دقيقة، ثم انتظارُ عودة التلفزيون دقيقتين. ولو انتظرنا الردّ
  // لتخلّى سفاري عن الطلب بعد دقيقة وأعلنّا فشلاً لم يقع.
  return post("/power-on")
    .then(() => new Promise((resolve) => {
      const began = Date.now();
      const tick = () => {
        // جولتان في الخادم: دفعاتٌ وانتظار، ثم دفعاتٌ وانتظار. وقستُ
        // الحدّ الأعلى فكان ٢٢٣ ثانية على شبكةٍ لا تلفزيون فيها — فلا
        // يُقطع الانتظار قبل ذلك وإلا أعلنّا فشلاً لم يقع.
        if (Date.now() - began > 330000){
          diag("طال الانتظار — راجع «سجلّ الخادم»");
          stop("طال الانتظار بلا استجابة", true);
          return resolve(false);
        }
        fetch("/power-on/status", { cache:"no-store" }).then(r => r.json()).then(s => {
          if (!s.done){
            const sec = s.seconds || 0;
            if (btn) btn.textContent = (sec > 130 ? "جولة ثانية… " : "جاري الإيقاظ… ") + sec + "ث";
            return setTimeout(tick, 3000);
          }
          if (s.woke){
            diag("استيقظ التلفزيون على " + s.tv + " بعد " + s.seconds + "ث");
            stop("اشتغل التلفزيون");
            if (tv.status === "disconnected") tv.connect(s.tv || $("ipInput").value.trim());
            return resolve(true);
          }
          diag("فشل الإيقاظ بعد " + s.seconds + "ث: " + s.why +
               (s.sent ? " (أُرسلت " + s.sent + " حزمة" + (s.pinned ? "، والجار مثبَّت" : "") + ")" : ""));
          stop(s.why || "ما استجاب التلفزيون", true);
          resolve(false);
        }).catch(() => setTimeout(tick, 3000));   // انقطاعٌ عابر لا يُنهي المتابعة
      };
      setTimeout(tick, 2000);
    }))
    .catch(e => { diag("خطأ في الإيقاظ: " + e.message); stop("تعذّر الوصول للخادم", true); return false; });
}

(function setupCommandsPage(){
  if (MUSHAF_APP) return;   // تطبيق المصحف: لا أجهزة فيه
  const wake = $("wakeBtn");
  if (wake){
    wake.hidden = !onServer;
    wake.onclick = () => wakeTv(wake);
  }

  const offWake = $("tvOffWake");
  if (offWake) offWake.onclick = () => wakeTv(offWake);

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

  // إعادة تشغيل الخادم: run.cmd حلقةٌ تعيده بعد خمس ثوانٍ إن خرج.
  // وبها يُفَكّ ما علِق في ذاكرته من غير القيام إلى اللابتوب.
  const crs = $("cmdRestart");
  if (crs) crs.onclick = () => {
    if (!onServer) return toast("يحتاج الخادم", true);
    if (!confirm("إعادة تشغيل الخادم؟\n\nينقطع الريموت نحو عشر ثوانٍ ثم يعود وحده.\n"
               + "تنفع حين يعلَق شيء — كأن يُرفض التحديث بلا سبب.")) return;
    crs.disabled = true; const t = crs.textContent; crs.textContent = "يُعاد…";
    post("/restart")
      .then(() => toast("يعود بعد ثوانٍ"))
      .catch(() => toast("يعود بعد ثوانٍ"))   // موتُه قبل ردّه متوقَّع
      .finally(() => {
        // ننتظر عودته ثم نُعيد الصفحة
        const back = () => fetch("/health", { cache:"no-store" })
          .then(() => location.reload())
          .catch(() => setTimeout(back, 2000));
        setTimeout(back, 6000);
        setTimeout(() => { crs.disabled = false; crs.textContent = t; }, 20000);
      });
  };

  // سجلّان يُعرضان في الصندوق نفسه — والضغط ثانيةً يطويه
  const showLog = (path, empty) => {
    const box = $("updLog");
    if (!box) return;
    if (!box.hidden && box.dataset.src === path) { box.hidden = true; return; }
    box.hidden = false;
    box.dataset.src = path;
    box.textContent = "يُجلب…";
    fetch(path, { cache:"no-store" })
      .then(r => r.text())
      .then(t => { box.textContent = t.trim() || empty; box.scrollTop = box.scrollHeight; })
      .catch(() => { box.textContent = "تعذّر جلب السجلّ"; });
  };

  const cg = $("cmdLog");
  if (cg) cg.onclick = () => showLog("/update-log", "السجلّ فارغ");

  const csl = $("cmdSrvLog");
  if (csl) csl.onclick = () => showLog("/server-log", "السجلّ فارغ");

  // تثبيت العنوان: السكربت يختبر البوّابة بعد التغيير ويرجع وحده إن
  // انقطع، فالخطر محسوب — لكنه يُقال قبل الضغط لا بعده
  const cst = $("cmdStatic");
  if (cst) cst.onclick = () => {
    if (!onServer) return toast("يحتاج الخادم", true);
    if (!confirm("تثبيت عنوان اللابتوب على الشبكة؟\n\n"
               + "قد ينقطع الاتصال ثوانيَ. والأداة تختبر الشبكة بعد التغيير "
               + "وترجع إلى التوزيع التلقائي وحدها إن انقطع.")) return;
    cst.disabled = true; const t = cst.textContent; cst.textContent = "يُثبَّت…";
    post("/static-ip")
      .then(r => toast(r.ok ? (r.why || "بدأ") : (r.why || "تعذّر"), !r.ok))
      .catch(() => toast("انقطع الاتصال — راجع بعد دقيقة", true))
      .finally(() => setTimeout(() => { cst.disabled = false; cst.textContent = t; }, 8000));
  };

  // بابُ الطوارئ
  const sk = $("sshGo"), sm = $("sshMsg");
  if (sk) sk.onclick = () => {
    const key = $("sshKey").value.trim();
    if (!key) return (sm.textContent = "الصق المفتاح العامّ أولاً");
    if (!confirm("تسليح باب الطوارئ؟\n\n"
               + "يفتح صدفة أوامر على اللابتوب، من شبكتك الخاصة وحدها، "
               + "وبهذا المفتاح لا بكلمة مرور.")) return;
    sm.textContent = "يُجهَّز…";
    sk.disabled = true;
    post("/ssh/enable", { publicKey: key })
      .then(r => {
        sm.textContent = r.ok ? (r.why || "تمّ") : (r.why || "تعذّر");
        if (r.ok) $("sshKey").value = "";
      })
      .catch(() => { sm.textContent = "تعذّر الوصول للخادم"; })
      .finally(() => { sk.disabled = false; });
  };
  const sl = $("sshLog");
  if (sl) sl.onclick = () => showLog("/ssh/log", "لم يُجهَّز بعد");

  // زر نسخ لكل كتلة أمر — النسخ من الشاشة على الجوال متعب
  document.querySelectorAll("[data-copy-for]").forEach(btn => {
    const code = btn.previousElementSibling;
    btn.onclick = () => copyText(code ? code.textContent.trim() : "",
                                 "نُسخ — الصقه في PowerShell");
  });

  const cd = $("cmdCopyDiag");
  if (cd) cd.onclick = () => $("copyDiagBtn").click();

  /* ---------- الاتصال المشفَّر ----------
     ليس ترفاً: الميكروفون والحافظة ومستشعر الاتجاه محجوبةٌ كلّها على
     http في سفاري. وهذه الشهادة تفتحها جميعاً بضغطةٍ من الجوّال. */
  const tlsBtn = $("tlsBtn");
  if (tlsBtn){
    const show = (s) => {
      const chip = $("tlsChip"), msg = $("tlsMsg"), box = $("tlsUrl"), cp = $("tlsCopy");
      chip.hidden = !s.serving;
      if (s.url){
        box.textContent = s.url; box.hidden = false; cp.hidden = false;
        msg.textContent = s.serving
          ? "افتح هذا العنوان في سفاري وأضفه للشاشة الرئيسية — ومنه تعمل الأوامر الصوتية"
          : "الشهادة محفوظة، وتعمل بعد إعادة تشغيل الخادم";
        tlsBtn.textContent = "جدّد الشهادة";
      } else {
        box.hidden = true; cp.hidden = true;
        msg.textContent = s.why || "لم تُستصدر بعد";
        tlsBtn.textContent = "استصدر الشهادة";
      }
    };
    window.__tlsCheck = () => fetch("/https", { cache:"no-store" })
      .then(r => r.json()).then(show).catch(() => {});
    tlsBtn.onclick = async () => {
      tlsBtn.disabled = true; tlsBtn.textContent = "يُستصدر… قد يأخذ دقيقة";
      $("tlsMsg").textContent = "";
      try {
        const r = await post("/https/enable");
        if (r.running){ $("tlsMsg").textContent = "جارٍ — انتظر قليلاً"; return; }
        if (!r.ok){
          const m = $("tlsMsg");
          m.style.color = "var(--danger)";
          m.innerHTML = "";
          const w = document.createElement("div");
          w.textContent = r.why || "تعذّر";
          m.appendChild(w);
          // الخطوةُ التالية بيده، ورابطُها يُنسخ — فلا يُكتب باليد
          if (r.next){
            const n = document.createElement("div");
            n.style.cssText = "color:var(--text);margin-top:8px;line-height:1.9";
            n.textContent = r.next;
            m.appendChild(n);
          }
          if (r.admin){
            const b = document.createElement("button");
            b.className = "key sm";
            b.style.cssText = "width:100%;margin-top:8px";
            b.textContent = "انسخ رابط لوحة Tailscale";
            b.onclick = () => copyText(r.admin, "نُسخ — افتحه في المتصفّح");
            m.appendChild(b);
          }
        } else {
          $("tlsMsg").style.color = "";
          toast("صدرت الشهادة");
        }
        await window.__tlsCheck();
      } catch (e) { $("tlsMsg").textContent = "تعذّر الوصول للخادم"; }
      finally { tlsBtn.disabled = false; }
    };
  }
})();


/* ============================================================
   البروجيكتر — أندرويد عبر ADB
   الخادم هو من يتكلّم ADB؛ المتصفح لا يملك مقابس خام. فالصفحة تطلب
   منه بأوامر بسيطة، وهو يقيّد ما يُمرَّر إلى صدفة الجهاز.
   ============================================================ */
/* ============================================================
   هل يُشغَّل وهو مطفأ؟ — قياسٌ لا تخمين (القاعدة الأولى)
   السؤال كلّه: أبطاقةُ شبكته مستيقظة وهو مطفأ؟ فإن أجابت فالإيقاظ
   ممكن والعلّة في إعداده، وإن لم تُجب فلا يوقظه شيء من الشبكة.
   ============================================================ */
/* ============================================================
   العنوان الصحيح — للخادم عنوانان، وأحدهما لا يعمل خارج البيت
   فمن حفظ اختصاره على عنوان البيت وجده معطّلاً حين يبتعد. والتطبيق
   يعرف العنوانين ويعرف من أيّهما فُتح، فليقلها بدل أن يصمت.
   ============================================================ */
(function setupAddressTip(){
  if (MUSHAF_APP) return;   // تطبيق المصحف: لا أجهزة فيه
  const box = $("addrTip");
  if (!box || !onServer) return;
  if (store.get("addrtip_off") === "1") return;

  fetch("/health", { cache: "no-store" }).then(r => r.json()).then(h => {
    if (!h.away) return;                        // لا شبكة خاصة، فلا نصيحة
    if (location.hostname === h.away) return;   // مفتوحٌ من الصحيح أصلاً
    const url = "http://" + h.away + ":" + (location.port || 8099);
    $("addrTipUrl").textContent = url;
    box.hidden = false;

    $("addrTipCopy").onclick = () =>
      copyText(url, "نُسخ — الصقه في سفاري ثم أضفه للشاشة الرئيسية");

    // نصيحةٌ لا إلحاح: الأمر يبقى بيده (القاعدة العاشرة)
    $("addrTipHide").onclick = () => {
      store.set("addrtip_off", "1");
      box.hidden = true;
    };
  }).catch(() => {});
})();

/* ============================================================
   القسم الإسلاميّ
   النصوص كلّها من مصادر موثَّقة، والخادم لا يحفظ منها شيئاً حتى
   يجتاز القياس — فما وصل إلى هنا فقد عُدَّت آياته وطوبقت بالجدول.
   ============================================================ */
(function setupIslam(){
  if (!$("dev-islam")) return;
  const D = { quran:null, at:null, tafsir:{}, suras:null, pages:null, azkar:null };
  let which = store.get("tafsir_which") || "muyassar";
  let qsize = Number(store.get("quran_size")) || 21;
  // الأوضاع: 0 نصّ · 1 مجوَّد · 2 مجوَّد+علامات · 3 المصوَّر (طبعة المدينة)
  let tajweed = (() => {
    const v = store.get("tajweed");
    if (v !== null && v !== undefined && v !== "") return Math.max(0, Math.min(3, Number(v) || 0));
    return NOSRV ? 3 : 0;      // المستقلّ يفتح مصوَّراً إن حضرت أصولُه
  })();
  let qcf = null;              // فهرس صفحات المصوَّر — يُجلب عند أوّل حاجة
  let qcfMissing = false;
  const qcfFonts = new Set();  // ما حُمّل من خطوط الصفحات

  async function loadQcf(){
    if (qcf || qcfMissing) return qcf;
    try {
      const r = await fetch("data/mushaf-pages.json", { cache: "force-cache" });
      if (!r.ok) throw 0;
      qcf = (await r.json()).pages;
    } catch { qcfMissing = true; if (tajweed === 3) tajweed = 0; }
    return qcf;
  }

  async function qcfFont(pg){
    const name = "QP" + pg.p;
    if (qcfFonts.has(name)) return name;
    const f = new FontFace(name, "url(data/qcf/" + pg.font + ")");
    await f.load();
    document.fonts.add(f);
    qcfFonts.add(name);
    return name;
  }

  /* رسمُ صفحةٍ مصوَّرة. لا التفافَ هنا: عددُ الأسطر ثابتٌ وعروضُها
     معلومةٌ من الخطّ نفسه، فقامةُ الحرف تُحسب حساباً حتمياً — أوسعُ
     قامةٍ تُدخل أعرضَ سطرٍ في العرض، ثم تُنقص إن ضاق الطول. */
  async function paintQcf(pg, body){
    const name = await qcfFont(pg);
    const rows = [];
    let textLines = 0, heads = 0, bsmls = 0;
    for (const ln of pg.lines){
      if (ln.h !== undefined){ heads++; if (ln.b) bsmls++; }
      else textLines++;
    }
    const sheet = $("qSheet");
    const cs = getComputedStyle(sheet);
    const W = sheet.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const budget = document.documentElement.clientHeight
      - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom)
      - ($("qFoot").hidden ? 0 : $("qFoot").offsetHeight + 23);
    // خطوةُ السطر كخطوة الورق: كتلةُ نصِّ الطبعة أطولُ من عرضها بنحو
    // النصف، وعرضُ أسطرها نحو ١٤ قامةً — فالخطوة قرابة ١.٤ قامة
    const LH = 1.42;
    // العنوان ~صفّان صغيران، والبسملة سطرٌ أدنى — بوحدات قامة الحرف
    const units = textLines * LH + heads * 2.2 + bsmls * 1.5;
    let F = Math.min(W * pg.u / pg.mw, budget / Math.max(units, 1));
    F = Math.max(12, Math.min(44, F));

    // الصفحةُ كتلةٌ بنسب الورق: عرضُها عرضُ أعرضِ سطرٍ بالقامة
    // المختارة، تتوسّط الشاشةَ عرضاً وطولاً — لا تُمدَّد أسطرُها
    // بفجواتٍ ليست في الطباعة
    const pageBox = document.createElement("div");
    pageBox.className = "qpage";
    pageBox.style.width = Math.ceil(F * pg.mw / pg.u) + "px";
    pageBox.style.setProperty("--qlh", String(LH));
    const spare = budget - F * units;
    if (spare > 0) pageBox.style.paddingTop = Math.round(spare / 2) + "px";
    body.appendChild(pageBox);

    for (const ln of pg.lines){
      if (ln.h !== undefined){
        const su = D.suras[ln.h - 1];
        const h = document.createElement("div");
        h.className = "qsura";
        const b = document.createElement("b");
        b.textContent = "سورة " + bare(su.name);
        h.appendChild(b);
        pageBox.appendChild(h);
        if (ln.b){
          const bs = document.createElement("div");
          bs.className = "qbsml";
          bs.textContent = "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ";
          pageBox.appendChild(bs);
        }
        continue;
      }
      const div = document.createElement("div");
      div.className = "qline" + (ln.w < pg.mw * 0.86 ? " qshort" : "");
      div.style.fontFamily = name;
      div.style.fontSize = F.toFixed(2) + "px";
      for (const seg of ln.g){
        const sp = document.createElement("span");
        sp.className = "ay";
        sp.dataset.s = String(seg.s); sp.dataset.a = String(seg.a);
        sp.textContent = seg.t;
        sp.onclick = () => {
          const at = D.at.get(seg.s * 1000 + seg.a);
          if (at != null) showTafsir(D.quran[at], sp);
        };
        div.appendChild(sp);
      }
      pageBox.appendChild(div);
    }
    // وخطّا الجارتين يُسخَّنان — فالتقليب لا ينتظر شبكة
    for (const q of [pg.p, pg.p + 1, pg.p - 1]){
      const other = qcf && qcf[q - 1];
      if (other && other.mode === "qcf") qcfFont(other).catch(() => {});
    }
  }
  let page = Number(store.get("quran_page")) || 1;

  const NAMES = { muyassar:"الميسَّر", jalalayn:"الجلالين" };

  // الأرقام الهندية كما في المصحف، والعربية تُجمع بالعدد لا بإضافته
  const AD = (n) => String(n).replace(/\d/g, d => "٠١٢٣٤٥٦٧٨٩"[d]);
  const ayahWord = (n) => n === 1 ? "آية واحدة" : n === 2 ? "آيتان"
                        : n <= 10 ? AD(n) + " آيات" : AD(n) + " آية";
  // أسماء السور تأتي مشكولةً بحركة إعرابٍ أخيرة لا معنى لها في فهرس.
  // ولا يُجرَّد الاسم كلّه: «الْاِخْلَاصِ» مجرّدةً تصير «الاخلاص»
  // فتضيع همزتها — فلا يُحذف إلا ما على آخر حرف.
  const bare = (s) => String(s).replace(/ـ/g, "").replace(/[ً-ْٰ]+$/, "").trim();

  const getJson = (f) => fetch("/islam/data/" + f, { cache:"force-cache" }).then(r => {
    if (!r.ok) throw new Error("لم يُنزَّل بعد");
    return r.json();
  });

  async function status(){
    if (NOSRV){
      // النصوص شُحنت مع التطبيق وقِيست عند البناء — فلا تنزيل ولا سؤال
      $("islamNeed").hidden = true;
      $("islamTiles").hidden = false;
      $("islamCredit").hidden = false;
      const dl = $("islamCreditList");
      dl.innerHTML = "";
      for (const f of (window.__CREDITS__ || [])){
        const dt = document.createElement("dt"), dd = document.createElement("dd");
        dt.textContent = f.label; dd.textContent = f.credit;
        dl.append(dt, dd);
      }
      return true;
    }
    // بلا شبكة: يُعتمد آخرُ ما عُلم. والنصوص محفوظةٌ في الجوّال، فلا
    // يصحّ أن يُقال «نزّلها» لمن معه المصحفُ كاملاً بين يديه
    let s;
    try {
      s = await fetch("/islam/status", { cache:"no-store" }).then(r => r.json());
      store.set("islam_ready", s.ready ? "1" : "0");
    } catch {
      const ready = store.get("islam_ready") === "1";
      $("islamNeed").hidden = ready;
      $("islamTiles").hidden = !ready;
      return ready;
    }
    $("islamNeed").hidden = s.ready;
    $("islamTiles").hidden = !s.ready;
    $("islamCredit").hidden = !s.ready;
    if (s.ready){
      const dl = $("islamCreditList");
      dl.innerHTML = "";
      for (const f of Object.values(s.files)){
        if (!f.credit) continue;
        const dt = document.createElement("dt"), dd = document.createElement("dd");
        dt.textContent = f.label; dd.textContent = f.credit;
        dl.append(dt, dd);
      }
    }
    return s.ready;
  }

  $("islamGet").onclick = () => {
    const b = $("islamGet"), m = $("islamGetMsg");
    b.disabled = true; b.textContent = "يُنزَّل ويُقاس…";
    m.textContent = "قد يستغرق دقيقة على شبكة بطيئة";
    post("/islam/fetch").then(async r => {
      if (r.running) { m.textContent = "التنزيل جارٍ — انتظر قليلاً"; return; }
      if (!r.ok){
        m.style.color = "var(--danger)";
        m.textContent = "رُدّ: " + (r.failed || []).map(f => f.label + " — " + f.why).join("، ");
      } else { m.textContent = "تمّ"; await status(); }
    }).catch(() => { m.textContent = "تعذّر الوصول للخادم"; })
      .finally(() => { b.disabled = false; b.textContent = "نزّلها الآن"; });
  };

  // ---------- المصحف ----------
  async function loadQuran(){
    if (!D.quran){
      D.quran = (await getJson("quran.json")).quran;
      // فهرسٌ للوصول إلى الآية بسورتها ورقمها بلا مسحٍ للستّة آلاف
      D.at = new Map();
      D.quran.forEach((a, i) => D.at.set(a.chapter * 1000 + a.verse, i));
    }
    if (!D.suras) D.suras = await getJson("suras.json");
    if (!D.pages) D.pages = await getJson("pages.json");
    if (!D.tafsir[which]) {
      D.tafsir[which] = (await getJson(which === "muyassar"
        ? "tafsir-muyassar.json" : "tafsir-jalalayn.json")).quran;
    }
  }

  function fillSuras(){
    const sel = $("qSura");
    if (sel.options.length) return;
    D.suras.forEach(s => {
      const o = document.createElement("option");
      o.value = s.n;
      o.textContent = AD(s.n) + " · " + bare(s.name) + " · " + AD(s.ayahs);
      sel.appendChild(o);
    });
  }

  /* ---- التنوين المفتوح: تسويةٌ للعرض لا تعديلٌ في النصّ ----
     ناشرُ النسخة يذكر صراحةً أنه استبدل علامات التنوين المفتوح التي
     تعرفها خطوطُ المجمّع (٠٦٥٦ و٠٦٥٧ و٠٦٥E) بعلاماتٍ أخرى (٠٨F٢
     و٠٨F٠ و٠٨F١). وخطُّنا — خطُّ المجمّع — لا يرسم الثانية، فتسقط
     العلامة من الشاشة. فنعيدها إلى ما يعرفه الخطّ عند الرسم.

     وفي النصّ مسافةٌ بين العلامة وألفها: «قَوۡمࣰ ا». فتنفصل الميم عن
     الألف وتبدو الألف رقماً قائماً بذاته. فتُوصل — ولا تُوصل إلا إذا
     كان التالي ألفاً وحدها. وقِستُ ذلك على المصحف كلّه: ٢٤١٨ موضعاً
     ألفٌ وحدها فتُوصل، و٣٠٠١ موضعاً كلمةٌ تالية فتبقى منفصلة.

     ولا يُمسّ الملفُّ المحفوظ: هو كما نزل وكما قيس، والتسوية هنا
     في الرسم وحده. */
  /* ---------- ألوان التجويد ----------
     طلبَ أن يُلوَّن المدُّ بلون والسكونُ بلون. وهذا أفعله على شرطٍ
     واحد: **ألّا ألوّن إلا ما هو مكتوبٌ في النصّ نفسه**. فالسكون
     علامةٌ في المصحف، والشدّة علامة، والمدّة علامة، والتنوين علامة،
     وهمزةُ الوصل حرفٌ قائمٌ برأسه. فليس في هذا اجتهادٌ منّي
     ولا ظنّ: كلُّ لونٍ هنا مردُّه رمزٌ موجودٌ في الآية، لا
     استنباطٌ من جوارها.

     وقد جرّبتُ ما هو أوسع: بيانات cpfair تعرف ثمانيةَ عشرَ حكماً —
     إخفاءً وإدغاماً وإقلاباً. فأنزلتُها، وشغّلتُ مصنّفَها على نصّنا
     نحن، وقابلتُ ما خرج بما نشروا. فوجدتُ الفهارس تُبنى على
     نسخةٍ غير نسختنا (الهمزة مركّبة عندهم مفكوكة عندنا، وفينا
     ٨٢٠ علامةَ اتّجاهٍ لا تُرى وتُزحزح كلّ فهرسٍ بعدها). وسوّيتُ
     ذلك حتّى استقام، ثمّ وجدتُ المصنّف يلوّن لامَ لفظ الجلالة
     لاماً شمسيّة في ٢٥٣٧ موضعاً — ولا تفعل ذلك المصاحفُ الملوّنة.

     ولونٌ زائدٌ على كتاب الله ليس كزرٍّ لا يعمل. فتركتُ تلك
     الأحكام حتّى أجد مصدراً أستطيع التحقّق منه، وأبقيتُ ما لا
     يحتمل الشكّ. والنصّ لا يُمسّ: تُغلّف الحروف بعناصر، ولا يُزاد
     حرفٌ ولا يُنقص — وقد قِيس ذلك على المصحف كلّه، آيةً آية. */
  const TJ_MARK  = /[ً-ٰٟۖ-ࣰۭ-ࣿ]/;
  // السكتة (٠٦DC) علامةُ نطقٍ تلحق الحرف، لا علامةَ وقفٍ قائمةً بذاتها
  const TJ_STOP  = /[ۖ-ۛ۝۞۩]/;
  const TJ_SUKUN = /[ْۡ]/;
  const TJ_SHAD  = /ّ/;
  const TJ_MADDA = /[ٓۤ]/;
  const TJ_TANZ  = /[ً-ٍ]/;                    // تنوينٌ مركَّب — اظهار
  const TJ_TANO  = /[ࣰٖٗٞ-ࣲ]/;  // مفتوحٌ متتالٍ — إدغام/إخفاء
  const TJ_TANW  = /[ً-ࣰٍٖٗٞ-ࣲ]/;
  const TJ_HARAK = /[َُِ]/;
  const TJ_IQM   = /[ۭۢ]/;                     // الميم الصغيرة: علامةُ الإقلاب
  const TJ_SAKTA = /ۜ/;
  const TJ_SNOON = /ۨ/;                             // النون الصغيرة: نُـۨجِي
  const TJ_FATHA = "َ", TJ_DAMMA = "ُ", TJ_KASRA = "ِ";
  const TJ_VOWEL = /[ً-ࣰْٖٗٞۡ-ࣲ]/;
  const TJ_QALQ  = "قطبجد";
  const TJ_GHUN  = "نم";
  const TJ_SMALL = "ٰۥۦ";
  const TJ_MADDL = "اويى";
  const TJ_WASL  = "ٱ";
  const TJ_SEAT  = "اى";
  // حروفُ كلّ حكم، كما في كتب التجويد
  const R_IZHAR  = "ءأؤإئاهعحغخٱآ";
  const R_GHUNNA = "ينمو";                 // ينمو
  const R_NOGHUN = "لر";                             // ل ر
  const R_IQLAB  = "ب";
  const R_IKHFA  = "تثجدذزسشصضطظفقك";

  function tjLetters(t){
    const out = [];
    for (let i = 0; i < t.length; i++){
      const c = t[i];
      if (out.length && TJ_MARK.test(c) && !TJ_STOP.test(c) && !TJ_SMALL.includes(c)){
        const L = out[out.length - 1];
        L.marks += c; L.raw += c;
        continue;
      }
      out.push({ base: c, marks: "", raw: c });
    }
    return out;
  }

  /** الحرف التالي: تُتخطّى الفراغاتُ وعلاماتُ الوقف، وألفُ التنوين
      الحاملة («نَارٗا فَ» — الحكم على الفاء لا على الألف) */
  function tjNext(L, i, seat){
    for (let j = i + 1; j < L.length; j++){
      const b = L[j].base;
      if (b === " " || TJ_STOP.test(b)) continue;
      if (seat && TJ_SEAT.includes(b) &&
          !/[ً-ࣰِٖٓٗٞ-ࣲ]/.test(L[j].marks)){
        seat = false; continue;
      }
      return j;
    }
    return -1;
  }

  /** أحكامُ النون الساكنة والتنوين والميم الساكنة.
      والمصحف يكتب الحكم لا يتركه للقارئ: النونُ المُظهَرة عليها سكون،
      والمُدغَمة والمُخفاة بلا سكون؛ والتنوينُ المُظهَر مركَّب والمُدغَم
      مفتوحٌ متتالٍ؛ والإقلابُ عليه ميمٌ صغيرة. فليس ها هنا إلا قراءةُ
      ما كُتب، وتسميةُ حروف كلّ حكم. */
  function tjRules(L){
    const R = new Map();
    R.spans = [];
    const put = (i, j, r) => { R.set(i, r); if (j >= 0) R.set(j, r); R.spans.push([i, j, r]); };
    for (let i = 0; i < L.length; i++){
      const b = L[i].base, m = L[i].marks;
      const isnoon = (b === "ن") || TJ_SNOON.test(m);
      const tanz = TJ_TANZ.test(m), tano = TJ_TANO.test(m);
      const tanm = TJ_IQM.test(m) && TJ_HARAK.test(m);   // تنوينُ الإقلاب: حركةٌ وميم
      if (!(isnoon || tanz || tano || tanm)) continue;
      if (isnoon && TJ_SHAD.test(m) && !(tanz || tano || tanm)) continue;
      if (isnoon && TJ_MADDA.test(m)) continue;          // «نٓ» حرفٌ يُتهجّى
      if (isnoon && !tanz && !tano && !tanm && TJ_HARAK.test(m)) continue;
      const j = tjNext(L, i, tanz || tano || tanm);
      if (j < 0) continue;
      const nb = L[j].base;
      if (TJ_SAKTA.test(m)) put(i, -1, "tj-izhar");      // سكتةٌ تقطع الوصل
      else if (R_IZHAR.includes(nb)) put(i, -1, "tj-izhar");
      else if (nb === R_IQLAB) put(i, j, "tj-iqlab");
      else if (R_GHUNNA.includes(nb)){
        // إظهارٌ مطلق: نونٌ مكتوبٌ سكونُها ثمّ واوٌ أو ياء في كلمةٍ واحدة
        if (isnoon && TJ_SUKUN.test(m) && "وي".includes(nb)) put(i, -1, "tj-izhar");
        else put(i, j, "tj-idghg");
      }
      else if (R_NOGHUN.includes(nb)) put(i, j, "tj-idghn");
      else if (R_IKHFA.includes(nb)) put(i, j, "tj-ikhfa");
    }
    for (let i = 0; i < L.length; i++){
      if (L[i].base !== "م") continue;
      if (TJ_HARAK.test(L[i].marks) || TJ_TANW.test(L[i].marks) || TJ_SHAD.test(L[i].marks)) continue;
      const j = tjNext(L, i, false);
      if (j < 0) continue;
      if (L[j].base === R_IQLAB) put(i, j, "tj-ikhfash");
      else if (L[j].base === "م") put(i, j, "tj-idghsh");
    }
    return R;
  }

  /** حكمُ الحرف من علاماته وحدها */
  function tjClass(L, prev, full){
    const b = L.base, m = L.marks;
    if (TJ_STOP.test(b)) return "";
    if (TJ_MADDA.test(m)) return "tj-madd";
    if (TJ_SMALL.includes(b)) return "tj-maddn";
    if (TJ_GHUN.includes(b) && TJ_SHAD.test(m)) return "tj-ghunna";
    if (TJ_QALQ.includes(b) && TJ_SUKUN.test(m)) return "tj-qalqala";
    if (TJ_MADDL.includes(b) && !TJ_VOWEL.test(m) && prev){
      const pm = prev.marks;
      if ((b === "ا" || b === "ى") && pm.includes(TJ_FATHA)) return "tj-maddn";
      if (b === "و" && pm.includes(TJ_DAMMA)) return "tj-maddn";
      if (b === "ي" && pm.includes(TJ_KASRA)) return "tj-maddn";
    }
    if (!full) return "";
    if (b === TJ_WASL) return "tj-wasl";
    if (TJ_SHAD.test(m)) return "tj-shadda";
    if (TJ_SUKUN.test(m)) return "tj-sukun";
    if (TJ_TANW.test(m)) return "tj-tanween";
    return "";
  }

  /** يردّ النصّ مغلَّفاً بالألوان — وحروفه هي هي، لا تزيد ولا تنقص */
  function tjFrag(t, mode){
    if (mode === undefined) mode = 2;
    const frag = document.createDocumentFragment();
    const L = tjLetters(String(t));
    const R = mode >= 1 ? tjRules(L) : new Map();
    let buf = "";
    const flush = () => { if (buf){ frag.appendChild(document.createTextNode(buf)); buf = ""; } };
    for (let i = 0; i < L.length; i++){
      // حكمُ التلاوة يعلو على علامة الضبط: هو المقصود من المصحف المجوَّد
      let cls = R.get(i) || "";
      if (cls === "tj-izhar") cls = "";
      if (!cls) cls = tjClass(L[i], i ? L[i - 1] : null, mode === 2);
      if (!cls){ buf += L[i].raw; continue; }
      flush();
      const el = document.createElement("i");
      el.className = cls;
      el.style.fontStyle = "normal";
      el.textContent = L[i].raw;
      frag.appendChild(el);
    }
    flush();
    return frag;
  }
  window.__tjFrag = tjFrag;
  window.__tjSpans = (t) => tjRules(tjLetters(t)).spans;

  const TJ_LEGEND = {
    1: [["tj-ikhfa","إخفاء"],["tj-idghg","إدغام بغنّة"],["tj-idghn","إدغام بغير غنّة"],
        ["tj-iqlab","إقلاب"],["tj-ikhfash","إخفاء شفويّ"],["tj-idghsh","إدغام شفويّ"],
        ["tj-ghunna","غنّة"],["tj-qalqala","قلقلة"],["tj-madd","مدّ"],["tj-maddn","مدّ طبيعيّ"]],
    2: [["tj-ikhfa","إخفاء"],["tj-idghg","إدغام بغنّة"],["tj-idghn","إدغام بغير غنّة"],
        ["tj-iqlab","إقلاب"],["tj-ikhfash","إخفاء شفويّ"],["tj-idghsh","إدغام شفويّ"],
        ["tj-ghunna","غنّة"],["tj-qalqala","قلقلة"],["tj-madd","مدّ"],["tj-maddn","مدّ طبيعيّ"],
        ["tj-shadda","شدّة"],["tj-sukun","سكون"],["tj-tanween","تنوين"],["tj-wasl","همزة وصل"]],
  };

  const OPEN_TANWEEN = { "ࣰ":"ٗ", "ࣱ":"ٞ", "ࣲ":"ٖ" };
  const JOIN_ALEF = /([ٖٗٞ]) ([اى][ؐ-ًؚ-ٰٟۖ-ۭ]*)(?=\s|$)/g;
  const forDisplay = (t) => String(t)
    .replace(/[ࣰ-ࣲ]/g, (c) => OPEN_TANWEEN[c])
    .replace(JOIN_ALEF, "$1$2");

  /** آياتُ صفحةٍ من ٦٠٤، بحدود مصحف المدينة كما نُزّلت وقيست */
  function ayahsOfPage(p){
    const [s1, a1, s2, a2] = D.pages[p - 1];
    const from = D.at.get(s1 * 1000 + a1);
    const to   = D.at.get(s2 * 1000 + a2);
    return (from == null || to == null) ? [] : D.quran.slice(from, to + 1);
  }

  let selected = null;

  /** الهامش: تفسيرُ الآية الملموسة، تحت الصفحة لا داخل النصّ —
      إذ لو حُشر داخلها لتقطّعت الصفحة ولم تعد صفحة */
  function showTafsir(a, span){
    if (selected) selected.classList.remove("sel");
    selected = span;
    span.classList.add("sel");
    const note = D.tafsir[which].find(x => x.chapter === a.chapter && x.verse === a.verse);
    const m = $("qMarg");
    m.innerHTML = "";
    const box = document.createElement("div");
    box.className = "marg";
    const lab = document.createElement("b");
    lab.textContent = NAMES[which] + " — " + bare(D.suras[a.chapter - 1].name) + " " + AD(a.verse);
    const t = document.createElement("span");
    t.textContent = note ? note.text : "—";
    box.append(lab, t);
    m.appendChild(box);
  }

  /* رفعُ الورقة إلى أعلى وعائها. و«scrollIntoView» كانت تزحزح الوثيقة
     كلَّها فينزلق التطبيقُ تحت رأسه: قِستُ فوجدتُ زرَّ «ملء الشاشة»
     يقع في موضع زرّ الرجوع، فتُصيب الإصبعُ غيرَ ما قصدت. */
  function toTop(){
    const sc = document.getElementById("islam-quran");
    if (sc) sc.scrollTop = 0;
    if (window.scrollY) window.scrollTo(0, 0);
  }

  function paintPage(p){
    p = Math.max(1, Math.min(D.pages.length, Math.round(p) || 1));
    page = p;
    const body = $("qBody");
    body.innerHTML = "";
    body.style.setProperty("--qsize", qsize + "px");
    $("qMarg").innerHTML = "";
    selected = null;

    const rows = ayahsOfPage(p);

    // المصوَّر: صفحةُ الطباعة نفسها. وإن تعذّر خطُّها (شبكةٌ مقطوعة
    // وما زار الصفحةَ قبلُ) عادت نصّاً — قراءةٌ أضعفُ خيرٌ من بياض
    const qEntry = (tajweed === 3 && qcf) ? qcf[p - 1] : null;
    if (qEntry && qEntry.mode === "qcf"){
      const suraSet = [...new Set(rows.map(a => a.chapter))];
      paintQcf(qEntry, body).catch(() => {
        qEntry.mode = "text-net";
        paintPage(p);
      });
      const names = suraSet.map(n => bare(D.suras[n - 1].name)).join(" · ");
      $("qFoot").hidden = false;
      $("qFootSura").textContent = names;
      $("qFootPage").textContent = "صفحة " + AD(p);
      $("qFootJuz").textContent = "الجزء " + AD(D.pages[p - 1][4]);
      $("qGo").value = AD(p);
      $("qSura").value = String(suraSet[0] || 1);
      store.set("quran_page", String(p));
      return;
    }

    const suras = [];
    let block = null, lastSura = 0;

    for (const a of rows){
      if (a.chapter !== lastSura){
        lastSura = a.chapter;
        suras.push(a.chapter);
        // عنوانُ السورة لا يُكتب إلا حيث تبدأ فعلاً — فإن انسابت من
        // الصفحة السابقة فلا عنوان لها هنا، كما في المصحف
        if (a.verse === 1){
          const s = D.suras[a.chapter - 1];
          const h = document.createElement("div");
          h.className = "qsura";
          const b = document.createElement("b");
          b.textContent = "سورة " + bare(s.name);
          const sm = document.createElement("small");
          sm.textContent = s.place + " · " + ayahWord(s.ayahs);
          h.append(b, sm);
          body.appendChild(h);
          // البسملة عنوانٌ لا آية — إلا الفاتحة فهي آيةٌ منها،
          // وبراءةُ بلا بسملة
          if (a.chapter !== 1 && a.chapter !== 9){
            const bs = document.createElement("div");
            bs.className = "qbsml";
            const bsT = "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ";
            if (tajweed) bs.appendChild(tjFrag(bsT, tajweed)); else bs.textContent = bsT;
            body.appendChild(bs);
          }
        }
        block = null;
      }
      if (!block){
        block = document.createElement("div");
        block.className = "qtext";
        body.appendChild(block);
      }
      const span = document.createElement("span");
      span.className = "ay";
      span.dataset.s = String(a.chapter);
      span.dataset.a = String(a.verse);
      const disp = forDisplay(a.text) + " ";
      if (tajweed) span.appendChild(tjFrag(disp, tajweed)); else span.textContent = disp;
      const num = document.createElement("span");
      num.className = "num";
      num.textContent = AD(a.verse);
      span.appendChild(num);
      span.onclick = () => showTafsir(a, span);
      block.append(span, document.createTextNode(" "));
    }

    let names = suras.map(n => bare(D.suras[n - 1].name)).join(" · ");
    if (tajweed === 3 && qEntry)
      names += qEntry.mode === "text-net" ? " · الخطُّ لم يصل — نصّاً"
                                          : " · تُعرض نصّاً";
    $("qFoot").hidden = false;
    $("qFootSura").textContent = names;
    $("qFootPage").textContent = "صفحة " + AD(p);
    $("qFootJuz").textContent = "الجزء " + AD(D.pages[p - 1][4]);
    $("qGo").value = AD(p);
    $("qSura").value = String(suras[0] || 1);
    // كلُّ صفحةٍ تُلاءم طولَ الشاشة من جديد — فمحتواها غيرُ محتوى أختها
    requestAnimationFrame(() => window.__qFit && window.__qFit());
    store.set("quran_page", String(p));
    screenSub("islam-quran", names + " · صفحة " + AD(p) + " · " + NAMES[which]);
    toTop();
  }

  window.__islamQuran = async () => {
    const body = $("qBody");
    body.textContent = "يُفتح…";
    try {
      await loadQuran();
      if (tajweed === 3) await loadQcf();
      fillSuras();
      paintPage(Number(store.get("quran_page")) || 1);
      await loadReciters().catch(() => {});
      saveTick().catch(() => {});
    } catch (e) { body.textContent = "النصوص لم تُنزَّل بعد — ارجع ونزّلها"; }
  };
  // تطبيقُ المصحف يفتح على هذه الشاشة قبل أن تُعرَّف دالّتُها —
  // فالموجّه يعمل أوّلاً وهذا القسمُ بعده. فتُستدعى هنا إن سبقت
  if (currentScreen === "islam-quran") window.__islamQuran();

  // اختيار السورة ينقل إلى صفحتها الأولى، لا إلى قائمةٍ منفصلة
  $("qSura").onchange = () => paintPage(D.suras[Number($("qSura").value) - 1].page || 1);
  $("qPrev").onclick = () => paintPage(page - 1);
  $("qNext").onclick = () => paintPage(page + 1);
  // الرقم يُكتب هندياً في الخانة، فيُقبل بالوجهين. والخانةُ تُعاد
  // كتابتُها عند كل رسم، فيعود «change» عند مغادرتها بلا تغييرٍ حقيقيّ —
  // ولو أُعيد الرسمُ حينها لالتُهمت لمسةُ الآية التي غادر إليها
  $("qGo").onchange = () => {
    const v = $("qGo").value.replace(/[٠-٩]/g, d => "٠١٢٣٤٥٦٧٨٩".indexOf(d));
    const n = Number(v.replace(/\D/g, "")) || page;
    if (n !== page) paintPage(n);
  };

  /* التقليب بالإصبع — على الشاشة كلِّها لا الورقة وحدها، وبالاتجاه
     المألوف في مصاحف الجوّال: السحبُ نحو اليمين يُقدّم (فالصفحة
     التالية تأتي من اليسار كما في الكتاب الورقيّ). ولا يُقلَّب سحبٌ
     يبدأ من زرٍّ أو قائمةٍ أو لوحة الخيارات. */
  (() => {
    const scr = document.getElementById("islam-quran");
    let x0 = 0, y0 = 0, skip = false;
    scr.addEventListener("touchstart", (e) => {
      const el = e.target;
      skip = !!(el.closest && el.closest("button,select,input,#qOpts,#qImmBar,.qnav"));
      x0 = e.touches[0].clientX; y0 = e.touches[0].clientY;
    }, { passive: true });
    scr.addEventListener("touchend", (e) => {
      if (skip) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - x0, dy = t.clientY - y0;
      // لمسةٌ ساكنة على الصفحة (في ملء الشاشة): تُظهر الخيارات كاملةً
      // وتطويها — كما في المصاحف. والسحبُ يقلّب، والمائلُ تمرير
      if (MUSHAF_APP && Math.abs(dx) < 12 && Math.abs(dy) < 12){
        const opts = $("qOpts");
        if (document.documentElement.getAttribute("data-imm") === "1")
          opts.hidden = !opts.hidden;
        return;
      }
      if (Math.abs(dx) < 45 || Math.abs(dx) < Math.abs(dy) * 1.4) return;
      paintPage(page + (dx > 0 ? 1 : -1));
    }, { passive: true });
  })();

  $("qTafsirWhich").onclick = async () => {
    which = which === "muyassar" ? "jalalayn" : "muyassar";
    store.set("tafsir_which", which);
    $("qTafsirWhich").textContent = NAMES[which];
    await loadQuran();
    paintPage(page);
  };
  const resize = (d) => {
    // تكبيرٌ باليد إبطالٌ للملاءمة: من ضبط قامته بيده فقد اختار
    if (fitOn){ fitOn = false; store.set("quran_fit", "0"); qsize = Math.round(fitSize || qsize); }
    qsize = Math.max(13, Math.min(44, qsize + d));
    store.set("quran_size", String(qsize));
    $("qBody").style.setProperty("--qsize", qsize + "px");
  };
  $("qBigger").onclick = () => resize(2);
  $("qSmaller").onclick = () => resize(-2);

  /* الإعداداتُ خلف زرّ ⚙ في تطبيق المصحف: الصفحةُ لصاحبها، وما سواها
     يُطلب فيُجاب. وفي الريموت تبقى مبسوطةً كما كانت. */
  (() => {
    const opts = $("qOpts"), gear = $("qGear");
    if (!MUSHAF_APP){ gear.hidden = true; opts.dataset.flat = "1"; return; }
    opts.hidden = true;
    $("qOptsHead").hidden = false;
    const toggle = (on) => { opts.hidden = !on; if (on) opts.scrollTop = 0; };
    gear.onclick = () => toggle(opts.hidden);
    $("qOptsClose").onclick = () => toggle(false);
    $("qHub").onclick = () => { toggle(false); show("dev-islam"); };
  })();

  /* ---------- ملء الشاشة ----------
     ولا يُترك المرءُ في شاشةٍ لا بابَ لها: زرُّ الخروج ظاهرٌ دائماً،
     وزرُّ الرجوع يخرج منها أوّلاً ثمّ يرجع، فلا يقفز إلى شاشةٍ أخرى
     وقد نسي أنّه فيها. */
  // في تطبيق المصحف: ملءُ الشاشة هو الأصل — تفتح فترى الصفحة وحدها
  const qfSaved = store.get("quran_full");
  let imm = (qfSaved === null || qfSaved === undefined) ? MUSHAF_APP : qfSaved === "1";

  /* الملاءمة: تُضبط قامةُ الخطّ حتى تملأ الصفحةُ طولَ الشاشة تماماً —
     كورقة المصحف، لا أطولَ فتُمرَّر ولا أقصرَ فتترك فراغاً. والقياس
     بالمحتوى نفسه: الأسطرُ تلتفّ مع كل قامة، وطولُ الصفحة يتبع مربّعَ
     القامة تقريباً، فجذرُ النسبة يقرّب بخطوتين أو ثلاث. */
  let fitOn = store.get("quran_fit") !== "0";
  let fitSize = 0;
  function fitPage(){
    if (tajweed === 3) return;   // المصوَّر يحسب قامتَه حتماً بنفسه
    if (!imm || !fitOn || currentScreen !== "islam-quran") return;
    const body = $("qBody");
    const first = body.firstElementChild, last = body.lastElementChild;
    if (!first || !last) return;
    // الميزانية من طول الشاشة نفسه، لا من وعاءٍ يتمدّد مع المحتوى
    // فيوهم أنّ الطويل مُطابق (وقعت، فقِيست فأُصلحت)
    const sheet = $("qSheet");
    const cs = getComputedStyle(sheet);
    const foot = $("qFoot");
    const budget = document.documentElement.clientHeight
      - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom)
      - (foot.hidden ? 0 : foot.offsetHeight + 23);
    let size = fitSize || qsize;
    const measure = () => last.getBoundingClientRect().bottom - first.getBoundingClientRect().top;
    for (let i = 0; i < 8; i++){
      const h = measure();
      if (!h || budget < 100) return;
      const ratio = budget / h;
      // القبول من جهةٍ واحدة: أقصر بقليلٍ يجوز، وأطول بمليمترٍ تمرير.
      // وسقفُ الملاءمة أعلى من سقف اليد: الفاتحةُ وأخواتُها القِصار
      // تستحقّ أن تملأ الشاشة كما في المصحف
      if (h <= budget && ratio < 1.06) break;
      size = Math.max(12, Math.min(44, size * Math.sqrt(ratio)));
      body.style.setProperty("--qsize", size.toFixed(2) + "px");
    }
    for (let i = 0; i < 3 && measure() > budget && size > 12; i++){
      size = Math.max(12, size * 0.97);
      body.style.setProperty("--qsize", size.toFixed(2) + "px");
    }
    fitSize = size;
  }
  window.__qFit = fitPage;
  $("qFit").onclick = () => {
    fitOn = true; store.set("quran_fit", "1");
    if (!imm) setImm(true);
    fitPage();
  };
  let fitT = null;
  addEventListener("resize", () => { clearTimeout(fitT); fitT = setTimeout(fitPage, 200); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => fitPage());
  function setImm(on){
    imm = !!on;
    store.set("quran_full", imm ? "1" : "0");
    $("qImm").textContent = imm ? "أخرج" : "ملء الشاشة";
    if (imm) requestAnimationFrame(() => window.__qFit && window.__qFit());
    else { fitSize = 0; $("qBody").style.setProperty("--qsize", qsize + "px"); }
    // الرغبةُ محفوظة، والطيُّ لا يقع إلا والمصحفُ معروض. ولولا هذا
    // لفُتح التطبيقُ على الرئيسية بلا رأسٍ ولا أزرار، فبدا معطوباً
    const here = (typeof currentScreen !== "undefined") && currentScreen === "islam-quran";
    document.documentElement.setAttribute("data-imm", (imm && here) ? "1" : "0");
  }
  function clearImm(){ if (imm) setImm(false); }
  window.__quranImm = () => imm;
  window.__quranExitImm = clearImm;
  $("qImm").onclick = () => { setImm(!imm); toTop(); };
  if (NOSRV) $("qSave").textContent = "احفظ السورة في الجوّال";
  $("qFull").onclick = () => setImm(false);
  // والحجم يبقى في متناوله وهو في ملء الشاشة — وإلا لخرج ليكبّر ثمّ عاد
  $("qImmBigger").onclick  = () => resize(2);
  $("qImmSmaller").onclick = () => resize(-2);
  setImm(imm);

  /* ---------- المظهر ----------
     اللوحةُ تُبدَّل للتطبيق كلّه لا للمصحف وحده: من اختار الورقيّ
     للقراءة لا يريد أن ترتدّ عينُه إلى فحميّ حين يخرج إلى الأجهزة. */
  const THEME_BG = { dark:"#12161b", black:"#000000", paper:"#efe7d5",
                     light:"#eef1f5", green:"#0e1a15" };
  function applyTheme(t){
    if (!THEME_BG[t]) t = "dark";
    document.documentElement.setAttribute("data-theme", t);
    store.set("theme", t);
    // شريطُ الحالة في الجوّال يتبع اللوحة، وإلا بدا التطبيق مقصوصاً
    const m = document.querySelector('meta[name="theme-color"]');
    if (m) m.setAttribute("content", THEME_BG[t]);
    const sel = $("qTheme");
    if (sel && sel.value !== t) sel.value = t;
  }
  window.__applyTheme = applyTheme;
  applyTheme(store.get("theme") || "dark");
  $("qTheme").onchange = () => applyTheme($("qTheme").value);

  function paintLegend(){
    const box = $("qTajLegend"), note = $("qTajNote");
    if (tajweed === 3){
      box.hidden = true; box.innerHTML = "";
      note.hidden = false;
      note.textContent = "المصوَّر: صورةُ طبعة المدينة بخطوط مجمّع الملك " +
        "فهد نفسها — لكلّ صفحةٍ خطُّها وكلماتُها كما طُبعت. و١٧ صفحةً " +
        "منها (كالفاتحة وأوّل البقرة المزخرفتين) تُعرض نصّاً ريثما " +
        "يكتمل قياسُ تخطيطها، ويُقال ذلك في ذيل الصفحة.";
      return;
    }
    box.hidden = !tajweed; note.hidden = !tajweed;
    box.innerHTML = "";
    if (!tajweed) return;
    for (const [cls, name] of (TJ_LEGEND[tajweed] || [])){
      const s = document.createElement("span");
      s.className = cls;
      s.textContent = name;
      box.appendChild(s);
    }
    // ما لُوّن يُقال من أين جاء، وما لم يُلوَّن يُقال كذلك
    note.textContent = "أحكامُ النون الساكنة والتنوين والميم الساكنة "
      + "تُقرأ من ضبط المصحف نفسه: المُظهَرة عليها سكون، والمُدغَمة "
      + "والمُخفاة بلا سكون، والتنوين المُظهَر مركَّب والمُدغَم مفتوح، "
      + "والإقلاب عليه ميمٌ صغيرة.\n\nوقد قُوبل هذا كلُّه بمصحفٍ "
      + "مجوَّدٍ منشور، فطابقه في ٦٢٣٦ آية بلا اختلافٍ في موضعٍ واحد. "
      + "والإظهار لا لون له — فهو الأصل الذي لا حكم فيه.";
  }
  // وزن الخطّ: غامقٌ سلفاً كما طلب صاحبُه، ويُعدَّل ويُحفظ
  const qbold = () => {
    const v = store.get("quran_bold");
    return (v === null || v === undefined) ? "1" : v;
  };
  document.documentElement.setAttribute("data-qbold", qbold());
  $("qBold").value = qbold();
  $("qBold").onchange = () => {
    store.set("quran_bold", $("qBold").value);
    document.documentElement.setAttribute("data-qbold", $("qBold").value);
  };

  $("qTajweed").value = String(tajweed);
  $("qTajweed").onchange = async () => {
    tajweed = Number($("qTajweed").value) || 0;
    store.set("tajweed", String(tajweed));
    if (tajweed === 3){
      await loadQcf();
      if (qcfMissing){
        // لا أصولَ مصوَّرةً هنا (نسخة البيت): يُقال ولا يُترك خيارٌ أخرس
        $("qTajweed").value = "0";
        $("qTajNote").hidden = false;
        $("qTajNote").textContent = "المصوَّر في تطبيق المصحف المستقلّ — " +
          "هذه النسخة نصّية.";
        tajweed = 0;
      }
    }
    paintLegend();
    paintPage(page);
  };
  paintLegend();

  /* ---------- التلاوة ----------
     الآيات تُطلب من خادمنا لا من المصدر البعيد مباشرة: فهو يحفظ ما
     يمرّ به، فيصير الاستماعُ نفسه بانياً للمكتبة. وما حُفظ مرّةً
     يُسمع بعدها بلا إنترنت. */
  const player = {
    list: [],        // آياتُ المدى الحاليّ
    i: 0,            // أين نحن منها
    left: 1,         // كم بقي من تكرار هذه الآية
    on: false,
  };
  const audio = $("qAudio");

  const spanOf = (a) => [...document.querySelectorAll("#qBody .ay")]
    .find(s => s.dataset.s === String(a.chapter) && s.dataset.a === String(a.verse));

  function markNow(a){
    document.querySelectorAll("#qBody .ay.now").forEach(s => s.classList.remove("now"));
    if (!a) return;
    const s = spanOf(a);
    if (s) s.scrollIntoView({ block: "center", behavior: "smooth" });
    if (s) s.classList.add("now");
  }

  function stopPlay(msg){
    player.on = false;
    audio.pause();
    audio.removeAttribute("src");
    markNow(null);
    $("qPlay").textContent = "▶ استمع";
    $("qPlayMsg").textContent = msg || "";
  }

  function scopeAyahs(from){
    const scope = $("qScope").value;
    if (scope === "ayah") return [from];
    if (scope === "sura"){
      const all = D.quran.filter(x => x.chapter === from.chapter);
      return all.slice(all.findIndex(x => x.verse === from.verse));
    }
    const pg = ayahsOfPage(page);
    return pg.slice(pg.findIndex(x => x.chapter === from.chapter && x.verse === from.verse));
  }

  function playCurrent(){
    const a = player.list[player.i];
    if (!a) return stopPlay("تمّ");
    markNow(a);
    const r = $("qReciter").value;
    if (NOSRV){
      const tpl = pickedTpls()[r];
      if (!tpl) return stopPlay("هذا القارئ لم يُقَس بعد — اضغط «اقرأ القرّاء»");
      audio.src = falak.audioUrl(tpl, a.chapter, a.verse);
    } else {
      audio.src = "/islam/audio/ayah?r=" + encodeURIComponent(r) +
                  "&s=" + a.chapter + "&a=" + a.verse;
    }
    audio.play().catch((e) => stopPlay("تعذّر التشغيل: " + e.message));
    const rep = Number($("qRepeat").value);
    $("qPlayMsg").textContent = bare(D.suras[a.chapter - 1].name) + " " + AD(a.verse) +
      (rep === 0 ? " · تكرارٌ بلا نهاية"
                 : rep > 1 ? " · التكرار " + AD(rep - player.left + 1) + "/" + AD(rep) : "");
  }

  audio.onended = () => {
    if (!player.on) return;
    const rep = Number($("qRepeat").value);
    if (rep === 0) return playCurrent();          // بلا نهاية: الآية نفسها
    if (--player.left > 0) return playCurrent();
    player.i++;
    player.left = rep || 1;
    if (player.i >= player.list.length){
      // المدى انتهى — وإن كان مدى الصفحة انتقلنا إلى التي بعدها
      if ($("qScope").value === "page" && page < D.pages.length){
        paintPage(page + 1);
        const first = ayahsOfPage(page)[0];
        player.list = scopeAyahs(first);
        player.i = 0;
        return playCurrent();
      }
      return stopPlay("تمّت التلاوة");
    }
    playCurrent();
  };
  audio.onerror = () => { if (player.on) stopPlay("تعذّر جلب هذه الآية"); };

  function startFrom(a){
    const r = $("qReciter").value;
    if (!r) return void ($("qPlayMsg").textContent =
      "لا قارئ بعد — اضغط «اقرأ القرّاء» مرّةً واحدة، ثم استمع");
    player.list = scopeAyahs(a);
    player.i = 0;
    player.left = Number($("qRepeat").value) || 1;
    player.on = true;
    $("qPlay").textContent = "❚❚ إيقاف";
    playCurrent();
  }

  window.__islamHush = () => { if (player.on) stopPlay(""); };

  $("qPlay").onclick = () => {
    if (player.on) return stopPlay("");
    // يبدأ من الآية الملموسة إن كانت في هذه الصفحة، وإلا من أوّلها
    const rows = ayahsOfPage(page);
    let from = rows[0];
    if (selected){
      const s = Number(selected.dataset.s), v = Number(selected.dataset.a);
      const hit = rows.find(x => x.chapter === s && x.verse === v);
      if (hit) from = hit;
    }
    startFrom(from);
  };

  // في المستقلّ: القائمة مشحونةٌ مع التطبيق، والمقيسُ محفوظٌ في الجوّال
  const pickedTpls = () => { try { return JSON.parse(store.get("reciters") || "{}"); } catch { return {}; } };

  async function loadReciters(){
    const sel = $("qReciter");
    const r = NOSRV
      ? (() => {
          const picked = pickedTpls();
          return { ok: true, probed: !!store.get("recitersProbedAt"),
                   reciters: (window.__RECITERS__ || []).map(x => ({
                     key: x.key, name: x.name, note: x.note,
                     teacher: !!x.teacher, ready: !!picked[x.key] })) };
        })()
      : await fetch("/islam/audio/reciters", { cache: "no-store" }).then(x => x.json());
    sel.innerHTML = "";
    const ready = r.reciters.filter(x => x.ready);
    // المعلّم يُفصل عن المرتَّل: هما غرضان مختلفان، وخلطُهما في قائمةٍ
    // واحدة يجعل الأب يبحث عن تسجيل ابنه بين تسجيلاتٍ ليست له
    const groups = [["المرتَّل", ready.filter(x => !x.teacher)],
                    ["المصحف المعلّم — للترديد", ready.filter(x => x.teacher)]];
    for (const [label, list] of groups){
      if (!list.length) continue;
      const g = document.createElement("optgroup");
      g.label = label;
      for (const x of list){
        const o = document.createElement("option");
        o.value = x.key;
        o.textContent = x.name + (x.note ? " · " + x.note : "");
        g.appendChild(o);
      }
      sel.appendChild(g);
    }
    const saved = store.get("reciter");
    if (saved && ready.some(x => x.key === saved)) sel.value = saved;
    sel.onchange = () => store.set("reciter", sel.value);

    // «لم ينزل المصحف المعلّم» له سببان لا واحد: إمّا أنّ الخادم لا
    // يعرفه أصلاً — فالتحديث لم يصل — وإمّا أنه يعرفه ولم يُجب مصدرُه.
    // والفرق بينهما هو الفرق بين إصلاحٍ عندك وإصلاحٍ عندي، فيُقال أيّهما
    const old = $("qOld");
    if (!r.reciters.some(x => x.teacher)){
      // التحذير أوّلاً ثم النسخة: ‏/version يسأل GitHub عن آخر ما فيه،
      // وقد يبطئ أو يسقط — فلا يُعلَّق تحذيرٌ مؤكَّد على جوابٍ محتمل
      const head = "نسختك لا تعرف «المصحف المعلّم» بعد — التحديث لم يصل "
        + "بعدُ إلى اللابتوب.\nاذهب إلى الصيانة ← تحديث الآن، ثم عُد "
        + "واضغط «اقرأ القرّاء».";
      old.hidden = false;
      old.textContent = head;
      fetch("/version", { cache:"no-store" }).then(x => x.json()).then(v => {
        const when = v && (v.installedAt || (v.installed ? v.installed.slice(0, 7) : ""));
        old.textContent = head + "\nالمنصَّب عندك: "
          + (when || "غير مؤرَّخ — وهذا نفسه دليلُ قِدَمه")
          + (v && v.branch ? " · " + v.branch : "");
      }).catch(() => {});
    } else old.hidden = true;

    if (!ready.length){
      const o = document.createElement("option");
      o.value = ""; o.textContent = r.probed ? "لم يُجب أحد" : "لم يُقَس بعد";
      sel.appendChild(o);
      // القيدُ يُقال، ولا يُترك زرٌّ يُضغط فلا يقع شيء
      $("qPlayMsg").textContent = r.probed
        ? "لم يُجب أيُّ قارئ من شبكتك. اضغط «اقرأ القرّاء» لإعادة المحاولة."
        : "اضغط «اقرأ القرّاء» مرّةً واحدة — دقيقة، ثم يعمل الصوت دائماً.";
    }
  }

  /** أيُجيب هذا العنوان؟ يُسأل بعنصر صوتٍ لا بـfetch — فالمتصفّح يشغّل
      الصوت من مضيفٍ غريب ولا يقرأه، وهذا يكفي للقياس */
  function probeAudioUrl(u, ms = 8000){
    return new Promise((res) => {
      const a = new Audio();
      let done = false;
      const end = (ok) => { if (done) return; done = true;
                            a.onloadedmetadata = a.onerror = null;
                            a.removeAttribute("src"); res(ok); };
      const t = setTimeout(() => end(false), ms);
      a.preload = "metadata";
      a.onloadedmetadata = () => { clearTimeout(t); end(true); };
      a.onerror = () => { clearTimeout(t); end(false); };
      a.src = u;
    });
  }

  async function probeStandalone(){
    const result = {}, picked = {};
    for (const r of (window.__RECITERS__ || [])){
      result[r.key] = { name: r.name, url: null };
      for (const tpl of r.urls){
        if (await probeAudioUrl(falak.audioUrl(tpl, 1, 1))){
          result[r.key].url = tpl; picked[r.key] = tpl; break;
        }
      }
    }
    store.set("reciters", JSON.stringify(picked));
    store.set("recitersProbedAt", new Date().toISOString());
    return { ok: true, result };
  }

  /** يقيس القرّاء ويقول من أجاب ومن سكت — بلا تجميل */
  async function probeReciters(){
    const b = $("qProbe"), msg = $("qPlayMsg");
    b.disabled = true; b.textContent = "يُقاس… قد يأخذ دقيقة";
    msg.style.color = ""; msg.textContent = "";
    try {
      const out = NOSRV ? await probeStandalone() : await post("/islam/audio/probe");
      if (out.running){ msg.textContent = "قياسٌ جارٍ — انتظر قليلاً"; return; }
      const bad = Object.entries(out.result || {}).filter(([, v]) => !v.url);
      const good = Object.entries(out.result || {}).filter(([, v]) => v.url);
      await loadReciters();
      msg.textContent = good.length
        ? "أجاب: " + good.map(([, v]) => v.name).join("، ") +
          (bad.length ? " · ولم يُجب: " + bad.map(([, v]) => v.name).join("، ") : "")
        : "لم يُجب أحد — شبكتك تحجب مضيفي التلاوات. قل لي وأبحث عن مصدرٍ آخر.";
    } catch (e) { msg.textContent = "تعذّر القياس: " + e.message; }
    finally { b.disabled = false; b.textContent = "اقرأ القرّاء"; }
  }
  $("qProbe").onclick = probeReciters;

  // ---------- الحفظ للاستماع بلا إنترنت ----------
  /* في المستقلّ يُحفظ في مخزن المتصفّح (Cache) وعاملُ الخدمة يقدّمه.
     والجلبُ بلا CORS يعطي ردّاً معتماً يصلح للتشغيل ولا يُقرأ محتواه —
     فزرُّ «ملفٍّ واحد إلى الجوّال» قد يتعذّر عند مضيفٍ لا يسمح بالقراءة،
     ويُقال ذلك حين يقع لا قبله. */
  const AUD_CACHE = "mushaf-audio-v1";
  let saveAbort = false;

  async function savedCountLocal(r, s){
    const tpl = pickedTpls()[r];
    if (!tpl || !window.caches) return { have: 0, total: falak.SURA_AYAHS[s - 1] };
    const c = await caches.open(AUD_CACHE);
    const total = falak.SURA_AYAHS[s - 1];
    let have = 0;
    for (let a = 1; a <= total; a++){
      if (await c.match(falak.audioUrl(tpl, s, a))) have++;
    }
    return { have, total };
  }

  async function saveStandalone(r, s){
    const tpl = pickedTpls()[r];
    if (!tpl) return void ($("qSaveMsg").textContent = "هذا القارئ لم يُقَس بعد");
    const c = await caches.open(AUD_CACHE);
    const total = falak.SURA_AYAHS[s - 1];
    saveAbort = false;
    $("qSave").textContent = "أوقف الحفظ";
    let failed = 0;
    for (let a = 1; a <= total; a++){
      if (saveAbort) break;
      const u = falak.audioUrl(tpl, s, a);
      if (!(await c.match(u))){
        try {
          const res = await fetch(u, { mode: "no-cors" });
          // الردُّ المعتم لا يكشف نجاحه — فيُقاس بتشغيله لا بحالته
          if (res && (res.ok || res.type === "opaque")) await c.put(u, res);
          else failed++;
        } catch { failed++; }
      }
      $("qSaveMsg").textContent = "يُحفظ في الجوّال… " + AD(a) + "/" + AD(total) +
        (failed ? " (تعذّر " + AD(failed) + ")" : "");
    }
    $("qSave").textContent = "احفظ السورة في الجوّال";
    const st = await savedCountLocal(r, s);
    $("qSaveMsg").textContent = st.have >= st.total
      ? "محفوظةٌ كاملة في جوّالك — تعمل بلا إنترنت"
      : "المحفوظ " + AD(st.have) + " من " + AD(st.total) + " آية";
  }

  let saveTimer = null;
  async function saveTick(){
    const r = $("qReciter").value, s = Number($("qSura").value) || 1;
    if (NOSRV){
      const st = await savedCountLocal(r, s);
      $("qSaveMsg").textContent = st.have >= st.total
        ? "محفوظةٌ كاملة في جوّالك — تعمل بلا إنترنت"
        : st.have ? "المحفوظ " + AD(st.have) + " من " + AD(st.total) + " آية" : "";
      return;
    }
    const st = await fetch("/islam/audio/status?r=" + encodeURIComponent(r) + "&s=" + s,
                           { cache: "no-store" }).then(x => x.json()).catch(() => null);
    if (!st) return;
    if (st.saving){
      $("qSaveMsg").textContent = "يُحفظ… " + AD(st.saving.n) + "/" + AD(st.saving.total) +
        (st.saving.failed ? " (تعذّر " + AD(st.saving.failed) + ")" : "");
      $("qSave").textContent = "أوقف الحفظ";
      return;
    }
    clearInterval(saveTimer); saveTimer = null;
    $("qSave").textContent = "احفظ السورة على الخادم";
    if (st.sura){
      $("qSaveMsg").textContent = st.sura.have >= st.sura.total
        ? "محفوظةٌ كاملة — تعمل بلا إنترنت"
        : "المحفوظ " + AD(st.sura.have) + " من " + AD(st.sura.total) + " آية";
    }
  }

  /* ملفُّ السورة إلى الجوّال — ملكُه لا يمحوه متصفّح، ويعمل في السيّارة */
  $("qGet").onclick = async () => {
    const r = $("qReciter").value;
    if (!r) return void ($("qSaveMsg").textContent = "اختر قارئاً أوّلاً");
    const s = Number($("qSura").value) || 1;
    if (NOSRV){
      const tpl = pickedTpls()[r];
      if (!tpl) return void ($("qSaveMsg").textContent = "هذا القارئ لم يُقَس بعد");
      const total = falak.SURA_AYAHS[s - 1];
      $("qSaveMsg").textContent = "أجمعها ملفاً واحداً…";
      try {
        const parts = [];
        for (let a = 1; a <= total; a++){
          const res = await fetch(falak.audioUrl(tpl, s, a));   // بلا no-cors: نحتاج القراءة
          if (!res.ok) throw new Error("آية " + a + " ردّت " + res.status);
          parts.push(await res.blob());
          $("qSaveMsg").textContent = "أجمعها… " + AD(a) + "/" + AD(total);
        }
        const blob = new Blob(parts, { type: "audio/mpeg" });
        const aEl = document.createElement("a");
        aEl.href = URL.createObjectURL(blob);
        aEl.download = "sura-" + s + ".mp3";
        document.body.appendChild(aEl); aEl.click(); aEl.remove();
        setTimeout(() => URL.revokeObjectURL(aEl.href), 60000);
        $("qSaveMsg").textContent = "نزلت — احفظها في «الملفات» من نافذة التنزيل";
      } catch (e) {
        // مضيفٌ لا يسمح بالقراءة من متصفّحٍ غريب: يُقال، ويبقى الحفظُ
        // داخل التطبيق طريقاً يعمل
        $("qSaveMsg").textContent = "تعذّر جمعُها ملفاً (" + e.message + "). " +
          "استعمل «احفظ السورة في الجوّال» — تعمل داخل التطبيق بلا إنترنت.";
      }
      return;
    }
    const st = await fetch("/islam/audio/status?r=" + encodeURIComponent(r) + "&s=" + s,
                           { cache:"no-store" }).then(x => x.json()).catch(() => null);
    if (!st || !st.sura) return void ($("qSaveMsg").textContent = "تعذّر الوصول للخادم");
    if (st.sura.have < st.sura.total){
      // لا يُقدَّم نصفُ سورة — يُقال ما ينقص، ويُبدأ حفظُه
      $("qSaveMsg").textContent = "المحفوظ " + AD(st.sura.have) + " من " +
        AD(st.sura.total) + " — أحفظها أوّلاً ثم أنزّلها";
      return $("qSave").click();
    }
    $("qSaveMsg").textContent = "يبدأ التنزيل… احفظه في «الملفات» من زرّ المشاركة";
    location.href = "/islam/audio/sura?r=" + encodeURIComponent(r) + "&s=" + s;
  };

  $("qSave").onclick = async () => {
    const r = $("qReciter").value;
    if (!r) return void ($("qSaveMsg").textContent = "اختر قارئاً أوّلاً");
    if (NOSRV){
      if ($("qSave").textContent === "أوقف الحفظ"){ saveAbort = true; return; }
      return saveStandalone(r, Number($("qSura").value) || 1);
    }
    if (saveTimer){ await post("/islam/audio/stop"); return; }
    const s = Number($("qSura").value) || 1;
    $("qSaveMsg").textContent = "يبدأ…";
    try {
      await post("/islam/audio/save?r=" + encodeURIComponent(r) + "&s=" + s);
      saveTimer = setInterval(saveTick, 1500);
      saveTick();
    } catch (e) { $("qSaveMsg").textContent = "تعذّر: " + e.message; }
  };

  // ---------- الأذكار ----------
  window.__islamAzkar = async () => {
    const body = $("zBody");
    body.textContent = "يُفتح…";
    try {
      if (!D.azkar) D.azkar = await getJson("azkar.json");
      const sel = $("zCat");
      if (!sel.options.length){
        [...new Set(D.azkar.map(z => z.cat))].forEach(c => {
          const o = document.createElement("option");
          o.value = c; o.textContent = c;
          sel.appendChild(o);
        });
        sel.onchange = () => paintAzkar(sel.value);
      }
      paintAzkar(store.get("azkar_cat") || sel.options[0].value);
      sel.value = store.get("azkar_cat") || sel.options[0].value;
    } catch { body.textContent = "الأذكار لم تُنزَّل بعد"; }
  };

  function paintAzkar(cat){
    store.set("azkar_cat", cat);
    const body = $("zBody");
    body.innerHTML = "";
    const list = D.azkar.filter(z => z.cat === cat);
    screenSub("islam-azkar", cat + " · " + AD(list.length));
    list.forEach(z => {
      const card = document.createElement("div");
      card.className = "zekr";
      if (z.count > 1){
        const c = document.createElement("button");
        c.className = "c";
        let left = z.count;
        c.textContent = left;
        c.onclick = () => {
          buzz(15);
          if (left <= 0){ left = z.count; c.textContent = left; c.classList.remove("done"); return; }
          left--; c.textContent = left || "✓";
          if (!left) c.classList.add("done");
        };
        card.appendChild(c);
      }
      const t = document.createElement("div");
      t.className = "t"; t.textContent = z.text;
      card.appendChild(t);
      if (z.virtue){
        const v = document.createElement("div");
        v.className = "v"; v.textContent = z.virtue;
        card.appendChild(v);
      }
      if (z.ref){
        const r = document.createElement("div");
        r.className = "r"; r.textContent = "المرجع: " + z.ref;
        card.appendChild(r);
      }
      body.appendChild(card);
    });
  }

  // ---------- المواقيت ----------
  const AR = { fajr:"الفجر", sunrise:"الشروق", dhuhr:"الظهر",
               asr:"العصر", maghrib:"المغرب", isha:"العشاء" };
  let hanafi = store.get("asr_hanafi") === "1";

  window.__islamTimes = () => {
    $("tHanafi").textContent = "العصر: " + (hanafi ? "الحنفيّ" : "الجمهور");
    // في المستقلّ يُحسب هنا — بوحدة falak نفسها التي يحسب بها الخادم،
    // فلا يريك الجوّالُ فجراً غير فجر اللابتوب
    const src = NOSRV
      ? Promise.resolve().then(() => {
          const t = falak.prayerTimes(new Date(), PLACE.lat, PLACE.lon, PLACE.tz, { hanafi });
          const out = {};
          for (const k of ["fajr","sunrise","dhuhr","asr","maghrib","isha"]) out[k] = falak.hhmm(t[k]);
          return { ok: true, times: out, method: t.method, lat: PLACE.lat, lon: PLACE.lon };
        })
      : fetch("/islam/times?hanafi=" + (hanafi ? "1" : "0"), { cache:"no-store" })
          .then(r => r.json());
    src.then(r => {
        if (!r.ok) return;
        const dl = $("tList");
        dl.innerHTML = "";
        for (const k of ["fajr","sunrise","dhuhr","asr","maghrib","isha"]){
          const dt = document.createElement("dt"), dd = document.createElement("dd");
          dt.textContent = AR[k];
          dd.textContent = r.times[k] || "—";
          dd.style.direction = "ltr"; dd.style.textAlign = "right";
          if (k === "sunrise") { dt.style.opacity = ".6"; dd.style.opacity = ".6"; }
          dl.append(dt, dd);
        }
        $("tPlace").textContent = "على طريقة " + r.method + " · " +
          r.lat.toFixed(4) + "، " + r.lon.toFixed(4);
        screenSub("islam-times", r.method);
        nextPrayer(r.times);
      }).catch(() => {});
  };

  function nextPrayer(times){
    const now = new Date();
    const mins = now.getHours() * 60 + now.getMinutes();
    const order = ["fajr","dhuhr","asr","maghrib","isha"];
    let next = null;
    for (const k of order){
      if (!times[k]) continue;
      const [h, m] = times[k].split(":").map(Number);
      if (h * 60 + m > mins){ next = { k, at: h * 60 + m }; break; }
    }
    if (!next && times.fajr){
      const [h, m] = times.fajr.split(":").map(Number);
      next = { k: "fajr", at: h * 60 + m + 1440 };
    }
    if (!next) return;
    const left = next.at - mins;
    $("tNextName").textContent = AR[next.k];
    $("tNextIn").textContent = left >= 60
      ? "بعد " + Math.floor(left / 60) + "س " + (left % 60) + "د"
      : "بعد " + left + " دقيقة";
  }

  $("tHanafi").onclick = () => {
    hanafi = !hanafi;
    store.set("asr_hanafi", hanafi ? "1" : "0");
    window.__islamTimes();
  };

  // ---------- القبلة ----------
  // الاتجاه يُحسب في الخادم يقيناً. وأمّا القرص فلا يدور إلا إذا كان
  // ثمّة مستشعرٌ يقرأ فعلاً — والقاعدة الثانية عشرة تمنعني أن أُديره
  // إيهاماً. فإن غاب المستشعر عُرض الرقم وحده وقيل لماذا.
  const DIRS = [["شمالاً",0],["شمالاً شرقيّاً",45],["شرقاً",90],["جنوباً شرقيّاً",135],
                ["جنوباً",180],["جنوباً غربيّاً",225],["غرباً",270],["شمالاً غربيّاً",315]];

  let qibla = null;          // الاتجاه من الشمال، كما حسبه الخادم
  let heading = null;        // ما يقرؤه المستشعر الآن
  let sensing = false;       // أنُصغي إليه؟
  let sawReading = false;    // أوصلت قراءةٌ واحدة على الأقلّ؟

  // سفاري يعطي webkitCompassHeading: درجاتٌ من الشمال المغناطيسيّ مع
  // عقارب الساعة. وغيره يعطي alpha، وهي تدور عكسها — فتُقلب
  function readingOf(e){
    if (typeof e.webkitCompassHeading === "number" && !isNaN(e.webkitCompassHeading))
      return e.webkitCompassHeading;
    if (e.absolute === true && typeof e.alpha === "number" && !isNaN(e.alpha))
      return (360 - e.alpha) % 360;
    return null;
  }

  function paintDial(){
    // حين لا مستشعر: المؤشّر على الاتجاه من الشمال، والقرص خريطةٌ ساكنة.
    // وحين يقرأ: المؤشّر على القبلة **من حيث يتّجه الجهاز الآن**
    const at = heading === null ? qibla : (qibla - heading + 360) % 360;
    $("qibDial").style.setProperty("--qib", at + "deg");
    if (heading === null) return;
    const off = Math.abs(((at + 540) % 360) - 180);
    $("qibLive").style.color = off <= 5 ? "var(--ok)" : "var(--muted)";
    $("qibLive").textContent = off <= 5
      ? "القبلة أمامك الآن — استقبِلها."
      : "استدر حتى ينطبق المؤشّر على أعلى القرص (باقٍ " + AD(off.toFixed(0)) + "°).";
  }

  function onOrient(e){
    const h = readingOf(e);
    if (h === null) return;
    sawReading = true;
    heading = h;
    paintDial();
  }

  function stopSensing(){
    if (!sensing) return;
    sensing = false;
    window.removeEventListener("deviceorientationabsolute", onOrient, true);
    window.removeEventListener("deviceorientation", onOrient, true);
    heading = null;
  }
  window.__qiblaHush = stopSensing;

  async function startSensing(){
    const btn = $("qibStart"), live = $("qibLive");
    btn.disabled = true;
    live.style.color = "var(--muted)";
    live.textContent = "أسأل المستشعر…";
    try {
      // إذنُ سفاري لا يُطلب إلا من لمسةٍ مباشرة — ولذلك هذا زرّ
      if (typeof DeviceOrientationEvent.requestPermission === "function"){
        const ans = await DeviceOrientationEvent.requestPermission();
        if (ans !== "granted"){
          live.style.color = "var(--warn)";
          live.textContent = "لم يُؤذَن للبوصلة. والإذن يُعاد من: إعدادات "
            + "سفاري ← الحركة واتجاه الجهاز.";
          btn.disabled = false;
          return;
        }
      }
    } catch (err){
      live.style.color = "var(--warn)";
      live.textContent = "تعذّر طلب الإذن: " + err.message;
      btn.disabled = false;
      return;
    }

    sawReading = false;
    sensing = true;
    window.addEventListener("deviceorientationabsolute", onOrient, true);
    window.addEventListener("deviceorientation", onOrient, true);
    btn.hidden = true;

    // وقد يُؤذَن ولا يصل شيء — فلا نترك قرصاً ساكناً يُظنّ حيّاً
    setTimeout(() => {
      if (sawReading || !sensing) return;
      stopSensing();
      btn.hidden = false; btn.disabled = false;
      btn.textContent = "أعد المحاولة";
      live.style.color = "var(--warn)";
      live.textContent = "أُذِن للبوصلة ولم تصل منها قراءة — فجهازك لا "
        + "يعطي اتجاهاً هنا. استعمل تطبيق البوصلة كما في الأسفل.";
      paintDial();
    }, 4000);
  }
  $("qibStart").onclick = startSensing;

  window.__islamQibla = () => {
    const qsrc = NOSRV
      ? Promise.resolve({ ok: true, bearing: Number(falak.qibla(PLACE.lat, PLACE.lon).toFixed(2)),
                          km: falak.distanceToKaaba(PLACE.lat, PLACE.lon) })
      : fetch("/islam/qibla", { cache:"no-store" }).then(r => r.json());
    qsrc.then(r => {
      if (!r.ok) return;
      qibla = r.bearing;
      $("qibDeg").textContent = AD(r.bearing.toFixed(1)) + "°";
      const near = DIRS.reduce((a, b) =>
        Math.abs(((r.bearing - b[1] + 540) % 360) - 180) > Math.abs(((r.bearing - a[1] + 540) % 360) - 180) ? a : b);
      $("qibWord").textContent = near[0] + " تقريباً · الكعبة على بُعد " + r.km + " كم";
      paintDial();
      screenSub("islam-qibla", AD(r.bearing.toFixed(1)) + "°");

      const can = window.isSecureContext &&
        typeof DeviceOrientationEvent !== "undefined";
      $("qibStart").hidden = !can || sensing;
      $("qibHow").textContent = can
        ? "اضغط «شغّل البوصلة»، فيُطلب إذنُ الحركة والاتجاه مرّةً — ثم "
          + "استدر بالجهاز حتى ينطبق المؤشّر على أعلى القرص.\n\n"
          + "وهي بوصلةٌ مغناطيسية: أبعِد الجهاز عن الحديد والمكبّرات، "
          + "فإن شككتَ فالرقم أعلاه (" + AD(r.bearing.toFixed(0)) + "° من الشمال) "
          + "هو الأصل، وأيُّ تطبيق بوصلةٍ يكفي معه."
        : "ضع بوصلةً (تطبيق البوصلة في جوّالك) واستدر حتى تقرأ "
          + AD(r.bearing.toFixed(0)) + "° — تلك جهة القبلة.\n\n"
          + "والقرص هنا لا يدور: سفاري يمنع مستشعر الاتجاه على العناوين "
          + "غير المشفّرة، ولن أُدير قرصاً يوهم بأنه يتتبّع وهو لا يفعل.\n\n"
          + "وافتحه بالعنوان المشفَّر (https) تعمل البوصلة.";
      $("qibHow").style.whiteSpace = "pre-wrap";
    }).catch(() => {});
  };

  window.__islamHub = status;
  // في تطبيق المصحف تُفتح هذه الشاشة قبل أن تُعرَّف دالّتها — فالموجّه
  // يعمل أوّلاً والقسمُ الإسلاميّ بعده. فتُستدعى هنا إن كانت معروضة
  if (currentScreen === "dev-islam") status();
})();

function setupWakeCheck(what, btnId, msgId){
  const btn = $(btnId), msg = $(msgId);
  if (!btn || !msg) return;

  const SAY = {
    awake:     (r) => ["var(--muted)", r.why],
    reachable: (r) => ["var(--ok)",
      "بطاقته أجابت وهو مطفأ — فالإيقاظ ممكن، والعلّة في إعداده." +
      (what === "tv"
        ? "\n\nبريموت التلفزيون: الإعدادات ← عام ← Quick Start+ ← فعّله."
        : "")],
    dead:      (r) => ["var(--danger)",
      "لا جواب من بطاقته وهو مطفأ — فلا يوقظه شيء من الشبكة، ولن أعدك بما لا يقع." +
      "\n\nوالحلّ الوحيد مقبس ذكي أمامه." +
      (r.pinned ? "\n\n(ما في الجدول أثرٌ ثبّتناه نحن، لا جوابٌ منه.)" : "")],
    unknown:   (r) => ["var(--warn)", r.why],
  };

  btn.onclick = () => {
    if (!onServer) return (msg.textContent = "الفحص يحتاج الخادم");
    btn.disabled = true;
    const t = btn.textContent;
    btn.textContent = "أقيس…";
    msg.style.color = "var(--muted)";
    msg.textContent = "أحذف أثره القديم، ثم أسأل بطاقته…";
    fetch("/wake-check?what=" + what, { cache:"no-store" })
      .then(r => r.json())
      .then(r => {
        const [color, text] = (SAY[r.verdict] || SAY.unknown)(r);
        msg.style.color = color;
        msg.style.whiteSpace = "pre-wrap";
        msg.textContent = text;
      })
      .catch(() => { msg.style.color = "var(--danger)"; msg.textContent = "تعذّر الوصول للخادم"; })
      .finally(() => { btn.disabled = false; btn.textContent = t; });
  };
}
if (!MUSHAF_APP){
  setupWakeCheck("tv", "tvWakeCheck", "tvWakeMsg");
  setupWakeCheck("proj", "projWakeCheck", "projWakeMsg");
}

(function setupProjector(){
  if (MUSHAF_APP) return;   // تطبيق المصحف: لا أجهزة فيه
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
      say("يحتاج الخادم", "البروجيكتر لا يعمل من صفحة التلفزيون",
          "التلفزيون يُكلَّم من المتصفح مباشرة، أما البروجيكتر فعبر ADB، " +
          "وهو يحتاج خادماً يعمل في البيت: اللابتوب، أو هاتف هواوي بتطبيق Termux " +
          "(الدليل في tvremote/webos/TERMUX.md). شغّل أحدهما وافتح الريموت من عنوانه.");
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

  function report(text){
    const box = $("projReport");
    box.hidden = false;
    box.textContent = text;
  }

  function scan(wide){
    const b = wide ? $("projScanWide") : $("projScan");
    const label = b.textContent;
    b.disabled = true;
    b.textContent = wide ? "نصف دقيقة…" : "لحظة…";
    report(wide ? "أمسح كل منافذ التصحيح اللاسلكي — نحو نصف دقيقة…"
                : "أفحص المنافذ المعروفة…");
    // بلا عنوان: الخادم يستعمل ما يعرفه — على قاعدة أن العنوان يُكتشف لا يُكتب
    fetch("/proj/scan" + (wide ? "?wide=1" : ""), { cache:"no-store" })
      .then(r => r.json())
      .then(r => {
        if (!r.ok) return report("تعذّر الفحص: " + (r.why || ""));
        if (!r.found.length){
          report("العنوان " + r.ip + "\nلا منفذ مفتوح.\n\n" +
                 (wide ? "فحصت المنافذ المعروفة والمدى اللاسلكي كلّه.\n\n" +
                         "إمّا أن الجهاز مطفأ،\nأو أن عنوانه تغيّر — اضغط «بحث عنه» ليمسح الشبكة،\n" +
                         "أو أن التصحيح غير مفعّل فيه."
                       : "جرّب «فحص شامل» — أندرويد ١١ يفتح منفذاً عشوائياً."));
          return;
        }
        const lines = r.found.map(f => {
          let t = "  " + f.port + "  " + f.label;
          if (f.adb === true)  t += "\n     ✓ ADB يعمل — " + (f.banner || "");
          if (f.adb === false) t += "\n     ✗ " + (f.why || "لم يصافح");
          return t;
        });
        report("العنوان " + r.ip + "\nالمنافذ المفتوحة:\n" + lines.join("\n"));
      })
      .catch(() => report("تعذّر الوصول للخادم"))
      .finally(() => { b.disabled = false; b.textContent = label; });
  }

  $("projScan").onclick = () => scan(false);
  $("projScanWide").onclick = () => scan(true);

  $("projHelp").onclick = () => alert(
    "لتفعيل ADB في البروجيكتر:\n\n" +
    "١) الإعدادات ← حول الجهاز\n" +
    "٢) اضغط «رقم الإصدار» سبع مرات حتى تظهر «صرت مطوّراً»\n" +
    "٣) ارجع ← خيارات المطوّر\n" +
    "٤) فعّل «تصحيح USB»\n" +
    "٥) ابحث في نفس الصفحة عن أحد هذين:\n" +
    "     • «تصحيح USB عبر الشبكة» أو ADB over network  ← الأفضل\n" +
    "     • «تصحيح لاسلكي» أو Wireless debugging       ← فعّله وافتحه\n\n" +
    "ثم اضغط «افحص الجهاز». وإن لم يجد شيئاً فاضغط «فحص شامل».\n\n" +
    "وستظهر على شاشة البروجيكتر رسالة «السماح بتصحيح USB» — وافق وعلّم «دائماً»."
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

  // ADB لا يعمل إلا والجهاز مستيقظ، فهذا يوقظ الشاشة لا الجهاز المطفأ.
  // والقاعدة الثانية عشرة: لا يُبنى زرٌّ يوهم بما لا يقع
  $("projWake").onclick  = () => { buzz(20); post("/proj/wake").then(()=>toast("أُرسلت إشارة إيقاظ الشاشة")); };
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
      // وما لم يوجد يُقال باسمه: فإن غاب ديزني فالعلّة أنّه غيرُ
      // منصَّبٍ على الجهاز نفسه — لا زرٌّ ناقص هنا
      if (r.missing && r.missing.length){
        empty.hidden = false;
        empty.textContent = "وليست منصَّبةً على الجهاز: " + r.missing.join("، ") +
          " — نصِّبها من متجر البروجيكتر تظهر هنا وحدها";
      }
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
/* ============================================================
   الأمر الصوتيّ بالعربية

   سفاري يتعرّف على الكلام، و`voice.js` يفهمه — وهو الملفّ نفسه الذي
   قِيس بـ٨٥ جملةً في node قبل أن يصل إلى هنا.

   **ولا يُنفَّذ ما لم يُفهم يقيناً.** إن قصُر الفهم عن العتبة قيل
   «ما فهمت» مع ما سُمع — فأمرٌ خاطئ يُطفئ تلفزيوناً أسوأ من أمرٍ لم
   يقع. والمفهوم يُعرض بالعربية قبل تنفيذه، فيُرى ما وقع.
   ============================================================ */
(function setupVoice(){
  if (MUSHAF_APP) return;   // تطبيق المصحف: لا أجهزة فيه
  const btn = $("micBtn"), stateEl = $("micState"), heardEl = $("micHeard");
  if (!btn) return;

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const say = (s, h) => { stateEl.textContent = s; if (h !== undefined) heardEl.textContent = h; };

  // القيدُ يُقال ولا يُخفى: الميكروفون محجوبٌ على http في سفاري
  if (!SR || !window.isSecureContext){
    btn.disabled = true;
    say("الأمر الصوتيّ يحتاج اتصالاً مشفَّراً",
        !SR ? "متصفّحك لا يدعم التعرّف على الكلام"
            : "افتح «الصيانة ← اتصالٌ مشفَّر» واستصدر الشهادة، ثم افتح العنوان الذي تراه هناك");
    return;
  }

  let rec = null, listening = false;

  function stop(){
    listening = false;
    btn.classList.remove("on");
    try { rec && rec.stop(); } catch {}
  }

  btn.onclick = () => {
    if (listening) return stop();
    if (!window.Voice){ say("لم يُحمَّل فاهمُ الأوامر", "أعد تحميل الصفحة"); return; }
    try {
      rec = new SR();
    } catch (e) { say("تعذّر فتح الميكروفون", e.message); return; }
    rec.lang = "ar-SA";
    rec.interimResults = true;
    rec.maxAlternatives = 3;
    rec.continuous = false;

    let finalText = "", alts = [];
    rec.onstart = () => { listening = true; btn.classList.add("on"); say("أسمعك…", ""); };
    rec.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++){
        const r = e.results[i];
        if (r.isFinal){
          finalText = r[0].transcript;
          // البدائل تُجرَّب أيضاً: قد يخطئ الأوّل ويصيب الثاني
          alts = [];
          for (let k = 0; k < r.length; k++) alts.push(r[k].transcript);
        } else interim += r[0].transcript;
      }
      if (interim) say("أسمعك…", interim);
    };
    rec.onerror = (e) => {
      stop();
      const m = { "not-allowed": "لم تُؤذن للميكروفون — اسمح به من إعدادات سفاري",
                  "no-speech": "ما سمعت شيئاً", "network": "التعرّف يحتاج إنترنت",
                  "audio-capture": "لا ميكروفون" }[e.error];
      say(m || "تعذّر السماع", e.error || "");
    };
    rec.onend = () => {
      stop();
      if (!finalText) { if (stateEl.textContent === "أسمعك…") say("ما سمعت شيئاً", ""); return; }
      // نأخذ أوّل بديلٍ يُفهم يقيناً
      let best = null;
      for (const a of (alts.length ? alts : [finalText])){
        const r = window.Voice.parse(a);
        if (r.intent && r.sure >= window.Voice.THRESHOLD){ best = r; break; }
        if (!best) best = r;
      }
      heardEl.textContent = "سمعت: " + finalText;
      if (!best.intent || best.sure < window.Voice.THRESHOLD){
        stateEl.textContent = best.why || "ما فهمت";
        buzz(30);
        return;
      }
      stateEl.textContent = window.Voice.describe(best);
      buzz(15);
      run(best);
    };

    try { rec.start(); } catch (e) { say("تعذّر البدء", e.message); }
  };

  /** ينفّذ ما فُهم — بالطرق نفسها التي تعمل بها الأزرار، لا بطريقٍ آخر */
  async function run(r){
    const go = (id) => show(id);
    try {
      switch (r.intent){
        case "power":
          if (r.device === "tv"){
            go("dev-tv");
            const res = await post("/power-on");
            toast(res.ok ? "يُوقَظ التلفزيون…" : (res.why || "تعذّر"), !res.ok);
          } else if (r.device === "proj"){
            go("dev-proj");
            await post("/proj/wake"); toast("أُرسلت إشارة التشغيل");
          } else go("dev-" + r.device);
          return;

        case "powerOff":
          if (r.device === "tv"){ go("dev-tv"); await tv.request(SSAP.power); toast("أُطفئ التلفزيون"); }
          else if (r.device === "proj"){ go("dev-proj"); await post("/proj/sleep"); toast("أُطفئ البروجكتر"); }
          return;

        case "volUp":   go("dev-tv"); await runCmd("volUp"); return;
        case "volDown": go("dev-tv"); await runCmd("volDown"); return;
        case "mute":    go("dev-tv"); await runCmd("mute"); return;

        case "app":
          if (r.device === "proj"){ go("dev-proj"); await post("/proj/app", { app: r.app }); }
          else { go("dev-tv"); await runCmd(r.app); }
          toast("يُفتح " + r.app);
          return;

        case "acPower": {
          const room = r.room || "hall";
          go("dev-ac-" + room);
          await post("/ac/" + room + "/set", { power: r.value === "on" });
          toast((r.value === "on" ? "شُغّل" : "أُطفئ") + " المكيف");
          return;
        }
        case "acTemp": {
          const room = r.room || "hall";
          go("dev-ac-" + room);
          await post("/ac/" + room + "/set", { temp: r.value });
          toast("المكيف على " + r.value + "°");
          return;
        }
        case "acMode": {
          const room = r.room || "hall";
          go("dev-ac-" + room);
          await post("/ac/" + room + "/set", { mode: r.value });
          return;
        }

        case "routerReboot":
          go("dev-router");
          toast("اضغط «إعادة تشغيل الراوتر» للتأكيد");
          return;
        case "wifi":
          go("dev-router");
          toast("افتح الشبكة التي تريدها من هنا");
          return;

        case "islam":
          go("dev-islam");
          setTimeout(() => go("islam-" + r.value), 250);
          return;

        case "open": go("dev-" + (r.device === "ac" ? "ac-hall" : r.device)); return;
        case "home": go(HOME); return;
        case "back": { const b = $("backBtn"); if (b) b.click(); return; }
      }
    } catch (e) { toast("تعذّر التنفيذ: " + e.message, true); }
  }
})();

function post(path, body){
  const opt = { method: "POST", cache: "no-store" };
  if (body !== undefined){
    opt.headers = { "Content-Type": "application/json" };
    opt.body = JSON.stringify(body);
  }
  return fetch(path, opt).then(r => r.json());
}

(function setupUpdate(){
  if (MUSHAF_APP) return;   // تطبيق المصحف: لا أجهزة فيه
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
  //
  // والمهلة ستٌّ لا ثلاث: اللابتوب بطيء، والتنصيب تنزيلٌ ونسخٌ
  // و`npm install`. وثلاثُ دقائق كانت تُعلن الفشل والمنصّب ما زال
  // يعمل — فيُخيَّل إلى صاحب البيت أنه سقط وهو ماضٍ. وهي ستٌّ في
  // الخادم أيضاً (UPDATE_LATCH_MS) فيتّفقان.
  function waitForServer(){
    const started = Date.now();
    let sawDown = false;
    const tick = () => {
      if (Date.now() - started > 360000){
        mark(1, "fail");
        toast("طال الانتظار — افتح «سجلّ آخر تحديث» لترى أين وقف", true);
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


/* ============================================================
   المكيفات — Tuya محلياً
   الخادم يمسك المفاتيح ويتكلّم مع المكيف؛ الصفحة تطلب وتعرض.
   والحالة تُقرأ من الجهاز بعد كل أمر لا تُفترض — فالمكيف قد يرفض
   ما لا يقبله وضعه الحالي، ولا يصحّ أن نُظهر ما لم يقع.
   ============================================================ */
const AC_MODE_NAMES = { cold:"تبريد", hot:"تدفئة", wind:"مروحة", wet:"تجفيف", auto:"تلقائي" };

(function setupAC(){
  if (MUSHAF_APP) return;   // تطبيق المصحف: لا أجهزة فيه
  const rooms = ["hall", "bed"];
  const el = (room, sel) => document.querySelector('[data-room="' + room + '"]' + sel) ||
                            document.querySelector('.ac-remote[data-room="' + room + '"] ' + sel);
  const part = (room, cls) => document.querySelector(cls + '[data-room="' + room + '"]');
  const within = (room, sel) => part(room, ".ac-remote").querySelector(sel);

  const say = (room, text, bad) => {
    part(room, ".ac-remote").querySelectorAll(".ac-msg").forEach(n => {
      n.textContent = text || ""; n.classList.toggle("bad", !!bad);
    });
  };

  function paint(room, st){
    const box = part(room, ".ac-remote");
    box.hidden = false;
    part(room, ".ac-setup").hidden = true;
    part(room, ".ac-choose").hidden = true;

    box.classList.toggle("off", st.on === false);
    within(room, ".ac-temp").textContent = st.setTemp != null ? st.setTemp : "--";
    within(room, ".ac-room").textContent = st.blind
      ? "بالأشعة — لا يُخبر بحالته"
      : (st.curTemp != null ? "حرارة الغرفة " + st.curTemp + "°" : "—");

    box.querySelectorAll(".ac-mode").forEach(b =>
      b.classList.toggle("on", st.mode === b.dataset.v));
    box.querySelectorAll(".ac-fan").forEach(b =>
      b.classList.toggle("on", st.fan === b.dataset.v));
    within(room, ".ac-swing").classList.toggle("on", !!st.swing);
    within(room, ".ac-power").classList.toggle("on", st.on === true);

    const pip = document.getElementById(room === "hall" ? "pipAcHall" : "pipAcBed");
    if (pip) pip.className = "pip live";
    const tile = document.querySelector('[data-go="dev-ac-' + room + '"]');
    if (tile) tile.classList.remove("soon");
    screenSub("dev-ac-" + room,
      st.blind ? "بالأشعة" :
      st.on === false ? "مطفأ" :
      (AC_MODE_NAMES[st.mode] || "متصل") + (st.curTemp != null ? " · الغرفة " + st.curTemp + "°" : ""));
  }

  const state = {};        // آخر حالة معروفة لكل غرفة

  function refresh(room){
    return fetch("/ac/" + room + "/state", { cache:"no-store" })
      .then(r => r.json())
      .then(st => {
        if (!st.ok) throw new Error(st.why || "");
        state[room] = st;
        paint(room, st);
        say(room, "");
        return st;
      });
  }

  function send(room, changes){
    say(room, "جاري…");
    return post("/ac/" + room + "/set", changes)
      .then(st => {
        if (!st.ok) return say(room, st.why || "ما استجاب المكيف", true);
        state[room] = Object.assign({}, state[room], st);
        paint(room, state[room]);
        say(room, "");
      })
      .catch(() => say(room, "تعذّر الوصول للخادم", true));
  }

  function showChoose(room, devices){
    const box = part(room, ".ac-choose");
    part(room, ".ac-setup").hidden = true;
    part(room, ".ac-remote").hidden = true;
    box.hidden = false;
    const list = box.querySelector(".ac-list");
    list.innerHTML = "";
    devices.forEach(d => {
      const btn = document.createElement("button");
      btn.className = "key sm";
      btn.style.height = "auto";
      btn.style.padding = "12px";
      btn.style.flexDirection = "column";
      btn.innerHTML = "<b>" + d.name + "</b>";
      const note = document.createElement("small");
      note.style.color = "var(--muted)";
      note.style.fontSize = "11px";
      note.textContent = d.infrared ? "باعث أشعة — بلا قراءة حالة"
                       : d.category === "kt" ? "مكيف بواي فاي"
                       : "نوعه: " + (d.category || "غير معروف");
      btn.appendChild(note);
      btn.onclick = () => {
        buzz();
        post("/ac/assign", { room, id: d.id })
          .then(() => refresh(room))
          .catch(() => toast("تعذّر الحفظ", true));
      };
      list.appendChild(btn);
    });
  }

  function linkForm(room, devices){
    const box = part(room, ".ac-setup");
    part(room, ".ac-remote").hidden = true;
    part(room, ".ac-choose").hidden = true;
    box.hidden = false;
    const msg = box.querySelector(".ac-msg");
    box.querySelector(".ac-link").onclick = () => {
      const id = box.querySelector(".ac-id").value.trim();
      const sec = box.querySelector(".ac-secret").value.trim();
      const reg = box.querySelector(".ac-region").value;
      if (!id || !sec) { msg.textContent = "املأ الحقلين"; msg.classList.add("bad"); return; }
      const b = box.querySelector(".ac-link");
      b.disabled = true; b.textContent = "جاري الربط…";
      msg.classList.remove("bad");
      msg.textContent = "أسأل Tuya عن أجهزتك…";
      post("/ac/link", { accessId: id, accessSecret: sec, region: reg })
        .then(r => {
          if (!r.ok){ msg.textContent = r.why || "فشل الربط"; msg.classList.add("bad"); return; }
          box.querySelector(".ac-secret").value = "";
          toast("وجدت " + r.devices.length + " جهازاً");
          rooms.forEach(rm => check(rm));
        })
        .catch(() => { msg.textContent = "تعذّر الوصول للخادم"; msg.classList.add("bad"); })
        .finally(() => { b.disabled = false; b.textContent = "اربط الحساب"; });
    };
  }

  function check(room){
    if (!onServer){
      const box = part(room, ".ac-setup");
      box.hidden = false;
      box.querySelector(".ac-msg").textContent = "افتح الريموت من عنوان اللابتوب أولاً";
      return;
    }
    fetch("/ac/devices", { cache:"no-store" }).then(r => r.json()).then(d => {
      if (!d.linked) return linkForm(room, []);
      if (!d.rooms || !d.rooms[room]) return showChoose(room, d.devices);
      refresh(room).catch(e => {
        part(room, ".ac-remote").hidden = false;
        say(room, e.message || "ما وصلت للمكيف — تأكّد أنه موصول بالواي فاي", true);
      });
    }).catch(() => {});
  }

  rooms.forEach(room => {
    const box = part(room, ".ac-remote");
    if (!box) return;
    const step = (d) => {
      const cur = (state[room] && state[room].setTemp) || 24;
      const next = Math.min(30, Math.max(16, cur + d));
      if (next === cur) return;
      buzz(12);
      within(room, ".ac-temp").textContent = next;   // استجابة فورية، ثم تصحّحها القراءة
      send(room, { setTemp: next });
    };
    within(room, ".ac-plus").onclick  = () => step(1);
    within(room, ".ac-minus").onclick = () => step(-1);
    box.querySelectorAll(".ac-mode").forEach(b =>
      b.onclick = () => { buzz(12); send(room, { mode: b.dataset.v }); });
    box.querySelectorAll(".ac-fan").forEach(b =>
      b.onclick = () => { buzz(12); send(room, { fan: b.dataset.v }); });
    within(room, ".ac-swing").onclick = () =>
      { buzz(12); send(room, { swing: !(state[room] && state[room].swing) }); };
    within(room, ".ac-power").onclick = () =>
      { buzz(20); send(room, { on: !(state[room] && state[room].on) }); };
  });

  window.__acCheck = check;
})();


/* ============================================================
   أجهزة البيت — جردُ ما في الشبكة
   لا أستطيع الوصول إلى شبكة البيت من حيث أعمل، وحسنٌ ألّا أستطيع.
   لكن الخادم داخلها، فيمسحها هو ويعرض ما وجد — والنتيجة لا تبرحه.
   ============================================================ */
/* ============================================================
   الراوتر — الشبكة ومن عليها
   الحَرَس الحقيقي في الخادم لا هنا: الواجهة تُخفي الزرّ، والخادم
   يمنع الفعل. فما تراه هنا تسهيلٌ لا حمايةٌ يُعتمد عليها.
   ============================================================ */
(function setupRouter(){
  if (MUSHAF_APP) return;   // تطبيق المصحف: لا أجهزة فيه
  const msg = $("rtMsg");
  if (!msg) return;
  const cards = ["rtState", "rtWifiCard", "rtHostsCard", "rtTools"];
  const note = (t) => { msg.hidden = !t; msg.textContent = t || ""; };
  const showCards = (on) => cards.forEach(id => { const e = $(id); if (e) e.hidden = !on; });

  // البايتات تُقرأ بالعين لا بالعدّ
  const size = (n) => {
    const u = ["بايت", "كيلو", "ميغا", "غيغا", "تيرا"];
    let i = 0, v = Number(n) || 0;
    while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
    return (i ? v.toFixed(1) : v) + " " + u[i];
  };
  // العربية تُجمع بالعدد لا بالإضافة إليه: يومان، وثلاثة أيام، وأحدَ عشرَ يوماً
  const days = (d) => d === 1 ? "يوم واحد" : d === 2 ? "يومان"
                    : d <= 10 ? d + " أيام" : d + " يوماً";
  const dur = (s) => {
    s = Number(s) || 0;
    const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600);
    return d ? days(d) + " و" + h + " ساعة" : h + " ساعة";
  };

  function paint(r){
    $("rtLink").hidden = true;
    showCards(true);
    const set = (id, v) => { const e = $(id); if (e) e.textContent = v; };
    set("rtModel", (r.info && r.info.model) || "—");
    set("rtNet", (r.status && r.status.network) || "—");
    const b = (r.status && r.status.bars) || 0;
    const bars = $("rtBars");
    if (bars){
      // الأشرطة ثم القياس بالسالب: يُقلبان في سياق عربيّ، فيُثبَّت اتجاههما
      bars.style.direction = "ltr";
      bars.style.textAlign = "right";
      bars.textContent = "▮".repeat(b) + "▯".repeat(Math.max(0, 5 - b)) +
        (r.signal && r.signal.rsrp !== null ? "   " + r.signal.rsrp + " dBm" : "");
    }
    set("rtDown", size(r.traffic && r.traffic.down));
    set("rtUp", size(r.traffic && r.traffic.up));
    set("rtUptime", dur(r.traffic && r.traffic.uptime));

    const wrap = $("rtWifi");
    wrap.innerHTML = "";
    (r.wifi || []).forEach(s => {
      const row = document.createElement("div");
      row.className = "dev-top";
      const name = document.createElement("b");
      name.textContent = (s.name || "شبكة") + (s.guest ? " · للضيوف" : "");
      const btn = document.createElement("button");
      btn.className = "go";
      btn.textContent = s.on ? "مُشغّلة" : "مُطفأة";
      btn.style.background = s.on ? "var(--accent-dim)" : "var(--surface-3)";
      btn.onclick = () => {
        buzz();
        post("/router/wifi", { index: s.index, on: !s.on })
          .then(x => { note(x.ok ? "" : x.why); load(); });
      };
      row.append(name, btn);
      wrap.appendChild(row);
    });
  }

  function paintHosts(list){
    const wrap = $("rtHosts");
    wrap.innerHTML = "";
    list.forEach(h => {
      const card = document.createElement("div");
      card.className = "dev";
      const top = document.createElement("div");
      top.className = "dev-top";
      const name = document.createElement("b");
      name.textContent = h.name || h.mac;
      top.appendChild(name);

      // ما لا يُحجب لا يُعرض له زرّ أصلاً — لا زرٌّ يُضغط فيُردّ
      if (h.blockable){
        const btn = document.createElement("button");
        btn.className = "go";
        btn.textContent = "احجبه";
        btn.onclick = () => {
          buzz();
          post("/router/block", { macs: [h.mac] })
            .then(x => note(x.ok ? "حُجب " + (h.name || h.mac) : x.why));
        };
        top.appendChild(btn);
      } else {
        const flag = document.createElement("span");
        flag.className = "flag";
        flag.textContent = h.server ? "اللابتوب — لا يُحجب" : "جهازك — لا يُحجب";
        top.appendChild(flag);
      }
      const meta = document.createElement("div");
      meta.className = "meta";
      meta.textContent = [h.ip, h.mac].filter(Boolean).join("  ·  ");
      card.append(top, meta);
      wrap.appendChild(card);
    });
  }

  function load(){
    if (!onServer) return note("الراوتر يحتاج الخادم — افتح الريموت من عنوان اللابتوب");
    fetch("/router/state", { cache:"no-store" }).then(r => r.json())
      .then(r => {
        if (!r.ok && r.linked === false){
          $("rtLink").hidden = false; showCards(false);
          return note("");
        }
        if (!r.ok) return note(r.why || "تعذّر الوصول للراوتر");
        note("");
        paint(r);
        screenSub("dev-router", (r.info && r.info.model) || "متصل");
        return fetch("/router/hosts", { cache:"no-store" }).then(x => x.json())
          .then(x => { if (x.ok) paintHosts(x.hosts); });
      })
      .catch(() => note("تعذّر الوصول للخادم"));
  }

  const lm = (t) => { const e = $("rtLinkMsg"); if (e) e.textContent = t; };

  $("rtSave").onclick = () => {
    const pass = $("rtPass").value;
    if (!pass) return lm("اكتب كلمة الدخول");
    lm("أحاول الدخول…");
    post("/router/link", {
      host: $("rtHost").value.trim(),
      username: $("rtUser").value.trim() || "admin",
      password: pass,
    }).then(r => {
      $("rtPass").value = "";          // لا تبقى في الصفحة بعد إرسالها
      if (!r.ok) return lm(r.why || "لم يُقبل الدخول");
      lm("تمّ");
      load();
    }).catch(() => lm("تعذّر الوصول للخادم"));
  };

  $("rtFind").onclick = () => {
    lm("أبحث…");
    post("/router/find").then(r => {
      if (!r.ok) return lm(r.why || "ما وجدته");
      $("rtHost").value = r.host;
      lm("وجدته على " + r.host);
    }).catch(() => lm("تعذّر الوصول للخادم"));
  };

  $("rtReboot").onclick = () => {
    // القاعدة الرابعة: ما لا رجعة عنه يُقال قبله لا بعده
    if (!confirm("إعادة تشغيل الراوتر تقطع الإنترنت عن البيت نحو دقيقتين، "
               + "وتقطع وصولك من خارج البيت حتى يعود.\n\nأتُكمل؟")) return;
    buzz();
    note("أُرسلت — يعود بعد دقيقتين تقريباً");
    post("/router/reboot").then(r => { if (!r.ok) note(r.why); });
  };

  window.__router = load;
})();

(function setupSurvey(){
  if (MUSHAF_APP) return;   // تطبيق المصحف: لا أجهزة فيه
  const list = $("svList"), msg = $("svMsg");
  if (!list) return;

  const VERDICT = {
    supported: ["مدعوم", "sup"],
    known:     ["نعرفه — يحتاج ربطاً", "kn"],
    unknown:   ["غير معروف", ""],
  };

  function note(text){ msg.hidden = !text; msg.textContent = text || ""; }

  function render(r){
    list.innerHTML = "";
    if (!r.devices || !r.devices.length){
      return note("ما ظهر جهاز — تأكّد أن اللابتوب على شبكة البيت");
    }
    msg.hidden = true;
    r.devices.forEach(d => {
      const card = document.createElement("div");
      card.className = "dev" + (d.verdict === "supported" ? " sup" : "");

      const top = document.createElement("div");
      top.className = "dev-top";
      const name = document.createElement("b");
      name.textContent = d.name || d.vendor || d.label || d.ip;
      const [flagText, flagCls] = VERDICT[d.verdict] || VERDICT.unknown;
      const flag = document.createElement("span");
      flag.className = "flag " + flagCls;
      flag.textContent = flagText;
      top.append(name, flag);

      const tag = document.createElement("div");
      tag.className = "tagline";
      const bits = [];
      if (d.label) bits.push(d.label);
      if (d.model) bits.push(d.model);
      if (d.vendor && d.vendor !== d.name) bits.push(d.vendor);
      tag.textContent = bits.join(" · ") || "لم يُعلن عن نفسه";

      const meta = document.createElement("div");
      meta.className = "meta";
      meta.textContent = [d.ip, d.mac, d.ports.join(" ")].filter(Boolean).join("  ·  ");

      card.append(top, tag, meta);

      if (d.page){
        const go = document.createElement("button");
        go.className = "go";
        go.textContent = "افتح صفحته";
        go.style.justifySelf = "start";
        go.onclick = () => { buzz(); show(d.page); };   // show العامة: تنقّل بين الشاشات
        card.appendChild(go);
      } else if (d.kind === "tuya"){
        const hint = document.createElement("div");
        hint.className = "tagline";
        hint.style.color = "var(--warn)";
        hint.textContent = "جهاز Tuya — يُضاف من صفحة المكيف بعد ربط الحساب";
        card.appendChild(hint);
      }
      list.appendChild(card);
    });
    if (r.cached) note("");
  }

  function run(fresh){
    if (!onServer) return note("المسح يحتاج الخادم — افتح الريموت من عنوان اللابتوب");
    const b = fresh ? $("svFresh") : $("svScan");
    const label = b.textContent;
    b.disabled = true; b.textContent = "جاري المسح…";
    note("أمسح الشبكة وأسأل الأجهزة عن أسمائها — نحو نصف دقيقة…");
    fetch("/survey" + (fresh ? "?fresh=1" : ""), { cache:"no-store" })
      .then(r => r.json())
      .then(r => {
        if (r.running) return note("مسحٌ جارٍ بالفعل — أعد المحاولة بعد قليل");
        if (!r.ok) return note(r.why || "تعذّر المسح");
        render(r);
        screenSub("dev-survey", r.devices.length + " جهازاً" +
          (r.seconds ? " · " + r.seconds + "ث" : "") + (r.cached ? " · محفوظ" : ""));
      })
      .catch(() => note("تعذّر الوصول للخادم"))
      .finally(() => { b.disabled = false; b.textContent = label; });
  }

  $("svScan").onclick = () => run(false);
  $("svFresh").onclick = () => run(true);

  /* ---------- الإنصات لأجهزة Tuya ----------
     لا نمسح ولا نطرق الأبواب: نُنصت لما تعلنه الأجهزة عن نفسها.
     فمن أعلن فهو Tuya يقيناً، ومن سكت لم يُدَّعَ عليه شيء. */
  const tuBtn = $("tuScan");
  if (tuBtn) tuBtn.onclick = async () => {
    if (!onServer) return void ($("tuMsg").textContent = "يحتاج الخادم");
    const msg = $("tuMsg"), box = $("tuList");
    tuBtn.disabled = true; tuBtn.textContent = "أُنصِت… خمس عشرة ثانية";
    msg.textContent = ""; box.innerHTML = "";
    try {
      const r = await fetch("/tuya/sniff?s=15", { cache:"no-store" }).then(x => x.json());
      if (r.running){ msg.textContent = "إنصاتٌ جارٍ — انتظر"; return; }
      if (!r.ok){ msg.textContent = r.why || "تعذّر"; return; }
      if (!r.devices.length){
        msg.textContent = "لم يُعلن أحد. إن كان المكيّف أو الغسّالة موصولاً " +
          "بالواي‑فاي فجرّب مرّةً أخرى — بعضها يبثّ كل نصف دقيقة. " +
          "وإن تكرّر السكوت فليست من Tuya، وسأبحث عن طريقٍ آخر.";
        return;
      }
      msg.textContent = "أعلن " + r.devices.length + " جهازاً:";
      for (const d of r.devices){
        const row = document.createElement("div");
        row.className = "zekr";
        row.style.cssText = "padding:10px 12px";
        const t = document.createElement("div");
        t.style.cssText = "font-size:13px;font-weight:600";
        t.textContent = (d.name || "جهاز Tuya") + (d.known ? " · مربوطٌ عندنا" : "");
        const s = document.createElement("div");
        s.style.cssText = "font-size:11.5px;color:var(--muted);direction:ltr;text-align:right";
        s.textContent = d.ip + "  ·  " + d.id + "  ·  v" + (d.version || "?");
        row.append(t, s);
        box.appendChild(row);
      }
    } catch (e) { msg.textContent = "تعذّر الوصول للخادم"; }
    finally { tuBtn.disabled = false; tuBtn.textContent = "أنصِت الآن"; }
  };
  window.__survey = () => { if (!list.children.length) run(false); };
})();

function paintInfo(){
  const set = (id, v) => { const el = $(id); if (el) el.textContent = v; };
  const home = document.getElementById(HOME);
  if (home){
    home.dataset.sub = onServer ? "الخادم يعمل · " + location.hostname : "اختر جهازاً";
    if (home && currentScreen === HOME) $("modelName").textContent = home.dataset.sub;
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
    .then(h => {
      set("infoTv", h.tv || tv.ip || "—");
      // البطاقتان معاً: عليهما يقوم الإيقاظ، وعرضُ واحدةٍ يُخفي نصف الحقيقة
      set("infoMac", (h.macs && h.macs.length ? h.macs.join(" · ")
                                              : h.mac) || "غير معروف بعد");
      // العنوان الذي يصل من أي مكان — يُعرض كما هو ولا يُدّعى إن غاب
      const away = $("infoAway");
      if (away){
        away.textContent = h.away
          ? "http://" + h.away + ":" + (location.port || 8099)
          : "غير مفعّل";
        away.style.color = h.away ? "var(--ok)" : "var(--muted)";
        away.style.direction = "ltr";
        away.style.textAlign = "right";
        // نسخُ عنوانٍ من شاشة جوال متعب، فالضغط عليه ينسخه
        away.onclick = h.away ? () => copyText(away.textContent, "نُسخ العنوان") : null;
      }
      watchBuild(h);
    })
    .catch(() => set("infoMac", "—"));
}
// التحديث التلقائي يبدّل الصفحة على الخادم بلا علم أحد، وتطبيق الشاشة
// الرئيسية في آيفون يحتفظ بنسختها القديمة. فنقارن ختم البناء ونعيد
// التحميل مرة واحدة — بحارسٍ في تخزين الجلسة كيلا ندور في حلقة.
function watchBuild(h){
  if (!h || !h.build || !window.__BUILD__) return;
  if (h.build === window.__BUILD__) { sessionStorage.removeItem("reloaded_for"); return; }
  if (sessionStorage.getItem("reloaded_for") === h.build) return;
  sessionStorage.setItem("reloaded_for", h.build);
  diag("الخادم صار على نسخة أحدث — إعادة تحميل الصفحة");
  toast("وصل تحديث — تُعاد الصفحة");
  setTimeout(() => location.reload(), 900);
}

setInterval(() => { if (!document.hidden) paintInfo(); }, 5000);
paintInfo();
if (window.__checkVersion) window.__checkVersion();

if (onServer){
  diag("وضع الخادم: الأوامر تمر عبر " + location.host + " بأذونات كاملة");
  // النسخةُ في أوّل السجلّ.
  //
  // **ولماذا؟** أضعنا ثلاثة أيام نطارد أعراضاً، والعلّة أنّ الخادم
  // كان يعمل بنسخةٍ قديمة ولا أحد يعرف. وكلُّ سجلٍّ أُرسل كان صامتاً
  // عن أهمّ ما فيه. فلا يُرسَل سجلٌّ بعد اليوم إلا وفيه ما يعمل.
  fetch("/version", { cache:"no-store" }).then(r => r.json()).then(v => {
    diag("النسخة: " + (v.installed ? v.installed.slice(0, 7) : "غير معروفة") +
         (v.branch && v.branch !== "main" ? " · فرع " + v.branch : "") +
         (v.installedAt ? " · ثُبّتت " + new Date(v.installedAt)
            .toLocaleString("ar", { day:"numeric", month:"long", hour:"2-digit", minute:"2-digit" }) : "") +
         (v.updateAvailable ? "  ← يوجد أحدث" : ""));
    if (v.last && !v.last.ok) diag("آخر تحديث تعثّر: " + v.last.why);
  }).catch(() => diag("النسخة: تعذّر سؤال الخادم"));
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

// حُقن التطبيق من صفحة التلفزيون نفسها؟ فعنوانُه هو عنوان الصفحة، ولا يُسأل
// صاحبُ البيت عنه. ولو تغيّر العنوان بعد إعادة تشغيل الراوتر فمفتاح الإقران
// القديم يصلح له كما هو — المفتاح للتلفزيون لا للعنوان.
const hostIp = (!onServer && /^\d{1,3}(\.\d{1,3}){3}$/.test(location.hostname)) ? location.hostname : "";
let savedIp = store.get("webos_ip");
if (hostIp){
  const oldKey = savedIp && savedIp !== hostIp ? store.get("webos_key_" + savedIp) : null;
  if (oldKey && !store.get("webos_key_" + hostIp)) store.set("webos_key_" + hostIp, oldKey);
  savedIp = hostIp;
  store.set("webos_ip", hostIp);
  diag("الصفحة من التلفزيون نفسه: " + hostIp);
}
if (savedIp){
  $("ipInput").value = savedIp;
  if (store.get("webos_key_" + savedIp) || hostIp) tv.connect(savedIp);
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
    } else if (typeof window.__TV_PROXY__ === "undefined") {
      // الاختصار ضُغط من تبويبٍ فارغ أو من صفحةٍ أخرى: التطبيق يُرسَم هنا
      // لكنه لا يستطيع الوصول إلى التلفزيون أبداً (أصلٌ غريب، والتخزين
      // محظور على about:blank). سطرٌ في السجلّ لا يكفي — تُغطّى الشاشة
      // بإرشادٍ وزرٍّ يفتح صفحة التلفزيون، ومنها يُضغط الاختصار ثانيةً.
      var ip = null;
      try { ip = localStorage.getItem("webos_ip"); } catch (e) {}
      if (!/^d{1,3}(.d{1,3}){3}$/.test(ip || "")) ip = "192.168.8.77";
      diag("تحذير: هذي الصفحة مو صفحة التلفزيون (" + (host || "تبويب فارغ") + ")");
      diag("افتح http://" + ip + ":3000 ثم شغّل الاختصار من هناك");
      var ov = doc.createElement("div");
      ov.id = "wrongPage";
      ov.setAttribute("dir", "rtl");
      ov.style.cssText = "position:fixed;inset:0;z-index:99999;background:var(--bg,#12161b);" +
        "color:var(--text,#e7ecf1);display:flex;flex-direction:column;justify-content:center;" +
        "align-items:center;gap:18px;padding:32px 24px;text-align:center;font:17px/1.7 system-ui,sans-serif";
      var h = doc.createElement("div");
      h.style.cssText = "font-size:22px;font-weight:700";
      h.textContent = "الاختصار ضُغط من الصفحة الغلط";
      var pTxt = doc.createElement("div");
      pTxt.style.cssText = "color:var(--muted,#8f9bab);max-width:420px";
      pTxt.textContent = "الريموت لا يقدر يكلّم التلفزيون إلا من صفحة التلفزيون نفسها. " +
        "اضغط الزر، وبعد ما تشوف «Hello world» اضغط الإشارة «ريموت» مرة ثانية من تلك الصفحة.";
      var a = doc.createElement("a");
      a.href = "http://" + ip + ":3000/";
      a.textContent = "افتح صفحة التلفزيون";
      a.style.cssText = "display:block;padding:16px 28px;border-radius:16px;background:var(--accent,#4db6a5);" +
        "color:#0d1512;font-weight:700;font-size:19px;text-decoration:none;min-width:240px";
      var small = doc.createElement("div");
      small.style.cssText = "font-size:13px;color:var(--muted,#8f9bab);direction:ltr";
      small.textContent = "http://" + ip + ":3000";
      ov.append(h, pTxt, a, small);
      doc.body.appendChild(ov);
    }
  })();

})();

// ==UserScript==
// @name         ريموت KMC
// @description  يفتح ريموت التلفزيون تلقائياً عند فتح صفحة التلفزيون في سفاري
// @version      1.0.1
// @match        https://192.168.8.77/*
// @match        https://192.168.8.77:3001/*
// @inject-into  content
// @run-at       document-end
// @noframes
// ==/UserScript==

// صفحة التلفزيون «Hello world» لا تحمل شيئاً، والاتصال به لا ينجح إلا
// منها. فنحقن فيها تطبيق الريموت كما تفعل الإشارة المرجعية، لكن تلقائياً.
// وشريطٌ أخضر يظهر فوراً: به يُعرف أن السكربت اشتغل، وما الذي تعثّر إن تعثّر.
(function () {
  if (window.top !== window) return;
  if (document.getElementById("kmc-remote-loader")) return;

  var bar = document.createElement("div");
  bar.id = "kmc-remote-bar";
  bar.setAttribute("dir", "rtl");
  bar.style.cssText = "position:fixed;top:0;left:0;right:0;z-index:99999;padding:14px;" +
    "background:#2c6f66;color:#fff;font:16px -apple-system,sans-serif;text-align:center";
  function say(t, bad){ bar.textContent = t; if (bad) bar.style.background = "#b3443f"; }
  say("ريموت KMC: جاري فتح الريموت…");
  document.documentElement.appendChild(bar);

  if (location.port !== "3001"){
    return say("ريموت KMC: افتح العنوان بالمنفذ 3001 — https://" + location.hostname + ":3001", true);
  }
  var s = document.createElement("script");
  s.id = "kmc-remote-loader";
  s.src = "https://voicetask-swart.vercel.app/tv-app.js?" + Date.now();
  s.onload = function () { bar.remove(); };
  s.onerror = function () { say("ريموت KMC: تعذّر تنزيل الريموت — تأكد من الإنترنت ثم حدّث الصفحة", true); };
  document.documentElement.appendChild(s);
})();

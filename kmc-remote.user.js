// ==UserScript==
// @name         ريموت KMC
// @description  يفتح ريموت التلفزيون تلقائياً عند فتح صفحة التلفزيون في سفاري
// @version      1.0.0
// @match        https://192.168.8.77/*
// @match        https://192.168.8.77:3001/*
// @run-at       document-end
// @noframes
// ==/UserScript==

// صفحة التلفزيون «Hello world» لا تحمل شيئاً، والاتصال به لا ينجح إلا
// منها. فنحقن فيها تطبيق الريموت كما تفعل الإشارة المرجعية، لكن تلقائياً.
(function () {
  if (window.top !== window || location.port !== "3001") return;
  if (document.getElementById("kmc-remote-loader")) return;
  var s = document.createElement("script");
  s.id = "kmc-remote-loader";
  s.src = "https://voicetask-swart.vercel.app/tv-app.js?" + Date.now();
  document.documentElement.appendChild(s);
})();

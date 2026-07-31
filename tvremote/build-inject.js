"use strict";
// ============================================================
// يولّد tv-app.js من tv.html — مصدر واحد للحقيقة، لا نسختين
//
// الناتج سكربت يحقن التطبيق داخل أي صفحة مفتوحة، ويُستخدم عبر
// bookmarklet من صفحة التلفزيون نفسها. الفائدة: يصير أصل الصفحة
// هو التلفزيون، فالاتصال بـ WebSocket يكون من نفس المصدر
// ولا تنطبق عليه قيود المحتوى المختلط ولا فحص الشهادات.
// ============================================================

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const SRC = path.join(ROOT, "tv.html");
const OUT = path.join(ROOT, "tv-app.js");

const html = fs.readFileSync(SRC, "utf8");

function section(re, name){
  const m = html.match(re);
  if (!m) throw new Error("ما لقيت " + name + " في tv.html");
  return m[1];
}

const css  = section(/<style>([\s\S]*?)<\/style>/, "الأنماط");
const body = section(/<body>([\s\S]*?)<script>/, "محتوى الصفحة");
const js   = section(/<script>\s*"use strict";([\s\S]*?)<\/script>/, "منطق التطبيق");

const out = `/* ============================================================
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
  reset.textContent = ${JSON.stringify(css)};
  head.appendChild(reset);

  doc.body.innerHTML = ${JSON.stringify(body)};

  // ---------- منطق التطبيق ----------
${js}

  // ---------- إضافات خاصة بوضع الحقن ----------
  // الصفحة مفتوحة على التلفزيون نفسه، فعنوانه معروف: هو المضيف الحالي
  (function(){
    var host = location.hostname;
    if (/^\\d{1,3}(\\.\\d{1,3}){3}$/.test(host)){
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
`;

fs.writeFileSync(OUT, out);
console.log("تم توليد tv-app.js — " + out);
console.log("الحجم: " + out.length + " حرف");

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
    } else if (typeof window.__TV_PROXY__ === "undefined") {
      // الاختصار ضُغط من تبويبٍ فارغ أو من صفحةٍ أخرى: التطبيق يُرسَم هنا
      // لكنه لا يستطيع الوصول إلى التلفزيون أبداً (أصلٌ غريب، والتخزين
      // محظور على about:blank). سطرٌ في السجلّ لا يكفي — تُغطّى الشاشة
      // بإرشادٍ وزرٍّ يفتح صفحة التلفزيون، ومنها يُضغط الاختصار ثانيةً.
      var ip = null;
      try { ip = localStorage.getItem("webos_ip"); } catch (e) {}
      if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(ip || "")) ip = "192.168.8.77";
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
`;

fs.writeFileSync(OUT, out);
console.log("تم توليد tv-app.js — " + out);
console.log("الحجم: " + out.length + " حرف");

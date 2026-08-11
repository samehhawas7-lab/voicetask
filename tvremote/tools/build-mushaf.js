"use strict";
/* بناءُ تطبيق المصحف المستقلّ — صفحةٌ تُستضاف عامّةً بلا خادمٍ ولا نفق.

   يقرأ tv.html نفسَه (محرّكٌ واحد لا نسختان)، فينزع شاشات الأجهزة
   بوحدة mushaf-shell نفسِها التي ينزع بها الخادم، ويحقن وحدة falak
   نفسَها التي يحسب بها الخادم، ويحوّل مساراتِ النصوص إلى ملفّاتٍ
   بجانب الصفحة.

   **ولا يُبنى نصٌّ لم يُقَس** (القاعدة السادسة عشرة): المصحفُ يُعدّ
   آيةً آية ويُطابَق جدولَ آيات السور كاملاً، والتفسيران، والصفحاتُ
   ببدايات أجزائها الثلاثين — فإن اختلّ رقمٌ واحد رُفض البناءُ كلُّه. */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = path.join(__dirname, "..", "..");
const WEBOS = path.join(ROOT, "tvremote", "webos");
const islam = require(path.join(WEBOS, "islam.js"));
const { mushafShell } = require(path.join(WEBOS, "mushaf-shell.js"));

const dataDir = process.argv[2];
const outDir = process.argv[3];
if (!dataDir || !outDir) {
  console.error("الاستعمال: node build-mushaf.js <مجلّد البيانات> <مجلّد الناتج>");
  process.exit(2);
}

const read = (p) => fs.readFileSync(p);
const readJ = (f) => JSON.parse(read(path.join(dataDir, f)));

// ---------- القياس قبل البناء ----------
const checks = [];
function check(name, fn) {
  try { fn(); checks.push("  ✓ " + name); }
  catch (e) { checks.push("  ✗ " + name + " — " + e.message); checks.failed = true; }
}
check("المصحف: ٦٢٣٦ آية و١١٤ سورة وجدولُ الآيات كاملاً", () => {
  islam.verifyQuran(readJ("quran.json"));
});
check("التفسير الميسَّر: ٦٢٣٦ مدخلاً", () => islam.verifyTafsir(readJ("tafsir-muyassar.json")));
check("تفسير الجلالين: ٦٢٣٦ مدخلاً", () => islam.verifyTafsir(readJ("tafsir-jalalayn.json")));
check("الصفحات: ٦٠٤ تغطّي الآياتِ متّصلةً وأجزاؤها في مواضعها", () => {
  const pages = readJ("pages.json");
  if (pages.length !== islam.TOTAL_PAGES) throw new Error("عددها " + pages.length);
  // كلُّ صفحةٍ تبدأ حيث انتهت أختُها — بلا ثغرةٍ ولا تكرار
  const q = readJ("quran.json").quran;
  const at = new Map();
  q.forEach((a, i) => at.set(a.chapter * 1000 + a.verse, i));
  if (at.get(pages[0][0] * 1000 + pages[0][1]) !== 0) throw new Error("لا تبدأ بالفاتحة");
  for (let k = 1; k < pages.length; k++) {
    const prevEnd = at.get(pages[k-1][2] * 1000 + pages[k-1][3]);
    const start = at.get(pages[k][0] * 1000 + pages[k][1]);
    if (start !== prevEnd + 1) throw new Error("انقطاعٌ قبل صفحة " + (k + 1));
  }
  if (at.get(pages[603][2] * 1000 + pages[603][3]) !== q.length - 1) throw new Error("لا تنتهي بالناس");
  // بداياتُ الأجزاء: الجزءُ قد يبدأ وسطَ صفحةٍ فتُوسَم صفحتُه التالية —
  // فأوّلُ صفحةٍ موسومةٍ به هي صفحتُه أو التي بعدها، لا غير
  for (let j = 2; j <= 30; j++) {
    const first = pages.findIndex((r) => r[4] === j) + 1;
    const want = islam.JUZ_PAGES[j - 1];
    if (first !== want && first !== want + 1)
      throw new Error("الجزء " + j + " موسومٌ أوّلاً على " + first + " والمعتمد " + want);
  }
});
check("فهرس السور: ١١٤", () => {
  const m = readJ("suras.json");
  if ((m.length || m.suras.length) !== 114) throw new Error("ليست ١١٤");
});
check("الأذكار: فيها متنٌ ومرجع", () => {
  const z = readJ("azkar.json");
  if (!Array.isArray(z) || z.length < 100) throw new Error("قليلة: " + z.length);
  if (!z.every((x) => x.text)) throw new Error("ذكرٌ بلا نصّ");
});
check("الخطّ العثمانيّ موجود", () => {
  if (read(path.join(dataDir, "uthmanic.woff2")).length < 30000) throw new Error("صغيرٌ مريب");
});
console.log("قياسُ النصوص قبل البناء:");
for (const c of checks) console.log(c);
if (checks.failed) { console.error("رُفض البناء — لا يُشحن نصٌّ لم يجتز."); process.exit(1); }

// ---------- التحويل ----------
let html = fs.readFileSync(path.join(ROOT, "tv.html"), "utf8");
html = mushafShell(html);
html = html.split("/islam/data/").join("data/");

const falakSrc = fs.readFileSync(path.join(WEBOS, "falak.js"), "utf8");
const reciters = islam.RECITERS.map((r) => ({
  key: r.key, name: r.name, note: r.note, teacher: !!r.teacher, urls: r.urls }));
const credits = Object.values(islam.SOURCES).map((s) => ({ label: s.label, credit: s.credit }));

const stamp = crypto.createHash("sha256").update(html).digest("hex").slice(0, 10);
const inject =
  '<script>window.__APP__="mushaf";window.__STANDALONE__=1;' +
  "window.__BUILD__=" + JSON.stringify(stamp) + ";" +
  "window.__RECITERS__=" + JSON.stringify(reciters) + ";" +
  "window.__CREDITS__=" + JSON.stringify(credits) + ";</script>\n" +
  '<link rel="manifest" href="manifest.webmanifest">\n' +
  "<script>\n" + falakSrc + "\n</script>\n" +
  '<script>if("serviceWorker" in navigator)addEventListener("load",' +
  'function(){navigator.serviceWorker.register("sw.js").catch(function(){});});</script>\n';
html = html.replace("<script>", () => inject + "<script>");

// أيقونة التطبيق من وسم الصفحة نفسه
const icon = /apple-touch-icon" href="data:image\/png;base64,([A-Za-z0-9+/=]+)"/.exec(html);
if (!icon) { console.error("لا أيقونة في الصفحة"); process.exit(1); }

// ---------- الكتابة ----------
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(path.join(outDir, "data"), { recursive: true });
fs.writeFileSync(path.join(outDir, "index.html"), html);
fs.writeFileSync(path.join(outDir, "icon.png"), Buffer.from(icon[1], "base64"));
fs.writeFileSync(path.join(outDir, "manifest.webmanifest"), JSON.stringify({
  name: "المصحف", short_name: "المصحف",
  start_url: "./index.html", scope: "./", display: "standalone",
  dir: "rtl", lang: "ar",
  background_color: "#12161b", theme_color: "#12161b",
  icons: [{ src: "icon.png", sizes: "180x180", type: "image/png" }],
}));

const FILES = ["quran.json", "tafsir-muyassar.json", "tafsir-jalalayn.json",
               "suras.json", "pages.json", "azkar.json", "uthmanic.woff2"];
for (const f of FILES) fs.copyFileSync(path.join(dataDir, f), path.join(outDir, "data", f));

const PRECACHE = ["index.html", "manifest.webmanifest", "icon.png"]
  .concat(FILES.map((f) => "data/" + f));
let sw = fs.readFileSync(path.join(__dirname, "standalone-sw.js"), "utf8");
sw = sw.replace("__CACHE_NAME__", "mushaf-" + stamp)
       .replace("__PRECACHE__", JSON.stringify(PRECACHE));
fs.writeFileSync(path.join(outDir, "sw.js"), sw);
fs.writeFileSync(path.join(outDir, ".nojekyll"), "");

let total = 0;
for (const f of fs.readdirSync(path.join(outDir, "data"))) {
  total += fs.statSync(path.join(outDir, "data", f)).size;
}
console.log("\nبُني في " + outDir + " · الختم " + stamp +
            " · النصوص " + (total / 1048576).toFixed(1) + " م.ب");

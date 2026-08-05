"use strict";
// ============================================================
// القسم الإسلاميّ — المصحف والتفسير والأذكار والمواقيت والقبلة
//
// **قاعدةٌ تحكم هذا الملف كلّه:** لا يُكتب حرفٌ من القرآن ولا من
// الأذكار من ذاكرة أحد. كل نصٍّ يُجلب من مصدرٍ موثَّق، ويُتحقَّق منه
// آلياً قبل أن يُحفظ، ويُنسب إلى أهله حين يُعرض. وخطأٌ في حرفٍ من
// كتاب الله ليس كخطأٍ في زرّ تلفزيون.
//
// والبيانات خمسة ميغابايت، فلا تُوضع في المستودع لئلا تُثقل كل
// تحديث. تُنزَّل مرّة إلى data/ — وهو مُستثنى في .gitignore — ثم
// يعمل القسم بلا إنترنت أبداً.
// ============================================================

const fs = require("fs");
const path = require("path");
const https = require("https");

const DATA = path.join(__dirname, "..", "data");

/**
 * عدد آيات كل سورة في عدّ حفص — الجدول المعتمد الذي في كل مصحف.
 *
 * وهذا **مرجعُنا المستقلّ**: لا نَدَعُ الملفَّ المُنزَّل يشهد لنفسه،
 * بل نقيسه بهذا. مجموعه ٦٢٣٦، وهو ما نتحقّق منه أيضاً.
 */
const SURA_AYAHS = [
  7, 286, 200, 176, 120, 165, 206, 75, 129, 109, 123, 111, 43, 52, 99, 128,
  111, 110, 98, 135, 112, 78, 118, 64, 77, 227, 93, 88, 69, 60, 34, 30, 73,
  54, 45, 83, 182, 88, 75, 85, 54, 53, 89, 59, 37, 35, 38, 29, 18, 45, 60,
  49, 62, 55, 78, 96, 29, 22, 24, 13, 14, 11, 11, 18, 12, 12, 30, 52, 52,
  44, 28, 28, 20, 56, 40, 31, 50, 40, 46, 42, 29, 19, 36, 25, 22, 17, 19,
  26, 30, 20, 15, 21, 11, 8, 8, 19, 5, 8, 8, 11, 11, 8, 3, 9, 5, 4, 7, 3,
  6, 3, 5, 4, 5, 6,
];
const TOTAL_AYAHS = SURA_AYAHS.reduce((a, b) => a + b, 0);   // ٦٢٣٦

// صفحاتُ بدء الأجزاء الثلاثين في مصحف المدينة — جدولٌ مستقلٌّ نقيس به
// ما يُنزَّل، كما نقيس المصحف بجدول آيات السور. فإن طابقها الملفُّ في
// الثلاثين جميعاً فهو تخطيطُ مصحف المدينة لا غيره.
const JUZ_PAGES = [
  1, 22, 42, 62, 82, 102, 121, 142, 162, 182, 201, 222, 242, 262, 282,
  302, 322, 342, 362, 382, 402, 422, 442, 462, 482, 502, 522, 542, 562, 582,
];
const TOTAL_PAGES = 604;

const BASE = "https://raw.githubusercontent.com/fawazahmed0/quran-api/1";

const SOURCES = {
  quran: {
    url: BASE + "/editions/ara-quranuthmanihaf.json",
    file: "quran.json",
    label: "المصحف — رواية حفص، الرسم العثمانيّ",
    credit: "مجمّع الملك فهد لطباعة المصحف الشريف",
  },
  muyassar: {
    url: BASE + "/editions/ara-kingfahadquranc.json",
    file: "tafsir-muyassar.json",
    label: "التفسير الميسَّر",
    credit: "مجمّع الملك فهد لطباعة المصحف الشريف",
  },
  jalalayn: {
    url: BASE + "/editions/ara-jalaladdinalmah.json",
    file: "tafsir-jalalayn.json",
    label: "تفسير الجلالين",
    credit: "جلال الدين المحلّي وجلال الدين السيوطي",
  },
  meta: {
    url: BASE + "/info.json",
    file: "suras.json",
    label: "فهرس السور",
    credit: "quran-api",
  },
  pages: {
    url: BASE + "/info.json",
    file: "pages.json",
    label: "تخطيط صفحات مصحف المدينة",
    credit: "quran-api — وقِيس ببدايات الأجزاء الثلاثين",
  },
  azkar: {
    url: "https://raw.githubusercontent.com/osamayy/azkar-db/master/azkar.json",
    file: "azkar.json",
    label: "الأذكار",
    credit: "حصن المسلم — ولكل ذكرٍ مرجعه",
  },
  font: {
    url: "https://raw.githubusercontent.com/quran/quran.com-frontend-next/master/public/fonts/quran/hafs/uthmanic_hafs/UthmanicHafs1Ver18.woff2",
    file: "uthmanic.woff2",
    label: "خطّ المصحف العثمانيّ",
    credit: "مجمّع الملك فهد",
    binary: true,
  },
};

function get(url, binary) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { timeout: 90000 }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        return resolve(get(res.headers.location, binary));
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error("الخادم البعيد ردّ بـ " + res.statusCode));
      }
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => resolve(Buffer.concat(chunks)));
      res.on("error", reject);
    });
    req.on("timeout", () => { req.destroy(); reject(new Error("انتهت مهلة التنزيل")); });
    req.on("error", reject);
  });
}

/**
 * يقيس المصحف المُنزَّل بالجدول المعتمد. ولا يُقبل إلا مطابقاً تماماً:
 * سورةً سورةً وآيةً آية. فإن اختلّ رقمٌ رُدّ الملف كلّه — ولا يُعرض
 * نصٌّ مشكوكٌ فيه بحال.
 */
function verifyQuran(obj) {
  const q = obj && obj.quran;
  if (!Array.isArray(q)) throw new Error("الملف ليس على الصيغة المتوقَّعة");
  if (q.length !== TOTAL_AYAHS) {
    throw new Error("عدد الآيات " + q.length + " والمنتظر " + TOTAL_AYAHS);
  }
  const count = new Array(115).fill(0);
  for (const a of q) {
    const s = a.chapter, v = a.verse;
    if (!(s >= 1 && s <= 114)) throw new Error("رقم سورة خارج المدى: " + s);
    if (typeof a.text !== "string" || !a.text.trim()) {
      throw new Error("آية فارغة في السورة " + s + " رقم " + v);
    }
    count[s]++;
  }
  for (let s = 1; s <= 114; s++) {
    if (count[s] !== SURA_AYAHS[s - 1]) {
      throw new Error("السورة " + s + " فيها " + count[s] +
                      " آية والمعتمد " + SURA_AYAHS[s - 1]);
    }
  }
  return true;
}

/** التفسير يُقاس بعدد مداخله ولا يُقبل ناقصاً */
function verifyTafsir(obj) {
  const q = obj && obj.quran;
  if (!Array.isArray(q)) throw new Error("الملف ليس على الصيغة المتوقَّعة");
  if (q.length !== TOTAL_AYAHS) {
    throw new Error("عدد المداخل " + q.length + " والمنتظر " + TOTAL_AYAHS);
  }
  return true;
}

/** فهرس السور: اسمٌ ومكان نزول وعدد آيات — يُختصر من ملفٍ ضخم */
function shrinkMeta(obj) {
  const ch = obj && obj.chapters;
  if (!Array.isArray(ch) || ch.length !== 114) throw new Error("فهرس السور ناقص");
  return ch.map((c, i) => ({
    n: c.chapter,
    name: (c.arabicname || "").replace(/^سُوْرَةُ\s*/, "").trim() || c.name,
    en: c.englishname || "",
    ayahs: SURA_AYAHS[i],
    place: c.revelation === "Mecca" ? "مكية" : "مدنية",
    page: (c.verses && c.verses[0] && c.verses[0].page) || null,
    juz: (c.verses && c.verses[0] && c.verses[0].juz) || null,
  }));
}

/**
 * تخطيط صفحات مصحف المدينة: لكلّ صفحةٍ أوّلُ آيةٍ فيها وآخرُها وجزؤها.
 *
 * ولا يُقبل الملف حتى يجتاز أربعة قياسات: أن تكون الصفحات ٦٠٤، وأن
 * تُغطّي ٦٢٣٦ آية بلا نقصٍ ولا تكرار، وألّا يتراجع ترقيمها ولا يقفز،
 * وأن تقع بداياتُ الأجزاء الثلاثين على الصفحات المعتمدة. فما طابق
 * الأربعة فهو المصحف المدنيّ الذي بين يديه، لا تخطيطاً آخر.
 */
function shrinkPages(obj) {
  const ch = obj && obj.chapters;
  if (!Array.isArray(ch) || ch.length !== 114) throw new Error("الفهرس ناقص");

  const flat = [];
  for (const c of ch) {
    for (const v of c.verses || []) {
      flat.push({ s: c.chapter, a: v.verse, p: v.page, j: v.juz });
    }
  }
  if (flat.length !== TOTAL_AYAHS) {
    throw new Error("عدد الآيات " + flat.length + " والمنتظر " + TOTAL_AYAHS);
  }

  const pages = [];
  let prev = 0;
  for (const r of flat) {
    if (!(r.p >= 1 && r.p <= TOTAL_PAGES)) throw new Error("رقم صفحة خارج المدى: " + r.p);
    if (r.p < prev || r.p > prev + 1) {
      throw new Error("ترقيم الصفحات غير متّصل عند " + r.s + ":" + r.a);
    }
    if (r.p !== prev) { pages.push([r.s, r.a, r.s, r.a, r.j]); prev = r.p; }
    else { const last = pages[pages.length - 1]; last[2] = r.s; last[3] = r.a; }
  }
  if (pages.length !== TOTAL_PAGES) {
    throw new Error("عدد الصفحات " + pages.length + " والمنتظر " + TOTAL_PAGES);
  }
  // والجزء قد يبدأ في وسط صفحة، فصفحتُه هي صفحةُ أوّل آيةٍ منه —
  // لا أوّلُ صفحةٍ تبدأ به
  const juzPage = {};
  for (const r of flat) if (juzPage[r.j] === undefined) juzPage[r.j] = r.p;
  for (let z = 0; z < 30; z++) {
    const at = juzPage[z + 1];
    if (at !== JUZ_PAGES[z]) {
      throw new Error("الجزء " + (z + 1) + " يبدأ في صفحة " + at +
                      " والمعتمد " + JUZ_PAGES[z]);
    }
  }
  return pages;
}

/** الأذكار: تُحوَّل من صيغة الجدول إلى قائمة مفهومة، بمراجعها */
function shrinkAzkar(obj) {
  const rows = obj && obj.rows;
  if (!Array.isArray(rows) || !rows.length) throw new Error("الأذكار فارغة");
  const out = rows.map((r) => ({
    cat: r[0], text: r[1], virtue: r[2] || "", count: Number(r[3]) || 1, ref: r[4] || "",
  })).filter((z) => z.text && z.cat);
  if (out.length < 100) throw new Error("الأذكار أقلّ مما ينبغي: " + out.length);
  return out;
}

// ============================================================
// التلاوة
//
// **لا أدّعي أنّي جرّبتُ هذه العناوين.** مضيفو التلاوات محجوبون عن
// المكان الذي كُتبت فيه هذه الشيفرة، فلم أستطع قياسها بنفسي. ولو
// كتبتُ عنواناً واحداً وقلت «هذا هو» لكان ظنّاً يُعرض على صاحب البيت
// كأنه علم.
//
// فلكلّ قارئٍ **عناوينُ مرشَّحة**، ويقيسها الخادم في البيت: يطلب أوّل
// آيةٍ من كلٍّ ويأخذ أوّل من يردّ، ويحفظ ما نجح. وما لم يردّ منها
// يُقال صراحةً في الصفحة: «هذا القارئ لم يُجب».
//
// والقياس يقع حيث يُنتفع به — على شبكته لا على شبكتي.
// ============================================================

const AUDIO = path.join(DATA, "audio");

const RECITERS = [
  {
    key: "husary", name: "محمود خليل الحصري", note: "مرتَّل",
    urls: [
      "https://everyayah.com/data/Husary_128kbps/{sss}{aaa}.mp3",
      "https://cdn.islamic.network/quran/audio/128/ar.husary/{n}.mp3",
      "https://everyayah.com/data/Husary_64kbps/{sss}{aaa}.mp3",
    ],
  },
  {
    key: "minshawi", name: "محمد صدّيق المنشاوي", note: "مرتَّل",
    urls: [
      "https://everyayah.com/data/Minshawy_Murattal_128kbps/{sss}{aaa}.mp3",
      "https://cdn.islamic.network/quran/audio/128/ar.minshawi/{n}.mp3",
      "https://everyayah.com/data/Minshawy_Mujawwad_192kbps/{sss}{aaa}.mp3",
    ],
  },
  {
    key: "ajamy", name: "أحمد بن علي العجمي", note: "مرتَّل",
    urls: [
      "https://everyayah.com/data/ahmed_ibn_ali_al_ajamy_128kbps/{sss}{aaa}.mp3",
      "https://cdn.islamic.network/quran/audio/128/ar.ahmedajamy/{n}.mp3",
      "https://everyayah.com/data/Ahmed_ibn_Ali_al_Ajamy_64kbps_QuranExplorer.Com/{sss}{aaa}.mp3",
    ],
  },
  // ---- المصحف المعلّم: الشيخ يقرأ والأطفال يردّدون خلفه ----
  // مضيفو التلاوات محجوبون عن المكان الذي كُتبت فيه هذه الشيفرة، فلا
  // أستطيع أن أطرق الباب بنفسي. لكنّ مجلّد الحصري المعلّم مفهرَسٌ
  // ومنشور: everyayah.com/data/Husary_Muallim_128kbps — وهذا قدرُ ما
  // أملك من دليل، وليس كالقياس. فيُقدَّم على غيره، **ويقيسه الخادم في
  // البيت** كما قاس الأربعة قبله.
  //
  // وأمّا المنشاوي المعلّم فمشهورٌ مسموع، ولم أجد له مجلّداً آيةً آيةً
  // عند هذا المضيف — والمنشور منه سُوَرٌ كاملة لا تصلح للترديد آيةً
  // آيةً. فمرشَّحاتُه ظنٌّ لا أكثر، وإن سكتت قيل ذلك باسمه ولم يُترك
  // زرٌّ يُضغط فلا يقع.
  {
    key: "husary_teacher", name: "الحصري — المصحف المعلّم", note: "مع ترديد الأطفال",
    teacher: true,
    urls: [
      "https://everyayah.com/data/Husary_Muallim_128kbps/{sss}{aaa}.mp3",
      "https://www.everyayah.com/data/Husary_Muallim_128kbps/{sss}{aaa}.mp3",
      "https://everyayah.com/data/Husary_128kbps_Muallim/{sss}{aaa}.mp3",
    ],
  },
  {
    key: "minshawi_teacher", name: "المنشاوي — المصحف المعلّم", note: "مع ترديد الأطفال",
    teacher: true,
    urls: [
      "https://everyayah.com/data/Minshawy_Mualim_128kbps/{sss}{aaa}.mp3",
      "https://everyayah.com/data/Minshawy_Muallim_128kbps/{sss}{aaa}.mp3",
      "https://everyayah.com/data/Minshawy_Teacher_128kbps/{sss}{aaa}.mp3",
    ],
  },
  {
    key: "hudhaify", name: "علي بن عبدالرحمن الحذيفي", note: "مرتَّل",
    urls: [
      "https://everyayah.com/data/Hudhaify_128kbps/{sss}{aaa}.mp3",
      "https://cdn.islamic.network/quran/audio/128/ar.hudhaify/{n}.mp3",
      "https://everyayah.com/data/Hudhaify_64kbps/{sss}{aaa}.mp3",
    ],
  },
];

/** رقم الآية في المصحف كلّه (١…٦٢٣٦) — تحتاجه بعض المصادر */
function globalAyah(sura, ayah) {
  if (!(sura >= 1 && sura <= 114)) throw new Error("رقم سورة خارج المدى");
  if (!(ayah >= 1 && ayah <= SURA_AYAHS[sura - 1])) throw new Error("رقم آية خارج المدى");
  let n = ayah;
  for (let s = 1; s < sura; s++) n += SURA_AYAHS[s - 1];
  return n;
}

const pad = (n, w) => String(n).padStart(w, "0");

function audioUrl(tpl, sura, ayah) {
  return tpl
    .replace("{sss}", pad(sura, 3))
    .replace("{aaa}", pad(ayah, 3))
    .replace("{n}", String(globalAyah(sura, ayah)));
}

/**
 * يطلب أوّل كيلوبايت فقط: يكفي ليُعرف أالعنوان حيٌّ أم لا، ولا
 * يُحمِّل شبكته ملفاً كاملاً في القياس.
 */
function probeUrl(url, ms = 12000) {
  return new Promise((resolve) => {
    const req = https.get(url, { timeout: ms, headers: { Range: "bytes=0-1023" } }, (res) => {
      const code = res.statusCode;
      if (code >= 300 && code < 400 && res.headers.location) {
        res.resume();
        return resolve(probeUrl(res.headers.location, ms));
      }
      const type = String(res.headers["content-type"] || "");
      let got = 0;
      res.on("data", (c) => { got += c.length; if (got > 512) req.destroy(); });
      res.on("end", () => resolve({ ok: (code === 200 || code === 206) && got > 0, code, type }));
      res.on("close", () => resolve({ ok: (code === 200 || code === 206) && got > 0, code, type }));
      res.on("error", () => resolve({ ok: false, why: "انقطع" }));
    });
    req.on("timeout", () => { req.destroy(); resolve({ ok: false, why: "انتهت المهلة" }); });
    req.on("error", (e) => resolve({ ok: false, why: e.message }));
  });
}

/** يقيس القرّاء واحداً واحداً، ويردّ ما نجح وما لم ينجح بصراحة */
async function probeReciters(log = () => {}, only = null) {
  const out = {};
  for (const r of RECITERS) {
    if (only && r.key !== only) continue;
    out[r.key] = { name: r.name, url: null, tried: [] };
    for (const tpl of r.urls) {
      const u = audioUrl(tpl, 1, 1);
      const res = await probeUrl(u);
      out[r.key].tried.push({ url: tpl, ok: res.ok, code: res.code || 0, why: res.why || "" });
      log("audio: " + r.key + " " + (res.ok ? "OK" : "no") + " <- " + u +
          (res.ok ? "" : " (" + (res.why || res.code) + ")"));
      if (res.ok) { out[r.key].url = tpl; break; }
    }
  }
  return out;
}

/** مسار الآية على القرص — وهو ما يجعلها تعمل بلا إنترنت بعد حفظها */
function ayahFile(reciter, sura, ayah) {
  if (!/^[a-z0-9_]{1,24}$/.test(String(reciter))) throw new Error("قارئ غير معروف");
  return path.join(AUDIO, reciter, pad(sura, 3) + pad(ayah, 3) + ".mp3");
}

function haveAyah(reciter, sura, ayah) {
  try { return fs.statSync(ayahFile(reciter, sura, ayah)).size > 0; } catch { return false; }
}

/** يجلب آيةً ويحفظها. والمحفوظ لا يُجلب ثانيةً أبداً */
async function fetchAyah(reciter, tpl, sura, ayah) {
  const file = ayahFile(reciter, sura, ayah);
  if (haveAyah(reciter, sura, ayah)) return file;
  const buf = await get(audioUrl(tpl, sura, ayah), true);
  // ملفٌّ أصغر من كيلوبايتين ليس تلاوة — غالباً صفحةُ خطأ بصيغة HTML
  if (buf.length < 2048) throw new Error("ما جاء صوتٌ (" + buf.length + " بايت)");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = file + ".part";
  fs.writeFileSync(tmp, buf);
  fs.renameSync(tmp, file);
  return file;
}

/** كم من سورةٍ محفوظٌ عندنا؟ */
function suraSaved(reciter, sura) {
  const total = SURA_AYAHS[sura - 1];
  let n = 0;
  for (let a = 1; a <= total; a++) if (haveAyah(reciter, sura, a)) n++;
  return { have: n, total };
}

function have(name) { return fs.existsSync(path.join(DATA, name)); }

function readJson(name) {
  return JSON.parse(fs.readFileSync(path.join(DATA, name), "utf8"));
}

/**
 * ينزّل ما ينقص ويتحقّق منه قبل أن يكتبه. ولا يُكتب ملفٌّ لم يُقبل —
 * فوجودُ الملف على القرص يعني أنه اجتاز القياس.
 */
async function ensureData(log = () => {}, onStep = () => {}) {
  fs.mkdirSync(DATA, { recursive: true });
  const done = [], failed = [];
  // الفهرس وتخطيط الصفحات يُستخرجان من ملفٍ واحد وزنه ميغابايتان —
  // فلا يُجلب مرّتين على شبكةٍ قد تكون بطيئة
  const fetched = new Map();

  for (const [key, src] of Object.entries(SOURCES)) {
    if (have(src.file)) { done.push(key); continue; }
    onStep({ key, label: src.label, state: "downloading" });
    log("islam: fetching " + src.file);
    try {
      let buf = fetched.get(src.url);
      if (!buf) { buf = await get(src.url, src.binary); fetched.set(src.url, buf); }
      let toWrite = buf;

      if (!src.binary) {
        const obj = JSON.parse(buf.toString("utf8"));
        if (key === "quran") { verifyQuran(obj); toWrite = Buffer.from(JSON.stringify(obj)); }
        else if (key === "muyassar" || key === "jalalayn") {
          verifyTafsir(obj); toWrite = Buffer.from(JSON.stringify(obj));
        } else if (key === "meta") toWrite = Buffer.from(JSON.stringify(shrinkMeta(obj)));
        else if (key === "pages") toWrite = Buffer.from(JSON.stringify(shrinkPages(obj)));
        else if (key === "azkar") toWrite = Buffer.from(JSON.stringify(shrinkAzkar(obj)));
      }

      // يُكتب باسمٍ مؤقّت ثم يُنقل: فلا يبقى ملفٌّ نصفُه على القرص
      // إن انقطع التنزيل، ويُقرأ لاحقاً كأنه تامّ
      const tmp = path.join(DATA, src.file + ".part");
      fs.writeFileSync(tmp, toWrite);
      fs.renameSync(tmp, path.join(DATA, src.file));
      log("islam: " + src.file + " verified and saved (" + toWrite.length + " bytes)");
      onStep({ key, label: src.label, state: "done" });
      done.push(key);
    } catch (e) {
      log("islam: " + src.file + " REJECTED — " + e.message);
      onStep({ key, label: src.label, state: "failed", why: e.message });
      failed.push({ key, label: src.label, why: e.message });
    }
  }
  return { done, failed, ready: !failed.length };
}

// ---------- القبلة ----------
// اتجاه الدائرة العظمى إلى الكعبة. قِيس على خمس مدن فطابق المنشور:
// الرياض ٢٤٣٫٨° · القاهرة ١٣٦٫١° · إسطنبول ١٥١٫٦° · جاكرتا ٢٩٥٫٢° · لندن ١١٩٫٠°
const KAABA = { lat: 21.4225, lon: 39.8262 };
const rad = (d) => (d * Math.PI) / 180;
const deg = (r) => (r * 180) / Math.PI;

function qibla(lat, lon) {
  const p1 = rad(lat), p2 = rad(KAABA.lat), dl = rad(KAABA.lon - lon);
  const x = Math.sin(dl) * Math.cos(p2);
  const y = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
  return (deg(Math.atan2(x, y)) + 360) % 360;
}

/** المسافة إلى الكعبة بالكيلومترات — تُعرض مع الاتجاه */
function distanceToKaaba(lat, lon) {
  const R = 6371;
  const p1 = rad(lat), p2 = rad(KAABA.lat);
  const dp = rad(KAABA.lat - lat), dl = rad(KAABA.lon - lon);
  const a = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

// ---------- مواقيت الصلاة ----------
// تُحسب هنا بالفلك، فلا تحتاج خدمةً خارجية ولا إنترنت.
// وطريقة أمّ القرى هي المعتمدة في السعودية:
//   الفجر  ١٨٫٥° تحت الأفق
//   العشاء بعد المغرب بتسعين دقيقة (ومئةٍ وعشرين في رمضان)
//   العصر  بظلّ المثل (الجمهور) — والحنفية بظلّ المثلين
const METHODS = {
  ummAlQura: { fajr: 18.5, isha: null, ishaMinutes: 90, name: "أمّ القرى" },
  mwl:       { fajr: 18,   isha: 17,   name: "رابطة العالم الإسلامي" },
  egypt:     { fajr: 19.5, isha: 17.5, name: "الهيئة المصرية" },
  karachi:   { fajr: 18,   isha: 18,   name: "كراتشي" },
};

/** اليوم اليوليانيّ لمنتصف ليل التوقيت العالميّ */
function julian(y, m, d) {
  if (m <= 2) { y -= 1; m += 12; }
  const a = Math.floor(y / 100);
  const b = 2 - a + Math.floor(a / 4);
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + b - 1524.5;
}

/** ميل الشمس ومعادلة الزمن — حسابٌ شمسيّ قياسيّ */
function sunPosition(jd) {
  const d = jd - 2451545.0;
  const g = (357.529 + 0.98560028 * d) % 360;           // الشذوذ الوسطيّ
  const q = (280.459 + 0.98564736 * d) % 360;           // الطول الوسطيّ
  const L = (q + 1.915 * Math.sin(rad(g)) + 0.020 * Math.sin(rad(2 * g))) % 360;
  const e = 23.439 - 0.00000036 * d;                    // ميل فلك البروج
  const decl = deg(Math.asin(Math.sin(rad(e)) * Math.sin(rad(L))));
  let ra = deg(Math.atan2(Math.cos(rad(e)) * Math.sin(rad(L)), Math.cos(rad(L)))) / 15;
  ra = (ra + 24) % 24;
  const eqt = q / 15 - ra;                              // معادلة الزمن بالساعات
  return { decl, eqt: ((eqt + 12) % 24) - 12 };
}

/** الزاوية الساعية لارتفاعٍ معلوم — أساس كل وقتٍ يُحسب بزاوية */
function hourAngle(angle, lat, decl) {
  const c = (-Math.sin(rad(angle)) - Math.sin(rad(lat)) * Math.sin(rad(decl))) /
            (Math.cos(rad(lat)) * Math.cos(rad(decl)));
  if (c > 1 || c < -1) return null;        // لا يقع هذا الوقت في هذا اليوم
  return deg(Math.acos(c)) / 15;
}

/**
 * مواقيت يومٍ في موضع.
 * @param {Date} date
 * @param {number} lat @param {number} lon @param {number} tz بالساعات
 */
function prayerTimes(date, lat, lon, tz, opts = {}) {
  const method = METHODS[opts.method] || METHODS.ummAlQura;
  const asrFactor = opts.hanafi ? 2 : 1;
  const jd = julian(date.getFullYear(), date.getMonth() + 1, date.getDate());
  const { decl, eqt } = sunPosition(jd + 0.5 - lon / 360);

  const noon = 12 - eqt - lon / 15 + tz;                 // الظهر الفلكيّ
  const h = (a) => hourAngle(a, lat, decl);

  // نصف قطر الشمس والانكسار الجوّيّ: ٠٫٨٣٣ تحت الأفق
  const sun = h(0.833);
  // العصر: ظلّ الشيء مثلَه (أو مثليه) زائداً ظلَّ الظهيرة
  const asrAlt = -deg(Math.atan(1 / (asrFactor + Math.tan(rad(Math.abs(lat - decl))))));
  const asrH = h(asrAlt);
  const fajrH = h(method.fajr);

  const clamp = (t) => (t == null ? null : (t + 24) % 24);
  const maghrib = clamp(sun == null ? null : noon + sun);

  let isha;
  if (method.ishaMinutes != null) {
    isha = maghrib == null ? null : clamp(maghrib + method.ishaMinutes / 60);
  } else {
    const ih = h(method.isha);
    isha = ih == null ? null : clamp(noon + ih);
  }

  return {
    fajr:    clamp(fajrH == null ? null : noon - fajrH),
    sunrise: clamp(sun == null ? null : noon - sun),
    dhuhr:   clamp(noon),
    asr:     clamp(asrH == null ? null : noon + asrH),
    maghrib,
    isha,
    method: method.name,
    decl, eqt,
  };
}

/** الساعة العشرية إلى «hh:mm» */
function hhmm(t) {
  if (t == null) return null;
  let m = Math.round(t * 60);
  m = ((m % 1440) + 1440) % 1440;
  return String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0");
}

module.exports = {
  SOURCES, SURA_AYAHS, TOTAL_AYAHS, JUZ_PAGES, TOTAL_PAGES, DATA, AUDIO,
  RECITERS, globalAyah, audioUrl, probeUrl, probeReciters,
  ayahFile, haveAyah, fetchAyah, suraSaved,
  ensureData, verifyQuran, verifyTafsir, shrinkMeta, shrinkAzkar, shrinkPages,
  have, readJson, qibla, distanceToKaaba, prayerTimes, hhmm, METHODS,
};

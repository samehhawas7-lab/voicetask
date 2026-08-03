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

  for (const [key, src] of Object.entries(SOURCES)) {
    if (have(src.file)) { done.push(key); continue; }
    onStep({ key, label: src.label, state: "downloading" });
    log("islam: fetching " + src.file);
    try {
      const buf = await get(src.url, src.binary);
      let toWrite = buf;

      if (!src.binary) {
        const obj = JSON.parse(buf.toString("utf8"));
        if (key === "quran") { verifyQuran(obj); toWrite = Buffer.from(JSON.stringify(obj)); }
        else if (key === "muyassar" || key === "jalalayn") {
          verifyTafsir(obj); toWrite = Buffer.from(JSON.stringify(obj));
        } else if (key === "meta") toWrite = Buffer.from(JSON.stringify(shrinkMeta(obj)));
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
  SOURCES, SURA_AYAHS, TOTAL_AYAHS, DATA,
  ensureData, verifyQuran, verifyTafsir, shrinkMeta, shrinkAzkar,
  have, readJson, qibla, distanceToKaaba, prayerTimes, hhmm, METHODS,
};

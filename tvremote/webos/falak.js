"use strict";
/* فلك: حسابُ المواقيت والقبلة، وأرقامُ الآيات وعناوينُ التلاوة.

   وحدةٌ واحدة يستعملها الخادمُ في اللابتوب وتطبيقُ المصحف المستقلّ في
   المتصفّح سواء. **ولماذا لا نسختان؟** لأنّ حسابين منفصلين يفترقان
   يوماً، فيريك الجوّالُ فجراً غير فجر اللابتوب ولا يُدرى أيّهما أصاب.
   النقلُ من islam.js كان نقلاً حرفياً، وقِيس قبله وبعده فطابق. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.falak = factory();
})(typeof self !== "undefined" ? self : this, function () {

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

return { SURA_AYAHS, TOTAL_AYAHS, KAABA, METHODS,
         globalAyah, pad, audioUrl,
         qibla, distanceToKaaba, prayerTimes, hhmm };
});

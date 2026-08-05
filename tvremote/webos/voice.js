"use strict";
// ============================================================
// فهمُ الأمر العربيّ المنطوق
//
// يعمل في المتصفّح وفي node معاً — فيُقاس هنا بمئات الجُمل قبل أن
// يصل إلى الجوّال. والتعرّف على الصوت يفعله سفاري، وهذا يفهم ما سمعه.
//
// **قاعدتان تحكمانه:**
//
// ١) الشكُّ يُقال ولا يُنفَّذ. إن لم يبلغ الفهمُ حدّاً كافياً رُدَّ
//    «ما فهمت» مع ما سُمع — ولا يُخمَّن أمرٌ يُطفئ تلفزيوناً أو يعيد
//    تشغيل راوتر. أمرٌ خاطئ أسوأ من أمرٍ لم يقع.
//
// ٢) ما يُنطق ليس ما يُكتب. سفاري يكتب «التلفاز» و«التلفزيون»
//    و«تلفزيون»، ويسقط الهمزات، ويكتب التاء المربوطة هاءً أحياناً.
//    فيُسوّى النصّ قبل الفهم: تُحذف الحركات، وتُوحَّد الألفات
//    والياءات والتاء المربوطة، وتُحوّل الأرقام الهندية.
// ============================================================

(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.Voice = api;
})(typeof self !== "undefined" ? self : this, function () {

  const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";

  /** يسوّي النصّ: حركاتٌ وهمزاتٌ وأرقام — فيُقارَن ما يُنطق لا ما يُملى */
  function normalize(s) {
    return String(s || "")
      .replace(/[ً-ْٰـ]/g, "")          // حركات وتطويل
      .replace(/[أإآٱ]/g, "ا")
      .replace(/ى/g, "ي")
      .replace(/ة/g, "ه")
      .replace(/ؤ/g, "و")
      .replace(/ئ/g, "ي")
      .replace(/[٠-٩]/g, (d) => AR_DIGITS.indexOf(d))
      .replace(/[^ء-يa-z0-9\s]/gi, " ")           // ترقيم
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  /** أرقامٌ منطوقة — «اثنين وعشرين» درجة */
  const WORD_NUM = {
    "صفر": 0, "واحد": 1, "اثنين": 2, "اثنان": 2, "ثنين": 2, "ثلاثه": 3, "ثلاث": 3,
    "اربعه": 4, "اربع": 4, "خمسه": 5, "خمس": 5, "سته": 6, "ست": 6, "سبعه": 7, "سبع": 7,
    "ثمانيه": 8, "ثمان": 8, "تسعه": 9, "تسع": 9, "عشره": 10, "عشر": 10,
    "احدعشر": 11, "اثناعشر": 12, "عشرين": 20, "ثلاثين": 30, "اربعين": 40,
    "خمسين": 50, "ستين": 60, "سبعين": 70, "ثمانين": 80, "تسعين": 90, "مايه": 100, "ميه": 100,
  };

  /** يستخرج عدداً: رقماً صريحاً، أو منطوقاً ولو مركّباً («اثنين وعشرين») */
  function numberIn(words) {
    for (const w of words) if (/^\d{1,3}$/.test(w)) return Number(w);
    let total = null;
    for (let i = 0; i < words.length; i++) {
      const v = WORD_NUM[words[i]];
      if (v == null) continue;
      // «اثنين وعشرين» — الوحدات ثم العشرات بينهما واو
      const next = words[i + 1] === "و" ? words[i + 2] : (words[i + 1] || "").replace(/^و/, "");
      const nv = WORD_NUM[next];
      // «اثنين وعشرين» و«ثمانية عشر» — وحدةٌ ثم عشرةٌ أو عقد
      if (v < 10 && nv != null && (nv >= 20 || nv === 10)) return v + nv;
      total = total == null ? v : total;
    }
    return total;
  }

  // ---------- الأجهزة ----------
  const DEVICES_RAW = [
    { key: "tv",    words: ["التلفزيون", "تلفزيون", "التلفاز", "تلفاز", "الشاشه", "التليفزيون", "تليفزيون", "شاشه", "tv"] },
    { key: "proj",  words: ["البروجكتر", "بروجكتر", "البروجيكتر", "بروجيكتر", "العارض", "عارض", "البروجكتور", "بروجكتور", "المسلاط"] },
    { key: "ac",    words: ["المكيف", "مكيف", "التكييف", "تكييف", "المكيفه", "الايركنديشن"] },
    { key: "router",words: ["الراوتر", "راوتر", "الروتر", "روتر", "الشبكه", "الواي فاي", "واي فاي", "الانترنت", "انترنت"] },
  ];

  const ROOMS_RAW = [
    { key: "hall", words: ["الصاله", "صاله", "المجلس", "مجلس", "الصالون", "الجلسه"] },
    { key: "bed",  words: ["الغرفه", "غرفه", "النوم", "نوم", "غرفتي", "المكتب"] },
  ];

  // ---------- الأفعال ----------
  // لكلٍّ كلماتُه، والأولُ في القائمة أقواها دلالةً
  const ON    = ["شغل", "شغلي", "افتح", "افتحي", "ولع", "ولعي", "اشغل", "فتح", "تشغيل", "شغله", "افتحه"];
  const OFF   = ["اطفي", "اطفئ", "طفي", "اقفل", "سكر", "اغلق", "اقفلي", "طفيه", "اطفيه", "ايقاف", "اوقف", "قفل"];
  const UP    = ["ارفع", "زود", "علي", "اعلي", "رفع", "زياده", "كبر"];
  const DOWN  = ["اخفض", "نزل", "قلل", "وطي", "خفض", "صغر"];
  const MUTE  = ["اكتم", "كتم", "اسكت", "صامت"];
  const BACK  = ["ارجع", "رجوع", "الخلف", "السابق", "خلف"];
  const HOME  = ["الرئيسيه", "البدايه", "الصفحه الرئيسيه", "هوم"];
  const REBOOT= ["اعد تشغيل", "ريستارت", "اعاده تشغيل", "ريست"];

  // ---------- التطبيقات ----------
  const APPS_RAW = [
    { key: "netflix", words: ["نتفلكس", "نتفليكس", "netflix"] },
    { key: "youtube", words: ["يوتيوب", "اليوتيوب", "youtube"] },
    { key: "shahid",  words: ["شاهد", "شاهد نت"] },
    { key: "osn",     words: ["osn", "او اس ان"] },
  ];

  // ---------- القسم الإسلاميّ ----------
  const ISLAM_RAW = [
    { key: "quran", words: ["المصحف", "مصحف", "القران", "قران", "القرآن"] },
    { key: "azkar", words: ["الاذكار", "اذكار", "الذكر"] },
    { key: "times", words: ["مواقيت", "المواقيت", "الصلاه", "صلاه", "الاذان", "اذان"] },
    { key: "qibla", words: ["القبله", "قبله", "اتجاه القبله"] },
  ];

  /**
   * الكلماتُ المرجعية تُسوَّى كما يُسوّى المنطوق.
   *
   * وإلا وقع ما وقع: كتبتُ «الرئيسيه» بهمزةٍ على نبرة، والتسويةُ
   * تحوّلها «الرييسيه»، فلا يلتقيان أبداً. فالجدولُ نفسه يمرّ
   * بالتسوية مرّةً عند التحميل — فلا يعود لكتابتي أثرٌ في الفهم.
   */
  const norm1 = (list) => list.map(normalize);
  const normTable = (t) => t.map((i) => ({ key: i.key, words: norm1(i.words) }));

  /** سوابقُ العربية تلتصق: «للروتر» و«بالتلفزيون» و«وشغل» */
  function bare(w) {
    let s = w;
    s = s.replace(/^(?:ف|و)/, "");
    // «للروتر»: لام الجرّ تبتلع ألف التعريف فتصير لامين
    s = s.replace(/^لل(?=..)/, "");
    s = s.replace(/^(?:ب|ل|ك)(?=ال)/, "");
    s = s.replace(/^ال/, "");
    return s;
  }

  const DEVICES = normTable(DEVICES_RAW);
  const ROOMS   = normTable(ROOMS_RAW);
  const APPS    = normTable(APPS_RAW);
  const ISLAM   = normTable(ISLAM_RAW);
  const nON = norm1(ON), nOFF = norm1(OFF), nUP = norm1(UP), nDOWN = norm1(DOWN);
  const nMUTE = norm1(MUTE), nBACK = norm1(BACK), nHOME = norm1(HOME), nREBOOT = norm1(REBOOT);

  const has = (words, list) => {
    const joined = words.join(" ");
    const stripped = words.map(bare);
    return list.some((w) => {
      if (w.includes(" ")) return joined.includes(w);
      if (words.includes(w)) return true;
      const b = bare(w);
      return b.length > 2 && stripped.includes(b);
    });
  };

  function findOne(words, table) {
    for (const item of table) if (has(words, item.words)) return item.key;
    return null;
  }

  /**
   * يفهم الجملة. يردّ:
   *   { intent, device, room, app, value, sure, said }
   * و`sure` بين ٠ و١ — وما دون العتبة لا يُنفَّذ.
   */
  function parse(said) {
    const text = normalize(said);
    const words = text.split(" ").filter(Boolean);
    const out = { said, text, intent: null, device: null, room: null,
                  app: null, value: null, sure: 0, why: "" };
    if (!words.length) { out.why = "ما سمعت شيئاً"; return out; }

    const device = findOne(words, DEVICES);
    const room = findOne(words, ROOMS);
    const app = findOne(words, APPS);
    const islam = findOne(words, ISLAM);
    const num = numberIn(words);

    const on = has(words, nON), off = has(words, nOFF);
    const up = has(words, nUP), down = has(words, nDOWN);
    const mute = has(words, nMUTE), back = has(words, nBACK), home = has(words, nHOME);
    const reboot = has(words, nREBOOT) || text.includes("اعد تشغيل");

    out.device = device; out.room = room; out.app = app;

    // «افتح صفحة الراوتر»: ذكرُ الصفحة يقلب «افتح» من أمرٍ إلى تنقّل.
    // ولولا هذا لَأطفأ الواي‑فاي من طلب أن يراه
    if (device && (words.includes("صفحه") || words.includes("شاشه") && device !== "tv")) {
      out.intent = "open"; out.sure = 0.9; return out;
    }

    // ---- الترتيب مقصود: الأخصّ أوّلاً ----

    // «افتح المصحف» / «الأذكار» / «مواقيت الصلاة» / «القبلة»
    if (islam && !device) {
      out.intent = "islam"; out.value = islam;
      out.sure = on || islam === "qibla" || islam === "times" ? 0.95 : 0.8;
      return out;
    }

    // «شغّل نتفلكس على التلفزيون»
    if (app) {
      out.intent = "app";
      out.device = device || "tv";
      // بلا فعلٍ صريح لا يُنفَّذ: «نتفلكس والله حلو» ذكرٌ لا أمر،
      // وفتحُ تطبيقٍ على من يتحدّث عنه سوءُ أدبٍ من الآلة
      out.sure = on ? 0.95 : 0.6;
      if (!on) out.why = "قل «افتح» قبل اسم التطبيق";
      return out;
    }

    // «أعد تشغيل الراوتر»
    if (reboot && device === "router") {
      out.intent = "routerReboot"; out.sure = 0.95; return out;
    }
    // «أطفئ الواي فاي»
    if (device === "router" && (on || off)) {
      out.intent = "wifi"; out.value = on ? "on" : "off"; out.sure = 0.9; return out;
    }

    // المكيف: درجةٌ أو تشغيلٌ أو إطفاء
    if (device === "ac") {
      if (num != null && num >= 16 && num <= 30) {
        out.intent = "acTemp"; out.value = num; out.sure = room ? 0.95 : 0.75; return out;
      }
      if (on || off) {
        out.intent = "acPower"; out.value = on ? "on" : "off";
        out.sure = room ? 0.95 : 0.75; return out;
      }
      if (text.includes("برد")) { out.intent = "acMode"; out.value = "cold"; out.sure = 0.85; return out; }
      if (text.includes("دفي") || text.includes("سخن")) {
        out.intent = "acMode"; out.value = "hot"; out.sure = 0.85; return out;
      }
    }

    // الصوت — للتلفزيون افتراضاً
    if (mute) { out.intent = "mute"; out.device = device || "tv"; out.sure = 0.9; return out; }
    if ((up || down) && (text.includes("صوت") || !device)) {
      out.intent = up ? "volUp" : "volDown";
      out.device = device || "tv";
      out.sure = text.includes("صوت") ? 0.95 : 0.7;
      out.value = num != null && num <= 20 ? num : 1;
      return out;
    }

    // التشغيل والإطفاء
    if (device && (on || off)) {
      out.intent = on ? "power" : "powerOff";
      out.sure = 0.95;
      return out;
    }
    // «شغّل» وحدها بلا جهاز — لا نخمّن أيّ جهازٍ يُقصد
    if (on || off) {
      out.intent = null;
      out.why = "أيُّ جهاز؟ قل «شغّل التلفزيون» أو «أطفئ المكيف»";
      out.sure = 0.3;
      return out;
    }

    // التنقّل
    if (home) { out.intent = "home"; out.sure = 0.9; return out; }
    if (back) { out.intent = "back"; out.sure = 0.85; return out; }

    // جهازٌ وحده: نفتح صفحته ولا نغيّر حاله
    if (device) { out.intent = "open"; out.sure = 0.7; return out; }

    out.why = "ما فهمت";
    return out;
  }

  /** العتبة: ما دونها يُقال ولا يُنفَّذ */
  const THRESHOLD = 0.7;

  /** جملةٌ عربية تصف ما فُهم — تُعرض قبل التنفيذ فيرى ما سيقع */
  const DEV_AR = { tv: "التلفزيون", proj: "البروجكتر", ac: "المكيف", router: "الراوتر" };
  const ROOM_AR = { hall: "الصالة", bed: "الغرفة" };
  const APP_AR = { netflix: "نتفلكس", youtube: "يوتيوب", shahid: "شاهد", osn: "OSN" };
  const ISLAM_AR = { quran: "المصحف", azkar: "الأذكار", times: "مواقيت الصلاة", qibla: "القبلة" };

  function describe(r) {
    const d = DEV_AR[r.device] || "";
    const rm = r.room ? " " + ROOM_AR[r.room] : "";
    switch (r.intent) {
      case "power":     return "تشغيل " + d + rm;
      case "powerOff":  return "إطفاء " + d + rm;
      case "volUp":     return "رفع صوت " + d;
      case "volDown":   return "خفض صوت " + d;
      case "mute":      return "كتم " + d;
      case "app":       return "فتح " + (APP_AR[r.app] || r.app) + " على " + d;
      case "acPower":   return (r.value === "on" ? "تشغيل" : "إطفاء") + " مكيف" + (rm || " ");
      case "acTemp":    return "ضبط مكيف" + (rm || " ") + " على " + r.value + "°";
      case "acMode":    return (r.value === "cold" ? "تبريد" : "تدفئة") + " مكيف" + rm;
      case "wifi":      return (r.value === "on" ? "تشغيل" : "إطفاء") + " الواي‑فاي";
      case "routerReboot": return "إعادة تشغيل الراوتر";
      case "islam":     return "فتح " + (ISLAM_AR[r.value] || r.value);
      case "open":      return "فتح صفحة " + d;
      case "home":      return "الصفحة الرئيسية";
      case "back":      return "رجوع";
      default:          return "";
    }
  }

  return { parse, normalize, describe, numberIn, THRESHOLD, DEVICES, ROOMS, APPS, ISLAM };
});

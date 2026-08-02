"use strict";
// ============================================================
// التحكّم المحليّ بأجهزة Tuya
//
// بعد أن نجلب المفتاح من السحابة مرة، نتكلّم مع الجهاز مباشرةً على
// المنفذ 6668 — أسرع، ويعمل والإنترنت مقطوع، ولا يتأثّر بانتهاء تجربة
// Tuya المجانية.
//
// نعتمد tuyapi هنا ولا نبني البروتوكول بأيدينا كما فعلنا مع ADB: هذا
// مبنيٌّ ومُختبَر ويدعم إصدارات البروتوكول من ٣٫١ إلى ٣٫٥، وإعادة
// بنائه عملٌ بلا عائد.
//
// والعنوان يُكتشف لا يُكتب — القاعدة الثانية: tuyapi يبثّ استكشافاً
// على الشبكة فيجد الجهاز بمعرّفه مهما بدّل الراوتر عنوانه.
// ============================================================

const TuyAPI = require("tuyapi");

// رموز الحالة تختلف بين الطُرُز: بعضها بأسماء وبعضها بأرقام. نجمع
// المعروف منها ونطابق ما يوجد، فلا نفترض طرازاً بعينه.
const CODES = {
  power:   ["switch", "switch_1", "Power", "1"],
  setTemp: ["temp_set", "TempSet", "settemp", "2"],
  curTemp: ["temp_current", "TempCurrent", "va_temperature", "3"],
  mode:    ["mode", "Mode", "4"],
  fan:     ["windspeed", "fan_speed_enum", "WindSpeed", "5"],
  swing:   ["swing", "switch_horizontal", "switch_vertical"],
};

/** يبحث عن أول رمز موجود في حالة الجهاز */
function pick(dps, names) {
  for (const n of names) if (Object.prototype.hasOwnProperty.call(dps, n)) return n;
  return null;
}

class TuyaDevice {
  /** @param {{id:string, key:string, ip?:string, version?:string}} cfg */
  constructor(cfg) {
    this.id = cfg.id;
    this.key = cfg.key;
    this.ip = cfg.ip || "";
    this.version = cfg.version || "3.3";
    this._dev = null;
  }

  _make() {
    return new TuyAPI({
      id: this.id,
      key: this.key,
      ip: this.ip || undefined,
      version: this.version,
      issueRefreshOnConnect: true,
    });
  }

  /** يفتح جلسة، ويبحث عن الجهاز في الشبكة إن لم يُعرف عنوانه أو سقط */
  async _open() {
    if (!this._dev) this._dev = this._make();
    if (this._dev.isConnected()) return this._dev;

    if (!this.ip) {
      await this._dev.find({ timeout: 8 });
      this.ip = this._dev.device.ip || "";
    }
    await this._dev.connect();
    return this._dev;
  }

  async _close() {
    try { if (this._dev) await this._dev.disconnect(); } catch {}
    this._dev = null;
  }

  /**
   * يقرأ حالة الجهاز.
   * وإن تعذّر الوصل أعاد الاكتشاف مرة واحدة: الراوتر يبدّل العناوين،
   * والعنوان المحفوظ قد يكون لجهاز آخر.
   */
  async raw(retry = true) {
    try {
      const dev = await this._open();
      const st = await dev.get({ schema: true });
      return (st && st.dps) || st || {};
    } catch (e) {
      await this._close();
      if (!retry) {
        // رسائل tuyapi إنجليزية تقنية، ولا تفيد صاحب البيت في شيء
        const why = /timed out|ECONNREFUSED|EHOSTUNREACH|find\(\)/i.test(e.message)
          ? "ما وصلت للمكيف — تأكّد أنه موصول بالكهرباء وبنفس الواي فاي، " +
            "وأنه يظهر في تطبيق Smart Life"
          : /key|decrypt|checksum/i.test(e.message)
          ? "المفتاح المحليّ لم يعد صالحاً — أُعيد إقران المكيف في Smart Life. " +
            "أعد الربط من صفحة المكيف"
          : "تعذّر الوصول للمكيف: " + e.message;
        throw new Error(why);
      }
      this.ip = "";                       // ننسى العنوان ونبحث من جديد
      return this.raw(false);
    }
  }

  /** الحالة بأسماء مفهومة بدل رموز الطراز */
  async state() {
    const dps = await this.raw();
    const kPower = pick(dps, CODES.power);
    const kSet = pick(dps, CODES.setTemp);
    const kCur = pick(dps, CODES.curTemp);
    const kMode = pick(dps, CODES.mode);
    const kFan = pick(dps, CODES.fan);
    const kSwing = pick(dps, CODES.swing);
    return {
      on: kPower ? !!dps[kPower] : null,
      setTemp: kSet ? Number(dps[kSet]) : null,
      curTemp: kCur ? Number(dps[kCur]) : null,
      mode: kMode ? String(dps[kMode]) : null,
      fan: kFan ? String(dps[kFan]) : null,
      swing: kSwing ? !!dps[kSwing] : null,
      ip: this.ip,
      codes: { kPower, kSet, kCur, kMode, kFan, kSwing },
      dps,
    };
  }

  /** يغيّر ما طُلب، ثم يعيد الحالة مقروءةً من الجهاز لا مفترضة */
  async apply(changes) {
    const st = await this.state();
    const c = st.codes;
    const dps = {};

    if (changes.on !== undefined && c.kPower) dps[c.kPower] = !!changes.on;
    if (changes.setTemp !== undefined && c.kSet) dps[c.kSet] = Math.round(changes.setTemp);
    if (changes.mode !== undefined && c.kMode) dps[c.kMode] = String(changes.mode);
    if (changes.fan !== undefined && c.kFan) dps[c.kFan] = String(changes.fan);
    if (changes.swing !== undefined && c.kSwing) dps[c.kSwing] = !!changes.swing;

    if (!Object.keys(dps).length) throw new Error("لا شيء يُغيَّر — الجهاز لا يعلن هذه الخاصية");

    const dev = await this._open();
    await dev.set({ multiple: true, data: dps });
    await new Promise((r) => setTimeout(r, 900));   // نمهله ليطبّق قبل القراءة
    return this.state();
  }
}

module.exports = { TuyaDevice, CODES };

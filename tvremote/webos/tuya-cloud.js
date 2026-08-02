"use strict";
// ============================================================
// سحابة Tuya — تُسأل مرة واحدة، لا في كل ضغطة زرّ
//
// أجهزة Tuya لا تُفصح عن مفتاحها المحليّ إلا من سحابتها. فنسألها مرة
// عند الربط، ونحفظ المفاتيح، ثم نتكلّم مع المكيف مباشرةً في الشبكة —
// أسرع، ويعمل والإنترنت مقطوع، ولا يتأثّر بانتهاء تجربة Tuya المجانية.
//
// التوقيع: HMAC-SHA256 على سلسلةٍ تجمع المعرّف والرمز والوقت وملخّص
// الطلب. وهي ستون سطراً، فلا تُبرَّر إضافة axios لأجلها على لابتوب
// مساحته ضيّقة.
// ============================================================

const https = require("https");
const crypto = require("crypto");

// مناطق Tuya. أجهزة الخليج تقع غالباً في أوروبا الوسطى، ثم أمريكا
const REGIONS = {
  eu: "openapi.tuyaeu.com",
  us: "openapi.tuyaus.com",
  cn: "openapi.tuyacn.com",
  in: "openapi.tuyain.com",
};

const EMPTY_SHA256 = crypto.createHash("sha256").update("").digest("hex");

function request(host, method, path, headers, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      { host, path, method, headers, timeout: 15000 },
      (res) => {
        let raw = "";
        res.on("data", (c) => { raw += c; if (raw.length > 1e6) res.destroy(); });
        res.on("end", () => {
          try { resolve(JSON.parse(raw)); }
          catch { reject(new Error("ردّ غير مفهوم من Tuya")); }
        });
      }
    );
    req.on("timeout", () => { req.destroy(); reject(new Error("انتهت المهلة نحو Tuya")); });
    req.on("error", (e) => reject(new Error("تعذّر الوصول إلى Tuya: " + e.message)));
    if (body) req.write(body);
    req.end();
  });
}

class TuyaCloud {
  /** @param {{accessId:string, accessSecret:string, region?:string}} cfg */
  constructor(cfg) {
    this.id = cfg.accessId;
    this.secret = cfg.accessSecret;
    this.host = REGIONS[cfg.region] || REGIONS.eu;
    this.token = "";
    this.expires = 0;
  }

  /**
   * التوقيع كما تطلبه Tuya:
   *   str = METHOD \n sha256(body) \n headers \n path
   *   sign = HMAC-SHA256(clientId + [token] + t + [nonce] + str, secret)
   * والرمز يدخل في التوقيع في طلبات العمل، ولا يدخل في طلب الرمز نفسه.
   */
  _sign(method, path, body, withToken) {
    const t = Date.now().toString();
    const hash = crypto.createHash("sha256").update(body || "").digest("hex");
    const str = method + "\n" + hash + "\n\n" + path;
    const payload = this.id + (withToken ? this.token : "") + t + str;
    const sign = crypto.createHmac("sha256", this.secret)
      .update(payload).digest("hex").toUpperCase();
    const headers = {
      client_id: this.id,
      sign,
      t,
      sign_method: "HMAC-SHA256",
      "Content-Type": "application/json",
    };
    if (withToken) headers.access_token = this.token;
    return headers;
  }

  /** يجدّد الرمز قبل انتهائه بدقيقة، فلا يفاجئنا انتهاؤه في منتصف طلب */
  async _ensureToken() {
    if (this.token && Date.now() < this.expires - 60000) return;
    const path = "/v1.0/token?grant_type=1";
    const r = await request(this.host, "GET", path, this._sign("GET", path, "", false));
    if (!r.success) throw new Error(this._why(r));
    this.token = r.result.access_token;
    this.expires = Date.now() + (r.result.expire_time || 7200) * 1000;
  }

  _why(r) {
    const msg = r && (r.msg || r.message) || "طلب مرفوض";
    const code = r && r.code;
    if (code === 1004 || /sign invalid/i.test(msg)) {
      return "المفتاح أو السرّ خطأ — تحقّق من نسخهما كاملين";
    }
    if (code === 1106 || /permission/i.test(msg)) {
      return "الحساب غير مصرّح — تأكّد أنك ربطت Smart Life بالمشروع";
    }
    if (code === 1101 || /token is expired/i.test(msg)) return "انتهى الرمز";
    if (/cross-region/i.test(msg)) return "المنطقة خطأ — جرّب منطقة أخرى";
    return msg + (code ? " (" + code + ")" : "");
  }

  async _get(path) {
    await this._ensureToken();
    const r = await request(this.host, "GET", path, this._sign("GET", path, "", true));
    if (!r.success) throw new Error(this._why(r));
    return r.result;
  }

  /** كل الأجهزة المرتبطة بالمشروع، وفيها المفتاح المحليّ والتصنيف */
  async devices() {
    const r = await this._get("/v1.0/iot-01/associated-users/devices?size=100");
    const list = (r && r.devices) || [];
    return list.map((d) => ({
      id: d.id,
      name: d.name || d.product_name || d.id,
      category: d.category || "",
      localKey: d.local_key || "",
      ip: d.ip || "",
      online: !!d.online,
      model: d.product_name || "",
      version: String(d.version || "3.3"),
    }));
  }

  /** مواصفات الحالة: بها نعرف رموز الحرارة والوضع بدل تخمينها */
  specs(id) {
    return this._get("/v1.0/devices/" + encodeURIComponent(id) + "/specifications");
  }
}

module.exports = { TuyaCloud, REGIONS };

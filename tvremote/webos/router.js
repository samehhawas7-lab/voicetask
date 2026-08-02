"use strict";
// ============================================================
// الراوتر — سائق هواوي المحلي
//
// راوترات هواوي المنزلية (وأكثر أجهزة الجيل الخامس منها) تفتح واجهة
// برمجية على شبكتها المحلية تحت /api/. وهي الواجهة نفسها التي تستعملها
// صفحة الراوتر في المتصفح، فلا شيء هنا مُستنبَط بالتخمين.
//
// المصافحة:
//   ١) GET /api/webserver/SesTokInfo  → كعكة SessionID ورمز TokInfo
//   ٢) POST /api/user/login بـ password_type=4:
//        Password = b64( sha256hex( user + b64(sha256hex(pass)) + token ) )
//   ٣) الرمز يتبدّل مع كل ردّ، فيُقرأ من __RequestVerificationToken
//      ويُحمل في الطلب الذي يليه — وإلا رُدّ الطلب برمز ١٢٥٠٠٢
//
// وردودها XML مسطّح لا عمق فيه، فيكفيه مستخرِج وسمٍ صغير. ولا تُضاف
// مكتبة تحليل XML لأجل ستة وسوم.
// ============================================================

const http = require("http");
const crypto = require("crypto");

const sha256hex = (s) => crypto.createHash("sha256").update(s, "utf8").digest("hex");
const b64 = (s) => Buffer.from(s, "utf8").toString("base64");

/** يستخرج محتوى وسمٍ من XML مسطّح. غيابه يُرجع "" لا يُسقط الطلب */
function tag(xml, name) {
  const m = xml.match(new RegExp("<" + name + ">([\\s\\S]*?)</" + name + ">", "i"));
  return m ? m[1].trim() : "";
}

/** يستخرج كل تكرارات وسمٍ — قائمة الأجهزة مثلاً */
function tags(xml, name) {
  const out = [];
  const re = new RegExp("<" + name + ">([\\s\\S]*?)</" + name + ">", "gi");
  let m;
  while ((m = re.exec(xml))) out.push(m[1]);
  return out;
}

/** رموز أخطاء هواوي المتكرّرة — تُترجم فلا تُعرض عارية */
const ERRORS = {
  "108001": "اسم المستخدم خطأ",
  "108002": "كلمة المرور خطأ",
  "108003": "الدخول جارٍ من مكان آخر — أغلق صفحة الراوتر في المتصفح",
  "108006": "اسم المستخدم أو كلمة المرور خطأ",
  "108007": "حاولت مرّات كثيرة — انتظر بضع دقائق",
  "125001": "رمز التحقّق غير صالح",
  "125002": "انتهت الجلسة — يُعاد الدخول",
  "125003": "رمز التحقّق ناقص",
};

function huaweiError(xml) {
  const code = tag(xml, "code");
  if (!code) return null;
  return ERRORS[code] || ("الراوتر ردّ برمز " + code);
}

function request(host, method, path, { body, headers, timeout = 8000 } = {}) {
  // الراوتر على المنفذ ٨٠، لكن العنوان قد يحمل منفذاً — وبه تُختبر
  // الوحدة بلا صلاحية جذر
  const [h, p] = String(host).split(":");
  return new Promise((resolve, reject) => {
    const req = http.request(
      { host: h, port: Number(p) || 80, method, path, timeout,
        headers: Object.assign(
          { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" },
          body ? { "Content-Length": Buffer.byteLength(body) } : {},
          headers || {}) },
      (res) => {
        let text = "";
        res.setEncoding("utf8");
        res.on("data", (c) => { text += c; if (text.length > 1e6) req.destroy(); });
        res.on("end", () => resolve({ status: res.statusCode, headers: res.headers, text }));
      });
    req.on("timeout", () => { req.destroy(); reject(new Error("الراوتر لم يردّ")); });
    req.on("error", (e) => reject(new Error("تعذّر الوصول للراوتر: " + e.message)));
    if (body) req.write(body);
    req.end();
  });
}

/**
 * يسأل عنواناً: هل أنت راوتر هواوي؟ ولا يُجيب بالظنّ — إمّا ردّ
 * SesTokInfo بجلسة ورمز، أو لا.
 */
async function probe(host) {
  try {
    const r = await request(host, "GET", "/api/webserver/SesTokInfo", { timeout: 3000 });
    const ses = tag(r.text, "SesInfo");
    const tok = tag(r.text, "TokInfo");
    if (!ses || !tok) return { ok: false, why: "ليس راوتر هواوي (أو واجهته مقفلة)" };
    return { ok: true, host, session: ses, token: tok };
  } catch (e) {
    return { ok: false, why: e.message };
  }
}

/** يبحث عن الراوتر ببصمته: البوّابة أول عنوان في كل شبكة */
async function find(subnets) {
  for (const base of subnets) {
    for (const last of [1, 254]) {
      const host = base + "." + last;
      const r = await probe(host);
      if (r.ok) return { ok: true, host };
    }
  }
  return { ok: false, why: "ما وجدت راوتر هواوي في الشبكة" };
}

class HuaweiRouter {
  constructor({ host, username = "admin", password }) {
    this.host = host;
    this.username = username || "admin";
    this.password = password;
    this.session = "";
    this.token = "";
    // الرمز سلسلة لا مجموعة: كل ردّ يُبطل ما قبله. فطلبان متوازيان
    // يحملان الرمز نفسه، فينجح أوّلهما ويُردّ الثاني بـ 125001.
    // فتُصفّ الطلبات صفّاً — ولا يُترك ذلك لأدب المُستدعي.
    this.queue = Promise.resolve();
  }

  /** يُدخل عملاً في الصفّ فلا يتداخل مع غيره */
  serial(fn) {
    const run = this.queue.then(fn, fn);
    this.queue = run.then(() => {}, () => {});
    return run;
  }

  get headers() {
    const h = {};
    if (this.session) h.Cookie = this.session;
    if (this.token) h.__RequestVerificationToken = this.token;
    return h;
  }

  /** الرمز يتبدّل مع كل ردّ — من أهمله رُدّ طلبه التالي */
  absorb(res) {
    const t = res.headers["__requestverificationtoken"];
    if (t) this.token = String(t).split("#")[0];
    const c = res.headers["set-cookie"];
    if (c && c.length) this.session = String(c[0]).split(";")[0];
  }

  login() { return this.serial(() => this._login()); }

  async _login() {
    const p = await probe(this.host);
    if (!p.ok) throw new Error(p.why);
    this.session = "SessionID=" + p.session;
    this.token = p.token;

    const hashed = b64(sha256hex(
      this.username + b64(sha256hex(this.password)) + this.token));
    const body =
      "<?xml version='1.0' encoding='UTF-8'?><request>" +
      "<Username>" + this.username + "</Username>" +
      "<Password>" + hashed + "</Password>" +
      "<password_type>4</password_type></request>";

    const res = await request(this.host, "POST", "/api/user/login", {
      body, headers: this.headers,
    });
    const why = huaweiError(res.text);
    if (why) throw new Error(why);
    if (!/<response>\s*OK\s*<\/response>/i.test(res.text)) {
      throw new Error("الدخول لم يُقبل");
    }
    this.absorb(res);
    return true;
  }

  /** يقرأ نقطةً، ويعيد الدخول مرّة إن انتهت الجلسة */
  get(path) { return this.serial(() => this._call("GET", path)); }
  post(path, body) { return this.serial(() => this._call("POST", path, body)); }

  async _call(method, path, body, retry = true) {
    const res = await request(this.host, method, path, { body, headers: this.headers });
    this.absorb(res);
    const code = tag(res.text, "code");
    // انتهت الجلسة أو مات الرمز: يُعاد الدخول مرّةً — وداخل الصفّ
    // نفسه، فلا يسبقنا إليه طلبٌ آخر
    if (retry && (code === "125002" || code === "125003" || code === "125001" || code === "100003")) {
      await this._login();
      return this._call(method, path, body, false);
    }
    const why = huaweiError(res.text);
    if (why) throw new Error(why);
    return res.text;
  }

  // ---------- القراءة ----------

  async information() {
    const x = await this.get("/api/device/information");
    return {
      model: tag(x, "DeviceName") || tag(x, "devicename"),
      firmware: tag(x, "SoftwareVersion"),
      serial: tag(x, "SerialNumber") ? "محفوظ" : "",   // لا يُعرض رقمٌ يُعرّف الجهاز
      wanIp: tag(x, "WanIPAddress"),
    };
  }

  async signal() {
    const x = await this.get("/api/device/signal");
    const num = (v) => { const n = parseInt(String(v).replace(/[^\-0-9]/g, ""), 10);
                         return Number.isFinite(n) ? n : null; };
    return {
      rsrp: num(tag(x, "rsrp")), rsrq: num(tag(x, "rsrq")),
      sinr: num(tag(x, "sinr")), band: tag(x, "band") || tag(x, "nrband"),
    };
  }

  async status() {
    const x = await this.get("/api/monitoring/status");
    // نوع الشبكة يأتي رقماً — والأرقام الشائعة وحدها تُترجم
    const TYPES = { "19":"شبكة رابعة+", "101":"شبكة خامسة (NSA)", "111":"شبكة خامسة (SA)",
                    "7":"شبكة ثالثة+", "9":"شبكة ثالثة+", "1011":"شبكة رابعة+" };
    const t = tag(x, "CurrentNetworkTypeEx") || tag(x, "CurrentNetworkType");
    return {
      network: TYPES[t] || (t ? "نوع " + t : "غير معروف"),
      // الأشرطة من صفر إلى خمسة كما يعرضها الراوتر نفسه
      bars: Math.max(0, Math.min(5, parseInt(tag(x, "SignalIcon") || "0", 10) || 0)),
      connected: tag(x, "ConnectionStatus") === "901",
    };
  }

  async traffic() {
    const x = await this.get("/api/monitoring/traffic-statistics");
    const n = (v) => Number(v) || 0;
    return {
      down: n(tag(x, "CurrentDownload")), up: n(tag(x, "CurrentUpload")),
      uptime: n(tag(x, "CurrentConnectTime")),
    };
  }

  /** الأجهزة المتصلة بأسمائها — ما لا يعطيه المسح */
  async hosts() {
    const x = await this.get("/api/wlan/host-list");
    return tags(x, "Host").map((h) => ({
      mac: (tag(h, "MacAddress") || "").toLowerCase(),
      ip: tag(h, "IpAddress"),
      name: tag(h, "HostName") || tag(h, "ActualName") || "",
      wifi: tag(h, "AssociatedSsid") ? true : undefined,
      ssid: tag(h, "AssociatedSsid") || "",
    })).filter((h) => h.mac);
  }

  async wlan() {
    const x = await this.get("/api/wlan/multi-basic-settings");
    return tags(x, "Ssid").map((s) => ({
      index: tag(s, "Index"),
      name: tag(s, "WifiSsid"),
      on: tag(s, "WifiEnable") === "1",
      guest: tag(s, "wifiisguestnetwork") === "1",
    }));
  }

  // ---------- الكتابة ----------

  /** إعادة التشغيل. لا رجعة عنها بعد الإرسال، فالتأكيد قبلها لا بعدها */
  async reboot() {
    await this.post("/api/device/control",
      "<?xml version='1.0' encoding='UTF-8'?><request><Control>1</Control></request>");
    return true;
  }

  /** تشغيل شبكةٍ أو إطفاؤها بمؤشّرها */
  async setWifi(index, on) {
    const list = await this.wlan();
    const body =
      "<?xml version='1.0' encoding='UTF-8'?><request><Ssids>" +
      list.map((s) =>
        "<Ssid><Index>" + s.index + "</Index><WifiEnable>" +
        (s.index === String(index) ? (on ? "1" : "0") : (s.on ? "1" : "0")) +
        "</WifiEnable></Ssid>").join("") +
      "</Ssids><WifiRestart>1</WifiRestart></request>";
    await this.post("/api/wlan/multi-basic-settings", body);
    return true;
  }

  /** حجب جهاز أو رفع الحجب — القائمة السوداء لا البيضاء */
  async setBlocked(macs) {
    const clean = macs.map((m) => String(m).toLowerCase()).filter(Boolean).slice(0, 32);
    const body =
      "<?xml version='1.0' encoding='UTF-8'?><request>" +
      "<Ssids><Ssid><Index>0</Index>" +
      "<wifimacfilterstatus>" + (clean.length ? "2" : "0") + "</wifimacfilterstatus>" +
      clean.map((m, i) =>
        "<WifiMacFilterMac" + i + ">" + m + "</WifiMacFilterMac" + i + ">").join("") +
      "</Ssid></Ssids></request>";
    await this.post("/api/wlan/multi-macfilter-settings", body);
    return true;
  }
}

module.exports = { HuaweiRouter, probe, find, tag, tags, sha256hex, b64 };

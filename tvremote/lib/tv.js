"use strict";
// ============================================================
// إدارة الاتصال بتلفزيون Android TV / Google TV (ومنها شاشات KMC الذكية)
// البروتوكول: Android TV Remote Service v2 — نفس اللي يستخدمه تطبيق جوجل
//   منفذ 6467 = الإقران (Pairing)  |  منفذ 6466 = التحكم (Remote)
// ============================================================

const fs = require("fs");
const path = require("path");
const EventEmitter = require("events");
const { AndroidRemote, RemoteKeyCode, RemoteDirection } = require("androidtv-remote");
const { KEY_MAP, textToKeyNames } = require("./keys");

const DATA_DIR = path.join(__dirname, "..", "data");
const STORE_FILE = path.join(DATA_DIR, "tv.json");
const SERVICE_NAME = "KMC Web Remote";

// ---------- تخزين الشهادة على القرص ----------
// بعد أول إقران ناجح نحفظ الشهادة، فما نحتاج نعيد الإقران كل مرة.
function readStore() {
  try {
    return JSON.parse(fs.readFileSync(STORE_FILE, "utf8"));
  } catch {
    return { devices: {} };
  }
}

function writeStore(store) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2), { mode: 0o600 });
}

// ---------- المتحكم ----------
class TvController extends EventEmitter {
  constructor() {
    super();
    this.remote = null;
    this.host = null;
    // disconnected | pairing | awaiting_code | connecting | ready | error
    this.status = "disconnected";
    this.error = null;
    this.powered = null;
    this.volume = null;
    this.currentApp = null;
    this._reconnectTimer = null;
    this._reconnectDelay = 2000;
    this._generation = 0; // لتجاهل أحداث اتصال قديم بعد إعادة الاتصال
  }

  // ---------- الحالة المعروضة في الواجهة ----------
  state() {
    const store = readStore();
    return {
      status: this.status,
      host: this.host,
      error: this.error,
      powered: this.powered,
      volume: this.volume,
      currentApp: this.currentApp,
      knownHosts: Object.keys(store.devices || {}),
      lastHost: store.lastHost || null,
    };
  }

  _setStatus(status, error) {
    this.status = status;
    this.error = error || null;
    this.emit("state", this.state());
  }

  // ---------- بدء الاتصال ----------
  // لو عندنا شهادة محفوظة للجهاز: يتصل مباشرة.
  // غير كذا: يبدأ الإقران والتلفزيون يعرض رمز من 6 أرقام.
  async connect(host, { forcePair = false } = {}) {
    host = String(host || "").trim();
    if (!host) throw new Error("لازم تحدد عنوان IP للتلفزيون");

    this.disconnect({ silent: true });

    const store = readStore();
    const saved = forcePair ? null : (store.devices || {})[host];
    const generation = ++this._generation;

    const remote = new AndroidRemote(host, {
      pairing_port: 6467,
      remote_port: 6466,
      service_name: SERVICE_NAME,
      cert: saved ? { key: saved.key, cert: saved.cert } : {},
    });

    this.remote = remote;
    this.host = host;
    this._setStatus(saved ? "connecting" : "pairing");

    // التلفزيون عرض رمز الإقران على الشاشة
    remote.on("secret", () => {
      if (generation !== this._generation) return;
      this._setStatus("awaiting_code");
    });

    remote.on("ready", () => {
      if (generation !== this._generation) return;
      this._reconnectDelay = 2000;
      // نحفظ الشهادة بعد نجاح الاتصال (مهمة خصوصاً بعد أول إقران)
      try {
        const cert = remote.getCertificate();
        if (cert && cert.key && cert.cert) {
          const s = readStore();
          s.devices = s.devices || {};
          s.devices[host] = { key: cert.key, cert: cert.cert, pairedAt: new Date().toISOString() };
          s.lastHost = host;
          writeStore(s);
        }
      } catch (e) {
        console.error("[tv] تعذّر حفظ الشهادة:", e.message);
      }
      this._setStatus("ready");
    });

    remote.on("powered", (powered) => {
      if (generation !== this._generation) return;
      this.powered = powered;
      this.emit("state", this.state());
    });

    remote.on("volume", (volume) => {
      if (generation !== this._generation) return;
      this.volume = volume;
      this.emit("state", this.state());
    });

    remote.on("current_app", (app) => {
      if (generation !== this._generation) return;
      this.currentApp = app;
      this.emit("state", this.state());
    });

    // التلفزيون ألغى الإقران — نمسح الشهادة عشان الاتصال الجاي يبدأ إقران جديد
    remote.on("unpaired", () => {
      if (generation !== this._generation) return;
      const s = readStore();
      if (s.devices) delete s.devices[host];
      writeStore(s);
      this._setStatus("disconnected", "التلفزيون ألغى الإقران، لازم تقرن من جديد");
    });

    // start() ما يرجع إلا بعد اكتمال الإقران + الاتصال، فما ننتظره هنا
    remote.start().then(
      (started) => {
        if (generation !== this._generation) return;
        if (!started && this.status !== "ready") {
          this._setStatus("error", "فشل الاتصال بالتلفزيون. تأكد إنه مشغّل وعلى نفس الشبكة.");
          this._scheduleReconnect(host);
        }
      },
      (err) => {
        if (generation !== this._generation) return;
        this._setStatus("error", err && err.message ? err.message : String(err));
        this._scheduleReconnect(host);
      }
    );

    return this.state();
  }

  // إعادة محاولة الاتصال تلقائياً (مثلاً لما يطفى التلفزيون ويرجع يشتغل)
  _scheduleReconnect(host) {
    // ما نعيد المحاولة إلا لو عندنا شهادة — الإقران يحتاج تدخل المستخدم
    const store = readStore();
    if (!((store.devices || {})[host])) return;
    if (this._reconnectTimer) return;

    const delay = this._reconnectDelay;
    this._reconnectDelay = Math.min(delay * 2, 60000);
    this._reconnectTimer = setTimeout(() => {
      this._reconnectTimer = null;
      if (this.status === "ready") return;
      this.connect(host).catch((e) => console.error("[tv] فشل إعادة الاتصال:", e.message));
    }, delay);
    if (this._reconnectTimer.unref) this._reconnectTimer.unref();
  }

  // ---------- إرسال رمز الإقران ----------
  async submitCode(code) {
    code = String(code || "").trim();
    if (!this.remote) throw new Error("ما فيه عملية إقران شغّالة");
    if (this.status !== "awaiting_code") throw new Error("التلفزيون ما طلب رمز إقران بعد");
    if (!/^[0-9A-Fa-f]{4,8}$/.test(code)) throw new Error("رمز الإقران غير صالح");

    this._setStatus("connecting");
    try {
      await this.remote.sendCode(code);
    } catch (e) {
      this._setStatus("awaiting_code", "الرمز غير صحيح، جرّب مرة ثانية");
      throw new Error("الرمز غير صحيح");
    }
    return this.state();
  }

  _requireReady() {
    if (this.status !== "ready" || !this.remote) {
      throw new Error("التلفزيون غير متصل");
    }
  }

  // ---------- الأوامر ----------
  sendKey(name) {
    this._requireReady();
    const keycodeName = KEY_MAP[name];
    if (!keycodeName) throw new Error("زر غير معروف: " + name);
    const code = RemoteKeyCode[keycodeName];
    if (code === undefined) throw new Error("الزر غير مدعوم: " + name);
    this.remote.sendKey(code, RemoteDirection.SHORT);
  }

  sendPower() {
    this._requireReady();
    this.remote.sendPower();
  }

  sendAppLink(link) {
    this._requireReady();
    if (!link) throw new Error("رابط التطبيق مفقود");
    this.remote.sendAppLink(link);
  }

  // كتابة نص: نرسله حرف حرف كـ keycodes (إنجليزي وأرقام فقط)
  async sendText(text) {
    this._requireReady();
    const names = textToKeyNames(text);
    if (!names.length) throw new Error("ما فيه حروف مدعومة في النص (إنجليزي وأرقام فقط)");
    for (const keycodeName of names) {
      const code = RemoteKeyCode[keycodeName];
      if (code === undefined) continue;
      this.remote.sendKey(code, RemoteDirection.SHORT);
      await new Promise((r) => setTimeout(r, 40)); // تهدئة عشان التلفزيون ما يبلع حروف
    }
    return names.length;
  }

  // ---------- قطع الاتصال / نسيان الجهاز ----------
  disconnect({ silent = false } = {}) {
    this._generation++;
    if (this._reconnectTimer) {
      clearTimeout(this._reconnectTimer);
      this._reconnectTimer = null;
    }
    if (this.remote) {
      try {
        this.remote.stop();
      } catch {
        // remoteManager ممكن يكون ما بدأ أصلاً
      }
      this.remote.removeAllListeners();
      this.remote = null;
    }
    this.powered = null;
    this.volume = null;
    this.currentApp = null;
    if (!silent) this._setStatus("disconnected");
    else this.status = "disconnected";
  }

  forget(host) {
    host = host || this.host;
    const s = readStore();
    if (s.devices) delete s.devices[host];
    if (s.lastHost === host) delete s.lastHost;
    writeStore(s);
    if (this.host === host) this.disconnect();
    return this.state();
  }
}

module.exports = { TvController, readStore };

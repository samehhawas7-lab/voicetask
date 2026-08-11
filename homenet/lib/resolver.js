"use strict";
// ============================================================
// resolver.js — خادم DNS للبيت.
//
// كل جهاز في الشبكة يسأل هذا الخادم قبل أن يفتح أي موقع.
// فنسجّل السؤال، ونطبّق القواعد: إما نردّ بعنوان صفري (حجب)
// أو نمرّر السؤال إلى خادم عام (1.1.1.1) ونعيد جوابه كما هو.
// ============================================================

const dgram = require("dgram");
const net = require("net");
const dnsm = require("./dns");
const store = require("./store");
const policy = require("./policy");
const devices = require("./devices");
const notify = require("./notify");
const { SAFE_SEARCH, CATEGORIES } = require("./categories");

const QUERY_TIMEOUT = 2500;

// نطاقات ضوضاء الشبكة المحلية: نمرّرها بلا تسجيل حتى لا يغرق السجل
const NOISE = /(\.arpa|\.local|\.lan|\.home|\.internal|\.localdomain)$/;

// ---------- مجمع الخوادم الأعلى ----------
class Upstream {
  constructor() {
    this.sock = dgram.createSocket("udp4");
    this.pending = new Map();
    this.nextId = 1;
    this.sock.on("message", (buf) => {
      if (buf.length < 2) return;
      const id = buf.readUInt16BE(0);
      const p = this.pending.get(id);
      if (!p) return;
      this.pending.delete(id);
      clearTimeout(p.timer);
      p.resolve(buf);
    });
    this.sock.on("error", (e) => console.error("[dns] خطأ في منفذ التحويل:", e.message));
    this.sock.bind();
    this.stats = { forwarded: 0, failed: 0, cached: 0 };
  }

  allocId() {
    for (let i = 0; i < 65535; i++) {
      const id = this.nextId;
      this.nextId = (this.nextId + 1) & 0xffff;
      if (id !== 0 && !this.pending.has(id)) return id;
    }
    throw new Error("لا توجد معرّفات شاغرة");
  }

  // صيغة الخادم: "1.1.1.1" أو "127.0.0.1#5353" لمنفذ غير قياسي
  servers() {
    const list = store.getConfig().settings.upstream;
    const raw = Array.isArray(list) && list.length ? list : ["1.1.1.1"];
    return raw.map((s) => {
      const [host, port] = String(s).split("#");
      return { host: host.trim(), port: Number(port) || 53 };
    });
  }

  // إرسال حزمة خام (بمعرّفنا نحن) وإرجاع الرد الخام
  sendRaw(buf) {
    const servers = this.servers();
    const attempt = (i) => new Promise((resolve, reject) => {
      if (i >= servers.length) return reject(new Error("كل الخوادم الأعلى لم تُجب"));
      const id = this.allocId();
      const out = Buffer.from(buf);
      out.writeUInt16BE(id, 0);
      const timer = setTimeout(() => {
        this.pending.delete(id);
        this.stats.failed++;
        attempt(i + 1).then(resolve, reject);
      }, QUERY_TIMEOUT);
      this.pending.set(id, { resolve, reject, timer });
      this.sock.send(out, servers[i].port, servers[i].host, (err) => {
        if (err) {
          clearTimeout(timer);
          this.pending.delete(id);
          attempt(i + 1).then(resolve, reject);
        } else this.stats.forwarded++;
      });
    });
    return attempt(0);
  }

  // سؤال جديد من عندنا (نستخدمه للبحث الآمن)
  async lookup(name, type) {
    const q = dnsm.buildQuery(0, name, type);
    const res = await this.sendRaw(q);
    const msg = dnsm.parseMessage(res);
    if (!msg) return null;
    return dnsm.extractAddresses(res, msg);
  }
}

// ---------- ذاكرة مؤقتة ----------
class Cache {
  constructor(max = 8000) { this.map = new Map(); this.max = max; }
  get(key) {
    const hit = this.map.get(key);
    if (!hit) return null;
    if (hit.exp < Date.now()) { this.map.delete(key); return null; }
    return hit.buf;
  }
  set(key, buf, ttl) {
    if (this.map.size >= this.max) {
      const first = this.map.keys().next().value;
      this.map.delete(first);
    }
    this.map.set(key, { buf: Buffer.from(buf), exp: Date.now() + ttl * 1000 });
  }
  clear() { this.map.clear(); }
  get size() { return this.map.size; }
}

// ---------- الخادم ----------
class DnsServer {
  constructor({ port = 53, host = "0.0.0.0" } = {}) {
    this.port = port;
    this.host = host;
    this.up = new Upstream();
    this.cache = new Cache();
    this.counters = { total: 0, blocked: 0, since: Date.now() };
  }

  start() {
    this.udp = dgram.createSocket({ type: "udp4", reuseAddr: true });
    this.udp.on("message", (buf, rinfo) => {
      this.handle(buf, rinfo.address, (out) => {
        this.udp.send(out, rinfo.port, rinfo.address, (e) => {
          if (e) console.error("[dns] فشل الرد:", e.message);
        });
      }).catch((e) => console.error("[dns] خطأ:", e.message));
    });
    this.udp.on("error", (e) => {
      console.error("[dns] تعذّر تشغيل خادم DNS:", e.message);
      if (e.code === "EACCES") console.error("      المنفذ ٥٣ يحتاج صلاحيات: شغّل بـ sudo أو استخدم HOMENET_DNS_PORT=5335");
      if (e.code === "EADDRINUSE") console.error("      المنفذ ٥٣ مشغول: أوقف systemd-resolved أو أي خادم DNS آخر (راجع README).");
      process.exitCode = 1;
    });
    this.udp.bind(this.port, this.host, () => {
      console.log(`[dns] خادم DNS يستمع على ${this.host}:${this.port} (UDP)`);
    });

    // بعض الأجهزة تسأل عبر TCP (أو عند الردود الطويلة)
    this.tcp = net.createServer((sock) => {
      sock.setTimeout(10000, () => sock.destroy());
      let buf = Buffer.alloc(0);
      sock.on("data", (chunk) => {
        buf = Buffer.concat([buf, chunk]);
        while (buf.length >= 2) {
          const len = buf.readUInt16BE(0);
          if (buf.length < 2 + len) break;
          const msg = buf.subarray(2, 2 + len);
          buf = buf.subarray(2 + len);
          this.handle(msg, sock.remoteAddress, (out) => {
            const head = Buffer.alloc(2);
            head.writeUInt16BE(out.length, 0);
            if (!sock.destroyed) sock.write(Buffer.concat([head, out]));
          }).catch(() => sock.destroy());
        }
      });
      sock.on("error", () => sock.destroy());
    });
    this.tcp.on("error", (e) => console.error("[dns] TCP:", e.message));
    this.tcp.listen(this.port, this.host);
  }

  async handle(buf, clientIp, reply) {
    const msg = dnsm.parseMessage(buf);
    if (!msg || !msg.question || msg.isResponse) return;
    const domain = msg.question.name;
    const ip = devices.cleanIp(clientIp);

    this.counters.total++;

    // ضوضاء الشبكة المحلية: مرّرها بلا تسجيل
    if (!domain || !domain.includes(".") || NOISE.test(domain)) {
      return this.forward(buf, msg, reply);
    }

    const dev = devices.resolve(ip);
    devices.learnKind(dev, domain);

    const verdict = policy.decide(domain, dev);

    const ev = {
      ip,
      dev: dev.id,
      name: devices.displayName(dev),
      q: domain,
      ty: msg.question.typeName,
      act: verdict.action,
      why: verdict.why,
      cat: verdict.cat || "",
      label: verdict.label || "",
    };
    store.addEvent(ev);

    if (verdict.action === "block") {
      this.counters.blocked++;
      if (policy.isDangerous(verdict.cat) && verdict.why !== "paused") {
        const alert = {
          dev: dev.id,
          name: devices.displayName(dev),
          ip,
          q: domain,
          cat: verdict.cat,
          catLabel: CATEGORIES[verdict.cat] ? CATEGORIES[verdict.cat].label : verdict.cat,
        };
        store.addAlert(alert);
        notify.push(alert);
      }
      return reply(dnsm.buildBlocked(buf, msg, store.getConfig().settings.blockMode));
    }

    // البحث الآمن: نعيد عنوان النسخة المقيَّدة من جوجل/يوتيوب/بينج
    const target = SAFE_SEARCH[domain];
    if (target && policy.safeSearchEnabled(dev) &&
        (msg.question.type === dnsm.TYPE.A || msg.question.type === dnsm.TYPE.AAAA)) {
      try {
        const addrs = await this.up.lookup(target, msg.question.type);
        const want = msg.question.type === dnsm.TYPE.A ? addrs.A : addrs.AAAA;
        if (want && want.length) {
          ev.safe = 1;
          return reply(dnsm.buildResponse(buf, msg, {
            answers: want.map((rdata) => ({ type: msg.question.type, ttl: 300, rdata })),
          }));
        }
        // لا يوجد عنوان من النوع المطلوب: نردّ فارغاً حتى لا يلتفّ الجهاز
        if (msg.question.type === dnsm.TYPE.AAAA) {
          ev.safe = 1;
          return reply(dnsm.buildResponse(buf, msg, { answers: [] }));
        }
      } catch { /* نكمل بالتحويل العادي */ }
    }

    return this.forward(buf, msg, reply);
  }

  async forward(buf, msg, reply) {
    const key = `${msg.question.name}|${msg.question.type}`;
    const cached = this.cache.get(key);
    if (cached) {
      const out = Buffer.from(cached);
      out.writeUInt16BE(msg.id, 0);
      // نضع سؤال العميل كما كتبه (حروف كبيرة/صغيرة) مكان المخزَّن
      if (out.length >= msg.questionEnd) buf.copy(out, 12, 12, msg.questionEnd);
      this.up.stats.cached++;
      return reply(out);
    }
    try {
      // نحوّل عبر UDP دائماً؛ ولا نلجأ إلى TCP إلا إذا جاء الرد مبتوراً
      let res = await this.up.sendRaw(buf);
      let rmsg = dnsm.parseMessage(res);
      if (rmsg && rmsg.truncated) {
        try {
          const big = await this.forwardTcp(buf);
          const bmsg = dnsm.parseMessage(big);
          if (bmsg) { res = big; rmsg = bmsg; }
        } catch { /* نكتفي بالرد المبتور: العميل سيعيد السؤال عبر TCP */ }
      }
      if (rmsg && !rmsg.truncated && res.length <= 4096 &&
          (rmsg.rcode === 0 || rmsg.rcode === 3) && rmsg.counts.qd === 1) {
        this.cache.set(key, res, dnsm.minTtl(res, rmsg, rmsg.rcode === 3 ? 60 : 300));
      }
      res.writeUInt16BE(msg.id, 0);
      reply(res);
    } catch (e) {
      reply(dnsm.buildResponse(buf, msg, { rcode: dnsm.RCODE.SERVFAIL }));
    }
  }

  forwardTcp(buf) {
    const servers = this.up.servers();
    return new Promise((resolve, reject) => {
      const sock = net.connect(servers[0].port, servers[0].host);
      let acc = Buffer.alloc(0);
      const fail = (e) => { sock.destroy(); reject(e || new Error("فشل TCP")); };
      sock.setTimeout(QUERY_TIMEOUT, fail);
      sock.on("error", fail);
      sock.on("connect", () => {
        const head = Buffer.alloc(2);
        head.writeUInt16BE(buf.length, 0);
        sock.write(Buffer.concat([head, buf]));
      });
      sock.on("data", (chunk) => {
        acc = Buffer.concat([acc, chunk]);
        if (acc.length >= 2) {
          const len = acc.readUInt16BE(0);
          if (acc.length >= 2 + len) {
            sock.destroy();
            resolve(acc.subarray(2, 2 + len));
          }
        }
      });
    });
  }

  status() {
    return {
      port: this.port,
      total: this.counters.total,
      blocked: this.counters.blocked,
      since: this.counters.since,
      cache: this.cache.size,
      upstream: this.up.servers().map((s) => (s.port === 53 ? s.host : `${s.host}#${s.port}`)),
      forwarded: this.up.stats.forwarded,
      served: this.up.stats.cached,
      failed: this.up.stats.failed,
    };
  }

  stop() {
    try { this.udp && this.udp.close(); } catch { /* */ }
    try { this.tcp && this.tcp.close(); } catch { /* */ }
  }
}

module.exports = { DnsServer };

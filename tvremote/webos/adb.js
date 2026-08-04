"use strict";
// ============================================================
// عميل ADB — التحكّم بأجهزة أندرويد عبر الشبكة
//
// لماذا ADB لا غيره؟ البروجيكتر أندرويد ١١ لكنه ليس أندرويد TV معتمداً،
// فلا يوفّر خدمة الريموت الرسمية. و ADB يعطي ما هو أوسع منها: كل زرّ،
// وتشغيل أي تطبيق، والإيقاظ من السكون — وهو مفتوح في أكثر هذه الأجهزة.
//
// البروتوكول رسائلُ ترويستها ستّ كلمات: الأمر، وسيطان، طول الحمولة،
// مجموع بايتاتها، وسحرٌ هو نفيُ الأمر بتاً. والمصافحة:
//
//   نحن  CNXN ───────────────▶
//        ◀─────────────── AUTH(1, رمز عشوائي)
//   نحن  AUTH(2, توقيع الرمز) ▶     (إن عرف مفتاحنا)
//        ◀─────────────── AUTH(1) مرة أخرى إن أنكره
//   نحن  AUTH(3, مفتاحنا العام) ▶   فتظهر رسالة الإذن على الشاشة
//        ◀─────────────── CNXN     بعد موافقة صاحب البيت
//
// المفتاح يُولَّد مرة ويُحفظ، فلا يُسأل صاحب البيت إلا في أول مرة.
// ============================================================

const net = require("net");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { harden } = require("./secure");

const CMD = {
  CNXN: 0x4e584e43, AUTH: 0x48545541, OPEN: 0x4e45504f,
  OKAY: 0x59414b4f, CLSE: 0x45534c43, WRTE: 0x45545257,
};
const MAXDATA = 256 * 1024;
const KEY_FILE = path.join(__dirname, "adbkey.pem");

// ---------- المفتاح ----------
function loadKey() {
  try {
    return crypto.createPrivateKey(fs.readFileSync(KEY_FILE, "utf8"));
  } catch {
    const { privateKey } = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
    const pem = privateKey.export({ type: "pkcs1", format: "pem" });
    try {
      fs.writeFileSync(KEY_FILE, pem, { mode: 0o600 });
      harden(KEY_FILE);   // 0600 لا حكم لها على ويندوز — انظر secure.js
    } catch {}
    return crypto.createPrivateKey(pem);
  }
}

// أندرويد يوقّع بـ PKCS#1 v1.5 على ملخّص SHA1 جاهز، فنُلحق بادئة
// DigestInfo بأنفسنا — الرمز الوارد هو الملخّص نفسه لا نصٌّ يُلخَّص
const SHA1_DIGEST_INFO = Buffer.from("3021300906052b0e03021a05000414", "hex");

function signToken(key, token) {
  return crypto.privateEncrypt(
    { key, padding: crypto.constants.RSA_PKCS1_PADDING },
    Buffer.concat([SHA1_DIGEST_INFO, token])
  );
}

// صيغة المفتاح العام في أندرويد بنيةٌ خاصّة به لا PEM: طولٌ بالكلمات،
// ومقلوب الكلمة الأولى، والمعامل ومربّع R بترتيب الكلمة الصغرى أولاً
function androidPublicKey(key) {
  const jwk = key.export({ format: "jwk" });
  const n = BigInt("0x" + Buffer.from(jwk.n, "base64url").toString("hex"));
  const e = BigInt("0x" + Buffer.from(jwk.e, "base64url").toString("hex"));

  const WORDS = 64;                       // 2048 بت
  const B32 = 1n << 32n;
  const n0inv = B32 - modInverse(n % B32, B32);
  const rr = (1n << BigInt(32 * WORDS * 2)) % n;

  const buf = Buffer.alloc(4 + 4 + WORDS * 4 + WORDS * 4 + 4);
  let o = 0;
  buf.writeUInt32LE(WORDS, o); o += 4;
  buf.writeUInt32LE(Number(n0inv), o); o += 4;
  for (let i = 0, v = n;  i < WORDS; i++, v >>= 32n) { buf.writeUInt32LE(Number(v & 0xffffffffn), o); o += 4; }
  for (let i = 0, v = rr; i < WORDS; i++, v >>= 32n) { buf.writeUInt32LE(Number(v & 0xffffffffn), o); o += 4; }
  buf.writeUInt32LE(Number(e), o);

  return Buffer.from(buf.toString("base64") + " kmc-remote\0", "ascii");
}

function modInverse(a, m) {
  let [old_r, r] = [a, m], [old_s, s] = [1n, 0n];
  while (r !== 0n) {
    const q = old_r / r;
    [old_r, r] = [r, old_r - q * r];
    [old_s, s] = [s, old_s - q * s];
  }
  return ((old_s % m) + m) % m;
}

// ---------- الرسائل ----------
function pack(command, arg0, arg1, data) {
  const payload = data ? (Buffer.isBuffer(data) ? data : Buffer.from(data, "binary")) : Buffer.alloc(0);
  const head = Buffer.alloc(24);
  head.writeUInt32LE(command >>> 0, 0);
  head.writeUInt32LE(arg0 >>> 0, 4);
  head.writeUInt32LE(arg1 >>> 0, 8);
  head.writeUInt32LE(payload.length, 12);
  let sum = 0; for (const b of payload) sum = (sum + b) >>> 0;
  head.writeUInt32LE(sum, 16);
  head.writeUInt32LE((command ^ 0xffffffff) >>> 0, 20);
  return Buffer.concat([head, payload]);
}

/**
 * جلسة ADB واحدة تُفتح وتُغلق لكل أمر.
 * الاتصال الدائم أسرع، لكن هذه الأجهزة تقطعه عند السكون بلا إشعار،
 * فيبقى الخادم يظنّه حيّاً. وفتحُ مقبس يستغرق أقلّ من عُشر ثانية.
 */
function session(host, port = 5555, timeout = 8000) {
  return new Promise((resolve, reject) => {
    const key = loadKey();
    const sock = new net.Socket();
    let buf = Buffer.alloc(0);
    let settled = false;
    let sentPubKey = false;

    // مجارٍ متعدّدة على اتّصالٍ واحد: لكلّ أمرٍ رقمُه، فلا تلزم
    // مصافحةٌ جديدة لكلّ ضغطة زرّ
    const streams = new Map();
    let nextId = 1;

    const api = {
      connected: false,
      alive: true,
      onConnect: null,
      onOpenOk: null,
      onData: null,
      onClose: null,
      send: (m) => sock.write(m),
      end: () => { api.alive = false; try { sock.end(); } catch {} },
      /** ينفّذ أمراً على هذا الاتّصال ويعيد مخرجاته */
      exec: (command, ms = 6000) => new Promise((res) => {
        const id = ++nextId;
        const st = { out: "", done: false, timer: null };
        st.finish = () => {
          if (st.done) return;
          st.done = true;
          clearTimeout(st.timer);
          streams.delete(id);
          res(st.out.trim());
        };
        st.timer = setTimeout(st.finish, ms);
        streams.set(id, st);
        try { sock.write(pack(CMD.OPEN, id, 0, "shell:" + command + "\0")); }
        catch (e) { st.finish(); }
      }),
    };

    const fail = (e) => { if (!settled) { settled = true; try { sock.destroy(); } catch {} reject(e); } };
    const timer = setTimeout(() => fail(new Error("انتهت المهلة قبل ردّ الجهاز")), timeout);

    sock.setTimeout(timeout);
    sock.once("timeout", () => fail(new Error("انتهت المهلة")));
    sock.once("error", (e) => fail(new Error(e.code === "ECONNREFUSED"
      ? "المنفذ 5555 مغلق — فعّل «تصحيح USB عبر الشبكة» من خيارات المطوّر"
      : e.message)));

    sock.connect(port, host, () => {
      sock.write(pack(CMD.CNXN, 0x01000000, MAXDATA, "host::features=shell_v2,cmd\0"));
    });

    sock.on("data", (chunk) => {
      buf = Buffer.concat([buf, chunk]);
      while (buf.length >= 24) {
        const len = buf.readUInt32LE(12);
        if (buf.length < 24 + len) break;
        const cmd = buf.readUInt32LE(0);
        const arg0 = buf.readUInt32LE(4);
        const arg1 = buf.readUInt32LE(8);
        const data = buf.slice(24, 24 + len);
        buf = buf.slice(24 + len);

        if (cmd === CMD.AUTH && arg0 === 1) {
          if (!sentPubKey) {
            // نجرّب التوقيع أولاً، فإن أنكره الجهاز أرسلنا المفتاح العام
            // وعندها تظهر رسالة الإذن على شاشته
            sock.write(pack(CMD.AUTH, 2, 0, signToken(key, data)));
            sentPubKey = "signed";
          } else if (sentPubKey === "signed") {
            sock.write(pack(CMD.AUTH, 3, 0, androidPublicKey(key)));
            sentPubKey = "pubkey";
          } else {
            fail(new Error("رفض الجهاز المفتاح — وافق على رسالة «السماح بتصحيح USB» على شاشته"));
          }
          continue;
        }
        if (cmd === CMD.CNXN) {
          clearTimeout(timer);
          settled = true;
          api.connected = true;
          api.banner = data.toString("ascii").replace(/\0+$/, "");
          resolve(api);
          continue;
        }
        if (cmd === CMD.OKAY && api.onOpenOk) { api.onOpenOk(arg0, arg1); continue; }
        if (cmd === CMD.WRTE) {
          sock.write(pack(CMD.OKAY, arg1, arg0));
          const st = streams.get(arg1);
          if (st) st.out += data.toString("utf8");
          else if (api.onData) api.onData(data);
          continue;
        }
        if (cmd === CMD.CLSE) {
          const st = streams.get(arg1);
          if (st) st.finish();
          else if (api.onClose) api.onClose();
          continue;
        }
      }
    });

    sock.on("close", () => {
      api.alive = false;
      // ما بقي من مجارٍ معلّقة يُنهى، وإلا انتظر من طلبها مهلتَه كاملة
      for (const st of streams.values()) st.finish();
      if (api.onClose) api.onClose();
      fail(new Error("أُغلق الاتصال"));
    });
  });
}

// ============================================================
// اتّصالٌ محفوظ، وطابورٌ صارم
//
// **لماذا؟** كانت كلُّ ضغطة زرّ تفتح اتّصالاً جديداً بمصافحةٍ
// وتوقيعٍ كاملين. فالسهمُ يأخذ ثانية، والضغطُ السريع يفتح اتّصالاتٍ
// متوازية على جهازٍ صغير لا يحتمل إلا القليل — فيتعثّر ويتجمّد،
// وتصل الضغطات في غير أوانها.
//
// فصار الاتّصال يُفتح مرّةً ويُعاد استعماله، والأوامر تُصفّ واحداً
// بعد واحد. ويُغلق بعد سكونٍ قصير فلا يُمسك الجهاز أبداً.
// ============================================================
const pool = new Map();          // "host:port" -> { s, idle }
let chain = Promise.resolve();
const IDLE_MS = 20000;

async function getSession(host, port) {
  const k = host + ":" + port;
  const held = pool.get(k);
  if (held && held.s.alive) {
    clearTimeout(held.idle);
    held.idle = setTimeout(() => { pool.delete(k); try { held.s.end(); } catch {} }, IDLE_MS);
    if (held.idle.unref) held.idle.unref();
    return held.s;
  }
  const s = await session(host, port);
  const entry = { s, idle: null };
  entry.idle = setTimeout(() => { pool.delete(k); try { s.end(); } catch {} }, IDLE_MS);
  if (entry.idle.unref) entry.idle.unref();
  pool.set(k, entry);
  return s;
}

/**
 * ينفّذ أمر صدفة على الجهاز ويعيد مخرجاته.
 * والأوامر تُصفّ: لا يُرسَل أمرٌ حتى يفرغ الذي قبله.
 */
function shell(host, command, port = 5555) {
  const run = chain.then(async () => {
    try {
      const s = await getSession(host, port);
      return await s.exec(command);
    } catch (e) {
      // الاتّصال المحفوظ قد يكون مات بين الطلبين — نجرّب مرّةً بجديد
      pool.delete(host + ":" + port);
      const s = await getSession(host, port);
      return await s.exec(command);
    }
  });
  chain = run.then(() => {}, () => {});
  return run;
}

/** يفحص إن كان الجهاز مفتوحاً لنا، ويعيد وصفه */
async function probe(host, port = 5555) {
  try {
    const s = await session(host, port, 6000);
    const banner = s.banner || "";
    s.end();
    return { ok: true, banner };
  } catch (e) {
    return { ok: false, why: e.message };
  }
}

module.exports = { shell, probe, session, KEY_FILE };

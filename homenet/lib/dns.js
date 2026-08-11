"use strict";
// ============================================================
// dns.js — قراءة رسائل DNS وبناؤها من الحزمة الخام مباشرة.
// ما نستخدم مكتبات خارجية: صيغة DNS ثابتة من RFC 1035 وواضحة.
// ============================================================

const TYPE = {
  A: 1, NS: 2, CNAME: 5, SOA: 6, PTR: 12, MX: 15, TXT: 16,
  AAAA: 28, SRV: 33, OPT: 41, HTTPS: 65, ANY: 255,
};
const TYPE_NAME = Object.fromEntries(Object.entries(TYPE).map(([k, v]) => [v, k]));

const RCODE = { OK: 0, FORMERR: 1, SERVFAIL: 2, NXDOMAIN: 3, REFUSED: 5 };

// ---------- قراءة اسم مع دعم الضغط (المؤشرات) ----------
function readName(buf, off) {
  const labels = [];
  let jumped = false;
  let end = off;
  let guard = 0;
  while (off < buf.length) {
    if (guard++ > 128) throw new Error("اسم DNS معطوب (دوران في المؤشرات)");
    const len = buf[off];
    if (len === 0) {
      off += 1;
      if (!jumped) end = off;
      break;
    }
    if ((len & 0xc0) === 0xc0) {
      if (off + 1 >= buf.length) throw new Error("مؤشر ناقص");
      const ptr = ((len & 0x3f) << 8) | buf[off + 1];
      if (!jumped) { end = off + 2; jumped = true; }
      off = ptr;
      continue;
    }
    if (off + 1 + len > buf.length) throw new Error("تسمية خارج حدود الحزمة");
    labels.push(buf.toString("latin1", off + 1, off + 1 + len));
    off += 1 + len;
    if (!jumped) end = off;
  }
  return { name: labels.join("."), end };
}

function encodeName(name) {
  const clean = String(name || "").replace(/\.$/, "");
  if (!clean) return Buffer.from([0]);
  const parts = clean.split(".");
  const chunks = [];
  for (const p of parts) {
    const b = Buffer.from(p, "latin1");
    if (b.length === 0 || b.length > 63) throw new Error("تسمية غير صالحة: " + p);
    chunks.push(Buffer.from([b.length]), b);
  }
  chunks.push(Buffer.from([0]));
  return Buffer.concat(chunks);
}

// ---------- تحليل رسالة: نكتفي بالترويسة وأول سؤال ----------
function parseMessage(buf) {
  if (!buf || buf.length < 12) return null;
  const id = buf.readUInt16BE(0);
  const flags = buf.readUInt16BE(2);
  const counts = {
    qd: buf.readUInt16BE(4),
    an: buf.readUInt16BE(6),
    ns: buf.readUInt16BE(8),
    ar: buf.readUInt16BE(10),
  };
  if (counts.qd < 1) return { id, flags, counts, question: null, questionEnd: 12 };
  const { name, end } = readName(buf, 12);
  if (end + 4 > buf.length) return null;
  const type = buf.readUInt16BE(end);
  const klass = buf.readUInt16BE(end + 2);
  return {
    id, flags, counts,
    question: { name: name.toLowerCase(), type, klass, typeName: TYPE_NAME[type] || String(type) },
    questionEnd: end + 4,
    isResponse: (flags & 0x8000) !== 0,
    truncated: (flags & 0x0200) !== 0,
    rcode: flags & 0x000f,
  };
}

// ---------- المرور على سجلات الإجابة ----------
function* iterAnswers(buf, msg) {
  let off = msg.questionEnd;
  // نتخطى بقية الأسئلة إن وُجدت (نادر)
  for (let i = 1; i < msg.counts.qd; i++) {
    const r = readName(buf, off);
    off = r.end + 4;
  }
  for (let i = 0; i < msg.counts.an; i++) {
    if (off + 1 > buf.length) return;
    const r = readName(buf, off);
    off = r.end;
    if (off + 10 > buf.length) return;
    const type = buf.readUInt16BE(off);
    const klass = buf.readUInt16BE(off + 2);
    const ttl = buf.readUInt32BE(off + 4);
    const rdlen = buf.readUInt16BE(off + 8);
    const rdStart = off + 10;
    if (rdStart + rdlen > buf.length) return;
    yield { name: r.name, type, klass, ttl, rdata: buf.subarray(rdStart, rdStart + rdlen) };
    off = rdStart + rdlen;
  }
}

// أقل TTL في الإجابة — نستخدمه لعمر الذاكرة المؤقتة
function minTtl(buf, msg, fallback = 60) {
  let min = Infinity;
  try {
    for (const rr of iterAnswers(buf, msg)) if (rr.ttl < min) min = rr.ttl;
  } catch { /* حزمة غريبة: نكتفي بالافتراضي */ }
  if (!isFinite(min)) return fallback;
  return Math.max(10, Math.min(min, 3600));
}

// استخراج العناوين (A/AAAA) من رد جاهز
function extractAddresses(buf, msg) {
  const out = { A: [], AAAA: [], ttl: 300 };
  try {
    for (const rr of iterAnswers(buf, msg)) {
      if (rr.type === TYPE.A && rr.rdata.length === 4) {
        out.A.push(Buffer.from(rr.rdata));
        out.ttl = Math.max(30, Math.min(out.ttl, rr.ttl || 300));
      } else if (rr.type === TYPE.AAAA && rr.rdata.length === 16) {
        out.AAAA.push(Buffer.from(rr.rdata));
        out.ttl = Math.max(30, Math.min(out.ttl, rr.ttl || 300));
      }
    }
  } catch { /* تجاهل */ }
  return out;
}

// ---------- بناء رد على سؤال قائم ----------
// نعيد استخدام قسم السؤال كما جاء، ونشير إليه بالمؤشر 0xC00C.
function buildResponse(reqBuf, msg, { rcode = 0, answers = [] } = {}) {
  const qSection = reqBuf.subarray(12, msg.questionEnd);
  const head = Buffer.alloc(12);
  head.writeUInt16BE(msg.id, 0);
  const flags =
    0x8000 |                    // QR: هذا رد
    (msg.flags & 0x7800) |      // نفس الـ opcode
    0x0400 |                    // AA: جواب من عندنا
    (msg.flags & 0x0100) |      // RD كما طلبه العميل
    0x0080 |                    // RA: نحن ندعم التحويل
    (rcode & 0x000f);
  head.writeUInt16BE(flags, 2);
  head.writeUInt16BE(1, 4);
  head.writeUInt16BE(answers.length, 6);
  head.writeUInt16BE(0, 8);
  head.writeUInt16BE(0, 10);

  const parts = [head, qSection];
  for (const a of answers) {
    const rr = Buffer.alloc(12 + a.rdata.length);
    rr.writeUInt16BE(0xc00c, 0);            // مؤشر إلى اسم السؤال
    rr.writeUInt16BE(a.type, 2);
    rr.writeUInt16BE(1, 4);                 // IN
    rr.writeUInt32BE(a.ttl >>> 0, 6);
    rr.writeUInt16BE(a.rdata.length, 10);
    a.rdata.copy(rr, 12);
    parts.push(rr);
  }
  return Buffer.concat(parts);
}

// رد الحجب: عنوان صفري يسقط الاتصال فوراً بدل انتظار المهلة
const ZERO_V4 = Buffer.from([0, 0, 0, 0]);
const ZERO_V6 = Buffer.alloc(16);

function buildBlocked(reqBuf, msg, mode = "zero") {
  const q = msg.question;
  if (mode === "nxdomain") return buildResponse(reqBuf, msg, { rcode: RCODE.NXDOMAIN });
  if (q.type === TYPE.A) {
    return buildResponse(reqBuf, msg, { answers: [{ type: TYPE.A, ttl: 60, rdata: ZERO_V4 }] });
  }
  if (q.type === TYPE.AAAA) {
    return buildResponse(reqBuf, msg, { answers: [{ type: TYPE.AAAA, ttl: 60, rdata: ZERO_V6 }] });
  }
  // بقية الأنواع: رد فارغ ناجح (NODATA) — أهدأ من الخطأ
  return buildResponse(reqBuf, msg, { rcode: RCODE.OK });
}

// بناء سؤال جديد (نستخدمه في إعادة التوجيه للبحث الآمن)
function buildQuery(id, name, type) {
  const head = Buffer.alloc(12);
  head.writeUInt16BE(id, 0);
  head.writeUInt16BE(0x0100, 2); // RD
  head.writeUInt16BE(1, 4);
  const qn = encodeName(name);
  const tail = Buffer.alloc(4);
  tail.writeUInt16BE(type, 0);
  tail.writeUInt16BE(1, 2);
  return Buffer.concat([head, qn, tail]);
}

function ipToString(rdata) {
  if (rdata.length === 4) return Array.from(rdata).join(".");
  if (rdata.length === 16) {
    const p = [];
    for (let i = 0; i < 16; i += 2) p.push(rdata.readUInt16BE(i).toString(16));
    return p.join(":").replace(/(^|:)(0:)+/, "::").replace(/:{3,}/, "::");
  }
  return "";
}

module.exports = {
  TYPE, TYPE_NAME, RCODE,
  readName, encodeName, parseMessage, iterAnswers, minTtl,
  extractAddresses, buildResponse, buildBlocked, buildQuery, ipToString,
};

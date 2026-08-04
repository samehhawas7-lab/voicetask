"use strict";
// ============================================================
// كشفُ أجهزة Tuya في الشبكة — بلا تخمين
//
// **لماذا؟** ملصقُ غسّالة الصحون يقول «TSmartLife»، وتطبيق المكيّف
// اسمه «ماندو». وكلاهما — على الأرجح — تطبيقُ Tuya أُعيدت تسميته،
// وذلك شأنُ أكثر المصانع.
//
// **والأرجحُ ليس معلوماً.** فبدل أن أبني على ظنّ، أُنصت لما تقوله
// الأجهزة عن نفسها: كلُّ جهاز Tuya يبثّ في الشبكة كلَّ بضع ثوانٍ
// بطاقةً فيها معرِّفه وعنوانه ونسخة بروتوكوله. فمن بثَّ فهو Tuya
// يقيناً، ومن لم يبثّ لم يُدَّعَ عليه شيء.
//
// والبثُّ على منفذين:
//   • ٦٦٦٦ — نصٌّ صريح (النسخة ٣٫١)
//   • ٦٦٦٧ — مشفَّر بمفتاحٍ ثابتٍ معلوم (٣٫٣ فما فوق)
//
// والمفتاح ليس سرّاً ولا يفتح جهازاً: هو مفتاحُ البطاقة المعلنة
// وحدها، منشورٌ في وثائق Tuya وفي كل مكتبةٍ تتكلّمها. ولا يُغني عن
// مفتاح الجهاز الخاصّ الذي يلزم للتحكّم.
// ============================================================

const dgram = require("dgram");
const crypto = require("crypto");

const PORTS = [6666, 6667];
// md5("yGAdlopoPVldABfn") — مفتاحُ البثّ المعلَن، لا مفتاحُ جهاز
const UDP_KEY = crypto.createHash("md5").update("yGAdlopoPVldABfn").digest();

/** يفكّ بطاقةً مبثوثة: نصّاً صريحاً أو مشفّرة */
function decode(buf) {
  // ترويسة Tuya: 55AA … 0000AA55
  let body = buf;
  if (buf.length > 20 && buf.readUInt32BE(0) === 0x000055aa) {
    const len = buf.readUInt32BE(12);
    body = buf.slice(20, 16 + len - 8);          // بلا CRC ولا ذيل
  }
  const asText = body.toString("utf8");
  if (asText.trim().startsWith("{")) {
    try { return JSON.parse(asText); } catch { /* نجرّب فكّ التشفير */ }
  }
  try {
    const d = crypto.createDecipheriv("aes-128-ecb", UDP_KEY, null);
    d.setAutoPadding(false);
    let out = Buffer.concat([d.update(body), d.final()]).toString("utf8");
    out = out.replace(/[\x00-\x1f]+$/g, "").trim();
    // الحشوُ بنمط PKCS#7 يُقتطع بآخر بايت
    const i = out.lastIndexOf("}");
    if (i > 0) out = out.slice(0, i + 1);
    return JSON.parse(out);
  } catch { return null; }
}

/**
 * يُنصت المدّةَ المطلوبة ويردّ ما أعلن عن نفسه.
 * ولا يرمي إن أُغلق منفذ: يُقال في `listening` ما نجح.
 */
function sniff(ms = 15000, log = () => {}) {
  return new Promise((resolve) => {
    const found = new Map();
    const socks = [];
    const listening = [];
    let done = false;

    const finish = () => {
      if (done) return;
      done = true;
      for (const s of socks) { try { s.close(); } catch {} }
      const list = [...found.values()].sort((a, b) => a.ip.localeCompare(b.ip));
      log("tuya: " + list.length + " device(s) announced themselves");
      resolve({ ok: true, devices: list, listening, seconds: Math.round(ms / 1000) });
    };

    for (const port of PORTS) {
      let sock;
      try { sock = dgram.createSocket({ type: "udp4", reuseAddr: true }); }
      catch { continue; }
      socks.push(sock);
      sock.on("error", () => { try { sock.close(); } catch {} });
      sock.on("message", (msg, rinfo) => {
        const j = decode(msg);
        if (!j || !j.gwId) return;
        const id = String(j.gwId);
        if (!found.has(id)) {
          log("tuya: " + id.slice(0, 8) + "… at " + (j.ip || rinfo.address) +
              " (v" + (j.version || "?") + ")");
        }
        found.set(id, {
          id,
          ip: j.ip || rinfo.address,
          version: String(j.version || ""),
          product: j.productKey || "",
          // `active` و`ability` تصفان حال الاقتران، ونعرضهما كما جاءا
          active: j.active,
          encrypt: j.encrypt !== false,
          port,
        });
      });
      try {
        sock.bind(port, () => { listening.push(port); });
      } catch { /* منفذٌ مشغول — نكتفي بالآخر */ }
    }

    if (!socks.length) return resolve({ ok: false, why: "تعذّر فتح المنافذ", devices: [] });
    const t = setTimeout(finish, ms);
    if (t.unref) t.unref();
  });
}

module.exports = { sniff, decode, PORTS };

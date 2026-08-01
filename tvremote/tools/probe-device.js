"use strict";
// ============================================================
// فاحص جهاز — أي قناة تحكّم يفتحها؟
//
// قبل كتابة سطر واحد للتحكم بجهاز جديد يلزم معرفة ما يقبله. الأجهزة
// الأندرويدية الرخيصة تختلف اختلافاً بيّناً: بعضها يفتح ADB على الشبكة،
// وبعضها خدمة ريموت أندرويد المعتمدة، وبعضها لا يفتح شيئاً.
//
// ولا يكفي أن يكون المنفذ مفتوحاً: كثير من المنافذ تُفتح لخدمات أخرى.
// فنصافح ADB بحزمة CNXN حقيقية، ونصافح 6467 بـ TLS — فلا نبني على ظنّ.
//
// التشغيل:
//   node probe-device.js 192.168.8.13
//
// شغّله مرّتين: والجهاز يعمل، ثم وهو مطفأ. الفرق يخبرنا هل تبقى بطاقة
// شبكته مستيقظة في السكون — وعليه يتوقّف إمكان إيقاظه.
// ============================================================

const net = require("net");
const tls = require("tls");
const { exec } = require("child_process");

const IP = process.argv[2] || "";
if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(IP)) {
  console.log("الاستعمال:  node probe-device.js 192.168.8.13");
  process.exit(1);
}

const PORTS = [
  [5555, "ADB على الشبكة",            "تحكّم كامل: أزرار، تشغيل تطبيقات، إيقاظ"],
  [5037, "خادم ADB",                  "غير معتاد على جهاز"],
  [6466, "ريموت أندرويد (أوامر)",     "أزرار ونصّ — القناة المعتمدة"],
  [6467, "ريموت أندرويد (إقران)",     "يلزم لأول ربط"],
  [8009, "Cast",                      "بثّ فيديو لا تحكّم بالأزرار"],
  [8008, "Cast (إعدادات)",            "معلومات الجهاز"],
  [7000, "AirPlay",                   "بثّ من آيفون"],
  [8080, "واجهة ويب",                 "قد تكون فيها صفحة تحكّم"],
  [1400, "خدمة صوت",                  "—"],
  [3000, "webOS",                     "ليس أندرويد"],
  [3001, "webOS مشفّر",               "ليس أندرويد"],
];

function tcp(ip, port, timeout = 1200) {
  return new Promise((res) => {
    const s = new net.Socket();
    let done = false;
    const end = (ok) => { if (!done) { done = true; s.destroy(); res(ok); } };
    s.setTimeout(timeout);
    s.once("connect", () => end(true));
    s.once("timeout", () => end(false));
    s.once("error", () => end(false));
    s.connect(port, ip);
  });
}

// حزمة CNXN الحقيقية: ترويسة من ستّ كلمات، والسحر نفيُ الأمر بتاً
function adbHandshake(ip, port = 5555, timeout = 4000) {
  return new Promise((res) => {
    const payload = Buffer.from("host::\0", "ascii");
    const head = Buffer.alloc(24);
    const CMD = 0x4e584e43;                       // "CNXN"
    head.writeUInt32LE(CMD, 0);
    head.writeUInt32LE(0x01000000, 4);            // إصدار البروتوكول
    head.writeUInt32LE(256 * 1024, 8);            // أقصى حجم رسالة
    head.writeUInt32LE(payload.length, 12);
    let sum = 0; for (const b of payload) sum = (sum + b) >>> 0;
    head.writeUInt32LE(sum, 16);
    head.writeUInt32LE((CMD ^ 0xffffffff) >>> 0, 20);

    const s = new net.Socket();
    let done = false;
    const end = (v) => { if (!done) { done = true; s.destroy(); res(v); } };
    s.setTimeout(timeout);
    s.once("timeout", () => end(null));
    s.once("error", () => end(null));
    s.connect(port, ip, () => s.write(Buffer.concat([head, payload])));
    s.once("data", (d) => {
      if (d.length < 4) return end(null);
      const cmd = d.readUInt32LE(0);
      if (cmd === 0x48545541) return end("AUTH");   // يطلب موافقة على الجهاز
      if (cmd === CMD)        return end("CNXN");   // قَبِل فوراً
      end("رد غير مفهوم");
    });
  });
}

function tlsHello(ip, port, timeout = 4000) {
  return new Promise((res) => {
    const s = tls.connect({ host: ip, port, rejectUnauthorized: false, timeout }, () => {
      const c = s.getPeerCertificate();
      s.destroy();
      res(c && c.subject ? (c.subject.CN || "شهادة بلا اسم") : "TLS بلا شهادة");
    });
    s.once("timeout", () => { s.destroy(); res(null); });
    s.once("error", () => res(null));
  });
}

function mac(ip) {
  return new Promise((res) => {
    const cmd = process.platform === "win32"
      ? `arp -a ${ip}`
      : `ip neigh show ${ip} 2>/dev/null || arp -n ${ip} 2>/dev/null`;
    exec(cmd, { timeout: 4000 }, (e, out) => {
      const m = String(out || "").match(/([0-9a-fA-F]{2}[:-]){5}[0-9a-fA-F]{2}/);
      res(m ? m[0].replace(/-/g, ":").toLowerCase() : null);
    });
  });
}

(async () => {
  console.log("");
  console.log("فحص " + IP);
  console.log("─".repeat(52));

  const up = await tcp(IP, 80, 900) || await tcp(IP, 5555, 900) ||
             await tcp(IP, 8080, 900) || await tcp(IP, 6466, 900);
  const hw = await mac(IP);

  console.log("بطاقة الشبكة: " + (hw || "لم تظهر في جدول ARP"));
  console.log("");

  const found = [];
  for (const [port, name, note] of PORTS) {
    if (!(await tcp(IP, port))) continue;
    found.push(port);
    console.log("  ✓ " + String(port).padEnd(6) + name);
    console.log("           " + note);
  }

  if (!found.length) {
    console.log("  لا منفذ مفتوح.");
    console.log("");
    console.log("  إمّا أن الجهاز مطفأ أو نائم وبطاقته معه — وعندها لا سبيل");
    console.log("  إلى إيقاظه من الشبكة، ويلزم مقبس ذكي.");
    console.log("  وإمّا أنه يعمل ولا يفتح قناة تحكّم — وعندها يلزم تفعيل");
    console.log("  «خيارات المطوّر ← تصحيح USB عبر الشبكة» من إعداداته.");
    console.log("");
    return;
  }

  console.log("");
  console.log("المصافحات:");

  if (found.includes(5555)) {
    const r = await adbHandshake(IP);
    console.log("  ADB → " + (r || "لم يردّ"));
    if (r === "AUTH") console.log("        (يطلب موافقة — ستظهر رسالة على شاشة البروجيكتر)");
    if (r === "CNXN") console.log("        (مفتوح بلا موافقة — جاهز للتحكم فوراً)");
  }
  if (found.includes(6467)) {
    const c = await tlsHello(IP, 6467);
    console.log("  إقران أندرويد → " + (c || "لم يصافح"));
  }
  if (found.includes(6466)) {
    const c = await tlsHello(IP, 6466);
    console.log("  أوامر أندرويد → " + (c || "لم يصافح"));
  }

  console.log("");
  console.log("─".repeat(52));
  if (found.includes(5555)) {
    console.log("الخلاصة: ADB مفتوح — أقوى قناة. أزرار وتطبيقات وإيقاظ من السكون.");
  } else if (found.includes(6466) || found.includes(6467)) {
    console.log("الخلاصة: خدمة ريموت أندرويد — أزرار ونصّ بعد إقران برمز على الشاشة.");
  } else {
    console.log("الخلاصة: لا قناة تحكّم. فعّل «تصحيح USB عبر الشبكة» من خيارات المطوّر.");
  }
  console.log("");
})();

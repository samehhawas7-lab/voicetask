"use strict";
// ============================================================
// إيقاظ التلفزيون وهو مطفأ — Wake-on-LAN
//
// حين يُطفأ التلفزيون تبقى بطاقة شبكته مستيقظة تنصت لحزمة واحدة
// بعينها: ستّ بايتات 0xFF يتلوها عنوانُ بطاقته ستَّ عشرةَ مرة.
// فمن أرسلها أيقظه.
//
// وهذا ما عجز عنه المتصفح: لا سبيل له إلى UDP ولا إلى البثّ العام.
// أما الخادم فيرسلها في جزء من الثانية — وهذا وحده يجعل الإطفاء
// الكامل ذا رجعة، بلا حاجة إلى الريموت الأصلي.
//
// شرطه في التلفزيون: الإعدادات ← عام ← الأجهزة ← إعدادات إضافية
//                    ← «تشغيل التلفزيون عبر Wi-Fi» أو Mobile TV On
// ============================================================

const dgram = require("dgram");
const os = require("os");
const { exec } = require("child_process");

const PORTS = [9, 7];               // منفذا الإيقاظ المتعارف عليهما

/** الحزمة السحرية: FF×6 ثم عنوان البطاقة ستّ عشرة مرة */
function magicPacket(mac) {
  const hex = String(mac).replace(/[^0-9a-fA-F]/g, "");
  if (hex.length !== 12) throw new Error("عنوان بطاقة غير صالح: " + mac);
  const addr = Buffer.from(hex, "hex");
  const pkt = Buffer.alloc(6 + 16 * 6, 0xff);
  for (let i = 0; i < 16; i++) addr.copy(pkt, 6 + i * 6);
  return pkt;
}

/** عناوين البثّ لكل شبكة موصولة، مع البثّ العام احتياطاً */
function broadcasts() {
  const out = ["255.255.255.255"];
  for (const list of Object.values(os.networkInterfaces())) {
    for (const i of list || []) {
      const fam = typeof i.family === "string" ? i.family : `IPv${i.family}`;
      if (fam !== "IPv4" || i.internal) continue;
      // بعض الأنظمة لا تعطي i.broadcast، فنحسبه من العنوان والقناع
      let b = i.broadcast;
      if (!b && i.netmask) {
        const a = i.address.split(".").map(Number);
        const m = i.netmask.split(".").map(Number);
        b = a.map((x, n) => (x & m[n]) | (~m[n] & 255)).join(".");
      }
      if (b && !out.includes(b)) out.push(b);
    }
  }
  return out;
}

/**
 * يوقظ جهازاً بعنوان بطاقته.
 * نرسل على كل شبكة وكل منفذ: الحزمة رخيصة، والتكرار يغطّي اختلاف
 * الراوترات في تمرير البثّ.
 */
function wake(mac) {
  return new Promise((resolve, reject) => {
    let pkt;
    try { pkt = magicPacket(mac); } catch (e) { return reject(e); }

    const sock = dgram.createSocket({ type: "udp4", reuseAddr: true });
    let pending = 0, sent = 0, done = false;

    const finish = () => {
      if (done) return;
      done = true;
      try { sock.close(); } catch {}
      sent ? resolve(sent) : reject(new Error("ما نجح إرسال أي حزمة"));
    };

    sock.once("error", (e) => { if (!done) { done = true; try { sock.close(); } catch {} reject(e); } });

    sock.bind(() => {
      sock.setBroadcast(true);
      const targets = broadcasts();
      pending = targets.length * PORTS.length;
      for (const ip of targets) {
        for (const port of PORTS) {
          sock.send(pkt, 0, pkt.length, port, ip, (err) => {
            if (!err) sent++;
            if (--pending === 0) finish();
          });
        }
      }
      setTimeout(finish, 2500);      // لا ننتظر إلى ما لا نهاية
    });
  });
}

/**
 * يقرأ عنوان بطاقة جهاز من جدول ARP.
 * لا يظهر فيه إلا من خاطبناه حديثاً، فيُستحسن استدعاؤه والتلفزيون شغّال
 * — ولذلك نحفظه في الإعدادات فور معرفته.
 */
function macOf(ip) {
  return new Promise((resolve) => {
    const cmd = process.platform === "win32"
      ? `arp -a ${ip}`
      : `ip neigh show ${ip} 2>/dev/null || arp -n ${ip} 2>/dev/null`;
    exec(cmd, { timeout: 4000 }, (err, out) => {
      const m = String(out || "").match(/([0-9a-fA-F]{2}[:-]){5}[0-9a-fA-F]{2}/);
      if (!m) return resolve(null);
      const mac = m[0].replace(/-/g, ":").toLowerCase();
      resolve(/^(00:){5}00$/.test(mac) ? null : mac);
    });
  });
}

module.exports = { wake, macOf, magicPacket, broadcasts };

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

/** الواجهة التي تقع في شبكة هذا العنوان — يلزم اسمها لإضافة جار ثابت */
function ifaceFor(ip) {
  const want = ip.split(".").slice(0, 3).join(".");
  for (const [name, list] of Object.entries(os.networkInterfaces())) {
    for (const i of list || []) {
      const fam = typeof i.family === "string" ? i.family : `IPv${i.family}`;
      if (fam !== "IPv4" || i.internal) continue;
      if (i.address.split(".").slice(0, 3).join(".") === want) return name;
    }
  }
  return null;
}

/**
 * يزرع جاراً ثابتاً في جدول ARP.
 *
 * لماذا؟ الجهاز المطفأ يسقط من الجدول، فلا يعرف النظام إلى أي بطاقة
 * يرسل حزمةً موجّهة إليه. والبثّ العام بديلٌ لكنه لا يعبر دائماً بين
 * تردّدي الراوتر — والتلفزيون على ٥ جيجاهرتز والخادم على ٢٫٤.
 * فبزرع الجار نستطيع أن نرسل إليه موجَّهاً كأنه حاضر.
 */
function pinNeighbour(ip, mac) {
  return new Promise((resolve) => {
    if (process.platform !== "win32") return resolve(false);
    const iface = ifaceFor(ip);
    const dashed = mac.replace(/:/g, "-");
    const tries = [];
    if (iface) tries.push(`netsh interface ipv4 add neighbors "${iface}" ${ip} ${dashed} store=active`);
    tries.push(`arp -s ${ip} ${dashed}`);
    let n = 0;
    const next = () => {
      if (n >= tries.length) return resolve(false);
      exec(tries[n++], { timeout: 4000 }, (err) => (err ? next() : resolve(true)));
    };
    next();
  });
}

/**
 * يوقظ جهازاً بعنوان بطاقته.
 *
 * ثلاث طرق مجتمعة، لأن كلًّا منها تفشل في حال:
 *   • البثّ العام 255.255.255.255 — يحجبه بعض الراوترات
 *   • بثّ الشبكة 192.168.x.255  — لا يعبر دائماً بين التردّدين
 *   • موجَّهاً إلى عنوان الجهاز  — يحتاج جاراً ثابتاً، وهو أوثقها
 *
 * وتُكرَّر دفعاتٍ على مدى ثوانٍ: بطاقةُ الجهاز النائم تستيقظ متقطّعةً
 * لتوفير الطاقة، فقد تفوتها دفعةٌ واحدة وتلتقط التالية.
 *
 * @param {string} mac
 * @param {{ip?:string, bursts?:number}} opts
 */
function wake(mac, opts = {}) {
  const { ip = "", bursts = 12 } = opts;
  let pkt;
  try { pkt = magicPacket(mac); } catch (e) { return Promise.reject(e); }

  return (ip ? pinNeighbour(ip, mac) : Promise.resolve(false)).then((pinned) =>
    new Promise((resolve, reject) => {
      const sock = dgram.createSocket({ type: "udp4", reuseAddr: true });
      const targets = broadcasts().concat(ip ? [ip] : []);
      let sent = 0, done = false;

      const finish = () => {
        if (done) return;
        done = true;
        try { sock.close(); } catch {}
        sent ? resolve({ sent, targets, pinned }) : reject(new Error("ما نجح إرسال أي حزمة"));
      };

      sock.once("error", (e) => { if (!done) { done = true; try { sock.close(); } catch {} reject(e); } });

      sock.bind(() => {
        sock.setBroadcast(true);
        let round = 0;
        const fire = () => {
          for (const host of targets) {
            for (const port of PORTS) {
              sock.send(pkt, 0, pkt.length, port, host, (err) => { if (!err) sent++; });
            }
          }
          // نمدّ الدفعات إلى نحو نصف دقيقة: بطاقةُ بعض التلفزيونات
          // تستيقظ كل بضع ثوانٍ لتصغي ثم تنام، فقد تفوتها خمس دفعات
          // متقاربة كلها. والحزمة رخيصة، والانتظار أرخص من الفشل.
          if (++round >= bursts) return setTimeout(finish, 600);
          setTimeout(fire, round <= 3 ? 700 : 3000);
        };
        fire();
      });
    })
  );
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

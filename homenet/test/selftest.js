"use strict";
// ============================================================
// اختبار ذاتي — يشغّل خادم DNS حقيقياً على منفذ تجريبي مع
// «خادم أعلى» وهمي محلي، فلا يحتاج إنترنت.
//   npm test
// ============================================================

process.env.HOMENET_DATA = require("path").join(__dirname, ".tmp-data");
require("fs").rmSync(process.env.HOMENET_DATA, { recursive: true, force: true });

const dgram = require("dgram");
const assert = require("assert");
const dnsm = require("../lib/dns");
const store = require("../lib/store");
const policy = require("../lib/policy");
const lists = require("../lib/lists");

const UP_PORT = 15353;
const SRV_PORT = 15533;
const UP_ANSWER = Buffer.from([1, 2, 3, 4]);

let pass = 0, fail = 0;
function check(name, fn) {
  try { fn(); console.log("  ✅ " + name); pass++; }
  catch (e) { console.log("  ❌ " + name + " → " + e.message); fail++; }
}
async function checkAsync(name, fn) {
  try { await fn(); console.log("  ✅ " + name); pass++; }
  catch (e) { console.log("  ❌ " + name + " → " + e.message); fail++; }
}

// ---------- خادم أعلى وهمي ----------
const upstream = dgram.createSocket("udp4");
let upstreamHits = 0;
upstream.on("message", (buf, rinfo) => {
  const msg = dnsm.parseMessage(buf);
  if (!msg || !msg.question) return;
  upstreamHits++;
  const answers = msg.question.type === dnsm.TYPE.A
    ? [{ type: dnsm.TYPE.A, ttl: 120, rdata: UP_ANSWER }]
    : [];
  upstream.send(dnsm.buildResponse(buf, msg, { answers }), rinfo.port, rinfo.address);
});

// ---------- عميل ----------
function ask(name, type = dnsm.TYPE.A, port = SRV_PORT) {
  return new Promise((resolve, reject) => {
    const sock = dgram.createSocket("udp4");
    const id = Math.floor(Math.random() * 65000) + 1;
    const q = dnsm.buildQuery(id, name, type);
    const timer = setTimeout(() => { sock.close(); reject(new Error("انتهت المهلة على " + name)); }, 3000);
    sock.on("message", (buf) => {
      clearTimeout(timer);
      sock.close();
      const msg = dnsm.parseMessage(buf);
      if (msg.id !== id) return reject(new Error("معرّف الرد لا يطابق الطلب"));
      const addrs = dnsm.extractAddresses(buf, msg);
      resolve({ msg, ip: addrs.A.length ? dnsm.ipToString(addrs.A[0]) : "", buf });
    });
    sock.on("error", reject);
    sock.send(q, port, "127.0.0.1");
  });
}

(async () => {
  console.log("\n— اختبار ترميز DNS —");
  check("قراءة اسم مع ضغط", () => {
    const q = dnsm.buildQuery(7, "sub.example.com", dnsm.TYPE.A);
    const m = dnsm.parseMessage(q);
    assert.strictEqual(m.question.name, "sub.example.com");
    assert.strictEqual(m.question.type, dnsm.TYPE.A);
    assert.strictEqual(m.id, 7);
  });
  check("بناء رد حجب بعنوان صفري", () => {
    const q = dnsm.buildQuery(9, "bad.com", dnsm.TYPE.A);
    const m = dnsm.parseMessage(q);
    const r = dnsm.buildBlocked(q, m, "zero");
    const rm = dnsm.parseMessage(r);
    assert.strictEqual(rm.isResponse, true);
    assert.strictEqual(rm.counts.an, 1);
    assert.strictEqual(dnsm.ipToString(dnsm.extractAddresses(r, rm).A[0]), "0.0.0.0");
  });
  check("رد NXDOMAIN", () => {
    const q = dnsm.buildQuery(9, "bad.com", dnsm.TYPE.A);
    const m = dnsm.parseMessage(q);
    const rm = dnsm.parseMessage(dnsm.buildBlocked(q, m, "nxdomain"));
    assert.strictEqual(rm.rcode, 3);
  });

  console.log("\n— اختبار القواعد —");
  store.load();
  policy.rebuildIndex();
  const cfg = store.getConfig();

  check("النطاقات الفرعية تتبع الأصل", () => {
    assert.strictEqual(policy.lookupCategory("cdn7.ads.pornhub.com"), "adult");
    assert.strictEqual(policy.lookupCategory("example.com"), null);
  });
  check("ملف الطفل يحجب الإباحي", () => {
    const dev = { id: "t1", profile: "child", block: [], allow: [] };
    const v = policy.decide("pornhub.com", dev);
    assert.strictEqual(v.action, "block");
    assert.strictEqual(v.cat, "adult");
  });
  check("ملف البالغ يسمح", () => {
    const dev = { id: "t2", profile: "adult", block: [], allow: [] };
    assert.strictEqual(policy.decide("pornhub.com", dev).action, "allow");
  });
  check("قائمة السماح تتقدّم على الفئة", () => {
    const dev = { id: "t3", profile: "child", block: [], allow: ["youtube.com"] };
    assert.strictEqual(policy.decide("m.youtube.com", dev).action, "allow");
  });
  check("قطع النت عن جهاز", () => {
    const dev = { id: "t4", profile: "adult", block: [], allow: [], blockedUntil: Date.now() + 60000 };
    assert.strictEqual(policy.decide("google.com", dev).why, "device-paused");
  });
  check("نافذة منع تعبر منتصف الليل", () => {
    const at = (h, m, day) => { const d = new Date(2026, 0, 5 + day); d.setHours(h, m, 0, 0); return d; };
    const win = { from: "21:00", to: "06:30", days: [0, 1, 2, 3, 4, 5, 6] };
    assert.strictEqual(policy.windowActive(win, at(22, 0, 0)), true, "٢٢:٠٠ داخل المنع");
    assert.strictEqual(policy.windowActive(win, at(2, 0, 0)), true, "٠٢:٠٠ داخل المنع");
    assert.strictEqual(policy.windowActive(win, at(12, 0, 0)), false, "الظهر مسموح");
    assert.strictEqual(policy.windowActive(win, at(6, 40, 0)), false, "بعد ٦:٣٠ مسموح");
  });
  check("نافذة محدودة بأيام", () => {
    const sun = new Date(2026, 0, 4, 22, 0); // الأحد
    const mon = new Date(2026, 0, 5, 22, 0); // الاثنين
    const win = { from: "21:00", to: "23:00", days: [1] };
    assert.strictEqual(policy.windowActive(win, sun), false);
    assert.strictEqual(policy.windowActive(win, mon), true);
  });
  check("قراءة ملف hosts", () => {
    const parsed = lists.parseList("# تعليق\n0.0.0.0 bad-site.com\n127.0.0.1 localhost\nanother.com\n0.0.0.0 x.y.com # ملاحظة");
    assert.deepStrictEqual(parsed.sort(), ["another.com", "bad-site.com", "x.y.com"]);
  });

  console.log("\n— اختبار الخادم من طرف إلى طرف —");
  cfg.settings.upstream = [`127.0.0.1#${UP_PORT}`];
  cfg.settings.newDeviceProfile = "child";
  cfg.settings.safeSearch = false;   // نختبره منفصلاً
  const child = cfg.profiles.find((p) => p.id === "child");
  child.curfew = [];                 // نطفئ وقت النوم حتى لا يحجب كل شيء أثناء الاختبار
  await new Promise((r) => upstream.bind(UP_PORT, "127.0.0.1", r));

  const { DnsServer } = require("../lib/resolver");
  const srv = new DnsServer({ port: SRV_PORT, host: "127.0.0.1" });
  srv.start();
  await new Promise((r) => setTimeout(r, 300));

  await checkAsync("موقع عادي يمرّ للخادم الأعلى", async () => {
    const r = await ask("example.com");
    assert.strictEqual(r.ip, "1.2.3.4");
  });
  await checkAsync("موقع إباحي يُحجب بعنوان صفري", async () => {
    const r = await ask("www.pornhub.com");
    assert.strictEqual(r.ip, "0.0.0.0");
  });
  await checkAsync("خادم DNS مشفّر (DoH) محجوب — لمنع الالتفاف", async () => {
    const r = await ask("cloudflare-dns.com");
    assert.strictEqual(r.ip, "0.0.0.0");
  });
  await checkAsync("الذاكرة المؤقتة تمنع تكرار السؤال للخارج", async () => {
    const before = upstreamHits;
    await ask("cached-test.com");
    const mid = upstreamHits;
    await ask("cached-test.com");
    assert.ok(mid > before, "أول سؤال يذهب للخارج");
    assert.strictEqual(upstreamHits, mid, "الثاني من الذاكرة");
  });
  await checkAsync("البحث الآمن يعيد عنوان النسخة المقيَّدة", async () => {
    store.getConfig().settings.safeSearch = true;
    srv.cache.clear();
    const r = await ask("www.google.com");
    assert.strictEqual(r.ip, "1.2.3.4", "جاء من استعلام forcesafesearch");
  });
  await checkAsync("الطلبات تُسجَّل مع الجهاز", async () => {
    const events = store.getRecent(0, 100);
    const hit = events.find((e) => e.q === "www.pornhub.com");
    assert.ok(hit, "الطلب مسجّل");
    assert.strictEqual(hit.act, "block");
    assert.strictEqual(hit.cat, "adult");
    assert.ok(hit.ip === "127.0.0.1", "عنوان الجهاز محفوظ");
  });
  await checkAsync("تنبيه لولي الأمر عند المواقع الخطرة", async () => {
    const alerts = store.getAlerts(50);
    assert.ok(alerts.some((a) => a.q === "www.pornhub.com" && a.cat === "adult"), "التنبيه موجود");
  });
  await checkAsync("وقت النوم يحجب كل شيء عن الجهاز", async () => {
    child.curfew = [{ label: "وقت النوم", from: "00:00", to: "23:59", days: [0, 1, 2, 3, 4, 5, 6] }];
    srv.cache.clear();
    const r = await ask("example.com");
    assert.strictEqual(r.ip, "0.0.0.0");
    const ev = store.getRecent(0, 50).find((e) => e.q === "example.com" && e.act === "block");
    assert.strictEqual(ev.why, "curfew");
    child.curfew = [];
  });
  await checkAsync("إيقاف النت يحجب كل شيء", async () => {
    store.getConfig().settings.paused = true;
    srv.cache.clear();
    const r = await ask("example.com");
    assert.strictEqual(r.ip, "0.0.0.0");
    store.getConfig().settings.paused = false;
  });
  await checkAsync("سؤال عبر TCP يعمل أيضاً", async () => {
    const net = require("net");
    const q = dnsm.buildQuery(555, "tcp-test.com", dnsm.TYPE.A);
    const head = Buffer.alloc(2);
    head.writeUInt16BE(q.length, 0);
    const out = await new Promise((resolve, reject) => {
      const s = net.connect(SRV_PORT, "127.0.0.1");
      let acc = Buffer.alloc(0);
      s.setTimeout(3000, () => { s.destroy(); reject(new Error("مهلة TCP")); });
      s.on("error", reject);
      s.on("connect", () => s.write(Buffer.concat([head, q])));
      s.on("data", (c) => {
        acc = Buffer.concat([acc, c]);
        if (acc.length >= 2 && acc.length >= 2 + acc.readUInt16BE(0)) {
          s.destroy();
          resolve(acc.subarray(2, 2 + acc.readUInt16BE(0)));
        }
      });
    });
    const m = dnsm.parseMessage(out);
    assert.strictEqual(m.id, 555);
    assert.strictEqual(dnsm.ipToString(dnsm.extractAddresses(out, m).A[0]), "1.2.3.4");
  });

  srv.stop();
  upstream.close();
  store.shutdown();
  require("fs").rmSync(process.env.HOMENET_DATA, { recursive: true, force: true });

  console.log(`\nالنتيجة: ${pass} ناجح، ${fail} فاشل\n`);
  process.exit(fail ? 1 : 0);
})();

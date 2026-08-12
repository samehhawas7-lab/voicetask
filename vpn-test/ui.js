// اختبار الواجهة في متصفّح حقيقيّ
const { chromium } = require("playwright");
const jsQR = require("jsqr").default || require("jsqr");
const assert = require("assert");
const { PNG } = (() => { try { return require("pngjs"); } catch { return {}; } })();

let pass = 0, fail = 0;
const check = (name, fn) => {
  try { fn(); console.log("  ✓ " + name); pass++; }
  catch (e) { console.log("  ✗ " + name + "\n      " + e.message); fail++; }
};

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "ar-EG", deviceScaleFactor: 3 });
  const page = await ctx.newPage();
  const errors = [];
  // أخطاء صفحات التطبيق وحدها — لا أخطاء الموقع التجريبيّ المفتوح عبر البوّابة
  const onApp = () => page.url().includes("/vpn.html");
  page.on("pageerror", (e) => { if (onApp()) errors.push("pageerror: " + e.message); });
  page.on("console", (m) => { if (m.type() === "error" && onApp()) errors.push("console: " + m.text()); });

  await page.goto("http://127.0.0.1:7788/vpn.html", { waitUntil: "networkidle" });

  console.log("\n== التحميل والحالة ==");
  check("العنوان", () => assert.equal(page.url().endsWith("/vpn.html"), true));
  await page.waitForFunction(() => !document.querySelector("#verdict .spin"), { timeout: 10000 });
  const verdict = await page.textContent("#verdict");
  check("ظهر حكم الحالة", () => assert.ok(verdict.length > 10, verdict));
  const gateName = await page.textContent("#gate-name");
  check("عُرضت البوّابة", () => assert.ok(gateName.trim().length > 0));

  console.log("\n== التبويبات ==");
  for (const [tab, panel] of [["browse", "#p-browse"], ["tunnel", "#p-tunnel"], ["help", "#p-help"], ["status", "#p-status"]]) {
    await page.click(`nav button[data-tab="${tab}"]`);
    const on = await page.getAttribute(panel, "class");
    check(`تبويب ${tab} يظهر`, () => assert.ok(on.includes("on"), on));
  }

  console.log("\n== دليل المواقع ==");
  await page.click('nav button[data-tab="browse"]');
  const cards = await page.$$("#catalog .site");
  check("بُنيت البطاقات", () => assert.ok(cards.length >= 15, "عدد: " + cards.length));
  const badges = await page.$$eval("#catalog .need", (els) => els.map((e) => e.textContent));
  check("وُسمت المواقع", () => assert.ok(badges.some((b) => b.includes("النفق")) && badges.some((b) => b.includes("المتصفّح"))));

  console.log("\n== توليد المفاتيح ==");
  await page.click('nav button[data-tab="tunnel"]');
  await page.click("#gen-keys");
  await page.waitForSelector("#keys-out", { state: "visible" });
  const pub = await page.inputValue("#cli-pub");
  check("مفتاح عامّ بصيغة صحيحة", () => assert.ok(/^[A-Za-z0-9+/]{43}=$/.test(pub), pub));
  const via = await page.textContent("#keys-via");
  check("ذُكر مصدر التوليد", () => assert.ok(via.includes("جهازك"), via));

  console.log("\n== التحقّق من المدخلات ==");
  const dialogs = [];
  page.on("dialog", async (d) => { dialogs.push(d.message()); await d.accept(); });
  await page.click("#build");
  check("يرفض بلا عنوان خادم", () => assert.ok(dialogs.some((d) => d.includes("عنوان الخادم")), JSON.stringify(dialogs)));

  await page.fill("#ep-host", "41.33.10.20");
  await page.fill("#srv-pub", "not-a-key");
  await page.click("#build");
  check("يرفض مفتاحاً غير صالح", () => assert.ok(dialogs.some((d) => d.includes("غير صالح")), JSON.stringify(dialogs)));

  await page.fill("#srv-pub", pub);
  await page.click("#build");
  check("يكشف خلط مفتاح الجوال بالخادم", () => assert.ok(dialogs.some((d) => d.includes("مفتاح الجوال لا الخادم"))));

  console.log("\n== بناء الإعداد والرمز ==");
  const serverPub = await page.evaluate(async () => (await window.WG.generate()).publicKey);
  await page.fill("#srv-pub", serverPub);
  await page.fill("#ep-port", "51820");
  await page.click("#build");
  await page.waitForSelector("#conf-out", { state: "visible" });
  const conf = await page.inputValue("#conf-text");
  check("الإعداد يحوي الأقسام", () => assert.ok(conf.includes("[Interface]") && conf.includes("[Peer]")));
  check("يحوي عنوان الخادم", () => assert.ok(conf.includes("Endpoint = 41.33.10.20:51820"), conf));
  check("يحوي مفتاح الخادم", () => assert.ok(conf.includes("PublicKey = " + serverPub)));
  check("النفق كامل", () => assert.ok(conf.includes("AllowedIPs = 0.0.0.0/0, ::/0")));
  check("DNS مصري افتراضاً", () => assert.ok(conf.includes("163.121.128.134"), conf));
  check("المفتاح الخاصّ ليس هو العامّ", () => {
    const priv = conf.match(/PrivateKey = (\S+)/)[1];
    assert.notEqual(priv, pub);
    assert.ok(/^[A-Za-z0-9+/]{43}=$/.test(priv));
  });

  // المفتاح الخاصّ لم يُرسل إلى الشبكة أبداً
  const priv = conf.match(/PrivateKey = (\S+)/)[1];
  const sent = [];
  page.on("request", (r) => { const d = r.postData(); if (d && d.includes(priv)) sent.push(r.url()); if (r.url().includes(priv)) sent.push(r.url()); });
  await page.click("#copy-conf").catch(() => {});
  check("المفتاح الخاصّ لم يغادر الجهاز", () => assert.equal(sent.length, 0, sent.join()));

  console.log("\n== رمز QR ==");
  const svg = await page.$eval("#qr svg", (el) => el.outerHTML);
  check("رُسم الرمز", () => assert.ok(svg.includes("<path")));
  const shot = await page.locator("#qr").screenshot();
  if (PNG) {
    const png = PNG.sync.read(shot);
    const res = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
    check("الرمز المرسوم يُقرأ ويطابق الإعداد", () => {
      assert.ok(res, "لم يُقرأ الرمز من لقطة الشاشة");
      assert.equal(res.data, conf);
    });
  } else {
    console.log("  (تخطّي فحص القراءة: pngjs غير مثبّت)");
  }

  console.log("\n== حفظ الإعدادات ==");
  await page.reload({ waitUntil: "networkidle" });
  await page.click('nav button[data-tab="tunnel"]');
  check("العنوان محفوظ", async () => assert.equal(await page.inputValue("#ep-host"), "41.33.10.20"));
  const pub2 = await page.inputValue("#cli-pub");
  check("المفتاح العامّ محفوظ", () => assert.equal(pub2, pub));

  console.log("\n== التصفّح عبر البوّابة ==");
  await page.click('nav button[data-tab="browse"]');
  await page.fill("#go-url", "http://test.masr.local:8081");
  await Promise.all([
    page.waitForURL(/\/api\/proxy/, { timeout: 15000 }),
    page.click("#go-form button[type=submit]"),
  ]);
  check("انتقل عبر البوّابة", () => assert.ok(page.url().includes("/api/proxy?u=")));
  const body = await page.textContent("body");
  check("ظهر محتوى الموقع", () => assert.ok(body.includes("أهلاً من القاهرة"), body.slice(0, 120)));
  const injected = await page.evaluate(() => !!window.__egyptVpn);
  check("النصّ المحقون يعمل", () => assert.ok(injected));
  // نقرة على رابط داخل الموقع تبقى داخل البوّابة
  await page.click('a[href*="/api/proxy"]');
  await page.waitForLoadState("domcontentloaded");
  check("الروابط تبقى داخل البوّابة", () => assert.ok(page.url().includes("/api/proxy?u=")));

  console.log("\n== صفحة الخطأ ==");
  await page.goto("http://127.0.0.1:7788/api/proxy?u=" + encodeURIComponent("https://test.masr.local:8081/"));
  const errBody = await page.textContent("body");
  check("تشرح الخطأ", () => assert.ok(errBody.includes("تعذّر فتح الموقع"), errBody.slice(0, 100)));
  check("تعرض تجربة http", () => assert.ok(errBody.includes("بلا تشفير"), errBody.slice(0, 200)));
  await page.click('a[href*="/api/proxy"]');
  await page.waitForLoadState("domcontentloaded");
  check("الرابط البديل يفتح الموقع", () => assert.ok(page.url().includes("http%3A%2F%2Ftest.masr.local")));

  console.log("\n== أخطاء المتصفّح ==");
  const real = errors.filter((e) => !/favicon/i.test(e));
  check("لا أخطاء في الصفحة", () => assert.equal(real.length, 0, real.join("\n      ")));

  await browser.close();
  console.log(`\nنتيجة الواجهة: ${pass} نجحت، ${fail} فشلت\n`);
  process.exit(fail ? 1 : 0);
})();

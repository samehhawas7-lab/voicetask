// اختبارات البوّابة: تمرّ عبر نفق محلّي إلى موقع محلّي
const http = require("http");
const assert = require("assert");

const BASE = "http://127.0.0.1:7788";
let pass = 0, fail = 0;

function req(path, opts = {}) {
  return new Promise((resolve, reject) => {
    const r = http.request(BASE + path, { method: opts.method || "GET", headers: opts.headers || {} }, (res) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.once("end", () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks).toString("utf8") }));
    });
    r.once("error", reject);
    if (opts.body) r.write(opts.body);
    r.end();
  });
}

function check(name, fn) {
  try { fn(); console.log("  ✓ " + name); pass++; }
  catch (e) { console.log("  ✗ " + name + "\n      " + e.message); fail++; }
}

const P = (u) => "/api/proxy?u=" + encodeURIComponent(u);
const stats = () => new Promise((rs) => http.get("http://127.0.0.1:8084/", (res) => { let b = ""; res.on("data", (c) => (b += c)); res.on("end", () => rs(JSON.parse(b))); }));
function done() {
  console.log(`\nنتيجة: ${pass} نجحت، ${fail} فشلت\n`);
  process.exit(fail ? 1 : 0);
}

const MODE = process.env.TEST_MODE || "connect";

(async () => {
  if (MODE === "socks") {
    console.log("\n== عبر نفق SOCKS5 ==");
    const before = await stats();
    const r = await req(P("https://test.masr.local:8443/"));
    const after = await stats();
    check("الصفحة فُتحت", () => assert.equal(r.status, 200, r.body.slice(0, 200)));
    check("مرّت عبر SOCKS5", () => assert.ok(after.socksHits > before.socksHits, JSON.stringify(after)));
    check("لم تمرّ عبر CONNECT", () => assert.equal(after.connectHits, before.connectHits));
    return done();
  }

  if (MODE === "dead") {
    console.log("\n== بوّابة معطّلة: يجب ألّا يخرج الطلب مباشرةً ==");
    const r = await req(P("http://test.masr.local:8081/"));
    check("لا يفتح الموقع بلا بوّابة", () => assert.equal(r.status, 502, "الحالة " + r.status + " — تسرّب اتصال مباشر!"));
    check("يشرح السبب", () => assert.ok(r.body.includes("تعذّر فتح الموقع")));
    const w = JSON.parse((await req("/api/where")).body);
    check("الحالة تُظهر فشل البوّابة", () => assert.equal(w.gate.ok, false));
    check("ولا تدّعي أنّها مصر", () => assert.equal(w.gate.inEgypt, false));
    return done();
  }

  console.log("\n== HTTP عبر نفق CONNECT ==");
  const r1 = await req(P("http://test.masr.local:8081/"));
  check("الحالة 200", () => assert.equal(r1.status, 200));
  check("رابط نسبي أُعيدت كتابته", () => assert.ok(r1.body.includes(`href="/api/proxy?u=${encodeURIComponent("http://test.masr.local:8081/news")}"`), "لم يُعد كتابة /news"));
  check("رابط ../ حُلّ صحيحاً", () => assert.ok(r1.body.includes(encodeURIComponent("http://test.masr.local:8081/up"))));
  check("رابط خارجي مرّ بالبوّابة", () => assert.ok(r1.body.includes(encodeURIComponent("https://other.example.com/x?a=1&b=2"))));
  check("المرساة # لم تُلمس", () => assert.ok(r1.body.includes('href="#hash"')));
  check("mailto لم يُلمس", () => assert.ok(r1.body.includes('href="mailto:a@b.com"')));
  check("srcset أُعيدت كتابته", () => assert.ok(/srcset="\/api\/proxy\?u=[^"]+ 1x, \/api\/proxy\?u=[^"]+ 2x"/.test(r1.body), "srcset: " + (r1.body.match(/srcset="[^"]*"/) || [""])[0]));
  check("style مضمّن أُعيدت كتابته", () => assert.ok(/style="background:url\('\/api\/proxy/.test(r1.body), (r1.body.match(/style="[^"]*"/) || [""])[0]));
  check("كتلة <style> أُعيدت كتابتها", () => assert.ok(r1.body.includes("url(/api/proxy?u=" + encodeURIComponent("http://test.masr.local:8081/inline.png") + ")")));
  check("@import أُعيدت كتابته", () => assert.ok(r1.body.includes('@import "/api/proxy?u=')));
  check("form action أُعيدت كتابته", () => assert.ok(r1.body.includes('action="/api/proxy?u=')));
  check("CSP نُزعت", () => assert.ok(!/Content-Security-Policy/i.test(r1.body)));
  check("integrity نُزعت", () => assert.ok(!/integrity=/i.test(r1.body)));
  check("النصّ البرمجي حُقن", () => assert.ok(r1.body.includes('data-egypt-vpn="1"')));
  check("ترويسة x-frame-options غائبة", () => assert.ok(!r1.headers["x-frame-options"]));

  console.log("\n== HTTPS عبر النفق (شهادة محلّية) ==");
  const r2 = await req(P("https://test.masr.local:8443/"));
  check("الحالة 200", () => assert.equal(r2.status, 200, "body: " + r2.body.slice(0, 200)));
  check("قاعدة الروابط https", () => assert.ok(r2.body.includes(encodeURIComponent("https://test.masr.local:8443/news"))));

  console.log("\n== CSS ==");
  const r3 = await req(P("http://test.masr.local:8081/style.css"));
  check("url() داخل css", () => assert.ok(r3.body.includes("/api/proxy?u=" + encodeURIComponent("http://test.masr.local:8081/img/a.png"))));
  check("@import url()", () => assert.ok(r3.body.includes(encodeURIComponent("http://test.masr.local:8081/other.css"))));

  console.log("\n== الضغط gzip ==");
  const r4 = await req(P("http://test.masr.local:8081/gz"));
  check("فُكّ الضغط وأُعيدت الكتابة", () => assert.ok(r4.body.includes("مضغوط") && r4.body.includes("/api/proxy?u=")));
  check("لا ترويسة content-encoding", () => assert.ok(!r4.headers["content-encoding"]));

  console.log("\n== التحويل 302 ==");
  const r5 = await req(P("http://test.masr.local:8081/redir"));
  check("الحالة 302", () => assert.equal(r5.status, 302));
  check("location مرّ بالبوّابة", () => assert.equal(r5.headers.location, "/api/proxy?u=" + encodeURIComponent("http://test.masr.local:8081/news?ok=1")));

  console.log("\n== الكعكات ==");
  const r6 = await req(P("http://test.masr.local:8081/cookie"));
  const sc = [].concat(r6.headers["set-cookie"] || []);
  check("وُسمت باسم الموقع", () => assert.ok(sc.some((c) => /^v[a-z0-9]+_sid=abc123/.test(c)), JSON.stringify(sc)));
  check("Domain نُزعت", () => assert.ok(!sc.some((c) => /domain=/i.test(c))));
  check("Path صار للبوّابة", () => assert.ok(sc.every((c) => /Path=\/api\/proxy/.test(c))));
  const tag = sc[0].split("=")[0];
  const r7 = await req(P("http://test.masr.local:8081/cookie"), { headers: { cookie: `${tag}=abc123; othersite_x=1` } });
  check("أُعيدت للموقع بلا وسم", () => assert.ok(r7.body.includes("أرسلت لي: sid=abc123"), r7.body));
  check("كعكة موقع آخر لم تُسرَّب", () => assert.ok(!r7.body.includes("othersite_x")));

  console.log("\n== POST ==");
  const r8 = await req(P("http://test.masr.local:8081/echo"), { method: "POST", body: "q=مصر", headers: { "content-type": "application/x-www-form-urlencoded" } });
  const j = JSON.parse(r8.body);
  check("الطريقة POST", () => assert.equal(j.method, "POST"));
  check("الجسم وصل", () => assert.equal(j.body, "q=مصر"));
  check("لغة عربية مصرية", () => assert.ok(/ar-EG/.test(j.headers["accept-language"])));
  check("لا تُسرَّب ترويسات vercel", () => assert.ok(!Object.keys(j.headers).some((k) => k.startsWith("x-vercel"))));

  console.log("\n== ملفّ ثنائي يمرّ كما هو ==");
  const r9 = await req(P("http://test.masr.local:8081/pic.png"));
  check("نوع المحتوى محفوظ", () => assert.equal(r9.headers["content-type"], "image/png"));

  console.log("\n== الحماية ==");
  const r10 = await req(P("http://127.0.0.1:8081/"));
  check("عنوان داخلي مرفوض", () => assert.equal(r10.status, 403));
  const r11 = await req("/api/proxy");
  check("بلا عنوان → 400", () => assert.equal(r11.status, 400));
  const r12 = await req(P("file:///etc/passwd"));
  check("بروتوكول غير مدعوم مرفوض", () => assert.equal(r12.status, 400));

  console.log("\n== النفق فعلاً استُخدم ==");
  const st = await stats();
  check("مرّت الطلبات عبر CONNECT", () => assert.ok(st.connectHits > 5, JSON.stringify(st)));

  done();
})();

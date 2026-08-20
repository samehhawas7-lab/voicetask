"use strict";
/* عاملُ خدمة تطبيق المصحف المستقلّ.

   عند التنصيب يُخزَّن التطبيقُ كاملاً — الصفحة والنصوص والخطّ — فيعمل
   بعدها بلا إنترنت أبداً. والصفحةُ نفسها من الشبكة بمهلةٍ ثمّ من
   المخزون: انتظارٌ بلا حدٍّ هو الشاشة السوداء بعينها. والتلاوةُ
   تُخزَّن حين تُسمع أو تُحفظ، وتُقدَّم من المخزون قبل الشبكة. */
const CACHE = "mushaf-b6c24903f7";
const AUD = "mushaf-audio-v1";
const CORE = ["index.html","manifest.webmanifest","icon.png","data/quran.json","data/tafsir-muyassar.json","data/tafsir-jalalayn.json","data/suras.json","data/pages.json","data/azkar.json","data/uthmanic.woff2"];

self.addEventListener("install", (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await c.addAll(CORE);
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()){
      if (k !== CACHE && k !== AUD) await caches.delete(k);
    }
    await self.clients.claim();
  })());
});

async function cacheFirst(req) {
  const hit = await caches.match(req, { ignoreSearch: false });
  if (hit) return hit;
  const res = await fetch(req);
  if (res && res.ok) (await caches.open(CACHE)).put(req, res.clone());
  return res;
}

async function pageFirst(req) {
  const c = await caches.open(CACHE);
  try {
    const net = await Promise.race([
      fetch(req),
      new Promise((_, rej) => setTimeout(() => rej(new Error("بطء")), 3000)),
    ]);
    if (net && net.ok) { c.put(req, net.clone()); return net; }
    throw new Error("ردٌّ غير سليم");
  } catch {
    return (await c.match(req)) || (await c.match("index.html")) || fetch(req);
  }
}

async function audioFirst(req) {
  // يُطلب بلا ترويسة المدى: المخزونُ ردٌّ كامل يقبله المشغّل
  const url = req.url;
  const c = await caches.open(AUD);
  const hit = await c.match(url);
  if (hit) return hit;
  const res = await fetch(url, { mode: "no-cors" });
  if (res && (res.ok || res.type === "opaque")) c.put(url, res.clone());
  return res;
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  let u;
  try { u = new URL(req.url); } catch { return; }
  // تلاوةٌ من مضيفٍ غريب: تُخزَّن حين تمرّ وتُقدَّم من المخزون بعدها
  if (u.origin !== self.location.origin){
    // المشغّل يطلب بلا قراءة فيُجاب من المخزون؛ وطالبُ القراءة (جمعُ
    // السورة ملفاً) لا يُجاب بردٍّ معتم — يمرّ إلى الشبكة كما هو
    if (u.pathname.endsWith(".mp3") && req.mode === "no-cors")
      return e.respondWith(audioFirst(req));
    return;
  }
  if (req.mode === "navigate" || u.pathname.endsWith("/index.html") || u.pathname.endsWith("/"))
    return e.respondWith(pageFirst(req));
  return e.respondWith(cacheFirst(req));
});

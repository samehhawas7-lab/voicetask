/* عاملُ الخدمة للمصحف: يجعله يعمل بلا شبكة.

   وهو مقيَّدٌ عن قصد: لا يعترض إلا ما يخصّ المصحف. فقد أسقطت الصفحةَ
   مرّةً وسمُ تحميلٍ حاجز، وبقيت الشاشة سوداء — وعاملُ خدمةٍ يعترض كلَّ
   شيء أقدرُ على ذلك منه. فما لم يُذكر هنا يمرّ إلى الشبكة كأنّ العامل
   غير موجود (القاعدة الخامسة عشرة). */
const CACHE = "mushaf-v1";

// ما يُحفظ ويُقدَّم من المحفوظ أوّلاً: بياناتٌ ثابتة لا تتغيّر
const STATIC = /^\/islam\/(data|font)\//;
// التلاوة المحفوظة على الخادم: تُحفظ في الجوّال كذلك
const AYAH   = /^\/islam\/audio\/ayah\b/;

self.addEventListener("install", (e) => { self.skipWaiting(); });
self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

async function cacheFirst(req) {
  const c = await caches.open(CACHE);
  const hit = await c.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res && res.ok && res.status === 200) c.put(req, res.clone());
  return res;
}

// الصفحةُ نفسها: من الشبكة أوّلاً وبمهلة، فإن تأخّرت فمن المحفوظ.
// ولا تُترك معلَّقةً بحال — الانتظارُ بلا حدٍّ هو الشاشة السوداء.
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
    const hit = await c.match(req);
    if (hit) return hit;
    return fetch(req);
  }
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  let u;
  try { u = new URL(req.url); } catch { return; }
  if (u.origin !== self.location.origin) return;
  if (u.pathname === "/mushaf") return e.respondWith(pageFirst(req));
  if (STATIC.test(u.pathname) || AYAH.test(u.pathname)) return e.respondWith(cacheFirst(req));
  // وما سوى ذلك يمرّ كأنّ العامل غير موجود
});

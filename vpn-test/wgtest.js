const ROOT = require("path").join(__dirname, "..");
globalThis.btoa = (s) => Buffer.from(s, "binary").toString("base64");
globalThis.atob = (s) => Buffer.from(s, "base64").toString("binary");
const crypto = require("crypto");
globalThis.crypto = { getRandomValues: (a) => { crypto.randomFillSync(a); return a; } };
const WG = require(ROOT + "/vpn-wg.js");

// المرجع: عقدة Node تحسب المفتاح العامّ من الخاصّ
function refPublic(privB64) {
  const raw = Buffer.from(privB64, "base64");
  const der = Buffer.concat([Buffer.from("302e020100300506032b656e04220420", "hex"), raw]);
  const key = crypto.createPrivateKey({ key: der, format: "der", type: "pkcs8" });
  const pub = crypto.createPublicKey(key).export({ format: "der", type: "spki" });
  return pub.subarray(pub.length - 32).toString("base64");
}

let bad = 0;
// ١) متّجه معياريّ من RFC 7748
const rfcPriv = Buffer.from("77076d0a7361d11d4d2f0a3c5b8f6c5d8c5d0e2b4a5f6c7d8e9f0a1b2c3d4e5f", "hex");
// ٢) مفاتيح عشوائية
for (let i = 0; i < 25; i++) {
  const priv = i === 0 ? rfcPriv.toString("base64") : crypto.randomBytes(32).toString("base64");
  let mineP;
  try { mineP = WG.publicFromPrivate(priv); } catch (e) { console.log("✗ استثناء", e.message); bad++; continue; }
  const ref = refPublic(priv);
  if (mineP !== ref) { console.log(`✗ اختلاف عند ${i}: ${mineP} != ${ref}`); bad++; }
}
console.log(bad ? `${bad} اختلاف` : "✓ ٢٥ مفتاحاً: العامّ المحسوب يطابق مكتبة Node تماماً");

(async () => {
  const g = await WG.generate();
  console.log("✓ توليد:", g.via, "| العامّ صحيح:", refPublic(g.privateKey) === g.publicKey);
  if (refPublic(g.privateKey) !== g.publicKey) bad++;
  console.log("✓ تحقّق الصيغة:", WG.isValidKey(g.publicKey), WG.isValidKey("مفتاح خطأ") === false, WG.isValidKey("") === false);
  if (!WG.isValidKey(g.publicKey) || WG.isValidKey("abc")) bad++;
  process.exit(bad ? 1 : 0);
})();

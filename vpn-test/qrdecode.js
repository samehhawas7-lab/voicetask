const ROOT = require("path").join(__dirname, "..");
const mine = require(ROOT + "/vpn-qr.js");
const jsQR = require("jsqr").default || require("jsqr");
const samples = [
  "HELLO",
  "https://example.com/a?b=1",
  "[Interface]\nPrivateKey = wF1x2Kk9pQ3sD7fG8hJ0lZ2xC4vB6nM8qW1eR3tY5u=\nAddress = 10.7.0.2/32\nDNS = 1.1.1.1\n\n[Peer]\nPublicKey = aB3dE5fG7hJ9kL1mN3pQ5rS7tU9vW1xY3zA5bC7dE9=\nEndpoint = 41.33.22.11:51820\nAllowedIPs = 0.0.0.0/0, ::/0\nPersistentKeepalive = 25\n",
  "مصر VPN — تجربة عربية",
  "x".repeat(300),
  "a".repeat(1),
];
function render(mods, size, scale = 4, quiet = 4) {
  const w = (size + quiet * 2) * scale;
  const data = new Uint8ClampedArray(w * w * 4).fill(255);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    if (!mods[y][x]) continue;
    for (let dy = 0; dy < scale; dy++) for (let dx = 0; dx < scale; dx++) {
      const px = ((quiet + x) * scale + dx), py = ((quiet + y) * scale + dy);
      const i = (py * w + px) * 4;
      data[i] = data[i + 1] = data[i + 2] = 0;
    }
  }
  return { data, w };
}
let bad = 0;
for (const ecl of ["L", "M"]) for (const s of samples) {
  const q = mine.encode(s, { ecl });
  const { data, w } = render(q.modules, q.size);
  const res = jsQR(data, w, w);
  const got = res && res.data;
  if (got === s) console.log(`✓ [${ecl}] v${q.version} قناع ${q.mask} — فُكّ الرمز مطابقاً (${s.length} حرفاً)`);
  else { bad++; console.log(`✗ [${ecl}] v${q.version} — قُرئ: ${got === null || got === undefined ? "(فشل القارئ)" : JSON.stringify(got.slice(0, 60))}`); }
}
// كلّ الأقنعة الثمانية يجب أن تُقرأ
for (let m = 0; m < 8; m++) {
  const s = "mask test " + m;
  const q = mine.encode(s, { ecl: "M", mask: m });
  const { data, w } = render(q.modules, q.size);
  const res = jsQR(data, w, w);
  if (res && res.data === s) console.log(`✓ القناع ${m} يُقرأ`);
  else { bad++; console.log(`✗ القناع ${m} لا يُقرأ`); }
}
console.log(bad ? `\n${bad} فشل` : "\nكلّ الرموز تُفكّ صحيحةً بقارئ مستقلّ (jsQR)");
process.exit(bad ? 1 : 0);

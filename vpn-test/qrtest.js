const ROOT = require("path").join(__dirname, "..");
const mine = require(ROOT + "/vpn-qr.js");
const QR = require("qrcode");
const samples = [
  "HELLO",
  "https://example.com/a?b=1",
  "[Interface]\nPrivateKey = wF1x2Kk9pQ3sD7fG8hJ0lZ2xC4vB6nM8qW1eR3tY5u=\nAddress = 10.7.0.2/32\nDNS = 1.1.1.1\n\n[Peer]\nPublicKey = aB3dE5fG7hJ9kL1mN3pQ5rS7tU9vW1xY3zA5bC7dE9=\nEndpoint = 41.33.22.11:51820\nAllowedIPs = 0.0.0.0/0, ::/0\nPersistentKeepalive = 25\n",
  "مصر VPN — تجربة عربية",
  "x".repeat(300),
];
let bad = 0;
(async () => {
  for (const ecl of ["L", "M"]) {
    for (const s of samples) {
      const ref = QR.create([{ data: s, mode: "byte" }], { errorCorrectionLevel: ecl });
      const got = mine.encode(s, { ecl });
      const n = ref.modules.size;
      let diff = 0;
      if (n !== got.size) { console.log(`✗ [${ecl}] حجم مختلف: ${got.size} مقابل ${n} (${s.slice(0,20)})`); bad++; continue; }
      for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
        const r = ref.modules.get(x, y) ? 1 : 0;
        if (r !== got.modules[y][x]) diff++;
      }
      if (diff) { console.log(`✗ [${ecl}] v${got.version} قناع ${got.mask}: ${diff} وحدة مختلفة — «${s.slice(0,25)}»`); bad++; }
      else console.log(`✓ [${ecl}] v${got.version} قناع ${got.mask} مطابق تماماً — «${s.slice(0,25).replace(/\n/g,' ')}»`);
    }
  }
  console.log(bad ? `\n${bad} حالة مختلفة` : "\nكلّ الرموز مطابقة لمكتبة qrcode المرجعية");
  process.exit(bad ? 1 : 0);
})();

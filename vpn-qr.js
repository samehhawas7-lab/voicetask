// ============================================================
// مولّد رمز QR — مستقلّ بلا مكتبات، يكفي لإعداد WireGuard
// نمط البايت، مستويا تصحيح L و M، الإصدارات ١..٢٠
// يعمل في المتصفّح (window.QRLite) وفي Node للاختبار
// ============================================================
(function (root) {
  "use strict";

  // مجموع كلمات الرمز لكلّ إصدار (١..٤٠)
  const TOTAL = [26, 44, 70, 100, 134, 172, 196, 242, 292, 346, 404, 466, 532, 581, 655, 733, 815, 901, 991, 1085];

  // [كلمات التصحيح لكلّ كتلة، عدد الكتل] لكلّ إصدار
  const ECB = {
    L: [[7, 1], [10, 1], [15, 1], [20, 1], [26, 1], [18, 2], [20, 2], [24, 2], [30, 2], [18, 4],
        [20, 4], [24, 4], [26, 4], [30, 4], [22, 6], [24, 6], [28, 6], [30, 6], [28, 7], [28, 8]],
    M: [[10, 1], [16, 1], [26, 1], [18, 2], [24, 2], [16, 4], [18, 4], [22, 4], [22, 5], [26, 5],
        [30, 5], [22, 8], [22, 9], [24, 9], [24, 10], [28, 10], [28, 11], [26, 13], [26, 14], [26, 16]],
  };
  const ECL_BITS = { L: 1, M: 0 };

  // ---------- حقل جالوا ----------
  const EXP = new Uint8Array(512), LOG = new Uint8Array(256);
  (function () {
    let x = 1;
    for (let i = 0; i < 255; i++) {
      EXP[i] = x; LOG[x] = i;
      x <<= 1; if (x & 0x100) x ^= 0x11d;
    }
    for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
  })();
  const mul = (a, b) => (a === 0 || b === 0) ? 0 : EXP[LOG[a] + LOG[b]];

  function rsGenerator(deg) {
    let poly = [1];
    for (let i = 0; i < deg; i++) {
      const next = new Array(poly.length + 1).fill(0);
      for (let j = 0; j < poly.length; j++) {
        next[j] ^= mul(poly[j], 1);
        next[j + 1] ^= mul(poly[j], EXP[i]);
      }
      poly = next;
    }
    return poly.slice(1); // نُسقط المعامل الأعلى (=١)
  }

  function rsRemainder(data, deg) {
    const gen = rsGenerator(deg);
    const rem = new Array(deg).fill(0);
    for (const b of data) {
      const factor = b ^ rem.shift();
      rem.push(0);
      for (let i = 0; i < deg; i++) rem[i] ^= mul(gen[i], factor);
    }
    return rem;
  }

  // ---------- الترميز ----------
  function utf8(str) {
    const out = [];
    for (const ch of unescape(encodeURIComponent(str))) out.push(ch.charCodeAt(0));
    return out;
  }

  function charCountBits(version) { return version < 10 ? 8 : 16; }

  function pickVersion(len, ecl) {
    for (let v = 1; v <= 20; v++) {
      const [ecPer, blocks] = ECB[ecl][v - 1];
      const dataBytes = TOTAL[v - 1] - ecPer * blocks;
      const need = 4 + charCountBits(v) + len * 8;
      if (dataBytes * 8 >= need) return v;
    }
    throw new Error("النصّ أطول ممّا يتّسع له الرمز");
  }

  function buildData(bytes, version, ecl) {
    const [ecPer, blocks] = ECB[ecl][version - 1];
    const dataBytes = TOTAL[version - 1] - ecPer * blocks;
    const bits = [];
    const push = (val, n) => { for (let i = n - 1; i >= 0; i--) bits.push((val >>> i) & 1); };
    push(0b0100, 4);                          // نمط البايت
    push(bytes.length, charCountBits(version));
    for (const b of bytes) push(b, 8);
    const cap = dataBytes * 8;
    push(0, Math.min(4, cap - bits.length));  // نهاية
    while (bits.length % 8) bits.push(0);
    const words = [];
    for (let i = 0; i < bits.length; i += 8) {
      let b = 0; for (let j = 0; j < 8; j++) b = (b << 1) | bits[i + j];
      words.push(b);
    }
    for (let pad = 0xec; words.length < dataBytes; pad ^= 0xec ^ 0x11) words.push(pad);

    // تقسيم الكتل ثمّ تشبيكها
    const shortLen = Math.floor(dataBytes / blocks);
    const numLong = dataBytes % blocks;
    const dataBlocks = [], ecBlocks = [];
    let off = 0;
    for (let i = 0; i < blocks; i++) {
      const len = shortLen + (i >= blocks - numLong ? 1 : 0);
      const blk = words.slice(off, off + len); off += len;
      dataBlocks.push(blk);
      ecBlocks.push(rsRemainder(blk, ecPer));
    }
    const out = [];
    for (let i = 0; i < shortLen + 1; i++) {
      for (let b = 0; b < blocks; b++) if (i < dataBlocks[b].length) out.push(dataBlocks[b][i]);
    }
    for (let i = 0; i < ecPer; i++) for (let b = 0; b < blocks; b++) out.push(ecBlocks[b][i]);
    return out;
  }

  // ---------- الشبكة ----------
  function alignPositions(ver) {
    if (ver === 1) return [];
    const size = ver * 4 + 17;
    const num = Math.floor(ver / 7) + 2;
    const step = Math.ceil((ver * 4 + 4) / (num * 2 - 2)) * 2;
    const res = [6];
    for (let pos = size - 7; res.length < num; pos -= step) res.splice(1, 0, pos);
    return res;
  }

  function newGrid(size, fill) {
    const g = [];
    for (let i = 0; i < size; i++) g.push(new Array(size).fill(fill));
    return g;
  }

  function drawFunctions(m, reserved, ver) {
    const size = m.length;
    const setF = (x, y, v) => { if (x >= 0 && y >= 0 && x < size && y < size) { m[y][x] = v; reserved[y][x] = 1; } };

    // مربّعات الزوايا + الفاصل
    const finder = (cx, cy) => {
      for (let dy = -1; dy <= 7; dy++) for (let dx = -1; dx <= 7; dx++) {
        const d = Math.max(Math.abs(dx - 3), Math.abs(dy - 3));
        setF(cx + dx, cy + dy, (d !== 2 && d <= 3) ? 1 : 0);
      }
    };
    finder(0, 0); finder(size - 7, 0); finder(0, size - 7);

    // خطّا التوقيت
    for (let i = 8; i < size - 8; i++) { setF(i, 6, i % 2 === 0 ? 1 : 0); setF(6, i, i % 2 === 0 ? 1 : 0); }

    // مربّعات المحاذاة
    const pos = alignPositions(ver);
    for (const y of pos) for (const x of pos) {
      if ((x === 6 && y === 6) || (x === 6 && y === size - 7) || (x === size - 7 && y === 6)) continue;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
        setF(x + dx, y + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1 ? 1 : 0);
      }
    }

    // مواضع معلومات النسق (تُملأ لاحقاً) — دون المساس بخطّي التوقيت عند ٦
    for (let i = 0; i < 9; i++) { if (i !== 6) { setF(i, 8, 0); setF(8, i, 0); } }
    for (let i = 0; i < 8; i++) { setF(size - 1 - i, 8, 0); setF(8, size - 1 - i, 0); }
    setF(8, size - 8, 1); // وحدة داكنة ثابتة

    // معلومات الإصدار (٧ فما فوق)
    if (ver >= 7) {
      let rem = ver;
      for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
      const bits = (ver << 12) | rem;
      for (let i = 0; i < 18; i++) {
        const bit = (bits >>> i) & 1;
        const a = size - 11 + (i % 3), b = Math.floor(i / 3);
        setF(a, b, bit); setF(b, a, bit);
      }
    }
  }

  function drawData(m, reserved, codewords) {
    const size = m.length;
    let i = 0;
    for (let right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (let vert = 0; vert < size; vert++) {
        for (let j = 0; j < 2; j++) {
          const x = right - j;
          const upward = ((right + 1) & 2) === 0;
          const y = upward ? size - 1 - vert : vert;
          if (reserved[y][x]) continue;
          const bit = i < codewords.length * 8 ? (codewords[i >>> 3] >>> (7 - (i & 7))) & 1 : 0;
          m[y][x] = bit;
          i++;
        }
      }
    }
  }

  const MASKS = [
    (x, y) => (x + y) % 2 === 0,
    (x, y) => y % 2 === 0,
    (x, y) => x % 3 === 0,
    (x, y) => (x + y) % 3 === 0,
    (x, y) => (Math.floor(y / 2) + Math.floor(x / 3)) % 2 === 0,
    (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
    (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
    (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
  ];

  function applyMask(m, reserved, k) {
    const size = m.length;
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      if (!reserved[y][x] && MASKS[k](x, y)) m[y][x] ^= 1;
    }
  }

  function drawFormat(m, reserved, ecl, mask) {
    const size = m.length;
    const data = (ECL_BITS[ecl] << 3) | mask;
    let rem = data;
    for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    const bits = ((data << 10) | rem) ^ 0x5412;
    const put = (x, y, v) => { m[y][x] = v; reserved[y][x] = 1; };
    for (let i = 0; i <= 5; i++) put(8, i, (bits >>> i) & 1);
    put(8, 7, (bits >>> 6) & 1);
    put(8, 8, (bits >>> 7) & 1);
    put(7, 8, (bits >>> 8) & 1);
    for (let i = 9; i < 15; i++) put(14 - i, 8, (bits >>> i) & 1);
    for (let i = 0; i < 8; i++) put(size - 1 - i, 8, (bits >>> i) & 1);
    for (let i = 8; i < 15; i++) put(8, size - 15 + i, (bits >>> i) & 1);
    put(8, size - 8, 1);
  }

  // ---------- تقييم الأقنعة ----------
  function penalty(m) {
    const size = m.length;
    let score = 0;

    const line = (get) => {
      for (let a = 0; a < size; a++) {
        let run = 1, prev = get(a, 0);
        const hist = [];
        let runColor = prev;
        for (let b = 1; b < size; b++) {
          const cur = get(a, b);
          if (cur === prev) { run++; }
          else {
            if (run >= 5) score += run - 2;
            hist.push({ run, color: runColor });
            run = 1; prev = cur; runColor = cur;
          }
        }
        if (run >= 5) score += run - 2;
        hist.push({ run, color: runColor });
        // القاعدة ٣: نمط ١:١:٣:١:١ محاطاً بأربع وحدات فاتحة
        for (let i = 0; i + 4 < hist.length; i++) {
          const h = hist.slice(i, i + 5);
          if (h[0].color === 1 && h[0].run >= 1 && h[1].color === 0 && h[2].color === 1 && h[3].color === 0 && h[4].color === 1
            && h[1].run === h[0].run && h[3].run === h[0].run && h[2].run === h[0].run * 3 && h[4].run === h[0].run) {
            const before = i > 0 ? hist[i - 1] : null;
            const after = i + 5 < hist.length ? hist[i + 5] : null;
            if ((before && before.color === 0 && before.run >= h[0].run * 4) || (after && after.color === 0 && after.run >= h[0].run * 4)) score += 40;
          }
        }
      }
    };
    line((row, col) => m[row][col]);
    line((col, row) => m[row][col]);

    // القاعدة ٢: مربّعات ٢×٢ بلون واحد
    for (let y = 0; y < size - 1; y++) for (let x = 0; x < size - 1; x++) {
      const c = m[y][x];
      if (c === m[y][x + 1] && c === m[y + 1][x] && c === m[y + 1][x + 1]) score += 3;
    }

    // القاعدة ٤: نسبة الداكن
    let dark = 0;
    for (const row of m) for (const v of row) dark += v;
    const pct = (dark * 100) / (size * size);
    score += Math.floor(Math.abs(pct - 50) / 5) * 10;
    return score;
  }

  // ---------- الواجهة ----------
  function encode(text, opts) {
    const ecl = (opts && opts.ecl) || "M";
    const bytes = utf8(String(text));
    const ver = pickVersion(bytes.length, ecl);
    const codewords = buildData(bytes, ver, ecl);
    const size = ver * 4 + 17;

    let best = null;
    const only = (opts && opts.mask != null) ? [opts.mask] : [0, 1, 2, 3, 4, 5, 6, 7];
    for (const k of only) {
      const m = newGrid(size, 0), reserved = newGrid(size, 0);
      drawFunctions(m, reserved, ver);
      drawData(m, reserved, codewords);
      applyMask(m, reserved, k);
      drawFormat(m, reserved, ecl, k);
      const p = penalty(m);
      if (!best || p < best.p) best = { p, m, mask: k };
    }
    return { modules: best.m, size, version: ver, mask: best.mask, ecl };
  }

  function toSvg(text, opts) {
    const o = opts || {};
    const q = o.quiet == null ? 4 : o.quiet;
    const { modules, size } = encode(text, o);
    const total = size + q * 2;
    let path = "";
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      if (modules[y][x]) path += `M${x + q} ${y + q}h1v1h-1z`;
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" shape-rendering="crispEdges" role="img" aria-label="رمز الإعداد">`
      + `<rect width="${total}" height="${total}" fill="${o.light || "#ffffff"}"/>`
      + `<path d="${path}" fill="${o.dark || "#000000"}"/></svg>`;
  }

  const api = { encode, toSvg };
  if (typeof module === "object" && module.exports) module.exports = api;
  root.QRLite = api;
})(typeof globalThis !== "undefined" ? globalThis : this);

// ============================================================
// مفاتيح WireGuard — X25519 في المتصفّح
// يستعمل WebCrypto إن توفّر، وإلّا فتنفيذ داخليّ لمنحنى ٢٥٥١٩
// window.WG: { generate(), publicFromPrivate(b64), isValidKey(b64) }
// ============================================================
(function (root) {
  "use strict";

  const B64 = {
    encode(bytes) {
      let s = "";
      for (const b of bytes) s += String.fromCharCode(b);
      return btoa(s);
    },
    decode(str) {
      const s = atob(String(str).trim());
      const out = new Uint8Array(s.length);
      for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
      return out;
    },
  };

  // ---------- حساب المنحنى ٢٥٥١٩ (احتياطيّ) ----------
  // حسابٌ على ١٦ طرفاً، كلٌّ منها ١٦ بتّاً — على منوال tweetnacl
  function gf(init) {
    const r = new Float64Array(16);
    if (init) for (let i = 0; i < init.length; i++) r[i] = init[i];
    return r;
  }
  const _121665 = gf([0xdb41, 1]);

  function car25519(o) {
    let c = 1;
    for (let i = 0; i < 16; i++) {
      const v = o[i] + c + 65535;
      c = Math.floor(v / 65536);
      o[i] = v - c * 65536;
    }
    o[0] += c - 1 + 37 * (c - 1);
  }
  function sel25519(p, q, b) {
    const c = ~(b - 1);
    for (let i = 0; i < 16; i++) {
      const t = c & (p[i] ^ q[i]);
      p[i] ^= t; q[i] ^= t;
    }
  }
  function pack25519(o, n) {
    const m = gf(), t = gf();
    for (let i = 0; i < 16; i++) t[i] = n[i];
    car25519(t); car25519(t); car25519(t);
    for (let j = 0; j < 2; j++) {
      m[0] = t[0] - 0xffed;
      for (let i = 1; i < 15; i++) {
        m[i] = t[i] - 0xffff - ((m[i - 1] >> 16) & 1);
        m[i - 1] &= 0xffff;
      }
      m[15] = t[15] - 0x7fff - ((m[14] >> 16) & 1);
      const b = (m[15] >> 16) & 1;
      m[14] &= 0xffff;
      sel25519(t, m, 1 - b);
    }
    for (let i = 0; i < 16; i++) {
      o[2 * i] = t[i] & 0xff;
      o[2 * i + 1] = t[i] >> 8;
    }
  }
  function unpack25519(o, n) {
    for (let i = 0; i < 16; i++) o[i] = n[2 * i] + (n[2 * i + 1] << 8);
    o[15] &= 0x7fff;
  }
  function A(o, a, b) { for (let i = 0; i < 16; i++) o[i] = a[i] + b[i]; }
  function Z(o, a, b) { for (let i = 0; i < 16; i++) o[i] = a[i] - b[i]; }
  function M(o, a, b) {
    const t = new Float64Array(31);
    for (let i = 0; i < 16; i++) for (let j = 0; j < 16; j++) t[i + j] += a[i] * b[j];
    for (let i = 0; i < 15; i++) t[i] += 38 * t[i + 16];
    for (let i = 0; i < 16; i++) o[i] = t[i];
    car25519(o); car25519(o);
  }
  function S(o, a) { M(o, a, a); }
  function inv25519(o, i) {
    const c = gf();
    for (let a = 0; a < 16; a++) c[a] = i[a];
    for (let a = 253; a >= 0; a--) {
      S(c, c);
      if (a !== 2 && a !== 4) M(c, c, i);
    }
    for (let a = 0; a < 16; a++) o[a] = c[a];
  }

  function scalarMult(n, p) {
    const z = new Uint8Array(32);
    const x = new Float64Array(80);
    const a = gf(), b = gf(), c = gf(), d = gf(), e = gf(), f = gf();
    for (let i = 0; i < 31; i++) z[i] = n[i];
    z[31] = (n[31] & 127) | 64;
    z[0] &= 248;
    unpack25519(x, p);
    for (let i = 0; i < 16; i++) { b[i] = x[i]; d[i] = a[i] = c[i] = 0; }
    a[0] = d[0] = 1;
    for (let i = 254; i >= 0; --i) {
      const r = (z[i >>> 3] >>> (i & 7)) & 1;
      sel25519(a, b, r); sel25519(c, d, r);
      A(e, a, c); Z(a, a, c); A(c, b, d); Z(b, b, d);
      S(d, e); S(f, a); M(a, c, a); M(c, b, e);
      A(e, a, c); Z(a, a, c); S(b, a); Z(c, d, f);
      M(a, c, _121665); A(a, a, d); M(c, c, a); M(a, d, f);
      M(d, b, x); S(b, e);
      sel25519(a, b, r); sel25519(c, d, r);
    }
    for (let i = 0; i < 16; i++) {
      x[i + 16] = a[i]; x[i + 32] = c[i];
      x[i + 48] = b[i]; x[i + 64] = d[i];
    }
    const x32 = x.subarray(32), x16 = x.subarray(16);
    inv25519(x32, x32);
    M(x16, x16, x32);
    const q = new Uint8Array(32);
    pack25519(q, x16);
    return q;
  }

  const BASE = new Uint8Array(32); BASE[0] = 9;
  const scalarMultBase = (n) => scalarMult(n, BASE);

  function clamp(k) {
    k[0] &= 248;
    k[31] &= 127;
    k[31] |= 64;
    return k;
  }

  // ---------- الواجهة ----------
  function randomKey() {
    const k = new Uint8Array(32);
    (root.crypto || {}).getRandomValues
      ? root.crypto.getRandomValues(k)
      : (() => { throw new Error("لا يوجد مولّد عشوائيّ آمن في هذا المتصفّح"); })();
    return clamp(k);
  }

  function publicFromPrivate(privB64) {
    const priv = B64.decode(privB64);
    if (priv.length !== 32) throw new Error("طول المفتاح يجب أن يكون ٣٢ بايت");
    return B64.encode(scalarMultBase(clamp(priv.slice())));
  }

  async function generate() {
    // الطريق الأوّل: WebCrypto — أسرع وأدقّ حين يتوفّر
    try {
      const subtle = root.crypto && root.crypto.subtle;
      if (subtle) {
        const pair = await subtle.generateKey({ name: "X25519" }, true, ["deriveBits"]);
        const jwk = await subtle.exportKey("jwk", pair.privateKey);
        const raw = new Uint8Array(await subtle.exportKey("raw", pair.publicKey));
        const priv = b64urlToBytes(jwk.d);
        if (priv.length === 32 && raw.length === 32) {
          return { privateKey: B64.encode(priv), publicKey: B64.encode(raw), via: "webcrypto" };
        }
      }
    } catch (e) { /* نُكمل بالتنفيذ الداخليّ */ }

    const priv = randomKey();
    return { privateKey: B64.encode(priv), publicKey: B64.encode(scalarMultBase(priv)), via: "js" };
  }

  function b64urlToBytes(s) {
    const pad = "=".repeat((4 - (s.length % 4)) % 4);
    return B64.decode(s.replace(/-/g, "+").replace(/_/g, "/") + pad);
  }

  function isValidKey(s) {
    const v = String(s || "").trim();
    if (!/^[A-Za-z0-9+/]{43}=$/.test(v)) return false;
    try { return B64.decode(v).length === 32; } catch { return false; }
  }

  const api = { generate, publicFromPrivate, isValidKey, scalarMultBase, b64: B64 };
  if (typeof module === "object" && module.exports) module.exports = api;
  root.WG = api;
})(typeof globalThis !== "undefined" ? globalThis : this);

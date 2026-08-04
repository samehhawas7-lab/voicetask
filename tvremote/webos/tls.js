"use strict";
// ============================================================
// شهادةٌ حقيقية من Tailscale — وبها يصير الوصول https
//
// **لماذا؟** سفاري يمنع على العنوان غير المشفَّر: الميكروفون،
// والحافظة، ومستشعر الاتجاه، وتحديد الموقع. فالأوامر الصوتية
// والبوصلة الدوّارة مستحيلةٌ على http مهما أُتقنت الشيفرة — قيدٌ في
// المتصفّح لا حيلة فيه.
//
// وTailscale يمنح شهادةً موقّعة من Let's Encrypt لاسم جهازك داخل
// شبكتك (‏kmc.<شبكتك>.ts.net). فهي شهادةٌ صحيحة لا «موقّعةٌ ذاتياً»،
// ولا يظهر معها تحذير، ولا يُطلب تنصيبُ شيءٍ في الجوّال.
//
// وشرطُها أمران في لوحة Tailscale: MagicDNS و HTTPS Certificates.
// وإن لم يكونا مفعّلين قيل ذلك صراحةً بدل أن نصمت.
// ============================================================

const fs = require("fs");
const path = require("path");
const { exec, execFile } = require("child_process");

const DIR = path.join(__dirname, "..", "windows", "certs");
const KEY = path.join(DIR, "server.key");
const CRT = path.join(DIR, "server.crt");
const META = path.join(DIR, "cert.json");

/** أين tailscale؟ في ويندوز لا يكون في PATH دائماً */
function tailscaleExe() {
  if (process.env.TAILSCALE_EXE) return process.env.TAILSCALE_EXE;
  if (process.platform !== "win32") return "tailscale";
  const guess = "C:\\Program Files\\Tailscale\\tailscale.exe";
  return fs.existsSync(guess) ? guess : "tailscale";
}

function run(cmd, args, ms = 60000) {
  return new Promise((resolve) => {
    execFile(cmd, args, { timeout: ms, windowsHide: true, maxBuffer: 1 << 20 },
      (err, out, errOut) => resolve({
        ok: !err, out: String(out || ""), err: String(errOut || (err && err.message) || ""),
      }));
  });
}

/** اسمُ هذا الجهاز في شبكتك — تُصدَر الشهادة عليه */
async function dnsName() {
  const r = await run(tailscaleExe(), ["status", "--json"], 20000);
  if (!r.ok) return { name: "", why: "tailscale لم يردّ: " + r.err.trim().slice(0, 200) };
  let j;
  try { j = JSON.parse(r.out); } catch { return { name: "", why: "جواب tailscale غير مفهوم" }; }
  const self = j.Self || {};
  const name = String(self.DNSName || "").replace(/\.$/, "");
  if (!name) return { name: "", why: "لا اسم DNS — فعّل MagicDNS في لوحة Tailscale" };
  if (!/\.ts\.net$/.test(name)) {
    return { name: "", why: "الاسم ليس على ts.net (" + name + ") — فعّل MagicDNS" };
  }
  return { name, magicDns: !!(j.CurrentTailnet && j.CurrentTailnet.MagicDNSEnabled) };
}

/** أفي الشهادة الحاليّة بقيّة؟ */
function current() {
  try {
    if (!fs.existsSync(KEY) || !fs.existsSync(CRT)) return null;
    const meta = JSON.parse(fs.readFileSync(META, "utf8"));
    return { name: meta.name, at: meta.at, key: KEY, crt: CRT };
  } catch { return null; }
}

/** يقرأ الشهادة للتقديم — أو null، ولا يرمي */
function load() {
  try {
    const c = current();
    if (!c) return null;
    return { key: fs.readFileSync(KEY), cert: fs.readFileSync(CRT), name: c.name, at: c.at };
  } catch { return null; }
}

/**
 * يستصدر الشهادة ويحفظها.
 *
 * ولا تُقبل حتى تُقرأ ويُتحقّق أنّها شهادةٌ ومفتاح — فملفٌّ فارغ أو
 * رسالةُ خطأٍ كُتبت مكانَ الشهادة أسوأ من لا شيء: يجعل الخادم يسقط
 * عند الإقلاع فيبقى البيت بلا ريموت.
 */
async function issue(log = () => {}) {
  const d = await dnsName();
  if (!d.name) return { ok: false, why: d.why };

  fs.mkdirSync(DIR, { recursive: true });
  const tmpKey = KEY + ".part", tmpCrt = CRT + ".part";
  log("tls: asking Tailscale for a certificate for " + d.name);

  const r = await run(tailscaleExe(),
    ["cert", "--cert-file", tmpCrt, "--key-file", tmpKey, d.name], 120000);

  const cleanup = () => { for (const f of [tmpKey, tmpCrt]) { try { fs.unlinkSync(f); } catch {} } };

  if (!r.ok) {
    cleanup();
    const msg = (r.err || r.out).trim();
    // الرسالة الشائعة حين لا تكون الشهادات مفعّلة في اللوحة
    const hint = /HTTPS|not enabled|disabled/i.test(msg)
      ? " — فعّل «HTTPS Certificates» في لوحة Tailscale ثم أعد المحاولة"
      : "";
    return { ok: false, why: msg.slice(0, 300) + hint, name: d.name };
  }

  let key, crt;
  try {
    key = fs.readFileSync(tmpKey, "utf8");
    crt = fs.readFileSync(tmpCrt, "utf8");
  } catch (e) { cleanup(); return { ok: false, why: "لم تُكتب الملفات: " + e.message }; }

  if (!/BEGIN [A-Z ]*PRIVATE KEY/.test(key) || !/BEGIN CERTIFICATE/.test(crt)) {
    cleanup();
    return { ok: false, why: "ما جاء مفتاحٌ وشهادة — الملفّان ليسا بالصيغة المنتظرة" };
  }

  fs.renameSync(tmpCrt, CRT);
  fs.renameSync(tmpKey, KEY);
  try {
    fs.writeFileSync(META, JSON.stringify({ name: d.name, at: new Date().toISOString() }, null, 2));
  } catch {}
  // المفتاح الخاصّ لا يُقرأ إلا من النظام وصاحب الجهاز
  try { require("./secure").harden(KEY, log); } catch {}
  log("tls: certificate saved for " + d.name);
  return { ok: true, name: d.name };
}

module.exports = { issue, load, current, dnsName, DIR, KEY, CRT, tailscaleExe };

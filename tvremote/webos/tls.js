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
  if (!d.name) {
    return { ok: false, why: d.why,
             next: "افتح https://login.tailscale.com/admin/dns وفعّل «MagicDNS».",
             admin: "https://login.tailscale.com/admin/dns" };
  }

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
    // الخطوةُ التالية تُقال دائماً، لا حين نتعرّف على نصّ الخطأ وحده.
    // فرسائل Tailscale تتبدّل بين النسخ، ورسالةٌ لا يفهمها صاحبُ
    // البيت تساوي عطباً بلا سبب.
    return {
      ok: false,
      name: d.name,
      why: msg.slice(0, 220),
      // ما يفعله بيده — وهو ضغطتان في لوحة Tailscale لمرّةٍ واحدة
      next: "افتح https://login.tailscale.com/admin/dns وفعّل «MagicDNS» " +
            "ثم «HTTPS Certificates»، ثم اضغط الزرّ هنا مرّة أخرى.",
      admin: "https://login.tailscale.com/admin/dns",
    };
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


// ============================================================
// حارسُ النفق
//
// **لماذا؟** توقّف Tailscale على اللابتوب مرّتين في يومٍ واحد، فانقطع
// البيتُ كلّه عن صاحبه وهو في عمله — وظنّها عطباً في التطبيق. ولا
// أحد كان يراقبه: الخدمة تبدأ مع ويندوز، لكنّها إن سقطت بعدها بقيت
// ساقطة إلى أن يُقام إلى اللابتوب.
//
// وخادمُنا يعمل دائماً و run.cmd يعيده إن مات — فهو أثبتُ ما في
// البيت. فليحرس ما هو أهشّ منه.
//
// ولا يُلحّ: لا يفعل شيئاً إلا إذا قال Tailscale بنفسه إنه متوقّف.
// ============================================================

/**
 * يقرأ حال النفق من جواب `tailscale status --json`.
 * دالّةٌ خالصة — تُقاس بلا شبكة ولا جهاز.
 *
 * @returns {"ok"|"up"|"login"|"unknown"}
 *   ok      — يعمل، فلا يُمَسّ
 *   up      — متوقّف ويكفيه `tailscale up`
 *   login   — يحتاج تسجيل دخول، ولا يُفعل ذلك بلا صاحبه
 *   unknown — لم نفهم الجواب، فلا نتصرّف على جهل
 */
function tailnetState(raw) {
  let j;
  try { j = typeof raw === "string" ? JSON.parse(raw) : raw; } catch { return "unknown"; }
  if (!j || typeof j !== "object") return "unknown";
  const s = String(j.BackendState || "");
  if (s === "Running") return "ok";
  if (s === "Stopped") return "up";
  if (s === "NeedsLogin" || s === "NoState") return "login";
  if (s === "Starting") return "ok";       // في طريقه — لا نعجّل عليه
  return "unknown";
}

/**
 * يتفقّد النفق، ويُنهضه إن كان متوقّفاً. يردّ ما فعل.
 * ولا يُسجّل شيئاً حين يكون سليماً — فالسجلّ لِما يقع لا لِما لا يقع.
 */
async function keepUp(log = () => {}) {
  const exe = tailscaleExe();
  const st = await run(exe, ["status", "--json"], 20000);
  if (!st.ok && !st.out) return { state: "unknown", acted: false, why: st.err.trim().slice(0, 120) };
  const state = tailnetState(st.out);
  if (state === "ok") return { state, acted: false };
  if (state === "login") {
    log("tailscale needs login - run windows\\tailscale.ps1 once");
    return { state, acted: false };
  }
  if (state === "unknown") return { state, acted: false };

  log("tailscale is down - bringing it up");
  const up = await run(exe, ["up", "--unattended"], 60000);
  const after = await run(exe, ["status", "--json"], 20000);
  const now = tailnetState(after.out);
  log("tailscale after up: " + now + (up.ok ? "" : " (" + up.err.trim().slice(0, 100) + ")"));
  return { state: now, acted: true, ok: now === "ok" };
}

module.exports = { issue, load, current, dnsName, DIR, KEY, CRT, tailscaleExe,
                   tailnetState, keepUp };

"use strict";
// ============================================================
// التحديث الذاتيّ — بلا بوويرشيل، وبلا منصِّبٍ يُجلب من الإنترنت
//
// **لماذا كُتب هذا؟** كان التحديث يمرّ بأربع حلقات: node يُطلق
// بوويرشيل، وبوويرشيل يجلب منصِّباً، والمنصِّب يوقف المهمّة ويكتب
// الملفات، ثم يعيد تشغيلها. وكلُّ حلقةٍ منها تنكسر صامتة — وقد
// انكسرت ليالي متتابعة، فكان السجلّ ترويسةً بلا كلمة.
//
// وهذا يفعلها في حلقةٍ واحدة، بلغةٍ واحدة، وكلُّ خطوةٍ تُكتب بحرفها:
//   ١) يسأل GitHub عن آخر تعديل، ويثبّت عليه — فلا يختلط ملفٌّ
//      قديمٌ بجديد لو دُفع شيءٌ في أثناء التحديث
//   ٢) يجلب الملفات إلى أسماءٍ مؤقّتة `.new`
//   ٣) **يقيسها قبل أن يستبدل شيئاً**: كلُّ ملفّ جافاسكربت يُصرَّف
//      فعلاً (لا يُنفَّذ)، والصفحة يُتحقَّق من تمامها
//   ٤) فإن سقط واحدٌ منها **أُلغي التحديث كلّه** ولم يُمَسَّ ملفٌّ
//      واحد على القرص. هذه خاصّيته الأهمّ: كلٌّ أو لا شيء
//   ٥) وإن نجحت جميعاً استُبدلت دفعةً، ثم يخرج الخادم — و run.cmd
//      يعيده بعد خمس ثوان
//
// وما لا يُمسّ أبداً: config.json و secrets.json و adbkey.pem
// وnode_modules. فليست في القائمة أصلاً.
// ============================================================

const fs = require("fs");
const path = require("path");
const https = require("https");
const vm = require("vm");

const ROOT = path.join(__dirname, "..", "..");
const LOG_FILE = path.join(__dirname, "..", "windows", "update.log");

/**
 * ما يُحدَّث. وهي نفسها التي يتحقّق منها المنصِّب — فإن أُضيف ملفٌّ
 * جديد أُضيف في الموضعين، وإلا وصل نصفُ التحديث.
 */
const FILES = [
  "tv.html",
  "tvremote/webos/server.js",
  "tvremote/webos/wol.js",
  "tvremote/webos/tuya.js",
  "tvremote/webos/tuya-cloud.js",
  "tvremote/webos/adb.js",
  "tvremote/webos/discover.js",
  "tvremote/webos/survey.js",
  "tvremote/webos/router.js",
  "tvremote/webos/secure.js",
  "tvremote/webos/islam.js",
  "tvremote/webos/voice.js",
  "tvremote/webos/mushaf-sw.js",
  "tvremote/webos/falak.js",
  "tvremote/webos/mushaf-shell.js",
  "tvremote/webos/tls.js",
  "tvremote/webos/tuya-scan.js",
  "tvremote/webos/selfupdate.js",
  "tvremote/webos/package.json",
  "tvremote/windows/run.cmd",
  "tvremote/windows/install.ps1",
  "tvremote/windows/tailscale.ps1",
  "tvremote/windows/ssh.ps1",
];

function stamp() {
  return new Date().toISOString().replace("T", " ").slice(0, 19);
}

function append(line) {
  try {
    fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
    fs.appendFileSync(LOG_FILE, stamp() + "  " + line + "\r\n");
  } catch { /* القرص قد يمتلئ — ولا يمنع ذلك التحديث */ }
}

/** يجلب نصّاً، ويتبع التحويل، ولا يصبر أكثر من دقيقة */
function fetchText(url, ms = 60000) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      timeout: ms,
      headers: { "User-Agent": "kmc-remote", "Accept-Encoding": "identity" },
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        return resolve(fetchText(res.headers.location, ms));
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error("ردّ بـ " + res.statusCode));
      }
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => resolve(Buffer.concat(chunks)));
      res.on("error", reject);
    });
    req.on("timeout", () => { req.destroy(); reject(new Error("انتهت المهلة")); });
    req.on("error", reject);
  });
}

/** آخر تعديلٍ على الفرع — نثبّت عليه فلا يختلط قديمٌ بجديد */
function headSha(repo, branch = "main") {
  return new Promise((resolve, reject) => {
    const req = https.get({
      host: "api.github.com",
      path: "/repos/" + repo + "/commits/" + encodeURIComponent(branch),
      headers: { "User-Agent": "kmc-remote", "Accept": "application/vnd.github.sha" },
      timeout: 15000,
    }, (r) => {
      let body = "";
      r.on("data", (c) => { body += c; if (body.length > 4096) r.destroy(); });
      r.on("end", () => {
        const sha = body.trim();
        /^[0-9a-f]{40}$/.test(sha) ? resolve(sha) : reject(new Error("جواب غير مفهوم من GitHub"));
      });
    });
    req.on("timeout", () => { req.destroy(); reject(new Error("GitHub لم يردّ")); });
    req.on("error", reject);
  });
}

/**
 * يقيس الملف قبل قبوله.
 *
 * وجافاسكربت **يُصرَّف فعلاً** لا يُفحص بالنظر: `vm.Script` تُخرج
 * خطأً على أي خلل في الصياغة ولا تنفّذ حرفاً. فملفٌّ نصفُه لن يمرّ.
 */
function check(rel, buf, prevSize) {
  if (!buf || buf.length < 8) throw new Error("فارغ (" + (buf ? buf.length : 0) + " بايت)");
  // التنزيلُ المقطوع يُنتج ملفاً سليم الصياغة أحياناً — نصفَ ملفٍّ
  // ينتهي بقوسٍ مغلق. فيُقاس بالموجود: انكماشٌ إلى أقلّ من النصف
  // ليس تحديثاً، وإنما حبلٌ انقطع
  if (prevSize > 200 && buf.length < prevSize / 2) {
    throw new Error("انكمش من " + prevSize + " إلى " + buf.length + " بايت — تنزيلٌ مقطوع");
  }
  const text = buf.toString("utf8");
  if (rel.endsWith(".js")) {
    try { new vm.Script(text, { filename: rel }); }
    catch (e) { throw new Error("صياغته معطوبة: " + e.message); }
  } else if (rel.endsWith(".json")) {
    try { JSON.parse(text); } catch (e) { throw new Error("JSON معطوب: " + e.message); }
  } else if (rel.endsWith(".html")) {
    if (!/<\/html>\s*$/i.test(text)) throw new Error("الصفحة ناقصة — لا تنتهي بـ </html>");
    if (text.length < 20000) throw new Error("الصفحة أصغر مما ينبغي (" + text.length + " بايت)");
  } else if (rel.endsWith(".ps1") || rel.endsWith(".cmd")) {
    if (!text.trim()) throw new Error("فارغ");
  }
  return true;
}

/** أتغيّرت الاعتماديات؟ لا نستطيع تنصيبها بلا npm، فنقولها بدل أن نكسر */
function depsChanged(oldRaw, newRaw) {
  try {
    const a = JSON.parse(oldRaw).dependencies || {};
    const b = JSON.parse(newRaw).dependencies || {};
    return JSON.stringify(a) !== JSON.stringify(b);
  } catch { return false; }
}

/**
 * يحدّث. يردّ { ok, sha, why }.
 * ولا يخرج من العملية بنفسه — ذلك قرار من يستدعيه.
 */
async function selfUpdate(opts = {}) {
  const repo = opts.repo || "samehhawas7-lab/voicetask";
  // الفرع الذي نتابعه — main إلا أن يُطلب غيره لتجربة عملٍ قبل اعتماده
  const branch = opts.branch || "main";
  const root = opts.root || ROOT;
  const files = opts.files || FILES;
  const base = opts.rawBase || "https://raw.githubusercontent.com/" + repo;
  const log = (m) => { append(m); if (opts.log) opts.log("update: " + m); };

  append("");
  append("======== تحديثٌ ذاتيّ بدأ ========");

  let sha;
  try {
    sha = opts.sha || await headSha(repo, branch);
    log("الفرع " + branch + " · آخر تعديل: " + sha.slice(0, 7));
  } catch (e) {
    log("تعذّر سؤال GitHub — " + e.message);
    return { ok: false, why: "تعذّر سؤال GitHub: " + e.message };
  }

  // ---- ١) الجلب والقياس، بلا مساسٍ بشيء ----
  const staged = [];
  for (const rel of files) {
    const url = base + "/" + sha + "/" + rel;
    const dst = path.join(root, rel.split("/").join(path.sep));
    let prevSize = 0;
    try { prevSize = fs.statSync(dst).size; } catch { /* ملفٌّ جديد */ }
    let buf;
    try {
      buf = await fetchText(url);
      check(rel, buf, prevSize);
    } catch (e) {
      log("سقط عند " + rel + " — " + e.message);
      log("أُلغي التحديث، ولم يُمَسّ ملفٌّ واحد");
      for (const s of staged) { try { fs.unlinkSync(s.tmp); } catch {} }
      return { ok: false, why: rel + ": " + e.message };
    }
    const dest = path.join(root, rel.split("/").join(path.sep));
    const tmp = dest + ".new";
    try {
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(tmp, buf);
    } catch (e) {
      log("تعذّرت الكتابة عند " + rel + " — " + e.message);
      for (const s of staged) { try { fs.unlinkSync(s.tmp); } catch {} }
      return { ok: false, why: "الكتابة: " + e.message };
    }
    staged.push({ rel, dest, tmp, size: buf.length });
    log("جُلب وقِيس: " + rel + " (" + buf.length + " بايت)");
  }

  // ---- ٢) الاعتماديات: إن تغيّرت لا نكمل، ونقول لماذا ----
  const pkg = staged.find((s) => s.rel.endsWith("package.json"));
  if (pkg) {
    let oldRaw = "";
    try { oldRaw = fs.readFileSync(pkg.dest, "utf8"); } catch {}
    if (oldRaw && depsChanged(oldRaw, fs.readFileSync(pkg.tmp, "utf8"))) {
      log("الاعتماديات تغيّرت — يلزم التنصيب الكامل مرّةً واحدة");
      for (const s of staged) { try { fs.unlinkSync(s.tmp); } catch {} }
      return { ok: false, why: "الاعتماديات تغيّرت — شغّل install.ps1 مرّةً", needsInstaller: true };
    }
  }

  // ---- ٣) الاستبدال دفعةً واحدة ----
  // الشبكة انتهت، وما بقي محلّيٌّ سريع. فاحتمال أن نُقطع في أثنائه
  // أصغر ما يمكن
  let swapped = 0;
  for (const s of staged) {
    try { fs.renameSync(s.tmp, s.dest); swapped++; }
    catch (e) { log("تعذّر استبدال " + s.rel + " — " + e.message); }
  }
  log("استُبدل " + swapped + " من " + staged.length + " ملفاً");

  if (swapped !== staged.length) {
    return { ok: false, why: "استُبدل " + swapped + " من " + staged.length, partial: true };
  }

  // ---- ٤) الختم ----
  try {
    fs.writeFileSync(path.join(root, "tvremote", "windows", "version.json"),
      JSON.stringify({ sha, installedAt: new Date().toISOString() }, null, 2));
  } catch (e) { log("تعذّر ختم النسخة — " + e.message); }

  log("تمّ. الخادم سيخرج، و run.cmd يعيده بعد خمس ثوان");
  append("======== انتهى بنجاح ========");
  return { ok: true, sha, files: swapped };
}

module.exports = { selfUpdate, FILES, check, depsChanged, fetchText, headSha, LOG_FILE };

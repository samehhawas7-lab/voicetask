"use strict";
// ============================================================
// تشديد صلاحيات ملفات الأسرار
//
// `fs.writeFileSync(..., { mode: 0o600 })` صلاحية يونكس، وويندوز
// يتجاهلها: الملف يرث صلاحيات مجلّده، ومجلّدنا `C:\kmc-remote` يرث
// عن `C:\`. فالرمز يوحي بحماية لا تقع.
//
// فيُشدَّد بـ ACL صريح يقطع التوريث. والخادم يعمل بحساب SYSTEM
// (مهمّة مجدولة)، وصاحب الجهاز مسؤول — فهما وحدهما.
//
// وبالمعرّفات لا بالأسماء: «SYSTEM» و«Administrators» تُترجَم في
// ويندوز المعرّب فلا يجدهما icacls، والمعرّف واحد في كل لغة.
// ============================================================

const path = require("path");
const { execFile } = require("child_process");

const SYSTEM = "*S-1-5-18";           // NT AUTHORITY\SYSTEM
const ADMINS = "*S-1-5-32-544";       // BUILTIN\Administrators

/**
 * يقصر الوصول إلى ملفٍ على SYSTEM والمسؤولين. لا يفعل شيئاً خارج
 * ويندوز، إذ تكفي هناك 0600.
 *
 * ويُبتلع خطؤه عمداً: تشديد الصلاحيات لا يجوز أن يُسقط كتابة السرّ
 * نفسه — أن يُحفظ في ملفٍ واسع الصلاحيات خيرٌ من ألّا يُحفظ فيُطلب
 * من صاحب البيت أن يكتبه من جديد كل مرّة.
 *
 * @param {string} file
 * @param {(m:string)=>void} [log]
 */
function harden(file, log) {
  if (process.platform !== "win32") return;
  const note = (m) => { if (log) log("could not tighten " + path.basename(file) + ": " + m); };
  try {
    execFile("icacls",
      [file, "/inheritance:r", "/grant:r", SYSTEM + ":(F)", ADMINS + ":(F)"],
      { windowsHide: true, timeout: 5000 },
      (e) => { if (e) note(e.message); });
  } catch (e) {
    note(e.message);
  }
}

module.exports = { harden };

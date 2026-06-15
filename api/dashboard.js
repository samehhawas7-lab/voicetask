// ============================================================
// VoiceTask AI - Dashboard v2.2.0
// لوحة تحكم احترافية: Dark + RTL + Chart.js + تصدير Excel/PDF
// Multi-User آمنة: قراءة من جهة السيرفر + توكن لكل مستخدم + عزل تام
// المسار: /api/dashboard
// ============================================================

"use strict";
const https = require("https");
const crypto = require("crypto");

// ---------- TIME ----------
function riyadhNow() { return new Date(Date.now() + 3 * 3600 * 1000); }
function riyadhDateStr(d) { return d.toISOString().split("T")[0]; }
function shiftDays(dateStr, n) { const d = new Date(dateStr + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().split("T")[0]; }

// ---------- USERS & ROLES ----------
function normPhone(p) { return String(p || "").replace(/^whatsapp:/i, "").replace(/[\s\-()]/g, "").trim(); }
function samePhone(a, b) { return normPhone(a) === normPhone(b); }
function toDbPhone(p) { const n = normPhone(p); return n ? "whatsapp:" + n : n; }

function getAdmin() { return { phone: normPhone(process.env.YOUR_WHATSAPP), name: process.env.ADMIN_NAME || "المدير الأعلى", isAdmin: true, isPrimary: true, role: "primary" }; }
function getTeam() {
  const raw = process.env.TEAM_MEMBERS || "";
  return raw.split(",").map(s => s.trim()).filter(Boolean).map(entry => {
    const idx = entry.lastIndexOf(":");
    return { phone: normPhone(entry.slice(0, idx)), name: entry.slice(idx + 1).trim(), isAdmin: false, role: "member" };
  }).filter(u => u.phone && u.name);
}
function getSecretaries() {
  const raw = process.env.SECRETARY || "";
  return raw.split(",").map(s => s.trim()).filter(Boolean).map(entry => {
    const parts = entry.split(":");
    if (parts.length < 3) return null;
    return { phone: normPhone(parts[0]), name: parts[1].trim(), bossPhone: normPhone(parts[2]), isAdmin: false, role: "secretary" };
  }).filter(Boolean).filter(u => u.phone && u.name && u.bossPhone);
}
function allUsers() { return [getAdmin(), ...getTeam()]; }
function allPeople() { return [getAdmin(), ...getTeam(), ...getSecretaries()]; }

// ---------- AUTH (token مشتق من الرقم + سر) ----------
function secret() { return process.env.DASHBOARD_SECRET || process.env.TWILIO_AUTH_TOKEN || process.env.SUPABASE_KEY || "voicetask-fallback"; }
function tokenFor(phone) { return crypto.createHash("sha256").update(normPhone(phone) + "|" + secret()).digest("hex").slice(0, 28); }
function resolveByToken(token) {
  if (!token) return null;
  const person = allPeople().find(u => tokenFor(u.phone) === token);
  if (!person) return null;
  if (person.role === "secretary") {
    // السكرتير يدخل على لوحة مديره: صلاحيات كاملة على مساحة المدير + إشعار عند التعديل
    const boss = allUsers().find(u => samePhone(u.phone, person.bossPhone));
    return { ...person, isAdmin: true, isSecretary: true, workspacePhone: person.bossPhone, bossName: boss ? boss.name : "المدير" };
  }
  return { ...person, workspacePhone: person.phone };
}

// ---------- SUPABASE (قراءة + كتابة من السيرفر) ----------
function supabaseRequest(method, pathAndQuery, bodyObj, prefer) {
  const url = new URL(`${process.env.SUPABASE_URL}/rest/v1/${pathAndQuery}`);
  const bodyData = bodyObj ? JSON.stringify(bodyObj) : null;
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: url.hostname, path: url.pathname + url.search, method,
      headers: { "Content-Type": "application/json", apikey: process.env.SUPABASE_KEY, Authorization: `Bearer ${process.env.SUPABASE_KEY}`, Prefer: prefer || "return=representation" }
    }, (res) => {
      let d = ""; res.on("data", c => d += c);
      res.on("end", () => { if (res.statusCode >= 400) return reject(new Error(`Supabase: ${d}`)); try { resolve(d ? JSON.parse(d) : []); } catch (e) { resolve([]); } });
    });
    req.on("error", reject); if (bodyData) req.write(bodyData); req.end();
  });
}
const UP = (p) => `user_phone=eq.${encodeURIComponent(p)}`;
const SELECT = "select=id,title,date,time,category,priority,status,person,project,description,admin_notes,user_phone";

// جلب نافذة زمنية واسعة: من قبل 30 يوم لحد بعد 60 يوم
async function fetchWindow(phone) {
  const today = riyadhDateStr(riyadhNow());
  const from = shiftDays(today, -30), to = shiftDays(today, 60);
  const base = `tasks?date=gte.${from}&date=lte.${to}&status=neq.cancelled&${SELECT}&order=date.asc,time.asc`;
  return supabaseRequest("GET", phone ? `${base}&${UP(phone)}` : base);
}

// ---------- WRITE OPS (عمليات الكتابة + سجل التغييرات) ----------
async function getTaskById(id) { const r = await supabaseRequest("GET", `tasks?id=eq.${id}&${SELECT}`); return r.length ? r[0] : null; }
async function logDashboard(taskId, action, actor, before, after) {
  try {
    await supabaseRequest("POST", "audit_log", {
      task_id: taskId || null, action, changed_by: actor.phone, actor_name: actor.name,
      before_data: before || null, after_data: after || null, source: "dashboard"
    }, "return=minimal");
  } catch (e) { console.error("audit:", e.message); }
}
// إرسال واتساب (للإشعارات)
function sendWhatsApp(to, message) {
  const sid = process.env.TWILIO_ACCOUNT_SID, tok = process.env.TWILIO_AUTH_TOKEN;
  const body = new URLSearchParams({ To: to.startsWith("whatsapp:") ? to : "whatsapp:" + to, From: process.env.TWILIO_WHATSAPP_FROM, Body: message }).toString();
  return new Promise((resolve) => {
    const req = https.request({ hostname: "api.twilio.com", path: `/2010-04-01/Accounts/${sid}/Messages.json`, method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: "Basic " + Buffer.from(`${sid}:${tok}`).toString("base64") } },
      (res) => { res.resume(); res.on("end", resolve); });
    req.on("error", () => resolve()); req.write(body); req.end();
  });
}
// إشعار تعديلات السكرتير من الداشبورد → المدير + الأدمن الأساسي
async function notifySecretaryDash(actor, text) {
  if (!actor || !actor.isSecretary) return;
  const recipients = new Set();
  if (actor.workspacePhone) recipients.add(normPhone(actor.workspacePhone));
  recipients.add(normPhone(getAdmin().phone));
  recipients.delete(normPhone(actor.phone));
  const msg = `🗂 *${actor.name}* (سكرتير ${actor.bossName || "المدير"}) — من اللوحة\n${text}`;
  for (const r of recipients) { try { await sendWhatsApp("whatsapp:" + r, msg); } catch (e) {} }
}
// تعديل مهمة (مع التحقق من الملكية)
async function applyTaskEdit(actor, taskId, updates) {
  const t = await getTaskById(taskId);
  if (!t) return { ok: false, error: "المهمة غير موجودة" };
  const workspace = actor.isSecretary ? actor.workspacePhone : actor.phone;
  if (!actor.isPrimary && !actor.isSecretary && !samePhone(t.user_phone, actor.phone)) return { ok: false, error: "لا تملك صلاحية تعديل هذه المهمة" };
  if (actor.isSecretary && !samePhone(t.user_phone, workspace)) return { ok: false, error: "خارج نطاق صلاحيتك" };
  const allowed = {};
  ["title", "date", "time", "category", "priority", "status", "admin_notes"].forEach(k => { if (updates[k] !== undefined) allowed[k] = updates[k]; });
  if (!Object.keys(allowed).length) return { ok: false, error: "لا يوجد تغيير" };
  if (allowed.date || allowed.time) { allowed.reminder_before_sent = false; allowed.reminder_due_sent = false; allowed.follow_up_sent = false; }
  allowed.updated_at = new Date().toISOString();
  allowed.updated_by = actor.name;
  const before = { title: t.title, date: t.date, time: t.time, category: t.category, priority: t.priority, status: t.status, admin_notes: t.admin_notes };
  await supabaseRequest("PATCH", `tasks?id=eq.${taskId}`, allowed, "return=minimal");
  await logDashboard(taskId, allowed.status === "done" ? "done" : (allowed.status === "cancelled" ? "cancel" : "update"), actor, before, allowed);
  await notifySecretaryDash(actor, `✏️ عدّل مهمة: *${t.title}*`);
  return { ok: true };
}
async function getAuditRows(limit) { return supabaseRequest("GET", `audit_log?order=created_at.desc&limit=${limit || 25}`); }

// ---------- NOTES (ملاحظات) ----------
async function listNotes(taskId) { return supabaseRequest("GET", `task_notes?task_id=eq.${taskId}&order=created_at.desc`); }
async function ownTaskCheck(viewer, taskId) {
  const t = await getTaskById(taskId);
  if (!t) return { ok: false, error: "المهمة غير موجودة" };
  if (!viewer.isAdmin && !samePhone(t.user_phone, viewer.phone)) return { ok: false, error: "لا تملك صلاحية" };
  return { ok: true, task: t };
}
async function addNote(viewer, taskId, body) {
  const chk = await ownTaskCheck(viewer, taskId); if (!chk.ok) return chk;
  if (!body || !body.trim()) return { ok: false, error: "الملاحظة فارغة" };
  const row = await supabaseRequest("POST", "task_notes", { task_id: taskId, user_phone: chk.task.user_phone, body: body.trim(), author_name: viewer.name });
  await logDashboard(taskId, "note", viewer, null, { body: body.trim() });
  return { ok: true, note: Array.isArray(row) ? row[0] : row };
}
async function editNote(viewer, noteId, body) {
  const r = await supabaseRequest("GET", `task_notes?id=eq.${noteId}`); if (!r.length) return { ok: false, error: "الملاحظة غير موجودة" };
  const note = r[0];
  if (!viewer.isAdmin && !samePhone(note.user_phone, viewer.phone)) return { ok: false, error: "لا تملك صلاحية" };
  if (!body || !body.trim()) return { ok: false, error: "الملاحظة فارغة" };
  await supabaseRequest("PATCH", `task_notes?id=eq.${noteId}`, { body: body.trim(), updated_at: new Date().toISOString() }, "return=minimal");
  await logDashboard(note.task_id, "note_edit", viewer, null, { body: body.trim() });
  return { ok: true };
}
async function deleteNote(viewer, noteId) {
  const r = await supabaseRequest("GET", `task_notes?id=eq.${noteId}`); if (!r.length) return { ok: false, error: "الملاحظة غير موجودة" };
  const note = r[0];
  if (!viewer.isAdmin && !samePhone(note.user_phone, viewer.phone)) return { ok: false, error: "لا تملك صلاحية" };
  await supabaseRequest("DELETE", `task_notes?id=eq.${noteId}`, null, "return=minimal");
  await logDashboard(note.task_id, "note_delete", viewer, { body: note.body }, null);
  return { ok: true };
}

// ---------- ATTACHMENTS (مرفقات) ----------
async function listAttachments(taskId) { return supabaseRequest("GET", `task_attachments?task_id=eq.${taskId}&order=created_at.desc`); }
function uploadToStorage(path, buffer, contentType) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${process.env.SUPABASE_URL}/storage/v1/object/attachments/${path}`);
    const req = https.request({ hostname: url.hostname, path: url.pathname, method: "POST",
      headers: { "Content-Type": contentType || "application/octet-stream", apikey: process.env.SUPABASE_KEY, Authorization: `Bearer ${process.env.SUPABASE_KEY}`, "x-upsert": "true", "Content-Length": buffer.length } },
      (res) => { let d = ""; res.on("data", c => d += c); res.on("end", () => { if (res.statusCode >= 400) return reject(new Error(`Storage: ${d}`)); resolve(true); }); });
    req.on("error", reject); req.write(buffer); req.end();
  });
}
function deleteFromStorage(path) {
  return new Promise((resolve) => {
    const url = new URL(`${process.env.SUPABASE_URL}/storage/v1/object/attachments/${path}`);
    const req = https.request({ hostname: url.hostname, path: url.pathname, method: "DELETE",
      headers: { apikey: process.env.SUPABASE_KEY, Authorization: `Bearer ${process.env.SUPABASE_KEY}` } },
      (res) => { res.resume(); res.on("end", resolve); });
    req.on("error", () => resolve()); req.end();
  });
}
async function addAttachment(viewer, taskId, fileName, fileType, base64Data) {
  const chk = await ownTaskCheck(viewer, taskId); if (!chk.ok) return chk;
  const buffer = Buffer.from(base64Data, "base64");
  if (buffer.length > 5 * 1024 * 1024) return { ok: false, error: "الملف كبير جداً (الحد 5MB)" };
  const safe = (fileName || "file").replace(/[^\w.\-]/g, "_").slice(-60);
  const path = `${taskId}/${Date.now()}_${safe}`;
  await uploadToStorage(path, buffer, fileType);
  const fileUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/attachments/${path}`;
  const row = await supabaseRequest("POST", "task_attachments", { task_id: taskId, user_phone: chk.task.user_phone, file_name: fileName || safe, file_path: path, file_url: fileUrl, file_type: fileType || null, uploaded_by: viewer.name });
  await logDashboard(taskId, "attach_add", viewer, null, { file: fileName });
  return { ok: true, attachment: Array.isArray(row) ? row[0] : row };
}
async function deleteAttachment(viewer, attId) {
  const r = await supabaseRequest("GET", `task_attachments?id=eq.${attId}`); if (!r.length) return { ok: false, error: "المرفق غير موجود" };
  const att = r[0];
  if (!viewer.isAdmin && !samePhone(att.user_phone, viewer.phone)) return { ok: false, error: "لا تملك صلاحية" };
  await deleteFromStorage(att.file_path);
  await supabaseRequest("DELETE", `task_attachments?id=eq.${attId}`, null, "return=minimal");
  await logDashboard(att.task_id, "attach_delete", viewer, { file: att.file_name }, null);
  return { ok: true };
}

// ---------- تحليل البيانات ----------
function buildData(tasks, scope, viewer, usersForSwitch, adminToken) {
  const today = riyadhDateStr(riyadhNow());
  const d6 = shiftDays(today, -6);
  const nameByPhone = {}; allUsers().forEach(u => { nameByPhone[normPhone(u.phone)] = u.name; });

  const active = tasks.filter(t => t.status === "new" && t.date >= today);
  const overdue = tasks.filter(t => t.status === "new" && t.date < today);
  const doneLast7 = tasks.filter(t => t.status === "done" && t.date >= d6 && t.date <= today);
  const last7All = tasks.filter(t => t.date >= d6 && t.date <= today);
  const rate = last7All.length ? Math.round((doneLast7.length / last7All.length) * 100) : 0;

  const byCategory = {}; active.forEach(t => { const c = t.category || "شخصي"; byCategory[c] = (byCategory[c] || 0) + 1; });
  const byPriority = { high: 0, medium: 0, low: 0 }; active.forEach(t => { byPriority[t.priority || "medium"]++; });

  const upcoming7 = [];
  for (let i = 0; i < 7; i++) { const d = shiftDays(today, i); upcoming7.push({ date: d, count: active.filter(t => t.date === d).length }); }

  // جدول المهام: النشطة + المتأخرة + المنجزة آخر ٧ أيام
  const tableTasks = tasks
    .filter(t => t.status === "new" || (t.status === "done" && t.date >= d6))
    .map(t => ({ ...t, ownerName: nameByPhone[normPhone(t.user_phone)] || "غير معروف" }))
    .sort((a, b) => (a.date + (a.time || "")).localeCompare(b.date + (b.time || "")));

  return {
    meta: {
      appName: "VoiceTask", version: "2.2.0",
      generatedAt: riyadhNow().toISOString().replace("T", " ").slice(0, 16),
      today, scope, viewer, isAdmin: viewer.isAdmin, isPrimary: !!viewer.isPrimary, isSecretary: !!viewer.isSecretary,
      viewerToken: adminToken,
      adminToken: viewer.isAdmin ? adminToken : null,
      storageBase: `${process.env.SUPABASE_URL}/storage/v1/object/public/attachments`,
      switchUsers: viewer.isPrimary ? usersForSwitch : []
    },
    kpis: { active: active.length, overdue: overdue.length, doneLast7: doneLast7.length, rate },
    charts: {
      status: { نشطة: active.length, متأخرة: overdue.length, "منجزة (٧ أيام)": doneLast7.length },
      category: byCategory,
      priority: byPriority,
      upcoming7
    },
    tasks: tableTasks
  };
}

// ---------- HTML helpers ----------
function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
function injectJSON(obj) { return JSON.stringify(obj).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029"); }

// صفحة الأقفال (بدون توكن صالح)
function lockedPage() {
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>VoiceTask — دخول</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@600;800&family=IBM+Plex+Sans+Arabic:wght@400;500;600&display=swap" rel="stylesheet">
<style>
  :root{--ink:#0d1320;--panel:#151d2e;--line:rgba(148,163,184,.14);--text:#e8edf6;--muted:#93a1b8;--signal:#2dd4a7}
  *{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:radial-gradient(1200px 600px at 80% -10%,#16223a,transparent),var(--ink);color:var(--text);font-family:"IBM Plex Sans Arabic",system-ui,sans-serif}
  .card{max-width:420px;margin:24px;padding:36px 32px;background:var(--panel);border:1px solid var(--line);border-radius:20px;text-align:center}
  h1{font-family:Cairo,sans-serif;font-size:22px;margin:14px 0 6px}
  p{color:var(--muted);line-height:1.8;font-size:14px}
  .wave{display:flex;gap:3px;justify-content:center;align-items:flex-end;height:34px;margin-bottom:6px}
  .wave i{width:4px;border-radius:3px;background:var(--signal);opacity:.85}
  code{background:#0e1626;border:1px solid var(--line);padding:2px 8px;border-radius:8px;color:var(--signal);font-size:12px}
</style></head><body>
  <div class="card">
    <div class="wave">${[10, 20, 32, 18, 26, 14, 22].map(h => `<i style="height:${h}px"></i>`).join("")}</div>
    <h1>هذه اللوحة محمية</h1>
    <p>تحتاج رابط الدخول الخاص بك. كل مستخدم له رابط فيه <code>token</code> فريد. تواصل مع المدير للحصول على رابطك.</p>
  </div>
</body></html>`;
}

// صفحة روابط المستخدمين (للأدمن فقط: ?links=1)
function linksPage(origin) {
  const rows = allUsers().map(u => {
    const url = `${origin}/api/dashboard?token=${tokenFor(u.phone)}`;
    return `<tr><td>${esc(u.name)}${u.isAdmin ? " 👑" : ""}</td><td dir="ltr"><a href="${url}">${url}</a></td></tr>`;
  }).join("");
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>روابط الدخول</title>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;600&display=swap" rel="stylesheet">
<style>
  body{margin:0;padding:32px;background:#0d1320;color:#e8edf6;font-family:"IBM Plex Sans Arabic",sans-serif}
  h1{font-size:20px}p{color:#93a1b8;font-size:14px}
  table{width:100%;border-collapse:collapse;margin-top:16px;font-size:13px}
  td,th{padding:12px;border-bottom:1px solid rgba(148,163,184,.14);text-align:right;vertical-align:top}
  a{color:#2dd4a7;word-break:break-all}th{color:#93a1b8}
</style></head><body>
  <h1>🔗 روابط الدخول للوحة التحكم</h1>
  <p>أرسل لكل شخص رابطه عبر WhatsApp. لا تشارك رابط شخص مع غيره.</p>
  <table><thead><tr><th>المستخدم</th><th>الرابط</th></tr></thead><tbody>${rows}</tbody></table>
</body></html>`;
}

// ---------- الصفحة الرئيسية للوحة ----------
function dashboardPage(data) {
  const D = injectJSON(data);
  return `<!doctype html><html lang="ar" dir="rtl"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>VoiceTask — لوحة التحكم</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@600;700;800&family=IBM+Plex+Sans+Arabic:wght@400;500;600&family=IBM+Plex+Mono:wght@500;600&display=swap" rel="stylesheet">
<style>
  :root{
    --ink:#0d1320; --panel:#151d2e; --panel-2:#1b2638; --line:rgba(148,163,184,.12);
    --text:#e8edf6; --muted:#93a1b8; --faint:#6b7689;
    --signal:#2dd4a7; --amber:#f5b14c; --coral:#fb7185; --low:#34d399;
  }
  *{box-sizing:border-box} html,body{margin:0}
  body{background:radial-gradient(1100px 520px at 88% -8%,#172541,transparent 60%),var(--ink);color:var(--text);
    font-family:"IBM Plex Sans Arabic",system-ui,sans-serif;-webkit-font-smoothing:antialiased;min-height:100vh}
  .num{font-family:"IBM Plex Mono",monospace;font-variant-numeric:tabular-nums;direction:ltr;unicode-bidi:isolate}
  .wrap{max-width:1200px;margin:0 auto;padding:22px 20px 56px}

  /* Header */
  header{display:flex;flex-wrap:wrap;gap:16px;align-items:center;justify-content:space-between;margin-bottom:6px}
  .brand{display:flex;align-items:center;gap:12px}
  .mark{display:flex;gap:3px;align-items:flex-end;height:30px}
  .mark i{width:4px;border-radius:3px;background:linear-gradient(180deg,var(--signal),#1aa07a)}
  .brand h1{font-family:Cairo,sans-serif;font-weight:800;font-size:20px;margin:0;letter-spacing:-.3px}
  .brand .sub{color:var(--muted);font-size:12px;margin-top:2px}
  .head-right{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
  select,.btn{font-family:inherit;font-size:13px;color:var(--text);background:var(--panel-2);border:1px solid var(--line);
    border-radius:11px;padding:9px 13px;cursor:pointer;transition:.15s}
  select:hover,.btn:hover{border-color:rgba(45,212,167,.45)}
  .btn.accent{background:linear-gradient(180deg,#1f6f5b,#175a4a);border-color:transparent}
  .who{font-size:12px;color:var(--muted)}.who b{color:var(--text);font-weight:600}

  /* signature waveform divider */
  .wavebar{height:26px;display:flex;gap:3px;align-items:flex-end;margin:14px 0 22px;opacity:.9}
  .wavebar i{flex:1;border-radius:3px 3px 0 0;background:linear-gradient(180deg,rgba(45,212,167,.55),rgba(45,212,167,.05));transform-origin:bottom}
  @keyframes pulse{0%,100%{transform:scaleY(.55)}50%{transform:scaleY(1)}}

  /* KPI */
  .kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:18px}
  .kpi{background:var(--panel);border:1px solid var(--line);border-radius:16px;padding:18px 18px 16px;position:relative;overflow:hidden}
  .kpi::before{content:"";position:absolute;inset-inline-start:0;top:0;bottom:0;width:3px;background:var(--c,var(--signal))}
  .kpi .lbl{color:var(--muted);font-size:12.5px;font-weight:500;display:flex;align-items:center;gap:7px}
  .kpi .val{font-size:38px;font-weight:600;margin-top:8px;line-height:1;color:var(--c,var(--text))}
  .kpi .hint{color:var(--faint);font-size:11.5px;margin-top:7px}
  .ring{--p:0;width:54px;height:54px;border-radius:50%;position:absolute;inset-block-start:16px;inset-inline-end:16px;
    background:conic-gradient(var(--signal) calc(var(--p)*1%),rgba(148,163,184,.14) 0);display:grid;place-items:center}
  .ring::after{content:"";width:42px;height:42px;border-radius:50%;background:var(--panel)}
  .ring span{position:absolute;font-family:"IBM Plex Mono",monospace;font-size:13px;font-weight:600;color:var(--signal)}

  /* charts */
  .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:18px}
  .card{background:var(--panel);border:1px solid var(--line);border-radius:16px;padding:16px 18px}
  .card h3{font-family:Cairo,sans-serif;font-size:14px;font-weight:700;margin:0 0 14px;color:var(--text)}
  .card.wide{grid-column:1 / -1}
  .chart-box{position:relative;height:200px}
  .chart-box.tall{height:240px}

  /* table */
  .tablecard{background:var(--panel);border:1px solid var(--line);border-radius:16px;padding:16px 18px}
  .tbar{display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between;margin-bottom:14px}
  .tbar h3{font-family:Cairo,sans-serif;font-size:15px;margin:0}
  .filters{display:flex;gap:7px;flex-wrap:wrap;align-items:center}
  .chip{font-size:12px;padding:6px 12px;border-radius:999px;border:1px solid var(--line);background:transparent;color:var(--muted);cursor:pointer}
  .chip.on{background:rgba(45,212,167,.13);border-color:rgba(45,212,167,.4);color:var(--signal)}
  .search{background:var(--panel-2);border:1px solid var(--line);border-radius:11px;padding:8px 12px;color:var(--text);font-family:inherit;font-size:13px;min-width:160px}
  .tscroll{overflow:auto;border-radius:12px}
  table{width:100%;border-collapse:collapse;font-size:13.5px;min-width:560px}
  thead th{text-align:right;color:var(--muted);font-weight:600;font-size:12px;padding:10px 12px;border-bottom:1px solid var(--line);white-space:nowrap}
  tbody td{padding:11px 12px;border-bottom:1px solid rgba(148,163,184,.07);vertical-align:middle}
  tbody tr:hover{background:rgba(255,255,255,.02)}
  .ttl{font-weight:500}
  .dot{display:inline-block;width:9px;height:9px;border-radius:50%;margin-inline-start:2px}
  .pill{font-size:11.5px;padding:3px 10px;border-radius:999px;font-weight:500;white-space:nowrap}
  .pill.new{background:rgba(45,212,167,.13);color:var(--signal)}
  .pill.done{background:rgba(148,163,184,.15);color:var(--muted)}
  .pill.over{background:rgba(245,177,76,.15);color:var(--amber)}
  .muted{color:var(--muted)} .empty{text-align:center;color:var(--muted);padding:34px;font-size:14px}
  footer{margin-top:22px;color:var(--faint);font-size:12px;text-align:center}

  @media (max-width:880px){ .kpis{grid-template-columns:repeat(2,1fr)} .grid{grid-template-columns:1fr} }
  @media (max-width:480px){ .kpis{grid-template-columns:1fr} }
  @media (prefers-reduced-motion:reduce){ .wavebar i{animation:none!important} }

  /* ===== أدوات العرض والفلاتر الموسّعة ===== */
  .toolbar2{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-bottom:14px}
  .viewtabs{display:flex;gap:4px;background:var(--panel-2);border:1px solid var(--line);border-radius:11px;padding:3px}
  .viewtabs button{background:transparent;border:0;color:var(--muted);font-family:inherit;font-size:12.5px;padding:7px 13px;border-radius:8px;cursor:pointer;transition:.15s}
  .viewtabs button.on{background:rgba(45,212,167,.15);color:var(--signal)}
  .fsel{display:flex;flex-direction:column;gap:3px}
  .fsel label{font-size:10.5px;color:var(--faint);padding-inline-start:4px}
  .fsel select{font-family:inherit;font-size:12.5px;color:var(--text);background:var(--panel-2);border:1px solid var(--line);border-radius:10px;padding:8px 11px;cursor:pointer;min-width:120px}
  .fsel select:hover{border-color:rgba(45,212,167,.4)}
  .btn-clear{align-self:flex-end;font-size:12px;padding:8px 12px;border-radius:10px;background:transparent;border:1px solid var(--line);color:var(--muted);cursor:pointer}

  /* بطاقات */
  .cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px}
  .tcard{background:var(--panel-2);border:1px solid var(--line);border-radius:14px;padding:14px 15px;position:relative;border-inline-start:3px solid var(--cc,var(--signal))}
  .tcard h4{margin:0 0 8px;font-size:14.5px;font-weight:600;display:flex;align-items:center;gap:6px;justify-content:space-between}
  .tcard .meta{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
  .tcard .tag{font-size:11px;padding:3px 9px;border-radius:999px;background:rgba(148,163,184,.12);color:var(--muted)}
  .tcard .edit-ic{cursor:pointer;color:var(--muted);font-size:13px;flex-shrink:0}

  /* عرض حسب الفئة */
  .catgroup{margin-bottom:16px}
  .catgroup .ghead{display:flex;align-items:center;gap:8px;font-family:Cairo,sans-serif;font-weight:700;font-size:14px;margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid var(--line)}
  .catgroup .gcount{font-size:11.5px;color:var(--faint);font-weight:400}

  /* زر تعديل بالجدول */
  .edit-btn{background:rgba(45,212,167,.1);border:1px solid rgba(45,212,167,.3);color:var(--signal);border-radius:8px;padding:5px 10px;font-size:12px;cursor:pointer;font-family:inherit}
  .edit-btn:hover{background:rgba(45,212,167,.2)}

  /* النافذة المنبثقة */
  .overlay{position:fixed;inset:0;background:rgba(5,9,16,.72);backdrop-filter:blur(3px);display:none;z-index:50;align-items:flex-start;justify-content:center;overflow-y:auto;padding:24px 14px}
  .overlay.show{display:flex}
  .modal{background:var(--panel);border:1px solid var(--line);border-radius:18px;max-width:540px;width:100%;padding:22px;margin-top:10px}
  .modal h3{font-family:Cairo,sans-serif;font-size:17px;margin:0 0 4px}
  .modal .tsub{color:var(--muted);font-size:12.5px;margin-bottom:16px}
  .frow{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px}
  .field{display:flex;flex-direction:column;gap:5px}
  .field.full{grid-column:1 / -1}
  .field label{font-size:11.5px;color:var(--muted)}
  .field input,.field select,.field textarea{font-family:inherit;font-size:13.5px;color:var(--text);background:var(--panel-2);border:1px solid var(--line);border-radius:10px;padding:9px 11px}
  .field textarea{resize:vertical;min-height:54px}
  .msec{margin-top:8px;border-top:1px solid var(--line);padding-top:14px}
  .msec h4{font-family:Cairo,sans-serif;font-size:13.5px;margin:0 0 10px;display:flex;align-items:center;gap:6px}
  .note-item,.att-item{display:flex;gap:8px;align-items:flex-start;background:var(--panel-2);border:1px solid var(--line);border-radius:10px;padding:9px 11px;margin-bottom:8px;font-size:13px}
  .note-item .nbody{flex:1;line-height:1.6;word-break:break-word}
  .note-item .nmeta{font-size:10.5px;color:var(--faint);margin-top:3px}
  .mini{background:transparent;border:0;cursor:pointer;font-size:13px;padding:2px 5px;border-radius:6px}
  .mini.del{color:var(--coral)} .mini.ed{color:var(--amber)}
  .att-item a{color:var(--signal);text-decoration:none;flex:1;word-break:break-all}
  .att-thumb{width:40px;height:40px;border-radius:8px;object-fit:cover;border:1px solid var(--line)}
  .add-row{display:flex;gap:8px;margin-top:6px}
  .add-row input[type=text]{flex:1;font-family:inherit;font-size:13px;background:var(--panel-2);border:1px solid var(--line);border-radius:10px;padding:9px 11px;color:var(--text)}
  .modal-actions{display:flex;gap:10px;justify-content:flex-end;margin-top:18px}
  .mbtn{font-family:inherit;font-size:13.5px;padding:10px 18px;border-radius:11px;cursor:pointer;border:1px solid var(--line);background:var(--panel-2);color:var(--text)}
  .mbtn.save{background:linear-gradient(180deg,#1f6f5b,#175a4a);border-color:transparent;color:#fff}
  .toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:var(--panel);border:1px solid var(--signal);color:var(--text);padding:12px 20px;border-radius:12px;font-size:13.5px;z-index:60;display:none;box-shadow:0 8px 24px rgba(0,0,0,.4)}
  .toast.show{display:block}
  .spin{display:inline-block;width:13px;height:13px;border:2px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:sp .6s linear infinite;vertical-align:middle}
  @keyframes sp{to{transform:rotate(360deg)}}

  /* print -> PDF */
  @media print{
    body{background:#fff;color:#111}
    .head-right,.filters,.search,.wavebar,.toolbar2,.edit-btn,.edit-ic{display:none!important}
    .card,.kpi,.tablecard{border-color:#ddd;background:#fff}
    .kpi .val,.brand h1{color:#111}
  }
</style></head>
<body>
<div class="wrap">
  <header>
    <div class="brand">
      <div class="mark" aria-hidden="true">${[12, 22, 30, 16].map(h => `<i style="height:${h}px"></i>`).join("")}</div>
      <div>
        <h1>VoiceTask</h1>
        <div class="sub" id="subtitle"></div>
      </div>
    </div>
    <div class="head-right">
      <span class="who" id="who"></span>
      <span id="switchSlot"></span>
      <button class="btn" id="btnXlsx">⬇️ Excel</button>
      <button class="btn accent" id="btnPdf">🖨️ PDF</button>
    </div>
  </header>

  <div class="wavebar" id="wavebar" aria-hidden="true"></div>

  <section class="kpis" id="kpis"></section>

  <section class="grid">
    <div class="card"><h3>حسب الحالة</h3><div class="chart-box"><canvas id="cStatus"></canvas></div></div>
    <div class="card"><h3>حسب الأولوية</h3><div class="chart-box"><canvas id="cPriority"></canvas></div></div>
    <div class="card"><h3>حسب الفئة</h3><div class="chart-box"><canvas id="cCategory"></canvas></div></div>
    <div class="card wide"><h3>قادم خلال ٧ أيام</h3><div class="chart-box tall"><canvas id="cUpcoming"></canvas></div></div>
  </section>

  <section class="tablecard">
    <div class="tbar">
      <h3>المهام</h3>
      <div class="filters">
        <input class="search" id="search" placeholder="🔍 بحث في العنوان…">
      </div>
    </div>

    <div class="toolbar2">
      <div class="viewtabs" id="viewtabs">
        <button data-v="table" class="on">📋 جدول</button>
        <button data-v="cards">🗂 بطاقات</button>
        <button data-v="bycat">📁 حسب الفئة</button>
      </div>
      <div class="fsel"><label>الحالة</label>
        <select id="fStatus"><option value="all">الكل</option><option value="new">نشطة</option><option value="over">متأخرة</option><option value="done">منجزة</option></select>
      </div>
      <div class="fsel"><label>الفئة/الإدارة</label><select id="fCat"></select></div>
      <div class="fsel"><label>الأولوية</label>
        <select id="fPrio"><option value="all">الكل</option><option value="high">عالية</option><option value="medium">متوسطة</option><option value="low">منخفضة</option></select>
      </div>
      <div class="fsel"><label>التاريخ</label>
        <select id="fDate"><option value="all">كل التواريخ</option><option value="today">اليوم</option><option value="week">هذا الأسبوع</option><option value="past">سابقة</option><option value="future">قادمة</option></select>
      </div>
      <div class="fsel"><label>الفرز</label>
        <select id="fSort"><option value="date_asc">التاريخ ↑</option><option value="date_desc">التاريخ ↓</option><option value="prio">الأولوية</option><option value="title">العنوان</option></select>
      </div>
      <button class="btn-clear" id="clearFilters">↺ إعادة ضبط</button>
    </div>

    <div class="tscroll" id="viewTable"><table id="tbl"><thead></thead><tbody></tbody></table></div>
    <div class="cards" id="viewCards" style="display:none"></div>
    <div id="viewByCat" style="display:none"></div>
  </section>

  <footer id="foot"></footer>
</div>

<!-- النافذة المنبثقة للتعديل -->
<div class="overlay" id="overlay">
  <div class="modal" id="modal">
    <h3 id="mTitle">تعديل المهمة</h3>
    <div class="tsub" id="mSub"></div>
    <div class="frow">
      <div class="field full"><label>العنوان</label><input id="eTitle" type="text"></div>
      <div class="field"><label>التاريخ</label><input id="eDate" type="date"></div>
      <div class="field"><label>الوقت</label><input id="eTime" type="time"></div>
      <div class="field"><label>الفئة/الإدارة</label><input id="eCat" type="text" list="catlist"></div>
      <div class="field"><label>الأولوية</label><select id="ePrio"><option value="high">عالية</option><option value="medium">متوسطة</option><option value="low">منخفضة</option></select></div>
      <div class="field"><label>الحالة</label><select id="eStatus"><option value="new">نشطة</option><option value="done">منجزة</option><option value="cancelled">ملغاة</option></select></div>
    </div>
    <datalist id="catlist"></datalist>

    <div class="msec">
      <h4>📝 الملاحظات</h4>
      <div id="notesList"></div>
      <div class="add-row">
        <input type="text" id="newNote" placeholder="أضف ملاحظة…">
        <button class="mbtn save" id="addNoteBtn" style="padding:9px 14px">إضافة</button>
      </div>
    </div>

    <div class="msec">
      <h4>📎 المرفقات</h4>
      <div id="attList"></div>
      <div class="add-row">
        <input type="file" id="fileInput" style="font-size:12px;color:var(--muted)">
        <button class="mbtn save" id="uploadBtn" style="padding:9px 14px">رفع</button>
      </div>
    </div>

    <div class="modal-actions">
      <button class="mbtn" id="closeModal">إغلاق</button>
      <button class="mbtn save" id="saveModal">حفظ التعديلات</button>
    </div>
  </div>
</div>
<div class="toast" id="toast"></div>

<script id="data" type="application/json">${D}</script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>
<script>
const DATA = JSON.parse(document.getElementById("data").textContent);
const C = { signal:"#2dd4a7", amber:"#f5b14c", coral:"#fb7185", low:"#34d399", muted:"#93a1b8", line:"rgba(148,163,184,.12)", text:"#e8edf6" };
const PRIO = { high:{c:C.coral,n:"عالية"}, medium:{c:C.amber,n:"متوسطة"}, low:{c:C.low,n:"منخفضة"} };
const reduce = matchMedia("(prefers-reduced-motion:reduce)").matches;

// ---- header / context ----
const m = DATA.meta;
document.getElementById("subtitle").textContent = "مركز المهام — توقيت الرياض";
const scopeLabel = m.scope === "all" ? "كل الفريق" : (m.scope === "user" ? m.viewer.name : m.viewer.name);
document.getElementById("who").innerHTML = "العرض: <b>" + esc(scopeLabel) + "</b>";

// admin switcher
if (m.isPrimary) {
  const sel = document.createElement("select");
  const base = "/api/dashboard?token=" + encodeURIComponent(m.adminToken);
  const opts = [["__all__","👥 كل الفريق"]].concat(m.switchUsers.map(u => [u.phone, "👤 " + u.name]));
  opts.forEach(([val,label]) => {
    const o = document.createElement("option"); o.value = val; o.textContent = label;
    if ((m.scope === "all" && val === "__all__") || (m.scope === "user" && m.viewer.phone === val)) o.selected = true;
    sel.appendChild(o);
  });
  sel.onchange = () => { location.href = base + (sel.value === "__all__" ? "" : "&as=" + encodeURIComponent(sel.value)); };
  document.getElementById("switchSlot").appendChild(sel);
}

// signature waveform
(function(){
  const bar = document.getElementById("wavebar"); const N = 64;
  for (let i=0;i<N;i++){ const el=document.createElement("i");
    const h = 30 + 70*Math.abs(Math.sin(i*0.7)*Math.cos(i*0.21));
    el.style.height = h + "%";
    if (!reduce) el.style.animation = "pulse " + (1.6 + (i%5)*0.25) + "s ease-in-out " + (i*0.03) + "s infinite";
    bar.appendChild(el);
  }
})();

// ---- KPIs ----
const k = DATA.kpis;
const kpiDefs = [
  { lbl:"📌 نشطة", val:k.active, hint:"مهام قادمة لم تُنجز", c:C.signal },
  { lbl:"✅ منجزة (٧ أيام)", val:k.doneLast7, hint:"آخر أسبوع", c:C.low },
  { lbl:"⏳ متأخرة", val:k.overdue, hint:"فات موعدها", c:C.amber },
  { lbl:"🏆 نسبة الإنجاز", val:k.rate, hint:"آخر ٧ أيام", c:C.signal, ring:true }
];
const kpiWrap = document.getElementById("kpis");
kpiDefs.forEach(d => {
  const el = document.createElement("div"); el.className = "kpi"; el.style.setProperty("--c", d.c);
  el.innerHTML = '<div class="lbl">'+d.lbl+'</div>'+
    (d.ring ? '<div class="ring" style="--p:'+d.val+'"><span>'+d.val+'%</span></div>' : '')+
    '<div class="val num" data-to="'+d.val+'">0'+(d.ring?'%':'')+'</div>'+
    '<div class="hint">'+d.hint+'</div>';
  kpiWrap.appendChild(el);
});
// count-up
document.querySelectorAll(".kpi .val").forEach(el => {
  const to = +el.dataset.to, pct = el.textContent.includes("%");
  if (reduce){ el.textContent = to + (pct?"%":""); return; }
  let s=0; const step=Math.max(1,Math.round(to/28));
  const id=setInterval(()=>{ s+=step; if(s>=to){s=to;clearInterval(id);} el.textContent=s+(pct?"%":""); }, 22);
});

// ---- Charts ----
Chart.defaults.font.family = "IBM Plex Sans Arabic, sans-serif";
Chart.defaults.color = C.muted;
Chart.defaults.plugins.legend.labels.boxWidth = 12;
Chart.defaults.plugins.legend.labels.padding = 14;
Chart.defaults.plugins.legend.rtl = true;
Chart.defaults.animation = reduce ? false : { duration: 600 };

function doughnut(id, labels, vals, colors){
  new Chart(document.getElementById(id), {
    type:"doughnut",
    data:{ labels, datasets:[{ data:vals, backgroundColor:colors, borderColor:"#151d2e", borderWidth:3, hoverOffset:6 }] },
    options:{ responsive:true, maintainAspectRatio:false, cutout:"62%",
      plugins:{ legend:{ position:"bottom" } } }
  });
}
doughnut("cStatus", Object.keys(DATA.charts.status), Object.values(DATA.charts.status), [C.signal, C.amber, C.muted]);
doughnut("cPriority",
  ["عالية","متوسطة","منخفضة"],
  [DATA.charts.priority.high, DATA.charts.priority.medium, DATA.charts.priority.low],
  [C.coral, C.amber, C.low]);

// category bar (horizontal)
(function(){
  const cats = Object.keys(DATA.charts.category), vals = Object.values(DATA.charts.category);
  new Chart(document.getElementById("cCategory"), {
    type:"bar",
    data:{ labels: cats.length?cats:["لا مهام"], datasets:[{ data: vals.length?vals:[0],
      backgroundColor:"rgba(45,212,167,.55)", borderColor:C.signal, borderWidth:1, borderRadius:6, barThickness:18 }] },
    options:{ indexAxis:"y", responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{display:false} },
      scales:{ x:{ grid:{color:C.line}, ticks:{precision:0} }, y:{ grid:{display:false} } } }
  });
})();

// upcoming 7 days
(function(){
  const u = DATA.charts.upcoming7;
  const labels = u.map(x => { const d=new Date(x.date+"T12:00:00");
    return d.toLocaleDateString("ar-SA",{weekday:"short"}) + " " + d.getDate(); });
  new Chart(document.getElementById("cUpcoming"), {
    type:"bar",
    data:{ labels, datasets:[{ data:u.map(x=>x.count),
      backgroundColor:"rgba(45,212,167,.5)", borderColor:C.signal, borderWidth:1, borderRadius:7, maxBarThickness:46 }] },
    options:{ responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{display:false} },
      scales:{ x:{ grid:{display:false} }, y:{ grid:{color:C.line}, ticks:{precision:0}, beginAtZero:true } } }
  });
})();

// ---- Tasks View Engine ----
const today = m.today;
const showOwner = m.scope === "all";
const TOKEN = m.viewerToken;
const canEdit = true; // كل مستخدم يعدّل مهامه؛ الأدمن يعدّل الكل (يتحقق السيرفر)
function statusInfo(t){
  if (t.status === "done") return { cls:"done", txt:"منجزة" };
  if (t.status === "new" && t.date < today) return { cls:"over", txt:"متأخرة" };
  return { cls:"new", txt:"نشطة" };
}
function weekEnd(){ const d=new Date(today+"T12:00:00Z"); d.setUTCDate(d.getUTCDate()+7); return d.toISOString().split("T")[0]; }
const WEND = weekEnd();

// تعبئة قوائم الفئات (الفلتر + datalist)
(function(){
  const cats = [...new Set(DATA.tasks.map(t=>t.category||"شخصي"))].sort();
  const fCat = document.getElementById("fCat");
  fCat.innerHTML = '<option value="all">كل الفئات</option>' + cats.map(c=>'<option value="'+esc(c)+'">'+esc(c)+'</option>').join("");
  document.getElementById("catlist").innerHTML = cats.map(c=>'<option value="'+esc(c)+'">').join("");
})();

const F = { status:"all", cat:"all", prio:"all", date:"all", sort:"date_asc", search:"" };
let curView = "table";

function passFilters(t){
  const si = statusInfo(t);
  if (F.status==="new" && si.cls!=="new") return false;
  if (F.status==="over" && si.cls!=="over") return false;
  if (F.status==="done" && si.cls!=="done") return false;
  if (F.cat!=="all" && (t.category||"شخصي")!==F.cat) return false;
  if (F.prio!=="all" && (t.priority||"medium")!==F.prio) return false;
  if (F.date==="today" && t.date!==today) return false;
  if (F.date==="week" && !(t.date>=today && t.date<=WEND)) return false;
  if (F.date==="past" && !(t.date<today)) return false;
  if (F.date==="future" && !(t.date>today)) return false;
  if (F.search && !(t.title||"").toLowerCase().includes(F.search)) return false;
  return true;
}
const prioRank = { high:0, medium:1, low:2 };
function sortRows(rows){
  const s = F.sort;
  return rows.slice().sort((a,b)=>{
    if (s==="date_asc") return (a.date+(a.time||"")).localeCompare(b.date+(b.time||""));
    if (s==="date_desc") return (b.date+(b.time||"")).localeCompare(a.date+(a.time||""));
    if (s==="prio") return prioRank[a.priority||"medium"]-prioRank[b.priority||"medium"];
    if (s==="title") return (a.title||"").localeCompare(b.title||"","ar");
    return 0;
  });
}
function getRows(){ return sortRows(DATA.tasks.filter(passFilters)); }

// ---- عرض: جدول ----
function buildHead(){
  const cols = ["المهمة","التاريخ","الوقت","الفئة","الأولوية","الحالة"];
  if (showOwner) cols.push("المالك");
  cols.push("");
  document.querySelector("#tbl thead").innerHTML = "<tr>"+cols.map(c=>"<th>"+c+"</th>").join("")+"</tr>";
}
function renderTable(rows){
  const body = document.querySelector("#tbl tbody");
  if (!rows.length){ const span = 7 + (showOwner?1:0);
    body.innerHTML = '<tr><td class="empty" colspan="'+span+'">لا توجد مهام مطابقة 🎉</td></tr>'; return; }
  body.innerHTML = rows.map(t => {
    const si = statusInfo(t), p = PRIO[t.priority||"medium"];
    let r = "<tr><td class='ttl'>"+esc(t.title)+(t.person?" <span class='muted'>· "+esc(t.person)+"</span>":"")+"</td>"+
      "<td class='num'>"+esc(t.date)+"</td>"+
      "<td class='num'>"+esc(t.time||"—")+"</td>"+
      "<td class='muted'>"+esc(t.category||"شخصي")+"</td>"+
      "<td><span class='dot' style='background:"+p.c+"'></span> "+p.n+"</td>"+
      "<td><span class='pill "+si.cls+"'>"+si.txt+"</span></td>";
    if (showOwner) r += "<td class='muted'>"+esc(t.ownerName)+"</td>";
    r += "<td><button class='edit-btn' data-id='"+t.id+"'>✏️ تعديل</button></td>";
    return r + "</tr>";
  }).join("");
  bindEditButtons();
}
// ---- عرض: بطاقات ----
function renderCards(rows){
  const box = document.getElementById("viewCards");
  if (!rows.length){ box.innerHTML='<div class="empty">لا توجد مهام مطابقة 🎉</div>'; return; }
  box.innerHTML = rows.map(t=>{
    const si=statusInfo(t), p=PRIO[t.priority||"medium"];
    return "<div class='tcard' style='--cc:"+p.c+"'>"+
      "<h4><span>"+esc(t.title)+"</span><span class='edit-ic' data-id='"+t.id+"'>✏️</span></h4>"+
      "<div class='meta'>"+
        "<span class='tag'>📅 "+esc(t.date)+"</span>"+
        "<span class='tag'>⏰ "+esc(t.time||"—")+"</span>"+
        "<span class='tag'>"+esc(t.category||"شخصي")+"</span>"+
        "<span class='tag' style='color:"+p.c+"'>"+p.n+"</span>"+
        "<span class='pill "+si.cls+"'>"+si.txt+"</span>"+
        (showOwner?"<span class='tag'>👤 "+esc(t.ownerName)+"</span>":"")+
      "</div></div>";
  }).join("");
  bindEditButtons();
}
// ---- عرض: حسب الفئة ----
function renderByCat(rows){
  const box = document.getElementById("viewByCat");
  if (!rows.length){ box.innerHTML='<div class="empty">لا توجد مهام مطابقة 🎉</div>'; return; }
  const groups = {};
  rows.forEach(t=>{ const c=t.category||"شخصي"; (groups[c]=groups[c]||[]).push(t); });
  box.innerHTML = Object.keys(groups).sort().map(c=>{
    const list = groups[c];
    const rowsHtml = list.map(t=>{
      const si=statusInfo(t), p=PRIO[t.priority||"medium"];
      return "<tr><td class='ttl'>"+esc(t.title)+"</td>"+
        "<td class='num'>"+esc(t.date)+"</td><td class='num'>"+esc(t.time||"—")+"</td>"+
        "<td><span class='dot' style='background:"+p.c+"'></span> "+p.n+"</td>"+
        "<td><span class='pill "+si.cls+"'>"+si.txt+"</span></td>"+
        "<td><button class='edit-btn' data-id='"+t.id+"'>✏️</button></td></tr>";
    }).join("");
    return "<div class='catgroup'><div class='ghead'>📁 "+esc(c)+" <span class='gcount'>("+list.length+")</span></div>"+
      "<div class='tscroll'><table><tbody>"+rowsHtml+"</tbody></table></div></div>";
  }).join("");
  bindEditButtons();
}
function render(){
  const rows = getRows();
  document.getElementById("viewTable").style.display = curView==="table"?"":"none";
  document.getElementById("viewCards").style.display = curView==="cards"?"":"none";
  document.getElementById("viewByCat").style.display = curView==="bycat"?"":"none";
  if (curView==="table") renderTable(rows);
  else if (curView==="cards") renderCards(rows);
  else renderByCat(rows);
}
buildHead();
render();

// ---- ربط الفلاتر ----
document.getElementById("fStatus").onchange = e=>{ F.status=e.target.value; render(); };
document.getElementById("fCat").onchange = e=>{ F.cat=e.target.value; render(); };
document.getElementById("fPrio").onchange = e=>{ F.prio=e.target.value; render(); };
document.getElementById("fDate").onchange = e=>{ F.date=e.target.value; render(); };
document.getElementById("fSort").onchange = e=>{ F.sort=e.target.value; render(); };
document.getElementById("search").oninput = e=>{ F.search=e.target.value.trim().toLowerCase(); render(); };
document.getElementById("clearFilters").onclick = ()=>{
  F.status="all";F.cat="all";F.prio="all";F.date="all";F.sort="date_asc";F.search="";
  ["fStatus","fCat","fPrio","fDate"].forEach(id=>document.getElementById(id).value="all");
  document.getElementById("fSort").value="date_asc"; document.getElementById("search").value="";
  render();
};
document.querySelectorAll("#viewtabs button").forEach(b=> b.onclick=()=>{
  document.querySelectorAll("#viewtabs button").forEach(x=>x.classList.remove("on"));
  b.classList.add("on"); curView=b.dataset.v; render();
});

// ---- النافذة المنبثقة + التعديل ----
function bindEditButtons(){
  document.querySelectorAll(".edit-btn,.edit-ic").forEach(b=> b.onclick=()=>openModal(+b.dataset.id));
}
const overlay=document.getElementById("overlay");
let editingTask=null;
async function api(payload){
  const res = await fetch("/api/dashboard?token="+encodeURIComponent(TOKEN), {
    method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(payload)
  });
  return res.json();
}
function toast(msg){ const t=document.getElementById("toast"); t.textContent=msg; t.classList.add("show"); setTimeout(()=>t.classList.remove("show"),2400); }

function openModal(id){
  const t = DATA.tasks.find(x=>x.id===id); if(!t) return;
  editingTask=t;
  document.getElementById("mTitle").textContent="تعديل: "+t.title;
  document.getElementById("mSub").textContent=(t.ownerName?("المالك: "+t.ownerName+" · "):"")+"#"+t.id;
  document.getElementById("eTitle").value=t.title||"";
  document.getElementById("eDate").value=t.date||"";
  document.getElementById("eTime").value=t.time||"";
  document.getElementById("eCat").value=t.category||"شخصي";
  document.getElementById("ePrio").value=t.priority||"medium";
  document.getElementById("eStatus").value=t.status||"new";
  document.getElementById("notesList").innerHTML="<div class='muted' style='font-size:12px'>جارٍ التحميل…</div>";
  document.getElementById("attList").innerHTML="";
  document.getElementById("newNote").value="";
  document.getElementById("fileInput").value="";
  overlay.classList.add("show");
  loadDetails(id);
}
function closeModal(){ overlay.classList.remove("show"); editingTask=null; }
document.getElementById("closeModal").onclick=closeModal;
overlay.onclick=e=>{ if(e.target===overlay) closeModal(); };

async function loadDetails(id){
  const r = await api({action:"details", task_id:id});
  if(!r.ok){ document.getElementById("notesList").innerHTML="<div class='muted'>"+esc(r.error||"خطأ")+"</div>"; return; }
  renderNotes(r.notes||[]); renderAtts(r.attachments||[]);
}
function renderNotes(notes){
  const box=document.getElementById("notesList");
  if(!notes.length){ box.innerHTML="<div class='muted' style='font-size:12px'>لا ملاحظات</div>"; return; }
  box.innerHTML=notes.map(n=>"<div class='note-item'><div class='nbody'>"+esc(n.body)+
    "<div class='nmeta'>"+esc(n.author_name||"")+"</div></div>"+
    "<button class='mini ed' data-ed='"+n.id+"'>✏️</button>"+
    "<button class='mini del' data-del='"+n.id+"'>🗑</button></div>").join("");
  box.querySelectorAll("[data-del]").forEach(b=>b.onclick=async()=>{ const r=await api({action:"note_delete",note_id:+b.dataset.del}); if(r.ok){toast("حُذفت الملاحظة");loadDetails(editingTask.id);}else toast(r.error); });
  box.querySelectorAll("[data-ed]").forEach(b=>b.onclick=async()=>{ const cur=b.closest(".note-item").querySelector(".nbody").childNodes[0].textContent; const nv=prompt("تعديل الملاحظة:",cur); if(nv===null)return; const r=await api({action:"note_edit",note_id:+b.dataset.ed,body:nv}); if(r.ok){toast("تم التعديل");loadDetails(editingTask.id);}else toast(r.error); });
}
function renderAtts(atts){
  const box=document.getElementById("attList");
  if(!atts.length){ box.innerHTML="<div class='muted' style='font-size:12px'>لا مرفقات</div>"; return; }
  box.innerHTML=atts.map(a=>{
    const isImg=(a.file_type||"").startsWith("image");
    return "<div class='att-item'>"+(isImg?"<img class='att-thumb' src='"+esc(a.file_url)+"'>":"📄")+
      "<a href='"+esc(a.file_url)+"' target='_blank'>"+esc(a.file_name)+"</a>"+
      "<button class='mini del' data-da='"+a.id+"'>🗑</button></div>";
  }).join("");
  box.querySelectorAll("[data-da]").forEach(b=>b.onclick=async()=>{ const r=await api({action:"attach_delete",att_id:+b.dataset.da}); if(r.ok){toast("حُذف المرفق");loadDetails(editingTask.id);}else toast(r.error); });
}
// إضافة ملاحظة
document.getElementById("addNoteBtn").onclick=async()=>{
  const v=document.getElementById("newNote").value.trim(); if(!v)return;
  const r=await api({action:"note_add",task_id:editingTask.id,body:v});
  if(r.ok){ document.getElementById("newNote").value=""; toast("أُضيفت الملاحظة"); loadDetails(editingTask.id); } else toast(r.error);
};
// رفع مرفق
document.getElementById("uploadBtn").onclick=()=>{
  const f=document.getElementById("fileInput").files[0];
  if(!f){ toast("اختر ملفاً أولاً"); return; }
  if(f.size>5*1024*1024){ toast("الملف كبير (الحد 5MB)"); return; }
  const btn=document.getElementById("uploadBtn"); btn.innerHTML='<span class="spin"></span>';
  const reader=new FileReader();
  reader.onload=async()=>{
    const base64=reader.result.split(",")[1];
    const r=await api({action:"attach_add",task_id:editingTask.id,file_name:f.name,file_type:f.type,data:base64});
    btn.textContent="رفع";
    if(r.ok){ document.getElementById("fileInput").value=""; toast("تم الرفع"); loadDetails(editingTask.id); } else toast(r.error||"فشل الرفع");
  };
  reader.readAsDataURL(f);
};
// حفظ تعديلات المهمة
document.getElementById("saveModal").onclick=async()=>{
  const updates={
    title:document.getElementById("eTitle").value.trim(),
    date:document.getElementById("eDate").value,
    time:document.getElementById("eTime").value,
    category:document.getElementById("eCat").value.trim()||"شخصي",
    priority:document.getElementById("ePrio").value,
    status:document.getElementById("eStatus").value
  };
  const btn=document.getElementById("saveModal"); btn.innerHTML='<span class="spin"></span>';
  const r=await api({action:"edit",task_id:editingTask.id,updates});
  btn.textContent="حفظ التعديلات";
  if(r.ok){
    Object.assign(editingTask,updates); // تحديث محلي فوري
    toast("✅ حُفظت التعديلات"); render(); closeModal();
  } else toast(r.error||"تعذّر الحفظ");
};

// ---- Export: Excel ----
document.getElementById("btnXlsx").onclick = () => {
  const rows = getRows().map(t => {
    const o = { "المهمة":t.title, "التاريخ":t.date, "الوقت":t.time||"", "الفئة":t.category||"شخصي",
      "الأولوية":(PRIO[t.priority||"medium"]).n, "الحالة":statusInfo(t).txt, "الشخص":t.person||"", "ملاحظات":t.description||"" };
    if (showOwner) o["المالك"] = t.ownerName;
    return o;
  });
  const ws = XLSX.utils.json_to_sheet(rows.length?rows:[{"المهمة":"لا مهام"}]);
  ws["!cols"] = [{wch:34},{wch:12},{wch:8},{wch:12},{wch:10},{wch:10},{wch:14},{wch:30}].concat(showOwner?[{wch:14}]:[]);
  const wb = XLSX.utils.book_new(); wb.Workbook = { Views:[{ RTL:true }] };
  XLSX.utils.book_append_sheet(wb, ws, "المهام");
  XLSX.writeFile(wb, "VoiceTask-" + scopeLabel + "-" + today + ".xlsx");
};
// ---- Export: PDF (print) ----
document.getElementById("btnPdf").onclick = () => window.print();

document.getElementById("foot").textContent = "VoiceTask v" + m.version + " · تم التوليد " + m.generatedAt + " (الرياض)";

function esc(s){ return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
</script>
</body></html>`;
}

// ---------- MAIN ----------
module.exports = async (req, res) => {
  try {
    const q = req.query || {};
    const token = q.token || "";
    const user = resolveByToken(token);

    // ===== POST: عمليات الكتابة (تعديل / سجل) — JSON =====
    if (req.method === "POST") {
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      if (!user) { res.statusCode = 401; return res.end(JSON.stringify({ ok: false, error: "توكن غير صالح" })); }
      let body = req.body;
      if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = {}; } }
      body = body || {};
      const action = body.action;
      try {
        if (action === "edit") {
          const result = await applyTaskEdit(user, body.task_id, body.updates || {});
          res.statusCode = result.ok ? 200 : 400;
          return res.end(JSON.stringify(result));
        }
        if (action === "details") {
          // جلب ملاحظات ومرفقات مهمة واحدة
          const chk = await ownTaskCheck(user, body.task_id);
          if (!chk.ok) { res.statusCode = 403; return res.end(JSON.stringify(chk)); }
          const [notes, attachments] = await Promise.all([listNotes(body.task_id), listAttachments(body.task_id)]);
          return res.end(JSON.stringify({ ok: true, notes, attachments }));
        }
        if (action === "note_add") { const r = await addNote(user, body.task_id, body.body); res.statusCode = r.ok ? 200 : 400; return res.end(JSON.stringify(r)); }
        if (action === "note_edit") { const r = await editNote(user, body.note_id, body.body); res.statusCode = r.ok ? 200 : 400; return res.end(JSON.stringify(r)); }
        if (action === "note_delete") { const r = await deleteNote(user, body.note_id); res.statusCode = r.ok ? 200 : 400; return res.end(JSON.stringify(r)); }
        if (action === "attach_add") { const r = await addAttachment(user, body.task_id, body.file_name, body.file_type, body.data); res.statusCode = r.ok ? 200 : 400; return res.end(JSON.stringify(r)); }
        if (action === "attach_delete") { const r = await deleteAttachment(user, body.att_id); res.statusCode = r.ok ? 200 : 400; return res.end(JSON.stringify(r)); }
        if (action === "audit") {
          if (!user.isAdmin) { res.statusCode = 403; return res.end(JSON.stringify({ ok: false, error: "للمدير فقط" })); }
          const rows = await getAuditRows(30);
          return res.end(JSON.stringify({ ok: true, rows }));
        }
        res.statusCode = 400;
        return res.end(JSON.stringify({ ok: false, error: "إجراء غير معروف" }));
      } catch (e) {
        res.statusCode = 500;
        return res.end(JSON.stringify({ ok: false, error: e.message }));
      }
    }

    // ===== GET: عرض اللوحة =====
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    const origin = `https://${req.headers.host}`;

    if (!user) { res.statusCode = 401; return res.end(lockedPage()); }

    // أداة الأدمن: عرض روابط كل المستخدمين (الأدمن الأساسي فقط)
    if (q.links && user.isPrimary) return res.end(linksPage(origin));

    // تحديد النطاق (scope)
    let scope = "me", phone = toDbPhone(user.phone), viewer = user;

    if (user.isSecretary) {
      // السكرتير: لوحة مديره فقط (لا تبديل، لا كل الفريق)
      scope = "user"; phone = toDbPhone(user.workspacePhone);
      const boss = allUsers().find(u => samePhone(u.phone, user.workspacePhone));
      viewer = { ...(boss || user), isAdmin: true, isSecretary: true, name: boss ? boss.name : "المدير", phone: normPhone(user.workspacePhone) };
    } else if (user.isPrimary) {
      // الأدمن الأساسي: كل الفريق أو مستخدم محدد
      if (q.as) {
        const target = allUsers().find(u => samePhone(u.phone, q.as));
        if (target) { scope = "user"; phone = toDbPhone(target.phone); viewer = { ...target, isAdmin: true }; }
        else { scope = "all"; phone = null; }
      } else { scope = "all"; phone = null; }
    }

    const tasks = await fetchWindow(phone); // null = كل الفريق
    const switchUsers = user.isPrimary ? allUsers().map(u => ({ name: u.name, phone: u.phone })) : [];
    const data = buildData(tasks, scope, viewer, switchUsers, tokenFor(user.phone));

    return res.end(dashboardPage(data));
  } catch (err) {
    res.statusCode = 200;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.end(`<!doctype html><meta charset="utf-8"><body style="font-family:sans-serif;background:#0d1320;color:#e8edf6;padding:40px" dir="rtl">
      <h2>⚠️ خطأ مؤقت</h2><p>تعذّر تحميل اللوحة. تأكد من متغيرات البيئة (SUPABASE, DASHBOARD_SECRET).</p>
      <pre style="color:#fb7185;direction:ltr">${esc(err.message)}</pre></body>`);
  }
};

// ============================================================
// VoiceTask AI - Webhook v3.3.0
// تأكيد الإلغاء/التعديل + فصل الأسبوع (شخصي/عمل) + فئة وأولوية بكل مكان
// ============================================================

"use strict";
const https = require("https");

// ---------- 0. TIME ----------
function riyadhNow() { return new Date(Date.now() + 3 * 3600 * 1000); }
function riyadhDateStr(d) { return d.toISOString().split("T")[0]; }

// ---------- 1. TWILIO SEND ----------
async function sendWhatsApp(to, message) {
  const sid = process.env.TWILIO_ACCOUNT_SID, tok = process.env.TWILIO_AUTH_TOKEN;
  const body = new URLSearchParams({ To: to, From: process.env.TWILIO_WHATSAPP_FROM, Body: message }).toString();
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: "api.twilio.com",
      path: `/2010-04-01/Accounts/${sid}/Messages.json`,
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: "Basic " + Buffer.from(`${sid}:${tok}`).toString("base64"),
      },
    }, (res) => {
      let d = ""; res.on("data", c => d += c);
      res.on("end", () => { try { resolve(JSON.parse(d)); } catch (e) { resolve({}); } });
    });
    req.on("error", reject); req.write(body); req.end();
  });
}

// ---------- 2. MEDIA DOWNLOAD ----------
function downloadBuffer(options) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      if ([301, 302, 303, 307].includes(res.statusCode)) {
        const loc = new URL(res.headers.location);
        return downloadBuffer({ hostname: loc.hostname, path: loc.pathname + loc.search, method: "GET" }).then(resolve).catch(reject);
      }
      const chunks = []; res.on("data", c => chunks.push(c));
      res.on("end", () => resolve(Buffer.concat(chunks)));
    });
    req.on("error", reject); req.end();
  });
}

async function downloadMedia(mediaUrl) {
  const sid = process.env.TWILIO_ACCOUNT_SID, tok = process.env.TWILIO_AUTH_TOKEN;
  const auth = "Basic " + Buffer.from(`${sid}:${tok}`).toString("base64");
  const u = new URL(mediaUrl);
  let buf = await downloadBuffer({ hostname: u.hostname, path: u.pathname + u.search, method: "GET", headers: { Authorization: auth } });
  if (buf.slice(0, 4).toString("hex") === "3c3f786d") {
    const m = buf.toString("utf8").match(/<Uri>([^<]+)<\/Uri>/);
    if (!m) throw new Error("XML without Uri");
    buf = await downloadBuffer({ hostname: "api.twilio.com", path: m[1], method: "GET", headers: { Authorization: auth } });
  }
  console.log(`Media: ${buf.length} bytes, head: ${buf.slice(0, 4).toString("hex")}`);
  if (buf.length < 500) throw new Error("Media download failed - got " + buf.length + " bytes");
  if (buf.length > 4500000) throw new Error("FILE_TOO_BIG");
  return buf;
}

// ---------- 3. WHISPER ----------
async function transcribeBuffer(audioBuffer) {
  const boundary = "VoiceTask" + Date.now(), CRLF = "\r\n";
  const formBody = Buffer.concat([
    Buffer.from(`--${boundary}${CRLF}Content-Disposition: form-data; name="file"; filename="audio.oga"${CRLF}Content-Type: audio/ogg${CRLF}${CRLF}`),
    audioBuffer,
    Buffer.from(`${CRLF}--${boundary}${CRLF}Content-Disposition: form-data; name="model"${CRLF}${CRLF}whisper-1${CRLF}--${boundary}${CRLF}Content-Disposition: form-data; name="language"${CRLF}${CRLF}ar${CRLF}--${boundary}--${CRLF}`),
  ]);
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: "api.openai.com", path: "/v1/audio/transcriptions", method: "POST",
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": `multipart/form-data; boundary=${boundary}`, "Content-Length": formBody.length },
    }, (res) => {
      let d = ""; res.on("data", c => d += c);
      res.on("end", () => { try { const p = JSON.parse(d); p.error ? reject(new Error(p.error.message)) : resolve(p.text || ""); } catch (e) { reject(new Error("Whisper parse error: " + d)); } });
    });
    req.on("error", reject); req.write(formBody); req.end();
  });
}

// ---------- 4. SUPABASE ----------
function supabaseRequest(method, pathAndQuery, bodyObj, prefer) {
  const url = new URL(`${process.env.SUPABASE_URL}/rest/v1/${pathAndQuery}`);
  const bodyData = bodyObj ? JSON.stringify(bodyObj) : null;
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: url.hostname, path: url.pathname + url.search, method,
      headers: { "Content-Type": "application/json", apikey: process.env.SUPABASE_KEY, Authorization: `Bearer ${process.env.SUPABASE_KEY}`, Prefer: prefer || "return=representation" },
    }, (res) => {
      let d = ""; res.on("data", c => d += c);
      res.on("end", () => {
        if (res.statusCode >= 400) { console.error(`Supabase ${method} failed:`, res.statusCode, d); return reject(new Error(`Supabase error: ${d}`)); }
        try { resolve(d ? JSON.parse(d) : []); } catch (e) { resolve([]); }
      });
    });
    req.on("error", reject);
    if (bodyData) req.write(bodyData);
    req.end();
  });
}

async function getState(key) {
  try { const r = await supabaseRequest("GET", `system_state?key=eq.${encodeURIComponent(key)}&select=value`); return r.length ? r[0].value : null; }
  catch (e) { return null; }
}
async function setState(key, value) {
  try { await supabaseRequest("POST", "system_state", { key, value: String(value) }, "resolution=merge-duplicates,return=minimal"); }
  catch (e) { console.error("setState:", e.message); }
}

// تأكيد العمليات المعلّقة
async function setPending(obj) { await setState("pending_action", JSON.stringify({ ...obj, ts: Date.now() })); }
async function clearPending() { await setState("pending_action", ""); }
async function getPending() {
  const v = await getState("pending_action");
  if (!v) return null;
  try { const o = JSON.parse(v); if (Date.now() - o.ts > 600000) { await clearPending(); return null; } return o; }
  catch (e) { return null; }
}

async function saveTask(t) {
  return supabaseRequest("POST", "tasks", {
    title: t.title, date: t.date, time: t.time, priority: t.priority || "medium", status: "new",
    category: t.category || "شخصي", person: t.person || null, project: t.project || null, description: t.notes || null,
  });
}
async function getActiveTasks() {
  const today = riyadhDateStr(riyadhNow());
  return supabaseRequest("GET", `tasks?date=gte.${today}&status=not.in.(done,cancelled)&order=date.asc,time.asc&select=id,title,date,time,person,project,status,category,priority,description`);
}
async function getTaskById(id) { const r = await supabaseRequest("GET", `tasks?id=eq.${id}`); return r.length ? r[0] : null; }
async function updateTask(id, fields) {
  if (fields.date || fields.time) { fields.reminder_before_sent = false; fields.reminder_due_sent = false; fields.follow_up_sent = false; }
  return supabaseRequest("PATCH", `tasks?id=eq.${id}`, fields, "return=minimal");
}
async function getTodayTasks() { const t = riyadhDateStr(riyadhNow()); return supabaseRequest("GET", `tasks?date=eq.${t}&status=neq.cancelled&order=time.asc`); }
async function getWeekTasks() {
  const now = riyadhNow(), today = riyadhDateStr(now), next = riyadhDateStr(new Date(now.getTime() + 7 * 86400000));
  return supabaseRequest("GET", `tasks?date=gte.${today}&date=lte.${next}&status=neq.cancelled&order=date.asc,time.asc`);
}
async function getOverdueTasks() { const t = riyadhDateStr(riyadhNow()); return supabaseRequest("GET", `tasks?date=lt.${t}&status=eq.new&order=date.asc,time.asc`); }
async function getTasksByCategory(cat) { const t = riyadhDateStr(riyadhNow()); return supabaseRequest("GET", `tasks?date=gte.${t}&status=not.in.(done,cancelled)&category=eq.${encodeURIComponent(cat)}&order=date.asc,time.asc`); }
async function getLast7DaysTasks() {
  const now = riyadhNow(), today = riyadhDateStr(now), ago = riyadhDateStr(new Date(now.getTime() - 6 * 86400000));
  return supabaseRequest("GET", `tasks?date=gte.${ago}&date=lte.${today}&status=neq.cancelled`);
}

// ---------- 5. CLAUDE ----------
function buildSystemPrompt(activeTasks) {
  const now = riyadhNow(), today = riyadhDateStr(now);
  const tomorrow = riyadhDateStr(new Date(now.getTime() + 86400000));
  const dayAfter = riyadhDateStr(new Date(now.getTime() + 172800000));
  const dayNames = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
  const dayDates = {};
  dayNames.forEach((name, i) => { const diff = (i - now.getUTCDay() + 7) % 7 || 7; const d = new Date(now); d.setUTCDate(d.getUTCDate() + diff); dayDates[name] = riyadhDateStr(d); });
  const currentTime = String(now.getUTCHours()).padStart(2, "0") + ":" + String(now.getUTCMinutes()).padStart(2, "0");
  const cats = [...new Set(activeTasks.map(t => t.category).filter(Boolean))];
  const ctx = activeTasks.length ? activeTasks.map(t => `- id=${t.id} | "${t.title}" | ${t.date} ${t.time} | فئة: ${t.category || "شخصي"}${t.person ? " | " + t.person : ""}`).join("\n") : "(لا توجد مهام نشطة)";

  return `أنت مساعد ذكي لإدارة المهام بالعربية والإنجليزية لمدير عمليات في شركة عقارية. حلل المدخل (نص أو صورة أو وثيقة) وحدد النية.

التواريخ المرجعية (بتوقيت الرياض):
- اليوم: ${today} والساعة الآن: ${currentTime}
- غداً / بكرة: ${tomorrow}
- بعد غد: ${dayAfter}
- أيام الأسبوع: ${JSON.stringify(dayDates)}

المهام النشطة الحالية:
${ctx}

الفئات المستخدمة حالياً: ${JSON.stringify(cats.length ? cats : ["شخصي"])}

نظام الفئات (category):
- الافتراضي "شخصي" للأمور الشخصية والعائلية
- إذا ذُكرت إدارة أو قسم أو جهة عمل استخدمها كفئة ("إدارة المبيعات"، "إدارة التسويق"، "عين أسس"...)
- "مهمة عمل" بدون تحديد = "عمل"
- طابق الفئة مع الموجودة إن كانت مشابهة

النوايا:
1. "add" — إضافة مهمة/مهام (من نص أو صورة/وثيقة: استخرج كل المهام والمواعيد)
2. "update" — تعديل (أجّل، غيّر العنوان/التاريخ/الوقت...)
3. "cancel" — إلغاء
4. "done" — إنجاز
5. "category_report" — مهام فئة معينة
6. "chat" — أي شيء آخر (للصور/الوثائق بدون مهام: لخص المحتوى في reason)

قواعد:
- update/cancel/done: طابق المهمة وأرجع task_id، وإن غمض أرجع "clarify" مع candidates، وإن لم توجد "not_found" مع reason
- category_report: أرجع اسم الفئة في "category"
- "بعد X دقيقة/ساعة" احسبها من ${currentTime} بتاريخ اليوم
- بدون وقت = "09:00"، بدون تاريخ = اليوم
- الأولوية: high=عاجل، medium=عادي، low=اختياري

أجب فقط بـ JSON صالح بدون أي نص إضافي:
{
  "intent": "add|update|cancel|done|category_report|clarify|not_found|chat",
  "tasks": [ { "title": "...", "date": "YYYY-MM-DD", "time": "HH:MM", "priority": "high|medium|low", "category": "شخصي", "person": null, "project": null, "notes": null } ],
  "task_id": 123,
  "updates": { "date": "...", "time": "...", "title": "...", "category": "..." },
  "category": "...",
  "candidates": [ {"id": 1, "title": "..."} ],
  "reason": "..."
}
ضمّن فقط الحقول المناسبة للنية.`;
}

function callClaude(systemPrompt, userContent) {
  return new Promise((resolve, reject) => {
    const bodyData = JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 1500, system: systemPrompt, messages: [{ role: "user", content: userContent }] });
    const req = https.request({
      hostname: "api.anthropic.com", path: "/v1/messages", method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
    }, (res) => {
      let d = ""; res.on("data", c => d += c);
      res.on("end", () => {
        try { const r = JSON.parse(d); if (r.error) return reject(new Error("Claude error: " + r.error.message)); const raw = r.content?.map(b => b.text || "").join("") || "{}"; resolve(JSON.parse(raw.replace(/```json|```/g, "").trim())); }
        catch (e) { reject(new Error("Claude parse error: " + e.message)); }
      });
    });
    req.on("error", reject); req.write(bodyData); req.end();
  });
}
async function analyzeText(text, activeTasks) { return callClaude(buildSystemPrompt(activeTasks), `رسالة المستخدم:\n"${text}"`); }
async function analyzeMedia(base64, mediaType, kind, activeTasks) {
  const block = kind === "pdf" ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } } : { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } };
  return callClaude(buildSystemPrompt(activeTasks), [block, { type: "text", text: `استخرج كل المهام والمواعيد من هذه ${kind === "pdf" ? "الوثيقة" : "الصورة"}. إن لم تجد مهاماً أرجع intent="chat" مع وصف موجز في reason.` }]);
}

// ---------- 6. FORMATTERS ----------
const pEmoji = { high: "🔴", medium: "🟡", low: "🟢" };
const pLabel = { high: "عالية", medium: "متوسطة", low: "منخفضة" };
const pOrder = { high: 0, medium: 1, low: 2 };
function catEmoji(c) { if (!c || c === "شخصي") return "🏠"; if (c === "عمل") return "💼"; return "🏢"; }
function catName(c) { return (!c || c === "شخصي") ? "" : c; }
function dayName(dateStr) { return new Date(dateStr + "T12:00:00").toLocaleDateString("ar-SA", { weekday: "long" }); }
// سطر مهمة موحّد: أولوية + وقت + عنوان + فئة
function taskLine(t, showDate) {
  let s = ` ${pEmoji[t.priority] || "🟡"} ${t.time}`;
  if (showDate) s += ` ${t.date}`;
  s += ` ${t.title} ${catEmoji(t.category)}`;
  const cn = catName(t.category); if (cn) s += ` ${cn}`;
  return s;
}

function menuText() {
  return "🤖 *VoiceTask — القائمة*\n\n1️⃣ جدول اليوم\n2️⃣ جدول الأسبوع\n3️⃣ المهام المتأخرة\n4️⃣ إحصائياتي\n5️⃣ فئاتي\n6️⃣ مساعدة\n\n💬 رد برقم، أو اكتب/سجّل طلبك عادي";
}

function formatTasksMessage(tasks) {
  if (!tasks || !tasks.length) return "✅ استلمت رسالتك لكن لم أجد مهام واضحة.\n💡 جرب: \"فكرني أكلم أحمد بكرة الساعة 10\"";
  let msg = tasks.length === 1 ? "✅ *تمت إضافة المهمة*\n\n" : `✅ *تمت إضافة ${tasks.length} مهام*\n\n`;
  tasks.forEach((t, i) => {
    msg += `${pEmoji[t.priority] || "🟡"} *${t.title}*\n`;
    msg += `🕐 ${t.time} │ 📅 ${t.date}\n`;
    msg += `${catEmoji(t.category)} ${t.category || "شخصي"} │ الأولوية: ${pLabel[t.priority] || "متوسطة"}\n`;
    if (t.person) msg += `👤 ${t.person}\n`;
    if (t.notes) msg += `📝 ${t.notes}\n`;
    if (i < tasks.length - 1) msg += "\n";
  });
  return msg.trim();
}

function formatDailySummary(tasks) {
  const today = riyadhDateStr(riyadhNow());
  if (!tasks || !tasks.length) return `☀️ *${dayName(today)}* — لا مهام اليوم 🎉`;
  const done = tasks.filter(t => t.status === "done");
  const active = tasks.filter(t => t.status !== "done");
  let msg = `☀️ *${dayName(today)} ${today}* — ${tasks.length} مهمة\n\n`;
  const groups = { high: "🔴 *عاجل*", medium: "🟡 *عادي*", low: "🟢 *مرنة*" };
  for (const p of ["high", "medium", "low"]) {
    const g = active.filter(t => (t.priority || "medium") === p);
    if (!g.length) continue;
    msg += groups[p] + "\n";
    g.forEach(t => { msg += `${taskLine(t)}\n`; });
    msg += "\n";
  }
  if (done.length) msg += `✅ منجز اليوم: ${done.length}`;
  return msg.trim();
}

// فصل الأسبوع: قسم عمل/إدارات + قسم شخصي
function weekByDay(list) {
  const grouped = {};
  list.forEach(t => { (grouped[t.date] = grouped[t.date] || []).push(t); });
  let s = "";
  for (const [date, dt] of Object.entries(grouped)) {
    s += `_${dayName(date)} ${date}_\n`;
    dt.forEach(t => { s += `${taskLine(t)}\n`; });
  }
  return s;
}
function formatWeeklySummary(tasks) {
  if (!tasks || !tasks.length) return "📅 *جدول الأسبوع* — لا مهام 🎉";
  const personal = tasks.filter(t => (t.category || "شخصي") === "شخصي");
  const work = tasks.filter(t => (t.category || "شخصي") !== "شخصي");
  let msg = `📅 *جدول الأسبوع* — ${tasks.length} مهمة\n\n`;
  if (work.length) { msg += `💼 *العمل والإدارات* (${work.length})\n${weekByDay(work)}\n`; }
  if (personal.length) { msg += `🏠 *الشخصية* (${personal.length})\n${weekByDay(personal)}`; }
  return msg.trim();
}

function formatCategoryReport(cat, tasks) {
  if (!tasks || !tasks.length) return `${catEmoji(cat)} *${cat}* — لا مهام نشطة 🎉`;
  const grouped = {};
  tasks.forEach(t => { (grouped[t.date] = grouped[t.date] || []).push(t); });
  let msg = `${catEmoji(cat)} *${cat}* — ${tasks.length} مهمة\n\n`;
  for (const [date, dt] of Object.entries(grouped)) {
    msg += `_${dayName(date)} ${date}_\n`;
    dt.forEach(t => {
      msg += ` ${pEmoji[t.priority] || "🟡"} ${t.time} ${t.title} (${pLabel[t.priority] || "متوسطة"})`;
      if (t.person) msg += ` │ 👤 ${t.person}`;
      msg += "\n";
    });
    msg += "\n";
  }
  return msg.trim();
}

function formatOverdue(tasks) {
  if (!tasks || !tasks.length) return "⏳ *المتأخرة* — لا شيء متأخر، ممتاز! 🎉";
  let msg = `⏳ *المهام المتأخرة* — ${tasks.length}\n\n`;
  tasks.forEach(t => { msg += `${pEmoji[t.priority] || "🟡"} ${t.title} — كانت ${t.date} ${catEmoji(t.category)} ${catName(t.category)}\n`; });
  msg += "\n💡 \"أجّل [المهمة] لبكرة\" أو \"خلصت [المهمة]\"";
  return msg;
}

function formatStats(tasks) {
  const today = riyadhDateStr(riyadhNow());
  const done = tasks.filter(t => t.status === "done").length;
  const pending = tasks.filter(t => t.status === "new" && t.date >= today).length;
  const overdue = tasks.filter(t => t.status === "new" && t.date < today).length;
  const total = tasks.length, rate = total ? Math.round((done / total) * 100) : 0;
  const byCat = {}; tasks.forEach(t => { const c = t.category || "شخصي"; byCat[c] = (byCat[c] || 0) + 1; });
  let msg = `📊 *إحصائيات آخر 7 أيام*\n\n✅ منجزة: ${done}\n📌 نشطة: ${pending}\n⏳ متأخرة: ${overdue}\n🏆 نسبة الإنجاز: ${rate}%\n\n*حسب الفئة:*\n`;
  Object.entries(byCat).sort((a, b) => b[1] - a[1]).forEach(([c, n]) => { msg += `${catEmoji(c)} ${c}: ${n}\n`; });
  return msg.trim();
}

async function formatCategoriesList() {
  const tasks = await getActiveTasks();
  if (!tasks.length) return "🗂 لا مهام نشطة حالياً";
  const byCat = {}; tasks.forEach(t => { const c = t.category || "شخصي"; byCat[c] = (byCat[c] || 0) + 1; });
  let msg = "🗂 *فئاتك النشطة*\n\n";
  Object.entries(byCat).sort((a, b) => b[1] - a[1]).forEach(([c, n]) => { msg += `${catEmoji(c)} ${c} — ${n} مهمة\n`; });
  return msg + "\n💬 اكتب: \"مهام [اسم الفئة]\" للتفاصيل";
}

function helpText() {
  return "🤖 *VoiceTask AI*\n\n📝 أرسل مهامك نصاً أو 🎤 صوتاً أو 📷 صورة أو 📄 PDF\n\n✏️ \"أجّل اجتماع الأحد للساعة 7\"\n🗑 \"ألغي مهمة كذا\"\n✅ \"خلصت كذا\"\n🏢 \"مهام إدارة المبيعات\"\n⚡ بعد التذكير: \"خلصت\" / \"أجلها ساعة\" / \"أجلها بكرة\"\n\n🔐 الإلغاء والتعديل يطلبان تأكيد (نعم/لا)\n\n📋 *القائمة* — كل الأوامر";
}

// ---------- 7. PENDING (confirm) ----------
async function applyPending(p) {
  const t = await getTaskById(p.task_id);
  if (!t) return "⚠️ المهمة لم تعد موجودة.";
  if (p.type === "cancel") { await updateTask(p.task_id, { status: "cancelled" }); return `🗑 *تم الإلغاء:* ${t.title}`; }
  if (p.type === "update") {
    await updateTask(p.task_id, p.updates);
    const parts = [];
    if (p.updates.date) parts.push(`📅 ${p.updates.date}`);
    if (p.updates.time) parts.push(`⏰ ${p.updates.time}`);
    if (p.updates.title) parts.push(`✏️ ${p.updates.title}`);
    if (p.updates.category) parts.push(`🏢 ${p.updates.category}`);
    return `✏️ *تم التعديل:* ${t.title}\n${parts.join("  ")}\n🔔 أُعيد ضبط تذكيراتها`;
  }
  return "تم.";
}

// ---------- 8. INTENT ----------
async function executeIntent(result, activeTasks) {
  switch (result.intent) {
    case "add": {
      const tasks = result.tasks || []; let saved = 0;
      for (const t of tasks) { try { await saveTask(t); saved++; } catch (e) { console.error("Save:", e.message); } }
      if (tasks.length && !saved) return "⚠️ فهمت المهمة لكن حدث خطأ بالحفظ. حاول مرة أخرى.";
      return formatTasksMessage(tasks);
    }
    case "update": {
      if (!result.task_id || !result.updates) return "⚠️ لم أحدد المهمة أو التعديل. وضّح أكثر.";
      const t = activeTasks.find(x => x.id === result.task_id);
      const parts = [];
      if (result.updates.date) parts.push(`📅 ${result.updates.date}`);
      if (result.updates.time) parts.push(`⏰ ${result.updates.time}`);
      if (result.updates.title) parts.push(`✏️ ${result.updates.title}`);
      if (result.updates.category) parts.push(`🏢 ${result.updates.category}`);
      await setPending({ type: "update", task_id: result.task_id, updates: result.updates, title: t ? t.title : "المهمة" });
      return `⚠️ *تأكيد التعديل*\n*${t ? t.title : "المهمة"}*${t ? `\n(الحالي: ${t.date} ${t.time})` : ""}\nالتغيير: ${parts.join("  ")}\n\nرد: *نعم* للتأكيد │ *لا* للتراجع`;
    }
    case "cancel": {
      if (!result.task_id) return "⚠️ لم أحدد المهمة المطلوب إلغاؤها.";
      const t = activeTasks.find(x => x.id === result.task_id);
      await setPending({ type: "cancel", task_id: result.task_id, title: t ? t.title : "المهمة" });
      return `⚠️ *تأكيد الإلغاء*\nمتأكد من إلغاء: *${t ? t.title : "المهمة"}*؟${t ? `\n📅 ${t.date} ⏰ ${t.time}` : ""}\n\nرد: *نعم* للتأكيد │ *لا* للتراجع`;
    }
    case "done": {
      if (!result.task_id) return "⚠️ لم أحدد المهمة المنجزة.";
      const t = activeTasks.find(x => x.id === result.task_id);
      await updateTask(result.task_id, { status: "done" });
      return `🎉 *أحسنت! أُنجزت:* ${t ? t.title : "المهمة"}`;
    }
    case "category_report": {
      if (!result.category) return "⚠️ حدد الفئة، مثلاً: \"مهام إدارة المبيعات\"";
      return formatCategoryReport(result.category, await getTasksByCategory(result.category));
    }
    case "clarify": {
      let msg = "🤔 وجدت أكثر من مهمة، أيها تقصد؟\n\n";
      (result.candidates || []).forEach((c, i) => { const t = activeTasks.find(x => x.id === c.id); msg += `${i + 1}️⃣ ${t ? `${t.title} — ${t.date} ${t.time}` : c.title}\n`; });
      return msg + "\nأعد طلبك مع تحديد المهمة.";
    }
    case "not_found": return `⚠️ لم أجد المهمة.\n${result.reason || ""}\n📋 اكتب *القائمة*.`;
    default: return result.reason ? `💬 ${result.reason}\n\n📋 اكتب *القائمة* للأوامر` : "أهلاً! أرسل مهامك نصاً أو صوتاً أو صورة 😊\n📋 اكتب *القائمة*";
  }
}

// ---------- 9. QUICK ACTIONS ----------
async function quickDoneLast() {
  const id = await getState("last_reminder_task"); if (!id) return null;
  const t = await getTaskById(id); if (!t || t.status !== "new") return null;
  await updateTask(t.id, { status: "done" }); return `🎉 *أحسنت! أُنجزت:* ${t.title}`;
}
async function quickPostpone(mode) {
  const id = await getState("last_reminder_task"); if (!id) return "⚠ لا توجد مهمة حديثة للتأجيل. حدد المهمة بالاسم.";
  const t = await getTaskById(id); if (!t || t.status !== "new") return "⚠️ المهمة الأخيرة لم تعد نشطة.";
  if (mode === "tomorrow") {
    const d = new Date(t.date + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + 1);
    const nd = riyadhDateStr(d); await updateTask(t.id, { date: nd });
    return `⏰ *تم التأجيل لبكرة:* ${t.title}\n📅 ${nd} ⏰ ${t.time}`;
  }
  let [h, m] = (t.time || "09:00").split(":").map(Number); let date = t.date; h += 1;
  if (h >= 24) { h -= 24; const d = new Date(date + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + 1); date = riyadhDateStr(d); }
  const nt = String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0");
  await updateTask(t.id, { date, time: nt });
  return `⏰ *تم التأجيل ساعة:* ${t.title}\n🕐 ${nt}${date !== t.date ? " (" + date + ")" : ""}`;
}

// ---------- 10. TEXT ROUTER ----------
async function handleTextMessage(text) {
  const t = (text || "").trim(), lower = t.toLowerCase();

  // أولاً: هل في عملية بانتظار تأكيد؟
  const pending = await getPending();
  if (pending) {
    if (/^(نعم|أيوه|ايوه|تأكيد|تاكيد|اوك|أوكي|تمام|أكد|اكد|ok|yes|y)$/i.test(t)) { await clearPending(); return applyPending(pending); }
    if (/^(لا|لأ|إلغاء|الغاء|تراجع|الغي|no|n)$/i.test(t)) { await clearPending(); return "👍 تم التراجع، لم يحدث أي تغيير."; }
    await clearPending(); // طلب مختلف → نكمل عادي
  }

  if (/^(القائمة|قائمة|قائمه|القائمه|menu)$/i.test(t)) return menuText();
  if (/^[1-6]$/.test(t)) {
    switch (t) {
      case "1": return formatDailySummary(await getTodayTasks());
      case "2": return formatWeeklySummary(await getWeekTasks());
      case "3": return formatOverdue(await getOverdueTasks());
      case "4": return formatStats(await getLast7DaysTasks());
      case "5": return formatCategoriesList();
      case "6": return helpText();
    }
  }
  if (lower.includes("جدولي اليوم") || lower.includes("مهام اليوم") || t === "اليوم") return formatDailySummary(await getTodayTasks());
  if (lower.includes("جدولي الأسبوع") || lower.includes("مهام الأسبوع") || t === "الأسبوع") return formatWeeklySummary(await getWeekTasks());
  if (t.includes("المتأخرة") || t.includes("المتاخرة") || t.includes("متأخرة")) return formatOverdue(await getOverdueTasks());
  if (t.includes("إحصائيات") || t.includes("احصائيات")) return formatStats(await getLast7DaysTasks());
  if (t === "فئاتي" || t === "الفئات") return formatCategoriesList();
  if (t === "مساعدة" || lower === "help" || t === "؟") return helpText();

  // أوامر سريعة بعد التذكير
  if (t.length <= 20 && t.includes("أجل") && (t.includes("بكر") || t.includes("غد"))) return quickPostpone("tomorrow");
  if (t.length <= 20 && t.includes("أجل") && t.includes("ساعة")) return quickPostpone("hour");
  if (t.length <= 6 && (t === "خلصت" || t === "تم" || t === "تمت")) { const r = await quickDoneLast(); if (r) return r; }

  if (t.length <= 3) return "أهلاً! أرسل مهامك وسأنظمها 😊\n📋 اكتب *القائمة*";

  const active = await getActiveTasks();
  return executeIntent(await analyzeText(t, active), active);
}

// ---------- 11. MAIN ----------
module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method === "GET") return res.status(200).json({ status: "✅ VoiceTask AI يعمل بنجاح!", version: "3.3.0", riyadhTime: riyadhNow().toISOString() });
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const TwiML = `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`;
  try {
    const body = req.body || {};
    const from = body.From || "", msgBody = body.Body || "";
    const mediaUrl = body.MediaUrl0 || null;
    const mediaType = (body.MediaContentType0 || "").toLowerCase();
    const numMedia = parseInt(body.NumMedia || "0", 10);
    console.log(`📨 From: ${from} | Media: ${numMedia} (${mediaType}) | Body: ${msgBody}`);

    const yourNumber = process.env.YOUR_WHATSAPP;
    if (yourNumber && from !== yourNumber) { console.warn(`⛔ Unauthorized: ${from}`); return res.status(200).send(TwiML); }

    let reply = "";
    if (numMedia > 0 && mediaUrl) {
      try {
        if (mediaType.startsWith("audio")) {
          await sendWhatsApp(from, "🎤 استلمت الصوت!\n⏳ جاري التحويل...");
          const buf = await downloadMedia(mediaUrl);
          const txt = await transcribeBuffer(buf);
          console.log(`🎙️ Transcribed: ${txt}`);
          if (txt && txt.length > 3) { await sendWhatsApp(from, `📝 "${txt}"`); reply = await handleTextMessage(txt); }
          else reply = "⚠️ لم أفهم الصوت. حاول مرة أخرى أو اكتب نصاً.";
        } else if (mediaType.startsWith("image")) {
          await sendWhatsApp(from, "📷 استلمت الصورة!\n⏳ جاري قراءتها...");
          const buf = await downloadMedia(mediaUrl);
          const active = await getActiveTasks();
          reply = await executeIntent(await analyzeMedia(buf.toString("base64"), mediaType, "image", active), active);
        } else if (mediaType === "application/pdf") {
          await sendWhatsApp(from, "📄 استلمت الملف!\n⏳ جاري قراءته...");
          const buf = await downloadMedia(mediaUrl);
          const active = await getActiveTasks();
          reply = await executeIntent(await analyzeMedia(buf.toString("base64"), mediaType, "pdf", active), active);
        } else {
          reply = "📎 النوع ده غير مدعوم.\nالمدعوم: 🎤 صوت │ 📷 صور │ 📄 PDF │ 📝 نص";
        }
      } catch (e) {
        console.error("Media error:", e.message);
        reply = e.message === "FILE_TOO_BIG" ? "⚠️ الملف كبير جداً (الحد ~4MB)." : "⚠️ حدث خطأ في معالجة الملف.\nأرسل طلبك نصاً.";
      }
    } else {
      reply = await handleTextMessage(msgBody);
    }

    await sendWhatsApp(from, reply);
    return res.status(200).send(TwiML);
  } catch (error) {
    console.error("❌ Handler error:", error.message);
    try { const from = req.body?.From || process.env.YOUR_WHATSAPP; if (from) await sendWhatsApp(from, "⚠️ خطأ مؤقت. حاول بعد قليل."); } catch (_) {}
    return res.status(200).send(TwiML);
  }
};

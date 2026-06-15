// ============================================================
// VoiceTask AI - Webhook v3.6.1
// Multi-User + خصوصية محكمة + فهم طبيعي + مطابقة أسماء آمنة
// ============================================================

"use strict";
const https = require("https");
const crypto = require("crypto");

// ---------- DASHBOARD LINK (نفس منطق توكن الداشبورد) ----------
function dashSecret() { return process.env.DASHBOARD_SECRET || process.env.TWILIO_AUTH_TOKEN || process.env.SUPABASE_KEY || "voicetask-fallback"; }
function tokenFor(phone) { return crypto.createHash("sha256").update(phone + "|" + dashSecret()).digest("hex").slice(0, 28); }
function dashboardBase() { return process.env.DASHBOARD_URL || "https://voicetask-swart.vercel.app/api/dashboard"; }
function dashLinkFor(phone) { return `${dashboardBase()}/${tokenFor(phone)}`; }

function riyadhNow() { return new Date(Date.now() + 3 * 3600 * 1000); }
function riyadhDateStr(d) { return d.toISOString().split("T")[0]; }

// ---------- USERS & ROLES ----------
// تطبيع الرقم: يشيل "whatsapp:" والمسافات والرموز ويسيب الأرقام و +
function normPhone(p) { return String(p || "").replace(/^whatsapp:/i, "").replace(/[\s\-()]/g, "").trim(); }
function samePhone(a, b) { return normPhone(a) === normPhone(b); }
// صيغة القاعدة: المهام مخزّنة بـ "whatsapp:+966..." — نضمن البادئة
function toDbPhone(p) { const n = normPhone(p); return n ? "whatsapp:" + n : n; }

function getAdmin() { return { phone: normPhone(process.env.YOUR_WHATSAPP), name: process.env.ADMIN_NAME || "المدير الأعلى", isAdmin: true, isPrimary: true, role: "primary" }; }
function getTeam() {
  const raw = process.env.TEAM_MEMBERS || "";
  return raw.split(",").map(s => s.trim()).filter(Boolean).map(entry => {
    const idx = entry.lastIndexOf(":");
    const phone = normPhone(entry.slice(0, idx));
    const name = entry.slice(idx + 1).trim();
    return { phone, name, isAdmin: false, role: "member" };
  }).filter(u => u.phone && u.name);
}
// السكرتير: "رقم_السكرتير:الاسم:رقم_المدير" — يشتغل على مساحة مديره
function getSecretaries() {
  const raw = process.env.SECRETARY || "";
  return raw.split(",").map(s => s.trim()).filter(Boolean).map(entry => {
    const parts = entry.split(":");
    if (parts.length < 3) return null;
    return { phone: normPhone(parts[0]), name: parts[1].trim(), bossPhone: normPhone(parts[2]), isAdmin: false, role: "secretary" };
  }).filter(Boolean).filter(u => u.phone && u.name && u.bossPhone);
}
function allUsers() { return [getAdmin(), ...getTeam()]; }                 // المستخدمون أصحاب المساحات
function allPeople() { return [getAdmin(), ...getTeam(), ...getSecretaries()]; } // كل من يمكنه المراسلة
function resolveUser(from) {
  const f = normPhone(from);
  const person = allPeople().find(u => samePhone(u.phone, f));
  if (!person) return null;
  if (person.role === "secretary") {
    // السكرتير يعمل على مساحة مديره: workspacePhone = رقم المدير
    const boss = allUsers().find(u => samePhone(u.phone, person.bossPhone));
    return { ...person, workspacePhone: person.bossPhone, bossName: boss ? boss.name : "المدير" };
  }
  return { ...person, workspacePhone: person.phone };
}
function findUserByName(name) {
  const n = (name || "").trim();
  if (!n) return null;
  const exact = allUsers().find(u => u.name === n);
  if (exact) return exact;
  const words = n.split(/\s+/);
  return allUsers().find(u => words.includes(u.name)) || null;
}
function isPrimaryAdmin(user) { return user && samePhone(user.phone, getAdmin().phone); }

// ---------- TWILIO ----------
async function sendWhatsApp(to, message) {
  const sid = process.env.TWILIO_ACCOUNT_SID, tok = process.env.TWILIO_AUTH_TOKEN;
  const body = new URLSearchParams({ To: to, From: process.env.TWILIO_WHATSAPP_FROM, Body: message }).toString();
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: "api.twilio.com", path: `/2010-04-01/Accounts/${sid}/Messages.json`, method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: "Basic " + Buffer.from(`${sid}:${tok}`).toString("base64") },
    }, (res) => { let d = ""; res.on("data", c => d += c); res.on("end", () => { try { resolve(JSON.parse(d)); } catch (e) { resolve({}); } }); });
    req.on("error", reject); req.write(body); req.end();
  });
}

// إشعار تعديلات السكرتير: يروح لمديره (workspace owner) + للأدمن الأساسي
async function notifySecretaryAction(user, text) {
  if (!user || user.role !== "secretary") return;
  const recipients = new Set();
  if (user.workspacePhone) recipients.add(normPhone(user.workspacePhone)); // المدير
  recipients.add(normPhone(getAdmin().phone));                              // سامح
  recipients.delete(normPhone(user.phone));                                // لا تُشعر السكرتير نفسه
  const msg = `🗂 *${user.name}* (سكرتير ${user.bossName || "المدير"})\n${text}`;
  for (const r of recipients) { try { await sendWhatsApp(r.startsWith("whatsapp:") ? r : "whatsapp:" + r, msg); } catch (e) { console.error("notifySec:", e.message); } }
}
function downloadBuffer(options) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      if ([301, 302, 303, 307].includes(res.statusCode)) { const loc = new URL(res.headers.location); return downloadBuffer({ hostname: loc.hostname, path: loc.pathname + loc.search, method: "GET" }).then(resolve).catch(reject); }
      const chunks = []; res.on("data", c => chunks.push(c)); res.on("end", () => resolve(Buffer.concat(chunks)));
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
  if (buf.length < 500) throw new Error("Media download failed - got " + buf.length + " bytes");
  if (buf.length > 4500000) throw new Error("FILE_TOO_BIG");
  return buf;
}

// ---------- WHISPER ----------
async function transcribeBuffer(audioBuffer) {
  const boundary = "VoiceTask" + Date.now(), CRLF = "\r\n";
  const hint = "مهمة، موعد، تذكير، اجتماع، اتصال، غداً، بكرة، الساعة، صباحاً، مساءً، يوم الأحد الاثنين الثلاثاء الأربعاء الخميس الجمعة السبت، أجّل، خلصت، ألغِ، كل أسبوع، عاجل.";
  const formBody = Buffer.concat([
    Buffer.from(`--${boundary}${CRLF}Content-Disposition: form-data; name="file"; filename="audio.oga"${CRLF}Content-Type: audio/ogg${CRLF}${CRLF}`),
    audioBuffer,
    Buffer.from(`${CRLF}--${boundary}${CRLF}Content-Disposition: form-data; name="model"${CRLF}${CRLF}whisper-1${CRLF}--${boundary}${CRLF}Content-Disposition: form-data; name="language"${CRLF}${CRLF}ar${CRLF}--${boundary}${CRLF}Content-Disposition: form-data; name="prompt"${CRLF}${CRLF}${hint}${CRLF}--${boundary}${CRLF}Content-Disposition: form-data; name="temperature"${CRLF}${CRLF}0${CRLF}--${boundary}--${CRLF}`),
  ]);
  return new Promise((resolve, reject) => {
    const req = https.request({ hostname: "api.openai.com", path: "/v1/audio/transcriptions", method: "POST", headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": `multipart/form-data; boundary=${boundary}`, "Content-Length": formBody.length } },
      (res) => { let d = ""; res.on("data", c => d += c); res.on("end", () => { try { const p = JSON.parse(d); p.error ? reject(new Error(p.error.message)) : resolve(p.text || ""); } catch (e) { reject(new Error("Whisper parse error: " + d)); } }); });
    req.on("error", reject); req.write(formBody); req.end();
  });
}

// ---------- SUPABASE ----------
function supabaseRequest(method, pathAndQuery, bodyObj, prefer) {
  const url = new URL(`${process.env.SUPABASE_URL}/rest/v1/${pathAndQuery}`);
  const bodyData = bodyObj ? JSON.stringify(bodyObj) : null;
  return new Promise((resolve, reject) => {
    const req = https.request({ hostname: url.hostname, path: url.pathname + url.search, method, headers: { "Content-Type": "application/json", apikey: process.env.SUPABASE_KEY, Authorization: `Bearer ${process.env.SUPABASE_KEY}`, Prefer: prefer || "return=representation" } },
      (res) => { let d = ""; res.on("data", c => d += c); res.on("end", () => { if (res.statusCode >= 400) { console.error(`Supabase ${method} failed:`, res.statusCode, d); return reject(new Error(`Supabase error: ${d}`)); } try { resolve(d ? JSON.parse(d) : []); } catch (e) { resolve([]); } }); });
    req.on("error", reject); if (bodyData) req.write(bodyData); req.end();
  });
}
async function getState(key) { try { const r = await supabaseRequest("GET", `system_state?key=eq.${encodeURIComponent(key)}&select=value`); return r.length ? r[0].value : null; } catch (e) { return null; } }
async function setState(key, value) { try { await supabaseRequest("POST", "system_state", { key, value: String(value) }, "resolution=merge-duplicates,return=minimal"); } catch (e) { console.error("setState:", e.message); } }

async function setPending(phone, obj) { await setState(`pending_${phone}`, JSON.stringify({ ...obj, ts: Date.now() })); }
async function clearPending(phone) { await setState(`pending_${phone}`, ""); }
async function getPending(phone) { const v = await getState(`pending_${phone}`); if (!v) return null; try { const o = JSON.parse(v); if (Date.now() - o.ts > 600000) { await clearPending(phone); return null; } return o; } catch (e) { return null; } }

// >>> الفلترة الإجبارية برقم المستخدم — قلب الخصوصية <<<
const UP = (p) => `user_phone=eq.${encodeURIComponent(p)}`;

async function saveTask(t, phone) {
  return supabaseRequest("POST", "tasks", { title: t.title, date: t.date, time: t.time, priority: t.priority || "medium", status: "new", category: t.category || "شخصي", person: t.person || null, project: t.project || null, description: t.notes || null, user_phone: phone });
}
async function getActiveTasksFor(phone) { const today = riyadhDateStr(riyadhNow()); return supabaseRequest("GET", `tasks?${UP(phone)}&date=gte.${today}&status=not.in.(done,cancelled)&order=date.asc,time.asc&select=id,title,date,time,person,project,status,category,priority,description`); }
async function getTaskOwned(id, phone) { const r = await supabaseRequest("GET", `tasks?id=eq.${id}&${UP(phone)}`); return r.length ? r[0] : null; }
async function updateTaskOwned(id, phone, fields) { if (fields.date || fields.time) { fields.reminder_before_sent = false; fields.reminder_due_sent = false; fields.follow_up_sent = false; } return supabaseRequest("PATCH", `tasks?id=eq.${id}&${UP(phone)}`, fields, "return=minimal"); }
async function getTodayFor(phone) { const t = riyadhDateStr(riyadhNow()); return supabaseRequest("GET", `tasks?${UP(phone)}&date=eq.${t}&status=neq.cancelled&order=time.asc`); }
async function getWeekFor(phone) { const now = riyadhNow(), today = riyadhDateStr(now), next = riyadhDateStr(new Date(now.getTime() + 7 * 86400000)); return supabaseRequest("GET", `tasks?${UP(phone)}&date=gte.${today}&date=lte.${next}&status=neq.cancelled&order=date.asc,time.asc`); }
async function getOverdueFor(phone) { const t = riyadhDateStr(riyadhNow()); return supabaseRequest("GET", `tasks?${UP(phone)}&date=lt.${t}&status=eq.new&order=date.asc,time.asc`); }
async function getCategoryFor(phone, cat) { const t = riyadhDateStr(riyadhNow()); return supabaseRequest("GET", `tasks?${UP(phone)}&date=gte.${t}&status=not.in.(done,cancelled)&category=eq.${encodeURIComponent(cat)}&order=date.asc,time.asc`); }
async function getStatsFor(phone) { const now = riyadhNow(), today = riyadhDateStr(now), ago = riyadhDateStr(new Date(now.getTime() - 6 * 86400000)); return supabaseRequest("GET", `tasks?${UP(phone)}&date=gte.${ago}&date=lte.${today}&status=neq.cancelled`); }

// أوامر Admin فقط
async function getActiveForPhoneAdmin(phone) { const today = riyadhDateStr(riyadhNow()); return supabaseRequest("GET", `tasks?${UP(phone)}&date=gte.${today}&status=not.in.(done,cancelled)&order=date.asc,time.asc`); }
async function getAllActiveAdmin() { const today = riyadhDateStr(riyadhNow()); return supabaseRequest("GET", `tasks?date=gte.${today}&status=not.in.(done,cancelled)&order=date.asc,time.asc&select=id,title,date,time,category,priority,status,user_phone`); }

// ---------- AUDIT LOG (سجل التغييرات) ----------
async function logChange({ taskId, action, user, before, after, source }) {
  try {
    await supabaseRequest("POST", "audit_log", {
      task_id: taskId || null, action, changed_by: user.phone, actor_name: user.name,
      before_data: before || null, after_data: after || null, source: source || "whatsapp"
    }, "return=minimal");
  } catch (e) { console.error("audit:", e.message); }
}

// ---------- RECURRING RULES (قواعد التكرار) ----------
const DOW = { "الأحد": "SU", "الاثنين": "MO", "الإثنين": "MO", "الثلاثاء": "TU", "الأربعاء": "WE", "الخميس": "TH", "الجمعة": "FR", "السبت": "SA" };
const DOW_AR = { SU: "الأحد", MO: "الاثنين", TU: "الثلاثاء", WE: "الأربعاء", TH: "الخميس", FR: "الجمعة", SA: "السبت" };
async function saveRecurringRule(r, phone) {
  return supabaseRequest("POST", "recurring_rules", {
    user_phone: phone, title: r.title, freq: r.freq, day_of_week: r.day_of_week || null,
    day_of_month: r.day_of_month || null, time: r.time || "09:00", category: r.category || "شخصي",
    priority: r.priority || "medium", person: r.person || null, active: true
  });
}
async function getRecurringFor(phone) { return supabaseRequest("GET", `recurring_rules?${UP(phone)}&active=eq.true&order=created_at.desc`); }
async function deactivateRecurring(id, phone) { return supabaseRequest("PATCH", `recurring_rules?id=eq.${id}&${UP(phone)}`, { active: false }, "return=minimal"); }

// ---------- RENAME CATEGORY (إعادة تسمية فئة) ----------
async function renameCategory(phone, oldCat, newCat) {
  const rows = await supabaseRequest("GET", `tasks?${UP(phone)}&category=eq.${encodeURIComponent(oldCat)}&status=neq.cancelled&select=id`);
  await supabaseRequest("PATCH", `tasks?${UP(phone)}&category=eq.${encodeURIComponent(oldCat)}`, { category: newCat }, "return=minimal");
  return rows.length;
}

// ---------- CLAUDE ----------
function buildSystemPrompt(activeTasks) {
  const now = riyadhNow(), today = riyadhDateStr(now);
  const tomorrow = riyadhDateStr(new Date(now.getTime() + 86400000));
  const dayAfter = riyadhDateStr(new Date(now.getTime() + 172800000));
  const dayNames = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
  const dayDates = {};
  dayNames.forEach((name, i) => { const diff = (i - now.getUTCDay() + 7) % 7 || 7; const d = new Date(now); d.setUTCDate(d.getUTCDate() + diff); dayDates[name] = riyadhDateStr(d); });
  const currentTime = String(now.getUTCHours()).padStart(2, "0") + ":" + String(now.getUTCMinutes()).padStart(2, "0");
  const cats = [...new Set(activeTasks.map(t => t.category).filter(Boolean))];
  const ctx = activeTasks.length ? activeTasks.map(t => `- id=${t.id} | "${t.title}" | ${t.date} ${t.time} | فئة: ${t.category || "شخصي"}`).join("\n") : "(لا توجد مهام نشطة)";

  return `أنت مساعد ذكي لإدارة المهام بالعربية والإنجليزية. حلل المدخل (نص/صورة/وثيقة) وحدد النية بذكاء من الصياغة الطبيعية مهما اختلفت.

التواريخ المرجعية (بتوقيت الرياض):
- اليوم: ${today} والساعة الآن: ${currentTime}
- غداً/بكرة: ${tomorrow}
- بعد غد: ${dayAfter}
- أيام الأسبوع: ${JSON.stringify(dayDates)}

مهام هذا المستخدم النشطة (لا تتعامل إلا مع هذه فقط):
${ctx}

الفئات المستخدمة: ${JSON.stringify(cats.length ? cats : ["شخصي"])}

نظام الفئات: الافتراضي "شخصي". إذا ذُكرت إدارة/قسم استخدمها كفئة. "مهمة عمل" = "عمل".

النوايا: add | recurring | update | cancel | done | list | category_report | rename_category | list_recurring | clarify | not_found | chat
- add: إضافة مهمة/مهام جديدة لمرة واحدة
- recurring: مهمة متكررة بصيغة "كل [يوم]" أو "كل يوم" أو "كل شهر" (مثل: "اجتماع كل خميس الساعة 4"، "تمرين كل يوم 6 صباحاً"، "تقرير أول كل شهر"). أرجعها في "recurring": {"title":"...","freq":"weekly|daily|monthly","day_of_week":"TH","day_of_month":null,"time":"16:00","category":"...","priority":"medium","person":null}. أيام الأسبوع بالرمز: SU MO TU WE TH FR SA
- update/cancel/done: طابق المهمة من قائمة هذا المستخدم فقط وأرجع task_id. **مهم للمطابقة:** افهم القصد حتى لو الكلمات مختلفة عن العنوان المسجّل (مثلاً "اجتماع المبيعات"="اجتماع مع إدارة المبيعات"، "الفجر"="اصحي لصلاة الفجر"). طابق بالكلمة المميزة أو الوقت أو الفئة. لو في تطابق واحد واضح أرجع task_id مباشرة. غامض (أكثر من تطابق)=clarify مع candidates. غير موجودة فعلاً=not_found.
- list: أي طلب لعرض المهام بأي صياغة. أرجع "scope": today أو week أو overdue أو all
- category_report: عرض مهام فئة/إدارة محددة. أرجع الفئة في "category"
- rename_category: تغيير اسم فئة (مثل: "غيّر فئة حنان إلى المنزل"، "خلي اسم العمل شغل"). أرجع "old_category" و "new_category"
- list_recurring: عرض المهام المتكررة ("مهامي المتكررة"، "التكرارات")
- chat: أي شيء آخر فقط. لا تستخدمها لطلبات العرض.
- "بعد X دقيقة/ساعة" من ${currentTime}. بدون وقت=09:00، بدون تاريخ=اليوم. الأولوية high/medium/low.

أجب فقط بـ JSON صالح:
{"intent":"...","tasks":[{"title":"...","date":"YYYY-MM-DD","time":"HH:MM","priority":"medium","category":"شخصي","person":null,"project":null,"notes":null}],"recurring":{"title":"...","freq":"weekly","day_of_week":"TH","day_of_month":null,"time":"16:00","category":"شخصي","priority":"medium","person":null},"task_id":123,"updates":{},"scope":"all","category":"...","old_category":"...","new_category":"...","candidates":[{"id":1,"title":"..."}],"reason":"..."}`;
}
function callClaude(systemPrompt, userContent) {
  return new Promise((resolve, reject) => {
    const bodyData = JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 1500, system: systemPrompt, messages: [{ role: "user", content: userContent }] });
    const req = https.request({ hostname: "api.anthropic.com", path: "/v1/messages", method: "POST", headers: { "Content-Type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" } },
      (res) => { let d = ""; res.on("data", c => d += c); res.on("end", () => { try { const r = JSON.parse(d); if (r.error) return reject(new Error("Claude: " + r.error.message)); const raw = r.content?.map(b => b.text || "").join("") || "{}"; resolve(JSON.parse(raw.replace(/```json|```/g, "").trim())); } catch (e) { reject(new Error("Claude parse error: " + e.message)); } }); });
    req.on("error", reject); req.write(bodyData); req.end();
  });
}
async function analyzeText(text, activeTasks) { return callClaude(buildSystemPrompt(activeTasks), `رسالة المستخدم:\n"${text}"`); }
async function analyzeMedia(base64, mediaType, kind, activeTasks) {
  const block = kind === "pdf" ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } } : { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } };
  return callClaude(buildSystemPrompt(activeTasks), [block, { type: "text", text: `استخرج كل المهام والمواعيد من هذه ${kind === "pdf" ? "الوثيقة" : "الصورة"}. إن لم تجد أرجع intent="chat" مع وصف موجز في reason.` }]);
}

// ---------- FORMATTERS ----------
const pEmoji = { high: "🔴", medium: "🟡", low: "🟢" };
const pLabel = { high: "عالية", medium: "متوسطة", low: "منخفضة" };
function catEmoji(c) { if (!c || c === "شخصي") return "🏠"; if (c === "عمل") return "💼"; return "🏢"; }
function catName(c) { return (!c || c === "شخصي") ? "" : c; }
function dayName(s) { return new Date(s + "T12:00:00").toLocaleDateString("ar-SA", { weekday: "long" }); }
function taskLine(t) { let s = ` ${pEmoji[t.priority] || "🟡"} ${t.time} ${t.title} ${catEmoji(t.category)}`; const cn = catName(t.category); if (cn) s += ` ${cn}`; return s; }

function menuText(isAdmin, primary) {
  let m = "🤖 *VoiceTask — القائمة*\n\n1️⃣ جدول اليوم\n2️⃣ جدول الأسبوع\n3️⃣ المهام المتأخرة\n4️⃣ إحصائياتي\n5️⃣ فئاتي\n6️⃣ مساعدة\n\n🔁 *التكرارات* — مهامك المتكررة\n🖥 *رابط لوحتي* — لوحة التحكم";
  if (isAdmin) m += "\n\n👑 *للمدير:*\n• مهام الفريق\n• مهام [اسم الشخص]\n• سجل التغييرات";
  if (primary) m += "\n\n📢 *الإشعارات الجماعية (لك فقط):*\n• ابعت روابط اللوحات للكل\n• ابعت ملخص المهام للكل\n• بلّغ الفريق: [رسالة]\n• بلّغ [اسم]: [رسالة]";
  m += "\n\n💬 رد برقم أو اكتب/سجّل طلبك";
  return m;
}
function formatTasksMessage(tasks) {
  if (!tasks || !tasks.length) return "✅ استلمت رسالتك لكن لم أجد مهام واضحة.\n💡 جرب: \"فكرني أكلم أحمد بكرة الساعة 10\"";
  let msg = tasks.length === 1 ? "✅ *تمت إضافة المهمة*\n\n" : `✅ *تمت إضافة ${tasks.length} مهام*\n\n`;
  tasks.forEach((t, i) => {
    msg += `${pEmoji[t.priority] || "🟡"} *${t.title}*\n🕐 ${t.time} │ 📅 ${t.date}\n${catEmoji(t.category)} ${t.category || "شخصي"} │ الأولوية: ${pLabel[t.priority] || "متوسطة"}\n`;
    if (t.person) msg += `👤 ${t.person}\n`;
    if (i < tasks.length - 1) msg += "\n";
  });
  return msg.trim();
}
function formatDaily(tasks) {
  const today = riyadhDateStr(riyadhNow());
  if (!tasks || !tasks.length) return `☀️ *${dayName(today)}* — لا مهام اليوم 🎉`;
  const done = tasks.filter(t => t.status === "done");
  const active = tasks.filter(t => t.status !== "done");
  let msg = `☀️ *${dayName(today)} ${today}* — ${tasks.length} مهمة\n\n`;
  const groups = { high: "🔴 *عاجل*", medium: "🟡 *عادي*", low: "🟢 *مرنة*" };
  for (const p of ["high", "medium", "low"]) { const g = active.filter(t => (t.priority || "medium") === p); if (!g.length) continue; msg += groups[p] + "\n"; g.forEach(t => { msg += `${taskLine(t)}\n`; }); msg += "\n"; }
  if (done.length) msg += `✅ منجز اليوم: ${done.length}`;
  return msg.trim();
}
function weekByDay(list) { const g = {}; list.forEach(t => { (g[t.date] = g[t.date] || []).push(t); }); let s = ""; for (const [d, dt] of Object.entries(g)) { s += `_${dayName(d)} ${d}_\n`; dt.forEach(t => { s += `${taskLine(t)}\n`; }); } return s; }
function formatWeekly(tasks, title) {
  const head = title || "جدول الأسبوع";
  if (!tasks || !tasks.length) return `📅 *${head}* — لا مهام 🎉`;
  const personal = tasks.filter(t => (t.category || "شخصي") === "شخصي");
  const work = tasks.filter(t => (t.category || "شخصي") !== "شخصي");
  let msg = `📅 *${head}* — ${tasks.length} مهمة\n\n`;
  if (work.length) msg += `💼 *العمل والإدارات* (${work.length})\n${weekByDay(work)}\n`;
  if (personal.length) msg += `🏠 *الشخصية* (${personal.length})\n${weekByDay(personal)}`;
  return msg.trim();
}
function formatCategory(cat, tasks) {
  if (!tasks || !tasks.length) return `${catEmoji(cat)} *${cat}* — لا مهام نشطة 🎉`;
  const g = {}; tasks.forEach(t => { (g[t.date] = g[t.date] || []).push(t); });
  let msg = `${catEmoji(cat)} *${cat}* — ${tasks.length} مهمة\n\n`;
  for (const [d, dt] of Object.entries(g)) { msg += `_${dayName(d)} ${d}_\n`; dt.forEach(t => { msg += ` ${pEmoji[t.priority] || "🟡"} ${t.time} ${t.title} (${pLabel[t.priority] || "متوسطة"})`; if (t.person) msg += ` │ 👤 ${t.person}`; msg += "\n"; }); msg += "\n"; }
  return msg.trim();
}
function formatOverdue(tasks) {
  if (!tasks || !tasks.length) return "⏳ *المتأخرة* — لا شيء متأخر، ممتاز! 🎉";
  let msg = `⏳ *المهام المتأخرة* — ${tasks.length}\n\n`;
  tasks.forEach(t => { msg += `${pEmoji[t.priority] || "🟡"} ${t.title} — كانت ${t.date} ${catEmoji(t.category)} ${catName(t.category)}\n`; });
  return msg + "\n💡 \"أجّل [المهمة] لبكرة\" أو \"خلصت [المهمة]\"";
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
function formatCategoriesList(tasks) {
  if (!tasks.length) return "🗂 لا مهام نشطة حالياً";
  const byCat = {}; tasks.forEach(t => { const c = t.category || "شخصي"; byCat[c] = (byCat[c] || 0) + 1; });
  let msg = "🗂 *فئاتك النشطة*\n\n";
  Object.entries(byCat).sort((a, b) => b[1] - a[1]).forEach(([c, n]) => { msg += `${catEmoji(c)} ${c} — ${n} مهمة\n`; });
  return msg + "\n💬 اكتب: \"مهام [اسم الفئة]\"";
}
function formatRecurring(rules) {
  if (!rules || !rules.length) return "🔁 *المهام المتكررة* — لا يوجد\n\n💡 مثال: \"اجتماع كل خميس الساعة 4\"";
  let msg = `🔁 *المهام المتكررة* — ${rules.length}\n\n`;
  rules.forEach((r) => {
    let when = r.freq === "weekly" ? `كل ${DOW_AR[r.day_of_week] || "أسبوع"}` : r.freq === "daily" ? "كل يوم" : `يوم ${r.day_of_month || 1}/الشهر`;
    msg += `${catEmoji(r.category)} *${r.title}*\n   📆 ${when} ⏰ ${r.time} (#${r.id})\n`;
  });
  return msg + "\n🛑 لإيقاف واحدة اكتب: \"أوقف التكرار رقم [الرقم]\"";
}
function helpText(isAdmin) {
  let m = "🤖 *VoiceTask AI*\n\n📝 أرسل مهامك نصاً أو 🎤 صوتاً أو 📷 صورة أو 📄 PDF\n\n✏️ \"أجّل اجتماع الأحد للساعة 7\"\n🗑 \"ألغي مهمة كذا\"\n✅ \"خلصت كذا\"\n🔁 \"اجتماع كل خميس الساعة 4\" (مهمة متكررة)\n🏷 \"غيّر فئة حنان إلى المنزل\"\n⚡ بعد التذكير: \"خلصت\" / \"أجلها ساعة\" / \"أجلها بكرة\"\n\n🔐 الإلغاء والتعديل بتأكيد (نعم/لا)";
  if (isAdmin) m += "\n\n👑 *أوامر المدير:* مهام الفريق │ مهام [اسم] │ سجل التغييرات";
  m += "\n\n📋 *القائمة* — كل الأوامر";
  return m;
}
function formatTeam(tasks) {
  if (!tasks || !tasks.length) return "👥 *مهام الفريق* — لا مهام نشطة";
  const byUser = {};
  tasks.forEach(t => { const u = t.user_phone; (byUser[u] = byUser[u] || []).push(t); });
  let msg = `👥 *مهام الفريق* — ${tasks.length} مهمة\n\n`;
  for (const [phone, list] of Object.entries(byUser)) {
    const usr = allUsers().find(u => u.phone === phone);
    msg += `👤 *${usr ? usr.name : "غير معروف"}* (${list.length})\n`;
    list.forEach(t => { msg += ` ${pEmoji[t.priority] || "🟡"} ${t.time} ${t.title} ${catEmoji(t.category)}\n`; });
    msg += "\n";
  }
  return msg.trim();
}

// ---------- PENDING ----------
async function applyPending(p, user) {
  const phone = toDbPhone(user.workspacePhone || user.phone);
  const t = await getTaskOwned(p.task_id, phone);
  if (!t) return "⚠️ المهمة لم تعد موجودة.";
  if (p.type === "cancel") {
    await updateTaskOwned(p.task_id, phone, { status: "cancelled" });
    await logChange({ taskId: t.id, action: "cancel", user, before: { status: t.status }, after: { status: "cancelled" } });
    await notifySecretaryAction(user, `🗑 ألغى مهمة: *${t.title}*`);
    return `🗑 *تم الإلغاء:* ${t.title}`;
  }
  if (p.type === "update") {
    const before = { date: t.date, time: t.time, title: t.title, category: t.category };
    await updateTaskOwned(p.task_id, phone, p.updates);
    await logChange({ taskId: t.id, action: "update", user, before, after: p.updates });
    const parts = [];
    if (p.updates.date) parts.push(`📅 ${p.updates.date}`);
    if (p.updates.time) parts.push(`⏰ ${p.updates.time}`);
    if (p.updates.title) parts.push(`✏️ ${p.updates.title}`);
    if (p.updates.category) parts.push(`🏢 ${p.updates.category}`);
    await notifySecretaryAction(user, `✏️ عدّل مهمة: *${t.title}*\n${parts.join("  ")}`);
    return `✏️ *تم التعديل:* ${t.title}\n${parts.join("  ")}\n🔔 أُعيد ضبط تذكيراتها`;
  }
  return "تم.";
}

// ---------- INTENT ----------
async function executeIntent(result, user) {
  const phone = toDbPhone(user.workspacePhone || user.phone); // مساحة العمل (للسكرتير = مساحة مديره)
  const myKey = normPhone(user.phone);                        // مفتاح pending شخصي
  const activeTasks = await getActiveTasksFor(phone);
  switch (result.intent) {
    case "add": {
      const tasks = result.tasks || []; let saved = 0;
      for (const t of tasks) {
        try {
          const row = await saveTask(t, phone); saved++;
          const newId = Array.isArray(row) && row[0] ? row[0].id : null;
          await logChange({ taskId: newId, action: "add", user, after: t });
        } catch (e) { console.error("Save:", e.message); }
      }
      if (tasks.length && !saved) return "⚠️ فهمت المهمة لكن حدث خطأ بالحفظ. حاول مرة أخرى.";
      const first = tasks[0];
      if (user.role === "secretary" && saved) {
        // إشعار للمدير + سامح بأن السكرتير أضاف
        await notifySecretaryAction(user, `➕ أضاف ${saved > 1 ? saved + " مهام" : "مهمة"}:\n*${first.title}*\n📅 ${first.date} ⏰ ${first.time} ${catEmoji(first.category)}`);
      } else if (!user.isAdmin && user.role === "member" && saved) {
        // عضو عادي: إشعار للأدمن الأساسي
        const note = `📥 *${user.name}* سجّل ${saved > 1 ? saved + " مهام" : "مهمة"}:\n*${first.title}*\n📅 ${first.date} ⏰ ${first.time} ${catEmoji(first.category)}`;
        try { await sendWhatsApp(toDbPhone(getAdmin().phone), note); } catch (e) { console.error("notify:", e.message); }
      }
      return formatTasksMessage(tasks);
    }
    case "recurring": {
      const r = result.recurring;
      if (!r || !r.title || !r.freq) return "⚠️ لم أفهم تفاصيل التكرار. مثال: \"اجتماع كل خميس الساعة 4\"";
      try {
        await saveRecurringRule(r, phone);
        await logChange({ action: "recurring_add", user, after: r });
      } catch (e) { console.error("recurring:", e.message); return "⚠️ تعذّر حفظ التكرار. حاول مرة أخرى."; }
      let when = "";
      if (r.freq === "weekly") when = `كل ${DOW_AR[r.day_of_week] || "أسبوع"}`;
      else if (r.freq === "daily") when = "كل يوم";
      else if (r.freq === "monthly") when = `يوم ${r.day_of_month || 1} من كل شهر`;
      return `🔁 *تم ضبط مهمة متكررة*\n\n*${r.title}*\n📆 ${when} │ ⏰ ${r.time || "09:00"}\n${catEmoji(r.category)} ${r.category || "شخصي"}\n\n💡 ستُنشأ تلقائياً في موعدها. لإيقافها اكتب: *التكرارات*`;
    }
    case "update": {
      if (!result.task_id || !result.updates) return "⚠️ لم أحدد المهمة أو التعديل. وضّح أكثر.";
      const t = activeTasks.find(x => x.id === result.task_id);
      if (!t) return "⚠️ لم أجد المهمة في قائمتك.";
      const parts = [];
      if (result.updates.date) parts.push(`📅 ${result.updates.date}`);
      if (result.updates.time) parts.push(`⏰ ${result.updates.time}`);
      if (result.updates.title) parts.push(`✏️ ${result.updates.title}`);
      if (result.updates.category) parts.push(`🏢 ${result.updates.category}`);
      await setPending(myKey, { type: "update", task_id: result.task_id, updates: result.updates });
      return `⚠️ *تأكيد التعديل*\n*${t.title}* (الحالي: ${t.date} ${t.time})\nالتغيير: ${parts.join("  ")}\n\nرد: *نعم* للتأكيد │ *لا* للتراجع`;
    }
    case "cancel": {
      if (!result.task_id) return "⚠️ لم أحدد المهمة المطلوب إلغاؤها.";
      const t = activeTasks.find(x => x.id === result.task_id);
      if (!t) return "⚠️ لم أجد المهمة في قائمتك.";
      await setPending(myKey, { type: "cancel", task_id: result.task_id });
      return `⚠️ *تأكيد الإلغاء*\nمتأكد من إلغاء: *${t.title}*؟\n📅 ${t.date} ⏰ ${t.time}\n\nرد: *نعم* للتأكيد │ *لا* للتراجع`;
    }
    case "done": {
      if (!result.task_id) return "⚠️ لم أحدد المهمة المنجزة.";
      const t = activeTasks.find(x => x.id === result.task_id);
      if (!t) return "⚠️ لم أجد المهمة في قائمتك.";
      await updateTaskOwned(result.task_id, phone, { status: "done" });
      await logChange({ taskId: t.id, action: "done", user, before: { status: t.status }, after: { status: "done" } });
      await notifySecretaryAction(user, `✅ أنجز مهمة: *${t.title}*`);
      return `🎉 *أحسنت! أُنجزت:* ${t.title}`;
    }
    case "rename_category": {
      const oldC = result.old_category, newC = result.new_category;
      if (!oldC || !newC) return "⚠️ وضّح الفئتين. مثال: \"غيّر فئة حنان إلى المنزل\"";
      const n = await renameCategory(phone, oldC, newC);
      await logChange({ action: "rename_category", user, before: { category: oldC }, after: { category: newC } });
      return n ? `🏷 *تم تغيير اسم الفئة*\n«${oldC}» ← «${newC}»\n📋 تأثّرت ${n} مهمة.` : `🏷 غيّرت الاسم «${oldC}» ← «${newC}»، لكن لم أجد مهام بهذه الفئة حالياً.`;
    }
    case "list_recurring": {
      const rules = await getRecurringFor(phone);
      return formatRecurring(rules);
    }
    case "list": {
      const sc = result.scope || "all";
      if (sc === "today") return formatDaily(await getTodayFor(phone));
      if (sc === "week") return formatWeekly(await getWeekFor(phone));
      if (sc === "overdue") return formatOverdue(await getOverdueFor(phone));
      return formatWeekly(await getActiveTasksFor(phone), "كل مهامك");
    }
    case "category_report": {
      if (!result.category) return "⚠️ حدد الفئة، مثلاً: \"مهام إدارة المبيعات\"";
      return formatCategory(result.category, await getCategoryFor(phone, result.category));
    }
    case "clarify": {
      let msg = "🤔 وجدت أكثر من مهمة، أيها تقصد؟\n\n";
      (result.candidates || []).forEach((c, i) => { const t = activeTasks.find(x => x.id === c.id); msg += `${i + 1}️⃣ ${t ? `${t.title} — ${t.date} ${t.time}` : c.title}\n`; });
      return msg + "\nأعد طلبك مع تحديد المهمة.";
    }
    case "not_found": return `⚠️ لم أجد المهمة.\n${result.reason || ""}\n📋 اكتب *القائمة*.`;
    default: return result.reason ? `💬 ${result.reason}\n\n📋 اكتب *القائمة*` : "أهلاً! أرسل مهامك نصاً أو صوتاً 😊\n📋 اكتب *القائمة*";
  }
}

// ---------- QUICK ----------
async function quickDoneLast(user) {
  const wp = toDbPhone(user.workspacePhone || user.phone);
  const id = await getState(`last_reminder_${wp}`); if (!id) return null;
  const t = await getTaskOwned(id, wp); if (!t || t.status !== "new") return null;
  await updateTaskOwned(t.id, wp, { status: "done" });
  await logChange({ taskId: t.id, action: "done", user, before: { status: "new" }, after: { status: "done" } });
  await notifySecretaryAction(user, `✅ أنجز مهمة: *${t.title}*`);
  return `🎉 *أحسنت! أُنجزت:* ${t.title}`;
}
async function quickPostpone(user, mode) {
  const wp = toDbPhone(user.workspacePhone || user.phone);
  const id = await getState(`last_reminder_${wp}`); if (!id) return "⚠️ لا توجد مهمة حديثة. حدد المهمة بالاسم.";
  const t = await getTaskOwned(id, wp); if (!t || t.status !== "new") return "⚠️ المهمة الأخيرة لم تعد نشطة.";
  if (mode === "tomorrow") { const d = new Date(t.date + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + 1); const nd = riyadhDateStr(d); await updateTaskOwned(t.id, wp, { date: nd }); await logChange({ taskId: t.id, action: "postpone", user, before: { date: t.date }, after: { date: nd } }); await notifySecretaryAction(user, `⏰ أجّل مهمة: *${t.title}* إلى ${nd}`); return `⏰ *تم التأجيل لبكرة:* ${t.title}\n📅 ${nd} ⏰ ${t.time}`; }
  let [h, m] = (t.time || "09:00").split(":").map(Number); let date = t.date; h += 1;
  if (h >= 24) { h -= 24; const d = new Date(date + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + 1); date = riyadhDateStr(d); }
  const nt = String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0");
  await updateTaskOwned(t.id, wp, { date, time: nt });
  await logChange({ taskId: t.id, action: "postpone", user, before: { date: t.date, time: t.time }, after: { date, time: nt } });
  await notifySecretaryAction(user, `⏰ أجّل مهمة: *${t.title}* إلى ${nt}`);
  return `⏰ *تم التأجيل ساعة:* ${t.title}\n🕐 ${nt}${date !== t.date ? " (" + date + ")" : ""}`;
}

// ---------- AUDIT FORMATTERS ----------
async function getRecentAudit(limit = 15) { return supabaseRequest("GET", `audit_log?order=created_at.desc&limit=${limit}`); }
function formatAuditLog(rows) {
  if (!rows || !rows.length) return "📜 *سجل التغييرات* — لا يوجد نشاط بعد.";
  const actAr = { add: "➕ أضاف", update: "✏️ عدّل", cancel: "🗑 ألغى", done: "✅ أنجز", postpone: "⏰ أجّل", rename_category: "🏷 غيّر فئة", recurring_add: "🔁 أضاف تكرار", recurring_stop: "🛑 أوقف تكرار" };
  let msg = "📜 *سجل التغييرات* (آخر النشاطات)\n\n";
  rows.forEach(r => {
    const d = new Date(r.created_at); const tm = String((d.getUTCHours() + 3) % 24).padStart(2, "0") + ":" + String(d.getUTCMinutes()).padStart(2, "0");
    const title = (r.after_data && r.after_data.title) || (r.before_data && r.before_data.title) || (r.after_data && r.after_data.category) || "";
    const src = r.source === "dashboard" ? "🖥" : "📱";
    msg += `${src} *${r.actor_name || "؟"}* — ${actAr[r.action] || r.action}${title ? ` «${title}»` : ""}\n   🕐 ${tm}\n`;
  });
  return msg.trim();
}

// ---------- BROADCAST (الأدمن الأساسي فقط) ----------
async function broadcastLinks() {
  let sent = 0;
  for (const u of allUsers()) {
    try {
      await sendWhatsApp(toDbPhone(u.phone), "🖥 *لوحة تحكمك*\nاضغط الرابط للدخول 👇");
      await sendWhatsApp(toDbPhone(u.phone), dashLinkFor(u.phone)); // الرابط لوحده
      sent++;
    } catch (e) { console.error("blink:", e.message); }
  }
  return `✅ تم إرسال روابط اللوحات إلى ${sent} مستخدم.`;
}
async function broadcastSummaries() {
  let sent = 0;
  for (const u of allUsers()) {
    try {
      const tasks = await getTodayFor(toDbPhone(u.phone));
      await sendWhatsApp(toDbPhone(u.phone), formatDaily(tasks));
      sent++;
    } catch (e) { console.error("bsum:", e.message); }
  }
  return `✅ تم إرسال ملخص اليوم إلى ${sent} مستخدم (كل واحد مهامه فقط).`;
}
async function broadcastMessage(body) {
  if (!body) return "⚠️ اكتب الرسالة بعد «بلّغ الفريق:».";
  let sent = 0;
  for (const u of allUsers()) {
    if (samePhone(u.phone, getAdmin().phone)) continue; // لا ترسل لنفسك
    try { await sendWhatsApp(toDbPhone(u.phone), `📢 *رسالة من ${getAdmin().name}:*\n\n${body}`); sent++; } catch (e) { console.error("bmsg:", e.message); }
  }
  return `✅ تم تبليغ ${sent} عضو.`;
}
async function notifyOne(name, body) {
  const target = findUserByName(name);
  if (!target) return `⚠️ لم أجد عضواً بالاسم «${name}».`;
  try { await sendWhatsApp(toDbPhone(target.phone), `📢 *رسالة من ${getAdmin().name}:*\n\n${body}`); }
  catch (e) { return "⚠️ تعذّر الإرسال."; }
  return `✅ تم تبليغ *${target.name}*.`;
}

// ---------- ROUTER ----------
async function handleTextMessage(text, user) {
  const phone = toDbPhone(user.workspacePhone || user.phone); // مساحة المهام (للسكرتير = مساحة مديره)
  const myKey = normPhone(user.phone);                        // مفتاح شخصي (pending/reminder لكل فرد)
  const t = (text || "").trim(), lower = t.toLowerCase();
  const primary = isPrimaryAdmin(user);                       // سامح فقط

  const pending = await getPending(myKey);
  if (pending) {
    if (/^(نعم|أيوه|ايوه|تأكيد|تاكيد|اوك|أوكي|تمام|أكد|اكد|ok|yes|y)$/i.test(t)) { await clearPending(myKey); return applyPending(pending, user); }
    if (/^(لا|لأ|إلغاء|الغاء|تراجع|الغي|no|n)$/i.test(t)) { await clearPending(myKey); return "👍 تم التراجع، لم يحدث أي تغيير."; }
    await clearPending(myKey);
  }

  // ===== أوامر الإشعارات الجماعية — للأدمن الأساسي (سامح) فقط =====
  if (primary) {
    if (/^(ابعت روابط اللوحات للكل|روابط الكل|ارسل الروابط للكل)$/.test(t)) return await broadcastLinks();
    if (/^(ابعت ملخص المهام للكل|ملخص الكل|ارسل الملخصات للكل)$/.test(t)) return await broadcastSummaries();
    const mNotifyTeam = t.match(/^بلّ?غ\s+الفريق\s*[:：]\s*([\s\S]+)$/);
    if (mNotifyTeam) return await broadcastMessage(mNotifyTeam[1].trim());
    const mNotifyOne = t.match(/^بلّ?غ\s+(.+?)\s*[:：]\s*([\s\S]+)$/);
    if (mNotifyOne) return await notifyOne(mNotifyOne[1].trim(), mNotifyOne[2].trim());
  }

  // أوامر المدير/الأدمن (الأدمن الأساسي أو من isAdmin)
  if (user.isAdmin) {
    if (/^مهام الفريق$/.test(t) || t === "الفريق") return formatTeam(await getAllActiveAdmin());
    if (/^(سجل التغييرات|السجل|التغييرات)$/.test(t)) return formatAuditLog(await getRecentAudit());
    const mTeam = t.match(/^مهام\s+(.+)$/);
    if (mTeam) {
      const target = findUserByName(mTeam[1]);
      if (target) return formatWeekly(await getActiveForPhoneAdmin(toDbPhone(target.phone)), `مهام ${target.name}`);
    }
  }

  // المهام المتكررة
  if (/^(التكرارات|مهامي المتكررة|المتكررة)$/.test(t)) return formatRecurring(await getRecurringFor(phone));
  const mStop = t.match(/أوقف\s+التكرار\s+رقم\s+(\d+)/);
  if (mStop) { await deactivateRecurring(parseInt(mStop[1], 10), phone); await logChange({ action: "recurring_stop", user, before: { id: mStop[1] } }); return `🛑 تم إيقاف التكرار رقم ${mStop[1]}.`; }

  // رابط الداشبورد الشخصي (للسكرتير: رابط لوحة مديره)
  if (/^(رابط لوحتي|رابط اللوحة|لوحتي|رابط الداشبورد|الداشبورد|داشبورد)$/.test(t)) {
    const linkPhone = user.role === "secretary" ? user.workspacePhone : user.phone;
    const messages = [];
    messages.push("🖥 *لوحة التحكم الخاصة بك*\nاضغط الرابط التالي للدخول 👇");
    messages.push(dashLinkFor(linkPhone));   // الرابط لوحده في رسالة مستقلة (قابل للضغط)
    if (primary) {
      messages.push("👑 *روابط دخول الفريق* — أرسل لكل شخص رابطه:");
      for (const u of allUsers()) {
        messages.push(`• *${u.name}*`);
        messages.push(dashLinkFor(u.phone)); // كل رابط في رسالة مستقلة
      }
    } else {
      messages.push("🔐 رابط خاص بك — لا تشاركه مع أحد.");
    }
    return { messages };
  }

  if (/^(القائمة|قائمة|قائمه|القائمه|menu)$/i.test(t)) return menuText(user.isAdmin, primary);
  if (/^[1-6]$/.test(t)) {
    switch (t) {
      case "1": return formatDaily(await getTodayFor(phone));
      case "2": return formatWeekly(await getWeekFor(phone));
      case "3": return formatOverdue(await getOverdueFor(phone));
      case "4": return formatStats(await getStatsFor(phone));
      case "5": return formatCategoriesList(await getActiveTasksFor(phone));
      case "6": return helpText(user.isAdmin);
    }
  }
  if (lower.includes("جدولي اليوم") || lower.includes("مهام اليوم") || t === "اليوم") return formatDaily(await getTodayFor(phone));
  if (lower.includes("جدولي الأسبوع") || lower.includes("مهام الأسبوع") || t === "الأسبوع") return formatWeekly(await getWeekFor(phone));
  if (t.includes("المتأخرة") || t.includes("المتاخرة")) return formatOverdue(await getOverdueFor(phone));
  if (t.includes("إحصائيات") || t.includes("احصائيات")) return formatStats(await getStatsFor(phone));
  if (t === "فئاتي" || t === "الفئات") return formatCategoriesList(await getActiveTasksFor(phone));
  if (t === "مساعدة" || lower === "help" || t === "؟") return helpText(user.isAdmin);

  if (t.length <= 20 && t.includes("أجل") && (t.includes("بكر") || t.includes("غد"))) return quickPostpone(user, "tomorrow");
  if (t.length <= 20 && t.includes("أجل") && t.includes("ساعة")) return quickPostpone(user, "hour");
  if (t.length <= 6 && (t === "خلصت" || t === "تم" || t === "تمت")) { const r = await quickDoneLast(user); if (r) return r; }

  if (t.length <= 3) return "أهلاً! أرسل مهامك وسأنظمها 😊\n📋 اكتب *القائمة*";

  const active = await getActiveTasksFor(phone);
  return executeIntent(await analyzeText(t, active), user);
}

// ---------- MAIN ----------
module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method === "GET") return res.status(200).json({ status: "✅ VoiceTask AI يعمل بنجاح!", version: "3.6.1", riyadhTime: riyadhNow().toISOString() });
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const TwiML = `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`;
  try {
    const body = req.body || {};
    const from = body.From || "", msgBody = body.Body || "";
    const mediaUrl = body.MediaUrl0 || null;
    const mediaType = (body.MediaContentType0 || "").toLowerCase();
    const numMedia = parseInt(body.NumMedia || "0", 10);
    console.log(`📨 From: ${from} | Media: ${numMedia} (${mediaType})`);

    const user = resolveUser(from);
    if (!user) { console.warn(`⛔ Unauthorized: ${from}`); return res.status(200).send(TwiML); }

    let reply = "";
    if (numMedia > 0 && mediaUrl) {
      try {
        if (mediaType.startsWith("audio")) {
          await sendWhatsApp(from, "🎤 استلمت الصوت!\n⏳ جاري التحويل...");
          const buf = await downloadMedia(mediaUrl);
          const txt = await transcribeBuffer(buf);
          if (txt && txt.length > 3) { await sendWhatsApp(from, `📝 "${txt}"`); reply = await handleTextMessage(txt, user); }
          else reply = "⚠️ لم أفهم الصوت. حاول مرة أخرى أو اكتب نصاً.";
        } else if (mediaType.startsWith("image")) {
          await sendWhatsApp(from, "📷 استلمت الصورة!\n⏳ جاري قراءتها...");
          const buf = await downloadMedia(mediaUrl);
          const active = await getActiveTasksFor(toDbPhone(user.workspacePhone || user.phone));
          reply = await executeIntent(await analyzeMedia(buf.toString("base64"), mediaType, "image", active), user);
        } else if (mediaType === "application/pdf") {
          await sendWhatsApp(from, "📄 استلمت الملف!\n⏳ جاري قراءته...");
          const buf = await downloadMedia(mediaUrl);
          const active = await getActiveTasksFor(toDbPhone(user.workspacePhone || user.phone));
          reply = await executeIntent(await analyzeMedia(buf.toString("base64"), mediaType, "pdf", active), user);
        } else {
          reply = "📎 النوع ده غير مدعوم.\nالمدعوم: 🎤 صوت │ 📷 صور │ 📄 PDF │ 📝 نص";
        }
      } catch (e) {
        console.error("Media error:", e.message);
        reply = e.message === "FILE_TOO_BIG" ? "⚠️ الملف كبير جداً (~4MB)." : "⚠️ حدث خطأ في معالجة الملف.\nأرسل طلبك نصاً.";
      }
    } else {
      reply = await handleTextMessage(msgBody, user);
    }

    // الرد قد يكون نصاً واحداً أو عدة رسائل (مثل: تمهيد + رابط منفصل)
    if (reply && typeof reply === "object" && Array.isArray(reply.messages)) {
      for (const m of reply.messages) { if (m && m.trim()) await sendWhatsApp(from, m); }
    } else {
      await sendWhatsApp(from, reply);
    }
    return res.status(200).send(TwiML);
  } catch (error) {
    console.error("❌ Handler error:", error.message);
    try { const from = req.body?.From; if (from) await sendWhatsApp(from, "⚠️ خطأ مؤقت. حاول بعد قليل."); } catch (_) {}
    return res.status(200).send(TwiML);
  }
};

// ============================================================
// VoiceTask AI - Reminders Engine v2.1.0
// تذكيرات غنية + متابعة بعد الموعد + ملخص صباحي + مهام فائتة + تقرير صحة
// ============================================================

"use strict";
const https = require("https");

function riyadhNow() { return new Date(Date.now() + 3 * 3600 * 1000); }
function riyadhDateStr(d) { return d.toISOString().split("T")[0]; }
function dayName(s) { return new Date(s + "T12:00:00").toLocaleDateString("ar-SA", { weekday: "long" }); }
const pEmoji = { high: "🔴", medium: "🟡", low: "🟢" };
const pLabel = { high: "عالية", medium: "متوسطة", low: "منخفضة" };
const pOrder = { high: 0, medium: 1, low: 2 };
function catEmoji(c) { if (!c || c === "شخصي") return "🏠"; if (c === "عمل") return "💼"; return "🏢"; }
function catName(c) { return (!c || c === "شخصي") ? "" : c; }

// ---------- TWILIO ----------
async function sendWhatsApp(message) {
  const sid = process.env.TWILIO_ACCOUNT_SID, tok = process.env.TWILIO_AUTH_TOKEN;
  const body = new URLSearchParams({ To: process.env.YOUR_WHATSAPP, From: process.env.TWILIO_WHATSAPP_FROM, Body: message }).toString();
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: "api.twilio.com", path: `/2010-04-01/Accounts/${sid}/Messages.json`, method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: "Basic " + Buffer.from(`${sid}:${tok}`).toString("base64") },
    }, (res) => { let d = ""; res.on("data", c => d += c); res.on("end", () => { try { resolve(JSON.parse(d)); } catch (e) { resolve({}); } }); });
    req.on("error", reject); req.write(body); req.end();
  });
}
function getTwilioBalance() {
  const sid = process.env.TWILIO_ACCOUNT_SID, tok = process.env.TWILIO_AUTH_TOKEN;
  return new Promise((resolve) => {
    const req = https.request({ hostname: "api.twilio.com", path: `/2010-04-01/Accounts/${sid}/Balance.json`, method: "GET", headers: { Authorization: "Basic " + Buffer.from(`${sid}:${tok}`).toString("base64") } },
      (res) => { let d = ""; res.on("data", c => d += c); res.on("end", () => { try { const p = JSON.parse(d); resolve(p.balance ? `$${parseFloat(p.balance).toFixed(2)}` : "غير متاح"); } catch (e) { resolve("غير متاح"); } }); });
    req.on("error", () => resolve("غير متاح")); req.end();
  });
}

// ---------- HEALTH ----------
function pingHost(opts) {
  return new Promise((resolve) => {
    const req = https.request(opts, (res) => { res.resume(); if (res.statusCode === 200) resolve("✅ يعمل"); else if (res.statusCode === 401) resolve("❌ مفتاح غير صالح"); else if (res.statusCode === 429) resolve("⚠️ الرصيد/الحد منتهي!"); else resolve(`⚠️ حالة ${res.statusCode}`); });
    req.on("error", () => resolve("❌ لا يستجيب")); req.setTimeout(8000, () => { req.destroy(); resolve("⚠️ بطيء"); }); req.end();
  });
}
const checkOpenAI = () => pingHost({ hostname: "api.openai.com", path: "/v1/models", method: "GET", headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` } });
const checkAnthropic = () => pingHost({ hostname: "api.anthropic.com", path: "/v1/models", method: "GET", headers: { "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" } });

// ---------- SUPABASE ----------
function supabaseRequest(method, pathAndQuery, bodyObj, prefer) {
  const url = new URL(`${process.env.SUPABASE_URL}/rest/v1/${pathAndQuery}`);
  const bodyData = bodyObj ? JSON.stringify(bodyObj) : null;
  return new Promise((resolve, reject) => {
    const req = https.request({ hostname: url.hostname, path: url.pathname + url.search, method, headers: { "Content-Type": "application/json", apikey: process.env.SUPABASE_KEY, Authorization: `Bearer ${process.env.SUPABASE_KEY}`, Prefer: prefer || "return=representation" } },
      (res) => { let d = ""; res.on("data", c => d += c); res.on("end", () => { if (res.statusCode >= 400) return reject(new Error(`Supabase: ${d}`)); try { resolve(d ? JSON.parse(d) : []); } catch (e) { resolve([]); } }); });
    req.on("error", reject); if (bodyData) req.write(bodyData); req.end();
  });
}
async function getState(key) { try { const r = await supabaseRequest("GET", `system_state?key=eq.${encodeURIComponent(key)}&select=value`); return r.length ? r[0].value : null; } catch (e) { return null; } }
async function setState(key, value) { try { await supabaseRequest("POST", "system_state", { key, value: String(value) }, "resolution=merge-duplicates,return=minimal"); } catch (e) { console.error("setState:", e.message); } }
function patchTask(id, fields) { return supabaseRequest("PATCH", `tasks?id=eq.${id}`, fields, "return=minimal"); }

// ---------- 1. RICH REMINDERS + FOLLOW-UP ----------
async function processReminders() {
  const now = riyadhNow(), today = riyadhDateStr(now);
  const nowMin = now.getUTCHours() * 60 + now.getUTCMinutes();
  const tasks = await supabaseRequest("GET", `tasks?date=eq.${today}&status=eq.new&order=time.asc`);
  let sent = 0;

  for (const task of tasks) {
    if (!task.time) continue;
    const [h, m] = task.time.split(":").map(Number);
    const diff = (h * 60 + m) - nowMin;
    const next = tasks.find(t => t.id !== task.id && t.time > task.time);
    const nextLine = next ? `\n📌 بعدها: ${next.title} (${next.time})` : "";

    // تذكير مسبق (≤15 دقيقة)
    if (diff > 0 && diff <= 15 && !task.reminder_before_sent) {
      let msg = `⏰ *بعد ${diff} دقيقة*\n\n${pEmoji[task.priority] || "🟡"} *${task.title}*\n🕐 ${task.time} │ ${catEmoji(task.category)} ${task.category || "شخصي"} │ ${pLabel[task.priority] || "متوسطة"}`;
      if (task.person) msg += `\n👤 ${task.person}`;
      if (task.description) msg += `\n📝 ${task.description}`;
      msg += nextLine;
      await sendWhatsApp(msg);
      await patchTask(task.id, { reminder_before_sent: true });
      await setState("last_reminder_task", task.id); sent++;
    }

    // تذكير الموعد
    if (diff <= 0 && diff >= -10 && !task.reminder_due_sent) {
      let msg = `🔔 *الآن │ ${task.title}*\n${catEmoji(task.category)} ${task.category || "شخصي"} │ ${pLabel[task.priority] || "متوسطة"}`;
      if (task.person) msg += ` │ 👤 ${task.person}`;
      msg += `\n\n⚡ رد سريع: *خلصت* │ *أجلها ساعة*`;
      await sendWhatsApp(msg);
      await patchTask(task.id, { reminder_due_sent: true });
      await setState("last_reminder_task", task.id); sent++;
    }

    // متابعة بعد الموعد بـ 30 دقيقة: هل تمت؟
    if (diff <= -30 && diff >= -45 && !task.follow_up_sent) {
      let msg = `❓ *متابعة* — مهمة موعدها عدّى:\n\n${pEmoji[task.priority] || "🟡"} *${task.title}*\n🕐 كان ${task.time} │ ${catEmoji(task.category)} ${task.category || "شخصي"}\n\nهل تمت؟\n⚡ رد: *خلصت* │ *أجلها ساعة* │ *أجلها بكرة*`;
      await sendWhatsApp(msg);
      await patchTask(task.id, { follow_up_sent: true });
      await setState("last_reminder_task", task.id); sent++;
    }
  }
  return sent;
}

// ---------- 2. MORNING (07:00) ----------
async function morningSummary() {
  const now = riyadhNow(), today = riyadhDateStr(now);
  if (now.getUTCHours() !== 7 || now.getUTCMinutes() > 5) return false;
  if (await getState(`morning_${today}`)) return false;

  const tasks = await supabaseRequest("GET", `tasks?date=eq.${today}&status=neq.cancelled&order=time.asc`);
  const yest = riyadhDateStr(new Date(now.getTime() - 86400000));
  const yT = await supabaseRequest("GET", `tasks?date=eq.${yest}&status=neq.cancelled&select=status`);
  const yDone = yT.filter(t => t.status === "done").length;
  const yLine = yT.length ? `\n💪 إنجاز أمس: ${yDone}/${yT.length}` : "";

  let msg;
  if (!tasks.length) {
    msg = `☀️ *صباح الخير!*\n${dayName(today)} ${today}\n\nلا مهام اليوم — يوم هادئ 🎉${yLine}`;
  } else {
    const active = tasks.filter(t => t.status !== "done");
    msg = `☀️ *صباح الخير!*\n${dayName(today)} ${today} — ${active.length} مهمة\n\n`;
    const groups = { high: "🔴 *عاجل*", medium: "🟡 *عادي*", low: "🟢 *مرنة*" };
    for (const p of ["high", "medium", "low"]) {
      const g = active.filter(t => (t.priority || "medium") === p);
      if (!g.length) continue;
      msg += groups[p] + "\n";
      g.forEach(t => { msg += ` ${t.time} ${t.title} ${catEmoji(t.category)} ${catName(t.category)}\n`; });
      msg += "\n";
    }
    msg = msg.trim() + yLine + "\n\nيوم موفق! 💪";
  }
  await sendWhatsApp(msg);
  await setState(`morning_${today}`, "1");
  return true;
}

// ---------- 3. OVERDUE (21:00) ----------
async function overdueCheck() {
  const now = riyadhNow(), today = riyadhDateStr(now);
  if (now.getUTCHours() !== 21 || now.getUTCMinutes() > 5) return false;
  if (await getState(`overdue_${today}`)) return false;

  const nowStr = String(now.getUTCHours()).padStart(2, "0") + ":" + String(now.getUTCMinutes()).padStart(2, "0");
  const missed = await supabaseRequest("GET", `tasks?date=eq.${today}&status=eq.new&order=time.asc`);
  const pending = missed.filter(t => t.time && t.time < nowStr);
  if (pending.length) {
    let msg = `🌙 *مراجعة آخر اليوم*\n\n⏳ ${pending.length} مهمة لم تُنجز:\n\n`;
    pending.forEach(t => { msg += `${pEmoji[t.priority] || "🟡"} ${t.title} (${t.time}) ${catEmoji(t.category)}\n`; });
    msg += `\n💬 "أجّل [المهمة] لبكرة" أو "خلصت [المهمة]"`;
    await sendWhatsApp(msg);
  }
  await setState(`overdue_${today}`, "1");
  return true;
}

// ---------- 4. HEALTH REPORT ----------
async function buildHealthReport() {
  const now = riyadhNow(), today = riyadhDateStr(now);
  let supa = "✅ تعمل", weekStats = "";
  try {
    const ago = riyadhDateStr(new Date(now.getTime() - 6 * 86400000));
    const tasks = await supabaseRequest("GET", `tasks?date=gte.${ago}&date=lte.${today}&status=neq.cancelled&select=status,category`);
    const done = tasks.filter(t => t.status === "done").length;
    const overdue = await supabaseRequest("GET", `tasks?date=lt.${today}&status=eq.new&select=id`);
    const byCat = {}; tasks.forEach(t => { const c = t.category || "شخصي"; byCat[c] = (byCat[c] || 0) + 1; });
    const top = Object.entries(byCat).sort((a, b) => b[1] - a[1])[0];
    weekStats = `\n📊 *الأسبوع:* ${tasks.length} مهمة │ ✅ ${done} │ ⏳ ${overdue.length} متأخرة`;
    if (top) weekStats += `\n🏆 الأنشط: ${catEmoji(top[0])} ${top[0]}`;
  } catch (e) { supa = "❌ خطأ: " + e.message.slice(0, 50); }

  const [bal, oa, an] = await Promise.all([getTwilioBalance(), checkOpenAI(), checkAnthropic()]);
  return `🩺 *تقرير صحة VoiceTask*\n${dayName(today)} ${today}\n\n*الخدمات:*\n🗄 قاعدة البيانات: ${supa}\n🎤 OpenAI: ${oa}\n🧠 Claude: ${an}\n📱 رصيد Twilio: ${bal}\n${weekStats}\n\n⚠️ *تذكيرات وقائية:*\n• جدد join تويليو (كل 72 ساعة): *join express-read*\n• افحص أرصدة OpenAI/Anthropic من لوحاتهم\n\n💚 النظام تحت المراقبة الذاتية`;
}
async function weeklyReport() {
  const now = riyadhNow(), today = riyadhDateStr(now);
  if (now.getUTCDay() !== 5 || now.getUTCHours() !== 9 || now.getUTCMinutes() > 5) return false;
  if (await getState(`weekly_${today}`)) return false;
  await sendWhatsApp(await buildHealthReport());
  await setState(`weekly_${today}`, "1");
  return true;
}

// ---------- MAIN ----------
module.exports = async (req, res) => {
  try {
    if (req.query && req.query.health) {
      await sendWhatsApp(await buildHealthReport());
      return res.status(200).json({ ok: true, action: "health report sent" });
    }
    const r = { reminders: 0, morning: false, overdue: false, weekly: false };
    r.reminders = await processReminders();
    r.morning = await morningSummary();
    r.overdue = await overdueCheck();
    r.weekly = await weeklyReport();
    return res.status(200).json({ ok: true, riyadhTime: riyadhNow().toISOString(), ...r });
  } catch (error) {
    console.error("❌ Reminders error:", error.message);
    return res.status(200).json({ ok: false, error: error.message });
  }
};

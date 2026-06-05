// ============================================================
// VoiceTask AI - Vercel Webhook Handler
// Version: 2.0.0
// ============================================================
// Environment Variables Required:
// ANTHROPIC_API_KEY    = Claude API Key
// TWILIO_ACCOUNT_SID   = Twilio Account SID
// TWILIO_AUTH_TOKEN    = Twilio Auth Token
// TWILIO_WHATSAPP_FROM = whatsapp:+14155238886
// SUPABASE_URL         = https://xxxx.supabase.co
// SUPABASE_KEY         = Supabase Secret Key
// YOUR_WHATSAPP        = whatsapp:+966XXXXXXXXX
// OPENAI_API_KEY       = OpenAI API Key (for Whisper)
// ============================================================

"use strict";
const https = require("https");

async function sendWhatsApp(to, message) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken  = process.env.TWILIO_AUTH_TOKEN;
  const from       = process.env.TWILIO_WHATSAPP_FROM;
  const body = new URLSearchParams({ To: to, From: from, Body: message }).toString();
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: "api.twilio.com",
        path: `/2010-04-01/Accounts/${accountSid}/Messages.json`,
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: "Basic " + Buffer.from(`${accountSid}:${authToken}`).toString("base64"),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => { try { resolve(JSON.parse(data)); } catch (e) { resolve({}); } });
      }
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

async function transcribeAudio(mediaUrl) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken  = process.env.TWILIO_AUTH_TOKEN;

  const audioBuffer = await new Promise((resolve, reject) => {
    const parsedUrl = new URL(mediaUrl);
    const req = https.request(
      {
        hostname: parsedUrl.hostname,
        path: parsedUrl.pathname + parsedUrl.search,
        method: "GET",
        headers: {
          Authorization: "Basic " + Buffer.from(`${accountSid}:${authToken}`).toString("base64"),
        },
      },
      (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          const redirectUrl = new URL(res.headers.location);
          const redirectReq = https.request(
            { hostname: redirectUrl.hostname, path: redirectUrl.pathname + redirectUrl.search, method: "GET" },
            (r) => {
              const chunks = [];
              r.on("data", (c) => chunks.push(c));
              r.on("end", () => resolve(Buffer.concat(chunks)));
            }
          );
          redirectReq.on("error", reject);
          redirectReq.end();
        } else {
          const chunks = [];
          res.on("data", (c) => chunks.push(c));
          res.on("end", () => resolve(Buffer.concat(chunks)));
        }
      }
    );
    req.on("error", reject);
    req.end();
  });

  const boundary = "VoiceTask" + Date.now();
  const CRLF = "\r\n";
  const formBody = Buffer.concat([
    Buffer.from(
      `--${boundary}${CRLF}` +
      `Content-Disposition: form-data; name="file"; filename="audio.ogg"${CRLF}` +
      `Content-Type: audio/ogg${CRLF}${CRLF}`
    ),
    audioBuffer,
    Buffer.from(
      `${CRLF}--${boundary}${CRLF}` +
      `Content-Disposition: form-data; name="model"${CRLF}${CRLF}` +
      `whisper-1${CRLF}` +
      `--${boundary}${CRLF}` +
      `Content-Disposition: form-data; name="language"${CRLF}${CRLF}` +
      `ar${CRLF}` +
      `--${boundary}--${CRLF}`
    ),
  ]);

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: "api.openai.com",
        path: "/v1/audio/transcriptions",
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": `multipart/form-data; boundary=${boundary}`,
          "Content-Length": formBody.length,
        },
      },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          try { resolve(JSON.parse(data).text || ""); }
          catch (e) { reject(new Error("Whisper parse error: " + data)); }
        });
      }
    );
    req.on("error", reject);
    req.write(formBody);
    req.end();
  });
}

async function analyzeWithClaude(text) {
  const now      = new Date();
  const today    = now.toISOString().split("T")[0];
  const tomorrow = new Date(now.getTime() + 86400000).toISOString().split("T")[0];
  const dayAfter = new Date(now.getTime() + 172800000).toISOString().split("T")[0];
  const dayNames = ["الأحد","الاثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت"];
  const dayDates = {};
  dayNames.forEach((name, i) => {
    const diff = (i - now.getDay() + 7) % 7 || 7;
    const d = new Date(now);
    d.setDate(d.getDate() + diff);
    dayDates[name] = d.toISOString().split("T")[0];
  });

  const systemPrompt = `أنت مساعد ذكي متخصص في استخراج المهام من النصوص العربية والإنجليزية.
التواريخ: اليوم=${today}, غداً=${tomorrow}, بعد غد=${dayAfter}
أيام الأسبوع: ${JSON.stringify(dayDates)}
قواعد: إذا لم يُذكر وقت استخدم "09:00"، إذا لم يُذكر تاريخ استخدم اليوم.
أجب فقط بـ JSON صالح:
{"tasks":[{"title":"","date":"YYYY-MM-DD","time":"HH:MM","priority":"high|medium|low","person":null,"project":null,"notes":null}]}`;

  return new Promise((resolve, reject) => {
    const bodyData = JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: "user", content: `استخرج المهام من:\n"${text}"` }],
    });
    const req = https.request(
      {
        hostname: "api.anthropic.com",
        path: "/v1/messages",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
      },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          try {
            const response = JSON.parse(data);
            const rawText = response.content?.map((b) => b.text || "").join("") || "{}";
            resolve(JSON.parse(rawText.replace(/```json|```/g, "").trim()));
          } catch (e) { reject(new Error("Claude parse error: " + e.message)); }
        });
      }
    );
    req.on("error", reject);
    req.write(bodyData);
    req.end();
  });
}

async function saveTaskToSupabase(task) {
  const bodyData = JSON.stringify({
    title: task.title, date: task.date, time: task.time,
    priority: task.priority || "medium", status: "new",
    person: task.person || null, project: task.project || null,
    description: task.notes || null,
  });
  const url = new URL(`${process.env.SUPABASE_URL}/rest/v1/tasks`);
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: url.hostname, path: url.pathname, method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: process.env.SUPABASE_KEY,
          Authorization: `Bearer ${process.env.SUPABASE_KEY}`,
          Prefer: "return=representation",
        },
      },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => { try { resolve(JSON.parse(data)); } catch (e) { resolve([]); } });
      }
    );
    req.on("error", reject);
    req.write(bodyData);
    req.end();
  });
}

async function getTodayTasks() {
  const today = new Date().toISOString().split("T")[0];
  const url = new URL(`${process.env.SUPABASE_URL}/rest/v1/tasks?date=eq.${today}&order=time.asc`);
  return new Promise((resolve) => {
    const req = https.request(
      {
        hostname: url.hostname, path: url.pathname + url.search, method: "GET",
        headers: { apikey: process.env.SUPABASE_KEY, Authorization: `Bearer ${process.env.SUPABASE_KEY}` },
      },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => { try { resolve(JSON.parse(data)); } catch (e) { resolve([]); } });
      }
    );
    req.on("error", () => resolve([]));
    req.end();
  });
}

async function getWeekTasks() {
  const today = new Date().toISOString().split("T")[0];
  const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];
  const url = new URL(`${process.env.SUPABASE_URL}/rest/v1/tasks?date=gte.${today}&date=lte.${nextWeek}&order=date.asc,time.asc`);
  return new Promise((resolve) => {
    const req = https.request(
      {
        hostname: url.hostname, path: url.pathname + url.search, method: "GET",
        headers: { apikey: process.env.SUPABASE_KEY, Authorization: `Bearer ${process.env.SUPABASE_KEY}` },
      },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => { try { resolve(JSON.parse(data)); } catch (e) { resolve([]); } });
      }
    );
    req.on("error", () => resolve([]));
    req.end();
  });
}

function formatTasksMessage(tasks) {
  if (!tasks || tasks.length === 0)
    return "✅ تم استلام رسالتك ولكن لم أجد مهام واضحة.\n\n💡 جرب:\n\"فكرني أكلم أحمد بكرة الساعة 10\"";
  const priorityEmoji = { high: "🔴", medium: "🟡", low: "🟢" };
  const priorityLabel = { high: "عالية", medium: "متوسطة", low: "منخفضة" };
  let msg = `✅ *تم استخراج ${tasks.length} مهمة بنجاح!*\n\n`;
  tasks.forEach((task, i) => {
    const emoji = priorityEmoji[task.priority] || "🟡";
    msg += `*${i + 1}️⃣ ${task.title}*\n📅 ${task.date}  ⏰ ${task.time}\n`;
    msg += `${emoji} أولوية ${priorityLabel[task.priority] || "متوسطة"}`;
    if (task.person)  msg += `  |  👤 ${task.person}`;
    if (task.project) msg += `  |  📁 ${task.project}`;
    if (task.notes)   msg += `\n📝 ${task.notes}`;
    msg += "\n\n";
  });
  msg += "─────────────────\n💡 *الأوامر:*\n• *جدولي اليوم*\n• *جدولي الأسبوع*\n• *مساعدة*";
  return msg;
}

function formatDailySummary(tasks) {
  if (!tasks || tasks.length === 0) return "📋 *ملخص يومك*\n\nلا توجد مهام اليوم 🎉";
  const done = tasks.filter((t) => t.status === "done").length;
  const inprogress = tasks.filter((t) => t.status === "inprogress").length;
  const late = tasks.filter((t) => t.status === "late").length;
  const newTasks = tasks.filter((t) => t.status === "new").length;
  let msg = `📋 *ملخص يومك* — ${tasks.length} مهمة\n\n`;
  msg += `✅ ${done}  |  ⏳ ${inprogress}  |  🆕 ${newTasks}`;
  if (late > 0) msg += `  |  🔴 ${late}`;
  msg += "\n\n*المهام:*\n";
  tasks.forEach((t) => {
    const s = t.status === "done" ? "✅" : t.status === "inprogress" ? "⏳" : t.status === "late" ? "🔴" : "📌";
    msg += `${s} ${t.title} — ${t.time}\n`;
  });
  return msg;
}

function formatWeeklySummary(tasks) {
  if (!tasks || tasks.length === 0) return "📅 *ملخص الأسبوع*\n\nلا توجد مهام 🎉";
  const grouped = {};
  tasks.forEach((t) => { if (!grouped[t.date]) grouped[t.date] = []; grouped[t.date].push(t); });
  let msg = `📅 *ملخص الأسبوع* — ${tasks.length} مهمة\n\n`;
  for (const [date, dayTasks] of Object.entries(grouped)) {
    const dayName = new Date(date + "T12:00:00").toLocaleDateString("ar-SA", { weekday: "long" });
    msg += `*${dayName} ${date}*\n`;
    dayTasks.forEach((t) => { msg += `  • ${t.title} — ${t.time}\n`; });
    msg += "\n";
  }
  return msg;
}

async function handleIncomingMessage(from, body) {
  const text = (body || "").trim();
  const lower = text.toLowerCase();
  if (lower.includes("جدولي اليوم") || lower.includes("مهام اليوم") || lower === "اليوم")
    return formatDailySummary(await getTodayTasks());
  if (lower.includes("جدولي الأسبوع") || lower.includes("مهام الأسبوع") || lower === "الأسبوع")
    return formatWeeklySummary(await getWeekTasks());
  if (lower === "مساعدة" || lower === "help" || lower === "؟")
    return "🤖 *VoiceTask AI*\n\n📝 أرسل مهامك نصاً أو صوتاً!\n\n*الأوامر:*\n• *جدولي اليوم*\n• *جدولي الأسبوع*\n• *مساعدة*";
  if (text.length > 3) {
    const result = await analyzeWithClaude(text);
    const tasks = result.tasks || [];
    for (const task of tasks) {
      try { await saveTaskToSupabase(task); } catch (e) { console.error("Supabase:", e.message); }
    }
    return formatTasksMessage(tasks);
  }
  return "أهلاً! أرسل لي مهامك 😊\nاكتب *مساعدة* للأوامر.";
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method === "GET") return res.status(200).json({ status: "✅ VoiceTask AI يعمل!", version: "2.0.0", time: new Date().toISOString() });
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const TwiML = `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`;

  try {
    const body     = req.body || {};
    const from     = body.From      || "";
    const msgBody  = body.Body      || "";
    const mediaUrl = body.MediaUrl0 || null;
    const numMedia = parseInt(body.NumMedia || "0", 10);

    const yourNumber = process.env.YOUR_WHATSAPP;
    if (yourNumber && from !== yourNumber) return res.status(200).send(TwiML);

    let replyMessage = "";

    if (numMedia > 0 && mediaUrl) {
      try {
        await sendWhatsApp(from, "🎤 تم استلام رسالتك الصوتية!\n⏳ جاري تحويل الصوت إلى نص...");
        const transcribedText = await transcribeAudio(mediaUrl);
        if (transcribedText && transcribedText.length > 3) {
          await sendWhatsApp(from, `📝 *تم تحويل الصوت:*\n"${transcribedText}"`);
          replyMessage = await handleIncomingMessage(from, transcribedText);
        } else {
          replyMessage = "⚠️ لم أتمكن من فهم الرسالة الصوتية.\nحاول مرة أخرى أو أرسل نصاً.";
        }
      } catch (e) {
        console.error("Whisper error:", e.message);
        replyMessage = "⚠️ حدث خطأ في تحويل الصوت.\nأرسل رسالتك نصاً.";
      }
    } else {
      replyMessage = await handleIncomingMessage(from, msgBody);
    }

    await sendWhatsApp(from, replyMessage);
    return res.status(200).send(TwiML);

  } catch (error) {
    console.error("❌ Error:", error.message);
    try {
      const from = req.body?.From || process.env.YOUR_WHATSAPP;
      if (from) await sendWhatsApp(from, "⚠️ حدث خطأ مؤقت. حاول مرة أخرى.");
    } catch (_) {}
    return res.status(200).send(TwiML);
  }
};

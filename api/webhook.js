// ============================================================
// VoiceTask AI - Vercel Webhook Handler
// Version: 2.1.0
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

// ============================================================
// 1. TWILIO - Send WhatsApp Message
// ============================================================
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

// ============================================================
// 2. OPENAI WHISPER - Transcribe Voice Message
// ============================================================
async function transcribeAudio(mediaUrl) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken  = process.env.TWILIO_AUTH_TOKEN;

  // Step 1: Download audio from Twilio (with redirect support)
  const audioBuffer = await new Promise((resolve, reject) => {
    function fetchUrl(url, redirectCount) {
      if (redirectCount > 5) return reject(new Error("Too many redirects"));
      const parsedUrl = new URL(url);
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
          if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 303) {
            return fetchUrl(res.headers.location, redirectCount + 1);
          }
          const chunks = [];
          res.on("data", (c) => chunks.push(c));
          res.on("end", () => resolve(Buffer.concat(chunks)));
        }
      );
      req.on("error", reject);
      req.end();
    }
    fetchUrl(mediaUrl, 0);
  });

  // Step 2: Send to Whisper API
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
          try {
            const parsed = JSON.parse(data);
            if (parsed.error) reject(new Error(parsed.error.message));
            else resolve(parsed.text || "");
          } catch (e) { reject(new Error("Whisper parse error: " + data)); }
        });
      }
    );
    req.on("error", reject);
    req.write(formBody);
    req.end();
  });
}

// ============================================================
// 3. ANTHROPIC CLAUDE - Extract Tasks from Text
// ============================================================
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

التواريخ المرجعية:
- اليوم: ${today}
- غداً / بكرة: ${tomorrow}
- بعد غد: ${dayAfter}
- أيام الأسبوع: ${JSON.stringify(dayDates)}

قواعد مهمة:
1. إذا لم يُذكر وقت استخدم "09:00"
2. إذا لم يُذكر تاريخ استخدم اليوم
3. الأولوية: high=عاجل/مهم، medium=عادي، low=اختياري
4. استخرج اسم الشخص إن وُجد
5. استخرج اسم المشروع إن وُجد
6. الأرقام العربية (١٢٣) تساوي الأرقام الإنجليزية (123)

أجب فقط بـ JSON صالح بدون أي نص إضافي:
{
  "tasks": [
    {
      "title": "عنوان المهمة",
      "date": "YYYY-MM-DD",
      "time": "HH:MM",
      "priority": "high|medium|low",
      "person": "اسم أو null",
      "project": "مشروع أو null",
      "notes": "ملاحظات أو null"
    }
  ]
}`;

  return new Promise((resolve, reject) => {
    const bodyData = JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: "user", content: `استخرج المهام من النص التالي:\n"${text}"` }],
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
            if (response.error) return reject(new Error("Claude error: " + response.error.message));
            const rawText = response.content?.map((b) => b.text || "").join("") || "{}";
            const clean = rawText.replace(/```json|```/g, "").trim();
            resolve(JSON.parse(clean));
          } catch (e) {
            reject(new Error("Claude parse error: " + e.message));
          }
        });
      }
    );
    req.on("error", reject);
    req.write(bodyData);
    req.end();
  });
}

// ============================================================
// 4. SUPABASE - Save Task
// ============================================================
async function saveTaskToSupabase(task) {
  const bodyData = JSON.stringify({
    title:       task.title,
    date:        task.date,
    time:        task.time,
    priority:    task.priority || "medium",
    status:      "new",
    person:      task.person  || null,
    project:     task.project || null,
    description: task.notes   || null,
  });

  const url = new URL(`${process.env.SUPABASE_URL}/rest/v1/tasks`);

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: url.hostname,
        path:     url.pathname,
        method:   "POST",
        headers: {
          "Content-Type": "application/json",
          apikey:         process.env.SUPABASE_KEY,
          Authorization:  `Bearer ${process.env.SUPABASE_KEY}`,
          Prefer:         "return=representation",
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

// ============================================================
// 5. SUPABASE - Get Today Tasks
// ============================================================
async function getTodayTasks() {
  const today = new Date().toISOString().split("T")[0];
  const url = new URL(`${process.env.SUPABASE_URL}/rest/v1/tasks?date=eq.${today}&order=time.asc`);

  return new Promise((resolve) => {
    const req = https.request(
      {
        hostname: url.hostname,
        path:     url.pathname + url.search,
        method:   "GET",
        headers: {
          apikey:        process.env.SUPABASE_KEY,
          Authorization: `Bearer ${process.env.SUPABASE_KEY}`,
        },
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

// ============================================================
// 6. SUPABASE - Get Week Tasks
// ============================================================
async function getWeekTasks() {
  const today    = new Date().toISOString().split("T")[0];
  const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];
  const url = new URL(
    `${process.env.SUPABASE_URL}/rest/v1/tasks?date=gte.${today}&date=lte.${nextWeek}&order=date.asc,time.asc`
  );

  return new Promise((resolve) => {
    const req = https.request(
      {
        hostname: url.hostname,
        path:     url.pathname + url.search,
        method:   "GET",
        headers: {
          apikey:        process.env.SUPABASE_KEY,
          Authorization: `Bearer ${process.env.SUPABASE_KEY}`,
        },
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

// ============================================================
// 7. FORMAT - Tasks Message
// ============================================================
function formatTasksMessage(tasks) {
  if (!tasks || tasks.length === 0) {
    return (
      "✅ تم استلام رسالتك ولكن لم أجد مهام واضحة.\n\n" +
      "💡 جرب مثلاً:\n" +
      "\"فكرني أكلم أحمد بكرة الساعة 10\"\n" +
      "\"اجتماع مع الفريق الخميس الساعة 2\""
    );
  }

  const priorityEmoji = { high: "🔴", medium: "🟡", low: "🟢" };
  const priorityLabel = { high: "عالية", medium: "متوسطة", low: "منخفضة" };

  let msg = `✅ *تم استخراج ${tasks.length} مهمة بنجاح!*\n\n`;

  tasks.forEach((task, i) => {
    const emoji = priorityEmoji[task.priority] || "🟡";
    msg += `*${i + 1}️⃣ ${task.title}*\n`;
    msg += `📅 ${task.date}  ⏰ ${task.time}\n`;
    msg += `${emoji} أولوية ${priorityLabel[task.priority] || "متوسطة"}`;
    if (task.person)  msg += `  |  👤 ${task.person}`;
    if (task.project) msg += `  |  📁 ${task.project}`;
    if (task.notes)   msg += `\n📝 ${task.notes}`;
    msg += "\n\n";
  });

  msg += "─────────────────\n";
  msg += "💡 *الأوامر المتاحة:*\n";
  msg += "• *جدولي اليوم* - عرض مهام اليوم\n";
  msg += "• *جدولي الأسبوع* - عرض مهام الأسبوع\n";
  msg += "• *مساعدة* - قائمة الأوامر";

  return msg;
}

// ============================================================
// 8. FORMAT - Daily Summary
// ============================================================
function formatDailySummary(tasks) {
  if (!tasks || tasks.length === 0) {
    return "📋 *ملخص يومك*\n\nلا توجد مهام اليوم 🎉\nاستمتع بيومك!";
  }

  const done       = tasks.filter((t) => t.status === "done").length;
  const inprogress = tasks.filter((t) => t.status === "inprogress").length;
  const late       = tasks.filter((t) => t.status === "late").length;
  const newTasks   = tasks.filter((t) => t.status === "new").length;

  let msg = `📋 *ملخص يومك* — ${tasks.length} مهمة\n\n`;
  msg += `✅ مكتملة: ${done}  |  ⏳ قيد التنفيذ: ${inprogress}  |  🆕 جديدة: ${newTasks}`;
  if (late > 0) msg += `  |  🔴 متأخرة: ${late}`;
  msg += "\n\n*المهام:*\n";

  tasks.forEach((task) => {
    const s =
      task.status === "done"       ? "✅" :
      task.status === "inprogress" ? "⏳" :
      task.status === "late"       ? "🔴" : "📌";
    msg += `${s} ${task.title} — ${task.time}\n`;
  });

  return msg;
}

// ============================================================
// 9. FORMAT - Weekly Summary
// ============================================================
function formatWeeklySummary(tasks) {
  if (!tasks || tasks.length === 0) {
    return "📅 *ملخص الأسبوع*\n\nلا توجد مهام هذا الأسبوع 🎉";
  }

  const grouped = {};
  tasks.forEach((task) => {
    if (!grouped[task.date]) grouped[task.date] = [];
    grouped[task.date].push(task);
  });

  let msg = `📅 *ملخص الأسبوع* — ${tasks.length} مهمة\n\n`;

  for (const [date, dayTasks] of Object.entries(grouped)) {
    const dayName = new Date(date + "T12:00:00").toLocaleDateString("ar-SA", { weekday: "long" });
    msg += `*${dayName} ${date}*\n`;
    dayTasks.forEach((task) => { msg += `  • ${task.title} — ${task.time}\n`; });
    msg += "\n";
  }

  return msg;
}

// ============================================================
// 10. ROUTER - Handle Incoming Message
// ============================================================
async function handleIncomingMessage(from, body) {
  const text  = (body || "").trim();
  const lower = text.toLowerCase();

  if (lower.includes("جدولي اليوم") || lower.includes("مهام اليوم") || lower === "اليوم") {
    return formatDailySummary(await getTodayTasks());
  }

  if (lower.includes("جدولي الأسبوع") || lower.includes("مهام الأسبوع") || lower === "الأسبوع") {
    return formatWeeklySummary(await getWeekTasks());
  }

  if (lower === "مساعدة" || lower === "help" || lower === "؟") {
    return (
      "🤖 *VoiceTask AI — المساعد الذكي*\n\n" +
      "*كيف تستخدمني:*\n" +
      "📝 أرسل مهامك نصاً أو صوتاً، مثل:\n" +
      "\"فكرني أكلم أحمد بكرة الساعة 10\"\n\n" +
      "*الأوامر:*\n" +
      "• *جدولي اليوم* — مهام اليوم\n" +
      "• *جدولي الأسبوع* — مهام الأسبوع\n" +
      "• *مساعدة* — هذه القائمة"
    );
  }

  if (text.length > 3) {
    const result = await analyzeWithClaude(text);
    const tasks  = result.tasks || [];
    for (const task of tasks) {
      try { await saveTaskToSupabase(task); }
      catch (e) { console.error("Supabase error:", e.message); }
    }
    return formatTasksMessage(tasks);
  }

  return "أهلاً! أرسل لي مهامك وسأنظمها لك 😊\nاكتب *مساعدة* لمعرفة الأوامر المتاحة.";
}

// ============================================================
// 11. MAIN - Vercel Serverless Handler
// ============================================================
module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");

  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method === "GET") {
    return res.status(200).json({
      status:  "✅ VoiceTask AI يعمل بنجاح!",
      version: "2.1.0",
      time:    new Date().toISOString(),
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const TwiML = `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`;

  try {
    const body     = req.body || {};
    const from     = body.From      || "";
    const msgBody  = body.Body      || "";
    const mediaUrl = body.MediaUrl0 || null;
    const numMedia = parseInt(body.NumMedia || "0", 10);

    console.log(`📨 From: ${from} | Media: ${numMedia} | Body: ${msgBody}`);

    // Authorization check
    const yourNumber = process.env.YOUR_WHATSAPP;
    if (yourNumber && from !== yourNumber) {
      console.warn(`⛔ Unauthorized: ${from}`);
      return res.status(200).send(TwiML);
    }

    let replyMessage = "";

    if (numMedia > 0 && mediaUrl) {
      try {
        await sendWhatsApp(from, "🎤 تم استلام رسالتك الصوتية!\n⏳ جاري تحويل الصوت إلى نص...");
        const transcribedText = await transcribeAudio(mediaUrl);
        console.log(`🎙️ Transcribed: ${transcribedText}`);

        if (transcribedText && transcribedText.length > 3) {
          await sendWhatsApp(from, `📝 *تم تحويل الصوت:*\n"${transcribedText}"`);
          replyMessage = await handleIncomingMessage(from, transcribedText);
        } else {
          replyMessage = "⚠️ لم أتمكن من فهم الرسالة الصوتية.\nحاول مرة أخرى أو أرسل رسالة نصية.";
        }
      } catch (e) {
        console.error("Whisper error:", e.message);
        replyMessage = "⚠️ حدث خطأ في تحويل الصوت.\nأرسل رسالتك نصاً وسأنجز المهمة فوراً.";
      }
    } else {
      replyMessage = await handleIncomingMessage(from, msgBody);
    }

    await sendWhatsApp(from, replyMessage);
    return res.status(200).send(TwiML);

  } catch (error) {
    console.error("❌ Handler error:", error.message);
    try {
      const from = req.body?.From || process.env.YOUR_WHATSAPP;
      if (from) await sendWhatsApp(from, "⚠️ حدث خطأ مؤقت. حاول مرة أخرى بعد قليل.");
    } catch (_) {}
    return res.status(200).send(TwiML);
  }
};

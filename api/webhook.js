// ============================================================
// VoiceTask AI - Vercel Webhook Handler
// Version: 3.0.0 (add/update/cancel/done + voice + Riyadh time)
// ============================================================

"use strict";
const https = require("https");

// ============================================================
// 0. RIYADH TIME HELPERS (UTC+3)
// ============================================================
function riyadhNow() {
  return new Date(Date.now() + 3 * 3600 * 1000);
}
function riyadhDateStr(d) {
  return d.toISOString().split("T")[0];
}

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
// 2. OPENAI WHISPER - Transcribe Voice (.oga fix)
// ============================================================
async function transcribeAudio(mediaUrl) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken  = process.env.TWILIO_AUTH_TOKEN;

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

  const boundary = "VoiceTask" + Date.now();
  const CRLF = "\r\n";
  const formBody = Buffer.concat([
    Buffer.from(
      `--${boundary}${CRLF}` +
      `Content-Disposition: form-data; name="file"; filename="audio.oga"${CRLF}` +
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
      // تشخيص: التحقق من نوع الملف المُحمَّل
  const fileHead = audioBuffer.slice(0, 4).toString("hex");
  console.log(`Audio downloaded: ${audioBuffer.length} bytes, head: ${fileHead}`);
  if (audioBuffer.length < 1000) {
    console.error("Downloaded content too small, likely an error page:", audioBuffer.toString("utf8").slice(0, 300));
    throw new Error("Media download failed - got " + audioBuffer.length + " bytes");
  }

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
// 3. SUPABASE HELPERS
// ============================================================
function supabaseRequest(method, pathAndQuery, bodyObj, prefer) {
  const url = new URL(`${process.env.SUPABASE_URL}/rest/v1/${pathAndQuery}`);
  const bodyData = bodyObj ? JSON.stringify(bodyObj) : null;

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: url.hostname,
        path:     url.pathname + url.search,
        method,
        headers: {
          "Content-Type": "application/json",
          apikey:         process.env.SUPABASE_KEY,
          Authorization:  `Bearer ${process.env.SUPABASE_KEY}`,
          Prefer:         prefer || "return=representation",
        },
      },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          if (res.statusCode >= 400) {
            console.error(`Supabase ${method} failed:`, res.statusCode, data);
            return reject(new Error(`Supabase error: ${data}`));
          }
          try { resolve(data ? JSON.parse(data) : []); } catch (e) { resolve([]); }
        });
      }
    );
    req.on("error", reject);
    if (bodyData) req.write(bodyData);
    req.end();
  });
}

async function saveTask(task) {
  return supabaseRequest("POST", "tasks", {
    title:       task.title,
    date:        task.date,
    time:        task.time,
    priority:    task.priority || "medium",
    status:      "new",
    person:      task.person  || null,
    project:     task.project || null,
    description: task.notes   || null,
  });
}

async function getActiveTasks() {
  const today = riyadhDateStr(riyadhNow());
  return supabaseRequest(
    "GET",
    `tasks?date=gte.${today}&status=not.in.(done,cancelled)&order=date.asc,time.asc&select=id,title,date,time,person,project,status`
  );
}

async function updateTask(id, fields) {
  // إعادة تصفير أعلام التذكير عند تغيير الموعد
  if (fields.date || fields.time) {
    fields.reminder_before_sent = false;
    fields.reminder_due_sent = false;
  }
  return supabaseRequest("PATCH", `tasks?id=eq.${id}`, fields, "return=minimal");
}

async function getTodayTasks() {
  const today = riyadhDateStr(riyadhNow());
  return supabaseRequest("GET", `tasks?date=eq.${today}&status=neq.cancelled&order=time.asc`);
}

async function getWeekTasks() {
  const now      = riyadhNow();
  const today    = riyadhDateStr(now);
  const nextWeek = riyadhDateStr(new Date(now.getTime() + 7 * 86400000));
  return supabaseRequest("GET", `tasks?date=gte.${today}&date=lte.${nextWeek}&status=neq.cancelled&order=date.asc,time.asc`);
}

// ============================================================
// 4. CLAUDE - Intent Analysis (add/update/cancel/done/query)
// ============================================================
async function analyzeWithClaude(text, activeTasks) {
  const now      = riyadhNow();
  const today    = riyadhDateStr(now);
  const tomorrow = riyadhDateStr(new Date(now.getTime() + 86400000));
  const dayAfter = riyadhDateStr(new Date(now.getTime() + 172800000));

  const dayNames = ["الأحد","الاثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت"];
  const dayDates = {};
  dayNames.forEach((name, i) => {
    const diff = (i - now.getUTCDay() + 7) % 7 || 7;
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() + diff);
    dayDates[name] = riyadhDateStr(d);
  });

  const currentTime = String(now.getUTCHours()).padStart(2, "0") + ":" + String(now.getUTCMinutes()).padStart(2, "0");

  const tasksContext = activeTasks.length > 0
    ? activeTasks.map((t) => `- id=${t.id} | "${t.title}" | ${t.date} ${t.time}${t.person ? " | " + t.person : ""}`).join("\n")
    : "(لا توجد مهام نشطة)";

  const systemPrompt = `أنت مساعد ذكي لإدارة المهام بالعربية والإنجليزية. حلل رسالة المستخدم وحدد نيته.

التواريخ المرجعية (بتوقيت الرياض):
- اليوم: ${today} والساعة الآن: ${currentTime}
- غداً / بكرة: ${tomorrow}
- بعد غد: ${dayAfter}
- أيام الأسبوع: ${JSON.stringify(dayDates)}

المهام النشطة الحالية للمستخدم:
${tasksContext}

النوايا الممكنة:
1. "add" — إضافة مهمة/مهام جديدة (فكرني، اجتماع، موعد...)
2. "update" — تعديل مهمة موجودة (أجّل، غيّر الموعد، عدّل، انقل لـ...)
3. "cancel" — إلغاء مهمة (ألغي، احذف، شيل...)
4. "done" — إنجاز مهمة (خلصت، تم، أنجزت...)
5. "chat" — أي شيء آخر

قواعد:
- لعمليات update/cancel/done: طابق المهمة المقصودة من القائمة أعلاه وأرجع task_id الخاص بها
- إذا كانت المطابقة غامضة (أكثر من مهمة محتملة) أرجع intent="clarify" مع قائمة candidates بالـ ids
- إذا لم تجد المهمة المذكورة أرجع intent="not_found" مع reason قصير
- "بعد X دقيقة/ساعة" احسبها من ${currentTime} بتاريخ اليوم
- إذا لم يُذكر وقت لمهمة جديدة استخدم "09:00"، وإذا لم يُذكر تاريخ استخدم اليوم
- الأولوية: high=عاجل، medium=عادي، low=اختياري

أجب فقط بـ JSON صالح بدون أي نص إضافي:
{
  "intent": "add|update|cancel|done|clarify|not_found|chat",
  "tasks": [ { "title": "...", "date": "YYYY-MM-DD", "time": "HH:MM", "priority": "high|medium|low", "person": null, "project": null, "notes": null } ],
  "task_id": 123,
  "updates": { "date": "YYYY-MM-DD", "time": "HH:MM", "title": "..." },
  "candidates": [ {"id": 1, "title": "..."} ],
  "reason": "..."
}
ملاحظة: ضمّن فقط الحقول المناسبة للنية. في "updates" ضمّن فقط ما طلب المستخدم تغييره.`;

  return new Promise((resolve, reject) => {
    const bodyData = JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: "user", content: `رسالة المستخدم:\n"${text}"` }],
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
// 5. FORMATTERS
// ============================================================
const priorityEmoji = { high: "🔴", medium: "🟡", low: "🟢" };
const priorityLabel = { high: "عالية", medium: "متوسطة", low: "منخفضة" };

function formatTasksMessage(tasks) {
  if (!tasks || tasks.length === 0) {
    return (
      "✅ تم استلام رسالتك ولكن لم أجد مهام واضحة.\n\n" +
      "💡 جرب مثلاً:\n" +
      "\"فكرني أكلم أحمد بكرة الساعة 10\""
    );
  }

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
  msg += "─────────────────\n💡 اكتب *مساعدة* لكل الأوامر";
  return msg;
}

function formatDailySummary(tasks) {
  if (!tasks || tasks.length === 0) {
    return "📋 *ملخص يومك*\n\nلا توجد مهام اليوم 🎉";
  }
  const done = tasks.filter((t) => t.status === "done").length;
  let msg = `📋 *ملخص يومك* — ${tasks.length} مهمة (✅ ${done} مكتملة)\n\n`;
  tasks.forEach((task) => {
    const s = task.status === "done" ? "✅" : "📌";
    msg += `${s} ${task.title} — ${task.time}\n`;
  });
  return msg;
}

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
    dayTasks.forEach((task) => {
      const s = task.status === "done" ? "✅ " : "• ";
      msg += `  ${s}${task.title} — ${task.time}\n`;
    });
    msg += "\n";
  }
  return msg;
}

// ============================================================
// 6. ROUTER
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
      "📝 أرسل مهامك نصاً أو صوتاً 🎤:\n" +
      "\"فكرني أكلم أحمد بكرة الساعة 10\"\n\n" +
      "✏️ *عدّل:* \"أجّل اجتماع الأحد للساعة 7\"\n" +
      "🗑 *ألغي:* \"ألغي مهمة مراجعة العمولات\"\n" +
      "✅ *أنجز:* \"خلصت مكالمة خالد\"\n\n" +
      "⏰ سأذكرك قبل كل مهمة وعند موعدها\n\n" +
      "*التقارير:*\n" +
      "• *جدولي اليوم* / *جدولي الأسبوع*"
    );
  }

  if (text.length <= 3) {
    return "أهلاً! أرسل لي مهامك وسأنظمها لك 😊\nاكتب *مساعدة* لمعرفة الأوامر.";
  }

  // تحليل النية مع سياق المهام النشطة
  const activeTasks = await getActiveTasks();
  const result = await analyzeWithClaude(text, activeTasks);

  switch (result.intent) {

    case "add": {
      const tasks = result.tasks || [];
      let savedCount = 0;
      for (const task of tasks) {
        try { await saveTask(task); savedCount++; }
        catch (e) { console.error("Save error:", e.message); }
      }
      if (tasks.length > 0 && savedCount === 0) {
        return "⚠️ فهمت مهمتك لكن حدث خطأ أثناء حفظها. حاول مرة أخرى.";
      }
      return formatTasksMessage(tasks);
    }

    case "update": {
      if (!result.task_id || !result.updates) {
        return "⚠️ لم أحدد المهمة أو التعديل المطلوب. وضّح أكثر من فضلك.";
      }
      const target = activeTasks.find((t) => t.id === result.task_id);
      await updateTask(result.task_id, result.updates);
      const parts = [];
      if (result.updates.date)  parts.push(`📅 ${result.updates.date}`);
      if (result.updates.time)  parts.push(`⏰ ${result.updates.time}`);
      if (result.updates.title) parts.push(`✏️ ${result.updates.title}`);
      return `✏️ *تم تعديل المهمة:*\n*${target ? target.title : "المهمة"}*\n${parts.join("  ")}\n\n🔔 وسيُعاد ضبط تذكيراتها تلقائياً`;
    }

    case "cancel": {
      if (!result.task_id) {
        return "⚠️ لم أحدد المهمة المطلوب إلغاؤها. وضّح أكثر من فضلك.";
      }
      const target = activeTasks.find((t) => t.id === result.task_id);
      await updateTask(result.task_id, { status: "cancelled" });
      return `🗑 *تم إلغاء المهمة:*\n*${target ? target.title : "المهمة"}*${target ? `\n📅 ${target.date}  ⏰ ${target.time}` : ""}`;
    }

    case "done": {
      if (!result.task_id) {
        return "⚠️ لم أحدد المهمة المنجزة. وضّح أكثر من فضلك.";
      }
      const target = activeTasks.find((t) => t.id === result.task_id);
      await updateTask(result.task_id, { status: "done" });
      return `🎉 *أحسنت! تم إنجاز:*\n*${target ? target.title : "المهمة"}*`;
    }

    case "clarify": {
      const candidates = result.candidates || [];
      let msg = "🤔 وجدت أكثر من مهمة مطابقة، أيها تقصد؟\n\n";
      candidates.forEach((c, i) => {
        const t = activeTasks.find((x) => x.id === c.id);
        msg += `${i + 1}️⃣ ${t ? `${t.title} — ${t.date} ${t.time}` : c.title}\n`;
      });
      msg += "\nأعد إرسال طلبك مع تحديد المهمة بوضوح (مثلاً بالاسم والتاريخ).";
      return msg;
    }

    case "not_found":
      return `⚠️ لم أجد المهمة المقصودة في جدولك.\n${result.reason || ""}\n\nاكتب *جدولي الأسبوع* لرؤية مهامك الحالية.`;

    default:
      return "أهلاً! أرسل لي مهامك وسأنظمها لك 😊\nاكتب *مساعدة* لمعرفة الأوامر.";
  }
}

// ============================================================
// 7. MAIN - Vercel Serverless Handler
// ============================================================
module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");

  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method === "GET") {
    return res.status(200).json({
      status:  "✅ VoiceTask AI يعمل بنجاح!",
      version: "3.0.0",
      riyadhTime: riyadhNow().toISOString(),
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

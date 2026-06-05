
// VoiceTask AI - API كامل لـ Vercel
// ============================================================
// ضع هذه المتغيرات في Vercel Environment Variables:
//
// ANTHROPIC_API_KEY    = مفتاح Claude API
// TWILIO_ACCOUNT_SID   = Twilio SID
// TWILIO_AUTH_TOKEN    = Twilio Auth Token
// TWILIO_WHATSAPP_FROM = whatsapp:+14155238886
// SUPABASE_URL         = https://qsoljimpylngqwaqrjsk.supabase.co
// SUPABASE_KEY         = Supabase Secret Key
// YOUR_WHATSAPP        = whatsapp:+966XXXXXXXXX (رقمك)
// ============================================================

const https = require("https");

// ============================================================
// دالة إرسال واتساب عبر Twilio
// ============================================================
async function sendWhatsApp(to, message) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM;

  const body = new URLSearchParams({
    To: to,
    From: from,
    Body: message,
  }).toString();

  return new Promise((resolve, reject) => {
    const options = {
      hostname: "api.twilio.com",
      path: `/2010-04-01/Accounts/${accountSid}/Messages.json`,
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization:
          "Basic " +
          Buffer.from(`${accountSid}:${authToken}`).toString("base64"),
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => resolve(JSON.parse(data)));
    });

    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

// ============================================================
// دالة تحليل النص عبر Claude
// ============================================================
async function analyzeWithClaude(text) {
  const today = new Date().toISOString().split("T")[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];
  const dayAfter = new Date(Date.now() + 172800000).toISOString().split("T")[0];

  const days = {
    الأحد: 0, الاثنين: 1, الثلاثاء: 2, الأربعاء: 3,
    الخميس: 4, الجمعة: 5, السبت: 6,
  };

  const now = new Date();
  const dayDates = {};
  for (const [name, dayNum] of Object.entries(days)) {
    const diff = (dayNum - now.getDay() + 7) % 7 || 7;
    const d = new Date(now);
    d.setDate(d.getDate() + diff);
    dayDates[name] = d.toISOString().split("T")[0];
  }

  const systemPrompt = `أنت مساعد ذكي لاستخراج المهام من النصوص العربية والإنجليزية.
اليوم: ${today}
غداً: ${tomorrow}
بعد غد: ${dayAfter}
أيام الأسبوع: ${JSON.stringify(dayDates)}

قواعد مهمة:
- "بكرة" أو "غداً" = ${tomorrow}
- "اليوم" = ${today}
- إذا ذُكر يوم من الأسبوع استخدم التاريخ المقابل
- إذا لم يُذكر وقت استخدم "09:00"
- الأولوية: high للعاجل/المهم، medium للعادي، low للاختياري
- استخرج اسم الشخص إذا ذُكر
- استخرج اسم المشروع إذا ذُكر

أجب فقط بـ JSON صالح بدون أي نص إضافي:
{
  "tasks": [
    {
      "title": "عنوان المهمة",
      "date": "YYYY-MM-DD",
      "time": "HH:MM",
      "priority": "high|medium|low",
      "person": "اسم الشخص أو null",
      "project": "اسم المشروع أو null",
      "notes": "ملاحظات إضافية أو null",
      "recurring": "daily|weekly|monthly أو null"
    }
  ]
}`;

  return new Promise((resolve, reject) => {
    const bodyData = JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: `استخرج المهام من هذا النص:\n"${text}"`,
        },
      ],
    });

    const options = {
      hostname: "api.anthropic.com",
      path: "/v1/messages",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const response = JSON.parse(data);
          const text = response.content?.map((b) => b.text || "").join("") || "{}";
          const clean = text.replace(/```json|```/g, "").trim();
          resolve(JSON.parse(clean));
        } catch (e) {
          reject(new Error("فشل في تحليل رد Claude: " + e.message));
        }
      });
    });

    req.on("error", reject);
    req.write(bodyData);
    req.end();
  });
}

// ============================================================
// دالة حفظ المهام في Supabase
// ============================================================
async function saveTaskToSupabase(task) {
  return new Promise((resolve, reject) => {
    const bodyData = JSON.stringify({
      title: task.title,
      date: task.date,
      time: task.time,
      priority: task.priority || "medium",
      status: "new",
      person: task.person || null,
      project: task.project || null,
      description: task.notes || null,
    });

    const url = new URL(
      `${process.env.SUPABASE_URL}/rest/v1/tasks`
    );

    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: process.env.SUPABASE_KEY,
        Authorization: `Bearer ${process.env.SUPABASE_KEY}`,
        Prefer: "return=representation",
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve([]);
        }
      });
    });

    req.on("error", reject);
    req.write(bodyData);
    req.end();
  });
}

// ============================================================
// دالة جلب مهام اليوم من Supabase
// ============================================================
async function getTodayTasks() {
  const today = new Date().toISOString().split("T")[0];

  return new Promise((resolve, reject) => {
    const url = new URL(
      `${process.env.SUPABASE_URL}/rest/v1/tasks?date=eq.${today}&order=time.asc`
    );

    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: "GET",
      headers: {
        apikey: process.env.SUPABASE_KEY,
        Authorization: `Bearer ${process.env.SUPABASE_KEY}`,
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve([]);
        }
      });
    });

    req.on("error", () => resolve([]));
    req.end();
  });
}

// ============================================================
// دالة جلب مهام الأسبوع من Supabase
// ============================================================
async function getWeekTasks() {
  const today = new Date().toISOString().split("T")[0];
  const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];

  return new Promise((resolve, reject) => {
    const url = new URL(
      `${process.env.SUPABASE_URL}/rest/v1/tasks?date=gte.${today}&date=lte.${nextWeek}&order=date.asc,time.asc`
    );

    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: "GET",
      headers: {
        apikey: process.env.SUPABASE_KEY,
        Authorization: `Bearer ${process.env.SUPABASE_KEY}`,
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve([]);
        }
      });
    });

    req.on("error", () => resolve([]));
    req.end();
  });
}

// ============================================================
// دالة تنسيق رسالة المهام
// ============================================================
function formatTasksMessage(tasks) {
  if (!tasks || tasks.length === 0) {
    return "✅ تم استلام رسالتك ولكن لم أجد مهام واضحة.\n\nجرب مثلاً:\n\"فكرني أكلم أحمد بكرة الساعة 10\"";
  }

  const priorityEmoji = { high: "🔴", medium: "🟡", low: "🟢" };
  const priorityLabel = { high: "عالية", medium: "متوسطة", low: "منخفضة" };

  let message = `✅ *تم استخراج ${tasks.length} مهمة بنجاح!*\n\n`;

  tasks.forEach((task, i) => {
    const emoji = priorityEmoji[task.priority] || "🟡";
    message += `*${i + 1}️⃣ ${task.title}*\n`;
    message += `📅 ${task.date} ⏰ ${task.time}\n`;
    message += `${emoji} أولوية ${priorityLabel[task.priority] || "متوسطة"}`;
    if (task.person) message += ` | 👤 ${task.person}`;
    if (task.project) message += ` | 📁 ${task.project}`;
    if (task.notes) message += `\n📝 ${task.notes}`;
    message += "\n\n";
  });

  message += "─────────────────\n";
  message += "💡 *الأوامر المتاحة:*\n";
  message += "• اكتب *جدولي اليوم* لعرض مهام اليوم\n";
  message += "• اكتب *جدولي الأسبوع* لعرض الأسبوع\n";
  message += "• اكتب *مهمة جديدة* لإضافة مهمة";

  return message;
}

// ============================================================
// دالة تنسيق ملخص اليوم
// ============================================================
function formatDailySummary(tasks) {
  const today = new Date().toLocaleDateString("ar-SA", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  if (!tasks || tasks.length === 0) {
    return `📋 *ملخص يومك*\n${today}\n\nلا توجد مهام اليوم 🎉\nاستمتع بيومك!`;
  }

  const done = tasks.filter((t) => t.status === "done").length;
  const inprogress = tasks.filter((t) => t.status === "inprogress").length;
  const late = tasks.filter((t) => t.status === "late").length;
  const newTasks = tasks.filter((t) => t.status === "new").length;

  let message = `📋 *ملخص يومك*\n${today}\n\n`;
  message += `✅ مكتملة: ${done}\n`;
  message += `⏳ قيد التنفيذ: ${inprogress}\n`;
  message += `🆕 جديدة: ${newTasks}\n`;
  if (late > 0) message += `🔴 متأخرة: ${late}\n`;
  message += "\n*مهام اليوم:*\n";

  tasks.forEach((task, i) => {
    const statusEmoji =
      task.status === "done" ? "✅" :
      task.status === "inprogress" ? "⏳" :
      task.status === "late" ? "🔴" : "📌";
    message += `${statusEmoji} ${task.title} - ${task.time}\n`;
  });

  return message;
}

// ============================================================
// دالة تنسيق ملخص الأسبوع
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

  let message = `📅 *ملخص الأسبوع*\nإجمالي ${tasks.length} مهمة\n\n`;

  for (const [date, dayTasks] of Object.entries(grouped)) {
    const dayName = new Date(date).toLocaleDateString("ar-SA", { weekday: "long" });
    message += `*${dayName} ${date}*\n`;
    dayTasks.forEach((task) => {
      message += `  • ${task.title} - ${task.time}\n`;
    });
    message += "\n";
  }

  return message;
}

// ============================================================
// معالج الرسائل الواردة من واتساب
// ============================================================
async function handleIncomingMessage(from, body, mediaUrl) {
  const text = (body || "").trim();
  const lowerText = text.toLowerCase();

  // أوامر عرض الجداول
  if (
    lowerText.includes("جدولي اليوم") ||
    lowerText.includes("مهام اليوم") ||
    lowerText === "اليوم"
  ) {
    const tasks = await getTodayTasks();
    return formatDailySummary(tasks);
  }

  if (
    lowerText.includes("جدولي الأسبوع") ||
    lowerText.includes("مهام الأسبوع") ||
    lowerText === "الأسبوع"
  ) {
    const tasks = await getWeekTasks();
    return formatWeeklySummary(tasks);
  }

  // أمر المساعدة
  if (lowerText === "مساعدة" || lowerText === "help" || lowerText === "؟") {
    return `🤖 *VoiceTask AI - المساعد الذكي*\n\n*كيف تستخدمني:*\n\n📝 أرسل أي رسالة فيها مهام مثل:\n"فكرني أكلم أحمد بكرة الساعة 10"\n\n*الأوامر:*\n• *جدولي اليوم* - مهام اليوم\n• *جدولي الأسبوع* - مهام الأسبوع\n• *مساعدة* - هذه القائمة`;
  }

  // تحليل النص واستخراج المهام
  if (text.length > 3) {
    const result = await analyzeWithClaude(text);
    const tasks = result.tasks || [];

    // حفظ المهام في Supabase
    for (const task of tasks) {
      try {
        await saveTaskToSupabase(task);
      } catch (e) {
        console.error("خطأ في حفظ المهمة:", e.message);
      }
    }

    return formatTasksMessage(tasks);
  }

  return "أهلاً! أرسل لي مهامك وسأنظمها لك 😊\nاكتب *مساعدة* لمعرفة الأوامر المتاحة.";
}

// ============================================================
// الدالة الرئيسية - Vercel Handler
// ============================================================
module.exports = async (req, res) => {
  // السماح بـ CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // التحقق من صحة الطلب
  if (req.method === "GET") {
    return res.status(200).json({
      status: "✅ VoiceTask AI يعمل بنجاح!",
      version: "1.0.0",
      time: new Date().toISOString(),
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // استقبال بيانات Twilio
    const body = req.body || {};
    const from = body.From || "";
    const messageBody = body.Body || "";
    const mediaUrl = body.MediaUrl0 || null;
    const numMedia = parseInt(body.NumMedia || "0");

    console.log(`📨 رسالة من: ${from}`);
    console.log(`📝 المحتوى: ${messageBody}`);

    // التحقق من الرقم المصرح له
    const yourNumber = process.env.YOUR_WHATSAPP;
    if (yourNumber && from !== yourNumber) {
      console.log(`⚠️ رقم غير مصرح: ${from}`);
      return res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`);
    }

    // معالجة الرسالة
    let replyMessage = "";

    if (numMedia > 0 && mediaUrl) {
      replyMessage = "🎤 تم استلام الرسالة الصوتية!\n⏳ جاري المعالجة...\n\n*ملاحظة:* لتفعيل تحويل الصوت، أضف OpenAI Whisper API لاحقاً.\n\nالآن يمكنك إرسال نص المهمة مباشرة.";
    } else {
      replyMessage = await handleIncomingMessage(from, messageBody, mediaUrl);
    }

    // إرسال الرد عبر Twilio
    await sendWhatsApp(from, replyMessage);

    // رد Twilio
    res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`);

  } catch (error) {
    console.error("❌ خطأ:", error.message);

    // إرسال رسالة خطأ للمستخدم
    try {
      const from = req.body?.From || process.env.YOUR_WHATSAPP;
      if (from) {
        await sendWhatsApp(
          from,
          "⚠️ حدث خطأ مؤقت. حاول مرة أخرى بعد قليل."
        );
      }
    } catch (e) {
      console.error("فشل إرسال رسالة الخطأ:", e.message);
    }

    res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`);
  }
};

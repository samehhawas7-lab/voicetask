// ============================================================
// VoiceTask AI - Reminders Cron Endpoint
// يُستدعى كل دقيقة عبر cron-job.org
// ============================================================

"use strict";
const https = require("https");

function riyadhNow() {
  return new Date(Date.now() + 3 * 3600 * 1000);
}
function riyadhDateStr(d) {
  return d.toISOString().split("T")[0];
}

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

function supabaseRequest(method, pathAndQuery, bodyObj) {
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
          Prefer:         "return=minimal",
        },
      },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          if (res.statusCode >= 400) return reject(new Error(`Supabase ${res.statusCode}: ${data}`));
          try { resolve(data ? JSON.parse(data) : []); } catch (e) { resolve([]); }
        });
      }
    );
    req.on("error", reject);
    if (bodyData) req.write(bodyData);
    req.end();
  });
}

module.exports = async (req, res) => {
  try {
    const now   = riyadhNow();
    const today = riyadhDateStr(now);
    const nowMs = Date.now();

    const tasks = await supabaseRequest(
      "GET",
      `tasks?date=eq.${today}&status=not.in.(done,cancelled)&select=*`
    );

    const to = process.env.YOUR_WHATSAPP;
    let sentBefore = 0, sentDue = 0;

    for (const task of tasks) {
      if (!task.time) continue;

      const [hh, mm] = task.time.split(":").map(Number);
      const [Y, M, D] = task.date.split("-").map(Number);
      const dueMs = Date.UTC(Y, M - 1, D, hh - 3, mm);
      const diffMin = (dueMs - nowMs) / 60000;

      if (diffMin > 0 && diffMin <= 15 && !task.reminder_before_sent) {
        const minutes = Math.max(1, Math.round(diffMin));
        await sendWhatsApp(
          to,
          `⏰ *تذكير مسبق*\n\n*${task.title}*\n🕐 بعد ${minutes} دقيقة (الساعة ${task.time})` +
          (task.person ? `\n👤 ${task.person}` : "") +
          (task.project ? `\n📁 ${task.project}` : "")
        );
        await supabaseRequest("PATCH", `tasks?id=eq.${task.id}`, { reminder_before_sent: true });
        sentBefore++;
      }

      if (diffMin <= 0 && diffMin > -10 && !task.reminder_due_sent) {
        await sendWhatsApp(
          to,
          `🔔 *حان الموعد الآن!*\n\n*${task.title}*\n🕐 ${task.time}` +
          (task.person ? `\n👤 ${task.person}` : "") +
          (task.project ? `\n📁 ${task.project}` : "")
        );
        await supabaseRequest("PATCH", `tasks?id=eq.${task.id}`, { reminder_due_sent: true });
        sentDue++;
      }
    }

    return res.status(200).json({
      ok: true,
      checked: tasks.length,
      sentBefore,
      sentDue,
      riyadhTime: now.toISOString(),
    });

  } catch (error) {
    console.error("Reminders error:", error.message);
    return res.status(200).json({ ok: false, error: error.message });
  }
};

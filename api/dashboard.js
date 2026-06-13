// ============================================================
// VoiceTask AI - Dashboard v1.0.0
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
function getAdmin() { return { phone: process.env.YOUR_WHATSAPP, name: process.env.ADMIN_NAME || "المدير الأعلى", isAdmin: true }; }
function getTeam() {
  const raw = process.env.TEAM_MEMBERS || "";
  return raw.split(",").map(s => s.trim()).filter(Boolean).map(entry => {
    const idx = entry.lastIndexOf(":");
    return { phone: entry.slice(0, idx).trim(), name: entry.slice(idx + 1).trim(), isAdmin: false };
  }).filter(u => u.phone && u.name);
}
function allUsers() { return [getAdmin(), ...getTeam()]; }

// ---------- AUTH (token مشتق من الرقم + سر) ----------
function secret() { return process.env.DASHBOARD_SECRET || process.env.TWILIO_AUTH_TOKEN || process.env.SUPABASE_KEY || "voicetask-fallback"; }
function tokenFor(phone) { return crypto.createHash("sha256").update(phone + "|" + secret()).digest("hex").slice(0, 28); }
function resolveByToken(token) {
  if (!token) return null;
  return allUsers().find(u => tokenFor(u.phone) === token) || null;
}

// ---------- SUPABASE (قراءة فقط من السيرفر) ----------
function supabaseRequest(method, pathAndQuery) {
  const url = new URL(`${process.env.SUPABASE_URL}/rest/v1/${pathAndQuery}`);
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: url.hostname, path: url.pathname + url.search, method,
      headers: { "Content-Type": "application/json", apikey: process.env.SUPABASE_KEY, Authorization: `Bearer ${process.env.SUPABASE_KEY}` }
    }, (res) => {
      let d = ""; res.on("data", c => d += c);
      res.on("end", () => { if (res.statusCode >= 400) return reject(new Error(`Supabase: ${d}`)); try { resolve(d ? JSON.parse(d) : []); } catch (e) { resolve([]); } });
    });
    req.on("error", reject); req.end();
  });
}
const UP = (p) => `user_phone=eq.${encodeURIComponent(p)}`;
const SELECT = "select=id,title,date,time,category,priority,status,person,project,description,user_phone";

// جلب نافذة زمنية واسعة: من قبل 30 يوم لحد بعد 60 يوم
async function fetchWindow(phone) {
  const today = riyadhDateStr(riyadhNow());
  const from = shiftDays(today, -30), to = shiftDays(today, 60);
  const base = `tasks?date=gte.${from}&date=lte.${to}&status=neq.cancelled&${SELECT}&order=date.asc,time.asc`;
  return supabaseRequest("GET", phone ? `${base}&${UP(phone)}` : base);
}

// ---------- تحليل البيانات ----------
function buildData(tasks, scope, viewer, usersForSwitch, adminToken) {
  const today = riyadhDateStr(riyadhNow());
  const d6 = shiftDays(today, -6);
  const nameByPhone = {}; allUsers().forEach(u => { nameByPhone[u.phone] = u.name; });

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
    .map(t => ({ ...t, ownerName: nameByPhone[t.user_phone] || "غير معروف" }))
    .sort((a, b) => (a.date + (a.time || "")).localeCompare(b.date + (b.time || "")));

  return {
    meta: {
      appName: "VoiceTask", version: "1.0.0",
      generatedAt: riyadhNow().toISOString().replace("T", " ").slice(0, 16),
      today, scope, viewer, isAdmin: viewer.isAdmin,
      adminToken: viewer.isAdmin ? adminToken : null,
      switchUsers: viewer.isAdmin ? usersForSwitch : []
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

  /* print -> PDF */
  @media print{
    body{background:#fff;color:#111}
    .head-right,.filters,.search,.wavebar{display:none!important}
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
        <button class="chip on" data-f="all">الكل</button>
        <button class="chip" data-f="new">نشطة</button>
        <button class="chip" data-f="over">متأخرة</button>
        <button class="chip" data-f="done">منجزة</button>
        <input class="search" id="search" placeholder="بحث في العنوان…">
      </div>
    </div>
    <div class="tscroll"><table id="tbl"><thead></thead><tbody></tbody></table></div>
  </section>

  <footer id="foot"></footer>
</div>

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
if (m.isAdmin) {
  const sel = document.createElement("select");
  const base = location.pathname + "?token=" + encodeURIComponent(m.adminToken);
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

// ---- Table ----
const today = m.today;
const showOwner = m.scope === "all";
function statusInfo(t){
  if (t.status === "done") return { cls:"done", txt:"منجزة" };
  if (t.status === "new" && t.date < today) return { cls:"over", txt:"متأخرة" };
  return { cls:"new", txt:"نشطة" };
}
function buildHead(){
  const cols = ["المهمة","التاريخ","الوقت","الفئة","الأولوية","الحالة"];
  if (showOwner) cols.push("المالك");
  document.querySelector("#tbl thead").innerHTML = "<tr>"+cols.map(c=>"<th>"+c+"</th>").join("")+"</tr>";
}
let curFilter = "all", curSearch = "";
function rowMatches(t){
  const si = statusInfo(t);
  if (curFilter === "new" && si.cls !== "new") return false;
  if (curFilter === "over" && si.cls !== "over") return false;
  if (curFilter === "done" && si.cls !== "done") return false;
  if (curSearch && !(t.title||"").toLowerCase().includes(curSearch)) return false;
  return true;
}
function render(){
  const body = document.querySelector("#tbl tbody");
  const rows = DATA.tasks.filter(rowMatches);
  if (!rows.length){ const span = 6 + (showOwner?1:0);
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
    return r + "</tr>";
  }).join("");
}
buildHead();
render();
document.querySelectorAll(".chip").forEach(ch => ch.onclick = () => {
  document.querySelectorAll(".chip").forEach(x=>x.classList.remove("on"));
  ch.classList.add("on"); curFilter = ch.dataset.f; render();
});
document.getElementById("search").oninput = (e) => { curSearch = e.target.value.trim().toLowerCase(); render(); };

// ---- Export: Excel ----
document.getElementById("btnXlsx").onclick = () => {
  const rows = DATA.tasks.map(t => {
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
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  try {
    const q = req.query || {};
    const token = q.token || "";
    const origin = `https://${req.headers.host}`;

    const user = resolveByToken(token);
    if (!user) { res.statusCode = 401; return res.end(lockedPage()); }

    // أداة الأدمن: عرض روابط كل المستخدمين
    if (q.links && user.isAdmin) return res.end(linksPage(origin));

    // تحديد النطاق (scope)
    let scope = "me", phone = user.phone, viewer = user;
    if (user.isAdmin) {
      if (q.as) {
        const target = allUsers().find(u => u.phone === q.as);
        if (target) { scope = "user"; phone = target.phone; viewer = { ...target, isAdmin: true }; }
        else { scope = "all"; phone = null; }
      } else { scope = "all"; phone = null; }
    }

    const tasks = await fetchWindow(phone); // null = كل الفريق
    const switchUsers = user.isAdmin ? allUsers().map(u => ({ name: u.name, phone: u.phone })) : [];
    const data = buildData(tasks, scope, viewer, switchUsers, tokenFor(user.phone));

    return res.end(dashboardPage(data));
  } catch (err) {
    res.statusCode = 200;
    return res.end(`<!doctype html><meta charset="utf-8"><body style="font-family:sans-serif;background:#0d1320;color:#e8edf6;padding:40px" dir="rtl">
      <h2>⚠️ خطأ مؤقت</h2><p>تعذّر تحميل اللوحة. تأكد من متغيرات البيئة (SUPABASE, DASHBOARD_SECRET).</p>
      <pre style="color:#fb7185;direction:ltr">${esc(err.message)}</pre></body>`);
  }
};

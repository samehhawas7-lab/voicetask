"use strict";
// ============================================================
// واجهة لوحة «شبكة البيت» — جافاسكربت خالص بلا مكتبات.
// ============================================================

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

let STATE = null;
let live = [];
let liveDirty = false;
let sse = null;

const DAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
const DAYS_SHORT = ["أحد", "اثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"];
const WHY = {
  paused: "النت موقوف",
  "device-paused": "الجهاز مقطوع",
  curfew: "خارج الوقت المسموح",
  blocklist: "قائمة الحجب",
  category: "فئة محجوبة",
  allowlist: "مسموح دائماً",
  ok: "",
};

function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function pad(n) { return String(n).padStart(2, "0"); }
function clock(ts) { const d = new Date(ts); return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`; }
function num(n) { return Number(n || 0).toLocaleString("en-US"); }

function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove("show"), 2600);
}

// ---------- الاتصال ----------
async function api(path, body) {
  const res = await fetch(path, body
    ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
    : {});
  if (res.status === 401) { showLogin(); throw new Error("يلزم الدخول"); }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "خطأ في الطلب");
  return data;
}

function showLogin() {
  $("#login").classList.remove("hidden");
  if (sse) { sse.close(); sse = null; }
}

$("#loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    const res = await fetch("/api/login", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin: $("#pin").value.trim() }),
    });
    if (!res.ok) throw new Error("الرمز غير صحيح");
    $("#login").classList.add("hidden");
    $("#loginErr").textContent = "";
    boot();
  } catch (err) {
    $("#loginErr").textContent = err.message;
  }
});

// ---------- التبويبات ----------
$$(".tabs button").forEach((b) => b.addEventListener("click", () => {
  $$(".tabs button").forEach((x) => x.classList.toggle("active", x === b));
  $$(".tab").forEach((t) => t.classList.toggle("active", t.id === "tab-" + b.dataset.tab));
  if (b.dataset.tab === "log") loadLog();
}));

// ---------- الترويسة ----------
function renderTop() {
  const s = STATE.status;
  const online = STATE.devices.filter((d) => d.online).length;
  const today = STATE.devices.reduce((a, d) => a + (d.stats.total || 0), 0);
  const blocked = STATE.devices.reduce((a, d) => a + (d.stats.blocked || 0), 0);
  $("#kpis").innerHTML = `
    <div>طلبات اليوم<b>${num(today)}</b></div>
    <div>محجوب<b>${num(blocked)}</b></div>
    <div>أجهزة متصلة<b>${num(online)}</b></div>
    <div>نطاقات في الفهرس<b>${num(STATE.indexSize)}</b></div>`;
  const paused = STATE.settings.paused;
  const btn = $("#pauseBtn");
  btn.textContent = paused ? "إرجاع النت" : "قطع النت";
  btn.classList.toggle("on", paused);
  $("#liveDot").classList.toggle("off", paused);
}

$("#pauseBtn").addEventListener("click", async () => {
  const on = !STATE.settings.paused;
  let minutes = 0;
  if (on) {
    const ans = prompt("قطع النت عن كل البيت لكم دقيقة؟ (اتركه فارغاً للقطع حتى تُرجعه)", "30");
    if (ans === null) return;
    minutes = Number(ans) || 0;
  }
  await api("/api/pause", { on, minutes });
  await refresh();
  toast(on ? "تم قطع النت" : "رجع النت");
});

// ---------- الآن ----------
function eventRow(e) {
  const blocked = e.act === "block";
  const why = e.label || WHY[e.why] || "";
  return `<div class="item ${blocked ? "block" : ""}">
    <span class="badge ${blocked ? "block" : "allow"}">${blocked ? "محجوب" : "سُمح"}</span>
    <span class="who">${esc(e.name || e.ip)}</span>
    <span class="dom" title="${esc(e.q)}">${esc(e.q)}</span>
    ${e.c > 1 ? `<span class="badge count">×${e.c}</span>` : ""}
    ${e.safe ? `<span class="badge safe">بحث آمن</span>` : ""}
    ${why ? `<span class="badge ${blocked ? "block" : "count"}">${esc(why)}</span>` : ""}
    <span class="time">${clock(e.t)}</span>
    <button class="small" data-act="${blocked ? "allow" : "block"}" data-domain="${esc(e.q)}">${blocked ? "اسمح" : "احجب"}</button>
  </div>`;
}

function renderLive() {
  if ($("#paused").checked) return;
  const f = $("#liveFilter").value.trim().toLowerCase();
  const onlyB = $("#onlyBlocked").checked;
  const rows = live.filter((e) => {
    if (onlyB && e.act !== "block") return false;
    if (f && !(e.q.includes(f) || (e.name || "").toLowerCase().includes(f) || e.ip.includes(f))) return false;
    return true;
  }).slice(0, 200);
  $("#liveList").innerHTML = rows.length ? rows.map(eventRow).join("")
    : `<p class="muted">لا يوجد نشاط بعد. تأكد أن الراوتر يشير إلى هذا الجهاز كخادم DNS (اقرأ README).</p>`;
}

function renderAlerts() {
  const a = STATE.alerts || [];
  if (!a.length) { $("#alertBox").innerHTML = ""; return; }
  const top = a.slice(0, 4);
  $("#alertBox").innerHTML = top.map((x) => `<div class="alert">
      <span>🚫</span>
      <span><b>${esc(x.name)}</b> حاول فتح <b dir="ltr">${esc(x.q)}</b> — ${esc(x.catLabel)}</span>
      <span class="time">${clock(x.t)}</span>
    </div>`).join("") +
    (a.length > top.length ? `<p class="muted">و${a.length - top.length} محاولة أخرى — <a href="#" id="clearAlerts">مسح التنبيهات</a></p>`
      : `<p class="muted"><a href="#" id="clearAlerts">مسح التنبيهات</a></p>`);
}

$("#liveFilter").addEventListener("input", renderLive);
$("#onlyBlocked").addEventListener("change", renderLive);
$("#paused").addEventListener("change", renderLive);

document.addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-domain][data-act]");
  if (btn) {
    const kind = btn.dataset.act === "block" ? "block" : "allow";
    await api("/api/rules", { scope: "global", kind, domain: btn.dataset.domain });
    toast(kind === "block" ? `حُجب ${btn.dataset.domain}` : `سُمح ${btn.dataset.domain}`);
    await refresh();
    return;
  }
  if (e.target.id === "clearAlerts") {
    e.preventDefault();
    await api("/api/alerts/clear", {});
    STATE.alerts = [];
    renderAlerts();
  }
});

// ---------- الأجهزة ----------
function deviceCard(d) {
  const p = STATE.profiles.map((x) => `<option value="${x.id}" ${x.id === d.profile ? "selected" : ""}>${esc(x.name)}</option>`).join("");
  const cut = d.blockedUntil && d.blockedUntil > Date.now();
  return `<div class="card ${cut ? "cut" : ""}" data-id="${esc(d.id)}">
    <h3>
      <span class="dot ${d.online ? "" : "off"}"></span>
      ${esc(d.display)}
      ${d.isNew ? `<span class="badge safe">جديد</span>` : ""}
    </h3>
    <div class="meta">${esc(d.ip)}${d.mac ? " · " + esc(d.mac) : ""}</div>
    <div class="meta">${esc(d.kind || "نوع غير معروف")}</div>
    <div class="meta">اليوم: ${num(d.stats.total)} طلب · ${num(d.stats.blocked)} محجوب
      ${cut ? " · <b style='color:#ff9b9b'>مقطوع</b>" : ""}
      ${d.curfew && !cut ? " · <b style='color:#ffb020'>" + esc(d.curfew) + "</b>" : ""}</div>
    <input data-field="name" value="${esc(d.name)}" placeholder="سمِّ الجهاز: آيباد سارة">
    <select data-field="profile">${p}</select>
    <div class="actions">
      ${cut
        ? `<button class="small" data-do="open">أرجع النت</button>`
        : `<button class="small danger" data-do="cut" data-min="60">اقطع ساعة</button>
           <button class="small danger" data-do="cut" data-min="0">اقطع للأبد</button>`}
      <button class="small ghost" data-do="grace" data-min="30">تمديد ٣٠ د</button>
      <button class="small ghost" data-do="log">سجلّه</button>
    </div>
  </div>`;
}

function renderDevices() {
  const list = STATE.devices;
  $("#deviceList").innerHTML = list.length ? list.map(deviceCard).join("")
    : `<p class="muted">ما ظهر أي جهاز بعد — بمجرد أن يوجّه الراوتر الأجهزة لهذا الخادم تبدأ بالظهور هنا.</p>`;
  const sel = $("#logDev");
  const cur = sel.value;
  sel.innerHTML = `<option value="">كل الأجهزة</option>` +
    list.map((d) => `<option value="${esc(d.id)}">${esc(d.display)}</option>`).join("");
  sel.value = cur;
}

$("#deviceList").addEventListener("click", async (e) => {
  const card = e.target.closest(".card");
  if (!card) return;
  const id = card.dataset.id;
  const b = e.target.closest("[data-do]");
  if (!b) return;
  const act = b.dataset.do;
  if (act === "log") {
    $$(".tabs button").find((x) => x.dataset.tab === "log").click();
    $("#logDev").value = id;
    loadLog();
    return;
  }
  await api("/api/device", { id, action: act, minutes: Number(b.dataset.min || 0) });
  await refresh();
  toast(act === "cut" ? "انقطع النت عن الجهاز" : act === "open" ? "رجع النت للجهاز" : "تم التمديد");
});

$("#deviceList").addEventListener("change", async (e) => {
  const card = e.target.closest(".card");
  const f = e.target.dataset.field;
  if (!card || !f) return;
  await api("/api/device", { id: card.dataset.id, [f]: e.target.value });
  await refresh();
  toast("تم الحفظ");
});

// ---------- السجل ----------
async function loadLog() {
  const day = $("#logDay").value || STATE.day;
  const dev = $("#logDev").value;
  const q = $("#logQ").value.trim();
  const act = $("#logAct").value;
  const [res, stats] = await Promise.all([
    api(`/api/search?day=${encodeURIComponent(day)}&dev=${encodeURIComponent(dev)}&q=${encodeURIComponent(q)}&act=${encodeURIComponent(act)}`),
    api(`/api/stats?day=${encodeURIComponent(day)}${dev ? "&dev=" + encodeURIComponent(dev) : ""}`),
  ]);
  $("#logList").innerHTML = res.events.length ? res.events.map(eventRow).join("")
    : `<p class="muted">لا توجد نتائج في هذا اليوم.</p>`;
  const top = stats.top || [];
  const max = top.length ? top[0][1] : 1;
  $("#topSites").innerHTML = `<h3>أكثر المواقع</h3>` + (top.length
    ? `<div class="bars">` + top.slice(0, 25).map(([d, n]) => `
        <div class="barrow">
          <span class="lbl" title="${esc(d)}">${esc(d)}</span>
          <span class="track"><span class="fill" style="width:${Math.max(4, (n / max) * 100)}%"></span></span>
          <span class="n">${num(n)}</span>
        </div>`).join("") + `</div>`
    : `<p class="muted">لا توجد بيانات.</p>`);
}

$("#logGo").addEventListener("click", loadLog);
$("#logQ").addEventListener("keydown", (e) => { if (e.key === "Enter") loadLog(); });
["logDay", "logDev", "logAct"].forEach((id) => $("#" + id).addEventListener("change", loadLog));

async function loadDays() {
  const { days } = await api("/api/days");
  const list = days.length ? days : [STATE.day];
  $("#logDay").innerHTML = list.map((d) => `<option value="${d}">${d === STATE.day ? "اليوم" : d}</option>`).join("");
}

// ---------- القواعد ----------
function curfewRow(w, pi, wi) {
  return `<div class="win" data-w="${wi}">
    <input data-f="label" value="${esc(w.label || "")}" placeholder="اسم الفترة" style="max-width:140px">
    <span>من</span><input type="time" data-f="from" value="${esc(w.from)}">
    <span>إلى</span><input type="time" data-f="to" value="${esc(w.to)}">
    <span class="days">${DAYS_SHORT.map((d, i) => `<button data-day="${i}" title="${DAYS[i]}" class="${(w.days || []).includes(i) ? "on" : ""}">${d}</button>`).join("")}</span>
    <button class="small ghost" data-del="${wi}">حذف</button>
  </div>`;
}

function renderProfiles() {
  $("#profiles").innerHTML = STATE.profiles.map((p, pi) => `
    <div class="panel" data-profile="${esc(p.id)}" data-pi="${pi}">
      <h3>${esc(p.name)}</h3>
      <h4>الفئات المحجوبة</h4>
      <div class="cats">
        ${Object.entries(STATE.categories).map(([k, c]) => `
          <label class="cat ${p.categories.includes(k) ? "on" : ""} ${c.danger ? "danger" : ""}">
            <input type="checkbox" data-cat="${k}" ${p.categories.includes(k) ? "checked" : ""}>
            <span>${esc(c.label)}</span>
          </label>`).join("")}
      </div>
      <h4>البحث الآمن (جوجل/يوتيوب/بينج)</h4>
      <label class="chk"><input type="checkbox" data-safe ${p.safeSearch !== false ? "checked" : ""}> فعّل النسخة المقيَّدة</label>
      <h4>أوقات المنع</h4>
      <div data-curfew>${(p.curfew || []).map((w, wi) => curfewRow(w, pi, wi)).join("") || `<p class="muted">لا يوجد وقت منع.</p>`}</div>
      <div class="row">
        <button class="small ghost" data-addwin>+ أضف فترة منع</button>
        <button class="small" data-save>احفظ</button>
      </div>
    </div>`).join("");
}

$("#profiles").addEventListener("click", async (e) => {
  const panel = e.target.closest("[data-profile]");
  if (!panel) return;
  const p = STATE.profiles.find((x) => x.id === panel.dataset.profile);

  if (e.target.matches("[data-day]")) {
    e.target.classList.toggle("on");
    return;
  }
  if (e.target.matches("[data-del]")) {
    e.target.closest(".win").remove();
    return;
  }
  if (e.target.matches("[data-addwin]")) {
    const holder = panel.querySelector("[data-curfew]");
    if (holder.querySelector("p")) holder.innerHTML = "";
    holder.insertAdjacentHTML("beforeend", curfewRow({ label: "منع", from: "21:00", to: "06:30", days: [0, 1, 2, 3, 4, 5, 6] }, 0, holder.children.length));
    return;
  }
  if (e.target.matches("[data-save]")) {
    const categories = $$("[data-cat]", panel).filter((c) => c.checked).map((c) => c.dataset.cat);
    const safeSearch = panel.querySelector("[data-safe]").checked;
    const curfew = $$(".win", panel).map((w) => ({
      label: w.querySelector('[data-f="label"]').value,
      from: w.querySelector('[data-f="from"]').value,
      to: w.querySelector('[data-f="to"]').value,
      days: $$("[data-day]", w).filter((b) => b.classList.contains("on")).map((b) => Number(b.dataset.day)),
    }));
    await api("/api/profile", { id: p.id, categories, safeSearch, curfew });
    await refresh();
    toast("حُفظت قواعد " + p.name);
  }
});

function renderGlobalRules() {
  const chips = (arr, kind) => arr.length
    ? arr.map((d) => `<span class="chip">${esc(d)}<button data-rm="${esc(d)}" data-kind="${kind}">×</button></span>`).join("")
    : `<span class="muted">فارغة</span>`;
  $("#globalBlock").innerHTML = chips(STATE.rules.block || [], "block");
  $("#globalAllow").innerHTML = chips(STATE.rules.allow || [], "allow");
}

$("#tab-rules").addEventListener("click", async (e) => {
  const add = e.target.closest("[data-rule]");
  if (add) {
    const domain = $("#ruleDomain").value.trim();
    if (!domain) return;
    await api("/api/rules", { scope: "global", kind: add.dataset.rule, domain });
    $("#ruleDomain").value = "";
    await refresh();
    toast("تمت الإضافة");
    return;
  }
  const rm = e.target.closest("[data-rm]");
  if (rm) {
    await api("/api/rules", { scope: "global", kind: rm.dataset.kind, domain: rm.dataset.rm, remove: true });
    await refresh();
  }
});

// ---------- الإعدادات ----------
function renderSettings() {
  const s = STATE.settings;
  const sizes = STATE.listSizes || {};
  $("#settings").innerHTML = `
    <div class="panel">
      <h3>الحجب والفلترة</h3>
      <div class="row"><label style="flex:1">خوادم DNS الأعلى (مفصولة بفاصلة)</label>
        <input id="setUpstream" value="${esc((s.upstream || []).join(", "))}"></div>
      <p class="muted">للحماية الإضافية استخدم خوادم عائلية: <code dir="ltr">1.1.1.3, 1.0.0.3</code> (كلاودفلير للعائلة) أو <code dir="ltr">208.67.222.123</code> (OpenDNS FamilyShield).</p>
      <label class="chk"><input type="checkbox" id="setSafe" ${s.safeSearch ? "checked" : ""}> فرض البحث الآمن على مستوى الشبكة</label>
      <div class="row" style="margin-top:10px">
        <label>طريقة الحجب</label>
        <select id="setMode">
          <option value="zero" ${s.blockMode === "zero" ? "selected" : ""}>عنوان صفري (أسرع)</option>
          <option value="nxdomain" ${s.blockMode === "nxdomain" ? "selected" : ""}>غير موجود NXDOMAIN</option>
        </select>
        <label>ملف الأجهزة الجديدة</label>
        <select id="setNewDev">${STATE.profiles.map((p) => `<option value="${p.id}" ${s.newDeviceProfile === p.id ? "selected" : ""}>${esc(p.name)}</option>`).join("")}</select>
      </div>
      <button id="saveFilter">احفظ</button>
    </div>

    <div class="panel">
      <h3>قوائم الحجب</h3>
      <p class="muted">الفهرس الحالي: <b>${num(STATE.indexSize)}</b> نطاق.
        ${Object.entries(sizes).map(([k, n]) => `${esc(STATE.categories[k] ? STATE.categories[k].label : k)}: ${num(n)}`).join(" · ") || "لم تُحمَّل قوائم كبيرة بعد."}</p>
      <p class="muted">التحديث يجلب قوائم عامة (StevenBlack) بعشرات الآلاف من النطاقات — يحتاج إنترنت، ويأخذ دقيقة.</p>
      <button id="updLists">حدّث القوائم الآن</button>
    </div>

    <div class="panel">
      <h3>التنبيهات</h3>
      <p class="muted">عند محاولة فتح موقع من الفئات الخطرة (إباحي، ميسر، تعارف، تجاوز الفلترة) يصلك تنبيه فوري.</p>
      <div class="row"><label style="flex:1">رابط ويب‑هوك (اختياري)</label><input id="setHook" placeholder="https://…" value=""></div>
      <div class="row"><label style="flex:1">رمز بوت تلجرام</label><input id="setTgToken" placeholder="123456:ABC…" value=""></div>
      <div class="row"><label style="flex:1">معرّف محادثة تلجرام</label><input id="setTgChat" value="${esc(s.telegramChat || "")}"></div>
      <p class="muted">${s.hasWebhook ? "✅ ويب‑هوك معدّ" : "لا يوجد ويب‑هوك"} · ${s.hasTelegram ? "✅ تلجرام معدّ" : "تلجرام غير معدّ"}
        — الحقول تظهر فارغة لأن الأسرار لا تُعرض؛ اتركها فارغة ولن تتغيّر.</p>
      <button id="saveNotify">احفظ</button>
      <button id="testNotify" class="ghost">جرّب التنبيه</button>
      ${s.hasWebhook ? `<button id="clearHook" class="ghost small">امسح الويب‑هوك</button>` : ""}
      ${s.hasTelegram ? `<button id="clearTg" class="ghost small">امسح تلجرام</button>` : ""}
    </div>

    <div class="panel">
      <h3>الخصوصية والأمان</h3>
      <div class="row"><label style="flex:1">مدة حفظ السجل (أيام)</label><input id="setDays" type="number" min="1" max="365" value="${Number(s.logRetentionDays || 30)}"></div>
      <div class="row"><label style="flex:1">رمز دخول اللوحة الجديد</label><input id="setPin" type="password" placeholder="٤ أرقام فأكثر"></div>
      <button id="savePrivacy">احفظ</button>
      <button id="logoutBtn" class="ghost">خروج</button>
      <p class="muted">كل السجلات محفوظة على هذا الجهاز فقط، ولا تُرسل لأي خادم خارجي.</p>
    </div>

    <div class="panel">
      <h3>حالة الخادم</h3>
      <p class="muted">
        منفذ DNS: ${STATE.status.port} ·
        طلبات منذ التشغيل: ${num(STATE.status.total)} ·
        محجوب: ${num(STATE.status.blocked)} ·
        من الذاكرة: ${num(STATE.status.served)} ·
        محوّل: ${num(STATE.status.forwarded)} ·
        فشل: ${num(STATE.status.failed)}
      </p>
    </div>`;
}

$("#settings").addEventListener("click", async (e) => {
  const id = e.target.id;
  try {
    if (id === "saveFilter") {
      await api("/api/settings", {
        upstream: $("#setUpstream").value.split(/[,\s]+/).filter(Boolean),
        safeSearch: $("#setSafe").checked,
        blockMode: $("#setMode").value,
        newDeviceProfile: $("#setNewDev").value,
      });
      await refresh(); toast("حُفظت الإعدادات");
    }
    if (id === "saveNotify") {
      await api("/api/settings", {
        alertWebhook: $("#setHook").value.trim(),
        telegramToken: $("#setTgToken").value.trim(),
        telegramChat: $("#setTgChat").value.trim(),
      });
      await refresh(); toast("حُفظت التنبيهات");
    }
    if (id === "clearHook") { await api("/api/settings", { clear: "webhook" }); await refresh(); toast("مُسح الويب‑هوك"); }
    if (id === "clearTg") { await api("/api/settings", { clear: "telegram" }); await refresh(); toast("مُسح إعداد تلجرام"); }
    if (id === "testNotify") {
      const r = await api("/api/notify/test", {});
      toast(r.ok ? "وصل التنبيه ✅" : r.error);
    }
    if (id === "savePrivacy") {
      const pin = $("#setPin").value.trim();
      await api("/api/settings", { logRetentionDays: Number($("#setDays").value), ...(pin ? { pin } : {}) });
      await refresh(); toast(pin ? "تغيّر رمز الدخول" : "حُفظ");
    }
    if (id === "logoutBtn") { await fetch("/api/logout"); location.reload(); }
    if (id === "updLists") {
      e.target.disabled = true; e.target.textContent = "جاري التحديث…";
      const r = await api("/api/lists/update", {});
      await refresh();
      toast(`اكتمل التحديث — ${num(r.indexSize)} نطاق في الفهرس`);
    }
  } catch (err) { toast(err.message); }
});

// ---------- التحديث الدوري ----------
async function refresh() {
  STATE = await api("/api/state");
  renderTop();
  renderAlerts();
  renderDevices();
  renderProfiles();
  renderGlobalRules();
  renderSettings();
}

function connectStream() {
  if (sse) sse.close();
  sse = new EventSource("/api/stream");
  sse.onmessage = (m) => {
    let msg;
    try { msg = JSON.parse(m.data); } catch { return; }
    if (msg.type === "event") {
      live.unshift(msg.event);
      if (live.length > 400) live.length = 400;
      liveDirty = true;
    } else if (msg.type === "update") {
      const i = live.findIndex((x) => x.n === msg.event.n);
      if (i >= 0) live[i] = msg.event;
      liveDirty = true;
    } else if (msg.type === "alert") {
      if (!STATE.alerts) STATE.alerts = [];
      STATE.alerts.unshift(msg.alert);
      renderAlerts();
    }
  };
  sse.onerror = () => { /* المتصفح يعيد المحاولة تلقائياً */ };
}

setInterval(() => { if (liveDirty) { liveDirty = false; renderLive(); } }, 500);
setInterval(() => { refresh().catch(() => {}); }, 20000);

async function boot() {
  try {
    await refresh();
    const { events } = await api("/api/events");
    live = events;
    renderLive();
    await loadDays();
    connectStream();
  } catch (e) {
    if (e.message !== "يلزم الدخول") toast(e.message);
  }
}

boot();

"use strict";
// ============================================================
// واجهة الريموت — تتكلم مع الخادم المحلي عبر /api
// ============================================================

const $ = (id) => document.getElementById(id);
// رمز الوصول (لو مفعّل) يجي من رابط الصفحة: ?token=...
const TOKEN = new URLSearchParams(location.search).get("token") || "";

// ---------- طلبات API ----------
async function api(path, options = {}) {
  const headers = { "Content-Type": "application/json" };
  if (TOKEN) headers["X-Remote-Token"] = TOKEN;
  const res = await fetch(path, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `خطأ ${res.status}`);
  return data;
}

const post = (path, body) =>
  api(path, { method: "POST", body: JSON.stringify(body || {}) });

// ---------- التنبيهات ----------
let toastTimer = null;
function toast(message, isError = false) {
  const el = $("toast");
  el.textContent = message;
  el.classList.toggle("error", isError);
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.hidden = true), 2600);
}

// ---------- اهتزاز خفيف عند الضغط ----------
function buzz(ms = 12) {
  if (navigator.vibrate) navigator.vibrate(ms);
}

// ---------- رسم الحالة ----------
const STATUS_TEXT = {
  disconnected: "غير متصل",
  pairing: "جاري الإقران…",
  awaiting_code: "بانتظار رمز الإقران",
  connecting: "جاري الاتصال…",
  ready: "متصل",
  error: "خطأ في الاتصال",
};

let currentState = { status: "disconnected" };

function render(state) {
  currentState = state;
  const { status } = state;

  // نقطة الحالة
  const dot = $("statusDot");
  dot.className = "dot";
  if (status === "ready") dot.classList.add("ready");
  else if (status === "error") dot.classList.add("error");
  else if (status !== "disconnected") dot.classList.add("busy");

  // نص الحالة
  let sub = STATUS_TEXT[status] || status;
  if (status === "ready" && state.host) sub = `متصل بـ ${state.host}`;
  if (state.error) sub = state.error;
  $("statusText").textContent = sub;

  // اللوحات
  const showPair = status === "awaiting_code";
  const showRemote = status === "ready";
  const showSetup = !showPair && !showRemote;

  $("pairPanel").hidden = !showPair;
  $("remote").hidden = !showRemote;
  $("setupPanel").hidden = !showSetup;

  if (showPair) $("codeInput").focus();

  // الأجهزة المقترنة سابقاً
  const known = state.knownHosts || [];
  $("knownWrap").hidden = known.length === 0;
  if (known.length) {
    const list = $("knownList");
    list.innerHTML = "";
    for (const host of known) {
      const chip = document.createElement("button");
      chip.className = "chip";
      chip.textContent = host;
      chip.onclick = () => connect(host);
      list.appendChild(chip);
    }
  }

  // التطبيق الشغّال حالياً
  const np = $("nowPlaying");
  if (showRemote && state.currentApp) {
    np.hidden = false;
    np.textContent = state.currentApp;
  } else {
    np.hidden = true;
  }
}

// ---------- الاتصال ----------
async function connect(host, forcePair = false) {
  $("connectBtn").disabled = true;
  try {
    render(await post("/api/connect", { host, forcePair }));
  } catch (e) {
    toast(e.message, true);
  } finally {
    $("connectBtn").disabled = false;
  }
}

// ---------- بث الحالة المباشر ----------
function listen() {
  const url = "/api/events" + (TOKEN ? `?token=${encodeURIComponent(TOKEN)}` : "");
  const source = new EventSource(url);
  source.onmessage = (event) => {
    try {
      render(JSON.parse(event.data));
    } catch {
      /* تجاهل الرسائل غير الصالحة */
    }
  };
  source.onerror = () => {
    // EventSource يعيد المحاولة تلقائياً؛ نكتفي بتحديث يدوي احتياطي
    setTimeout(() => api("/api/state").then(render).catch(() => {}), 3000);
  };
}

// ---------- ربط الأزرار ----------
function bindKeys() {
  // كل زر عنده data-key يرسل الأمر
  document.querySelectorAll("[data-key]").forEach((btn) => {
    const key = btn.dataset.key;
    const repeatable = btn.hasAttribute("data-repeat");
    let holdTimer = null;
    let repeatTimer = null;

    const fire = () => {
      buzz();
      post("/api/key", { key }).catch((e) => toast(e.message, true));
    };

    const start = (event) => {
      event.preventDefault();
      btn.classList.add("pressed");
      fire();
      if (repeatable) {
        // ضغطة مطوّلة = تكرار (مفيد للصوت والقنوات)
        holdTimer = setTimeout(() => {
          repeatTimer = setInterval(fire, 160);
        }, 450);
      }
    };

    const stop = () => {
      btn.classList.remove("pressed");
      clearTimeout(holdTimer);
      clearInterval(repeatTimer);
      holdTimer = repeatTimer = null;
    };

    btn.addEventListener("pointerdown", start);
    btn.addEventListener("pointerup", stop);
    btn.addEventListener("pointerleave", stop);
    btn.addEventListener("pointercancel", stop);
    btn.addEventListener("contextmenu", (e) => e.preventDefault());
  });

  // زر الطاقة له مسار خاص
  document.querySelectorAll("[data-power]").forEach((btn) => {
    btn.addEventListener("click", () => {
      buzz(20);
      post("/api/power").catch((e) => toast(e.message, true));
    });
  });

  // التطبيقات
  document.querySelectorAll("[data-app]").forEach((btn) => {
    btn.addEventListener("click", () => {
      buzz();
      post("/api/app", { app: btn.dataset.app }).catch((e) => toast(e.message, true));
    });
  });
}

// ---------- التحكم بلوحة مفاتيح الكمبيوتر ----------
function bindKeyboard() {
  const MAP = {
    ArrowUp: "up",
    ArrowDown: "down",
    ArrowLeft: "left",
    ArrowRight: "right",
    Enter: "ok",
    Backspace: "back",
    Escape: "back",
    Home: "home",
    " ": "play_pause",
    "+": "volume_up",
    "-": "volume_down",
    m: "mute",
  };

  document.addEventListener("keydown", (event) => {
    // ما نتدخل وقت الكتابة في الحقول
    if (event.target.tagName === "INPUT") return;
    if (currentState.status !== "ready") return;
    const key = MAP[event.key];
    if (!key) return;
    event.preventDefault();
    post("/api/key", { key }).catch((e) => toast(e.message, true));
  });
}

// ---------- التهيئة ----------
function init() {
  bindKeys();
  bindKeyboard();

  $("connectBtn").onclick = () => {
    const host = $("hostInput").value.trim();
    if (!host) return toast("اكتب عنوان IP أول", true);
    connect(host);
  };

  $("hostInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter") $("connectBtn").click();
  });

  $("codeBtn").onclick = async () => {
    const code = $("codeInput").value.trim();
    if (!code) return toast("اكتب الرمز المعروض على التلفزيون", true);
    $("codeBtn").disabled = true;
    try {
      render(await post("/api/code", { code }));
      toast("تم الإقران بنجاح");
    } catch (e) {
      toast(e.message, true);
      $("codeInput").value = "";
    } finally {
      $("codeBtn").disabled = false;
    }
  };

  $("codeInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter") $("codeBtn").click();
  });

  $("cancelPairBtn").onclick = async () => {
    render(await post("/api/disconnect"));
  };

  $("scanBtn").onclick = async () => {
    const btn = $("scanBtn");
    const out = $("scanResult");
    btn.disabled = true;
    btn.textContent = "⏳ جاري البحث… (قد يأخذ دقيقة)";
    out.textContent = "";
    try {
      const result = await api("/api/discover");
      if (!result.found.length) {
        out.textContent =
          "ما لقيت أي تلفزيون. تأكد إن التلفزيون مشغّل ومتصل بنفس الشبكة (الواي فاي).";
      } else {
        out.textContent = `لقيت ${result.found.length} جهاز — اضغط عليه للتوصيل:`;
        const chips = document.createElement("div");
        chips.className = "chips";
        for (const host of result.found) {
          const chip = document.createElement("button");
          chip.className = "chip";
          chip.textContent = host;
          chip.onclick = () => {
            $("hostInput").value = host;
            connect(host);
          };
          chips.appendChild(chip);
        }
        out.appendChild(chips);
      }
    } catch (e) {
      out.textContent = "فشل البحث: " + e.message;
    } finally {
      btn.disabled = false;
      btn.textContent = "🔍 ابحث عن التلفزيون في الشبكة";
    }
  };

  $("sendTextBtn").onclick = async () => {
    const input = $("textInput");
    const text = input.value.trim();
    if (!text) return;
    try {
      await post("/api/text", { text });
      input.value = "";
    } catch (e) {
      toast(e.message, true);
    }
  };

  $("textInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter") $("sendTextBtn").click();
  });

  $("settingsBtn").onclick = async () => {
    if (currentState.status !== "ready") {
      // نرجّع لوحة الإعداد
      render(await post("/api/disconnect"));
      return;
    }
    if (confirm(`قطع الاتصال بـ ${currentState.host}؟`)) {
      render(await post("/api/disconnect"));
    }
  };

  // الحالة الأولية + البث المباشر
  api("/api/state")
    .then((state) => {
      render(state);
      if (state.lastHost && !$("hostInput").value) $("hostInput").value = state.lastHost;
    })
    .catch((e) => toast(e.message, true));

  listen();
}

init();

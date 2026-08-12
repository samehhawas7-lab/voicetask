// ============================================================
// مصر VPN — منطق الواجهة
// ============================================================
"use strict";

const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));
const STORE = "egypt-vpn/v1";

// ---------- مواقع مصرية ----------
const CATALOG = [
  {
    group: "أخبار",
    sites: [
      { name: "اليوم السابع", url: "https://www.youm7.com", web: true },
      { name: "المصري اليوم", url: "https://www.almasryalyoum.com", web: true },
      { name: "بوابة الأهرام", url: "https://gate.ahram.org.eg", web: true },
      { name: "مصراوي", url: "https://www.masrawy.com", web: true },
      { name: "الشروق", url: "https://www.shorouknews.com", web: true },
      { name: "في الجول", url: "https://www.filgoal.com", web: true },
    ],
  },
  {
    group: "تعليم ومعرفة",
    sites: [
      { name: "بنك المعرفة المصري", url: "https://www.ekb.eg", web: true, note: "متاح داخل مصر فقط" },
      { name: "وزارة التربية والتعليم", url: "https://moe.gov.eg", web: true },
      { name: "نتائج الثانوية", url: "https://natega.youm7.com", web: true },
    ],
  },
  {
    group: "خدمات حكومية",
    sites: [
      { name: "بوابة الحكومة", url: "https://www.egypt.gov.eg", web: true },
      { name: "مصر الرقمية", url: "https://digital.gov.eg", web: true },
      { name: "مصلحة الضرائب", url: "https://www.eta.gov.eg", web: true },
      { name: "السكك الحديدية", url: "https://enr.gov.eg", web: true },
      { name: "التأمينات الاجتماعية", url: "https://www.nosi.gov.eg", web: true },
    ],
  },
  {
    group: "بثّ ورياضة",
    sites: [
      { name: "WatchIt", url: "https://www.watchit.com", web: false },
      { name: "شاهد", url: "https://shahid.mbc.net", web: false },
      { name: "TOD", url: "https://tod.tv", web: false },
    ],
  },
];

// ---------- أدوات ----------
let flashTimer;
function flash(msg) {
  const el = $("#flash");
  el.textContent = msg;
  el.classList.add("on");
  clearTimeout(flashTimer);
  flashTimer = setTimeout(() => el.classList.remove("on"), 2200);
}

async function copy(text, said) {
  try {
    await navigator.clipboard.writeText(text);
    flash(said || "نُسخ");
  } catch {
    const t = document.createElement("textarea");
    t.value = text;
    t.style.position = "fixed";
    t.style.opacity = "0";
    document.body.appendChild(t);
    t.select();
    try { document.execCommand("copy"); flash(said || "نُسخ"); }
    catch { flash("تعذّر النسخ — انسخه يدوياً"); }
    t.remove();
  }
}

function download(name, text, type) {
  const blob = new Blob([text], { type: type || "text/plain;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

const load = () => { try { return JSON.parse(localStorage.getItem(STORE) || "{}"); } catch { return {}; } };
const save = (patch) => { try { localStorage.setItem(STORE, JSON.stringify({ ...load(), ...patch })); } catch { /* وضع التصفّح الخاصّ */ } };

// ---------- التبويبات ----------
$$("nav button").forEach((btn) => {
  btn.addEventListener("click", () => {
    $$("nav button").forEach((b) => b.setAttribute("aria-selected", String(b === btn)));
    $$(".panel").forEach((p) => p.classList.toggle("on", p.id === "p-" + btn.dataset.tab));
    window.scrollTo({ top: 0, behavior: "smooth" });
    location.hash = btn.dataset.tab;
  });
});
if (location.hash) {
  const b = $(`nav button[data-tab="${location.hash.slice(1)}"]`);
  if (b) b.click();
}

// ---------- الحالة ----------
let STATUS = null;

function paintVerdict(s) {
  const v = $("#verdict");
  const set = (cls, ico, title, sub) => {
    v.className = "banner " + cls;
    v.innerHTML = `<div class="ico">${ico}</div><div><b>${title}</b><span>${sub}</span></div>`;
  };
  if (!s.gate.configured) {
    set("bad", "⚠️", "لا توجد بوّابة مصرية بعد",
      "التصفّح سيخرج من مكان نشر التطبيق، لا من مصر. اضبط <code>EGYPT_PROXY</code> — التفصيل في «دليل».");
  } else if (!s.gate.ok) {
    set("bad", "🚫", "البوّابة لا تستجيب",
      "الإعداد موجود لكنّ الاتصال فشل: " + (s.gate.error || "سبب غير معروف"));
  } else if (s.gate.inEgypt) {
    set("ok", "✅", "بوّابتك داخل مصر",
      "المواقع ستراك من مصر عند التصفّح من هنا" + (s.gate.city ? ` — ${s.gate.city}` : ""));
  } else {
    set("warn", "🟠", `البوّابة تعمل لكنّها في ${s.gate.label}`,
      "المواقع المقصورة على مصر لن تُفتح. تحتاج بوّابةً عنوانها مصريّ.");
  }
}

function paintStatus(s) {
  STATUS = s;
  $("#you-flag").textContent = s.you.flag;
  $("#you-name").textContent = s.you.label;
  $("#you-ip").textContent = [s.you.city, s.you.ip].filter(Boolean).join(" · ");

  $("#gate-flag").textContent = s.gate.ok ? s.gate.flag : "❔";
  $("#gate-name").textContent = s.gate.ok ? s.gate.label : (s.gate.configured ? "لا تستجيب" : "غير مضبوطة");
  $("#gate-ip").textContent = s.gate.ok ? [s.gate.city, s.gate.ip].filter(Boolean).join(" · ") : "";

  paintVerdict(s);

  const hint = $("#browse-hint");
  if (s.gate.ok && s.gate.inEgypt) hint.textContent = "البوّابة مصرية — تفضّل.";
  else if (s.gate.ok) hint.textContent = `تنبيه: البوّابة الآن في ${s.gate.label}، فالمواقع المقصورة على مصر ستُغلق دونك.`;
  else hint.textContent = "تنبيه: لا توجد بوّابة مصرية مضبوطة، فالتصفّح لن يظهر من مصر.";

  if (s.tunnel && s.tunnel.endpoint && !$("#ep-host").value) {
    const [h, p] = String(s.tunnel.endpoint).split(":");
    $("#ep-host").value = h || "";
    if (p) $("#ep-port").value = p;
  }
  if (s.tunnel && s.tunnel.serverKey && !$("#srv-pub").value) $("#srv-pub").value = s.tunnel.serverKey;
}

async function checkStatus() {
  const btn = $("#refresh");
  if (btn) { btn.disabled = true; btn.textContent = "جارٍ الفحص…"; }
  try {
    const r = await fetch("/api/where", { cache: "no-store" });
    paintStatus(await r.json());
  } catch (e) {
    $("#verdict").className = "banner bad";
    $("#verdict").innerHTML = `<div class="ico">📡</div><div><b>تعذّر الفحص</b><span>${e.message}</span></div>`;
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = "تحديث الفحص"; }
  }
}
$("#refresh").addEventListener("click", checkStatus);
checkStatus();

// ---------- التصفّح ----------
const proxyUrl = (u) => "/api/proxy?u=" + encodeURIComponent(/^https?:\/\//i.test(u) ? u : "https://" + u);

function browse(u) {
  const clean = String(u || "").trim();
  if (!clean) return;
  if (STATUS && (!STATUS.gate.ok || !STATUS.gate.inEgypt)) {
    const where = !STATUS.gate.configured ? "غير مضبوطة" : (STATUS.gate.ok ? STATUS.gate.label : "لا تستجيب");
    if (!confirm(`البوّابة (${where}) ليست داخل مصر، فقد لا يُفتح الموقع كما تريد.\nأفتحه على أيّ حال؟`)) return;
  }
  location.href = proxyUrl(clean);
}

$("#go-form").addEventListener("submit", (e) => {
  e.preventDefault();
  browse($("#go-url").value);
});

(function paintCatalog() {
  const box = $("#catalog");
  for (const g of CATALOG) {
    const h = document.createElement("h3");
    h.className = "grp";
    h.textContent = g.group;
    box.appendChild(h);
    const grid = document.createElement("div");
    grid.className = "sites";
    for (const s of g.sites) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "site";
      b.innerHTML = `<b></b><em></em><span class="need ${s.web ? "web" : ""}"></span>`;
      b.querySelector("b").textContent = s.name;
      b.querySelector("em").textContent = s.url.replace(/^https?:\/\//, "");
      b.querySelector(".need").textContent = s.web ? (s.note || "يفتح بالمتصفّح") : "يحتاج النفق الكامل";
      b.addEventListener("click", () => {
        if (!s.web && !confirm(`${s.name} محميّ بحقوق رقمية، والغالب أنّه لن يعمل عبر بوّابة التصفّح.\nالحلّ هو النفق الكامل.\n\nأجرّب رغم ذلك؟`)) return;
        browse(s.url);
      });
      grid.appendChild(b);
    }
    box.appendChild(grid);
  }
})();

// ---------- النفق ----------
const F = {
  host: $("#ep-host"), port: $("#ep-port"), srv: $("#srv-pub"),
  ip: $("#cli-ip"), dns: $("#dns"),
};

(function restore() {
  const s = load();
  if (s.host) F.host.value = s.host;
  if (s.port) F.port.value = s.port;
  if (s.srv) F.srv.value = s.srv;
  if (s.ip) F.ip.value = s.ip;
  if (s.dns) F.dns.value = s.dns;
  if (s.pub) showKeys(s.pub, s.via);
})();

Object.entries(F).forEach(([k, el]) => el.addEventListener("change", () => save({ [k]: el.value.trim() })));

function showKeys(pub, via) {
  $("#keys-out").style.display = "block";
  $("#cli-pub").value = pub;
  $("#keys-via").textContent = via === "js"
    ? "وُلّدت داخل جهازك (تنفيذ داخليّ)."
    : "وُلّدت داخل جهازك عبر WebCrypto.";
}

$("#gen-keys").addEventListener("click", async () => {
  const btn = $("#gen-keys");
  btn.disabled = true;
  btn.textContent = "جارٍ التوليد…";
  try {
    const k = await window.WG.generate();
    save({ priv: k.privateKey, pub: k.publicKey, via: k.via });
    showKeys(k.publicKey, k.via);
    flash("وُلّدت المفاتيح");
  } catch (e) {
    alert("تعذّر توليد المفاتيح: " + e.message);
  } finally {
    btn.disabled = false;
    btn.textContent = "ولّد مفاتيح الجوال";
  }
});

$("#clear-keys").addEventListener("click", () => {
  if (!confirm("سيُمسح المفتاح الخاصّ من هذا الجهاز، ولن يعمل النفق حتّى تولّد غيره وتحدّث الخادم. أأمسح؟")) return;
  const s = load();
  delete s.priv; delete s.pub; delete s.via;
  try { localStorage.setItem(STORE, JSON.stringify(s)); } catch {}
  $("#keys-out").style.display = "none";
  $("#conf-out").style.display = "none";
  flash("مُسحت المفاتيح");
});

function needKeys() {
  const s = load();
  if (!s.priv || !s.pub) {
    alert("ولّد مفاتيح الجوال أوّلاً (الخطوة ٢).");
    return null;
  }
  return s;
}

// سكربت الخادم: مصدرٌ واحد في المستودع، نضع فيه مفتاح الجوال
async function serverScript(pub) {
  const r = await fetch("/vpn-server-setup.sh", { cache: "no-store" });
  if (!r.ok) throw new Error("تعذّر جلب السكربت");
  const text = await r.text();
  return text.replace("__CLIENT_PUBLIC_KEY__", pub);
}

$("#dl-script").addEventListener("click", async () => {
  const s = needKeys();
  if (!s) return;
  try {
    download("vpn-server-setup.sh", await serverScript(s.pub), "text/x-shellscript;charset=utf-8");
    flash("نُزّل السكربت");
  } catch (e) {
    alert(e.message);
  }
});

$("#copy-cmd").addEventListener("click", () => {
  const s = needKeys();
  if (!s) return;
  const url = location.origin + "/vpn-server-setup.sh";
  copy(`curl -fsSL ${url} -o wg.sh && sudo CLIENT_PUBKEY='${s.pub}' bash wg.sh`, "نُسخ الأمر — نفّذه على خادم مصر");
});

function buildConf(s) {
  const host = F.host.value.trim();
  const port = (F.port.value.trim() || "51820");
  const srv = F.srv.value.trim();
  const ip = F.ip.value.trim() || "10.7.0.2/32";
  const dns = F.dns.value;

  if (!host) throw new Error("اكتب عنوان الخادم (الخطوة ٤).");
  if (!/^\d{1,5}$/.test(port) || +port < 1 || +port > 65535) throw new Error("المنفذ غير صالح.");
  if (!srv) throw new Error("اكتب المفتاح العامّ للخادم (يطبعه السكربت).");
  if (!window.WG.isValidKey(srv)) throw new Error("المفتاح العامّ للخادم غير صالح — يجب أن يكون ٤٤ محرفاً منتهياً بـ =");
  if (srv === s.pub) throw new Error("هذا مفتاح الجوال لا الخادم. مفتاح الخادم يطبعه السكربت في آخره.");
  if (!/^[\d.]+\/\d{1,2}$/.test(ip)) throw new Error("عنوان الجوال داخل النفق غير صالح (مثال: 10.7.0.2/32).");

  return `[Interface]
PrivateKey = ${s.priv}
Address = ${ip}
DNS = ${dns}

[Peer]
PublicKey = ${srv}
Endpoint = ${host}:${port}
AllowedIPs = 0.0.0.0/0, ::/0
PersistentKeepalive = 25
`;
}

$("#build").addEventListener("click", () => {
  const s = needKeys();
  if (!s) return;
  let conf;
  try { conf = buildConf(s); }
  catch (e) { alert(e.message); return; }

  save({ host: F.host.value.trim(), port: F.port.value.trim(), srv: F.srv.value.trim(), ip: F.ip.value.trim(), dns: F.dns.value });

  $("#conf-text").value = conf;
  try {
    $("#qr").innerHTML = window.QRLite.toSvg(conf, { ecl: "L", quiet: 4 });
  } catch (e) {
    $("#qr").innerHTML = `<p style="color:#900;font-size:13px;text-align:center;margin:0">تعذّر رسم الرمز: ${e.message}<br>استعمل «نزّل .conf»</p>`;
  }
  $("#conf-out").style.display = "block";
  $("#conf-out").scrollIntoView({ behavior: "smooth", block: "center" });
  flash("جاهز — امسح الرمز");
});

$("#copy-conf").addEventListener("click", () => copy($("#conf-text").value, "نُسخ الإعداد"));
$("#dl-conf").addEventListener("click", () => {
  const v = $("#conf-text").value;
  if (!v) return;
  download("masr.conf", v, "text/plain;charset=utf-8");
  flash("نُزّل الملفّ — افتحه بتطبيق WireGuard");
});

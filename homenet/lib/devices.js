"use strict";
// ============================================================
// devices.js — التعرّف على أجهزة البيت.
//
// كل طلب DNS يوصلنا ومعه عنوان IP للجهاز. عناوين IP تتغيّر،
// فنربطها بعنوان الجهاز الفيزيائي (MAC) من جدول ARP، ونعطي
// كل جهاز اسماً يختاره ولي الأمر: «آيباد سارة» بدل 192.168.1.42
// ============================================================

const fs = require("fs");
const { execFile } = require("child_process");
const store = require("./store");
const { DEVICE_HINTS } = require("./categories");

let arpTable = new Map();     // ip -> mac
let lastArp = 0;

function normMac(mac) {
  const m = String(mac || "").toLowerCase().replace(/[^0-9a-f]/g, "");
  return m.length === 12 && m !== "000000000000" ? m.match(/.{2}/g).join(":") : "";
}

function parseProcArp(text) {
  const map = new Map();
  for (const line of text.split("\n").slice(1)) {
    const parts = line.trim().split(/\s+/);
    if (parts.length < 4) continue;
    const mac = normMac(parts[3]);
    if (mac) map.set(parts[0], mac);
  }
  return map;
}

function parseArpCommand(text) {
  const map = new Map();
  const re = /\(?(\d+\.\d+\.\d+\.\d+)\)?\s+at\s+([0-9a-fA-F:]{11,17})/g;
  let m;
  while ((m = re.exec(text))) {
    const mac = normMac(m[2]);
    if (mac) map.set(m[1], mac);
  }
  // صيغة ويندوز: "  192.168.1.5   aa-bb-cc-dd-ee-ff   dynamic"
  const reWin = /(\d+\.\d+\.\d+\.\d+)\s+([0-9a-fA-F]{2}(?:-[0-9a-fA-F]{2}){5})/g;
  while ((m = reWin.exec(text))) {
    const mac = normMac(m[2]);
    if (mac) map.set(m[1], mac);
  }
  return map;
}

function refreshArp() {
  const now = Date.now();
  if (now - lastArp < 15000) return;
  lastArp = now;
  try {
    if (fs.existsSync("/proc/net/arp")) {
      arpTable = parseProcArp(fs.readFileSync("/proc/net/arp", "utf8"));
      return;
    }
  } catch { /* نجرّب الأمر */ }
  execFile("arp", ["-an"], { timeout: 3000 }, (err, stdout) => {
    if (!err && stdout) arpTable = parseArpCommand(stdout);
    else execFile("arp", ["-a"], { timeout: 3000 }, (e2, out2) => {
      if (!e2 && out2) arpTable = parseArpCommand(out2);
    });
  });
}
setInterval(refreshArp, 15000).unref();
refreshArp();

function cleanIp(ip) {
  return String(ip || "").replace(/^::ffff:/, "");
}

function deviceIdFor(ip, mac) {
  return mac ? "mac:" + mac : "ip:" + ip;
}

// نجد الجهاز أو ننشئه عند أول ظهور
function resolve(rawIp) {
  const ip = cleanIp(rawIp);
  const mac = arpTable.get(ip) || "";
  const cfg = store.getConfig();
  const id = deviceIdFor(ip, mac);
  let dev = cfg.devices[id];

  if (!dev && mac) {
    // ربما كان مسجّلاً بعنوان IP قبل أن نعرف MAC — ندمج السجلين
    const oldId = "ip:" + ip;
    if (cfg.devices[oldId]) {
      dev = cfg.devices[oldId];
      delete cfg.devices[oldId];
      dev.id = id;
      dev.mac = mac;
      cfg.devices[id] = dev;
      store.save();
    }
  }

  if (!dev) {
    dev = {
      id, ip, mac,
      name: "",
      kind: "",
      profile: cfg.settings.newDeviceProfile || "guest",
      firstSeen: Date.now(),
      lastSeen: Date.now(),
      blockedUntil: 0,
      graceUntil: 0,
      block: [], allow: [],
      isNew: true,
    };
    cfg.devices[id] = dev;
    store.save();
  }

  if (dev.ip !== ip) { dev.ip = ip; store.save(); }
  if (mac && dev.mac !== mac) { dev.mac = mac; store.save(); }
  dev.lastSeen = Date.now();
  return dev;
}

// تخمين نوع الجهاز من النطاقات التي يسألها
function learnKind(dev, domain) {
  if (dev.kind) return;
  for (const [re, label] of DEVICE_HINTS) {
    if (re.test(domain)) {
      dev.kind = label;
      store.save();
      return;
    }
  }
}

function displayName(dev) {
  if (!dev) return "غير معروف";
  return dev.name || dev.kind || dev.ip || dev.id;
}

function list() {
  const cfg = store.getConfig();
  return Object.values(cfg.devices).sort((a, b) => (b.lastSeen || 0) - (a.lastSeen || 0));
}

module.exports = { resolve, learnKind, displayName, list, refreshArp, normMac, cleanIp };

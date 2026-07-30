"use strict";
// ============================================================
// البحث عن التلفزيون في الشبكة المحلية
// الطريقة: نمسح شبكة /24 ونشوف مين فاتح منفذ 6466 (خدمة الريموت)
// ============================================================

const net = require("net");
const os = require("os");

const REMOTE_PORT = 6466;
const CONCURRENCY = 64;
const TIMEOUT_MS = 900;

// كل شبكات IPv4 المحلية اللي الجهاز متصل فيها (بدون loopback)
function localSubnets() {
  const nets = os.networkInterfaces();
  const subnets = [];
  for (const name of Object.keys(nets)) {
    for (const iface of nets[name] || []) {
      const family = typeof iface.family === "string" ? iface.family : `IPv${iface.family}`;
      if (family !== "IPv4" || iface.internal) continue;
      // نتعامل مع /24 فقط — يغطي شبكات البيوت والمكاتب الصغيرة
      const parts = iface.address.split(".");
      if (parts.length !== 4) continue;
      const prefix = parts.slice(0, 3).join(".");
      if (!subnets.includes(prefix)) subnets.push(prefix);
    }
  }
  return subnets;
}

function probe(host, port = REMOTE_PORT, timeout = TIMEOUT_MS) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let done = false;
    const finish = (ok) => {
      if (done) return;
      done = true;
      socket.destroy();
      resolve(ok);
    };
    socket.setTimeout(timeout);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
    socket.connect(port, host);
  });
}

// مسح الشبكات المحلية بالتوازي وإرجاع العناوين اللي ردّت
async function discover({ onProgress } = {}) {
  const subnets = localSubnets();
  const targets = [];
  for (const prefix of subnets) {
    for (let i = 1; i <= 254; i++) targets.push(`${prefix}.${i}`);
  }

  const found = [];
  let index = 0;
  let scanned = 0;

  async function worker() {
    while (index < targets.length) {
      const host = targets[index++];
      const ok = await probe(host);
      scanned++;
      if (ok) found.push(host);
      if (onProgress) onProgress({ scanned, total: targets.length, found: found.length });
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, targets.length) }, worker));
  return { subnets, scanned: targets.length, found: found.sort() };
}

module.exports = { discover, probe, localSubnets, REMOTE_PORT };

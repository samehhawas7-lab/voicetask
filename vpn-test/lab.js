// موقع تجريبي + نفقان (CONNECT و SOCKS5) لاختبار البوّابة محلّياً
const http = require("http"), https = require("https"), net = require("net"), fs = require("fs"), zlib = require("zlib");
const DIR = __dirname;

const PAGE = `<!doctype html><html><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'self'">
<title>موقع مصري تجريبي</title>
<link rel="stylesheet" href="/style.css">
<script src="/app.js" integrity="sha384-xxx"></script>
</head><body>
<h1>أهلاً من القاهرة</h1>
<a href="/news">الأخبار</a>
<a href="../up">فوق</a>
<a href="https://other.example.com/x?a=1&b=2">خارجي</a>
<a href="#hash">مرساة</a>
<a href="mailto:a@b.com">بريد</a>
<img src="pic.png" srcset="pic.png 1x, /pic2.png 2x">
<div style="background:url('/bg.png')"></div>
<form action="/search" method="POST"><input name="q"></form>
<style>.a{background:url(/inline.png)} @import "/more.css";</style>
</body></html>`;

function site(req, res) {
  const url = new URL(req.url, "http://x");
  if (url.pathname === "/style.css") {
    res.writeHead(200, { "content-type": "text/css" });
    return res.end(`body{background:url("/img/a.png")} @import url(/other.css);`);
  }
  if (url.pathname === "/cookie") {
    res.writeHead(200, {
      "content-type": "text/html; charset=utf-8",
      "set-cookie": ["sid=abc123; Domain=.masr.local; Path=/; HttpOnly", "lang=ar; Path=/deep"],
    });
    return res.end(`<html><body>cookie set. أرسلت لي: ${req.headers.cookie || "(لا شيء)"}</body></html>`);
  }
  if (url.pathname === "/echo") {
    let b = "";
    req.on("data", (c) => (b += c));
    return req.on("end", () => {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ method: req.method, body: b, headers: req.headers }));
    });
  }
  if (url.pathname === "/redir") {
    res.writeHead(302, { location: "/news?ok=1" });
    return res.end();
  }
  if (url.pathname === "/gz") {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8", "content-encoding": "gzip" });
    return res.end(zlib.gzipSync(Buffer.from("<html><body><a href='/deep/link'>مضغوط</a></body></html>")));
  }
  if (url.pathname === "/pic.png") {
    res.writeHead(200, { "content-type": "image/png" });
    return res.end(Buffer.from("89504e470d0a1a0a", "hex"));
  }
  res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  res.end(PAGE);
}

http.createServer(site).listen(8081);
https.createServer({ key: fs.readFileSync(DIR + "/key.pem"), cert: fs.readFileSync(DIR + "/cert.pem") }, site).listen(8443);

// --- نفق CONNECT ---
let connectHits = 0;
const cp = http.createServer((req, res) => { res.writeHead(405); res.end(); });
cp.on("connect", (req, clientSock, head) => {
  connectHits++;
  const auth = req.headers["proxy-authorization"];
  if (process.env.LAB_AUTH && auth !== "Basic " + Buffer.from(process.env.LAB_AUTH).toString("base64")) {
    clientSock.end("HTTP/1.1 407 Proxy Authentication Required\r\n\r\n");
    return;
  }
  const [host, port] = req.url.split(":");
  const up = net.connect(Number(port), host === "test.masr.local" ? "127.0.0.1" : host, () => {
    clientSock.write("HTTP/1.1 200 Connection Established\r\n\r\n");
    if (head && head.length) up.write(head);
    up.pipe(clientSock); clientSock.pipe(up);
  });
  up.on("error", () => clientSock.destroy());
  clientSock.on("error", () => up.destroy());
});
cp.listen(8082);

// --- نفق SOCKS5 ---
let socksHits = 0;
net.createServer((sock) => {
  let stage = 0;
  sock.on("data", (d) => {
    if (stage === 0) { sock.write(Buffer.from([0x05, 0x00])); stage = 1; return; }
    if (stage === 1) {
      socksHits++;
      const len = d[4];
      const host = d.slice(5, 5 + len).toString();
      const port = d.readUInt16BE(5 + len);
      const up = net.connect(port, host === "test.masr.local" ? "127.0.0.1" : host, () => {
        sock.write(Buffer.from([0x05, 0x00, 0x00, 0x01, 0, 0, 0, 0, 0, 0]));
        up.pipe(sock); sock.pipe(up);
      });
      up.on("error", () => sock.destroy());
      stage = 2;
    }
  });
  sock.on("error", () => {});
}).listen(8083);

http.createServer((req, res) => {
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify({ connectHits, socksHits }));
}).listen(8084);

console.log("lab: site 8081/8443, connect 8082, socks 8083, stats 8084");

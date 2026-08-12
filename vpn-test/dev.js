// خادم محلّي لتجربة دوالّ /api بلا نشر
const http = require("http");
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..");

const routes = {
  "/api/proxy": require(path.join(ROOT, "api/proxy.js")),
  "/api/where": require(path.join(ROOT, "api/where.js")),
};

http.createServer(async (req, res) => {
  const p = req.url.split("?")[0];
  if (routes[p]) {
    try { await routes[p](req, res); }
    catch (e) { console.error("ERR", e); res.statusCode = 500; res.end("boom: " + e.message); }
    return;
  }
  const file = path.join(ROOT, p === "/" ? "vpn.html" : p.replace(/^\/+/, ""));
  if (file.startsWith(ROOT) && fs.existsSync(file) && fs.statSync(file).isFile()) {
    const ext = path.extname(file);
    res.setHeader("content-type", { ".html": "text/html; charset=utf-8", ".js": "application/javascript; charset=utf-8", ".css": "text/css", ".sh": "text/plain; charset=utf-8" }[ext] || "application/octet-stream");
    return fs.createReadStream(file).pipe(res);
  }
  res.statusCode = 404; res.end("404 " + p);
}).listen(7788, () => console.log("dev on http://127.0.0.1:7788"));

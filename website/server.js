/**
 * Static file server — just serves the admin website's front-end files.
 * This app talks to the SHARED BACKEND over the network (see public/config.js),
 * it does not run any API itself.
 *
 * Run:  node server.js
 * Open: http://localhost:3002/
 *
 * Make sure the backend package is also running (default: http://localhost:3000)
 * — or update public/config.js to point at your deployed backend URL.
 */
const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3002;
const PUBLIC_DIR = path.join(__dirname, "public");
const MIME = {
  ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
  ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg", ".svg": "image/svg+xml",
};

const server = http.createServer((req, res) => {
  const pathname = req.url.split("?")[0];
  let filePath = path.join(PUBLIC_DIR, pathname === "/" ? "/admin.html" : pathname);
  if (!filePath.startsWith(PUBLIC_DIR)) { res.writeHead(403); return res.end("forbidden"); }
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); return res.end("not found"); }
    res.writeHead(200, { "Content-Type": MIME[path.extname(filePath)] || "application/octet-stream" });
    res.end(data);
  });
});

server.listen(PORT, () => console.log(`Admin website front-end running → http://localhost:${PORT}/`));

/**
 * Локальная отдача статики с жёстким Cache-Control, чтобы HTML/CSS/JS
 * обновлялись без путаницы (мета в index.html — не то же, что HTTP-заголовки).
 * Запуск: npm run dev
 */
const http = require("http");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const mimes = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

const noCache = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
  Pragma: "no-cache",
  Expires: "0",
};

const server = http.createServer((req, res) => {
  const urlPath = (req.url || "/").split("?")[0];
  if (urlPath === "/") {
    for (const k of Object.keys(noCache)) {
      res.setHeader(k, noCache[k]);
    }
    res.setHeader("Content-Type", mimes[".html"]);
    return fs.createReadStream(path.join(root, "index.html")).pipe(res);
  }
  const file = path.join(root, urlPath.replace(/^\//, ""));
  if (!file.startsWith(root) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    res.writeHead(404, noCache);
    res.end("Not found");
    return;
  }
  for (const k of Object.keys(noCache)) {
    res.setHeader(k, noCache[k]);
  }
  res.setHeader("Content-Type", mimes[path.extname(file).toLowerCase()] || "application/octet-stream");
  fs.createReadStream(file).pipe(res);
});

const startPort = process.env.PORT ? Number(process.env.PORT) : 8765;

const tryListen = (port) => {
  const onErr = (err) => {
    server.removeListener("error", onErr);
    if (err?.code === "EADDRINUSE" && !process.env.PORT) {
      const next = port + 1;
      if (next <= 8815) {
        return tryListen(next);
      }
    }
    console.error(err);
    process.exit(1);
  };
  server.on("error", onErr);
  server.listen(port, "127.0.0.1", () => {
    server.removeListener("error", onErr);
    if (!process.env.PORT && port !== 8765) {
      console.log(`(порт 8765 занят, поднят ${port} — открой этот URL)`);
    }
    console.log(
      `http://127.0.0.1:${port}/  (no-store; если старый сервер оставили на 8765 — закрой тот терминал или: lsof -ti:8765 | xargs kill)`,
    );
  });
};

tryListen(startPort);

/**
 * Общий тестовый static-сервер для verify-* скриптов.
 * Поднимает HTTP-сервер, отдающий файлы из корня репозитория.
 */
const http = require("http");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..", "..");
const { stripSerenitySnapshotPrefix } = require("../strip-serenity-snapshot-prefix.cjs");

const mimes = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".mp4": "video/mp4",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
};

const noCache = {
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  Pragma: "no-cache",
  Expires: "0",
};

function resolveStaticFile(urlPath) {
  let p = decodeURIComponent(urlPath.split("?")[0]);
  p = stripSerenitySnapshotPrefix(p);
  if (!p || p === "/") return path.join(root, "index.html");
  if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
  const rel = p.replace(/^\/+/, "");
  const full = path.join(root, rel);
  if (!full.startsWith(root)) return null;
  if (!fs.existsSync(full)) return null;
  const st = fs.statSync(full);
  if (st.isFile()) return full;
  if (st.isDirectory()) {
    const idx = path.join(full, "index.html");
    if (fs.existsSync(idx)) return idx;
  }
  return null;
}

/**
 * @param {number} port
 * @returns {Promise<import('http').Server>}
 */
function startStaticServer(port) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const file = resolveStaticFile(req.url || "/");
      if (!file) {
        res.writeHead(404, noCache);
        return res.end("Not found");
      }
      for (const k of Object.keys(noCache)) res.setHeader(k, noCache[k]);
      res.setHeader(
        "Content-Type",
        mimes[path.extname(file).toLowerCase()] || "application/octet-stream",
      );
      fs.createReadStream(file).pipe(res);
    });
    server.on("error", reject);
    server.listen(port, "127.0.0.1", () => resolve(server));
  });
}

module.exports = { resolveStaticFile, startStaticServer, mimes, noCache, root };

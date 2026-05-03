/**
 * Локальная отдача статики с жёстким Cache-Control, чтобы HTML/CSS/JS
 * обновлялись без путаницы (мета в index.html — не то же, что HTTP-заголовки).
 * Запуск: npm run dev
 */
const http = require("http");
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { stripSerenitySnapshotPrefix } = require("./strip-serenity-snapshot-prefix.cjs");
const { serveStaticFile } = require("./http-serve-static-file.cjs");

const root = path.resolve(__dirname, "..");

{
  const rc = spawnSync(process.execPath, [path.join(root, "scripts", "build-cases-all-data.mjs")], {
    cwd: root,
    encoding: "utf8",
  });
  if (rc.status !== 0) {
    console.error(rc.stderr || rc.stdout || "build-cases-all-data failed");
    process.exit(1);
  }
  const rp = spawnSync(process.execPath, [path.join(root, "scripts", "build-case-all-pages.mjs")], {
    cwd: root,
    encoding: "utf8",
  });
  if (rp.status !== 0) {
    console.error(rp.stderr || rp.stdout || "build-case-all-pages failed");
    process.exit(1);
  }
  const rb = spawnSync(process.execPath, [path.join(root, "scripts", "build-blog-data.mjs")], {
    cwd: root,
    encoding: "utf8",
  });
  if (rb.status !== 0) {
    console.error(rb.stderr || rb.stdout || "build-blog-data failed");
    process.exit(1);
  }
  const rba = spawnSync(process.execPath, [path.join(root, "scripts", "build-blog-article-pages.mjs")], {
    cwd: root,
    encoding: "utf8",
  });
  if (rba.status !== 0) {
    console.error(rba.stderr || rba.stdout || "build-blog-article-pages failed");
    process.exit(1);
  }
  const rbp = spawnSync(process.execPath, [path.join(root, "scripts", "build-blog-pages.mjs")], {
    cwd: root,
    encoding: "utf8",
  });
  if (rbp.status !== 0) {
    console.error(rbp.stderr || rbp.stdout || "build-blog-pages failed");
    process.exit(1);
  }
  const r = spawnSync(process.execPath, [path.join(root, "scripts", "assemble-html.cjs"), "build"], {
    cwd: root,
    encoding: "utf8",
  });
  if (r.status !== 0) {
    console.error(r.stderr || r.stdout || "assemble-html failed");
    process.exit(1);
  }
}
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
  ".mp4": "video/mp4",
};

const noCache = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
  Pragma: "no-cache",
  Expires: "0",
};

/** `/case/all`, `/case/all/` → `case/all/index.html` */
function resolveStaticFile(urlPath) {
  let p = stripSerenitySnapshotPrefix(urlPath.split("?")[0]);
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

const server = http.createServer((req, res) => {
  const urlPath = (req.url || "/").split("?")[0];
  const file = resolveStaticFile(urlPath);
  if (!file) {
    res.writeHead(404, noCache);
    res.end("Not found");
    return;
  }
  const method = (req.method || "GET").toUpperCase();
  if (method !== "GET" && method !== "HEAD") {
    res.writeHead(405, { ...noCache, Allow: "GET, HEAD" });
    res.end("Method Not Allowed");
    return;
  }
  serveStaticFile(req, res, file, { noCache, mimes });
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
  /* Не только 127.0.0.1: иначе http://localhost:… часто идёт на [::1] и браузер не подключается. */
  server.listen({ port, host: "::", ipv6Only: false }, () => {
    server.removeListener("error", onErr);
    if (!process.env.PORT && port !== 8765) {
      console.log(`(порт 8765 занят, поднят ${port} — открой этот URL)`);
    }
    console.log(
      `http://127.0.0.1:${port}/ или http://localhost:${port}/ — главная; …/case/all/ — кейсы; …/blog/ — блог`,
    );
    console.log(
      `Стили/скрипты: ссылки вида /_sa/css/... отдаются из css/... (см. strip-serenity-snapshot-prefix.cjs). Если страница без CSS — перезапусти этот процесс.`,
    );
    console.log(
      `(no-store; если старый сервер оставили на 8765 — закрой тот терминал или: lsof -ti:8765 | xargs kill)`,
    );
    console.log(
      `Видео в статьях: по умолчанию грузятся с https://serenity.agency (быстро только после деплоя там; локальные файлы — img/blog/…). Офлайн/только диск: SERENITY_BLOG_VIDEO_ORIGIN= npm run dev, затем npm run build:blog-articles`,
    );
  });
};

tryListen(startPort);

/**
 * Локальная отдача статики с жёстким Cache-Control, чтобы HTML/CSS/JS
 * обновлялись без путаницы (мета в index.html — не то же, что HTTP-заголовки).
 * Запуск: npm run dev
 *
 * Шаг `build-blog-mobile-media.mjs` тянет нативный `sharp`; на очень новых Node
 * (например v25) модуль может не собраться — тогда: `SERENITY_DEV_SKIP_BLOG_MOBILE_MEDIA=1 npm run dev`
 * или переключитесь на Node 20/22 LTS и выполните `npm rebuild sharp`.
 */
const http = require("http");
const fs = require("fs");
const os = require("os");
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
  if (process.env.SERENITY_DEV_SKIP_BLOG_MOBILE_MEDIA === "1") {
    console.warn(
      "[dev-server] Пропуск build-blog-mobile-media.mjs (SERENITY_DEV_SKIP_BLOG_MOBILE_MEDIA=1). Превью __m для блога не пересобраны.",
    );
  } else {
    const rbm = spawnSync(process.execPath, [path.join(root, "scripts", "build-blog-mobile-media.mjs")], {
      cwd: root,
      encoding: "utf8",
    });
    if (rbm.status !== 0) {
      const errText = `${rbm.stderr || ""}${rbm.stdout || ""}`;
      console.error(errText || "build-blog-mobile-media failed");
      const looksLikeSharp = /sharp|require\(\.\.\.\) is not a function|is not a function/i.test(errText);
      if (looksLikeSharp) {
        console.warn(
          "[dev-server] build-blog-mobile-media не выполнен (sharp / нативный модуль). Локальный превью __m пропущен — для полной сборки: Node 20/22 LTS + `npm rebuild sharp`, либо SERENITY_DEV_SKIP_BLOG_MOBILE_MEDIA=1.",
        );
      } else {
        console.error(
          "[dev-server] Если в логе sharp / нативный модуль: Node 20/22 LTS + `npm rebuild sharp`, либо `SERENITY_DEV_SKIP_BLOG_MOBILE_MEDIA=1 npm run dev` для превью без пересборки __m.",
        );
        process.exit(1);
      }
    }
  }
  /* Как в npm run build:html: assemble → листинг блога (убирает {{…}} в head) → статьи. */
  const ras = spawnSync(process.execPath, [path.join(root, "scripts", "assemble-html.cjs"), "build"], {
    cwd: root,
    encoding: "utf8",
  });
  if (ras.status !== 0) {
    console.error(ras.stderr || ras.stdout || "assemble-html failed");
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
  const rba = spawnSync(process.execPath, [path.join(root, "scripts", "build-blog-article-pages.mjs")], {
    cwd: root,
    encoding: "utf8",
  });
  if (rba.status !== 0) {
    console.error(rba.stderr || rba.stdout || "build-blog-article-pages failed");
    process.exit(1);
  }
}
const mimes = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
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

const custom404Path = path.join(root, "404.html");

/** IPv4 хоста в LAN (Wi‑Fi/Ethernet), не loopback — для открытия с телефона/iPad. */
function getLanIPv4Addresses() {
  const seen = new Set();
  const out = [];
  for (const entries of Object.values(os.networkInterfaces())) {
    if (!entries) continue;
    for (const iface of entries) {
      const v4 = iface.family === "IPv4" || iface.family === 4;
      if (!v4 || iface.internal || !iface.address) continue;
      if (seen.has(iface.address)) continue;
      seen.add(iface.address);
      out.push(iface.address);
    }
  }
  return out;
}

/** Порт по умолчанию сменён с 8765: меньше конфликтов со «старой» локалкой в другом терминале. Переопределение: `PORT=… npm run dev`. */
const DEFAULT_DEV_PORT = 8895;
const DEV_PORT_SCAN_MAX = DEFAULT_DEV_PORT + 50;

/** Канон услуг без слэша — как nginx на проде. */
function serviceCanonicalRedirect(pathname, rawQuery) {
  const map = {
    "/targeting/": "/targeting",
    "/kontekstnaya_reklama/": "/kontekstnaya_reklama",
  };
  const target = map[pathname];
  if (!target) return null;
  const q = rawQuery ? `?${rawQuery}` : "";
  return `${target}${q}`;
}

const server = http.createServer((req, res) => {
  const rawUrl = req.url || "/";
  const qIdx = rawUrl.indexOf("?");
  const urlPath = qIdx === -1 ? rawUrl : rawUrl.slice(0, qIdx);
  const rawQuery = qIdx === -1 ? "" : rawUrl.slice(qIdx + 1);
  const redir = serviceCanonicalRedirect(urlPath, rawQuery);
  if (redir) {
    res.writeHead(301, { ...noCache, Location: redir });
    res.end();
    return;
  }
  let file = resolveStaticFile(urlPath);
  let statusCode;
  if (!file) {
    /* Как nginx error_page 404 /404.html: неизвестный URL → тело кастомной страницы и статус 404. */
    if (fs.existsSync(custom404Path) && fs.statSync(custom404Path).isFile()) {
      file = custom404Path;
      statusCode = 404;
    } else {
      res.writeHead(404, noCache);
      res.end("Not found");
      return;
    }
  }
  const method = (req.method || "GET").toUpperCase();
  if (method !== "GET" && method !== "HEAD") {
    res.writeHead(405, { ...noCache, Allow: "GET, HEAD" });
    res.end("Method Not Allowed");
    return;
  }
  const gzipText = process.env.SERENITY_DEV_GZIP !== "0";
  serveStaticFile(req, res, file, { noCache, mimes, statusCode, gzipText });
});

const startPort = process.env.PORT ? Number(process.env.PORT) : DEFAULT_DEV_PORT;

const tryListen = (port) => {
  const onErr = (err) => {
    server.removeListener("error", onErr);
    if (err?.code === "EADDRINUSE" && !process.env.PORT) {
      const next = port + 1;
      if (next <= DEV_PORT_SCAN_MAX) {
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
    if (!process.env.PORT && port !== DEFAULT_DEV_PORT) {
      console.log(`(порт ${DEFAULT_DEV_PORT} занят, поднят ${port} — открой этот URL)`);
    }
    console.log(`Корень статики: ${root}`);
    if (!fs.existsSync(custom404Path)) {
      console.log("(в корне нет 404.html — несуществующие URL отдадут текст «Not found»)");
    }
    console.log("");
    console.log("══ Serenity static dev ══");
    console.log(`  На Mac:      http://127.0.0.1:${port}/`);
    console.log(`  Контекстная: http://127.0.0.1:${port}/kontekstnaya_reklama`);
    console.log(`  Таргетинг:   http://127.0.0.1:${port}/targeting`);
    console.log(`  (или localhost:${port} — тот же процесс)`);
    const lanIps = getLanIPv4Addresses();
    console.log("");
    if (lanIps.length) {
      console.log("  С телефона / iPad (та же Wi‑Fi, в Safari укажите :порт):");
      for (const ip of lanIps) {
        console.log(`    http://${ip}:${port}/targeting`);
        console.log(`    http://${ip}:${port}/kontekstnaya_reklama`);
      }
    } else {
      console.log(
        "  С телефона / iPad: http://<IP-Mac>:" +
          port +
          "/targeting  (IP: Системные настройки → Сеть или: ipconfig getifaddr en0)",
      );
    }
    console.log("");
    console.log(
      "В Safari в адресной строке без «:порт» открывается только порт 80 — это другой сервер, не npm run dev.",
    );
    console.log(
      `Стили/скрипты: ссылки вида /_sa/css/... отдаются из css/... (см. strip-serenity-snapshot-prefix.cjs). Если страница без CSS — перезапусти этот процесс.`,
    );
    console.log(
      "Текстовые ответы (html/css/js/…): gzip при Accept-Encoding: gzip (как на nginx). Отключить: SERENITY_DEV_GZIP=0 npm run dev",
    );
    console.log(
      `(no-store; порт занят — закрой старый dev или: lsof -ti:${DEFAULT_DEV_PORT} | xargs kill)`,
    );
    console.log(
      `Видео в статьях: по умолчанию грузятся с https://serenity.agency (быстро только после деплоя там; локальные файлы — img/blog/…). Офлайн/только диск: SERENITY_BLOG_VIDEO_ORIGIN= npm run dev, затем npm run build:blog-articles`,
    );
  });
};

tryListen(startPort);

#!/usr/bin/env node
/**
 * Локальная проверка как у `npm run dev`: `/_sa/...` → файл из корня репо + Range → 206 для Safari.
 */
const http = require("http");
const fs = require("fs");
const path = require("path");
const { stripSerenitySnapshotPrefix } = require("./strip-serenity-snapshot-prefix.cjs");
const { serveStaticFile } = require("./http-serve-static-file.cjs");

const root = path.resolve(__dirname, "..");

const mimes = {
  ".html": "text/html; charset=utf-8",
  ".mp4": "video/mp4",
};

const noCache = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
  Pragma: "no-cache",
  Expires: "0",
};

function assert(ok, msg) {
  if (!ok) throw new Error(msg);
}

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

function httpRequest(port, opts) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port,
        path: opts.path,
        method: opts.method || "GET",
        headers: opts.headers || {},
      },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: Buffer.concat(chunks),
          });
        });
      },
    );
    req.on("error", reject);
    req.end();
  });
}

(async () => {
  const slug = "sajt-na-konstruktore-protiv-polnotsennogo-sajta-kto-kogo";
  const urlPath = `/_sa/img/blog/${slug}/voice.mp4`;
  const diskPath = path.join(root, "img", "blog", slug, "voice.mp4");
  assert(fs.existsSync(diskPath), `Нет файла для проверки: ${diskPath}`);

  const port = 20400 + (process.pid % 500);
  const server = http.createServer((req, res) => {
    const p = (req.url || "/").split("?")[0];
    const file = resolveStaticFile(p);
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

  await new Promise((resolve, reject) => {
    server.listen(port, "127.0.0.1", resolve);
    server.on("error", reject);
  });

  try {
    const head = await httpRequest(port, { method: "HEAD", path: urlPath });
    assert(head.statusCode === 200, `HEAD ожидался 200, получено ${head.statusCode}`);
    assert(
      String(head.headers["content-type"] || "").includes("video/mp4"),
      `HEAD Content-Type: ожидался video/mp4, получено ${head.headers["content-type"]}`,
    );
    assert(head.headers["accept-ranges"] === "bytes", "HEAD: ожидался Accept-Ranges: bytes");
    const len = Number(head.headers["content-length"], 10);
    assert(Number.isFinite(len) && len > 1000, `HEAD Content-Length слишком мал: ${head.headers["content-length"]}`);

    const range = await httpRequest(port, {
      path: urlPath,
      headers: { Range: "bytes=0-1" },
    });
    assert(range.statusCode === 206, `Range GET ожидался 206, получено ${range.statusCode}`);
    assert(range.body.length === 2, `Тело Range 0-1: ожидалось 2 байта, ${range.body.length}`);
    assert(String(range.headers.etag || "").startsWith('"'), `Range GET: ожидался ETag, получено ${range.headers.etag}`);
    assert(
      String(range.headers["content-type"] || "").includes("video/mp4"),
      `GET Content-Type: ожидался video/mp4`,
    );
    assert(
      /^bytes 0-1\/\d+$/.test(String(range.headers["content-range"] || "")),
      `Content-Range: ожидался bytes 0-1/<size>, получено ${range.headers["content-range"]}`,
    );

    const etag = String(range.headers.etag || "");
    const range2 = await httpRequest(port, {
      path: urlPath,
      headers: { Range: "bytes=10-19", "If-Range": etag },
    });
    assert(range2.statusCode === 206, `If-Range + Range: ожидался 206, получено ${range2.statusCode}`);
    assert(range2.body.length === 10, `If-Range + Range: ожидалось 10 байт, ${range2.body.length}`);

    console.log("OK: /_sa/…mp4 HEAD 200 + Range bytes=0-1 → 206 (как у npm run dev для Safari).");
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
})().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});

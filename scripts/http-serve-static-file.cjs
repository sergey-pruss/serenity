"use strict";

const fs = require("fs");
const path = require("path");

/**
 * Safari и др. для `<video src="…mp4">` часто шлют `Range: bytes=0-1` и ждут `206` + `Content-Range`;
 * ответ `200` без диапазонов даёт плеер с длительностью 0:00.
 */
function parseByteRange(rangeHeader, size) {
  if (!rangeHeader || !/^bytes=/i.test(rangeHeader)) return null;
  const raw = rangeHeader.replace(/^bytes=/i, "").trim();
  const part = raw.split(/,\s*/)[0];
  const m = /^(\d*)-(\d*)$/.exec(part);
  if (!m) return null;
  const a = m[1];
  const b = m[2];
  if (a === "" && b === "") return null;
  if (a === "") {
    const suffix = parseInt(b, 10);
    if (!Number.isFinite(suffix) || suffix <= 0) return { error: 416 };
    const start = Math.max(0, size - suffix);
    return { start, end: size - 1 };
  }
  const start = parseInt(a, 10);
  if (!Number.isFinite(start) || start < 0 || start >= size) return { error: 416 };
  const end = b === "" ? size - 1 : parseInt(b, 10);
  if (!Number.isFinite(end) || end < start) return { error: 416 };
  return { start, end: Math.min(end, size - 1) };
}

/**
 * @param {import("http").IncomingMessage} req
 * @param {import("http").ServerResponse} res
 * @param {string} file
 * @param {{ noCache: Record<string, string>, mimes: Record<string, string> }} opts
 */
function serveStaticFile(req, res, file, opts) {
  const noCache = opts.noCache;
  const mimes = opts.mimes || {};
  const ext = path.extname(file).toLowerCase();
  const contentType = mimes[ext] || "application/octet-stream";
  let st;
  try {
    st = fs.statSync(file);
  } catch {
    res.writeHead(500, noCache);
    res.end("Stat failed");
    return;
  }
  if (!st.isFile()) {
    res.writeHead(500, noCache);
    res.end("Not a file");
    return;
  }
  const size = st.size;
  for (const k of Object.keys(noCache)) {
    res.setHeader(k, noCache[k]);
  }
  res.setHeader("Content-Type", contentType);
  res.setHeader("Accept-Ranges", "bytes");

  const method = (req.method || "GET").toUpperCase();
  const rangeSpec = parseByteRange(req.headers.range, size);

  if (rangeSpec && rangeSpec.error === 416) {
    res.setHeader("Content-Range", `bytes */${size}`);
    res.writeHead(416, noCache);
    res.end();
    return;
  }

  if (rangeSpec && "start" in rangeSpec) {
    const { start, end } = rangeSpec;
    const chunk = end - start + 1;
    res.statusCode = 206;
    res.setHeader("Content-Length", chunk);
    res.setHeader("Content-Range", `bytes ${start}-${end}/${size}`);
    if (method === "HEAD") {
      res.end();
      return;
    }
    fs.createReadStream(file, { start, end }).on("error", () => res.destroy()).pipe(res);
    return;
  }

  res.setHeader("Content-Length", size);
  if (method === "HEAD") {
    res.writeHead(200);
    res.end();
    return;
  }
  fs.createReadStream(file).on("error", () => res.destroy()).pipe(res);
}

module.exports = { parseByteRange, serveStaticFile };

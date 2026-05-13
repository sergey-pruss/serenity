"use strict";

const fs = require("fs");
const path = require("path");

/**
 * Safari и др. для `<video src="…mp4">` часто шлют `Range: bytes=0-1` и ждут `206` + `Content-Range`;
 * ответ `200` без диапазонов даёт плеер с длительностью 0:00.
 */
function fileEntityTag(stat) {
  return `"${stat.size}-${Math.floor(stat.mtimeMs / 1000)}"`;
}

/** RFC 7233: при несовпадении If-Range нужен полный 200, иначе Safari/WebKit может не собрать MP4. */
function ifRangeAllowsPartial(req, stat, etag) {
  const ir = req.headers["if-range"];
  if (!ir) return true;
  const v = String(ir).trim();
  if (v.startsWith('"') || /^W\//i.test(v)) {
    const client = v.replace(/^W\//i, "").trim();
    return client === etag;
  }
  const t = Date.parse(v);
  if (!Number.isFinite(t)) return false;
  return Math.abs(stat.mtimeMs - t) < 2000;
}

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
 * @param {{ noCache: Record<string, string>, mimes: Record<string, string>, statusCode?: number }} opts
 */
function serveStaticFile(req, res, file, opts) {
  const noCache = opts.noCache;
  const mimes = opts.mimes || {};
  const defaultStatus = opts.statusCode != null ? opts.statusCode : 200;
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
  const etag = fileEntityTag(st);
  const lastModified = st.mtime.toUTCString();

  if (ext === ".mp4") {
    res.setHeader("Cache-Control", "private, max-age=0, must-revalidate");
  } else {
    for (const k of Object.keys(noCache)) {
      res.setHeader(k, noCache[k]);
    }
  }
  res.setHeader("Content-Type", contentType);
  res.setHeader("Accept-Ranges", "bytes");
  res.setHeader("ETag", etag);
  res.setHeader("Last-Modified", lastModified);

  const method = (req.method || "GET").toUpperCase();
  let rangeSpec = parseByteRange(req.headers.range, size);
  if (rangeSpec && "start" in rangeSpec && !ifRangeAllowsPartial(req, st, etag)) {
    rangeSpec = null;
  }

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
    res.writeHead(defaultStatus);
    res.end();
    return;
  }
  if (opts.statusCode != null) res.statusCode = opts.statusCode;
  fs.createReadStream(file).on("error", () => res.destroy()).pipe(res);
}

module.exports = { parseByteRange, serveStaticFile, fileEntityTag, ifRangeAllowsPartial };

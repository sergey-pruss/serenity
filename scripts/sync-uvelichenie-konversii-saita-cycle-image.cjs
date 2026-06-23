#!/usr/bin/env node
/**
 * Скачивает иллюстрацию цикла (movie-block после «Как мы работаем») с prod /uvelichenie-konversii-saita.
 */
const fs = require("fs");
const path = require("path");
const http = require("http");
const https = require("https");

const root = path.resolve(__dirname, "..");
const origin = "https://serenity.agency";
const pageUrl = `${origin}/uvelichenie-konversii-saita`;
const outDir = path.join(root, "img", "services", "uvelichenie-konversii-saita");
const outPath = path.join(outDir, "cycle-diagram.png");

function fetchText(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith("http:") ? http : https;
    lib
      .get(url, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          const loc = res.headers.location;
          if (!loc) return reject(new Error(`redirect without location: ${url}`));
          return resolve(fetchText(new URL(loc, url).href));
        }
        if (res.statusCode !== 200) return reject(new Error(`${url} -> ${res.statusCode}`));
        let d = "";
        res.on("data", (c) => (d += c));
        res.on("end", () => resolve(d));
      })
      .on("error", reject);
  });
}

function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith("http:") ? http : https;
    lib
      .get(url, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          const loc = res.headers.location;
          if (!loc) return reject(new Error(`redirect without location: ${url}`));
          return resolve(fetchBuffer(new URL(loc, url).href));
        }
        if (res.statusCode !== 200) return reject(new Error(`${url} -> ${res.statusCode}`));
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => resolve(Buffer.concat(chunks)));
      })
      .on("error", reject);
  });
}

function pickCyclePoster(html) {
  const anchor = html.indexOf("Как мы работаем");
  const chunk = anchor >= 0 ? html.slice(anchor, anchor + 8000) : html;
  const movie = chunk.match(/component:"movie-block"[\s\S]{0,400}?poster:"([^"]+)"/);
  if (movie?.[1]) return movie[1];

  const fallback = html.match(/component:"movie-block"[\s\S]{0,400}?poster:"([^"]+)"/);
  return fallback?.[1] || null;
}

function resolvePosterUrl(poster, html) {
  if (!poster) return null;
  if (poster.startsWith("http://") || poster.startsWith("https://")) return poster;
  if (poster.startsWith("/")) return `${origin}${poster}`;
  const fromHtml = html.match(new RegExp(`/_sa/img/[^"'\\s]*${poster.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`))?.[0];
  if (fromHtml) return `${origin}${fromHtml}`;
  return `${origin}/storage/${poster}`;
}

(async () => {
  const html = await fetchText(pageUrl);
  const poster = pickCyclePoster(html);
  if (!poster) {
    console.error("Не найден poster movie-block на prod");
    process.exit(1);
  }
  const abs = resolvePosterUrl(poster, html);
  console.log("cycle:", abs);
  fs.mkdirSync(outDir, { recursive: true });
  const buf = await fetchBuffer(abs);
  fs.writeFileSync(outPath, buf);
  console.log("ok →", path.relative(root, outPath), `(${buf.length} bytes)`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

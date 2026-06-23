#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const http = require("http");
const https = require("https");

const root = path.resolve(__dirname, "..");
const origin = "https://serenity.agency";
const pageUrl = `${origin}/uvelichenie-konversii-saita`;
const outDir = path.join(root, "img", "services", "uvelichenie-konversii-saita", "cases", "darkrain");

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

function pickDarkrainCase(html) {
  const i = html.indexOf("QEVi94VE7ZxcJh7uwsem6kjJypzJR7bFT1GiBt6v.mp4");
  if (i < 0) return null;
  const chunk = html.slice(Math.max(0, i - 500), i + 1200);
  const bg = chunk.match(/background_image:"([^"]+)"/)?.[1];
  const video = chunk.match(/video:"([^"]+\.mp4)"/)?.[1];
  const link = chunk.match(/button_link:"([^"]+)"/)?.[1];
  return { bg, video, link, chunk };
}

(async () => {
  const html = await fetchText(pageUrl);
  const picked = pickDarkrainCase(html);
  if (!picked?.video) {
    console.error("Darkrain case not found on prod");
    process.exit(1);
  }
  console.log("case:", picked);
  fs.mkdirSync(outDir, { recursive: true });

  const videoUrl = `${origin}/storage/${picked.video}`;
  const bgUrl = picked.bg ? `${origin}/storage/${picked.bg}` : null;

  const videoBuf = await fetchBuffer(videoUrl);
  fs.writeFileSync(path.join(outDir, "video.mp4"), videoBuf);
  console.log("video →", path.relative(root, path.join(outDir, "video.mp4")), videoBuf.length);

  if (bgUrl) {
    const bgBuf = await fetchBuffer(bgUrl);
    const ext = path.extname(picked.bg) || ".webp";
    fs.writeFileSync(path.join(outDir, `background${ext}`), bgBuf);
    console.log("background →", path.relative(root, path.join(outDir, `background${ext}`)), bgBuf.length);
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

#!/usr/bin/env node
/**
 * Скачивает в img/ отсутствующие storage__* из /_sa/img/ в korporativnyj_sajt/index.html (legacy /storage/ на prod).
 */
const fs = require("fs");
const path = require("path");
const https = require("https");

const root = path.resolve(__dirname, "..");
const htmlPath = path.join(root, "korporativnyj_sajt", "index.html");

if (!fs.existsSync(htmlPath)) {
  console.error("Нет", htmlPath);
  process.exit(1);
}

const html = fs.readFileSync(htmlPath, "utf8");
const re = /\/_sa\/img\/(storage__[a-zA-Z0-9._-]+)/g;
const names = new Set();
let m;
while ((m = re.exec(html))) names.add(m[1]);

function download(name) {
  const file = path.join(root, "img", name);
  if (fs.existsSync(file)) return Promise.resolve(false);
  const legacy = name.replace(/^storage__/, "");
  return new Promise((resolve, reject) => {
    https
      .get(`https://serenity.agency/storage/${legacy}`, (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`${name} HTTP ${res.statusCode}`));
          return;
        }
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          fs.writeFileSync(file, Buffer.concat(chunks));
          resolve(true);
        });
      })
      .on("error", reject);
  });
}

(async () => {
  let n = 0;
  for (const name of names) {
    try {
      if (await download(name)) {
        console.log("ok", name);
        n += 1;
      }
    } catch (e) {
      console.warn("skip", name, e.message);
    }
  }
  console.log(`sync-korporativnyj-sa-images: ${n} new file(s), ${names.size} referenced`);
})();

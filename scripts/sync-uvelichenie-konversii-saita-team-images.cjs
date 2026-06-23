#!/usr/bin/env node
/**
 * Иллюстрации блока «Команда» с prod /uvelichenie-konversii-saita.
 */
const fs = require("fs");
const path = require("path");
const http = require("http");
const https = require("https");

const root = path.resolve(__dirname, "..");
const origin = "https://serenity.agency";
const outDir = path.join(root, "img", "services", "uvelichenie-konversii-saita", "team");

const members = [
  { file: "akkaunt-menedzher.webp", remote: "eq4Mx5xZMVwIEMPzJw1bktN4ue7tSqPcObv3xSlE.webp" },
  { file: "prodzhekt-menedzher.webp", remote: "j5HdHDyphz0qiWqW2F740pUUup5tU4cVFTjGmBI1.webp" },
  { file: "dizajner.webp", remote: "qQOiKQ0BSCnmkQnQiW50WxO3CJpjrqJv4NnBDLUR.webp" },
  { file: "lidery-napravlenij.webp", remote: "1kUi8YJquZgUAhU8TVMKR7tkOY8duyqpRE039Fdq.webp" },
  { file: "produkt-menedzher.webp", remote: "27qSQbGeHGIGMycAAhfSmuKI0LYDs7gJj0LRcFie.webp" },
  { file: "specialisty.webp", remote: "IpXxLUodCb3rcaftOco0Dg3yWqdbjRhaL1mU54Pk.webp" },
];

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

async function main() {
  fs.mkdirSync(outDir, { recursive: true });
  for (const { file, remote } of members) {
    const url = `${origin}/storage/${remote}`;
    const outPath = path.join(outDir, file);
    const buf = await fetchBuffer(url);
    fs.writeFileSync(outPath, buf);
    console.log("ok", file, buf.length);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

#!/usr/bin/env node
/**
 * Скачивает цепочку /_nuxt/css/*.css с prod-страницы kontekstnaya_reklama (порядок как в SSR HTML),
 * склеивает в один файл css/kontekstnaya-reklama-nuxt.bundle.css и пишет kontekstnaya_reklama/nuxt-css-manifest.json
 * с одним href (для страницы услуг — один CSS вместо десятков чанков Nuxt).
 * Временные чанки — только в tmp/, в git остаётся бандл.
 *
 * Откуда качать чанки: KONTEKST_NUXT_ORIGIN (без завершающего /), по умолчанию https://serenity.agency
 * Для локального Nuxt (SerenityAgency, npm run dev → 4333):
 *   KONTEKST_NUXT_ORIGIN=http://127.0.0.1:4333 node scripts/download-nuxt-css-prod-kontekstnaya.cjs
 */
const fs = require("fs");
const path = require("path");
const http = require("http");
const https = require("https");

const root = path.resolve(__dirname, "..");
const fullHtmlPath = path.join(root, "tmp", "kontekst-prod-full.html");
const chunkDir = path.join(root, "tmp", "nuxt-kontekstnaya-css-chunks");
const bundlePath = path.join(root, "css", "kontekstnaya-reklama-nuxt.bundle.css");
const manifestPath = path.join(root, "kontekstnaya_reklama", "nuxt-css-manifest.json");
const BUNDLE_HREF = "/_sa/css/kontekstnaya-reklama-nuxt.bundle.css";

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const u = new URL(url);
    const lib = u.protocol === "http:" ? http : https;
    lib
      .get(url, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          const loc = res.headers.location;
          file.close();
          fs.unlink(dest, () => {});
          if (!loc) return reject(new Error("redirect without location"));
          return resolve(download(new URL(loc, url).href, dest));
        }
        if (res.statusCode !== 200) {
          file.close();
          fs.unlink(dest, () => {});
          return reject(new Error(`${url} -> ${res.statusCode}`));
        }
        res.pipe(file);
        file.on("finish", () => file.close((e) => (e ? reject(e) : resolve())));
      })
      .on("error", (err) => {
        try {
          file.close();
          fs.unlink(dest, () => {});
        } catch (_) {}
        reject(err);
      });
  });
}

(async () => {
  if (!fs.existsSync(fullHtmlPath)) {
    console.error("Нет", fullHtmlPath, "— сначала: node scripts/capture-prod-kontekst-full-html.cjs");
    process.exit(1);
  }
  const origin = (process.env.KONTEKST_NUXT_ORIGIN || "https://serenity.agency").replace(/\/$/, "");
  const full = fs.readFileSync(fullHtmlPath, "utf8");
  const order = [];
  for (const m of full.matchAll(/href="(\/_nuxt\/css\/[^"]+\.css)"/g)) {
    if (!order.includes(m[1])) order.push(m[1]);
  }
  if (!order.length) {
    console.error("В HTML не найдено link /_nuxt/css/*.css");
    process.exit(1);
  }
  fs.mkdirSync(chunkDir, { recursive: true });
  const chunkNames = [];
  for (const rel of order) {
    const name = path.basename(rel);
    const dest = path.join(chunkDir, name);
    const url = `${origin}${rel}`;
    await download(url, dest);
    chunkNames.push(name);
    console.log("ok", name, "<-", url);
  }
  const parts = chunkNames.map((name) => {
    const css = fs.readFileSync(path.join(chunkDir, name), "utf8");
    return `/* nuxt-prod chunk: ${name} */\n${css}`;
  });
  fs.mkdirSync(path.dirname(bundlePath), { recursive: true });
  fs.writeFileSync(bundlePath, `${parts.join("\n\n")}\n`, "utf8");
  fs.rmSync(chunkDir, { recursive: true, force: true });

  const payload = {
    generated: new Date().toISOString(),
    hrefs: [BUNDLE_HREF],
    sourceChunks: chunkNames,
    nuxtOrigin: origin,
  };
  fs.writeFileSync(manifestPath, JSON.stringify(payload, null, 2), "utf8");
  console.log("wrote", bundlePath, "bytes", fs.statSync(bundlePath).size);
  console.log("wrote", manifestPath, "single href + sourceChunks", chunkNames.length);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

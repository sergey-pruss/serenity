#!/usr/bin/env node
/**
 * Скачивает /_nuxt/css/*.css со страницы /services/marketing, склеивает в css/marketing-nuxt.bundle.css.
 */
const fs = require("fs");
const path = require("path");
const http = require("http");
const https = require("https");

const root = path.resolve(__dirname, "..");
const fullHtmlPath = path.join(root, "tmp", "marketing-prod-full.html");
const chunkDir = path.join(root, "tmp", "nuxt-marketing-css-chunks");
const bundlePath = path.join(root, "css", "marketing-nuxt.bundle.css");
const manifestPath = path.join(root, "services", "marketing", "nuxt-css-manifest.json");
const BUNDLE_HREF = "/_sa/css/marketing-nuxt.bundle.css";

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
    console.error("Нет", fullHtmlPath, "— сначала capture-prod-marketing-full-html.cjs");
    process.exit(1);
  }
  const html = fs.readFileSync(fullHtmlPath, "utf8");
  const hrefs = [...html.matchAll(/href="(\/_nuxt\/css\/[^"]+\.css)"/g)].map((m) => m[1]);
  const unique = [...new Set(hrefs)];
  if (!unique.length) {
    console.error("CSS chunks не найдены в capture");
    process.exit(1);
  }
  fs.mkdirSync(chunkDir, { recursive: true });
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  const origin = process.env.MARKETING_NUXT_ORIGIN || "https://serenity.agency";
  const parts = [];
  for (let i = 0; i < unique.length; i++) {
    const href = unique[i];
    const url = `${origin}${href}`;
    const dest = path.join(chunkDir, `chunk-${i}.css`);
    console.log("download", url);
    await download(url, dest);
    parts.push(fs.readFileSync(dest, "utf8"));
  }
  const bundle = parts.join("\n");
  fs.writeFileSync(bundlePath, bundle, "utf8");
  fs.writeFileSync(
    manifestPath,
    JSON.stringify({ hrefs: [BUNDLE_HREF], sourceHrefs: unique }, null, 2),
    "utf8",
  );
  console.log("wrote", bundlePath, "bytes", bundle.length);
  console.log("wrote", manifestPath);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

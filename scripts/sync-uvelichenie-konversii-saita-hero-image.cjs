#!/usr/bin/env node
/**
 * Скачивает hero-картинку для /uvelichenie-konversii-saita с prod (фон jumbotron или case-slider).
 */
const fs = require("fs");
const path = require("path");
const http = require("http");
const https = require("https");

const root = path.resolve(__dirname, "..");
const origin = "https://serenity.agency";
const pageUrl = `${origin}/uvelichenie-konversii-saita`;
const outDir = path.join(root, "img", "services", "uvelichenie-konversii-saita");
const outHero = path.join(outDir, "hero.webp");
const outOg = path.join(outDir, "og.webp");

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

function resolveImageUrl(raw, html) {
  if (!raw || raw === "undefined") return null;
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  if (raw.startsWith("/")) return `${origin}${raw}`;
  if (raw.startsWith("storage__")) return `${origin}/_sa/img/${raw}`;
  if (/\.(webp|png|jpe?g)$/i.test(raw)) {
    const fromHtml = html.match(new RegExp(`/_sa/img/[^"'\\s]*${raw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`))?.[0];
    if (fromHtml) return `${origin}${fromHtml}`;
    const candidates = [
      `${origin}/storage/${raw}`,
      `${origin}/_sa/img/storage__${raw}`,
      `${origin}/_sa/img/services/uvelichenie-konversii-saita/${raw}`,
      `${origin}/img/${raw}`,
    ];
    return candidates[0];
  }
  const fromHtml = html.match(new RegExp(`/_sa/img/[^"']*${raw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`))?.[0];
  return fromHtml ? `${origin}${fromHtml}` : null;
}

function pickHeroUrl(html) {
  const collage = html.match(/case-slider-slide__media[\s\S]{0,1200}?src="([^"]+)"/i)?.[1];
  if (collage) return collage.startsWith("http") ? collage : `${origin}${collage}`;

  const bgMatches = [...html.matchAll(/background-image:\s*url\((?:&quot;|"|')?([^"')&]+)/gi)].map((m) => m[1]);
  for (const bg of bgMatches) {
    const bgUrl = resolveImageUrl(bg, html);
    if (bgUrl && !bgUrl.includes("undefined")) return bgUrl;
  }

  const storage = html.match(/\/_sa\/img\/(storage__[^"']+\.(?:webp|png|jpe?g))/i)?.[1];
  if (storage) return `${origin}/_sa/img/${storage}`;

  const cardChunk = html.match(/href="\/uvelichenie-konversii-saita"[\s\S]{0,3000}/i)?.[0];
  if (cardChunk) {
    const cardImg = cardChunk.match(/src="(\/_sa\/img\/services\/[^"]+)"/i)?.[1];
    if (cardImg) return `${origin}${cardImg}`;
  }

  if (fs.existsSync(path.join(root, "services", "index.html"))) {
    const servicesHtml = fs.readFileSync(path.join(root, "services", "index.html"), "utf8");
    const localChunk = servicesHtml.match(/href="\/uvelichenie-konversii-saita"[\s\S]{0,3000}/i)?.[0];
    if (localChunk) {
      const localImg = localChunk.match(/src="(\/_sa\/img\/services\/[^"]+)"/i)?.[1];
      if (localImg) return `${origin}${localImg}`;
    }
  }

  return null;
}

(async () => {
  const html = await fetchText(pageUrl);
  const heroUrl = pickHeroUrl(html);
  if (!heroUrl) {
    console.error("Не найден URL hero на prod");
    process.exit(1);
  }
  const abs = heroUrl.startsWith("http") ? heroUrl : `${origin}${heroUrl}`;
  console.log("hero:", abs);
  fs.mkdirSync(outDir, { recursive: true });
  const buf = await fetchBuffer(abs);
  fs.writeFileSync(outHero, buf);
  if (!fs.existsSync(outOg)) {
    fs.copyFileSync(outHero, outOg);
  }
  console.log("ok →", path.relative(root, outHero));
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

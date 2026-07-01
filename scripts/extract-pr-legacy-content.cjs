#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

async function main() {
  const html = await (await fetch("https://serenity.agency/pr")).text();
  fs.writeFileSync(path.join(__dirname, "pr-legacy-snapshot.html"), html, "utf8");

  const nuxtMatch = html.match(/window\.__NUXT__=\(function\([^)]*\)\{return ([\s\S]+?)\}\([^)]*\)\);/);
  if (nuxtMatch) {
    const raw = nuxtMatch[1];
    fs.writeFileSync(path.join(__dirname, "pr-legacy-nuxt-raw.txt"), raw.slice(0, 500000), "utf8");
  }

  const cases = [];
  for (const m of html.matchAll(/cases-block__swiper-slide-title[^>]*>([^<]+)/g)) {
    cases.push(m[1].trim());
  }
  console.log("case titles:", cases);

  const slideDescs = [];
  for (const m of html.matchAll(/cases-block__swiper-slide-description[^>]*>([^<]+)/g)) {
    slideDescs.push(m[1].trim().slice(0, 120));
  }
  console.log("case descs count:", slideDescs.length);

  const blockNames = [];
  for (const m of html.matchAll(/class="block__name"[^>]*>([^<]+)/g)) {
    blockNames.push(m[1].replace(/&nbsp;/g, " ").trim());
  }
  console.log("block names:", blockNames.slice(0, 30));

  const imgs = [...new Set([...html.matchAll(/\/storage\/([A-Za-z0-9_-]+\.(?:webp|png|jpg|mp4))/g)].map((m) => m[1]))];
  console.log("storage files:", imgs.slice(0, 40));
}

main().catch(console.error);

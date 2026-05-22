#!/usr/bin/env node
/**
 * Ссылки в теле /services/marketing (MARKETING-MAIN): без абсолютных prod URL, якоря #, HTTP.
 */
const fs = require("fs");
const path = require("path");
const http = require("http");
const https = require("https");
const cheerio = require("cheerio");

const root = path.resolve(__dirname, "..");
const indexPath = path.join(root, "services/marketing/index.html");

const MAIN_START = "<!-- MARKETING-MAIN-START -->";
const MAIN_END = "<!-- MARKETING-MAIN-END -->";

const STATIC_LOCAL_OK = new Set([
  "/services",
  "/targeting",
  "/kontekstnaya_reklama",
  "/case/all",
  "/case/all/",
  "/content-strategy",
  "/kontekstnaya_reklama",
]);

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function fetchStatus(url, timeout = 15000) {
  return new Promise((resolve) => {
    const lib = url.startsWith("https") ? https : http;
    const req = lib.get(url, { timeout, headers: { "User-Agent": "verify-marketing-links" } }, (res) => {
      res.resume();
      resolve(res.statusCode || 0);
    });
    req.on("error", () => resolve(0));
    req.on("timeout", () => {
      req.destroy();
      resolve(0);
    });
  });
}

function extractMainLinks(html) {
  const s = html.indexOf(MAIN_START);
  const e = html.indexOf(MAIN_END);
  assert(s >= 0 && e > s, "маркеры MARKETING-MAIN");
  const $ = cheerio.load(html.slice(s, e));
  const links = [];
  $("a[href]").each((_, el) => {
    links.push({
      href: $(el).attr("href"),
      text: $(el).text().replace(/\s+/g, " ").trim(),
    });
  });
  return { mainHtml: html.slice(s, e), links };
}

async function run() {
  const html = fs.readFileSync(indexPath, "utf8");
  const { mainHtml, links } = extractMainLinks(html);

  const absProd = links.filter((l) => l.href.startsWith("https://serenity.agency/"));
  assert(
    absProd.length === 0,
    `в MAIN не должно быть абсолютных serenity.agency (найдено ${absProd.length})`,
  );

  assert(mainHtml.includes('href="/kontekstnaya_reklama"'), "ссылка на kontekstnaya_reklama");

  const prodBase = process.env.MARKETING_LINK_PROD_ORIGIN || "https://serenity.agency";
  const localBase = process.env.MARKETING_LINK_LOCAL_ORIGIN || "http://127.0.0.1:8895";
  const seen = new Set();
  const prodFails = [];
  const localFails = [];

  for (const { href, text } of links) {
    const key = `${href}\0${text}`;
    if (seen.has(key)) continue;
    seen.add(key);

    if (href.startsWith("#")) {
      assert(mainHtml.includes(`id="${href.slice(1)}"`), `якорь ${href} (${text})`);
      continue;
    }

    const pathOnly = href.split("#")[0] || href;
    const skipProdHttp =
      pathOnly.startsWith("/case/") && pathOnly !== "/case/all" && pathOnly !== "/case/all/";
    if (!skipProdHttp) {
      const prodUrl = href.startsWith("http") ? href : `${prodBase}${href}`;
      const prodStatus = await fetchStatus(prodUrl);
      if (!(prodStatus >= 200 && prodStatus < 400)) {
        prodFails.push({ href, text, status: prodStatus });
      }
    }

    const isStaticLocal =
      STATIC_LOCAL_OK.has(pathOnly) ||
      pathOnly.startsWith("/services#") ||
      (pathOnly === "/services" && href.includes("#"));
    if (isStaticLocal) {
      const localUrl = `${localBase}${href}`;
      const localStatus = await fetchStatus(localUrl);
      if (!(localStatus >= 200 && localStatus < 400)) {
        localFails.push({ href, text, status: localStatus });
      }
    }
  }

  assert(prodFails.length === 0, `prod HTTP:\n${prodFails.map((f) => `  ${f.status} ${f.href} (${f.text})`).join("\n")}`);
  if (process.env.SKIP_MARKETING_LINK_LOCAL === "1") {
    console.log(`verify-marketing-links: ok (${seen.size} ссылок, local skip)`);
    return;
  }
  assert(
    localFails.length === 0,
    `local static HTTP (запустите npm run dev или SKIP_MARKETING_LINK_LOCAL=1):\n${localFails.map((f) => `  ${f.status} ${f.href} (${f.text})`).join("\n")}`,
  );

  console.log(`verify-marketing-links: ok (${seen.size} уникальных ссылок, prod ${prodBase})`);
}

run().catch((e) => {
  console.error("verify-marketing-links:", e.message || e);
  process.exit(1);
});

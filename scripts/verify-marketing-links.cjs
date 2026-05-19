#!/usr/bin/env node
/**
 * Ссылки в теле /services/marketing (MARKETING-MAIN): якоря, канон href, HTTP на prod.
 * Локально legacy (/services/seo, /case/…) отдаёт 404 — это норма статического dev.
 */
const fs = require("fs");
const path = require("path");
const http = require("http");
const https = require("https");
const cheerio = require("cheerio");

const root = path.resolve(__dirname, "..");
const indexPath = path.join(root, "services/marketing/index.html");
const servicesPath = path.join(root, "services/index.html");

const MAIN_START = "<!-- MARKETING-MAIN-START -->";
const MAIN_END = "<!-- MARKETING-MAIN-END -->";

const EXPECTED_BY_TEXT = {
  "Cтратегия": "/services#services-strategy",
  Бренд: "/services#services-branding",
  "Измеримое продвижение": "/services#services-promotion",
  Сайт: "/services#services-sites",
  "Контент-стратегия": "/content-strategy",
  "Контекстная реклама": "/kontekstnaya_reklama",
  "Таргетинг в соцсетях": "/targeting",
  "Контент-маркетинг": "/services/content",
  SMM: "/services/smm",
  SEO: "/services/seo",
  Продажи: "/services/salesmarketing",
  "Бренд-стратегия": "/services/strategy",
};

const DIAGRAM_ANCHORS = {
  "Маркетинговая стратегия": "#marketing-strategy",
  Бренд: "#marketing-branding",
  "Измеримое продвижение": "#marketing-promotion",
  Продажи: "#marketing-sales",
};

const STATIC_LOCAL_OK = new Set([
  "/services",
  "/targeting",
  "/kontekstnaya_reklama",
  "/case/all",
  "/case/all/",
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
  const servicesHtml = fs.readFileSync(servicesPath, "utf8");
  const { mainHtml, links } = extractMainLinks(html);

  const absProd = links.filter((l) => l.href.startsWith("https://serenity.agency/"));
  assert(
    absProd.length === 0,
    `в MAIN не должно быть абсолютных serenity.agency (найдено ${absProd.length}: ${absProd.map((l) => l.href).join(", ")})`,
  );

  for (const [text, href] of Object.entries(DIAGRAM_ANCHORS)) {
    const found = links.find((l) => l.text === text || l.text.startsWith(text));
    if (found) {
      assert(found.href === href, `диаграмма «${text}»: ожидали ${href}, есть ${found.href}`);
    }
  }

  for (const [text, href] of Object.entries(EXPECTED_BY_TEXT)) {
    const found = links.filter((l) => l.text === text);
    for (const l of found) {
      if (l.href.startsWith("#")) continue;
      assert(l.href === href, `«${text}» → ожидали ${href}, есть ${l.href}`);
    }
  }

  for (const id of [
    "marketing-strategy",
    "marketing-branding",
    "marketing-promotion",
    "marketing-sales",
  ]) {
    assert(mainHtml.includes(`id="${id}"`), `якорь #${id} в MAIN`);
  }

  for (const id of ["services-strategy", "services-branding", "services-promotion", "services-sites"]) {
    assert(servicesHtml.includes(`id="${id}"`), `якорь ${id} на /services`);
  }

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

    const prodUrl = href.startsWith("http") ? href : `${prodBase}${href}`;
    const prodStatus = await fetchStatus(prodUrl);
    if (!(prodStatus >= 200 && prodStatus < 400)) {
      prodFails.push({ href, text, status: prodStatus });
    }

    const pathOnly = href.split("#")[0] || href;
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
  assert(
    localFails.length === 0,
    `local static HTTP (запустите npm run dev):\n${localFails.map((f) => `  ${f.status} ${f.href} (${f.text})`).join("\n")}`,
  );

  console.log(`verify-marketing-links: ok (${seen.size} уникальных ссылок, prod ${prodBase})`);
}

run().catch((e) => {
  console.error("verify-marketing-links:", e.message || e);
  process.exit(1);
});

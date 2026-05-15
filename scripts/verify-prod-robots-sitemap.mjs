#!/usr/bin/env node
/**
 * Сетевые проверки /robots.txt и /sitemap.xml на выбранных origin (пост-деплой, GSC-инварианты).
 * Превью static.serenity.agency: при HTTP 401 (gate) проверки пропускаются.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STATIC_PREVIEW_HOST = "static.serenity.agency";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function readProdRobotsSnippet() {
  const p = path.join(__dirname, "..", "robots.production.txt");
  return fs.readFileSync(p, "utf8");
}

function readStaticPreviewRobots() {
  const p = path.join(__dirname, "..", "robots.static-preview.txt");
  return fs.readFileSync(p, "utf8");
}

/**
 * @param {{ origins?: string[] }} [opts]
 */
export async function verifyProdRobotsSitemap(opts = {}) {
  const defaultOrigins = [
    "https://serenity.agency",
    "https://serenity.sergeyprus.workers.dev",
    "https://static.serenity.agency",
  ];
  const origins = opts.origins?.length ? opts.origins : defaultOrigins;
  const prodExpected = readProdRobotsSnippet();
  assert(
    prodExpected.includes("Sitemap: https://serenity.agency/sitemap.xml") &&
      !prodExpected.includes("Disallow: /docs/"),
    "robots.production.txt: Sitemap на проде; Disallow: /docs/ не нужен (docs/ только на dev).",
  );
  const previewExpected = readStaticPreviewRobots();
  assert(/^\s*Disallow:\s*\/\s*$/m.test(previewExpected), "robots.static-preview.txt: Disallow: /");

  for (const origin of origins) {
    const host = new URL(origin).hostname;
    const isStaticPreview = host === STATIC_PREVIEW_HOST;

    const robotsUrl = new URL("/robots.txt", origin).href;
    const robotsRes = await fetch(robotsUrl, { redirect: "follow" });
    if (robotsRes.status === 401 && isStaticPreview) {
      console.log(`SKIP robots+sitemap ${origin}: HTTP 401 (gate на static-превью)`);
      continue;
    }
    assert(robotsRes.ok, `${robotsUrl}: HTTP ${robotsRes.status}`);
    const robotsBody = await robotsRes.text();

    if (isStaticPreview) {
      assert(
        /^\s*Disallow:\s*\/\s*$/m.test(robotsBody),
        `${robotsUrl}: на static-превью ожидается Disallow: / (не прод-robots)`,
      );
    } else {
      assert(
        !robotsBody.includes("Disallow: /docs/"),
        `${robotsUrl}: не должно быть Disallow: /docs/ (docs/ не на проде)`,
      );
      assert(
        robotsBody.includes("Sitemap: https://serenity.agency/sitemap.xml"),
        `${robotsUrl}: нет строки Sitemap на канонический sitemap.xml`,
      );
    }

    const sitemapUrl = new URL("/sitemap.xml", origin).href;
    const smRes = await fetch(sitemapUrl, { redirect: "follow" });
    if (smRes.status === 401 && isStaticPreview) {
      console.log(`SKIP sitemap ${sitemapUrl}: HTTP 401 (gate)`);
      continue;
    }
    assert(smRes.ok, `${sitemapUrl}: HTTP ${smRes.status}`);
    const ct = (smRes.headers.get("content-type") || "").toLowerCase();
    assert(
      ct.includes("xml") || ct.includes("text"),
      `${sitemapUrl}: неожиданный Content-Type: ${ct}`,
    );
    const xml = await smRes.text();
    assert(
      xml.includes("urlset") && xml.includes("<loc>"),
      `${sitemapUrl}: тело не похоже на sitemap (urlset/loc)`,
    );
    console.log(`OK robots+sitemap ${origin}`);
  }
}

const isMain = process.argv[1]?.endsWith("verify-prod-robots-sitemap.mjs");
if (isMain) {
  const extra = process.env.VERIFY_ROBOTS_ORIGINS?.split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((o) => (o.startsWith("http") ? o : `https://${o}`));
  verifyProdRobotsSitemap({ origins: extra?.length ? extra : undefined })
    .then(() => {
      console.log("verify-prod-robots-sitemap: OK");
    })
    .catch((e) => {
      console.error(e.stack || e.message);
      process.exit(1);
    });
}

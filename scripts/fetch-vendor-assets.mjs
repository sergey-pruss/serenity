/**
 * Выгружает с прода CSS (из publish/index.html) и шрифты в public/,
 * переписывает url() на локальные пути. Без Nuxt JS в браузере — только статика.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const publishPath = path.join(root, "publish", "index.html");
const vendorDir = path.join(root, "public", "vendor", "prod");
const fontsDir = path.join(root, "public", "fonts");
const manifestPath = path.join(root, "public", "vendor", "manifest.json");

const UA =
  "Mozilla/5.0 (compatible; serenity-static-vendor/1.0; +https://serenity.agency)";

const ORIGIN = "https://serenity.agency";

/** Если нет publish — минимум шрифтов Hero (как на проде) */
const FALLBACK_FONTS = [
  `${ORIGIN}/fonts/HeroNew-Regular.woff`,
  `${ORIGIN}/fonts/HeroNew-Medium.woff`,
  `${ORIGIN}/fonts/HeroNew-Bold.woff`,
];

async function fetchBuf(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

function extractStylesheetUrls(html) {
  const out = new Set();
  /** Только `rel="stylesheet"`, без `preload as=style` — иначе дубли */
  const re =
    /<link\b[^>]*\brel=["']stylesheet["'][^>]*\bhref=(["'])(https:\/\/serenity\.agency\/_nuxt\/css\/[^"'?]+\.css)\1/gi;
  let m;
  while ((m = re.exec(html))) out.add(m[2]);
  return [...out];
}

function extractFontUrls(html) {
  const out = new Set();
  const re =
    /href=(["'])(https:\/\/serenity\.agency\/fonts\/[^"'?]+\.(?:woff2?|ttf|otf))\1/gi;
  let m;
  while ((m = re.exec(html))) out.add(m[2]);
  return [...out];
}

function rewriteCssUrls(css) {
  let s = css;
  s = s.replace(/https:\/\/serenity\.agency\//g, "/");
  s = s.replace(/http:\/\/serenity\.agency\//g, "/");
  return s;
}

async function downloadFont(url) {
  const name = path.basename(url.split("?")[0]);
  const dest = path.join(fontsDir, name);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const buf = await fetchBuf(url);
  fs.writeFileSync(dest, buf);
  return `/fonts/${name}`;
}

async function main() {
  fs.mkdirSync(vendorDir, { recursive: true });
  fs.mkdirSync(fontsDir, { recursive: true });

  let html = "";
  if (fs.existsSync(publishPath) && fs.statSync(publishPath).size > 2048) {
    html = fs.readFileSync(publishPath, "utf8");
  }

  const cssUrls = html ? extractStylesheetUrls(html) : [];
  const fontUrlsFromHtml = html ? extractFontUrls(html) : [];
  const fontUrls = [...new Set([...fontUrlsFromHtml, ...FALLBACK_FONTS])];

  const stylesheets = [];

  for (const url of cssUrls) {
    const base = path.basename(url.split("?")[0]);
    const dest = path.join(vendorDir, base);
    let text = (await fetchBuf(url)).toString("utf8");
    text = rewriteCssUrls(text);
    fs.writeFileSync(dest, text, "utf8");
    stylesheets.push(`/vendor/prod/${base}`);
    console.log("css", base);
  }

  const fonts = [];
  for (const url of fontUrls) {
    try {
      const href = await downloadFont(url);
      fonts.push(href);
      console.log("font", path.basename(url));
    } catch (e) {
      console.warn("font skip:", url, e.message);
    }
  }

  const manifest = {
    stylesheets,
    fonts,
    generatedAt: new Date().toISOString(),
  };
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf8");
  console.log("OK manifest →", path.relative(root, manifestPath));
  if (!cssUrls.length) {
    console.warn(
      "Нет publish/index.html или в нём нет ссылок на _nuxt/css — CSS не скачан. Добавьте снимок: npm run capture:home && npm run fix:publish",
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

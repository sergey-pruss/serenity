#!/usr/bin/env node
/**
 * Собирает автономную папку `standalone/` для разработки без Astro:
 *   standalone/index.html  +  standalone/site/  (копия public/)
 *
 * Нужен снимок с локальными URL: npm run capture:home && npm run fix:publish && npm run freeze:publish
 *
 * STRIP_TRACKERS=1 — убрать сторонние счётчики (см. asset-urls.mjs).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { stripMirrorTrackers } from "./asset-urls.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const frozenPath = path.join(root, "publish", "index.frozen.html");
const publicDir = path.join(root, "public");
const outRoot = path.join(root, "standalone");
const siteDir = path.join(outRoot, "site");
const phase1Css = path.join(root, "assets", "phase1-overrides.css");

const MIN_BYTES = 2048;

/**
 * fix:publish вставляет `serenity-mirror-band`, который скрывает спейсеры над
 * «Мы любим маркетинг» (как на зеркале). Для standalone восстанавливаем высоты из бандла Nuxt.
 */
const STANDALONE_LIVE_MARKETING_GAP =
  '<style id="standalone-live-marketing-gap" data-serenity-standalone="1">' +
  ".live-marketing-block-wr .component-block__top-element-big{" +
  "display:block!important;height:100px!important;margin:0!important;padding:0!important;" +
  "border:0!important;overflow:visible!important}" +
  "@media screen and (max-width:550px){" +
  ".live-marketing-block-wr .component-block__top-element-big{height:44px!important}" +
  "}" +
  ".live-marketing-block-wr .component-block__top-element-last{" +
  "display:block!important;height:1px!important;margin:0!important;padding:0!important;" +
  "border:0!important;overflow:visible!important}" +
  "</style>";

function injectBeforeHeadEnd(html, fragment) {
  return html.replace(/<\/head>/i, `${fragment}</head>`);
}

/** На статике hero-видео может остаться opacity:0 или iframe не грузится с lazy */
function eagerVimeoIframes(html) {
  return html.replace(/<iframe\b[^>]*>/gi, (tag) => {
    if (!tag.includes("player.vimeo.com")) return tag;
    return tag.replace(/\sloading=["']lazy["']/gi, ' loading="eager"');
  });
}

function rewriteHtml(html) {
  let h = html;
  h = h.replace(/<base\b[^>]*>\s*/gi, "");

  h = h.replace(
    /__webpack_public_path__\s*=\s*JSON\.stringify\(\s*["']\/_nuxt\/["']\s*\)/g,
    '__webpack_public_path__=JSON.stringify("./site/_nuxt/")',
  );
  h = h.replace(
    /__webpack_public_path__\s*=\s*["']\/_nuxt\/["']/g,
    '__webpack_public_path__="./site/_nuxt/"',
  );

  const attrRe = /\b(href|src|content)=(["'])\/([^"'>\s]+)\2/gi;
  h = h.replace(attrRe, (full, attr, q, p) => {
    if (p.startsWith("/")) return full;
    return `${attr}=${q}./site/${p}${q}`;
  });

  h = h.replace(/url\(\s*\/(?!\/)/gi, "url(./site/");
  h = eagerVimeoIframes(h);
  return h;
}

function main() {
  if (!fs.existsSync(frozenPath) || fs.statSync(frozenPath).size < MIN_BYTES) {
    console.error(
      "Нет publish/index.frozen.html. Выполни: npm run capture:home && npm run fix:publish && npm run freeze:publish",
    );
    process.exit(1);
  }
  if (!fs.existsSync(publicDir)) {
    console.error("Нет папки public/");
    process.exit(1);
  }

  let html = fs.readFileSync(frozenPath, "utf8");
  if (process.env.STRIP_TRACKERS === "1") html = stripMirrorTrackers(html);
  html = rewriteHtml(html);
  html = injectBeforeHeadEnd(html, STANDALONE_LIVE_MARKETING_GAP);

  fs.rmSync(outRoot, { recursive: true, force: true });
  fs.mkdirSync(outRoot, { recursive: true });
  fs.cpSync(publicDir, siteDir, { recursive: true });

  if (fs.existsSync(phase1Css)) {
    const cssDir = path.join(siteDir, "css");
    fs.mkdirSync(cssDir, { recursive: true });
    const phase1Out = path.join(cssDir, "phase1-overrides.css");
    fs.copyFileSync(phase1Css, phase1Out);
    const phase1V = Math.floor(fs.statSync(phase1Out).mtimeMs / 1000);
    html = injectBeforeHeadEnd(
      html,
      `<link rel="stylesheet" href="./site/css/phase1-overrides.css?v=${phase1V}">`,
    );
  }

  fs.writeFileSync(path.join(outRoot, "index.html"), html, "utf8");
  console.log("OK:", path.relative(root, outRoot) + "/index.html");
  console.log("Смотреть: npx serve standalone -l 4180");
}

main();

/**
 * Общие утилиты assemble для страниц услуг (контекст, таргет).
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const root = path.resolve(__dirname, "..", "..");

function buildServicePartials() {
  if (process.env.SKIP_SERVICE_PARTIALS_BUILD === "1") return;
  execSync("npm run build:service-partials", { cwd: root, stdio: "inherit" });
}

function resolveLayoutPath(assemble) {
  const mode = (process.env[assemble.layoutSourceEnv] || "auto").toLowerCase();
  const full = assemble.tmpFullPath;
  const parity = assemble.tmpParityPath;

  if (mode === "parity") return { path: parity, label: "parity" };
  if (mode === "full") return { path: full, label: "full" };
  if (mode !== "auto") {
    console.error(`${assemble.layoutSourceEnv}: ожидается auto | full | parity, получено:`, mode);
    process.exit(1);
  }
  if (fs.existsSync(full)) return { path: full, label: "full (auto)" };
  if (fs.existsSync(parity)) return { path: parity, label: "parity (auto)" };
  return { path: null, label: null };
}

function extractPageConstructorSlice(layoutHtml) {
  let iPc = layoutHtml.indexOf('<motion.div class="page-constructor">');
  if (iPc < 0) iPc = layoutHtml.indexOf('<div class="page-constructor">');
  const iFm = layoutHtml.indexOf('<footer class="footer-modern"');
  if (iPc < 0 || iFm < 0 || iFm <= iPc) {
    return null;
  }
  return layoutHtml.slice(iPc, iFm);
}

function buildCssLinks(manifestPath, v) {
  const man = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const hrefs = man.hrefs || man;
  if (!Array.isArray(hrefs) || !hrefs.length) {
    throw new Error(`manifest hrefs пуст: ${manifestPath}`);
  }
  return hrefs.map((h) => `    <link rel="stylesheet" href="${h}?v=${v}" />`).join("\n");
}

function deferNonBlockingCss(href) {
  return [
    `    <link rel="preload" href="${href}" as="style" onload="this.onload=null;this.rel='stylesheet'" />`,
    `    <noscript><link rel="stylesheet" href="${href}" /></noscript>`,
  ].join("\n");
}

function ensureBurgerMenuGlavnaya(html) {
  if (
    /<ul class="navigation-new__list"[^>]*>[\s\S]*?<a\s+href="\/"[^>]*>\s*Главная\s*<\/a>/i.test(html)
  ) {
    return html;
  }
  const patched = html.replace(
    /(<ul class="navigation-new__list"[^>]*>)\s*(?=<li)/i,
    '$1\n                      <li data-v-7050ddb2=""><a href="/" data-v-7050ddb2="">Главная</a></li>\n                      ',
  );
  if (patched === html) {
    console.warn("assemble: не удалось вставить «Главная» в navigation-new__list");
  }
  return patched;
}

/** Базовые замены URL/storage в срезе prod → статика /_sa/. */
function rewriteProdSliceBase(html) {
  let s = html;
  s = s.replace(/https:\/\/serenity\.agency\/storage\//g, "/_sa/img/storage__");
  s = s.replace(/url\(([a-zA-Z0-9._-]+\.(?:webp|jpg|jpeg|png|gif|mp4))\)/g, "url(/_sa/img/storage__$1)");
  s = s.replace(/href="https:\/\/serenity\.agency\//g, 'href="/');
  s = s.replace(/src="\/video\/lastBlogGif\.gif"/g, 'src="/_sa/img/video__lastBlogGif.gif"');
  s = s.replace(/https:\/\/serenity-dev\.ru\//g, "/");
  s = s.replace(/https?:\/\/127\.0\.0\.1(?::\d+)?\//g, "/");
  s = s.replace(/https?:\/\/localhost(?::\d+)?\//g, "/");
  s = s.replace(/<motion\.div class="page-constructor">\s*<!---->\s*<\/motion\.div>\s*<!---->/g, "");
  s = s.replace(/<div class="page-constructor">\s*<!---->\s*<\/div>\s*<!---->/g, "");
  return s;
}

function readPartialFile(partialPath) {
  if (!fs.existsSync(partialPath)) {
    console.warn("assemble: нет partial —", partialPath);
    return null;
  }
  return fs.readFileSync(partialPath, "utf8").trim();
}

module.exports = {
  root,
  buildServicePartials,
  resolveLayoutPath,
  extractPageConstructorSlice,
  buildCssLinks,
  deferNonBlockingCss,
  ensureBurgerMenuGlavnaya,
  rewriteProdSliceBase,
  readPartialFile,
};

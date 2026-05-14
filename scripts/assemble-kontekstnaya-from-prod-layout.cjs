#!/usr/bin/env node
/**
 * Подставляет в kontekstnaya_reklama/index.html колонку page-constructor
 * (срез до footer-modern) с URL-переписыванием под статику.
 *
 * Источник среза (KONTEKST_LAYOUT_SOURCE):
 *   - не задан или "auto": если есть tmp/kontekst-prod-full.html — брать срез оттуда (после capture в той же цепочке);
 *     иначе tmp/kontekst-parity-prod-layout.html (ручной/legacy дамп).
 *   - "full": только tmp/kontekst-prod-full.html (ошибка, если нет файла).
 *   - "parity": только tmp/kontekst-parity-prod-layout.html.
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const fullHtmlPath = path.join(root, "tmp", "kontekst-prod-full.html");
const parityLayoutPath = path.join(root, "tmp", "kontekst-parity-prod-layout.html");
const indexPath = path.join(root, "kontekstnaya_reklama", "index.html");
const manifestPath = path.join(root, "kontekstnaya_reklama", "nuxt-css-manifest.json");

function resolveLayoutPath() {
  const mode = (process.env.KONTEKST_LAYOUT_SOURCE || "auto").toLowerCase();
  if (mode === "parity") {
    return { path: parityLayoutPath, label: "parity" };
  }
  if (mode === "full") {
    return { path: fullHtmlPath, label: "full" };
  }
  if (mode !== "auto") {
    console.error("KONTEKST_LAYOUT_SOURCE: ожидается auto | full | parity, получено:", mode);
    process.exit(1);
  }
  if (fs.existsSync(fullHtmlPath)) {
    return { path: fullHtmlPath, label: "full (auto)" };
  }
  if (fs.existsSync(parityLayoutPath)) {
    return { path: parityLayoutPath, label: "parity (auto)" };
  }
  return { path: null, label: null };
}

/** Заменяет prod-Nuxt блок «Награды» на статическую оболочку главной (partial). */
function injectKontekstnayaAwardsFromPartial(mainHtml) {
  const partialPath = path.join(root, "html", "partials", "services", "awards-kontekstnaya-reklama.html");
  if (!fs.existsSync(partialPath)) {
    console.warn("assemble: нет partial наград —", partialPath);
    return mainHtml;
  }
  const partial = fs.readFileSync(partialPath, "utf8").trim();
  const moreRe = /<section class="page-constructor__section"><div[^>]*class="more-case-wr"/;
  const moreMatch = mainHtml.match(moreRe);
  if (!moreMatch) {
    console.warn("assemble: не найден more-case-wr — подстановка наград пропущена");
    return mainHtml;
  }
  const moreIdx = moreMatch.index;
  const titleNeedle = 'class="awards__title">Награды</h3>';
  const tIdx = mainHtml.lastIndexOf(titleNeedle, moreIdx);
  if (tIdx < 0) {
    console.warn("assemble: заголовок «Награды» (legacy Nuxt) не найден — подстановка наград пропущена");
    return mainHtml;
  }
  const beforeTitle = mainHtml.slice(0, tIdx);
  const secStart = beforeTitle.lastIndexOf('<section class="page-constructor__section"><section');
  if (secStart < 0) {
    console.warn("assemble: не найдено начало секции наград — подстановка пропущена");
    return mainHtml;
  }
  return mainHtml.slice(0, secStart) + partial + mainHtml.slice(moreIdx);
}

function rewriteProdSlice(html) {
  let s = html;
  // Дамп #__layout иногда содержит устаревший заголовок; на live prod — «Больше кейсов» (curl prod HTML).
  s = s.replace(/Кейсы комплексного маркетинга/g, "Больше кейсов");
  s = s.replace(/https:\/\/serenity\.agency\/storage\//g, "/_sa/img/storage__");
  s = s.replace(/url\(([a-zA-Z0-9._-]+\.(?:webp|jpg|jpeg|png|gif|mp4))\)/g, "url(/_sa/img/storage__$1)");
  s = s.replace(/href="https:\/\/serenity\.agency\//g, 'href="/');
  s = s.replace(/src="\/video\/lastBlogGif\.gif"/g, 'src="/_sa/img/video__lastBlogGif.gif"');
  s = s.replace(/itemprop="image" src="https:\/\/serenity\.agency\/storage\/">/g, 'itemprop="image" src="/_sa/img/storage__xjhFEA49677OGQDTXjw6he9xnUh71ef9GgvspTHz.webp">');
  s = s.replace(/itemprop="image" src="\/storage\/">/g, 'itemprop="image" src="/_sa/img/storage__xjhFEA49677OGQDTXjw6he9xnUh71ef9GgvspTHz.webp">');
  s = s.replace(/itemprop="image" src="\/_sa\/img\/storage__">/g, 'itemprop="image" src="/_sa/img/storage__xjhFEA49677OGQDTXjw6he9xnUh71ef9GgvspTHz.webp">');
  // Локальный Nuxt (SerenityAgency): абсолютные URL к своему origin
  s = s.replace(/https:\/\/serenity-dev\.ru\//g, "/");
  s = s.replace(/https?:\/\/127\.0\.0\.1(?::\d+)?\//g, "/");
  s = s.replace(/https?:\/\/localhost(?::\d+)?\//g, "/");
  // Пустой хвост из Nuxt-гидрации: второй page-constructor только с <!----> ломает стек/DOM.
  s = s.replace(/<div class="page-constructor">\s*<!---->\s*<\/div>\s*<!---->/g, "");
  return s;
}

function buildCssLinks(v) {
  const man = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const hrefs = man.hrefs || man;
  if (!Array.isArray(hrefs) || !hrefs.length) throw new Error("manifest hrefs пуст");
  return hrefs.map((h) => `    <link rel="stylesheet" href="${h}?v=${v}" />`).join("\n");
}

function run() {
  const { path: layoutPath, label: layoutLabel } = resolveLayoutPath();
  if (!layoutPath || !fs.existsSync(layoutPath)) {
    console.error(
      "Нет дампа для среза: сначала capture (tmp/kontekst-prod-full.html) или положите tmp/kontekst-parity-prod-layout.html",
    );
    process.exit(1);
  }
  console.log("assemble: layout source =", layoutLabel, "->", layoutPath);
  if (!fs.existsSync(manifestPath)) {
    console.error("Нет манифеста", manifestPath, "— node scripts/download-nuxt-css-prod-kontekstnaya.cjs");
    process.exit(1);
  }
  const layout = fs.readFileSync(layoutPath, "utf8");
  const iPc = layout.indexOf('<div class="page-constructor">');
  const iFm = layout.indexOf('<footer class="footer-modern"');
  if (iPc < 0 || iFm < 0 || iFm <= iPc) {
    console.error("Некорректные границы среза page-constructor / footer-modern");
    process.exit(1);
  }
  let main = rewriteProdSlice(layout.slice(iPc, iFm));
  main = injectKontekstnayaAwardsFromPartial(main);

  const index = fs.readFileSync(indexPath, "utf8");
  const MAIN_START = "<!-- KONTEKST-MAIN-START -->";
  const MAIN_END = "<!-- KONTEKST-MAIN-END -->";

  const v = "20260513kontekstBundle2";
  const cssBlock = [
    "    <!-- KONTEKST-CSS-BUNDLE-START: prod Nuxt chunks -->",
    "    <link rel=\"stylesheet\" href=\"/_sa/css/css__home-snapshot__snapshot.bundle.css?v=20260424\" />",
    "    <link rel=\"stylesheet\" href=\"/_sa/css/css__home-snapshot__overrides.parity-sync.css?v=20260512categoryScrollEdge\" />",
    "    <link rel=\"stylesheet\" href=\"/_sa/css/css__home-snapshot__native-row-scroll.css?v=20260506awardsMountedHeight\" />",
    buildCssLinks(v),
    "    <link rel=\"stylesheet\" href=\"/_sa/css/kontekstnaya-reklama-static-stack.css?v=20260514kontekstCasesSlideCapCssB\" />",
    "    <link rel=\"stylesheet\" href=\"/_sa/css/sections/home-awards.css?v=20260514kontekstAwardsShell\" />",
    "    <link rel=\"stylesheet\" href=\"/_sa/css/sections/header.css?v=20260428a\" />",
    "    <link rel=\"stylesheet\" href=\"/_sa/css/css__home-snapshot__overrides.mobile.css?v=20260429m\" />",
    "    <link rel=\"stylesheet\" href=\"/_sa/css/sections/footer-burger-chrome.css?v=20260502aligngrid\" />",
    "    <!-- KONTEKST-CSS-BUNDLE-END -->",
    "    <link rel=\"stylesheet\" href=\"https://cdnjs.cloudflare.com/ajax/libs/Swiper/8.4.7/swiper-bundle.min.css\" />",
    "    <link rel=\"stylesheet\" href=\"/_sa/css/css__home-snapshot__slider-arrows.css?v=20260513kontekstSwipers\" />",
  ].join("\n");

  const cssStart = index.indexOf("<!-- KONTEKST-CSS-BUNDLE-START");
  const cssEnd = index.indexOf("<!-- KONTEKST-CSS-BUNDLE-END -->");
  if (cssStart < 0 || cssEnd < 0) {
    console.error("Добавьте маркеры KONTEKST-CSS-BUNDLE в head index.html");
    process.exit(1);
  }
  const cssEndLine = cssEnd + "<!-- KONTEKST-CSS-BUNDLE-END -->".length;
  const indexCss = index.slice(0, cssStart) + cssBlock + index.slice(cssEndLine);

  const iStart = indexCss.indexOf(MAIN_START);
  const iEnd = indexCss.indexOf(MAIN_END);
  if (iStart < 0 || iEnd < 0 || iEnd <= iStart) {
    console.error(
      "В index.html не найдены маркеры KONTEKST-MAIN-START / KONTEKST-MAIN-END (не используйте indexOf по page-constructor — подстрока может встретиться в SVG path)",
    );
    process.exit(1);
  }

  const beforeMain = indexCss.slice(0, iStart + MAIN_START.length);
  const afterMain = indexCss.slice(iEnd);
  const out = `${beforeMain}\n${main}\n${afterMain}`;
  fs.writeFileSync(indexPath, out, "utf8");
  console.log("assemble-kontekstnaya-from-prod-layout: ok, bytes main", main.length);
}

run();

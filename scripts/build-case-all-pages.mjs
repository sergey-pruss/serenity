#!/usr/bin/env node
/**
 * Генерация лёгких статических страниц кейсов:
 * - /case/all/, /case/all/2, ...
 * - /case/all/category/{code}/, /case/all/category/{code}/2, ...
 * И JSON-срезов для каждой страницы.
 *
 * Источник разметки: `html/case-all-index.layout.html` (плейсхолдеры {{CASE_*}}).
 * Перед сборкой: `node scripts/sync-analytics-into-case-all.mjs` подставляет счётчики и leave-request-cta в `case-all-index` и `blog-index` layouts.
 */
import fs from "fs";
import path from "path";

const root = path.resolve(process.cwd());
const layoutPath = path.join(root, "html", "case-all-index.layout.html");
const sourceDataPath = path.join(root, "json", "cases-all.json");
const outJsonDir = path.join(root, "json", "case-all-pages");
const perPage = 24; // 6 рядов по 4 колонки (desktop)

const SITE_ORIGIN = "https://serenity.agency";
const CASE_JSON_PRELOAD_MARKER = "<!--@case-json-preload-->";

/** Совпадает с базовым текстом в `html/case-all-index.layout.html` (плейсхолдер {{CASE_DESCRIPTION}}). */
const CASE_LISTING_DESCRIPTION_BASE =
  "Реализованные проекты агентства Serenity: стратегия, брендинг, сайты и продвижение. Подборка кейсов с результатами для маркетологов и владельцев бизнеса.";

const buildListingDescription = (pageNum) => {
  const p = Number(pageNum) || 1;
  if (p <= 1) return CASE_LISTING_DESCRIPTION_BASE;
  return `${CASE_LISTING_DESCRIPTION_BASE} Страница ${p}.`;
};

/** «Все»: «Кейсы — агентство Serenity», «Кейсы (N) — агентство Serenity». Рубрика: «{label} — Кейсы — Serenity», «{label} (N) — Кейсы — Serenity». */
const buildListingTitle = (code, pageNum, label) => {
  const p = Number(pageNum) || 1;
  const c = normalizeCode(code);
  if (!c) {
    if (p <= 1) return "Кейсы — агентство Serenity";
    return `Кейсы (${p}) — агентство Serenity`;
  }
  const lab = String(label || "").trim() || "Кейсы";
  if (p <= 1) return `${lab} — Кейсы — Serenity`;
  return `${lab} (${p}) — Кейсы — Serenity`;
};

const applyCaseMeta = (html, { title, canonicalUrl, description }) =>
  html
    .replace(/\{\{CASE_TITLE\}\}/g, title)
    .replace(/\{\{CASE_CANONICAL\}\}/g, canonicalUrl)
    .replace(/\{\{CASE_DESCRIPTION\}\}/g, description);

const toDir = (p) => path.join(root, p.replace(/^\//, ""));

const normalizeCode = (code) => (code ? String(code) : "");
const codeFolder = (code) => (code ? code : "all");

const routePath = (code, pageNum) => {
  const c = normalizeCode(code);
  const p = Number(pageNum) || 1;
  if (!c) return p <= 1 ? "/case/all/" : `/case/all/${p}/`;
  return p <= 1 ? `/case/all/category/${c}/` : `/case/all/category/${c}/${p}/`;
};

const writeHtmlAtRoute = (route, html) => {
  const dir = toDir(route);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "index.html"), html, "utf8");
};

const ensureCleanGeneratedRoutes = () => {
  const allDir = path.join(root, "case", "all");
  if (!fs.existsSync(allDir)) return;
  for (const name of fs.readdirSync(allDir)) {
    if (name === "index.html") continue;
    const p = path.join(allDir, name);
    if (fs.statSync(p).isDirectory()) fs.rmSync(p, { recursive: true, force: true });
  }
};

const ensureCleanGeneratedJson = () => {
  fs.rmSync(outJsonDir, { recursive: true, force: true });
  fs.mkdirSync(outJsonDir, { recursive: true });
};

const getPageSlice = (arr, page) => arr.slice((page - 1) * perPage, page * perPage);

function buildCaseListingBreadcrumbJsonLd({ title, canonicalUrl, filterCode, filterLabel, pageNum }) {
  const code = normalizeCode(filterCode);
  const p = Number(pageNum) || 1;
  const elements = [{ "@type": "ListItem", position: 1, name: "Serenity", item: `${SITE_ORIGIN}/` }];

  if (!code && p <= 1) {
    elements.push({ "@type": "ListItem", position: 2, name: title, item: canonicalUrl });
    return {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: elements,
    };
  }

  elements.push({ "@type": "ListItem", position: 2, name: "Кейсы", item: `${SITE_ORIGIN}/case/all/` });

  if (code) {
    elements.push({
      "@type": "ListItem",
      position: 3,
      name: String(filterLabel || "").trim() || code,
      item: `${SITE_ORIGIN}/case/all/category/${code}/`,
    });
  }

  elements.push({
    "@type": "ListItem",
    position: elements.length + 1,
    name: title,
    item: canonicalUrl,
  });

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: elements,
  };
}

(() => {
  if (!fs.existsSync(layoutPath)) {
    throw new Error(`Missing ${layoutPath}`);
  }
  if (!fs.existsSync(sourceDataPath)) throw new Error(`Missing ${sourceDataPath}. Run build-cases-all-data first.`);

  const htmlTemplate = fs.readFileSync(layoutPath, "utf8");
  if (!htmlTemplate.includes(CASE_JSON_PRELOAD_MARKER)) {
    throw new Error(
      `html/case-all-index.layout.html: нет маркера ${CASE_JSON_PRELOAD_MARKER} — добавьте маркер в <head> после canonical`,
    );
  }

  const data = JSON.parse(fs.readFileSync(sourceDataPath, "utf8"));
  const cases = Array.isArray(data.cases) ? data.cases : [];
  const filters = Array.isArray(data.filters) ? data.filters : [];

  ensureCleanGeneratedRoutes();
  ensureCleanGeneratedJson();

  const allFilters = filters.length ? filters : [{ code: "", label: "Все" }];

  for (const filter of allFilters) {
    const code = normalizeCode(filter.code);
    const filtered = !code ? cases : cases.filter((c) => (c.tagCodes || []).includes(code));
    const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));

    const filterMeta = allFilters.map((f) => {
      const fc = normalizeCode(f.code);
      const fCases = !fc ? cases : cases.filter((c) => (c.tagCodes || []).includes(fc));
      return {
        code: fc,
        label: f.label,
        totalPages: Math.max(1, Math.ceil(fCases.length / perPage)),
        href: routePath(fc, 1),
      };
    });

    const jsonFolder = path.join(outJsonDir, codeFolder(code));
    fs.mkdirSync(jsonFolder, { recursive: true });

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      const payload = {
        filterCode: code,
        currentPage: pageNum,
        totalPages,
        perPage,
        totalItems: filtered.length,
        filters: filterMeta,
        cases: getPageSlice(filtered, pageNum),
      };

      fs.writeFileSync(path.join(jsonFolder, `page-${pageNum}.json`), JSON.stringify(payload, null, 2), "utf8");
      const folder = codeFolder(code);
      const preloadTag = `    <link rel="preload" href="/_sa/json/case-all-pages/${folder}/page-${pageNum}.json" as="fetch" crossorigin="anonymous" />\n`;
      const route = routePath(code, pageNum);
      const pathPart = route.endsWith("/") ? route.slice(0, -1) : route;
      const canonicalUrl = `${SITE_ORIGIN}${pathPart}/`;
      const title = buildListingTitle(code, pageNum, filter.label);
      const description = buildListingDescription(pageNum);
      let pageHtml = htmlTemplate.replace(CASE_JSON_PRELOAD_MARKER, preloadTag);
      pageHtml = applyCaseMeta(pageHtml, { title, canonicalUrl, description });
      const jsonLd = buildCaseListingBreadcrumbJsonLd({
        title,
        canonicalUrl,
        filterCode: code,
        filterLabel: filter.label,
        pageNum,
      });
      const ldScript = `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`;
      pageHtml = pageHtml.replace(/<\/head>/i, `    ${ldScript}\n  </head>`);
      writeHtmlAtRoute(route, pageHtml);
    }
  }

  console.log("OK: generated paginated routes and JSON in /case/all/* and /json/case-all-pages/*");
})();

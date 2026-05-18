#!/usr/bin/env node
/**
 * Генерация статических страниц листинга блога:
 * - /blog/, /blog/2, …
 * - /blog/life/, /blog/article/, … (не пересекаются с /blog/article/slug — там лишний сегмент)
 * и JSON-срезов для каждой страницы.
 */
import fs from "fs";
import path from "path";

const root = path.resolve(process.cwd());
/** Шаблон только для сборки; `blog/index.html` перезаписывается на выходе — не читать его как source. */
const sourceHtmlPath = path.join(root, "html", "blog-listing-build.template.html");
const sourceDataPath = path.join(root, "json", "blogs-all.json");
const outJsonDir = path.join(root, "json", "blog-pages");
const perPage = 24;

const SITE_ORIGIN = "https://serenity.agency";

const JSON_PRELOAD_MARKER = "<!--@blog-json-preload-->";

/** Совпадает с базовым текстом в `html/blog-index.layout.html` (плейсхолдер {{BLOG_DESCRIPTION}}). */
const BLOG_LISTING_DESCRIPTION_BASE =
  "Статьи маркетингового агентства Serenity: стратегия, бренд, продакшн, контекст и таргет, SEO и кейсы. Практика и разборы для маркетологов и владельцев бизнеса.";

const buildListingDescription = (pageNum) => {
  const p = Number(pageNum) || 1;
  if (p <= 1) return BLOG_LISTING_DESCRIPTION_BASE;
  return `${BLOG_LISTING_DESCRIPTION_BASE} Страница ${p}.`;
};

/** Листинг «Все»: «Блог — Агентство Serenity», «Блог (N) — Агентство Serenity». Рубрика: «{label} — Блог — Serenity», «{label} (N) — Блог — Serenity». */
const buildListingTitle = (code, pageNum, label) => {
  const p = Number(pageNum) || 1;
  const c = normalizeCode(code);
  if (!c) {
    if (p <= 1) return "Блог — Агентство Serenity";
    return `Блог (${p}) — Агентство Serenity`;
  }
  const lab = String(label || "").trim() || "Блог";
  if (p <= 1) return `${lab} — Блог — Serenity`;
  return `${lab} (${p}) — Блог — Serenity`;
};

const applyListingMeta = (html, { title, canonicalUrl, description }) =>
  html
    .replace(/\{\{BLOG_TITLE\}\}/g, title)
    .replace(/\{\{BLOG_CANONICAL\}\}/g, canonicalUrl)
    .replace(/\{\{BLOG_DESCRIPTION\}\}/g, description);

const toDir = (p) => path.join(root, p.replace(/^\//, ""));

const normalizeCode = (code) => (code ? String(code) : "");
const codeFolder = (code) => (code ? code : "all");

const routePath = (code, pageNum) => {
  const c = normalizeCode(code);
  const p = Number(pageNum) || 1;
  if (!c) return p <= 1 ? "/blog" : `/blog/${p}`;
  return p <= 1 ? `/blog/${c}` : `/blog/${c}/${p}`;
};

const writeHtmlAtRoute = (route, html) => {
  const dir = toDir(route);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "index.html"), html, "utf8");
};

const ensureCleanGeneratedRoutes = () => {
  const baseDir = path.join(root, "blog");
  if (!fs.existsSync(baseDir)) return;
  for (const name of fs.readdirSync(baseDir)) {
    if (name === "index.html") continue;
    const p = path.join(baseDir, name);
    if (!fs.statSync(p).isDirectory()) continue;
    if (name === "article" || name === "case" || name === "card" || name === "life") {
      for (const sub of fs.readdirSync(p)) {
        const sp = path.join(p, sub);
        if (!fs.statSync(sp).isDirectory()) continue;
        /* Только пагинация листинга (/blog/case/2/ …); материалы /blog/case/<slug>/ не трогаем. */
        if (/^\d+$/.test(sub)) {
          fs.rmSync(sp, { recursive: true, force: true });
        }
      }
      continue;
    }
    fs.rmSync(p, { recursive: true, force: true });
  }
};

const ensureCleanGeneratedJson = () => {
  fs.rmSync(outJsonDir, { recursive: true, force: true });
  fs.mkdirSync(outJsonDir, { recursive: true });
};

const getPageSlice = (arr, page) => arr.slice((page - 1) * perPage, page * perPage);

/** Крошки листинга блога (как `buildCaseListingBreadcrumbJsonLd` в build-case-all-pages.mjs). */
function buildBlogListingBreadcrumbJsonLd({ title, canonicalUrl, filterCode, filterLabel, pageNum }) {
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

  if (!code && p > 1) {
    elements.push({ "@type": "ListItem", position: 2, name: "Блог", item: `${SITE_ORIGIN}/blog` });
    elements.push({ "@type": "ListItem", position: 3, name: title, item: canonicalUrl });
    return {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: elements,
    };
  }

  elements.push({ "@type": "ListItem", position: 2, name: "Блог", item: `${SITE_ORIGIN}/blog` });
  elements.push({
    "@type": "ListItem",
    position: 3,
    name: String(filterLabel || "").trim() || code,
    item: `${SITE_ORIGIN}${routePath(code, 1)}`,
  });
  elements.push({
    "@type": "ListItem",
    position: 4,
    name: title,
    item: canonicalUrl,
  });

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: elements,
  };
}

function buildBlogListingStructuredData({ title, description, canonicalUrl, filterCode, filterLabel, pageNum }) {
  const breadcrumb = buildBlogListingBreadcrumbJsonLd({
    title,
    canonicalUrl,
    filterCode,
    filterLabel,
    pageNum,
  });
  const webPage = {
    "@type": "WebPage",
    "@id": `${canonicalUrl}#webpage`,
    name: title,
    description,
    url: canonicalUrl,
    inLanguage: "ru-RU",
    isPartOf: {
      "@type": "WebSite",
      name: "Serenity",
      url: `${SITE_ORIGIN}/`,
    },
  };
  const { itemListElement } = breadcrumb;
  const crumbs = { "@type": "BreadcrumbList", itemListElement };
  return {
    "@context": "https://schema.org",
    "@graph": [webPage, crumbs],
  };
}

const filterPosts = (posts, code) => {
  const c = normalizeCode(code);
  if (!c) return posts;
  return posts.filter((p) => (p.tagCodesNorm || []).includes(c));
};

(() => {
  if (!fs.existsSync(sourceHtmlPath)) throw new Error(`Missing ${sourceHtmlPath}`);
  if (!fs.existsSync(sourceDataPath)) throw new Error(`Missing ${sourceDataPath}. Run build-blog-data first.`);

  const htmlTemplate = fs.readFileSync(sourceHtmlPath, "utf8");
  if (!htmlTemplate.includes(JSON_PRELOAD_MARKER)) {
    throw new Error(
      `${path.relative(root, sourceHtmlPath)}: нет маркера ${JSON_PRELOAD_MARKER} — обновите html/blog-listing-build.template.html`,
    );
  }
  if (htmlTemplate.includes("<!-- @partial")) {
    throw new Error(`${path.relative(root, sourceHtmlPath)}: остались <!-- @partial — сначала assemble`);
  }
  const data = JSON.parse(fs.readFileSync(sourceDataPath, "utf8"));
  const posts = Array.isArray(data.posts) ? data.posts : [];
  const filters = Array.isArray(data.filters) ? data.filters : [];

  ensureCleanGeneratedRoutes();
  ensureCleanGeneratedJson();

  const allFilters = filters.length ? filters : [{ code: "", label: "Все" }];

  for (const filter of allFilters) {
    const code = normalizeCode(filter.code);
    const filtered = filterPosts(posts, code);
    const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));

    const filterMeta = allFilters.map((f) => {
      const fc = normalizeCode(f.code);
      const fPosts = filterPosts(posts, fc);
      return {
        code: fc,
        label: f.label,
        totalPages: Math.max(1, Math.ceil(fPosts.length / perPage)),
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
        posts: getPageSlice(filtered, pageNum),
      };

      fs.writeFileSync(path.join(jsonFolder, `page-${pageNum}.json`), JSON.stringify(payload, null, 2), "utf8");
      const folder = codeFolder(code);
      const preloadTag = `    <link rel="preload" href="/_sa/json/blog-pages/${folder}/page-${pageNum}.json" as="fetch" crossorigin="anonymous" />\n`;
      const route = routePath(code, pageNum);
      const canonicalUrl = `${SITE_ORIGIN}${route}`;
      const title = buildListingTitle(code, pageNum, filter.label);
      const description = buildListingDescription(pageNum);
      let pageHtml = htmlTemplate.replace(JSON_PRELOAD_MARKER, preloadTag);
      pageHtml = applyListingMeta(pageHtml, { title, canonicalUrl, description });
      const graph = buildBlogListingStructuredData({
        title,
        description,
        canonicalUrl,
        filterCode: code,
        filterLabel: filter.label,
        pageNum,
      });
      const ldScript = `<script type="application/ld+json">${JSON.stringify(graph)}</script>`;
      pageHtml = pageHtml.replace(/<\/head>/i, `    ${ldScript}\n  </head>`);
      writeHtmlAtRoute(route, pageHtml);
    }
  }

  console.log("OK: generated paginated routes and JSON in /blog/* and /json/blog-pages/*");
})();

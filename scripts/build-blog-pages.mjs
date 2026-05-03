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
const sourceHtmlPath = path.join(root, "blog", "index.html");
const sourceDataPath = path.join(root, "json", "blogs-all.json");
const outJsonDir = path.join(root, "json", "blog-pages");
const perPage = 24;

const JSON_PRELOAD_MARKER = "<!--@blog-json-preload-->";

const toDir = (p) => path.join(root, p.replace(/^\//, ""));

const normalizeCode = (code) => (code ? String(code) : "");
const codeFolder = (code) => (code ? code : "all");

const routePath = (code, pageNum) => {
  const c = normalizeCode(code);
  const p = Number(pageNum) || 1;
  if (!c) return p <= 1 ? "/blog/" : `/blog/${p}/`;
  return p <= 1 ? `/blog/${c}/` : `/blog/${c}/${p}/`;
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
      `blog/index.html: нет маркера ${JSON_PRELOAD_MARKER} — сначала node scripts/assemble-html.cjs build`,
    );
  }
  if (htmlTemplate.includes("<!-- @partial")) {
    throw new Error("blog/index.html: остались <!-- @partial — сначала node scripts/assemble-html.cjs build");
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
      const pageHtml = htmlTemplate.replace(JSON_PRELOAD_MARKER, preloadTag);
      writeHtmlAtRoute(routePath(code, pageNum), pageHtml);
    }
  }

  console.log("OK: generated paginated routes and JSON in /blog/* and /json/blog-pages/*");
})();

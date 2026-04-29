#!/usr/bin/env node
/**
 * Генерация лёгких статических страниц кейсов:
 * - /case/all/, /case/all/2, ...
 * - /case/all/category/{code}/, /case/all/category/{code}/2, ...
 * И JSON-срезов для каждой страницы.
 */
import fs from "fs";
import path from "path";

const root = path.resolve(process.cwd());
const sourceHtmlPath = path.join(root, "case", "all", "index.html");
const sourceDataPath = path.join(root, "json", "cases-all.json");
const outJsonDir = path.join(root, "json", "case-all-pages");
const perPage = 24; // 6 рядов по 4 колонки (desktop)

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

(() => {
  if (!fs.existsSync(sourceHtmlPath)) throw new Error(`Missing ${sourceHtmlPath}`);
  if (!fs.existsSync(sourceDataPath)) throw new Error(`Missing ${sourceDataPath}. Run build-cases-all-data first.`);

  const html = fs.readFileSync(sourceHtmlPath, "utf8");
  const data = JSON.parse(fs.readFileSync(sourceDataPath, "utf8"));
  const cases = Array.isArray(data.cases) ? data.cases : [];
  const filters = Array.isArray(data.filters) ? data.filters : [];

  ensureCleanGeneratedRoutes();
  ensureCleanGeneratedJson();

  // Гарантируем, что есть дефолтный фильтр "Все"
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
      writeHtmlAtRoute(routePath(code, pageNum), html);
    }
  }

  console.log("OK: generated paginated routes and JSON in /case/all/* and /json/case-all-pages/*");
})();


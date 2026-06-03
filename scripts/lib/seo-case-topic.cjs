/**
 * Кейс для блока «Кейсы» на /seo: SEO-продвижение с измеримыми результатами.
 * Порядок — как на /case/all/. Для 8 карточек: скоринг + порог (см. computeSeoRelevanceScore).
 */
const fs = require("fs");
const path = require("path");

const CARD_SEO_RESULTS_RE = [
  /\bseo[\s-]*продвижен/i,
  /посещаемост(?:ь|и)?\s+сайт(?:а|е|у|ом)?/i,
  /органическ(?:ий|ого|ом)?\s+трафик/i,
  /позиц(?:ия|ии|ий)[^.]{0,35}(?:в\s+)?(?:топ|поиск|выдач|google|яндекс)/i,
  /трафик[^.]{0,40}(?:из\s+)?(?:google|яндекс|поисков)/i,
];

const PAGE_SEO_DELIVERED_RESULTS_RE = [
  /увеличил(?:и)?\s+(?:с\s+помощью\s+)?seo[^.]{0,120}(?:трафик|посещаемост|органическ|целевого)/i,
  /\bseo[^.]{0,100}увеличил(?:и)?[^.]{0,50}(?:трафик|посещаемост)/i,
  /посещаемост(?:ь|и)?\s+сайт[^.]{0,50}(?:в\s+\d+\s+раз|увеличил)/i,
  /подняли\s+конверсию[^.]{0,60}органическ(?:ой|ого)?\s+выдач/i,
  /органическ(?:ой|ого)?\s+выдач[^.]{0,80}(?:трафик|конверс|поднял|увеличил)/i,
  /(?:трафик|посещаемост)[^.]{0,40}в\s+\d+\s+раз[^.]{0,30}(?:$|\.|seo)/i,
];

const PAGE_SITE_BUILD_SEO_ONLY_RE = [
  /seo[\s-]*(?:структур|логик)[^.]{0,80}(?:заложил|создан|разработк|запуск|проектирован)/i,
  /заложил(?:и)?\s+основу\s+для\s+seo/i,
  /seo[^.]{0,60}(?:до\s+запуска|на\s+этапе\s+разработк|при\s+создан)/i,
  /определили\s+ключевые\s+запросы,\s+чтобы\s+сразу\s+заложить/i,
];

const CARD_NOT_SEO_PRIMARY_RE = [
  /^(?:стратегия,?\s*нейминг|нейминг|айдентик|интернет-магазин|разработка лендинга)/i,
  /^стратегия и комплексное продвижение/i,
  /^разработка лендинга и комплексное/i,
  /^(?:создал(?:и)?|разработал(?:и)?)[^.]{0,50}(?:фирменн(?:ый|ого)\s+стил|имя|стил[ья]|сайт|лендинг)/i,
];

const EXCLUDE_HREFS = new Set(["/case/toofli"]);

/** Минимальный скор для блока /seo (8 кейсов на листинге). */
const SEO_BLOCK_MIN_SCORE = 10;

function normHref(href) {
  return String(href || "")
    .replace(/^https?:\/\/[^/]+/i, "")
    .replace(/\/$/, "");
}

function decodeHtmlEntities(html) {
  return String(html || "").replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) =>
    String.fromCharCode(parseInt(hex, 16)),
  );
}

function stripHtmlToText(fragment) {
  return String(fragment || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractVisibleProseText(html) {
  let s = String(html || "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "");
  const chunks = [];
  const re = /<(p|h[1-6]|li)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  let m;
  while ((m = re.exec(s))) {
    const inner = stripHtmlToText(m[2]);
    if (inner.length >= 12) chunks.push(inner);
  }
  return decodeHtmlEntities(chunks.join(" "));
}

function cardHasSeoResults(caseRow) {
  if (!caseRow) return false;
  const text = [caseRow.description, caseRow.subtitle, ...(caseRow.tags || [])]
    .filter(Boolean)
    .join(" ");
  return CARD_SEO_RESULTS_RE.some((re) => re.test(text));
}

function cardIsClearlyNotSeo(caseRow) {
  if (!caseRow) return true;
  const card = [caseRow.description, caseRow.subtitle].filter(Boolean).join(" ");
  if (!card) return false;
  if (cardHasSeoResults(caseRow)) return false;
  return CARD_NOT_SEO_PRIMARY_RE.some((re) => re.test(card));
}

function pageHasSeoPromotionResults(pageHtml) {
  const text = extractVisibleProseText(pageHtml);
  if (!text) return false;
  const hasResult = PAGE_SEO_DELIVERED_RESULTS_RE.some((re) => re.test(text));
  if (!hasResult) return false;
  const siteBuildOnly = PAGE_SITE_BUILD_SEO_ONLY_RE.some((re) => re.test(text));
  if (siteBuildOnly && !PAGE_SEO_DELIVERED_RESULTS_RE.some((re) => re.test(text))) {
    return false;
  }
  return true;
}

/**
 * Чем выше — тем ближе к «SEO-продвижение с результатами», а не «SEO при вёрстке сайта».
 */
function computeSeoRelevanceScore(caseRow, pageHtml) {
  const card = caseRow
    ? [caseRow.description, caseRow.subtitle].filter(Boolean).join(" ")
    : "";
  const prose = pageHtml ? extractVisibleProseText(pageHtml) : "";
  let score = 0;

  if (cardHasSeoResults(caseRow)) score += 100;
  if (PAGE_SEO_DELIVERED_RESULTS_RE.some((re) => re.test(prose))) score += 80;
  if (
    /\bseo\b/i.test(prose) &&
    /(?:трафик|посещаемост|органическ|позиц|выдач|конверс)/i.test(prose) &&
    /(?:увеличил|в\s+\d+\s+раз|вырос|поднял|окупил)/i.test(prose)
  ) {
    score += 45;
  }
  if (/\bseo\b/i.test(prose) && /(?:трафик|посещаемост|позиц|органическ|видимост|выдач)/i.test(prose)) {
    score += 20;
  }
  if (/seo[^.]{0,50}(?:аудит|продвижен|оптимиз)/i.test(prose)) score += 15;
  if (
    /\bseo\b/i.test(prose) &&
    /(?:на\s+постоянной|регулярно|постоянной\s+основе)/i.test(prose) &&
    /(?:трафик|позиц|органическ|выдач)/i.test(prose)
  ) {
    score += 12;
  }

  if (cardIsClearlyNotSeo(caseRow) && score < 45) score -= 25;
  if (PAGE_SITE_BUILD_SEO_ONLY_RE.some((re) => re.test(prose)) && score < 55) score -= 20;

  return score;
}

function qualifiesForSeoCasesBlock(caseRow, pageHtml) {
  if (EXCLUDE_HREFS.has(normHref(caseRow?.href))) return false;
  const score = computeSeoRelevanceScore(caseRow, pageHtml);
  if (score >= SEO_BLOCK_MIN_SCORE) return true;
  if (cardHasSeoResults(caseRow)) return true;
  if (pageHasSeoPromotionResults(pageHtml)) return true;
  return false;
}

function isSeoCase(caseRow, pageHtml) {
  return qualifiesForSeoCasesBlock(caseRow, pageHtml);
}

function loadCaseAllListingHrefs(root) {
  const dir = path.join(root, "json", "case-all-pages", "all");
  const pages = fs
    .readdirSync(dir)
    .filter((f) => /^page-\d+\.json$/.test(f))
    .sort((a, b) => {
      const na = Number(a.match(/page-(\d+)/)[1]);
      const nb = Number(b.match(/page-(\d+)/)[1]);
      return na - nb;
    });
  const hrefs = [];
  for (const file of pages) {
    const data = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"));
    for (const row of data.cases || []) {
      hrefs.push(normHref(row.href));
    }
  }
  return hrefs;
}

async function fetchCasePageHtml(href) {
  const url = `https://serenity.agency${href.startsWith("/") ? href : `/${href}`}`;
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) return "";
  return res.text();
}

async function pickSeoCasesForServiceBlock(opts) {
  const root = opts.root;
  const limit = opts.limit ?? 8;
  const fetchPages = opts.fetchPages !== false;
  const cachePath = path.join(root, "json", "services", "seo", "seo-case-topic-cache.json");
  let cache = {};
  if (fs.existsSync(cachePath)) {
    try {
      cache = JSON.parse(fs.readFileSync(cachePath, "utf8")).topics || {};
    } catch {
      cache = {};
    }
  }
  if (opts.refreshCache) cache = {};

  const casesAll = JSON.parse(
    fs.readFileSync(path.join(root, "json", "cases-all.json"), "utf8"),
  );
  const byHref = new Map((casesAll.cases || []).map((c) => [normHref(c.href), c]));

  const listingHrefs = loadCaseAllListingHrefs(root);
  const ranked = [];

  for (const href of listingHrefs) {
    if (EXCLUDE_HREFS.has(href)) continue;
    const row = byHref.get(href);
    if (!row) continue;

    let pageHtml = "";
    if (fetchPages) {
      pageHtml = await fetchCasePageHtml(href);
    }

    const score = computeSeoRelevanceScore(row, pageHtml);
    const ok = qualifiesForSeoCasesBlock(row, pageHtml);
    cache[href] = ok;
    if (ok) ranked.push({ href, score });
  }

  ranked.sort((a, b) => b.score - a.score);

  const pickedSet = new Set();
  const picked = [];

  for (const href of listingHrefs) {
    const hit = ranked.find((r) => r.href === href);
    if (hit && !pickedSet.has(href)) {
      picked.push(href);
      pickedSet.add(href);
      if (picked.length >= limit) break;
    }
  }

  if (picked.length < limit) {
    for (const { href } of ranked) {
      if (pickedSet.has(href)) continue;
      picked.push(href);
      pickedSet.add(href);
      if (picked.length >= limit) break;
    }
  }

  if (fetchPages || opts.refreshCache) {
    fs.mkdirSync(path.dirname(cachePath), { recursive: true });
    fs.writeFileSync(
      cachePath,
      `${JSON.stringify(
        {
          builtAt: new Date().toISOString(),
          comment:
            "Кэш qualifiesForSeoCasesBlock; REFRESH_SEO_CASE_TOPIC_CACHE=1",
          topics: cache,
        },
        null,
        2,
      )}\n`,
      "utf8",
    );
  }

  if (picked.length < limit) {
    throw new Error(
      `pickSeoCases: нашли ${picked.length} кейсов (нужно ${limit}). ` +
        `Порог score>=${SEO_BLOCK_MIN_SCORE} или SEO-результат на странице. ` +
        `REFRESH_SEO_CASE_TOPIC_CACHE=1`,
    );
  }

  return { hrefs: picked, cachePath, checkedCount: listingHrefs.length };
}

module.exports = {
  normHref,
  cardHasSeoResults,
  pageHasSeoPromotionResults,
  computeSeoRelevanceScore,
  qualifiesForSeoCasesBlock,
  isSeoCase,
  extractVisibleProseText,
  loadCaseAllListingHrefs,
  pickSeoCasesForServiceBlock,
  EXCLUDE_HREFS,
  SEO_BLOCK_MIN_SCORE,
  CARD_SEO_RESULTS_RE,
  PAGE_SEO_DELIVERED_RESULTS_RE,
};

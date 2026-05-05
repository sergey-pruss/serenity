#!/usr/bin/env node
/**
 * RSS 2.0 для Яндекс Вебмастера: Представление в поиске -> Свежее и актуальное.
 * URL фида: /blog/yandex-news.xml. Не используем типичные feed/rss имена:
 * production robots.txt уже закрывает такие шаблоны.
 */
import fs from "fs";
import path from "path";

const root = path.resolve(process.cwd());
const blogsAllPath = path.join(root, "json", "blogs-all.json");
const articlesDir = path.join(root, "json", "blog-articles");
const outPath = path.join(root, "blog", "yandex-news.xml");

const SITE_ORIGIN = "https://serenity.agency";
const MAX_ITEMS = 20;
const DEFAULT_YEAR = new Date().getFullYear();

const MONTHS_RU = new Map([
  ["января", 0],
  ["февраля", 1],
  ["марта", 2],
  ["апреля", 3],
  ["мая", 4],
  ["июня", 5],
  ["июля", 6],
  ["августа", 7],
  ["сентября", 8],
  ["октября", 9],
  ["ноября", 10],
  ["декабря", 11],
]);

function escapeXml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function stripTags(html) {
  return String(html ?? "")
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<svg\b[\s\S]*?<\/svg>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeTitle(title) {
  return stripTags(title).replace(/\.\s*$/, "").slice(0, 200).trim();
}

function normalizeUrl(href) {
  const url = new URL(String(href || ""), SITE_ORIGIN);
  if (!url.pathname.endsWith("/")) url.pathname = `${url.pathname}/`;
  url.hash = "";
  return url.toString();
}

function articleSlugFromHref(href) {
  const p = new URL(String(href || ""), SITE_ORIGIN).pathname;
  const m = p.match(/^\/blog\/article\/([^/]+)\/?$/);
  return m ? m[1] : "";
}

function extractDateText(bodyHtml) {
  const html = String(bodyHtml || "");
  const match =
    html.match(/itemprop="datePublished"[^>]*>([\s\S]*?)<\/div>/i) ||
    html.match(/class="[^"]*\bblog-header__date\b[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
  return match ? stripTags(match[1]) : "";
}

function parseRussianDate(dateText) {
  const text = String(dateText || "").trim().toLowerCase();
  const match = text.match(/^(\d{1,2})\s+([а-яё]+)(?:\s+(\d{4}))?/u);
  if (!match) return null;
  const day = Number(match[1]);
  const month = MONTHS_RU.get(match[2]);
  if (!Number.isInteger(day) || month == null) return null;
  let year = match[3] ? Number(match[3]) : DEFAULT_YEAR;
  let date = new Date(Date.UTC(year, month, day, 9, 0, 0));
  const now = new Date();
  if (!match[3] && date.getTime() - now.getTime() > 36 * 60 * 60 * 1000) {
    year -= 1;
    date = new Date(Date.UTC(year, month, day, 9, 0, 0));
  }
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatRfc822Moscow(date) {
  const localMs = date.getTime() + 3 * 60 * 60 * 1000;
  const d = new Date(localMs);
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const pad = (n) => String(n).padStart(2, "0");
  return `${days[d.getUTCDay()]}, ${pad(d.getUTCDate())} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())} +0300`;
}

function removeHeaderAndMedia(html) {
  return String(html || "")
    .replace(/^<section\s+[^>]*\bblog-header\b[^>]*>[\s\S]*?<\/section>\s*(?:<!---->\s*)?/i, " ")
    .replace(/<figure\b[\s\S]*?<\/figure>/gi, " ")
    .replace(/<picture\b[\s\S]*?<\/picture>/gi, " ")
    .replace(/<video\b[\s\S]*?<\/video>/gi, " ")
    .replace(/<img\b[^>]*>/gi, " ")
    .replace(/<iframe\b[\s\S]*?<\/iframe>/gi, " ");
}

function fullTextFromArticle(article) {
  return stripTags(removeHeaderAndMedia(article.bodyHtml))
    .replace(/\bАвтор статьи\s*(?:—|–|-)\s*[^.]+\.?$/i, "")
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function categoryFromPost(post) {
  const tags = Array.isArray(post.tags) ? post.tags : [];
  if (tags.includes("Подкаст")) return "Подкаст";
  if (tags.includes("Наша жизнь")) return "Наша жизнь";
  return tags[0] || "Статьи";
}

function genreFromPost(post) {
  const hay = `${post.description || ""} ${(post.tags || []).join(" ")}`.toLowerCase();
  if (hay.includes("интервью")) return "interview";
  return "article";
}

function buildItems() {
  if (!fs.existsSync(blogsAllPath)) throw new Error(`Missing ${blogsAllPath}`);
  if (!fs.existsSync(articlesDir)) throw new Error(`Missing ${articlesDir}`);

  const posts = JSON.parse(fs.readFileSync(blogsAllPath, "utf8")).posts || [];
  const items = [];
  const seen = new Set();

  for (const post of posts) {
    const slug = articleSlugFromHref(post.href);
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);

    const jsonPath = path.join(articlesDir, `${slug}.json`);
    if (!fs.existsSync(jsonPath)) continue;
    const article = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
    const title = normalizeTitle(article.title || post.description);
    const link = normalizeUrl(article.canonical || article.sourceUrl || post.href);
    const pubDateRaw = extractDateText(article.bodyHtml);
    const pubDate = parseRussianDate(pubDateRaw);
    const fullText = fullTextFromArticle(article);
    const description = stripTags(article.description || post.subtitle || post.description);

    if (!title || !link || !pubDate || !fullText) continue;
    items.push({
      title,
      link,
      description,
      pubDate,
      pubDateRaw,
      category: categoryFromPost(post),
      genre: genreFromPost(post),
      fullText,
    });
  }

  return items
    .sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime())
    .slice(0, MAX_ITEMS);
}

function renderFeed(items) {
  const lastBuildDate = items[0]?.pubDate || new Date();
  const body = items
    .map(
      (item) => `    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${escapeXml(item.link)}</link>
      <description>${escapeXml(item.description)}</description>
      <category>${escapeXml(item.category)}</category>
      <pubDate>${formatRfc822Moscow(item.pubDate)}</pubDate>
      <yandex:genre>${escapeXml(item.genre)}</yandex:genre>
      <yandex:full-text>${escapeXml(item.fullText)}</yandex:full-text>
    </item>`,
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:yandex="http://news.yandex.ru" xmlns:media="http://search.yahoo.com/mrss/" version="2.0">
  <channel>
    <title>Serenity: блог</title>
    <link>${SITE_ORIGIN}/blog/</link>
    <description>Статьи маркетингового агентства Serenity: стратегия, бренд, продакшн, контекст, таргет и SEO.</description>
    <language>ru</language>
    <lastBuildDate>${formatRfc822Moscow(lastBuildDate)}</lastBuildDate>
${body}
  </channel>
</rss>
`;
}

const items = buildItems();
if (!items.length) throw new Error("Не удалось собрать ни одного item для Яндекс RSS");

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, renderFeed(items), "utf8");
console.log(`OK: ${path.relative(root, outPath)} — items: ${items.length}`);

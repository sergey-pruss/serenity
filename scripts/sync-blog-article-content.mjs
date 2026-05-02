#!/usr/bin/env node
/**
 * Тянет HTML статей с прода, вырезает блок от hero до «Читайте также»,
 * отдельно сохраняет секцию «Читайте также»,
 * кладёт картинки wp-content в img/blog/, переписывает URL на /_sa/img/blog/.
 * Результат: json/blog-articles/<slug>.json
 *
 * Манифест: json/blog-articles-manifest.json (массив slug без префикса /blog/article/).
 * Пропуск: SKIP_BLOG_ARTICLE_SYNC=1
 */
import fs from "fs";
import path from "path";

const ORIGIN = "https://serenity.agency";
const MANIFEST = path.join(process.cwd(), "json", "blog-articles-manifest.json");
const OUT_DIR = path.join(process.cwd(), "json", "blog-articles");
const IMG_BLOG = path.join(process.cwd(), "img", "blog");

function extractArticleHtml(pageHtml) {
  const start = pageHtml.indexOf('<section class="blog-header darktheme"');
  const end = pageHtml.indexOf('<section class="darktheme blog-articles"');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Не найдены границы статьи (blog-header / blog-articles)");
  }
  return pageHtml.slice(start, end).trim();
}

function extractReadAlsoHtml(pageHtml) {
  const marker = '<section class="darktheme blog-articles"';
  const start = pageHtml.indexOf(marker);
  if (start === -1) return "";
  const openEnd = pageHtml.indexOf(">", start);
  if (openEnd === -1) return "";
  const close = pageHtml.indexOf("</section>", openEnd);
  if (close === -1) return "";
  return pageHtml.slice(start, close + "</section>".length).trim();
}

function parseMeta(pageHtml) {
  const titleM = pageHtml.match(/<title[^>]*>([^<]*)<\/title>/i);
  let descM = pageHtml.match(/<meta[^>]+name="description"[^>]+content="([^"]*)"/i);
  if (!descM) {
    descM = pageHtml.match(/<meta[^>]+property="og:description"[^>]+content="([^"]*)"/i);
  }
  const canonM = pageHtml.match(/<link[^>]+rel="canonical"[^>]+href="([^"]*)"/i);
  return {
    title: titleM ? titleM[1].replace(/\s*—\s*Статья\s*—\s*Serenity\s*$/i, "").trim() : "",
    description: descM ? descM[1].trim() : "",
    canonical: canonM ? canonM[1].trim() : "",
  };
}

async function ensureWpAsset(url, root) {
  let pathname;
  try {
    pathname = new URL(url).pathname;
  } catch {
    return url;
  }
  const base = path.basename(pathname);
  if (!base) return url;
  const safe = `wp__${base.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const dest = path.join(IMG_BLOG, safe);
  if (fs.existsSync(dest) && fs.statSync(dest).size > 0) {
    return `/_sa/img/blog/${safe}`;
  }
  const res = await fetch(url);
  if (!res.ok) {
    console.warn(`WARN: не скачан ${url} (${res.status})`);
    return url;
  }
  fs.mkdirSync(IMG_BLOG, { recursive: true });
  fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
  return `/_sa/img/blog/${safe}`;
}

async function rewriteAssetUrls(html, root) {
  let out = html;

  const storageRe = /https:\/\/serenity\.agency\/storage\/([^"'\\\s)]+)/g;
  out = out.replace(storageRe, (full, fname) => {
    const b = path.basename(fname);
    const local = path.join(root, "img", "blog", b);
    if (fs.existsSync(local)) return `/_sa/img/blog/${b}`;
    return full;
  });

  const wpRe = /https:\/\/serenity\.agency\/admin\/wp-content\/uploads\/[^"'\\\s)]+/g;
  const seen = new Set();
  const matches = [...out.matchAll(new RegExp(wpRe.source, "g"))];
  const map = new Map();
  for (const m of matches) {
    const u = m[0];
    if (seen.has(u)) continue;
    seen.add(u);
    map.set(u, await ensureWpAsset(u, root));
  }
  for (const [from, to] of map) {
    out = out.split(from).join(to);
  }

  out = out.replace(/href="\/blog\/article"/g, 'href="/blog/article/"');
  return out;
}

if (process.env.SKIP_BLOG_ARTICLE_SYNC === "1") {
  console.log("OK: sync-blog-article-content пропущен (SKIP_BLOG_ARTICLE_SYNC=1)");
  process.exit(0);
}

(async () => {
  const root = path.resolve(process.cwd());
  if (!fs.existsSync(MANIFEST)) {
    throw new Error(`Нет ${MANIFEST}`);
  }
  const slugs = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
  if (!Array.isArray(slugs) || slugs.length === 0) {
    console.log("OK: blog-articles-manifest пуст — нечего синхронизировать");
    process.exit(0);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });

  for (const slug of slugs) {
    if (!slug || typeof slug !== "string" || slug.includes("..")) continue;
    const url = `${ORIGIN}/blog/article/${slug}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${url} → ${res.status}`);
    const pageHtml = await res.text();
    const meta = parseMeta(pageHtml);
    let bodyHtml = extractArticleHtml(pageHtml);
    bodyHtml = await rewriteAssetUrls(bodyHtml, root);

    let readAlsoHtml = extractReadAlsoHtml(pageHtml);
    readAlsoHtml = await rewriteAssetUrls(readAlsoHtml, root);

    const payload = {
      slug,
      sourceUrl: url,
      title: meta.title,
      description: meta.description,
      canonical: meta.canonical || `${ORIGIN}/blog/article/${slug}`,
      bodyHtml,
      readAlsoHtml,
      syncedAt: new Date().toISOString(),
    };

    fs.writeFileSync(path.join(OUT_DIR, `${slug}.json`), JSON.stringify(payload, null, 2), "utf8");
    console.log("OK:", slug);
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

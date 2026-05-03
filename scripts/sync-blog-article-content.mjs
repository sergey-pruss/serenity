#!/usr/bin/env node
/**
 * Тянет HTML статей с прода, вырезает блок от hero до «Читайте также»,
 * отдельно сохраняет секцию «Читайте также» (в JSON для справки; на странице блок «Читайте ещё» строит build-blog-article-pages).
 * Картинки: img/blog/<slug>/…, в HTML — `/_sa/img/blog/<slug>/…`.
 * Абсолютные ссылки https://serenity.agency/… → относительные `/…`.
 * Относительные `/admin/wp-content/uploads/…` (герой Nuxt) тоже скачиваются в `img/blog/<slug>/`.
 *
 * Манифест статей: json/blog-articles-manifest.json (gen-blog-articles-manifest.mjs).
 * Доп. материалы blog/case|card|life/slug: json/blog-post-pages-manifest.json (gen-blog-post-pages-manifest.mjs).
 * Пропуск: SKIP_BLOG_ARTICLE_SYNC=1
 *
 * См. также: .cursor/rules/blog-articles-static.mdc
 */
import fs from "fs";
import path from "path";
import { normalizeBlogArticleBodyHtml } from "./normalize-blog-article-body-html.mjs";
import { normalizeBlogMetaDescription } from "./normalize-blog-meta-description.mjs";

const ORIGIN = "https://serenity.agency";
const MANIFEST = path.join(process.cwd(), "json", "blog-articles-manifest.json");
const POST_PAGES_MANIFEST = path.join(process.cwd(), "json", "blog-post-pages-manifest.json");
const OUT_DIR = path.join(process.cwd(), "json", "blog-articles");
const POST_PAGES_JSON_DIR = path.join(process.cwd(), "json", "blog-post-pages");

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
  const rawDesc = descM ? descM[1].trim() : "";
  return {
    title: titleM ? titleM[1].replace(/\s*—\s*Статья\s*—\s*Serenity\s*$/i, "").trim() : "",
    description: normalizeBlogMetaDescription(rawDesc),
    canonical: canonM ? canonM[1].trim() : "",
  };
}

/** Ссылки на тот же сайт — в относительные пути для статического контура. */
function rewriteSerenityInternalUrls(html) {
  return String(html || "")
    .replace(/https:\/\/serenity\.agency\//g, "/")
    .replace(/http:\/\/serenity\.agency\//g, "/");
}

/** storage: сначала img/blog/<slug>/, иначе копия из img/blog/ (превью sync-blog-images). */
function resolveStorageAsset(fullUrl, fname, root, slug) {
  const b = path.basename(fname);
  if (!b) return fullUrl;
  const dir = path.join(root, "img", "blog", slug);
  const localSlug = path.join(dir, b);
  const localFlat = path.join(root, "img", "blog", b);
  if (fs.existsSync(localSlug) && fs.statSync(localSlug).size > 0) {
    return `/_sa/img/blog/${slug}/${b}`;
  }
  if (fs.existsSync(localFlat) && fs.statSync(localFlat).size > 0) {
    fs.mkdirSync(dir, { recursive: true });
    fs.copyFileSync(localFlat, localSlug);
    return `/_sa/img/blog/${slug}/${b}`;
  }
  return fullUrl;
}

async function ensureWpAsset(url, root, slug) {
  let pathname;
  try {
    pathname = new URL(url).pathname;
  } catch {
    return url;
  }
  const base = path.basename(pathname);
  if (!base) return url;
  const safe = base.replace(/[^a-zA-Z0-9._-]/g, "_");
  const dir = path.join(root, "img", "blog", slug);
  const dest = path.join(dir, safe);
  if (fs.existsSync(dest) && fs.statSync(dest).size > 0) {
    return `/_sa/img/blog/${slug}/${safe}`;
  }
  const res = await fetch(url);
  if (!res.ok) {
    console.warn(`WARN: не скачан ${url} (${res.status})`);
    return url;
  }
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
  return `/_sa/img/blog/${slug}/${safe}`;
}

async function rewriteAssetUrls(html, root, slug) {
  let out = rewriteSerenityInternalUrls(html);

  const storageRe = /https:\/\/serenity\.agency\/storage\/([^"'\\\s)]+)/g;
  const storageMatches = [...out.matchAll(new RegExp(storageRe.source, "g"))];
  const seenSt = new Set();
  for (const m of storageMatches) {
    const full = m[0];
    if (seenSt.has(full)) continue;
    seenSt.add(full);
    const to = resolveStorageAsset(full, m[1], root, slug);
    out = out.split(full).join(to);
  }

  const wpRe = /https:\/\/serenity\.agency\/admin\/wp-content\/uploads\/[^"'\\\s)]+/g;
  const seen = new Set();
  const matches = [...out.matchAll(new RegExp(wpRe.source, "g"))];
  const map = new Map();
  for (const m of matches) {
    const u = m[0];
    if (seen.has(u)) continue;
    seen.add(u);
    map.set(u, await ensureWpAsset(u, root, slug));
  }
  for (const [from, to] of map) {
    out = out.split(from).join(to);
  }

  /** После rewriteSerenity остаётся `/admin/wp-content/...` или так приходит с Nuxt — скачиваем с прода. */
  const relWpRe = /\/admin\/wp-content\/uploads\/[^"'\\\s)]+/g;
  const relSeen = new Set();
  const relMatches = [...out.matchAll(new RegExp(relWpRe.source, "g"))];
  for (const m of relMatches) {
    const p = m[0];
    if (relSeen.has(p)) continue;
    relSeen.add(p);
    const absolute = `${ORIGIN}${p}`;
    const local = await ensureWpAsset(absolute, root, slug);
    out = out.split(p).join(local);
  }

  out = out.replace(/href="\/blog\/article"/g, 'href="/blog/article/"');
  out = out.replace(/href="\/blog\/case"/g, 'href="/blog/case/"');
  out = out.replace(/href="\/blog\/card"/g, 'href="/blog/card/"');
  out = out.replace(/href="\/blog\/life"/g, 'href="/blog/life/"');
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
    const url = `${ORIGIN}/blog/article/${slug}/`;
    try {
      const res = await fetch(url);
      if (!res.ok) {
        console.warn(`WARN: ${url} → ${res.status}, пропуск`);
        continue;
      }
      const pageHtml = await res.text();
      const meta = parseMeta(pageHtml);
      let bodyHtml = extractArticleHtml(pageHtml);
      bodyHtml = await rewriteAssetUrls(bodyHtml, root, slug);
      bodyHtml = normalizeBlogArticleBodyHtml(bodyHtml);

      let readAlsoHtml = extractReadAlsoHtml(pageHtml);
      readAlsoHtml = await rewriteAssetUrls(readAlsoHtml, root, slug);

      let preservedAuthor = null;
      const existingJsonPath = path.join(OUT_DIR, `${slug}.json`);
      if (fs.existsSync(existingJsonPath)) {
        try {
          const prev = JSON.parse(fs.readFileSync(existingJsonPath, "utf8"));
          if (prev.author && typeof prev.author === "object") preservedAuthor = prev.author;
          if (preservedAuthor?.photo) {
            preservedAuthor = {
              ...preservedAuthor,
              photo: rewriteSerenityInternalUrls(String(preservedAuthor.photo)),
            };
          }
        } catch {
          /* ignore */
        }
      }

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
      if (preservedAuthor) payload.author = preservedAuthor;

      fs.writeFileSync(path.join(OUT_DIR, `${slug}.json`), JSON.stringify(payload, null, 2), "utf8");
      console.log("OK:", slug);
    } catch (e) {
      console.warn(`WARN: ${slug}:`, e.message || e);
    }
  }

  /** /blog/case|card|life/<slug>/ — та же разметка hero + тело, что у статей. */
  if (fs.existsSync(POST_PAGES_MANIFEST)) {
    let extra = [];
    try {
      extra = JSON.parse(fs.readFileSync(POST_PAGES_MANIFEST, "utf8"));
    } catch (e) {
      console.warn("WARN: blog-post-pages-manifest:", e.message);
      extra = [];
    }
    if (!Array.isArray(extra) || extra.length === 0) {
      console.log("OK: blog-post-pages-manifest пуст");
    } else {
      fs.mkdirSync(POST_PAGES_JSON_DIR, { recursive: true });
      for (const row of extra) {
        const segment = String(row?.segment || "").trim();
        const slug = String(row?.slug || "").trim();
        if (!segment || !slug || slug.includes("..") || segment.includes("..")) continue;
        if (!/^(case|card|life)$/.test(segment)) continue;
        const assetKey = `${segment}__${slug}`;
        const url = `${ORIGIN}/blog/${segment}/${slug}/`;
        try {
          const res = await fetch(url);
          if (!res.ok) {
            console.warn(`WARN: ${url} → ${res.status}, пропуск`);
            continue;
          }
          const pageHtml = await res.text();
          const meta = parseMeta(pageHtml);
          let bodyHtml = extractArticleHtml(pageHtml);
          bodyHtml = await rewriteAssetUrls(bodyHtml, root, assetKey);
          bodyHtml = normalizeBlogArticleBodyHtml(bodyHtml);

          let readAlsoHtml = extractReadAlsoHtml(pageHtml);
          readAlsoHtml = await rewriteAssetUrls(readAlsoHtml, root, assetKey);

          let preservedAuthor = null;
          const segDir = path.join(POST_PAGES_JSON_DIR, segment);
          fs.mkdirSync(segDir, { recursive: true });
          const existingJsonPath = path.join(segDir, `${slug}.json`);
          if (fs.existsSync(existingJsonPath)) {
            try {
              const prev = JSON.parse(fs.readFileSync(existingJsonPath, "utf8"));
              if (prev.author && typeof prev.author === "object") preservedAuthor = prev.author;
              if (preservedAuthor?.photo) {
                preservedAuthor = {
                  ...preservedAuthor,
                  photo: rewriteSerenityInternalUrls(String(preservedAuthor.photo)),
                };
              }
            } catch {
              /* ignore */
            }
          }

          const payload = {
            segment,
            slug,
            sourceUrl: url,
            title: meta.title,
            description: meta.description,
            canonical: meta.canonical || `${ORIGIN}/blog/${segment}/${slug}`,
            bodyHtml,
            readAlsoHtml,
            syncedAt: new Date().toISOString(),
          };
          if (preservedAuthor) payload.author = preservedAuthor;

          fs.writeFileSync(existingJsonPath, JSON.stringify(payload, null, 2), "utf8");
          console.log("OK:", segment, slug);
        } catch (e) {
          console.warn(`WARN: ${segment}/${slug}:`, e.message || e);
        }
      }
    }
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

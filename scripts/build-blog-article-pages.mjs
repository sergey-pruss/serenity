#!/usr/bin/env node
/**
 * Собирает статические страницы статей: blog/article/<slug>/index.html
 * из json/blog-articles/<slug>.json и оболочки blog/index.html (без листинга, без blog.js).
 * Блок «Читайте еще»: карточки из readAlsoHtml + обложки из json/blogs-all.json.
 */
import fs from "fs";
import path from "path";

const root = path.resolve(process.cwd());
const listingPath = path.join(root, "blog", "index.html");
const jsonDir = path.join(root, "json", "blog-articles");
const manifestPath = path.join(root, "json", "blog-articles-manifest.json");
const blogsAllPath = path.join(root, "json", "blogs-all.json");

function stripBlogJs(html) {
  return html.replace(/<script defer="" src="\/_sa\/js\/blog\.js[^"]*"><\/script>\s*\n?/g, "");
}

function injectHead(html, { title, description, canonical }) {
  let out = html;
  if (title) {
    out = out.replace(/<title>[^<]*<\/title>/, `<title>${escapeXml(title)}</title>`);
    out = out.replace(
      /<meta property="og:title" content="[^"]*"\s*\/>/,
      `<meta property="og:title" content="${escapeXml(title)}" />`
    );
  }
  if (description) {
    if (/<meta name="description"/.test(out)) {
      out = out.replace(
        /<meta name="description"[^>]*\/>/,
        `<meta name="description" content="${escapeXml(description)}" />`
      );
    } else {
      out = out.replace(
        /(<meta property="og:type" content="website" \/>)/,
        `$1\n    <meta name="description" content="${escapeXml(description)}" />`
      );
    }
    if (/<meta property="og:description"/.test(out)) {
      out = out.replace(
        /<meta property="og:description" content="[^"]*"\s*\/>/,
        `<meta property="og:description" content="${escapeXml(description)}" />`
      );
    } else {
      out = out.replace(
        /(<meta property="og:title" content="[^"]*" \/>)/,
        `$1\n    <meta property="og:description" content="${escapeXml(description)}" />`
      );
    }
  }
  if (canonical) {
    out = out.replace(
      /<link rel="canonical" href="[^"]*"\s*\/>/,
      `<link rel="canonical" href="${escapeXml(canonical)}" />`
    );
    out = out.replace(
      /<meta property="og:url" content="[^"]*"\s*\/>/,
      `<meta property="og:url" content="${escapeXml(canonical)}" />`
    );
  }
  return out;
}

function escapeXml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function normalizeArticlePath(href) {
  try {
    const u = new URL(href, "https://serenity.agency");
    let p = u.pathname;
    if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
    return p.toLowerCase();
  } catch {
    let p = String(href || "")
      .split("?")[0]
      .replace(/^https?:\/\/[^/]+/i, "");
    if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
    if (!p.startsWith("/")) p = `/${p}`;
    return p.toLowerCase();
  }
}

/** Из старого readAlsoHtml: пары href + заголовок из h3. */
function extractReadAlsoEntries(readAlsoHtml) {
  if (!readAlsoHtml) return [];
  const entries = [];
  const re = /<a\s+[^>]*?href="([^"]+)"[^>]*>[\s\S]*?<h3[^>]*>([\s\S]*?)<\/h3>/gi;
  let m;
  while ((m = re.exec(readAlsoHtml)) !== null) {
    const title = m[2].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    entries.push({ href: m[1], title });
  }
  return entries;
}

function buildPostsIndex(posts) {
  const m = new Map();
  for (const p of posts || []) {
    m.set(normalizeArticlePath(p.href), p);
  }
  return m;
}

function buildReadMoreSectionHtml(entries, postsByPath) {
  if (!entries.length) return "";
  const cards = entries
    .map((e, idx) => {
      const post = postsByPath.get(normalizeArticlePath(e.href));
      const imageUrl =
        post?.media?.kind === "video" ? post.media.poster : post?.media?.image;
      const title = escapeXml(e.title || post?.description || "");
      const href = escapeXml(e.href);
      const blank = post?.isResource ? ' target="_blank" rel="noopener noreferrer"' : "";
      const fp = idx < 2 ? "high" : "low";
      const ld = idx < 2 ? "eager" : "lazy";
      if (!imageUrl) {
        return `                  <a class="blog-read-more__card blog-read-more__card--noimg" href="${href}"${blank}><span class="blog-read-more__card-title">${title}</span></a>`;
      }
      const src = escapeXml(imageUrl);
      return `                  <a class="blog-read-more__card" href="${href}"${blank}>
                    <img class="blog-read-more__card-img" alt="" src="${src}" fetchpriority="${fp}" decoding="async" loading="${ld}" />
                    <span class="blog-read-more__card-gradient" aria-hidden="true"></span>
                    <span class="blog-read-more__card-title">${title}</span>
                  </a>`;
    })
    .join("\n");

  return `<section class="blog-read-more" aria-labelledby="blog-read-more-heading">
            <div class="page__container blog-read-more__inner" data-v-27a87df0="">
              <h2 id="blog-read-more-heading" class="blog-read-more__title">Читайте еще</h2>
              <div class="blog-read-more__scroller">
                <div class="blog-read-more__track">
${cards}
                </div>
              </div>
            </div>
          </section>`;
}

(() => {
  if (!fs.existsSync(listingPath)) throw new Error(`Нет ${listingPath}`);
  if (!fs.existsSync(manifestPath)) {
    console.log("OK: нет манифеста статей — пропуск");
    process.exit(0);
  }

  let postsByPath = new Map();
  if (fs.existsSync(blogsAllPath)) {
    try {
      const blogsAll = JSON.parse(fs.readFileSync(blogsAllPath, "utf8"));
      postsByPath = buildPostsIndex(blogsAll.posts);
    } catch (e) {
      console.warn("WARN: не прочитан blogs-all.json — превью «Читайте еще» без обложек:", e.message);
    }
  }

  const slugs = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  if (!Array.isArray(slugs) || slugs.length === 0) {
    console.log("OK: blog-articles-manifest пуст");
    process.exit(0);
  }

  const blogIndex = fs.readFileSync(listingPath, "utf8");
  const startReplace = blogIndex.indexOf('<div class="page-container nuxt case-all-page"');
  const endReplace = blogIndex.indexOf('<div class="scroll-container case-all-scroll-footer"');
  if (startReplace === -1 || endReplace === -1) {
    throw new Error("blog/index.html: не найдены маркеры page-container / scroll-container");
  }

  const prefix = blogIndex.slice(0, startReplace);
  const suffix = stripBlogJs(blogIndex.slice(endReplace));

  for (const slug of slugs) {
    if (!slug || typeof slug !== "string") continue;
    const jp = path.join(jsonDir, `${slug}.json`);
    if (!fs.existsSync(jp)) {
      console.warn(`WARN: нет данных ${jp} — сначала npm run sync:blog-articles (или sync в build:blog)`);
      continue;
    }
    const data = JSON.parse(fs.readFileSync(jp, "utf8"));
    const body = data.bodyHtml || "";
    const readAlso = (data.readAlsoHtml || "").trim();
    const title = data.title || slug;
    const description = data.description || "";
    const canonical = data.canonical || `https://serenity.agency/blog/article/${slug}`;

    let headPart = injectHead(prefix, { title, description, canonical });
    const entries = extractReadAlsoEntries(readAlso);
    const readMoreBlock = buildReadMoreSectionHtml(entries, postsByPath);
    const outHtml = readAlso
      ? `${headPart}${body}\n${readMoreBlock}\n${suffix}`
      : `${headPart}${body}\n${suffix}`;

    const outDir = path.join(root, "blog", "article", slug);
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, "index.html"), outHtml, "utf8");
    console.log("OK: blog/article/", slug, "/");
  }
})();

/**
 * Регрессия блока «Читайте ещё» на страницах blog/article|case|card|life.
 * Дублирует логику buildReadMoreSection в build-blog-article-pages.mjs.
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const READ_MORE_NEIGHBORS = 4;
const READ_MORE_EDGE = 8;

function normBlogPath(href) {
  if (!href) return "";
  try {
    const u = new URL(href, "https://serenity.agency");
    let p = u.pathname || "";
    if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
    return p;
  } catch {
    let p = String(href);
    if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
    return p;
  }
}

function articleSlugFromHref(href) {
  const p = normBlogPath(href);
  const m = p.match(/^\/blog\/article\/([^/]+)$/);
  return m && m[1] !== "article" ? m[1] : "";
}

function buildStaticArticleFeed(allPosts) {
  const out = [];
  const seen = new Set();
  for (const p of allPosts || []) {
    const sl = articleSlugFromHref(p.href);
    if (!sl || seen.has(sl)) continue;
    seen.add(sl);
    out.push(p);
  }
  return out;
}

function postPathFromCtx(ctx) {
  const segment = String(ctx.segment || "article").trim();
  const slug = String(ctx.slug || "").trim();
  if (!slug) return "";
  return normBlogPath(`/blog/${segment}/${slug}`);
}

function expectedReadMoreHrefs(ctx, articleFeed, fullFeed) {
  const currentPath = postPathFromCtx(ctx);
  const useArticleOnlyFeed = ctx.segment === "article";
  const rawFeed =
    useArticleOnlyFeed && articleFeed.length > 0
      ? articleFeed
      : fullFeed.length > 0
        ? fullFeed
        : articleFeed;
  const feed = rawFeed.filter((p) => normBlogPath(p.href).startsWith("/blog/"));
  if (!feed.length || !currentPath) return [];

  const isCurrent = (p) => normBlogPath(p.href) === currentPath;
  const idx = feed.findIndex(isCurrent);
  let related = [];
  if (idx === -1) {
    if (!useArticleOnlyFeed) return [];
    const currentSlug = ctx.slug;
    related = feed
      .filter((p) => articleSlugFromHref(p.href) !== currentSlug)
      .slice(0, READ_MORE_EDGE);
  } else {
    const beforeCount = idx;
    const afterCount = feed.length - 1 - idx;
    if (beforeCount < READ_MORE_NEIGHBORS) {
      related = feed.slice(idx + 1, idx + 1 + READ_MORE_EDGE);
    } else if (afterCount < READ_MORE_EDGE) {
      related = feed.slice(Math.max(0, idx - READ_MORE_EDGE), idx);
    } else {
      related = [
        ...feed.slice(idx - READ_MORE_NEIGHBORS, idx),
        ...feed.slice(idx + 1, idx + 1 + READ_MORE_NEIGHBORS),
      ];
    }
  }
  const afterCountForNewest = idx === -1 ? READ_MORE_EDGE : feed.length - 1 - idx;
  const usedBackwardEdge =
    idx !== -1 && afterCountForNewest < READ_MORE_EDGE && idx >= READ_MORE_NEIGHBORS;
  const newest = feed[0];
  if (!usedBackwardEdge && newest && !isCurrent(newest)) {
    const newestHref = normBlogPath(newest.href);
    if (!related.some((p) => normBlogPath(p.href) === newestHref)) {
      const merged = [newest, ...related];
      const seen = new Set();
      const deduped = [];
      for (const p of merged) {
        const h = normBlogPath(p.href);
        if (seen.has(h)) continue;
        seen.add(h);
        deduped.push(p);
        if (deduped.length >= READ_MORE_EDGE) break;
      }
      related = deduped;
    }
  }
  return related.map((p) => normBlogPath(p.href));
}

function actualReadMoreHrefs(html) {
  const i = html.indexOf("blog-read-more");
  if (i < 0) return null;
  const block = html.slice(i, html.indexOf("</section>", i));
  return [...block.matchAll(/href="([^"]+)"/g)].map((m) => normBlogPath(m[1]));
}

/** Регрессия: padding только на > a, не один padding:0 на .case без компенсации. */
function verifyReadMoreCardPaddingCss() {
  const cssPath = path.join(root, "css/css__home-snapshot__overrides.parity-sync.css");
  const css = fs.readFileSync(cssPath, "utf8");
  const anchor =
    "html:has(.blog-article-page-top) .blog-read-more .blog-block__content-box-slide .case[data-v-c0adc676]";
  const aPadding =
    "html:has(.blog-article-page-top) .blog-read-more .case.more-blog-case > a[data-v-c0adc676]";
  if (!css.includes(anchor) || !css.includes("padding: 0 !important")) {
    throw new Error(
      "verify-blog-read-more: в parity-sync ожидается padding:0 на .case в read-more (article pages)",
    );
  }
  if (!css.includes(aPadding) || !css.includes("padding: 26px 32px 33px")) {
    throw new Error(
      "verify-blog-read-more: в parity-sync нужен padding: 26px 32px 33px на .blog-read-more .case > a (страницы статей)",
    );
  }
}

function main() {
  verifyReadMoreCardPaddingCss();
  const blogs = JSON.parse(fs.readFileSync(path.join(root, "json/blogs-all.json"), "utf8"));
  const fullFeed = blogs.posts || [];
  const articleFeed = buildStaticArticleFeed(fullFeed);
  const postManifest = JSON.parse(
    fs.readFileSync(path.join(root, "json/blog-post-pages-manifest.json"), "utf8"),
  );
  const articleSlugs = JSON.parse(
    fs.readFileSync(path.join(root, "json/blog-articles-manifest.json"), "utf8"),
  );

  const errors = [];
  const check = (segment, slug) => {
    const htmlPath = path.join(root, "blog", segment, slug, "index.html");
    if (!fs.existsSync(htmlPath)) {
      errors.push(`${segment}/${slug}: нет index.html`);
      return;
    }
    const html = fs.readFileSync(htmlPath, "utf8");
    const exp = expectedReadMoreHrefs({ segment, slug }, articleFeed, fullFeed);
    const act = actualReadMoreHrefs(html);
    if (act === null) {
      if (exp.length > 0) errors.push(`${segment}/${slug}: нет blog-read-more, ожидалось ${exp.length} карточек`);
      return;
    }
    if (exp.join("|") !== act.join("|")) {
      errors.push(
        `${segment}/${slug}: подборка не совпадает\n  ожидание: ${exp.join(", ")}\n  в HTML:   ${act.join(", ")}`,
      );
    }
    const rmIdx = html.indexOf("blog-read-more");
    if (rmIdx >= 0) {
      const readMoreBlock = html.slice(rmIdx, html.indexOf("</section>", rmIdx));
      if (/data-native-row\s*=\s*["']1["']/.test(readMoreBlock)) {
        errors.push(
          `${segment}/${slug}: в blog-read-more не должно быть data-native-row="1" в HTML — иначе app.js initRow не инициализирует ряд`,
        );
      }
    }
  };

  for (const row of postManifest) {
    check(row.segment, row.slug);
  }
  for (const slug of articleSlugs) {
    check("article", slug);
  }

  if (errors.length) {
    console.error("verify-blog-read-more: FAIL\n" + errors.join("\n\n"));
    process.exit(1);
  }
  console.log(
    `OK: verify-blog-read-more (${postManifest.length} post-pages + ${articleSlugs.length} articles)`,
  );
}

main();

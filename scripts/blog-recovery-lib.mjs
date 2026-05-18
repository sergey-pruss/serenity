/**
 * Общие функции восстановления блога из Wayback (HTML + медиа).
 */
import fs from "fs";
import path from "path";
import { normalizeBlogArticleBodyHtml } from "./normalize-blog-article-body-html.mjs";
import { normalizeBlogMetaDescription } from "./normalize-blog-meta-description.mjs";
import { pickBlogCardCoverFromBody, stripBlogCategoryFromTitle } from "./normalize-blog-article-title.mjs";

const ORIGIN = "https://serenity.agency";
const CDX_API = "https://web.archive.org/cdx/search/cdx";

const RU_MONTHS = {
  января: 0,
  февраля: 1,
  марта: 2,
  апреля: 3,
  мая: 4,
  июня: 5,
  июля: 6,
  августа: 7,
  сентября: 8,
  октября: 9,
  ноября: 10,
  декабря: 11,
};

export function canonBlogHref(href) {
  let h = String(href || "").trim();
  if (!h) return "";
  try {
    const u = new URL(h, ORIGIN);
    let p = u.pathname || "";
    if (!p.endsWith("/")) p += "/";
    return p;
  } catch {
    if (!h.startsWith("/")) h = `/${h}`;
    if (!h.endsWith("/")) h += "/";
    return h;
  }
}

export function parseRuBlogDate(text) {
  const s = String(text || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  const m = s.match(/(\d{1,2})\s+([а-яё]+)\s+(\d{4})/i);
  if (!m) return "";
  const day = Number(m[1]);
  const mon = RU_MONTHS[m[2]];
  const year = Number(m[3]);
  if (mon == null || !day || !year) return "";
  const d = new Date(Date.UTC(year, mon, day, 12, 0, 0));
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
}

export function unwrapWaybackHtml(html) {
  let out = String(html || "");
  out = out.replace(
    /https?:\/\/web\.archive\.org\/web\/\d+(?:im_|js_|cs_|if_)?\/https?:\/\//gi,
    "https://"
  );
  out = out.replace(/https:\/\/web\.archive\.org\/web\/\d+(?:im_|js_|cs_|if_)?\//gi, "");
  out = out.replace(/href="\/web\/\d+\/\//gi, 'href="/');
  out = out.replace(/content="\/\/web\.archive\.org\/web\/\d+\/https?:\/\//gi, 'content="https://');
  out = out.replace(/content="\/\/web\.archive\.org\/web\/\d+\/\//gi, 'content="//');
  return out;
}

function stripTags(s) {
  return String(s || "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Страницы /blog/video/… (Nuxt): собираем каноническую шапку + встраивание YouTube из payload. */
function extractVideoBlogAsArticle(html) {
  const titleM = html.match(/<h1[^>]*class="visually-hidden"[^>]*>([\s\S]*?)<\/h1>/i);
  const title = stripTags(titleM?.[1]) || stripTags(html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]);
  const ytM =
    html.match(/youtube\.com\\u002Fwatch\?v=([A-Za-z0-9_-]+)/i) ||
    html.match(/youtube\.com\/watch\?v=([A-Za-z0-9_-]+)/i);
  const ytId = ytM?.[1] || "";
  const descrM = html.match(/<meta[^>]+name="description"[^>]+content="([^"]*)"/i);
  const subtitle = descrM ? stripTags(descrM[1]) : "";
  const safeTitle = title.replace(/"/g, "&quot;");
  const embed = ytId
    ? `<section class="lighttheme article_section_l"><div class="row"><div class="article-section text-content"><div class="article-section__info"><div><p><span class="blog__video-embed" style="display:block;position:relative;padding-bottom:56.25%;height:0;overflow:hidden;max-width:100%"><iframe style="position:absolute;top:0;left:0;width:100%;height:100%" src="https://www.youtube.com/embed/${ytId}" title="${safeTitle}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe></span></p></div></div></div></div></section>`
    : "";
  return `<section class="blog-header darktheme"><div class="row"><div class="area-header"><div class="area-header__caption blog-header__caption"><a href="/blog/article/" class="blog-header__caption-link">Статьи</a> <div itemprop="datePublished" class="blog-header__date"></div></div> <h1 class="blog-header__title">${title}</h1> <div class="blog-header__descr"><p>${subtitle}</p></div></div></div></section>${embed}`;
}

export function extractArticleHtml(pageHtml) {
  const html = unwrapWaybackHtml(pageHtml);
  const start = html.search(/<section[^>]*class="[^"]*\bblog-header\b[^"]*\bdarktheme\b/);
  const end = html.search(/<section[^>]*class="[^"]*\bdarktheme\b[^"]*\bblog-articles\b/);
  if (start !== -1 && end !== -1 && end > start) {
    return html.slice(start, end).trim();
  }
  if (html.includes("video-player") || html.includes('class="visually-hidden"')) {
    return extractVideoBlogAsArticle(html);
  }
  throw new Error("Не найдены границы статьи (blog-header / blog-articles)");
}

export function extractHeroFields(bodyHtml) {
  const titleM = bodyHtml.match(/class="[^"]*blog-header__title[^"]*"[^>]*>([\s\S]*?)<\//i);
  const descrM = bodyHtml.match(/class="[^"]*blog-header__descr[^"]*"[^>]*>([\s\S]*?)<\//i);
  const dateM = bodyHtml.match(/class="[^"]*blog-header__date[^"]*"[^>]*>([\s\S]*?)<\//i);
  const strip = (s) =>
    String(s || "")
      .replace(/<[^>]+>/g, "")
      .replace(/\s+/g, " ")
      .trim();
  return {
    heroTitle: strip(titleM?.[1]),
    heroSubtitle: strip(descrM?.[1]),
    dateText: strip(dateM?.[1]),
  };
}

export function parseMeta(pageHtml) {
  const html = unwrapWaybackHtml(pageHtml);
  const titleM = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  let descM = html.match(/<meta[^>]+name="description"[^>]+content="([^"]*)"/i);
  if (!descM) {
    descM = html.match(/<meta[^>]+property="og:description"[^>]+content="([^"]*)"/i);
  }
  const canonM = html.match(/<link[^>]+rel="canonical"[^>]+href="([^"]*)"/i);
  const rawDesc = descM ? descM[1].trim() : "";
  return {
    title: titleM ? stripBlogCategoryFromTitle(titleM[1]) : "",
    description: normalizeBlogMetaDescription(rawDesc),
    canonical: canonM ? canonM[1].trim() : "",
  };
}

function rewriteSerenityInternalUrls(html) {
  return String(html || "")
    .replace(/https:\/\/serenity\.agency\//g, "/")
    .replace(/http:\/\/serenity\.agency\//g, "/")
    .replace(/https?:\/\/serenity\.serenity-dev\.ru\//g, "/");
}

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

async function ensureAsset(url, root, slug) {
  let fetchUrl = url;
  try {
    const u = new URL(url);
    if (!/serenity\.agency$/i.test(u.hostname)) {
      return url;
    }
    fetchUrl = u.href;
  } catch {
    return url;
  }
  let pathname;
  try {
    pathname = new URL(fetchUrl).pathname;
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
  const res = await fetch(fetchUrl);
  if (!res.ok) {
    console.warn(`WARN: не скачан ${fetchUrl} (${res.status})`);
    return url;
  }
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
  return `/_sa/img/blog/${slug}/${safe}`;
}

export async function rewriteAssetUrls(html, root, slug) {
  let out = rewriteSerenityInternalUrls(unwrapWaybackHtml(html));

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

  const wpRe =
    /https:\/\/serenity\.agency\/admin\/wp-content\/uploads\/[a-zA-Z0-9/_.-]+\.(?:jpe?g|png|gif|webp|svg|mp4|webm|pdf)/gi;
  const seen = new Set();
  for (const m of out.matchAll(new RegExp(wpRe.source, "gi"))) {
    const u = m[0];
    if (seen.has(u)) continue;
    seen.add(u);
    const local = await ensureAsset(u, root, slug);
    out = out.split(u).join(local);
  }

  const relWpRe =
    /\/admin\/wp-content\/uploads\/[a-zA-Z0-9/_.-]+\.(?:jpe?g|png|gif|webp|svg|mp4|webm|pdf)/g;
  const relSeen = new Set();
  for (const m of out.matchAll(new RegExp(relWpRe.source, "g"))) {
    const p = m[0];
    if (relSeen.has(p)) continue;
    relSeen.add(p);
    const local = await ensureAsset(`${ORIGIN}${p}`, root, slug);
    out = out.split(p).join(local);
  }

  out = out.replace(/href="\/blog\/article"/g, 'href="/blog/article/"');
  out = out.replace(/href="\/blog\/case"/g, 'href="/blog/case/"');
  out = out.replace(/href="\/blog\/card"/g, 'href="/blog/card/"');
  out = out.replace(/href="\/blog\/life"/g, 'href="/blog/life/"');
  return out;
}

async function fetchWithRetry(url, opts = {}, attempts = 5) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, {
        ...opts,
        headers: { "User-Agent": "serenity-blog-recovery/1.0", ...(opts.headers || {}) },
      });
      if (res.status === 503 || res.status === 429 || res.status === 504) {
        lastErr = new Error(`HTTP ${res.status}`);
        await new Promise((r) => setTimeout(r, 2000 * (i + 1)));
        continue;
      }
      if (!res.ok) {
        lastErr = new Error(`HTTP ${res.status}`);
        await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
        continue;
      }
      return res;
    } catch (e) {
      lastErr = e;
      await new Promise((r) => setTimeout(r, 2000 * (i + 1)));
    }
  }
  throw lastErr || new Error("fetch failed");
}

export async function fetchLatestWaybackTimestamp(originalUrl) {
  const u = new URL(originalUrl);
  const pathKey = u.pathname.replace(/\/$/, "");
  const cdxUrl = `${CDX_API}?url=${encodeURIComponent(`${u.hostname}${pathKey}*`)}&output=json&filter=statuscode:200&limit=20`;
  const res = await fetchWithRetry(cdxUrl, {}, 8);
  const rows = await res.json();
  if (!Array.isArray(rows) || rows.length < 2) return "";
  let best = "";
  for (let i = 1; i < rows.length; i++) {
    const ts = String(rows[i]?.[1] || "");
    if (ts > best) best = ts;
  }
  return best;
}

export async function fetchWaybackPage(originalUrl) {
  const ts = await fetchLatestWaybackTimestamp(originalUrl);
  if (!ts) throw new Error("нет снимка Wayback");
  const wbUrl = `https://web.archive.org/web/${ts}/${originalUrl}`;
  const res = await fetchWithRetry(wbUrl, { redirect: "follow" });
  if (!res.ok) throw new Error(`Wayback HTML ${res.status}`);
  return { html: await res.text(), timestamp: ts, waybackUrl: wbUrl };
}

export function segmentTags(segment) {
  switch (segment) {
    case "case":
      return { tags: ["Кейсы"], tagCodes: ["case"], tagCodesNorm: ["case"] };
    case "life":
      return { tags: ["Наша жизнь"], tagCodes: ["life"], tagCodesNorm: ["life"] };
    case "card":
      return { tags: ["Статьи"], tagCodes: ["article"], tagCodesNorm: ["article"] };
    default:
      return { tags: ["Статьи"], tagCodes: ["article"], tagCodesNorm: ["article"] };
  }
}

export async function fetchWaybackPageForPath(pathname) {
  const p = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const originalUrl = `${ORIGIN}${p.endsWith("/") ? p : `${p}/`}`;
  return fetchWaybackPage(originalUrl);
}

export async function recoverBlogEntry({ segment, slug, root, tryPaths = [] }) {
  const href = `/blog/${segment}/${slug}/`;
  const assetKey = segment === "article" ? slug : `${segment}__${slug}`;

  const candidates = [
    `/blog/${segment}/${slug}/`,
    ...tryPaths.map((p) => (String(p).startsWith("/") ? p : `/${p}`)),
  ];
  let html = "";
  let timestamp = "";
  let waybackUrl = "";
  let sourcePath = "";
  let lastErr;
  for (const p of candidates) {
    const canon = p.endsWith("/") ? p : `${p}/`;
    try {
      const hit = await fetchWaybackPageForPath(canon);
      html = hit.html;
      timestamp = hit.timestamp;
      waybackUrl = hit.waybackUrl;
      sourcePath = canon;
      break;
    } catch (e) {
      lastErr = e;
    }
  }
  if (!html) throw lastErr || new Error("нет снимка Wayback");
  const originalUrl = `${ORIGIN}${sourcePath}`;
  const meta = parseMeta(html);
  let bodyHtml = extractArticleHtml(html);
  const hero = extractHeroFields(bodyHtml);
  bodyHtml = await rewriteAssetUrls(bodyHtml, root, assetKey);
  bodyHtml = bodyHtml.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");
  bodyHtml = normalizeBlogArticleBodyHtml(bodyHtml);

  const publishDate = parseRuBlogDate(hero.dateText);
  const title = stripBlogCategoryFromTitle(hero.heroTitle || meta.title || slug);
  const description = meta.description || hero.heroSubtitle || title;
  const tagInfo = segmentTags(segment);
  const coverImage = pickBlogCardCoverFromBody(bodyHtml);

  const card = {
    href,
    description: title,
    subtitle: hero.heroSubtitle || "",
    ...tagInfo,
    linkClass: coverImage ? "white-text" : "dark-text",
    isResource: false,
    ...(coverImage ? {} : { skipCardMedia: true }),
    publishDate,
    media: { kind: "picture", image: coverImage },
  };

  const pageJson = {
    slug: segment === "article" ? slug : undefined,
    segment: segment === "article" ? undefined : segment,
    sourceUrl: originalUrl,
    waybackUrl,
    waybackTimestamp: timestamp,
    title: stripBlogCategoryFromTitle(meta.title || title),
    description,
    canonical: meta.canonical || originalUrl.replace(/\/$/, ""),
    bodyHtml,
    publishDate,
    recoveredAt: new Date().toISOString(),
  };

  if (segment === "article") {
    const outPath = path.join(root, "json", "blog-articles", `${slug}.json`);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    const payload = {
      slug,
      sourceUrl: pageJson.sourceUrl,
      title: stripBlogCategoryFromTitle(pageJson.title),
      description: pageJson.description,
      canonical: pageJson.canonical,
      bodyHtml: pageJson.bodyHtml,
      publishDate: pageJson.publishDate,
      syncedAt: pageJson.recoveredAt,
      recoveredFromWayback: true,
    };
    fs.writeFileSync(outPath, JSON.stringify(payload, null, 2), "utf8");
  } else {
    const segDir = path.join(root, "json", "blog-post-pages", segment);
    fs.mkdirSync(segDir, { recursive: true });
    const payload = {
      segment,
      slug,
      sourceUrl: pageJson.sourceUrl,
      title: stripBlogCategoryFromTitle(pageJson.title),
      description: pageJson.description,
      canonical: pageJson.canonical,
      bodyHtml: pageJson.bodyHtml,
      publishDate: pageJson.publishDate,
      syncedAt: pageJson.recoveredAt,
      recoveredFromWayback: true,
    };
    fs.writeFileSync(path.join(segDir, `${slug}.json`), JSON.stringify(payload, null, 2), "utf8");
  }

  return { card, assetKey };
}

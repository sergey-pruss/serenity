#!/usr/bin/env node
/**
 * Загружает список материалов блога с API (как кейсы), подмешивает ручные посты из
 * json/blog-posts-manual.json (материалы без админки) и пишет:
 * - json/blogs-all.json
 * - js/blogs-all-data.js (опциональный снимок для отладки)
 *
 * Порядок ленты: merge API + json/blog-posts-recovered.json + json/blog-posts-manual.json
 * (при совпадении href: manual > recovered > API), сортировка по publishDate (новые выше).
 */
import fs from "fs";
import path from "path";
import { EXCLUDED_BLOG_HREFS } from "./blog-excluded-hrefs.mjs";

const API_BASE = "https://serenity.agency/api/blog";

const FILTERS = [
  { code: "", label: "Все" },
  { code: "life", label: "Наша жизнь" },
  { code: "case", label: "Кейсы" },
  { code: "article", label: "Статьи" },
  { code: "podcast", label: "Подкаст" },
];

/** Легаси-коды категорий в API → канон для фильтров /blog/{code}/ */
const NORM_CODE = {
  keisy: "case",
  statyi: "article",
  nashsaizn: "life",
};

const normalizeCode = (code) => NORM_CODE[String(code || "").toLowerCase()] || String(code || "");

/** Подпись категории life в карточках — как в фильтре (вторая часть с маленькой буквы), независимо от CMS. */
function displayCategoryName(codeRaw, nameRaw) {
  const codeNorm = normalizeCode(String(codeRaw || "").trim());
  const name = String(nameRaw || "").trim();
  if (codeNorm === "life" || /^наша\s+жизнь$/i.test(name)) {
    const fromFilter = FILTERS.find((f) => f.code === "life");
    return fromFilter ? fromFilter.label : "Наша жизнь";
  }
  return name;
}

/** Ключ для json/blog-card-overrides.json — путь с ведущим / и завершающим /. */
function canonBlogHref(href) {
  let h = String(href || "").trim();
  if (!h) return "";
  try {
    const u = new URL(h, "https://serenity.agency");
    let p = u.pathname || "";
    if (!p.endsWith("/")) p += "/";
    return p;
  } catch {
    if (!h.startsWith("/")) h = `/${h}`;
    if (!h.endsWith("/")) h += "/";
    return h;
  }
}

/**
 * В карточке листинга не показываем «Статьи», если материал — выпуск «Мышеловки» и уже есть тег «Подкаст»
 * (фильтр по `tagCodesNorm` не трогаем — пост остаётся и в «Статьях», и в «Подкасте»).
 */
function normalizeMyshelovkaPodcastCardTags(posts) {
  const haystack = (p) => `${String(p.description || "")}\n${String(p.subtitle || "")}`;
  const mentionsMyshelovka = (p) => /мышеловк/i.test(haystack(p));
  const isPodcastLabel = (t) => /^подкаст$/i.test(String(t || "").trim());
  const isStatyiLabel = (t) => /^статьи$/i.test(String(t || "").trim());
  return posts.map((p) => {
    if (!mentionsMyshelovka(p)) return p;
    const tags = Array.isArray(p.tags) ? [...p.tags] : [];
    if (!tags.some(isPodcastLabel)) return p;
    const next = tags.filter((t) => !isStatyiLabel(t));
    if (next.length === tags.length) return p;
    return { ...p, tags: next.length ? next : tags };
  });
}

/** Подмешивает подписи карточек (hover = subtitle), если в CMS поля перепутаны или пусты. */
function applyBlogCardOverrides(posts, root) {
  const overridePath = path.join(root, "json", "blog-card-overrides.json");
  if (!fs.existsSync(overridePath)) return posts;
  let raw = {};
  try {
    raw = JSON.parse(fs.readFileSync(overridePath, "utf8"));
  } catch (e) {
    console.warn("WARN: blog-card-overrides.json:", e.message);
    return posts;
  }
  if (!raw || typeof raw !== "object") return posts;
  return posts.map((post) => {
    const key = canonBlogHref(post.href);
    const o = raw[key] || raw[post.href];
    if (!o || typeof o !== "object") return post;
    const next = { ...post };
    if ("description" in o && o.description != null) next.description = String(o.description);
    if ("subtitle" in o && o.subtitle != null) next.subtitle = String(o.subtitle);
    if ("linkClass" in o && o.linkClass != null) next.linkClass = String(o.linkClass);
    if ("mediaObjectPosition" in o && o.mediaObjectPosition != null) {
      next.mediaObjectPosition = String(o.mediaObjectPosition);
    }
    if ("cardModifier" in o && o.cardModifier != null) next.cardModifier = String(o.cardModifier);
    return next;
  });
}

/** Канонический путь на нашем сайте (для карточек → статические /blog/article/slug/). */
function toSitePath(fullUrl) {
  if (!fullUrl) return "";
  try {
    const u = new URL(String(fullUrl));
    if (!/serenity\.agency$/i.test(u.hostname)) return String(fullUrl);
    let p = u.pathname;
    if (!p.endsWith("/")) p += "/";
    return p;
  } catch {
    return String(fullUrl);
  }
}

/** Внутренние пути блога остаются относительными — статические страницы под /blog/case|card|life/<slug>/. */
function absoluteLegacyBlogPath(href) {
  return String(href || "").trim();
}

/** Превью и видео блога — только из img/blog/ (заполняется scripts/sync-blog-images.mjs), иначе fallback на прод. */
function blogMediaUrl(filename) {
  if (!filename) return "";
  const safe = path.basename(String(filename).split("?")[0]);
  if (!safe) return "";
  const blogDir = path.join(process.cwd(), "img", "blog");
  const candidates = [safe];
  if (/\.jpe?g$/i.test(safe)) {
    candidates.push(safe.replace(/\.jpe?g$/i, ".webp"));
  }
  for (const name of candidates) {
    if (fs.existsSync(path.join(blogDir, name))) {
      return `/_sa/img/blog/${name}`;
    }
  }
  return `https://serenity.agency/storage/${safe}`;
}

/** Локальный /_sa/ или storage/ → blogMediaUrl по имени файла (после merge manual/recovered). */
function resolveListingMediaImage(imageUrl) {
  const s = String(imageUrl || "").trim();
  if (!s) return s;
  const pathOnly = s.split("?")[0];
  const query = s.includes("?") ? s.slice(s.indexOf("?")) : "";
  if (pathOnly.startsWith("/_sa/img/blog/")) {
    const rel = pathOnly.replace(/^\/_sa\//, "");
    if (fs.existsSync(path.join(process.cwd(), rel))) return pathOnly + query;
  }
  const storageMatch = pathOnly.match(/\/storage\/([^/?#]+)/i);
  const fileFromPath = storageMatch ? storageMatch[1] : path.basename(pathOnly);
  return blogMediaUrl(fileFromPath);
}

function normalizePostListingMedia(post) {
  const media = post?.media;
  if (!media || typeof media !== "object") return post;
  if (media.kind === "video") {
    const next = { ...media };
    if (next.poster) next.poster = resolveListingMediaImage(next.poster);
    if (next.videoSrc && !String(next.videoSrc).startsWith("http")) {
      next.videoSrc = blogMediaUrl(path.basename(String(next.videoSrc)));
    }
    return { ...post, media: next };
  }
  if (!media.image) return post;
  return { ...post, media: { ...media, image: resolveListingMediaImage(media.image) } };
}

const MANUAL_POSTS_JSON = path.join("json", "blog-posts-manual.json");
const RECOVERED_POSTS_JSON = path.join("json", "blog-posts-recovered.json");

/** Ручной пост: тот же контракт полей, что у элемента posts в blogs-all.json. */
function normalizeManualPostEntry(raw, index) {
  if (!raw || typeof raw !== "object") return null;
  const hrefRaw = raw.href != null ? String(raw.href).trim() : "";
  if (!hrefRaw) {
    console.warn(`WARN: blog-posts-manual.json [${index}] пропущен: пустой href`);
    return null;
  }
  const href = absoluteLegacyBlogPath(toSitePath(hrefRaw));
  const canon = canonBlogHref(href);
  if (!canon) {
    console.warn(`WARN: blog-posts-manual.json [${index}] пропущен: неразобранный href`);
    return null;
  }
  if (EXCLUDED_BLOG_HREFS.has(canon)) {
    console.warn(`WARN: blog-posts-manual.json [${index}] в списке исключений: ${href}`);
    return null;
  }
  const media = raw.media;
  if (!media || typeof media !== "object") {
    console.warn(`WARN: blog-posts-manual.json [${index}] пропущен: нет объекта media`);
    return null;
  }
  if (media.kind === "video") {
    if (!media.videoSrc || !String(media.videoSrc).trim()) {
      console.warn(`WARN: blog-posts-manual.json [${index}] пропущен: video без videoSrc`);
      return null;
    }
  } else if (media.kind === "picture" || !media.kind) {
    const skipCardMedia = raw.skipCardMedia === true;
    if (!skipCardMedia && (!media.image || !String(media.image).trim())) {
      console.warn(`WARN: blog-posts-manual.json [${index}] пропущен: picture без image`);
      return null;
    }
  } else {
    console.warn(`WARN: blog-posts-manual.json [${index}] пропущен: неизвестный media.kind`);
    return null;
  }

  const tagCodesRaw = Array.isArray(raw.tagCodes)
    ? raw.tagCodes.map((c) => String(c || "").trim()).filter(Boolean)
    : [];
  const tagCodesNorm =
    Array.isArray(raw.tagCodesNorm) && raw.tagCodesNorm.length
      ? [...new Set(raw.tagCodesNorm.map((c) => normalizeCode(String(c || ""))).filter(Boolean))]
      : [...new Set(tagCodesRaw.map((c) => normalizeCode(c)).filter(Boolean))];
  const tags = Array.isArray(raw.tags)
    ? raw.tags.map((t) => String(t || "").trim()).filter(Boolean)
    : [];

  const publishDate =
    raw.publishDate != null && String(raw.publishDate).trim()
      ? String(raw.publishDate).trim()
      : "";

  return {
    href,
    description: String(raw.description != null ? raw.description : "").trim(),
    subtitle: String(raw.subtitle != null ? raw.subtitle : "").trim(),
    tags,
    tagCodes: tagCodesRaw.length ? tagCodesRaw : tagCodesNorm,
    tagCodesNorm,
    linkClass: raw.linkClass === "dark-text" ? "dark-text" : "white-text",
    isResource: raw.isResource !== false,
    ...(raw.skipCardMedia === true ? { skipCardMedia: true } : {}),
    ...(raw.mediaObjectPosition ? { mediaObjectPosition: String(raw.mediaObjectPosition) } : {}),
    ...(raw.cardModifier ? { cardModifier: String(raw.cardModifier) } : {}),
    ...(publishDate ? { publishDate } : {}),
    media:
      media.kind === "video"
        ? {
            kind: "video",
            poster: String(media.poster || "").trim(),
            videoSrc: String(media.videoSrc || "").trim(),
          }
        : {
            kind: "picture",
            image: String(media.image || "").trim(),
          },
  };
}

function loadRecoveredPostsForMerge(root) {
  const recoveredPath = path.join(root, RECOVERED_POSTS_JSON);
  if (!fs.existsSync(recoveredPath)) return [];
  let doc;
  try {
    doc = JSON.parse(fs.readFileSync(recoveredPath, "utf8"));
  } catch (e) {
    console.warn("WARN: blog-posts-recovered.json:", e.message);
    return [];
  }
  const arr = Array.isArray(doc?.posts) ? doc.posts : [];
  const out = [];
  const seenHref = new Set();
  for (let i = 0; i < arr.length; i++) {
    const n = normalizeManualPostEntry(arr[i], i);
    if (!n) continue;
    const k = canonBlogHref(n.href);
    if (seenHref.has(k)) continue;
    seenHref.add(k);
    out.push(n);
  }
  return out;
}

/** Объединяет ленты; при совпадении href побеждает более поздний источник (manual > recovered > API). */
function mergeBlogPostsByHref(apiList, manualList, recoveredList) {
  const map = new Map();
  for (const p of apiList) {
    const k = canonBlogHref(p.href);
    if (k) map.set(k, p);
  }
  for (const p of recoveredList) {
    const k = canonBlogHref(p.href);
    if (k) map.set(k, p);
  }
  for (const p of manualList) {
    const k = canonBlogHref(p.href);
    if (k) map.set(k, p);
  }
  return [...map.values()];
}

function sortPostsByPublishDate(posts, manualHrefKeys = new Set()) {
  return [...posts].sort((a, b) => {
    const da = String(a.publishDate || "");
    const db = String(b.publishDate || "");
    if (da && db) {
      const byDate = db.localeCompare(da);
      if (byDate !== 0) return byDate;
      const aManual = manualHrefKeys.has(canonBlogHref(a.href));
      const bManual = manualHrefKeys.has(canonBlogHref(b.href));
      if (aManual !== bManual) return aManual ? -1 : 1;
      return 0;
    }
    if (db) return 1;
    if (da) return -1;
    return 0;
  });
}

function loadManualPostsForMerge(root) {
  const manualPath = path.join(root, MANUAL_POSTS_JSON);
  if (!fs.existsSync(manualPath)) return [];
  let doc;
  try {
    doc = JSON.parse(fs.readFileSync(manualPath, "utf8"));
  } catch (e) {
    console.warn("WARN: blog-posts-manual.json:", e.message);
    return [];
  }
  const arr = Array.isArray(doc?.posts) ? doc.posts : [];
  const out = [];
  const seenHref = new Set();
  for (let i = 0; i < arr.length; i++) {
    const n = normalizeManualPostEntry(arr[i], i);
    if (!n) continue;
    const k = canonBlogHref(n.href);
    if (seenHref.has(k)) {
      console.warn(`WARN: blog-posts-manual.json [${i}] дубликат href, пропуск: ${n.href}`);
      continue;
    }
    seenHref.add(k);
    out.push(n);
  }
  return out;
}


function parseAnimation(animationContent) {
  let parsed = [];
  try {
    parsed = JSON.parse(animationContent || "[]");
  } catch {
    return { kind: "picture", frontImage: "", video: "" };
  }
  const first = parsed[0];
  if (!first) return { kind: "picture", frontImage: "", video: "" };
  const media = first.data?.media || {};
  if (first.component === "VideoSection") {
    return {
      kind: "video",
      frontImage: media.frontImage || "",
      video: media.video || "",
    };
  }
  return { kind: "picture", frontImage: media.frontImage || "", video: "" };
}

(async () => {
  const allRaw = [];
  let page = 1;
  let lastPage = 1;
  do {
    const res = await fetch(`${API_BASE}?page=${page}&count=50`);
    if (!res.ok) throw new Error(`API ${res.status}`);
    const chunk = await res.json();
    lastPage = Number(chunk.last_page) || 1;
    const rows = Array.isArray(chunk.data) ? chunk.data : [];
    allRaw.push(...rows);
    page += 1;
  } while (page <= lastPage);

  const root = path.resolve(process.cwd());

  let posts = allRaw.map((item) => {
    let cats = [];
    try {
      cats = JSON.parse(item.categories || "[]");
    } catch {
      cats = [];
    }
    const tagCodesRaw = cats.map((c) => String(c.code || "").trim()).filter(Boolean);
    const tagCodesNorm = [...new Set(tagCodesRaw.map(normalizeCode).filter(Boolean))];
    const tags = cats.map((c) => displayCategoryName(c.code, c.name)).filter(Boolean);
    const anim = parseAnimation(item.animation_content);
    const linkClass = Number(item.is_text_white) === 1 ? "white-text" : "dark-text";
    const previewFile = item.preview ? String(item.preview) : "";
    const frontFromAnim =
      anim.kind === "picture" ? anim.frontImage : anim.kind === "video" ? anim.frontImage : "";
    const imageFile = frontFromAnim || previewFile;

    const media =
      anim.kind === "video" && anim.video
        ? {
            kind: "video",
            poster: blogMediaUrl(frontFromAnim || previewFile),
            videoSrc: blogMediaUrl(anim.video),
          }
        : {
            kind: "picture",
            image: blogMediaUrl(imageFile),
          };

    const publishDate =
      item.publish_date != null && String(item.publish_date).trim()
        ? String(item.publish_date).trim()
        : "";

    return {
      href: absoluteLegacyBlogPath(toSitePath(item.link)),
      description: item.name || "",
      subtitle: item.title ? String(item.title) : "",
      tags,
      tagCodes: tagCodesRaw,
      tagCodesNorm,
      linkClass,
      isResource: Number(item.foreign_resource) === 1,
      publishDate,
      media,
    };
  }).filter((p) => {
    const h = p.href != null ? String(p.href).trim() : "";
    if (!h.length) return false;
    if (EXCLUDED_BLOG_HREFS.has(canonBlogHref(h))) return false;
    return true;
  });

  const manualPosts = loadManualPostsForMerge(root);
  const recoveredPosts = loadRecoveredPostsForMerge(root);
  const manualHrefKeys = new Set(manualPosts.map((p) => canonBlogHref(p.href)).filter(Boolean));
  posts = mergeBlogPostsByHref(posts, manualPosts, recoveredPosts);
  posts = posts.map(normalizePostListingMedia);
  posts = sortPostsByPublishDate(posts, manualHrefKeys);

  posts = applyBlogCardOverrides(posts, root);
  posts = posts.filter((p) => {
    const k = canonBlogHref(p.href);
    return k && !EXCLUDED_BLOG_HREFS.has(k);
  });
  posts = posts.map((p) => ({ ...p, href: absoluteLegacyBlogPath(p.href) }));
  posts = normalizeMyshelovkaPodcastCardTags(posts);

  const payload = {
    builtAt: new Date().toISOString(),
    source: API_BASE,
    sourceManual: "json/blog-posts-manual.json",
    sourceRecovered: "json/blog-posts-recovered.json",
    manualPostsCount: manualPosts.length,
    recoveredPostsCount: recoveredPosts.length,
    filters: FILTERS,
    posts,
  };
  fs.mkdirSync(path.join(root, "json"), { recursive: true });
  const jsonPath = path.join(root, "json", "blogs-all.json");
  fs.writeFileSync(jsonPath, JSON.stringify(payload, null, 2), "utf8");

  const jsPath = path.join(root, "js", "blogs-all-data.js");
  const jsBody =
    `/** Автогенерация: node scripts/build-blog-data.mjs */\n` +
    `window.__SERENITY_BLOG_NEW__ = ${JSON.stringify(payload)};\n`;
  fs.writeFileSync(jsPath, jsBody, "utf8");

  console.log("OK:", jsonPath, jsPath, "posts:", posts.length, "manual:", manualPosts.length);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

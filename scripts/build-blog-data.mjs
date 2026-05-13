#!/usr/bin/env node
/**
 * Загружает список материалов блога с API (как кейсы), подмешивает ручные посты из
 * json/blog-posts-manual.json (материалы без админки) и пишет:
 * - json/blogs-all.json
 * - js/blogs-all-data.js (опциональный снимок для отладки)
 *
 * Порядок ленты: сначала posts из manual (как в файле), затем API без дубликата по
 * каноническому href (ручная запись перекрывает API).
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
  const safe = path.basename(String(filename));
  if (!safe) return "";
  const blogPath = path.join(process.cwd(), "img", "blog", safe);
  if (fs.existsSync(blogPath)) {
    return `/_sa/img/blog/${safe}`;
  }
  return `https://serenity.agency/storage/${safe}`;
}

const MANUAL_POSTS_JSON = path.join("json", "blog-posts-manual.json");

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
    if (!media.image || !String(media.image).trim()) {
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

  return {
    href,
    description: String(raw.description != null ? raw.description : "").trim(),
    subtitle: String(raw.subtitle != null ? raw.subtitle : "").trim(),
    tags,
    tagCodes: tagCodesRaw.length ? tagCodesRaw : tagCodesNorm,
    tagCodesNorm,
    linkClass: raw.linkClass === "dark-text" ? "dark-text" : "white-text",
    isResource: raw.isResource !== false,
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

/** Ручные посты — в начало; дубликаты по href из API удаляются. */
function mergeManualPostsFirst(manualList, apiList) {
  const seen = new Set();
  for (const p of manualList) {
    const k = canonBlogHref(p.href);
    if (k) seen.add(k);
  }
  const rest = apiList.filter((p) => !seen.has(canonBlogHref(p.href)));
  return [...manualList, ...rest];
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

    return {
      href: absoluteLegacyBlogPath(toSitePath(item.link)),
      description: item.name || "",
      subtitle: item.title ? String(item.title) : "",
      tags,
      tagCodes: tagCodesRaw,
      tagCodesNorm,
      linkClass,
      isResource: Number(item.foreign_resource) === 1,
      media,
    };
  }).filter((p) => {
    const h = p.href != null ? String(p.href).trim() : "";
    if (!h.length) return false;
    if (EXCLUDED_BLOG_HREFS.has(canonBlogHref(h))) return false;
    return true;
  });

  const manualPosts = loadManualPostsForMerge(root);
  posts = mergeManualPostsFirst(manualPosts, posts);

  posts = applyBlogCardOverrides(posts, root);
  posts = posts.map((p) => ({ ...p, href: absoluteLegacyBlogPath(p.href) }));
  posts = normalizeMyshelovkaPodcastCardTags(posts);

  const payload = {
    builtAt: new Date().toISOString(),
    source: API_BASE,
    sourceManual: "json/blog-posts-manual.json",
    manualPostsCount: manualPosts.length,
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

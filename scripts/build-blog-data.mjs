#!/usr/bin/env node
/**
 * Загружает список материалов блога с API (как кейсы) и пишет:
 * - json/blogs-all.json
 * - js/blogs-all-data.js (опциональный снимок для отладки)
 */
import fs from "fs";
import path from "path";

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

  const posts = allRaw.map((item) => {
    let cats = [];
    try {
      cats = JSON.parse(item.categories || "[]");
    } catch {
      cats = [];
    }
    const tagCodesRaw = cats.map((c) => String(c.code || "").trim()).filter(Boolean);
    const tagCodesNorm = [...new Set(tagCodesRaw.map(normalizeCode).filter(Boolean))];
    const tags = cats.map((c) => String(c.name || "").trim()).filter(Boolean);
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
      href: toSitePath(item.link),
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
    return h.length > 0;
  });

  const payload = {
    builtAt: new Date().toISOString(),
    source: API_BASE,
    filters: FILTERS,
    posts,
  };

  const root = path.resolve(process.cwd());
  fs.mkdirSync(path.join(root, "json"), { recursive: true });
  const jsonPath = path.join(root, "json", "blogs-all.json");
  fs.writeFileSync(jsonPath, JSON.stringify(payload, null, 2), "utf8");

  const jsPath = path.join(root, "js", "blogs-all-data.js");
  const jsBody =
    `/** Автогенерация: node scripts/build-blog-data.mjs */\n` +
    `window.__SERENITY_BLOG_NEW__ = ${JSON.stringify(payload)};\n`;
  fs.writeFileSync(jsPath, jsBody, "utf8");

  console.log("OK:", jsonPath, jsPath, "posts:", posts.length);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

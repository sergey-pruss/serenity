#!/usr/bin/env node
/**
 * Материалы блога под /blog/case/<slug>/, /blog/card/<slug>/, /blog/life/<slug>/
 * (кроме пагинации life/2/) — для статического синка и HTML как у /blog/article/.
 * Источник путей: json/blogs-all.json (после build-blog-data).
 */
import fs from "fs";
import path from "path";

const root = path.resolve(process.cwd());
const blogsPath = path.join(root, "json", "blogs-all.json");
const outPath = path.join(root, "json", "blog-post-pages-manifest.json");

const ALLOWED = new Set(["case", "card", "life"]);

/** @returns {{ segment: string, slug: string } | null} */
function entryFromHref(href) {
  if (!href) return null;
  try {
    const u = new URL(String(href), "https://serenity.agency");
    let p = u.pathname || "";
    if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
    const m = p.match(/^\/blog\/(case|card|life)\/([^/]+)$/);
    if (!m) return null;
    const segment = m[1];
    const slug = m[2];
    if (!ALLOWED.has(segment) || !slug || slug === segment) return null;
    if (segment === "life" && /^\d+$/.test(slug)) return null;
    return { segment, slug };
  } catch {
    return null;
  }
}

if (!fs.existsSync(blogsPath)) {
  console.warn("WARN: нет", blogsPath, "— пропуск манифеста пост-страниц");
  fs.writeFileSync(outPath, "[]\n", "utf8");
  process.exit(0);
}

const blogs = JSON.parse(fs.readFileSync(blogsPath, "utf8"));
const posts = Array.isArray(blogs.posts) ? blogs.posts : [];
const out = [];
const seen = new Set();
for (const p of posts) {
  const e = entryFromHref(p.href);
  if (!e) continue;
  const key = `${e.segment}/${e.slug}`;
  if (seen.has(key)) continue;
  seen.add(key);
  out.push(e);
}
out.sort((a, b) => (a.segment + a.slug).localeCompare(b.segment + b.slug, "ru"));
fs.writeFileSync(outPath, JSON.stringify(out, null, 2) + "\n", "utf8");
console.log("OK:", outPath, "entries:", out.length);

#!/usr/bin/env node
/**
 * Заполняет json/blog-articles-manifest.json slug'ами из json/blogs-all.json
 * (только URL вида /blog/article/<slug>/ на serenity.agency), порядок — как в ленте API.
 */
import fs from "fs";
import path from "path";

const root = path.resolve(process.cwd());
const blogsPath = path.join(root, "json", "blogs-all.json");
const outPath = path.join(root, "json", "blog-articles-manifest.json");

function articleSlugFromHref(href) {
  if (!href) return "";
  try {
    const u = new URL(String(href), "https://serenity.agency");
    if (!/serenity\.agency$/i.test(u.hostname)) return "";
    let p = u.pathname || "";
    if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
    const m = p.match(/^\/blog\/article\/([^/]+)$/);
    return m && m[1] !== "article" ? m[1] : "";
  } catch {
    return "";
  }
}

const blogs = JSON.parse(fs.readFileSync(blogsPath, "utf8"));
const posts = Array.isArray(blogs.posts) ? blogs.posts : [];
const slugs = [];
const seen = new Set();
for (const p of posts) {
  const s = articleSlugFromHref(p.href);
  if (!s || seen.has(s)) continue;
  seen.add(s);
  slugs.push(s);
}
fs.writeFileSync(outPath, JSON.stringify(slugs, null, 2) + "\n", "utf8");
console.log("OK:", outPath, "slugs:", slugs.length);

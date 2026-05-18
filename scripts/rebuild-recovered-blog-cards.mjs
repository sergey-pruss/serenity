#!/usr/bin/env node
/**
 * Собирает json/blog-posts-recovered.json из manifest + JSON страниц на диске.
 */
import fs from "fs";
import path from "path";
import { segmentTags } from "./blog-recovery-lib.mjs";
import { pickBlogCardCoverFromBody, stripBlogCategoryFromTitle } from "./normalize-blog-article-title.mjs";

const root = path.resolve(process.cwd());
const manifestPath = path.join(root, "json", "blog-recovery-manifest.json");
const outPath = path.join(root, "json", "blog-posts-recovered.json");

function readPageJson(segment, slug) {
  const p =
    segment === "article"
      ? path.join(root, "json", "blog-articles", `${slug}.json`)
      : path.join(root, "json", "blog-post-pages", segment, `${slug}.json`);
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function cardFromPage(segment, slug, data) {
  const href = `/blog/${segment}/${slug}/`;
  const title = stripBlogCategoryFromTitle(data.title || slug);
  const coverImage = pickBlogCardCoverFromBody(data.bodyHtml || "");
  const tagInfo = segmentTags(segment);
  return {
    href,
    description: title,
    subtitle: String(data.description || "").trim(),
    ...tagInfo,
    linkClass: coverImage ? "white-text" : "dark-text",
    isResource: false,
    ...(coverImage ? {} : { skipCardMedia: true }),
    publishDate: data.publishDate || "",
    media: { kind: "picture", image: coverImage },
  };
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const posts = [];
for (const row of manifest.entries || []) {
  const segment = String(row.segment || "").trim();
  const slug = String(row.slug || "").trim();
  if (!segment || !slug) continue;
  const data = readPageJson(segment, slug);
  if (!data?.bodyHtml) continue;
  posts.push(cardFromPage(segment, slug, data));
}
posts.sort((a, b) => String(b.publishDate || "").localeCompare(String(a.publishDate || "")));

fs.writeFileSync(
  outPath,
  JSON.stringify(
    {
      builtAt: new Date().toISOString(),
      source: "scripts/rebuild-recovered-blog-cards.mjs",
      posts,
    },
    null,
    2
  ) + "\n",
  "utf8"
);
console.log("OK:", outPath, "cards:", posts.length);

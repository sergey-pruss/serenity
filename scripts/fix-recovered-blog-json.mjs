#!/usr/bin/env node
/** Правит title и bodyHtml во всех recovered JSON (Wayback-артефакты). */
import fs from "fs";
import path from "path";
import { stripBlogCategoryFromTitle } from "./normalize-blog-article-title.mjs";
import { unwrapWaybackHtml } from "./blog-recovery-lib.mjs";

const root = path.resolve(process.cwd());

function cleanBody(html) {
  let out = unwrapWaybackHtml(String(html || ""));
  out = out.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");
  out = out.replace(/<!--[\s\S]*?-->/g, "");
  out = out.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");
  out = out.replace(/href="\/web\/\d+\/\//gi, 'href="/');
  return out;
}

let n = 0;
for (const dir of [
  path.join(root, "json", "blog-articles"),
  path.join(root, "json", "blog-post-pages", "case"),
  path.join(root, "json", "blog-post-pages", "card"),
  path.join(root, "json", "blog-post-pages", "life"),
]) {
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith(".json")) continue;
    const p = path.join(dir, f);
    let data;
    try {
      data = JSON.parse(fs.readFileSync(p, "utf8"));
    } catch {
      continue;
    }
    if (!data.recoveredFromWayback) continue;
    const next = { ...data };
    if (next.title) next.title = stripBlogCategoryFromTitle(next.title);
    if (next.bodyHtml) next.bodyHtml = cleanBody(next.bodyHtml);
    fs.writeFileSync(p, JSON.stringify(next, null, 2), "utf8");
    n += 1;
  }
}
console.log("OK: fixed", n, "recovered json files");

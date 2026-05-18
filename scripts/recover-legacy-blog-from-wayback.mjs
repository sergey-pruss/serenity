#!/usr/bin/env node
/**
 * Восстанавливает материалы блога из Wayback Machine по json/blog-recovery-manifest.json.
 * Пишет json/blog-posts-recovered.json (карточки ленты) и JSON страниц (blog-articles / blog-post-pages).
 *
 * RECOVER_LIMIT=N — только первые N записей (для прогона).
 * RECOVER_SKIP_EXISTING=1 — пропуск, если href уже в json/blogs-all.json.
 */
import fs from "fs";
import path from "path";
import { canonBlogHref, recoverBlogEntry } from "./blog-recovery-lib.mjs";

const root = path.resolve(process.cwd());
const manifestPath = path.join(root, "json", "blog-recovery-manifest.json");
const outCardsPath = path.join(root, "json", "blog-posts-recovered.json");
const blogsPath = path.join(root, "json", "blogs-all.json");

function loadExistingHrefs() {
  const set = new Set();
  if (!fs.existsSync(blogsPath)) return set;
  try {
    const doc = JSON.parse(fs.readFileSync(blogsPath, "utf8"));
    for (const p of doc.posts || []) {
      const k = canonBlogHref(p.href);
      if (k) set.add(k);
    }
  } catch {
    /* ignore */
  }
  return set;
}

function loadPreviousCards() {
  if (!fs.existsSync(outCardsPath)) return [];
  try {
    const doc = JSON.parse(fs.readFileSync(outCardsPath, "utf8"));
    return Array.isArray(doc.posts) ? doc.posts : [];
  } catch {
    return [];
  }
}

(async () => {
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Нет ${manifestPath}`);
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const entries = Array.isArray(manifest.entries) ? manifest.entries : [];
  const limit = Number(process.env.RECOVER_LIMIT || 0) || entries.length;
  const skipExisting = process.env.RECOVER_SKIP_EXISTING === "1";
  const existingHrefs = skipExisting ? loadExistingHrefs() : new Set();

  const cardsByHref = new Map();
  for (const c of loadPreviousCards()) {
    const k = canonBlogHref(c.href);
    if (k) cardsByHref.set(k, c);
  }

  let ok = 0;
  let fail = 0;
  let skipped = 0;

  const onlyMissing = process.env.RECOVER_ONLY_MISSING === "1";

  for (let i = 0; i < Math.min(entries.length, limit); i++) {
    const row = entries[i] || {};
    const { segment, slug } = row;
    if (!segment || !slug) continue;
    const href = `/blog/${segment}/${slug}/`;
    const key = canonBlogHref(href);
    if (existingHrefs.has(key) && skipExisting) {
      console.log("SKIP exists:", href);
      skipped += 1;
      continue;
    }
    const jsonPath =
      segment === "article"
        ? path.join(root, "json", "blog-articles", `${slug}.json`)
        : path.join(root, "json", "blog-post-pages", segment, `${slug}.json`);
    if (onlyMissing && fs.existsSync(jsonPath)) {
      skipped += 1;
      continue;
    }
    try {
      console.log(`[${i + 1}/${Math.min(entries.length, limit)}]`, segment, slug);
      const { card } = await recoverBlogEntry({
        segment,
        slug,
        root,
        tryPaths: Array.isArray(row.tryPaths) ? row.tryPaths : [],
      });
      cardsByHref.set(key, card);
      ok += 1;
      const posts = [...cardsByHref.values()].sort((a, b) =>
        String(b.publishDate || "").localeCompare(String(a.publishDate || ""))
      );
      fs.writeFileSync(
        outCardsPath,
        JSON.stringify(
          {
            builtAt: new Date().toISOString(),
            source: "scripts/recover-legacy-blog-from-wayback.mjs",
            posts,
          },
          null,
          2
        ) + "\n",
        "utf8"
      );
      await new Promise((r) => setTimeout(r, 2500));
    } catch (e) {
      fail += 1;
      console.warn("FAIL:", segment, slug, "-", e.message || e);
    }
  }

  const posts = [...cardsByHref.values()].sort((a, b) => {
    const da = String(a.publishDate || "");
    const db = String(b.publishDate || "");
    return db.localeCompare(da);
  });

  fs.writeFileSync(
    outCardsPath,
    JSON.stringify(
      {
        builtAt: new Date().toISOString(),
        source: "scripts/recover-legacy-blog-from-wayback.mjs",
        posts,
      },
      null,
      2
    ) + "\n",
    "utf8"
  );

  console.log("OK:", outCardsPath, "cards:", posts.length, "ok:", ok, "fail:", fail, "skipped:", skipped);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

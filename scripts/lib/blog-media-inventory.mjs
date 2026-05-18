/**
 * Инвентаризация img/blog: ссылки из JSON/HTML и orphan-файлы на диске.
 */
import fs from "fs";
import path from "path";

export function collectUrlsFromHtml(html) {
  const out = new Set();
  const h = String(html || "");
  const re = /\/_sa\/img\/blog\/[^"'\s>)]+/g;
  let m;
  while ((m = re.exec(h))) {
    out.add(m[0].split("?")[0].split("#")[0]);
  }
  return out;
}

export function loadReferencedUrls(root) {
  const refs = new Set();

  function addFromHtml(html) {
    for (const u of collectUrlsFromHtml(html)) refs.add(u);
  }

  const blogsAll = path.join(root, "json", "blogs-all.json");
  if (fs.existsSync(blogsAll)) addFromHtml(fs.readFileSync(blogsAll, "utf8"));

  const articlesDir = path.join(root, "json", "blog-articles");
  if (fs.existsSync(articlesDir)) {
    for (const f of fs.readdirSync(articlesDir)) {
      if (!f.endsWith(".json")) continue;
      addFromHtml(fs.readFileSync(path.join(articlesDir, f), "utf8"));
    }
  }

  const blogRoot = path.join(root, "blog");
  if (fs.existsSync(blogRoot)) {
    const stack = [blogRoot];
    while (stack.length) {
      const dir = stack.pop();
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) stack.push(full);
        else if (e.name === "index.html") addFromHtml(fs.readFileSync(full, "utf8"));
      }
    }
  }

  return refs;
}

function walkFiles(dir, onFile) {
  if (!fs.existsSync(dir)) return;
  for (const name of fs.readdirSync(dir)) {
    const fp = path.join(dir, name);
    const st = fs.statSync(fp);
    if (st.isDirectory()) walkFiles(fp, onFile);
    else onFile(fp, st);
  }
}

/** @returns {{ fp: string, rel: string, size: number, slug: string | null }[]} */
export function listBlogMediaFiles(root) {
  const imgBlog = path.join(root, "img", "blog");
  const allFiles = [];
  if (!fs.existsSync(imgBlog)) return allFiles;

  for (const e of fs.readdirSync(imgBlog, { withFileTypes: true })) {
    const entry = path.join(imgBlog, e.name);
    if (e.isDirectory()) {
      walkFiles(entry, (f, st) => {
        allFiles.push({
          fp: f,
          rel: path.relative(root, f),
          size: st.size,
          slug: e.name,
        });
      });
    } else if (e.isFile()) {
      const st = fs.statSync(entry);
      allFiles.push({
        fp: entry,
        rel: path.relative(root, entry),
        size: st.size,
        slug: null,
      });
    }
  }
  return allFiles;
}

export function isFileReferenced(f, referenced) {
  const base = path.basename(f.fp);
  const url = f.slug ? `/_sa/img/blog/${f.slug}/${base}` : `/_sa/img/blog/${base}`;
  if (referenced.has(url)) return true;
  if (base.includes("__m.")) {
    const sourceBase = base.replace(/__m(?=\.[^.]+$)/, "");
    const sourceUrl = f.slug
      ? `/_sa/img/blog/${f.slug}/${sourceBase}`
      : `/_sa/img/blog/${sourceBase}`;
    if (referenced.has(sourceUrl)) return true;
  }
  return false;
}

export function findOrphanFiles(root) {
  const referenced = loadReferencedUrls(root);
  const allFiles = listBlogMediaFiles(root);
  const orphans = allFiles.filter((f) => !isFileReferenced(f, referenced));
  return { referenced, allFiles, orphans };
}

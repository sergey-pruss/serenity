#!/usr/bin/env node
/**
 * Подтягивает все медиафайлы превью блога (картинки и видео из API) в img/blog/.
 * Источник: локальный img/storage__* при наличии, иначе GET https://serenity.agency/storage/<имя>.
 *
 * Пропуск: SKIP_BLOG_IMAGE_SYNC=1 (CI без сети, если артефакты уже в репо).
 * Идемпотентно: существующие непустые файлы не перезаписываются.
 */
import fs from "fs";
import path from "path";

const API_BASE = "https://serenity.agency/api/blog";
const STORAGE_REMOTE = "https://serenity.agency/storage";

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

function safeBasename(name) {
  if (!name || typeof name !== "string") return "";
  const b = path.basename(name.trim());
  if (!b || b === "." || b === "..") return "";
  return b;
}

function collectFilenamesFromItem(item) {
  const out = new Set();
  const add = (x) => {
    const b = safeBasename(x);
    if (b) out.add(b);
  };
  add(item.preview);
  const anim = parseAnimation(item.animation_content);
  add(anim.frontImage);
  add(anim.video);
  return out;
}

async function ensureBlogFile(filename, root) {
  const dir = path.join(root, "img", "blog");
  fs.mkdirSync(dir, { recursive: true });
  const dest = path.join(dir, filename);
  if (fs.existsSync(dest) && fs.statSync(dest).size > 0) {
    return "skip";
  }
  const legacy = path.join(root, "img", `storage__${filename}`);
  if (fs.existsSync(legacy) && fs.statSync(legacy).size > 0) {
    fs.copyFileSync(legacy, dest);
    return "copy";
  }
  const url = `${STORAGE_REMOTE}/${encodeURIComponent(filename)}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`${res.status}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(dest, buf);
  return "fetch";
}

if (process.env.SKIP_BLOG_IMAGE_SYNC === "1") {
  console.log("OK: sync-blog-images пропущен (SKIP_BLOG_IMAGE_SYNC=1)");
  process.exit(0);
}

(async () => {
  const root = path.resolve(process.cwd());
  const all = new Set();
  let page = 1;
  let lastPage = 1;
  do {
    const res = await fetch(`${API_BASE}?page=${page}&count=50`);
    if (!res.ok) throw new Error(`API ${res.status}`);
    const chunk = await res.json();
    lastPage = Number(chunk.last_page) || 1;
    const rows = Array.isArray(chunk.data) ? chunk.data : [];
    for (const item of rows) {
      for (const f of collectFilenamesFromItem(item)) all.add(f);
    }
    page += 1;
  } while (page <= lastPage);

  let nSkip = 0;
  let nCopy = 0;
  let nFetch = 0;
  const failures = [];

  for (const filename of [...all].sort()) {
    try {
      const r = await ensureBlogFile(filename, root);
      if (r === "skip") nSkip += 1;
      else if (r === "copy") nCopy += 1;
      else if (r === "fetch") nFetch += 1;
    } catch (e) {
      failures.push({ filename, err: e });
    }
  }

  if (failures.length) {
    for (const { filename, err } of failures) {
      console.error(`FAIL: ${filename}:`, err.message || err);
    }
    process.exit(1);
  }

  console.log(
    `OK: img/blog — уникальных файлов: ${all.size}, уже были: ${nSkip}, скопировано из img/storage__: ${nCopy}, скачано: ${nFetch}`,
  );
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

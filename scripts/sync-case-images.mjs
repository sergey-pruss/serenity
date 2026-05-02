#!/usr/bin/env node
/**
 * Медиа карточек кейсов (API case/pages) → img/case/<имя как в storage>.
 * Источник: локальный img/storage__* при наличии, иначе GET https://serenity.agency/storage/<имя>.
 *
 * Пропуск: SKIP_CASE_IMAGE_SYNC=1
 * Идемпотентно: существующие непустые файлы не перезаписываются.
 */
import fs from "fs";
import path from "path";

const API = "https://serenity.agency/api/case/pages?page=1&count=500";
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
  const anim = parseAnimation(item.animation_content);
  add(anim.frontImage);
  add(anim.video);
  return out;
}

async function ensureCaseFile(filename, root) {
  const dir = path.join(root, "img", "case");
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

if (process.env.SKIP_CASE_IMAGE_SYNC === "1") {
  console.log("OK: sync-case-images пропущен (SKIP_CASE_IMAGE_SYNC=1)");
  process.exit(0);
}

(async () => {
  const root = path.resolve(process.cwd());
  const res = await fetch(API);
  if (!res.ok) throw new Error(`API ${res.status}`);
  const raw = await res.json();
  if (!Array.isArray(raw)) throw new Error("API case/pages: ожидался массив");

  const all = new Set();
  for (const item of raw) {
    for (const f of collectFilenamesFromItem(item)) all.add(f);
  }

  let nSkip = 0;
  let nCopy = 0;
  let nFetch = 0;
  const failures = [];

  for (const filename of [...all].sort()) {
    try {
      const r = await ensureCaseFile(filename, root);
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
    `OK: img/case — уникальных файлов: ${all.size}, уже были: ${nSkip}, скопировано из img/storage__: ${nCopy}, скачано: ${nFetch}`,
  );
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

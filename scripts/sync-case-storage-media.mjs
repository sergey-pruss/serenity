#!/usr/bin/env node
import fs from "fs";
import path from "path";

const API = "https://serenity.agency/api/case/pages?page=1&count=500";
const STORAGE_BASE = "https://serenity.agency/storage/";

function parseAnimation(animationContent) {
  let parsed = [];
  try {
    parsed = JSON.parse(animationContent || "[]");
  } catch {
    return { frontImage: "", video: "" };
  }
  const first = parsed[0];
  if (!first) return { frontImage: "", video: "" };
  const media = first.data?.media || {};
  return {
    frontImage: String(media.frontImage || "").trim(),
    video: String(media.video || "").trim(),
  };
}

async function downloadFile(url, targetPath) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const arrayBuffer = await res.arrayBuffer();
  fs.writeFileSync(targetPath, Buffer.from(arrayBuffer));
}

(async () => {
  const root = process.cwd();
  const imgDir = path.join(root, "img");
  fs.mkdirSync(imgDir, { recursive: true });

  const response = await fetch(API);
  if (!response.ok) throw new Error(`API ${response.status}`);
  const raw = await response.json();

  const filenames = new Set();
  for (const item of raw) {
    const anim = parseAnimation(item.animation_content);
    if (anim.frontImage) filenames.add(anim.frontImage);
    if (anim.video) filenames.add(anim.video);
  }

  const all = Array.from(filenames);
  let downloaded = 0;
  let skipped = 0;
  let failed = 0;

  for (const filename of all) {
    const localName = `storage__${filename}`;
    const targetPath = path.join(imgDir, localName);
    if (fs.existsSync(targetPath)) {
      skipped += 1;
      continue;
    }
    const remoteUrl = `${STORAGE_BASE}${filename}`;
    try {
      await downloadFile(remoteUrl, targetPath);
      downloaded += 1;
      console.log(`downloaded: ${localName}`);
    } catch (error) {
      failed += 1;
      console.warn(`failed: ${localName} <- ${remoteUrl} (${error.message})`);
    }
  }

  console.log(
    `OK: media sync complete. total=${all.length}, downloaded=${downloaded}, skipped=${skipped}, failed=${failed}`
  );
})().catch((error) => {
  console.error(error);
  process.exit(1);
});

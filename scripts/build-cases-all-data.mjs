#!/usr/bin/env node
/**
 * Загружает полный список кейсов с serenity.agency API и пишет:
 * - json/cases-all.json (читаемый снимок)
 * - js/cases-all-data.js (window.__SERENITY_CASES_ALL__ для статики)
 */
import fs from "fs";
import path from "path";

const API = "https://serenity.agency/api/case/pages?page=1&count=500";

const FILTERS = [
  { code: "", label: "Все" },
  { code: "pr", label: "Продвижение" },
  { code: "brending", label: "Брендинг" },
  { code: "sites", label: "Сайт" },
  { code: "strategiya", label: "Стратегия" },
];

function storageUrl(filename) {
  if (!filename) return "";
  const localPath = path.join(process.cwd(), "img", `storage__${filename}`);
  if (fs.existsSync(localPath)) {
    return `/img/storage__${filename}`;
  }
  return `https://serenity.agency/storage/${filename}`;
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
  const res = await fetch(API);
  if (!res.ok) throw new Error(`API ${res.status}`);
  /** @type {any[]} */
  const raw = await res.json();

  const cases = raw.map((item) => {
    let cats = [];
    try {
      cats = JSON.parse(item.categories || "[]");
    } catch {
      cats = [];
    }
    const tagCodes = cats.map((c) => String(c.code || ""));
    const tags = cats.map((c) => String(c.name || "").trim()).filter(Boolean);
    const anim = parseAnimation(item.animation_content);
    const linkClass = Number(item.is_text_white) === 1 ? "white-text" : "dark-text";

    return {
      href: item.link,
      description: item.description || "",
      tags,
      tagCodes,
      linkClass,
      isResource: Number(item.foreign_resource) === 1,
      media:
        anim.kind === "video" && anim.video
          ? {
              kind: "video",
              poster: storageUrl(anim.frontImage),
              videoSrc: storageUrl(anim.video),
            }
          : {
              kind: "picture",
              image: storageUrl(anim.frontImage),
            },
    };
  });

  const payload = {
    builtAt: new Date().toISOString(),
    source: API,
    filters: FILTERS,
    cases,
  };

  const root = path.resolve(process.cwd());
  fs.mkdirSync(path.join(root, "json"), { recursive: true });
  const jsonPath = path.join(root, "json", "cases-all.json");
  fs.writeFileSync(jsonPath, JSON.stringify(payload, null, 2), "utf8");

  const jsPath = path.join(root, "js", "cases-all-data.js");
  const jsBody =
    `/** Автогенерация: node scripts/build-cases-all-data.mjs */\n` +
    `window.__SERENITY_CASES_ALL__ = ${JSON.stringify(payload)};\n`;
  fs.writeFileSync(jsPath, jsBody, "utf8");

  console.log("OK:", jsonPath, jsPath, "cases:", cases.length);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

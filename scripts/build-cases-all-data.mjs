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
  { code: "sites", label: "Сайты" },
  { code: "strategiya", label: "Стратегия" },
];
const TILE_CASE_DESCRIPTION = "Айдентика и сайт для дистрибьютера испанской плитки в Германии";
const EVROSTROY_SLUG = "/case/evrostroj";

/** Карточки кейсов — из img/case/ (заполняется scripts/sync-case-images.mjs), иначе прод. */
function caseMediaUrl(filename) {
  if (!filename) return "";
  const safe = path.basename(String(filename));
  if (!safe) return "";
  const p = path.join(process.cwd(), "img", "case", safe);
  if (fs.existsSync(p)) {
    return `/_sa/img/case/${safe}`;
  }
  return `https://serenity.agency/storage/${safe}`;
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

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
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
              poster: caseMediaUrl(anim.frontImage),
              videoSrc: caseMediaUrl(anim.video),
            }
          : {
              kind: "picture",
              image: caseMediaUrl(anim.frontImage),
            },
    };
  });

  const targetDescription = normalizeText(TILE_CASE_DESCRIPTION);
  const targetCases = cases.filter((c) => normalizeText(c.description) === targetDescription);
  if (targetCases.length > 1) {
    const preferred = targetCases.find((c) => !c.isResource) || targetCases[0];
    const deduped = [];
    let usedPreferred = false;
    for (const item of cases) {
      if (normalizeText(item.description) !== targetDescription) {
        deduped.push(item);
        continue;
      }
      if (!usedPreferred && item.href === preferred.href && item.isResource === preferred.isResource) {
        deduped.push(item);
        usedPreferred = true;
      }
    }
    cases.length = 0;
    cases.push(...deduped);
  }

  const targetIndex = cases.findIndex((c) => normalizeText(c.description) === targetDescription);
  const evrostroyIndex = cases.findIndex((c) => String(c.href || "").includes(EVROSTROY_SLUG));
  if (targetIndex >= 0 && evrostroyIndex >= 0) {
    const [target] = cases.splice(targetIndex, 1);
    const insertAt = cases.findIndex((c) => String(c.href || "").includes(EVROSTROY_SLUG));
    cases.splice(insertAt + 1, 0, target);
  }

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

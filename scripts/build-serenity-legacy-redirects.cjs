#!/usr/bin/env node
/**
 * Вставляет в nginx/serenity-router.live.conf блок одношаговых 301 со старых путей WordPress
 * (/case/<категория>/<slug>, /case/all/all/<slug>) на канон из json/cases-all.json.
 *
 * Запуск: node scripts/build-serenity-legacy-redirects.cjs
 * После изменения json/cases-all.json — перезапустить и закоммитить diff vhost.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const CASES_JSON = path.join(ROOT, "json", "cases-all.json");
const VHOST = path.join(ROOT, "nginx", "serenity-router.live.conf");

const MARK_BEGIN = "    # >>> GEN:serenity-legacy-case-path-redirects (node scripts/build-serenity-legacy-redirects.cjs)";
const MARK_END = "    # <<< GEN:serenity-legacy-case-path-redirects";

/** Префиксы старых URL кейсов на WP (и опечатка branding). */
const LEGACY_CASE_PREFIXES = [
  "prodvizhenie",
  "sites",
  "strategiya",
  "brending",
  "website",
  "promotion",
  "branding",
];

/**
 * slug из старого пути → полный канонический URL (как в cases-all, без завершающего /).
 * Если slug в старом виде не совпадает с ключом в JSON — задаём вручную.
 */
const LEGACY_SLUG_TO_CANON = {
  "internet-magazin-mebeli-skladno": "https://serenity.agency/case/all/skladno-internet-magazin-mebeli",
};

/** Старые пути без записи в cases-all — один 301 на листинг кейсов. */
const ORPHAN_LEGACY_CASE_PATHS = [
  ["/case/sites/stroylog", "https://serenity.agency/case/all/"],
  ["/case/sites/stroylog/", "https://serenity.agency/case/all/"],
  ["/case/promotion/mezha", "https://serenity.agency/case/all/"],
  ["/case/promotion/mezha/", "https://serenity.agency/case/all/"],
  ["/case/all/changeworld", "https://serenity.agency/case/all/"],
  ["/case/all/changeworld/", "https://serenity.agency/case/all/"],
  ["/case/prodvizhenie/changeworld", "https://serenity.agency/case/all/"],
  ["/case/prodvizhenie/changeworld/", "https://serenity.agency/case/all/"],
  ["/case/prodvizhenie/addrea", "https://serenity.agency/case/all/"],
  ["/case/prodvizhenie/addrea/", "https://serenity.agency/case/all/"],
  ["/case/promotion/septik", "https://serenity.agency/case/all/"],
  ["/case/promotion/septik/", "https://serenity.agency/case/all/"],
];

/** Прочие одношаговые 301 (маркетинговые URL и опечатки), не из cases-all. */
const EXTRA_EXACT_REDIRECTS = [
  ["/case/pr", "https://serenity.agency/case/all/category/pr/"],
  ["/case/pr/", "https://serenity.agency/case/all/category/pr/"],
  ["/case/brending", "https://serenity.agency/case/all/category/brending/"],
  ["/case/brending/", "https://serenity.agency/case/all/category/brending/"],
  ["/case/strategiya", "https://serenity.agency/case/all/category/strategiya/"],
  ["/case/strategiya/", "https://serenity.agency/case/all/category/strategiya/"],
  ["/mini-strategia", "https://serenity.agency/mini-strategiya"],
  ["/mini-strategia/", "https://serenity.agency/mini-strategiya"],
  ["/dzen", "https://serenity.agency/prodvizhenie-statey-v-dzene-i-promostranitsah"],
  ["/dzen/", "https://serenity.agency/prodvizhenie-statey-v-dzene-i-promostranitsah"],
  ["/case/darkrain-", "https://serenity.agency/case/darkrain-store"],
  ["/case/darkrain-/", "https://serenity.agency/case/darkrain-store"],
  [
    "/blog/article/produktovyj-ux-",
    "https://serenity.agency/blog/article/produktovyj-ux-analiz-kak-nahodit-tochki-poteri-konversii-i-prevrashhat-trafik-v-prodazhi/",
  ],
  [
    "/blog/article/produktovyj-ux-/",
    "https://serenity.agency/blog/article/produktovyj-ux-analiz-kak-nahodit-tochki-poteri-konversii-i-prevrashhat-trafik-v-prodazhi/",
  ],
  [
    "/blog/life/intervyu-serenity-serei-pruss-samoorganizatsiya",
    "https://serenity.agency/blog/article/intervyu-serenity-sergei-pruss-samoorganizatsiya/",
  ],
  [
    "/blog/life/intervyu-serenity-serei-pruss-samoorganizatsiya/",
    "https://serenity.agency/blog/article/intervyu-serenity-sergei-pruss-samoorganizatsiya/",
  ],
];

function locationBlock(path, target) {
  return `    location = ${path} {\n        return 301 ${target};\n    }\n`;
}

function buildCaseRedirects() {
  const raw = JSON.parse(fs.readFileSync(CASES_JSON, "utf8"));
  const blocks = [];
  const seen = new Set();

  const flatSlugs = new Set();
  const allSlugs = new Set();

  for (const c of raw.cases || []) {
    if (!c.href) continue;
    const u = new URL(String(c.href));
    const p = u.pathname.replace(/\/+$/, "");
    if (p.startsWith("/case/all/")) {
      allSlugs.add(p.slice("/case/all/".length));
    } else if (p.startsWith("/case/")) {
      flatSlugs.add(p.slice("/case/".length));
    }
  }

  function add(path, target) {
    if (seen.has(path)) return;
    seen.add(path);
    blocks.push(locationBlock(path, target));
  }

  for (const slug of flatSlugs) {
    const target = LEGACY_SLUG_TO_CANON[slug] || `https://serenity.agency/case/${slug}`;
    for (const prefix of LEGACY_CASE_PREFIXES) {
      add(`/case/${prefix}/${slug}`, target);
      add(`/case/${prefix}/${slug}/`, target);
    }
  }

  for (const slug of allSlugs) {
    const target = LEGACY_SLUG_TO_CANON[slug] || `https://serenity.agency/case/all/${slug}`;
    for (const prefix of LEGACY_CASE_PREFIXES) {
      add(`/case/${prefix}/${slug}`, target);
      add(`/case/${prefix}/${slug}/`, target);
    }
    add(`/case/all/all/${slug}`, target);
    add(`/case/all/all/${slug}/`, target);
  }

  for (const [p, t] of ORPHAN_LEGACY_CASE_PATHS) add(p, t);
  for (const [p, t] of EXTRA_EXACT_REDIRECTS) add(p, t);

  blocks.sort();
  return blocks.join("");
}

function main() {
  const generated = buildCaseRedirects();
  const inner = `${MARK_BEGIN}\n${generated}${MARK_END}\n`;
  const vhost = fs.readFileSync(VHOST, "utf8");
  if (!vhost.includes(MARK_BEGIN) || !vhost.includes(MARK_END)) {
    throw new Error(
      `${path.relative(ROOT, VHOST)}: не найдены маркеры GEN для вставки блока редиректов.`,
    );
  }
  const re = new RegExp(
    `${MARK_BEGIN.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[\\s\\S]*?${MARK_END.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\n?`,
    "m",
  );
  if (!re.test(vhost)) {
    throw new Error("Не удалось сопоставить блок между маркерами GEN.");
  }
  const next = vhost.replace(re, inner);
  fs.writeFileSync(VHOST, next, "utf8");
  console.log(`OK: обновлён ${path.relative(ROOT, VHOST)} (${Buffer.byteLength(generated, "utf8")} байт сгенерированного тела).`);
}

main();

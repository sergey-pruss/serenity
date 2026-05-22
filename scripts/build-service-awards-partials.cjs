#!/usr/bin/env node
/**
 * Награды услуг: shell + json/services/<slug>/awards.json → partial.
 */
const fs = require("fs");
const path = require("path");
const { renderSlides } = require("./lib/service-awards-render.cjs");

const root = path.resolve(__dirname, "..");
const shellPath = path.join(root, "html", "partials", "services", "_service-awards.shell.html");
const partialsDir = path.join(root, "html", "partials", "services");

/** Начальный набор (prod /kontekstnaya_reklama); при --extract пишется в JSON обеих услуг. */
const AWARDS_SEED = [
  { rating: "Connect", year: "2026", description: "ТОП-50 в списке проверенных агентств контекстной рекламы в России", href: null },
  { rating: "Рейтинг Рунета", year: "2025", description: "6 место по России в контекстной рекламе в сфере медицины и здоровья", href: null },
  {
    rating: "Workspace Digital",
    year: "2024",
    description: "1 место за комплексные услуги для eCom бренда Darkrain",
    href: "https://workspace.ru/awards/cases/kompleksnaya-usluga-dlya-peterburgskogo-brenda-ukrasheniy-darkrain/",
  },
  {
    rating: "Рейтинг Рунета",
    year: "2024",
    description: "3 место по России в рейтинге комплексных digital-агентств в сфере «Красота, мода»",
    href: null,
  },
  { rating: "Рейтинг Рунета", year: "2024", description: "4 место в СПб по комплексному продвижению в интернете", href: null },
  { rating: "Рейтинг Рунета", year: "2024", description: "23 место в СПб по настройке контекстной рекламы", href: null },
  {
    rating: "Рейтинг Рунета",
    year: "2024",
    description: "14 место в России по комплексному продвижению в сфере «Промышленность»",
    href: null,
  },
  { rating: "Рейтинг Рунета", year: "2024", description: "14 место в России по комплексному продвижению микро-бизнеса", href: null },
  {
    rating: "Рейтинг Рунета",
    year: "2024",
    description: "16 место в России по комплексному продвижению корпоративных сайтов",
    href: null,
  },
  { rating: "Рейтинг Рунета", year: "2024", description: "29 место в России по комплексному продвижению в интернете", href: null },
  {
    rating: "Рейтинг Рунета",
    year: "2023",
    description: "11 место в рейтинге агентств контекстной рекламы Санкт-Петербурга",
    href: null,
  },
  { rating: "Ruward", year: "2022", description: "2 место в России по performance-маркетингу для IT-услуг и сервисов", href: null },
  {
    rating: "Рейтинг Рунета",
    year: "2022",
    description: "14 место в рейтинге агентств контекстной рекламы Санкт-Петербурга",
    href: "https://api.cabinet.cmsmagazine.ru/diplom/show/28d58dab9fc743a06e23b15c496d3f03",
  },
  { rating: "Tagline", year: "2018", description: "6 место в рейтинге агентств performance-маркетинга Петербурга", href: null },
  { rating: "Tagline", year: "2017", description: "9 место по performance-маркетингу в Санкт-Петербурге", href: null },
  { rating: "Ruward", year: "2017", description: "6 место по контекстной рекламе в Санкт-Петербурге", href: null },
  { rating: "Рейтинг Рунета", year: "2021", description: "8 место в СПб в рейтинге агентств по контекстной рекламе", href: null },
];

const SERVICES = [
  {
    slug: "kontekstnaya_reklama",
    partial: "awards-kontekstnaya-reklama.html",
    headingId: "kontekstnaya-awards-heading",
    comment:
      "<!-- Награды: json/services/kontekstnaya_reklama/awards.json + home-awards.css. -->\n",
  },
  {
    slug: "targeting",
    partial: "awards-targeting.html",
    headingId: "targeting-awards-heading",
    comment: "<!-- Награды targeting: json/services/targeting/awards.json + home-awards.css. -->\n",
  },
  {
    slug: "marketing",
    partial: "awards-marketing.html",
    headingId: "targeting-awards-heading",
    comment: "<!-- Награды marketing: json/services/marketing/awards.json + home-awards.css. -->\n",
  },
];

function writeSeedJson(svc) {
  const jsonPath = path.join(root, "json", "services", svc.slug, "awards.json");
  fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
  const data = {
    headingId: svc.headingId,
    mountId: "sa-home-awards-mounted",
    awards: AWARDS_SEED,
  };
  fs.writeFileSync(jsonPath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  console.log("Wrote", path.relative(root, jsonPath));
}

function buildPartial(svc) {
  const jsonPath = path.join(root, "json", "services", svc.slug, "awards.json");
  if (!fs.existsSync(jsonPath)) {
    writeSeedJson(svc);
  }
  const data = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
  if (!data.headingId || !data.awards) {
    throw new Error(`${jsonPath}: нужны headingId и awards[]`);
  }
  const shell = fs.readFileSync(shellPath, "utf8");
  const slidesHtml = renderSlides(data.awards);
  const out =
    (svc.comment || "") +
    shell.replace("__HEADING_ID__", data.headingId).replace("__SLIDES_HTML__", slidesHtml);
  const outPath = path.join(partialsDir, svc.partial);
  fs.writeFileSync(outPath, `${out.trim()}\n`, "utf8");
  console.log("Wrote", path.relative(root, outPath));
}

function main() {
  const extractOnly = process.argv.includes("--extract");
  if (!fs.existsSync(shellPath)) throw new Error(`Нет shell: ${shellPath}`);
  for (const svc of SERVICES) {
    if (extractOnly) writeSeedJson(svc);
    else buildPartial(svc);
  }
}

main();

#!/usr/bin/env node
/**
 * Перелинковка на /sozdanie-internet-magazina в теле статей (json/blog-articles).
 * Вызывается перед build-blog-article-pages; preserveBodyHtmlOnBlogSync защищает от sync с прода.
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const jsonDir = path.join(root, "json", "blog-articles");

const LINK_CLASS = 'class="blog-text-link"';
const HREF = 'href="/sozdanie-internet-magazina"';

const PATCHES = [
  {
    slug: "seo-optimizatsiya-internet-magazina",
    replacements: [
      {
        from: "потенциальных клиентов.</p>",
        to: `потенциальных клиентов. На&nbsp;старте важно грамотное <a ${HREF} ${LINK_CLASS}>создание интернет-магазина</a>.</p>`,
      },
    ],
  },
  {
    slug: "proektirovanie-internet-magazinov-i-marketplejsov-marketingovyj-podhod",
    replacements: [
      {
        from: "на сайте интернет-магазина или маркетплейсе",
        to: `на сайте <a ${HREF} ${LINK_CLASS}>интернет-магазина</a> или маркетплейсе`,
      },
    ],
  },
  {
    slug: "sajt-na-konstruktore-protiv-polnotsennogo-sajta-kto-kogo",
    replacements: [
      {
        from: "Кроме того, интернет-магазин на CMS можно интегрировать",
        to: `Кроме того, <a ${HREF} ${LINK_CLASS}>создание интернет-магазина</a> на CMS можно интегрировать`,
      },
    ],
  },
];

function applyPatch(slug, replacements) {
  const filePath = path.join(jsonDir, `${slug}.json`);
  if (!fs.existsSync(filePath)) {
    console.warn(`WARN: нет ${filePath}`);
    return false;
  }
  const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
  let body = String(data.bodyHtml || "");
  let changed = false;
  for (const { from, to } of replacements) {
    if (body.includes(to)) continue;
    if (!body.includes(from)) {
      console.warn(`WARN: ${slug}: не найден фрагмент «${from.slice(0, 48)}…»`);
      continue;
    }
    body = body.replace(from, to);
    changed = true;
  }
  if (!body.includes("/sozdanie-internet-magazina")) {
    console.warn(`WARN: ${slug}: ссылка не попала в bodyHtml`);
    return false;
  }
  data.bodyHtml = body;
  data.preserveBodyHtmlOnBlogSync = true;
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  console.log(`OK: ${slug}${changed ? "" : " (уже было)"}`);
  return true;
}

function run() {
  let ok = 0;
  for (const { slug, replacements } of PATCHES) {
    if (applyPatch(slug, replacements)) ok += 1;
  }
  if (ok !== PATCHES.length) process.exit(1);
}

if (require.main === module) run();
module.exports = { run, PATCHES };

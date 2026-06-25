#!/usr/bin/env node
/** Перекладывает FAQ /targeting в 3 колонки (без пустых ячеек в сетке). */
const fs = require("fs");
const path = require("path");
const {
  extractFaqPairsFromHtml,
  syncFaqBodyHtmlJsonLd,
} = require("./lib/build-faq-page-jsonld.cjs");

const root = path.resolve(__dirname, "..");
const jsonPath = path.join(root, "json", "services", "targeting", "faq.json");

const ICO =
  '<div class="spoiler__ico"><svg width="16" height="9" viewBox="0 0 16 9" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M15.4238 1L8.05694 7.96972L0.885888 0.798671" stroke="white" stroke-linecap="round" stroke-linejoin="round"></path></svg></div>';

function spoiler(q, a) {
  return `<div class="spoiler block"><div class="spoiler__head"><h3 class="block__question">${q}</h3> ${ICO}</div> <div class="spoiler__content" ><div class="spoiler__content-inner"><div class="spoiler__content-wr"><div class="spoiler__content-slot"><div class="block__content">${a}</div></div></div></div></div></div>`;
}

function distributeRoundRobin(items, columns = 3) {
  const buckets = Array.from({ length: columns }, () => []);
  items.forEach((item, i) => buckets[i % columns].push(item));
  return buckets;
}

function rebuildBlocksHtml(pairs) {
  const buckets = distributeRoundRobin(pairs, 3);
  const columns = buckets
    .map((items) => `<div class="blocks__column">${items.map((it) => spoiler(it.question, it.answer)).join("")}</div>`)
    .join("");
  return `<div class=""><div class="questions"><h3 class="questions__title kontekstnaya-page__section-heading">Вопрос-ответ</h3> <div class="questions__blocks">${columns}</div></div></div>`;
}

function run() {
  const data = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
  const pairs = extractFaqPairsFromHtml(data.bodyHtml);
  if (!pairs.length) throw new Error("rebalance-targeting-faq: нет вопросов");

  const colCount = (data.bodyHtml.match(/blocks__column/g) || []).length;
  if (colCount === 3) {
    console.log("rebalance-targeting-faq: уже 3 колонки");
    return;
  }

  data.bodyHtml = syncFaqBodyHtmlJsonLd(rebuildBlocksHtml(pairs));
  fs.writeFileSync(jsonPath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  console.log(`rebalance-targeting-faq: ok, ${pairs.length} вопросов → 3 колонки (было ${colCount})`);
}

run();

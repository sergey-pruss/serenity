#!/usr/bin/env node
/**
 * Сравнение видимого текста /services/marketing: prod vs локальный origin.
 * ORIGIN=http://127.0.0.1:8895 node scripts/compare-marketing-prod-local-text.cjs
 */
const fs = require("fs");
const path = require("path");
const http = require("http");
const https = require("https");
const cheerio = require("cheerio");

const prodUrl = process.env.MARKETING_TEXT_PROD || "https://serenity.agency/services/marketing";
const localUrl =
  process.env.MARKETING_TEXT_LOCAL ||
  `${(process.env.ORIGIN || "http://127.0.0.1:8895").replace(/\/$/, "")}/services/marketing`;

function fetchHtml(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith("https") ? https : http;
    lib
      .get(url, { headers: { "User-Agent": "compare-marketing-prod-local-text" } }, (res) => {
        let d = "";
        res.on("data", (c) => {
          d += c;
        });
        res.on("end", () => resolve({ status: res.statusCode || 0, html: d }));
      })
      .on("error", reject);
  });
}

function decodeEntities(s) {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&#160;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function normText(s) {
  return decodeEntities(s)
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sliceMain(html) {
  const start = html.indexOf("<!-- MARKETING-MAIN-START -->");
  const end = html.indexOf("<!-- MARKETING-MAIN-END -->");
  if (start >= 0 && end > start) return html.slice(start, end);
  const $ = cheerio.load(html);
  const $pc = $(".page-constructor").first();
  return $pc.length ? $pc.html() || "" : html;
}

function extractMainText(html) {
  const slice = sliceMain(html);
  const $ = cheerio.load(slice);
  const $pc = $(".page-constructor").first();
  const root = $pc.length ? $pc : $.root();
  root.find("script, style, noscript").remove();
  return normText(root.text());
}

function wordJaccard(a, b) {
  if (a === b) return 1;
  const wa = new Set(a.split(" ").filter(Boolean));
  const wb = new Set(b.split(" ").filter(Boolean));
  let inter = 0;
  for (const w of wa) if (wb.has(w)) inter += 1;
  const union = wa.size + wb.size - inter;
  return union ? inter / union : 0;
}

function collectHeadings(html) {
  const $ = cheerio.load(html);
  const skip = new Set(["Кейсы", "Услуги", "Агентство", "Блог", "Вакансии", "Контакты", "Главная"]);
  const out = [];
  $("h1, h2, h3").each((_, el) => {
    const t = normText($(el).text());
    if (t && !skip.has(t)) out.push(t);
  });
  return out;
}

function extractBlocks(html) {
  const slice = sliceMain(html);
  const $ = cheerio.load(slice);
  const blocks = [];
  $(".page-constructor__section").each((_, sec) => {
    const $s = $(sec);
    $s.find("script, style").remove();
    const title = normText($s.find("h1, h2, h3").first().text()) || "(без заголовка)";
    const text = normText($s.text());
    if (text.length > 30) blocks.push({ title, text });
  });
  return blocks;
}

function fragmentsOnlyIn(a, b, minLen = 50, maxItems = 15) {
  const found = [];
  const step = 80;
  for (let i = 0; i < a.length - minLen; i += step) {
    const chunk = a.slice(i, i + 120);
    if (chunk.length < minLen) continue;
    if (!b.includes(chunk)) {
      found.push(normText(chunk));
      if (found.length >= maxItems) break;
    }
  }
  return found;
}

async function main() {
  const [prod, local] = await Promise.all([fetchHtml(prodUrl), fetchHtml(localUrl)]);
  if (prod.status < 200 || prod.status >= 400) {
    console.error("prod HTTP", prod.status, prodUrl);
    process.exit(1);
  }
  if (local.status < 200 || local.status >= 400) {
    console.error("local HTTP", local.status, localUrl);
    process.exit(1);
  }

  const prodText = extractMainText(prod.html);
  const localText = extractMainText(local.html);

  console.log("URLs:");
  console.log("  prod:", prodUrl);
  console.log("  local:", localUrl);
  console.log("\nОбъём MAIN (символы / слова):");
  console.log("  prod:", prodText.length, prodText.split(" ").filter(Boolean).length);
  console.log("  local:", localText.length, localText.split(" ").filter(Boolean).length);

  const exact = prodText === localText;
  const jaccard = wordJaccard(prodText, localText);
  console.log("\n100% точное совпадение всего текста MAIN:", exact ? "ДА" : "НЕТ");
  console.log("Схожесть по уникальным словам (Jaccard):", `${(jaccard * 100).toFixed(1)}%`);

  const prodH = collectHeadings(prod.html);
  const localH = collectHeadings(local.html);
  const prodHSet = new Set(prodH);
  const localHSet = new Set(localH);
  const onlyProdH = [...prodHSet].filter((x) => !localHSet.has(x));
  const onlyLocalH = [...localHSet].filter((x) => !prodHSet.has(x));

  console.log("\nЗаголовки только на PROD:", onlyProdH.length ? onlyProdH.join("; ") : "(нет)");
  console.log("Заголовки только на LOCAL:", onlyLocalH.length ? onlyLocalH.join("; ") : "(нет)");

  const keys = [
    "Комплексный маркетинг",
    "Маркетинговая стратегия выявляет ваши конкурентные преимущества",
    "Бренд-стратегия",
    "Контент-стратегия",
    "Увеличение известности бренда",
    "Измеримое продвижение",
    "Синергия с услугами",
    "Контекстная реклама",
    "Таргетинг в соцсетях",
    "Контент-маркетинг",
    "Наши кейсы",
    "Награды",
    "Вопрос-ответ",
    "Команда",
  ];
  console.log("\nКлючевые фразы:");
  for (const k of keys) {
    const p = prodText.includes(k);
    const l = localText.includes(k);
    const mark = p === l ? (p ? "оба" : "нет") : "РАЗНИЦА";
    console.log(`  [${mark}] ${k}: prod=${p} local=${l}`);
  }

  const prodBlocks = extractBlocks(prod.html);
  const localBlocks = extractBlocks(local.html);
  console.log("\nСекций page-constructor__section: prod", prodBlocks.length, "local", localBlocks.length);

  const localByTitle = new Map(localBlocks.map((b) => [b.title, b.text]));
  const blockDiffs = [];
  for (const pb of prodBlocks) {
    const lt = localByTitle.get(pb.title);
    if (!lt) {
      blockDiffs.push({ title: pb.title, kind: "нет на local" });
      continue;
    }
    if (pb.text !== lt) {
      blockDiffs.push({ title: pb.title, kind: "текст отличается", prodLen: pb.text.length, localLen: lt.length });
    }
  }
  for (const lb of localBlocks) {
    if (!prodBlocks.some((p) => p.title === lb.title)) {
      blockDiffs.push({ title: lb.title, kind: "только на local" });
    }
  }

  console.log("\nСекции с отличиями (" + blockDiffs.length + "):");
  blockDiffs.slice(0, 25).forEach((d, i) => {
    console.log(`  ${i + 1}. ${d.title}: ${d.kind}${d.prodLen != null ? ` (prod ${d.prodLen} / local ${d.localLen})` : ""}`);
  });

  const prodOnly = fragmentsOnlyIn(prodText, localText);
  const localOnly = fragmentsOnlyIn(localText, prodText);
  if (prodOnly.length) {
    console.log("\nПримеры фрагментов только на PROD:");
    prodOnly.slice(0, 8).forEach((c, i) => console.log(`  ${i + 1}. ${c.slice(0, 160)}...`));
  }
  if (localOnly.length) {
    console.log("\nПримеры фрагментов только на LOCAL:");
    localOnly.slice(0, 8).forEach((c, i) => console.log(`  ${i + 1}. ${c.slice(0, 160)}...`));
  }

  const outPath = path.join(__dirname, "..", "tmp", "marketing-text-diff-report.txt");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  const report = [
    `exact=${exact}`,
    `jaccard=${(jaccard * 100).toFixed(1)}%`,
    `prod_chars=${prodText.length}`,
    `local_chars=${localText.length}`,
    "",
    "BLOCK_DIFFS:",
    ...blockDiffs.map((d) => JSON.stringify(d)),
    "",
    "ONLY_PROD_HEADINGS:",
    ...onlyProdH,
    "",
    "ONLY_LOCAL_HEADINGS:",
    ...onlyLocalH,
  ].join("\n");
  fs.writeFileSync(outPath, report);
  console.log("\nОтчёт:", outPath);

  process.exit(exact ? 0 : 2);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

#!/usr/bin/env node
/**
 * Подставляет в kontekstnaya_reklama/index.html колонку page-constructor
 * (срез до footer-modern) с URL-переписыванием под статику.
 *
 * Источник среза (KONTEKST_LAYOUT_SOURCE):
 *   - не задан или "auto": если есть tmp/kontekst-prod-full.html — брать срез оттуда (после capture в той же цепочке);
 *     иначе tmp/kontekst-parity-prod-layout.html (ручной/legacy дамп).
 *   - "full": только tmp/kontekst-prod-full.html (ошибка, если нет файла).
 *   - "parity": только tmp/kontekst-parity-prod-layout.html.
 *
 * После среза: блок «Вопрос-ответ» — partial html/partials/services/faq-kontekstnaya-reklama.html
 * + css/sections/kontekstnaya-faq.css (см. index); legacy-блок «Награды» Nuxt снимается до переноса FAQ
 * (иначе FAQ после move попадает в интервал strip и исчезнет); затем moveKontekstnayaFaqSectionBeforeCases — сразу перед блоком кейсов
 * (ниже формы заявки в потоке страницы). Partial наград
 * после блока кейсов и до «Синергии» — insertKontekstnayaAwardsPartialBeforeSynergy. more-case-wr — partial
 * html/partials/services/more-cases-kontekstnaya-from-services.html (как на /services/).
 * Блок «Синергия с услугами» — partial html/partials/services/synergy-kontekstnaya-reklama.html.
 *
 * Порядок секций в срезе prod: «Пакеты» + тарифы + inline-форма до блока «Вопрос-ответ» (partial); перенос не делаем.
 * Строки «Рекламный бюджет» под ценой — ensureKontekstnayaPriceCardAdBudgetLines;
 * col-6→col-4 в плоском срезе — ensureKontekstnayaPriceCardThreeColumns; слайдер пакетов — ensureKontekstnayaPackagesSliderMarkup;
 * полоска сразу под заголовком тарифа (как «Мы любим маркетинг») — ensureKontekstnayaPackageCardTitleRules.
 *
 * Опционально: кастомные заголовок/лид модалки `#desktop-order-popup` — `<template id="sa-order-popup-meta">`
 * после `<body>` (см. leave-request-cta.js, эталон `html/partials/services/order-popup-meta-skeleton.html`);
 * маркеры KONTEKST-MAIN-* срез колонки шаблон не затирают.
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const fullHtmlPath = path.join(root, "tmp", "kontekst-prod-full.html");
const parityLayoutPath = path.join(root, "tmp", "kontekst-parity-prod-layout.html");
const indexPath = path.join(root, "kontekstnaya_reklama", "index.html");
const manifestPath = path.join(root, "kontekstnaya_reklama", "nuxt-css-manifest.json");

function resolveLayoutPath() {
  const mode = (process.env.KONTEKST_LAYOUT_SOURCE || "auto").toLowerCase();
  if (mode === "parity") {
    return { path: parityLayoutPath, label: "parity" };
  }
  if (mode === "full") {
    return { path: fullHtmlPath, label: "full" };
  }
  if (mode !== "auto") {
    console.error("KONTEKST_LAYOUT_SOURCE: ожидается auto | full | parity, получено:", mode);
    process.exit(1);
  }
  if (fs.existsSync(fullHtmlPath)) {
    return { path: fullHtmlPath, label: "full (auto)" };
  }
  if (fs.existsSync(parityLayoutPath)) {
    return { path: parityLayoutPath, label: "parity (auto)" };
  }
  return { path: null, label: null };
}

/** Индекс начала legacy-секции «Награды» (двойной section) перед первым more-case-wr; -1 если нет. */
function findLegacyAwardsSectionStart(mainHtml) {
  const moreRe = /<section class="page-constructor__section"><div[^>]*class="more-case-wr"/;
  const moreMatch = mainHtml.match(moreRe);
  if (!moreMatch) return -1;
  const moreIdx = moreMatch.index;
  const titleNeedle = 'class="awards__title">Награды</h3>';
  const tIdx = mainHtml.lastIndexOf(titleNeedle, moreIdx);
  if (tIdx < 0) return -1;
  const beforeTitle = mainHtml.slice(0, tIdx);
  return beforeTitle.lastIndexOf('<section class="page-constructor__section"><section');
}

/** Заменяет prod-Nuxt блок «Вопрос-ответ» на partial (локальная разметка + kontekstnaya-faq.css). */
function injectKontekstnayaFaqFromPartial(mainHtml) {
  const partialPath = path.join(root, "html", "partials", "services", "faq-kontekstnaya-reklama.html");
  if (!fs.existsSync(partialPath)) {
    console.warn("assemble: нет partial FAQ —", partialPath);
    return mainHtml;
  }
  const partial = fs.readFileSync(partialPath, "utf8").trim();
  const awardsStart = findLegacyAwardsSectionStart(mainHtml);
  if (awardsStart < 0) {
    console.warn("assemble: не найдена привязка FAQ (legacy награды / more-case-wr) — подстановка FAQ пропущена");
    return mainHtml;
  }
  const injectedVariants = [
    '<section class="page-constructor__section kontekst-faq-section"><div id="kontekst-faq-mounted"',
    '<section class="page-constructor__section"><div id="kontekst-faq-mounted"',
  ];
  let replaced = false;
  for (const injectedStart of injectedVariants) {
    const iInjected = mainHtml.indexOf(injectedStart);
    if (iInjected >= 0 && iInjected < awardsStart) {
      mainHtml = `${mainHtml.slice(0, iInjected)}${partial}\n${mainHtml.slice(awardsStart)}`;
      replaced = true;
      break;
    }
  }
  if (replaced) return mainHtml;
  const region = mainHtml.slice(0, awardsStart);
  const startRe =
    /<section class="page-constructor__section"><div[^>]*data-v-841383f2[^>]*class="questions-wr page__container_admin">/;
  const m = region.match(startRe);
  if (!m || m.index === undefined) {
    console.warn("assemble: prod-блок FAQ (questions-wr + data-v-841383f2) не найден — подстановка пропущена");
    return mainHtml;
  }
  const i0 = m.index;
  return `${mainHtml.slice(0, i0)}${partial}\n${mainHtml.slice(awardsStart)}`;
}

const FORMS_BLOCK_CLOSE = "</form></div></div></div></div></section></div></div></section>";

/** Prod-срез иногда без `<p><i>Рекламный бюджет…` под ценой — восстанавливаем для паритета и verify. */
function ensureKontekstnayaPriceCardAdBudgetLines(mainHtml) {
  const pairs = [
    [
      'От 107 000 <span data-v-1444f1fb="">¤</span></span> <!----> <!----></div> <!----></div> <script data-v-1444f1fb="" type="application/ld+json">{"@context":"https://schema.org/","@type":"Product","name":"Минимальный"',
      'От 107 000 <span data-v-1444f1fb="">¤</span></span> <p data-v-1444f1fb=""><i>Рекламный бюджет от 300 000&nbsp;₽</i></p> <!----> <!----></div> <!----></div> <script data-v-1444f1fb="" type="application/ld+json">{"@context":"https://schema.org/","@type":"Product","name":"Минимальный"',
    ],
    [
      'От 128 000 <span data-v-1444f1fb="">¤</span></span> <!----> <!----></div> <!----></div> <script data-v-1444f1fb="" type="application/ld+json">{"@context":"https://schema.org/","@type":"Product","name":"Оптимальный"',
      'От 128 000 <span data-v-1444f1fb="">¤</span></span> <p data-v-1444f1fb=""><i>Рекламный бюджет от 350 000&nbsp;₽</i></p> <!----> <!----></div> <!----></div> <script data-v-1444f1fb="" type="application/ld+json">{"@context":"https://schema.org/","@type":"Product","name":"Оптимальный"',
    ],
    [
      'от 149 000 <span data-v-1444f1fb="">¤</span></span> <!----> <!----></div> <!----></div> <script data-v-1444f1fb="" type="application/ld+json">{"@context":"https://schema.org/","@type":"Product","name":"Расширенный"',
      'от 149 000 <span data-v-1444f1fb="">¤</span></span> <p data-v-1444f1fb=""><i>Рекламный бюджет от 400 000&nbsp;₽</i></p> <!----> <!----></div> <!----></div> <script data-v-1444f1fb="" type="application/ld+json">{"@context":"https://schema.org/","@type":"Product","name":"Расширенный"',
    ],
  ];
  let out = mainHtml;
  for (const [from, to] of pairs) {
    if (out.includes(from)) out = out.split(from).join(to);
  }
  return out;
}

/** Плоский prod-ряд из трёх price-card__wrapper → слайдер как «Услуги» (native-row + initRow). */
function ensureKontekstnayaPackagesSliderMarkup(mainHtml) {
  if (mainHtml.includes("prices__cards--packages")) return mainHtml;
  let s = mainHtml;
  const openNeedle =
    '<div data-v-1505791e="" class="prices__cards row"><div data-v-1444f1fb="" data-v-1505791e="" class="price-card__wrapper col-4 col-md-6 col-sm-12"><div data-v-1444f1fb="" class="price-card noImg"><h3 data-v-1444f1fb="">Минимальный';
  const openAlt =
    '<div data-v-1505791e="" class="prices__cards row"><div data-v-1444f1fb="" data-v-1505791e="" class="price-card__wrapper col-6 col-sm-12"><div data-v-1444f1fb="" class="price-card noImg"><h3 data-v-1444f1fb="">Минимальный';
  const openReplaced =
    '<div data-v-1505791e="" class="prices__cards row prices__cards--packages"><div data-v-1505791e="" class="prices__packages-slider swiper-container swiper-container-horizontal swiper-container-free-mode"><div data-v-1505791e="" class="prices__packages-track swiper-wrapper"><div class="prices__packages-slide swiper-slide" style="margin-right:30px"><div data-v-1444f1fb="" data-v-1505791e="" class="price-card__wrapper"><div data-v-1444f1fb="" class="price-card noImg"><h3 data-v-1444f1fb="">Минимальный';
  if (s.includes(openNeedle)) s = s.split(openNeedle).join(openReplaced);
  else if (s.includes(openAlt)) s = s.split(openAlt).join(openReplaced);
  else return mainHtml;

  s = s.replace(
    /<\/script><\/div><div data-v-1444f1fb="" data-v-1505791e="" class="price-card__wrapper col-4 col-md-6 col-sm-12"><div data-v-1444f1fb="" class="price-card noImg"><h3 data-v-1444f1fb="">Оптимальный/g,
    "</script></div></div><div class=\"prices__packages-slide swiper-slide\" style=\"margin-right:30px\"><div data-v-1444f1fb=\"\" data-v-1505791e=\"\" class=\"price-card__wrapper\"><div data-v-1444f1fb=\"\" class=\"price-card noImg\"><h3 data-v-1444f1fb=\"\">Оптимальный",
  );
  s = s.replace(
    /<\/script><\/div><div data-v-1444f1fb="" data-v-1505791e="" class="price-card__wrapper col-6 col-sm-12"><div data-v-1444f1fb="" class="price-card noImg"><h3 data-v-1444f1fb="">Оптимальный/g,
    "</script></div></div><div class=\"prices__packages-slide swiper-slide\" style=\"margin-right:30px\"><div data-v-1444f1fb=\"\" data-v-1505791e=\"\" class=\"price-card__wrapper\"><div data-v-1444f1fb=\"\" class=\"price-card noImg\"><h3 data-v-1444f1fb=\"\">Оптимальный",
  );
  s = s.replace(
    /<\/script><\/div><div data-v-1444f1fb="" data-v-1505791e="" class="price-card__wrapper col-4 col-md-6 col-sm-12"><div data-v-1444f1fb="" class="price-card noImg"><h3 data-v-1444f1fb="">Расширенный/g,
    "</script></div></div><div class=\"prices__packages-slide swiper-slide\" style=\"margin-right:30px\"><div data-v-1444f1fb=\"\" data-v-1505791e=\"\" class=\"price-card__wrapper\"><div data-v-1444f1fb=\"\" class=\"price-card noImg\"><h3 data-v-1444f1fb=\"\">Расширенный",
  );
  s = s.replace(
    /<\/script><\/div><div data-v-1444f1fb="" data-v-1505791e="" class="price-card__wrapper col-6 col-sm-12"><div data-v-1444f1fb="" class="price-card noImg"><h3 data-v-1444f1fb="">Расширенный/g,
    "</script></div></div><div class=\"prices__packages-slide swiper-slide\" style=\"margin-right:30px\"><div data-v-1444f1fb=\"\" data-v-1505791e=\"\" class=\"price-card__wrapper\"><div data-v-1444f1fb=\"\" class=\"price-card noImg\"><h3 data-v-1444f1fb=\"\">Расширенный",
  );
  s = s.replace(
    /"price":"149000\.00","availability":"https:\/\/schema\.org\/InStock"}}<\/script><\/div><\/div><\/section><\/div><\/div><\/section>/g,
    '"price":"149000.00","availability":"https://schema.org/InStock"}}</script></div></div></div></div></div></section></div></div></section>',
  );
  return s;
}

/** Сразу под заголовком тарифа — градиентные полоски как .live-marketing-block__card-gradient на главной. */
function ensureKontekstnayaPackageCardTitleRules(mainHtml) {
  let s = mainHtml;
  /* Убираем вариант «между описанием и ценой» (прошлый перенос). */
  s = s.replace(
    /<\/p>\s*<div class="price-card__title-rule price-card__title-rule--[123]" aria-hidden="true"><\/div>\s*<div data-v-1444f1fb="" class="price-card__details">/g,
    '</p> <div data-v-1444f1fb="" class="price-card__details">',
  );
  /* Снимаем под заголовком, чтобы не дублировать при повторном прогоне. */
  s = s.replace(
    /<\/h3><div class="price-card__title-rule price-card__title-rule--[123]" aria-hidden="true"><\/div>\s*/g,
    "</h3> ",
  );
  const afterH3 = [
    [
      "</h3> <p data-v-1444f1fb=\"\">Продвижение 1-2 услуг",
      '</h3><div class="price-card__title-rule price-card__title-rule--1" aria-hidden="true"></div> <p data-v-1444f1fb="">Продвижение 1-2 услуг',
    ],
    [
      "</h3> <p data-v-1444f1fb=\"\">Продвижение 3-5 услуг",
      '</h3><div class="price-card__title-rule price-card__title-rule--2" aria-hidden="true"></div> <p data-v-1444f1fb="">Продвижение 3-5 услуг',
    ],
    [
      "</h3> <p data-v-1444f1fb=\"\">Продвижение широкого",
      '</h3><div class="price-card__title-rule price-card__title-rule--3" aria-hidden="true"></div> <p data-v-1444f1fb="">Продвижение широкого',
    ],
  ];
  for (const [needle, repl] of afterH3) {
    if (!s.includes(needle)) continue;
    if (s.includes(repl)) continue;
    s = s.split(needle).join(repl);
  }
  return s;
}

/** Плоский срез: col-6 → col-4 (до обёртки слайдером). */
function ensureKontekstnayaPriceCardThreeColumns(mainHtml) {
  return mainHtml.replace(
    /class="price-card__wrapper col-6 col-sm-12"/g,
    'class="price-card__wrapper col-4 col-md-6 col-sm-12"',
  );
}

/**
 * Снимает prod-Nuxt секцию «Награды» (между её внешним section и первым more-case-wr).
 * Partial подставляется отдельно перед синергией — см. insertKontekstnayaAwardsPartialBeforeSynergy.
 */
function stripProdKontekstnayaAwardsBlock(mainHtml) {
  const moreRe = /<section class="page-constructor__section"><div[^>]*class="more-case-wr"/;
  const moreMatch = mainHtml.match(moreRe);
  if (!moreMatch) {
    console.warn("assemble: не найден more-case-wr — снятие legacy наград пропущено");
    return { html: mainHtml, ok: false };
  }
  const moreIdx = moreMatch.index;
  const secStart = findLegacyAwardsSectionStart(mainHtml);
  if (secStart < 0) {
    console.warn("assemble: заголовок «Награды» (legacy Nuxt) не найден — снятие наград пропущено");
    return { html: mainHtml, ok: false };
  }
  return { html: mainHtml.slice(0, secStart) + mainHtml.slice(moreIdx), ok: true };
}

/**
 * Partial «Награды» сразу после кейсов (more-cases), выше блока «Синергия с услугами».
 * Если prod synergy ещё не вырезан — вставка перед synergy-section; иначе fallback в хвост колонки.
 */
function insertKontekstnayaAwardsPartialBeforeSynergy(mainHtml) {
  const partialPath = path.join(root, "html", "partials", "services", "awards-kontekstnaya-reklama.html");
  if (!fs.existsSync(partialPath)) {
    console.warn("assemble: нет partial наград —", partialPath);
    return mainHtml;
  }
  const partial = fs.readFileSync(partialPath, "utf8").trim();
  const prodSynergyStart =
    '<section class="page-constructor__section"><section data-v-627ccbce="" class="synergy-section">';
  const iProd = mainHtml.indexOf(prodSynergyStart);
  if (iProd >= 0) {
    return `${mainHtml.slice(0, iProd)}${partial}\n${mainHtml.slice(iProd)}`;
  }
  const mountedSynergy = '<section class="page-constructor__section kontekst-synergy-root"';
  const iMounted = mainHtml.indexOf(mountedSynergy);
  if (iMounted >= 0) {
    return `${mainHtml.slice(0, iMounted)}${partial}\n${mainHtml.slice(iMounted)}`;
  }
  console.warn("assemble: не найдена синергия — partial наград добавлен в конец колонки");
  return `${mainHtml.replace(/\s+$/, "")}\n${partial}\n`;
}

/** Заменяет блок more-case-wr из prod-среза на разметку со страницы /services/ (partial). */
function injectKontekstnayaMoreCasesFromServicesPartial(mainHtml) {
  const partialPath = path.join(
    root,
    "html",
    "partials",
    "services",
    "more-cases-kontekstnaya-from-services.html",
  );
  if (!fs.existsSync(partialPath)) {
    console.warn("assemble: нет partial more-cases (services) —", partialPath);
    return mainHtml;
  }
  const partial = fs.readFileSync(partialPath, "utf8").trim();
  const synergyNeedle = '<section class="page-constructor__section"><section data-v-627ccbce="" class="synergy-section">';
  const iSyn = mainHtml.indexOf(synergyNeedle);
  if (iSyn < 0) {
    console.warn("assemble: не найден synergy-section — подстановка more-cases пропущена");
    return mainHtml;
  }
  const searchRegion = mainHtml.slice(0, iSyn);
  const moreRe = /<section class="page-constructor__section"><div data-v-27a87df0="" class="more-case-wr[^"]*">/g;
  let m;
  let lastStart = -1;
  while ((m = moreRe.exec(searchRegion)) !== null) {
    lastStart = m.index;
  }
  if (lastStart < 0) {
    console.warn("assemble: не найден more-case-wr перед synergy — подстановка more-cases пропущена");
    return mainHtml;
  }
  return `${mainHtml.slice(0, lastStart)}${partial}\n${mainHtml.slice(iSyn)}`;
}

/** Заменяет блок «Синергия с услугами» из prod-среза на partial (как награды). */
function injectKontekstnayaSynergyFromPartial(mainHtml) {
  const partialPath = path.join(
    root,
    "html",
    "partials",
    "services",
    "synergy-kontekstnaya-reklama.html",
  );
  if (!fs.existsSync(partialPath)) {
    console.warn("assemble: нет partial synergy —", partialPath);
    return mainHtml;
  }
  const partial = fs.readFileSync(partialPath, "utf8").trim();
  const start =
    '<section class="page-constructor__section"><section data-v-627ccbce="" class="synergy-section">';
  const i0 = mainHtml.indexOf(start);
  if (i0 < 0) {
    console.warn("assemble: не найден synergy-section (prod) — подстановка synergy пропущена");
    return mainHtml;
  }
  const close = "</section></section>";
  const j = mainHtml.indexOf(close, i0);
  if (j < 0) {
    console.warn("assemble: не найден конец synergy — подстановка пропущена");
    return mainHtml;
  }
  const i1 = j + close.length;
  return `${mainHtml.slice(0, i0)}${partial}\n${mainHtml.slice(i1)}`;
}

/**
 * Заменяет Nuxt-блок «forms modern» на partial инлайн-формы (как модалка; meta в template).
 */
function injectKontekstnayaServiceInlineLeadFromPartial(mainHtml) {
  if (mainHtml.includes('id="sa-inline-lead-root"')) return mainHtml;
  const partialPath = path.join(
    root,
    "html",
    "partials",
    "services",
    "service-inline-lead-kontekstnaya-reklama.html",
  );
  if (!fs.existsSync(partialPath)) {
    console.warn("assemble: нет partial service-inline-lead —", partialPath);
    return mainHtml;
  }
  const FORMS_MODERN_SECTION_START = '<section class="page-constructor__section"><div class="forms modern">';
  const i0 = mainHtml.indexOf(FORMS_MODERN_SECTION_START);
  if (i0 < 0) return mainHtml;
  const iClose = mainHtml.indexOf(FORMS_BLOCK_CLOSE, i0);
  if (iClose < 0) {
    console.warn("assemble: не найден конец Nuxt-forms — подстановка service-inline-lead пропущена");
    return mainHtml;
  }
  const i1 = iClose + FORMS_BLOCK_CLOSE.length;
  const partial = fs.readFileSync(partialPath, "utf8").trim();
  return `${mainHtml.slice(0, i0)}${partial}\n${mainHtml.slice(i1)}`;
}

const FAQ_COMMENT_PREFIX = "<!-- FAQ «Вопрос-ответ»";
const FAQ_SECTION_START = '<section class="page-constructor__section kontekst-faq-section">';
const FAQ_BLOCK_TAIL = "</script></div></section>";
/** Prod: `class="more-case-wr"`; после partial кейсов — `more-case-wr__main`. */
const CASES_MORE_MAIN = "more-case-wr more-case-wr__main";
const CASES_CLASS_PREFIX = 'class="more-case-wr';

function findKontekstnayaCasesAnchorIndex(mainHtml) {
  const iMain = mainHtml.indexOf(CASES_MORE_MAIN);
  if (iMain >= 0) return iMain;
  return mainHtml.indexOf(CASES_CLASS_PREFIX);
}

/** Вырезает HTML-блок FAQ (комментарий + секция kontekst-faq-section) или null. */
function extractKontekstnayaFaqBlock(mainHtml) {
  let i0 = mainHtml.indexOf(FAQ_COMMENT_PREFIX);
  if (i0 < 0) i0 = mainHtml.indexOf(FAQ_SECTION_START);
  if (i0 < 0) return { block: null, start: -1, end: -1 };
  const iClose = mainHtml.indexOf(FAQ_BLOCK_TAIL, i0);
  if (iClose < 0) return { block: null, start: -1, end: -1 };
  const end = iClose + FAQ_BLOCK_TAIL.length;
  return { block: mainHtml.slice(i0, end), start: i0, end };
}

/**
 * Переносит FAQ сразу перед секцией с more-case-wr__main (ниже формы / команды, до кейсов).
 * Идемпотентно: вырезает блок и вставляет перед открывающей <section> кейсов.
 */
function moveKontekstnayaFaqSectionBeforeCases(mainHtml) {
  const { block, start, end } = extractKontekstnayaFaqBlock(mainHtml);
  if (!block || start < 0) {
    console.warn("assemble: блок FAQ не найден — перенос перед кейсами пропущен");
    return mainHtml;
  }
  const iCases = findKontekstnayaCasesAnchorIndex(mainHtml);
  if (iCases < 0) {
    console.warn("assemble: блок кейсов (more-case-wr) не найден — перенос FAQ пропущен");
    return mainHtml;
  }
  const iInsert = mainHtml.lastIndexOf('<section class="page-constructor__section">', iCases);
  if (iInsert < 0 || iInsert > iCases) {
    console.warn("assemble: не найден <section> перед кейсами — перенос FAQ пропущен");
    return mainHtml;
  }
  const without = mainHtml.slice(0, start) + mainHtml.slice(end);
  const iCases2 = findKontekstnayaCasesAnchorIndex(without);
  if (iCases2 < 0) {
    console.warn("assemble: после вырезания FAQ потерян more-case-wr — откат переноса");
    return mainHtml;
  }
  const iInsert2 = without.lastIndexOf('<section class="page-constructor__section">', iCases2);
  if (iInsert2 < 0) {
    console.warn("assemble: после вырезания FAQ не найдена точка вставки — откат переноса");
    return mainHtml;
  }
  return `${without.slice(0, iInsert2)}\n${block}\n${without.slice(iInsert2)}`;
}

function rewriteProdSlice(html) {
  let s = html;
  s = s.replace(/https:\/\/serenity\.agency\/storage\//g, "/_sa/img/storage__");
  s = s.replace(/url\(([a-zA-Z0-9._-]+\.(?:webp|jpg|jpeg|png|gif|mp4))\)/g, "url(/_sa/img/storage__$1)");
  s = s.replace(/href="https:\/\/serenity\.agency\//g, 'href="/');
  s = s.replace(/src="\/video\/lastBlogGif\.gif"/g, 'src="/_sa/img/video__lastBlogGif.gif"');
  s = s.replace(/itemprop="image" src="https:\/\/serenity\.agency\/storage\/">/g, 'itemprop="image" src="/_sa/img/storage__xjhFEA49677OGQDTXjw6he9xnUh71ef9GgvspTHz.webp">');
  s = s.replace(/itemprop="image" src="\/storage\/">/g, 'itemprop="image" src="/_sa/img/storage__xjhFEA49677OGQDTXjw6he9xnUh71ef9GgvspTHz.webp">');
  s = s.replace(/itemprop="image" src="\/_sa\/img\/storage__">/g, 'itemprop="image" src="/_sa/img/storage__xjhFEA49677OGQDTXjw6he9xnUh71ef9GgvspTHz.webp">');
  // Локальный Nuxt (SerenityAgency): абсолютные URL к своему origin
  s = s.replace(/https:\/\/serenity-dev\.ru\//g, "/");
  s = s.replace(/https?:\/\/127\.0\.0\.1(?::\d+)?\//g, "/");
  s = s.replace(/https?:\/\/localhost(?::\d+)?\//g, "/");
  // Пустой хвост из Nuxt-гидрации: второй page-constructor только с <!----> ломает стек/DOM.
  s = s.replace(/<div class="page-constructor">\s*<!---->\s*<\/div>\s*<!---->/g, "");
  return s;
}

function buildCssLinks(v) {
  const man = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const hrefs = man.hrefs || man;
  if (!Array.isArray(hrefs) || !hrefs.length) throw new Error("manifest hrefs пуст");
  return hrefs.map((h) => `    <link rel="stylesheet" href="${h}?v=${v}" />`).join("\n");
}

function run() {
  const { path: layoutPath, label: layoutLabel } = resolveLayoutPath();
  if (!layoutPath || !fs.existsSync(layoutPath)) {
    console.error(
      "Нет дампа для среза: сначала capture (tmp/kontekst-prod-full.html) или положите tmp/kontekst-parity-prod-layout.html",
    );
    process.exit(1);
  }
  console.log("assemble: layout source =", layoutLabel, "->", layoutPath);
  if (!fs.existsSync(manifestPath)) {
    console.error("Нет манифеста", manifestPath, "— node scripts/download-nuxt-css-prod-kontekstnaya.cjs");
    process.exit(1);
  }
  const layout = fs.readFileSync(layoutPath, "utf8");
  const iPc = layout.indexOf('<div class="page-constructor">');
  const iFm = layout.indexOf('<footer class="footer-modern"');
  if (iPc < 0 || iFm < 0 || iFm <= iPc) {
    console.error("Некорректные границы среза page-constructor / footer-modern");
    process.exit(1);
  }
  let main = rewriteProdSlice(layout.slice(iPc, iFm));
  main = injectKontekstnayaFaqFromPartial(main);
  main = ensureKontekstnayaPriceCardAdBudgetLines(main);
  main = ensureKontekstnayaPriceCardThreeColumns(main);
  main = ensureKontekstnayaPackagesSliderMarkup(main);
  main = ensureKontekstnayaPackageCardTitleRules(main);
  main = injectKontekstnayaServiceInlineLeadFromPartial(main);
  /** Сначала снимаем legacy «Награды» до первого more-case-wr: после move FAQ окажется внутри [secStart, moreIdx) и будет вырезан. */
  const stripAwards = stripProdKontekstnayaAwardsBlock(main);
  main = stripAwards.html;
  main = moveKontekstnayaFaqSectionBeforeCases(main);
  main = injectKontekstnayaMoreCasesFromServicesPartial(main);
  if (stripAwards.ok) main = insertKontekstnayaAwardsPartialBeforeSynergy(main);
  main = injectKontekstnayaSynergyFromPartial(main);

  const index = fs.readFileSync(indexPath, "utf8");
  const MAIN_START = "<!-- KONTEKST-MAIN-START -->";
  const MAIN_END = "<!-- KONTEKST-MAIN-END -->";

  const v = "20260513kontekstBundle2";
  const cssBlock = [
    "    <!-- KONTEKST-CSS-BUNDLE-START: prod Nuxt chunks -->",
    "    <link rel=\"stylesheet\" href=\"/_sa/css/css__home-snapshot__snapshot.bundle.css?v=20260424\" />",
    "    <link rel=\"stylesheet\" href=\"/_sa/css/css__home-snapshot__overrides.parity-sync.css?v=20260512categoryScrollEdge\" />",
    "    <link rel=\"stylesheet\" href=\"/_sa/css/css__home-snapshot__native-row-scroll.css?v=20260514kontekstPackagesNativeRow\" />",
    buildCssLinks(v),
    "    <link rel=\"stylesheet\" href=\"/_sa/css/sections/kontekstnaya-faq.css?v=20260514kontekstFaqGutterX\" />",
    "    <link rel=\"stylesheet\" href=\"/_sa/css/sections/home-awards.css?v=20260514kontekstAwardsShell\" />",
    "    <link rel=\"stylesheet\" href=\"/_sa/css/kontekstnaya-reklama-static-stack.css?v=20260514kontekstPackagesTitleStack\" />",
    "    <link rel=\"stylesheet\" href=\"https://cdnjs.cloudflare.com/ajax/libs/Swiper/8.4.7/swiper-bundle.min.css\" />",
    "    <link rel=\"stylesheet\" href=\"/_sa/css/css__home-snapshot__slider-arrows.css?v=20260513kontekstSwipers\" />",
    "    <link rel=\"stylesheet\" href=\"/_sa/css/css__home-snapshot__overrides.mobile.css?v=20260429m\" />",
    "    <link rel=\"stylesheet\" href=\"/_sa/css/sections/footer-burger-chrome.css?v=20260502aligngrid\" />",
    "    <link rel=\"stylesheet\" href=\"/_sa/css/sections/service-inline-lead-form.css?v=20260514serviceInlineLead7\" />",
    "    <link rel=\"stylesheet\" href=\"/_sa/css/sections/header.css?v=20260514navMenu16\" />",
    "    <!-- KONTEKST-CSS-BUNDLE-END -->",
  ].join("\n");

  const cssStart = index.indexOf("<!-- KONTEKST-CSS-BUNDLE-START");
  const cssEnd = index.indexOf("<!-- KONTEKST-CSS-BUNDLE-END -->");
  if (cssStart < 0 || cssEnd < 0) {
    console.error("Добавьте маркеры KONTEKST-CSS-BUNDLE в head index.html");
    process.exit(1);
  }
  const cssEndLine = cssEnd + "<!-- KONTEKST-CSS-BUNDLE-END -->".length;
  const indexCss = index.slice(0, cssStart) + cssBlock + index.slice(cssEndLine);

  const iStart = indexCss.indexOf(MAIN_START);
  const iEnd = indexCss.indexOf(MAIN_END);
  if (iStart < 0 || iEnd < 0 || iEnd <= iStart) {
    console.error(
      "В index.html не найдены маркеры KONTEKST-MAIN-START / KONTEKST-MAIN-END (не используйте indexOf по page-constructor — подстрока может встретиться в SVG path)",
    );
    process.exit(1);
  }

  const beforeMain = indexCss.slice(0, iStart + MAIN_START.length);
  const afterMain = indexCss.slice(iEnd);
  const out = `${beforeMain}\n${main}\n${afterMain}`;
  fs.writeFileSync(indexPath, out, "utf8");
  console.log("assemble-kontekstnaya-from-prod-layout: ok, bytes main", main.length);
}

run();


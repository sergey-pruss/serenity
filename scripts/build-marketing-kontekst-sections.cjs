#!/usr/bin/env node
/**
 * Текстовые секции /services/marketing → разметка kontekstnaya_reklama (content-block).
 */
const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");
const { processTypographyHtml } = require("./typography-nbsp.cjs");

const root = path.resolve(__dirname, "..");
const capturePath = path.join(root, "tmp", "marketing-prod-full.html");
const outPath = path.join(root, "html", "partials", "services", "marketing-kontekst-sections.html");
const diagramPartialPath = path.join(root, "html/partials/services/marketing-synergy-diagram.html");

const HREF_CANON = {
  "/services/content-strategy": "/content-strategy",
  "/services/context": "/kontekstnaya_reklama",
  "/services/targeting": "/targeting",
  "/services/strategy": "/services/brend-strategy",
  "https://serenity.agency/services/strategy": "/services/brend-strategy",
  "https://serenity.agency/services/brend-strategy": "/services/brend-strategy",
  "/services/seo": "/services/seo",
  "/services/smm": "/services/smm",
  "/services/content": "/services/content",
  "/services/salesmarketing": "/services/salesmarketing",
};

/** Как kontekstnaya_reklama: стили content-block в Nuxt bundle привязаны к scope. */
const CB = " data-v-4ed7dc78";

const SECTION_LINKS = {
  "Cтратегия": "/services#services-strategy",
  "Бренд-стратегия": "/services/brend-strategy",
  Бренд: "/services#services-branding",
  "Измеримое продвижение": "/services#services-promotion",
  Сайт: "/services#services-sites",
  SEO: "/services/seo",
  Продажи: "/services/salesmarketing",
};

/** Якоря на /services/marketing: диаграмма → #id, заголовки секций → /services#…. */
const SECTION_PAGE_ANCHORS = {
  "Cтратегия": "marketing-strategy",
  Бренд: "marketing-branding",
  "Измеримое продвижение": "marketing-promotion",
  Продажи: "marketing-sales",
};

function marketingSectionOpenTag(extraClass = "", sectionTitle = "") {
  const anchorId = sectionTitle ? SECTION_PAGE_ANCHORS[sectionTitle] : "";
  const idAttr = anchorId ? ` id="${anchorId}"` : "";
  const classes = ["page-constructor__section", "marketing-kontekst-section", extraClass]
    .filter(Boolean)
    .join(" ");
  return `<section class="${classes}"${idAttr}>`;
}

function canonHref(href) {
  if (!href) return null;
  let h = href.replace(/^https:\/\/serenity\.agency/, "");
  if (HREF_CANON[h]) return HREF_CANON[h];
  return h || null;
}

function innerText($, el) {
  return $(el).text().replace(/\s+/g, " ").trim();
}

function escHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function rewriteHtml(html) {
  let s = html;
  const mapPath = path.join(root, "json", "services", "marketing", "image-map.json");
  if (fs.existsSync(mapPath)) {
    const map = JSON.parse(fs.readFileSync(mapPath, "utf8"));
    for (const [from, to] of Object.entries(map)) {
      s = s.split(from).join(to);
    }
  }
  s = s.replace(/href="https:\/\/serenity\.agency\//g, 'href="/');
  for (const [from, to] of Object.entries(HREF_CANON)) {
    s = s.split(`href="${from}"`).join(`href="${to}"`);
  }
  s = s.replace(/src="\/img\//g, 'src="/_sa/img/services/marketing/cm/');
  return s;
}

function cardItemHtml(c) {
  const t = escHtml(c.title);
  const h = c.href
    ? `<h3 class="block__name"${CB}><a href="${escHtml(c.href)}">${t}</a></h3>`
    : `<h3 class="block__name"${CB}>${t}</h3>`;
  return `<motion.div class="col-4 col-sm-12 block-item"${CB}>
          <motion.div class="block__name-wrapper"${CB}>${h}</motion.div>
          <p class="block__description"${CB}>${c.body}</p>
        </motion.div>`;
}

/** Ровно 3 колонки как на kontekst; пары по 2 карточки дают 5 .col-4 → перенос 3+2 и «дыра» в середине. */
function distributeCardsToColumns(cards, columnCount = 3) {
  const buckets = Array.from({ length: columnCount }, () => []);
  const base = Math.floor(cards.length / columnCount);
  const remainder = cards.length % columnCount;
  let idx = 0;
  for (let col = 0; col < columnCount; col += 1) {
    const take = base + (col < remainder ? 1 : 0);
    for (let j = 0; j < take; j += 1) buckets[col].push(cards[idx++]);
  }
  return buckets;
}

function buildCardsGridHtml(cards) {
  return distributeCardsToColumns(cards, 3)
    .map((bucket) => {
      const inner = bucket.map((c) => cardItemHtml(c)).join("");
      return `<motion.div class="col-4"${CB}>${inner}</motion.div>`;
    })
    .join("");
}

/** Prod «Продажи»: grid_two — по 2 карточки в колонке, не 2+1+1 в тройной сетке. */
function buildSalesCardsGridHtml(cards) {
  return distributeCardsToColumns(cards, 2)
    .map((bucket) => {
      const inner = bucket.map((c) => cardItemHtml(c)).join("");
      return `<motion.div class="col-4"${CB}>${inner}</motion.div>`;
    })
    .join("");
}

function buildTabletGridHtml(cards) {
  return cards
    .map((c) => {
      const t = escHtml(c.title);
      return `<motion.div class="col-4 col-sm-12 block-item"${CB}><h3 class="block__name"${CB}>${t}</h3><p class="block__description"${CB}>${c.body}</p></motion.div>`;
    })
    .join("");
}

/** Prod .section-info: слева заголовок + p.small, справа .section-info__discription. */
function parseSectionInfoHeader($, $sectionInfo) {
  const $wrap = $sectionInfo.find(".section-info__title-wrap").first();
  const $disc = $sectionInfo.find(".section-info__discription").first();
  const $heading = $wrap.find("h2, h3").first();
  const introLarge = innerText($, $disc.find("p").first());
  let introSmall = innerText($, $wrap.find("p.small").first());
  if (!introSmall) introSmall = innerText($, $wrap.find("p").first());
  if (introLarge && introSmall === introLarge) introSmall = "";
  return {
    title: innerText($, $heading),
    href: canonHref($heading.find("a").attr("href")),
    introSmall,
    introLarge,
  };
}

function sectionHeaderFromSlice($, $slice, title) {
  const matchH2 = (_, el) =>
    innerText($, $(el).find(".section-info__title-wrap h2").first()) === title;
  let $info = $slice.is(".section-info") ? $slice.filter(matchH2) : $();
  if (!$info.length) $info = $slice.find(".section-info").filter(matchH2).first();
  if ($info.length) {
    const p = parseSectionInfoHeader($, $info);
    return { introSmall: p.introSmall, introLarge: p.introLarge };
  }
  return { introSmall: sectionIntro($, $slice, title), introLarge: "" };
}

function buildDualColumnHeaderHtml({
  level = "h2",
  title,
  href,
  introSmall = "",
  introLarge = "",
  withBullet = false,
  wrapperClass = "numbered-header number-header__empty title-large",
}) {
  const titleEsc = escHtml(title);
  const isH3 = level === "h3";
  const titleTag = isH3 ? "h3" : "h2";
  const titleClass = isH3 ? ` class="marketing-section__subhead-title"${CB}` : "";
  const titleInner = href
    ? `<${titleTag}${titleClass}><a class="marketing-section__link" href="${escHtml(href)}">${titleEsc}</a></${titleTag}>`
    : `<${titleTag}${titleClass}>${titleEsc}</${titleTag}>`;
  const bullet = withBullet
    ? `<motion.div class="numbered-header__bullet"${CB}></motion.div>`
    : "";
  const titleWrapClass = isH3 ? "marketing-section__subhead-title-wrap" : "numbered-header__title";
  const leadP = introSmall
    ? `<p class="marketing-section__subhead-lead${introLarge ? " small" : " content-block__desc"}"${CB}>${escHtml(introSmall)}</p>`
    : "";
  const rightCol = introLarge
    ? `<motion.div class="col-6 col-md-12 numbered-header__subtitle-column"${CB}><p class="content-block__desc"${CB}>${escHtml(introLarge)}</p></motion.div>`
    : "";
  return `<motion.div class="${wrapperClass}"${CB}>
        <motion.div class="row"${CB}>
          <motion.div class="col-6 col-md-12 numbered-header__title-column"${CB}>
            ${bullet}
            <motion.div class="${titleWrapClass}"${CB}>${titleInner}</motion.div>
            ${leadP}
          </motion.div>
          ${rightCol}
        </motion.div>
      </motion.div>`;
}

function buildSectionHeaderHtml(title, href, introSmall, introLarge = "") {
  return buildDualColumnHeaderHtml({
    level: "h2",
    title,
    href,
    introSmall,
    introLarge,
    withBullet: true,
  });
}

function buildSubheadHtml(subhead, extraClass = "") {
  const cls = extraClass ? ` marketing-section__subhead--${extraClass}` : "";
  const introSmall = subhead.introSmall ?? subhead.intro ?? "";
  const introLarge = subhead.introLarge ?? "";
  return `<motion.div class="marketing-section__subhead${cls}"${CB}>${buildDualColumnHeaderHtml({
    level: "h3",
    title: subhead.title,
    href: subhead.href,
    introSmall,
    introLarge,
    wrapperClass: "marketing-section__subhead-inner",
  })}</motion.div>`;
}

function mapCmSrc(src) {
  if (!src) return "";
  let s = src;
  const mapPath = path.join(root, "json", "services", "marketing", "image-map.json");
  if (fs.existsSync(mapPath)) {
    const map = JSON.parse(fs.readFileSync(mapPath, "utf8"));
    if (map[s]) s = map[s];
  }
  if (s.startsWith("/img/")) return s.replace(/^\/img\//, "/_sa/img/services/marketing/cm/");
  return s;
}

/** Уникальные слайды cm-swiper из prod (8 кадров × 3 для бесконечной ленты). */
function extractCmSlides($, $swiperSlice) {
  const seen = new Set();
  const slides = [];
  $swiperSlice.find(".swiper-slide img").each((_, img) => {
    const src = mapCmSrc($(img).attr("src"));
    if (!src || seen.has(src)) return;
    seen.add(src);
    slides.push(src);
  });
  return slides;
}

const CM_WIDE_ARROW_PREV = `<svg width="17" height="35" viewBox="0 0 23 41" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M20 38L3 20.5L20 3" stroke="white" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const CM_WIDE_ARROW_NEXT = `<svg width="17" height="35" viewBox="0 0 23 41" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M3 3L20 20.5L3 38" stroke="white" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

/** Prod: .sites-slider после карточек «Сайт» (case_slide_*.png). */
function extractSitesSlides($, $sliderSlice) {
  const seen = new Set();
  const slides = [];
  $sliderSlice.find(".swiper-slide").each((_, el) => {
    const $slide = $(el);
    if ($slide.hasClass("swiper-slide-duplicate")) return;
    const idx = $slide.attr("data-swiper-slide-index");
    if (idx === undefined || seen.has(idx)) return;
    seen.add(idx);
    const src = mapCmSrc($slide.find("img").attr("src"));
    if (!src) return;
    const text = innerText($, $slide.find(".sites-slider__text, .case-slider__text").first());
    slides.push({ idx: Number(idx), src, text });
  });
  slides.sort((a, b) => a.idx - b.idx);
  return slides;
}

function buildSitesSliderHtml(slides) {
  if (!slides.length) return "";
  const slidesHtml = slides
    .map(
      ({ src, text }) =>
        `<motion.div class="swiper-slide case-slider__item"${CB}><img src="${escHtml(src)}" alt="" loading="lazy" draggable="false" class="sites-slider__img case-slider__img" /><motion.div class="case-slider__discr"${CB}><p class="case-slider__text sites-slider__text"${CB}>${escHtml(text)}</p></motion.div></motion.div>`,
    )
    .join("");
  return `<motion.div class="marketing-sites-slider sites-slider"${CB}>
      <motion.div class="swiper-container marketing-sites-slider__host"${CB}>
        <motion.div class="swiper-wrapper"${CB}>${slidesHtml}</motion.div>
        <motion.div class="swiper-pagination"${CB}></motion.div>
        <button type="button" class="swiper-button-prev swiper-arrow" aria-label="Предыдущий слайд"${CB}>${CM_WIDE_ARROW_PREV}</button>
        <button type="button" class="swiper-button-next swiper-arrow" aria-label="Следующий слайд"${CB}>${CM_WIDE_ARROW_NEXT}</button>
      </motion.div>
    </motion.div>`;
}

/** Prod: h3 «Увеличение известности бренда» + h3 «Сайт» до h2 «Измеримое продвижение». */
function buildPrePromotionSection($, $promoSec) {
  if (!$promoSec.length) return "";

  const awarenessHead = parseSectionInfoHeader($, $promoSec.children().eq(0));
  if (SECTION_LINKS[awarenessHead.title]) {
    awarenessHead.href = SECTION_LINKS[awarenessHead.title];
  }

  const $awarenessGrid = $("<motion.div></motion.div>");
  $awarenessGrid.append($promoSec.children().eq(1).clone());
  const awarenessCards = collectCardsFromSlice($, $awarenessGrid);

  const siteHead = parseSectionInfoHeader($, $promoSec.children().eq(2));
  if (SECTION_LINKS[siteHead.title]) {
    siteHead.href = SECTION_LINKS[siteHead.title];
  }

  const $siteGrid = $("<motion.div></motion.div>");
  $siteGrid.append($promoSec.children().eq(3).clone());
  const siteCards = collectCardsFromSlice($, $siteGrid);

  const sitesSlides = extractSitesSlides($, $promoSec.children().eq(4));

  return buildPrePromotionSectionHtml([
    { subhead: awarenessHead, cards: awarenessCards },
    { subhead: siteHead, cards: siteCards, sitesSlider: sitesSlides },
  ]);
}

function buildPrePromotionSectionHtml(groups) {
  let body = "";
  const tabletCards = [];
  for (const group of groups) {
    if (group.subhead?.title) {
      body += buildSubheadHtml(group.subhead, group.subheadClass || "");
    }
    if (group.cards?.length) {
      body += `<motion.div class="content-block__grid content-block__grid--desc blocks marketing-section__grid"${CB}>${buildCardsGridHtml(group.cards)}</motion.div>`;
      tabletCards.push(...group.cards);
    }
    if (group.sitesSlider?.length) {
      body += buildSitesSliderHtml(group.sitesSlider);
    }
  }
  const tabletHtml = tabletCards.length
    ? `<motion.div class="content-block__grid content-block__grid--tablet blocks"${CB}><motion.div class="col-4 content-block__grid-wrapper"${CB}>${buildTabletGridHtml(tabletCards)}</motion.div></motion.div>`
    : "";

  return `<section class="page-constructor__section marketing-kontekst-section marketing-pre-promotion-section">
  <motion.div class="modern content-block"${CB}>
    <motion.div class="page__container"${CB}>
      ${body}
      ${tabletHtml}
    </motion.div>
  </motion.div>
</section>`;
}

/** Prod: section.cm-wide-slider между row «Cтратегия/Бренд» и «Измеримое продвижение» (cm-slide*.jpg). */
function buildWideSliderSection($) {
  const wide = $(".cm-wide-slider").first();
  if (!wide.length) return "";

  const slides = [];
  const seen = new Set();
  wide.find(".swiper-slide").each((_, el) => {
    const idx = $(el).attr("data-swiper-slide-index");
    if (idx === undefined || seen.has(idx)) return;
    seen.add(idx);
    const src = mapCmSrc($(el).find("img").attr("src"));
    if (!src) return;
    slides.push({ idx: Number(idx), src });
  });
  slides.sort((a, b) => a.idx - b.idx);
  if (!slides.length) return "";

  const slidesHtml = slides
    .map(
      ({ src }) =>
        `<motion.div class="swiper-slide case-slider__item"${CB}><img src="${escHtml(src)}" alt="" loading="lazy" draggable="false" class="case-slider__img" /></motion.div>`,
    )
    .join("");

  return `<section class="page-constructor__section marketing-cm-wide-section">
  <motion.div class="marketing-cm-wide-slider cm-wide-slider"${CB}>
    <motion.div class="slider-full-width"${CB}>
      <motion.div class="swiper-container marketing-cm-wide-slider__host"${CB}>
        <motion.div class="swiper-wrapper"${CB}>${slidesHtml}</motion.div>
        <motion.div class="swiper-pagination"${CB}></motion.div>
        <button type="button" class="swiper-button-prev swiper-arrow" aria-label="Предыдущий слайд"${CB}>${CM_WIDE_ARROW_PREV}</button>
        <button type="button" class="swiper-button-next swiper-arrow" aria-label="Следующий слайд"${CB}>${CM_WIDE_ARROW_NEXT}</button>
      </motion.div>
    </motion.div>
  </motion.div>
</section>`;
}

function buildCmSliderHtml(slides) {
  if (!slides.length) return "";
  const tripled = [...slides, ...slides, ...slides];
  const slideHtml = tripled
    .map((src, i) => {
      const idx = i % slides.length;
      return `<div class="swiper-slide clients-new__slide marketing-cm-strip__slide" data-swiper-slide-index="${idx}" style="margin-right:60px"><img src="${escHtml(src)}" alt="" loading="lazy" decoding="async"></div>`;
    })
    .join("");
  return `<motion.div class="marketing-cm-strip clients-wrapper clients-mainstr"${CB}>
      <motion.div class="swiper-container swiper-container-horizontal swiper-container-free-mode swiper-container-clients-new marketing-cm-strip__host"${CB}>
        <motion.div class="swiper-wrapper clients-new__context-wrapper"${CB}>${slideHtml}</motion.div>
      </motion.div>
    </motion.div>`;
}

function buildInnerH2Html(title, href, introSmall, introLarge = "") {
  return `<motion.div class="marketing-section__inner-header"${CB}>${buildDualColumnHeaderHtml({
    level: "h2",
    title,
    href,
    introSmall,
    introLarge,
    withBullet: true,
  })}</motion.div>`;
}

/** Несколько сеток и опциональный подзаголовок h3 — как на prod (.grid_three + вложенный блок). */
function buildGridsHtml(groups) {
  let descHtml = "";
  const tabletCards = [];
  for (const group of groups) {
    if (group.subhead) {
      descHtml += buildSubheadHtml(group.subhead, group.subheadClass || "");
    }
    if (group.slider?.length) {
      descHtml += buildCmSliderHtml(group.slider);
    }
    if (group.cards?.length) {
      descHtml += `<motion.div class="content-block__grid content-block__grid--desc blocks marketing-section__grid"${CB}>${buildCardsGridHtml(group.cards)}</motion.div>`;
      tabletCards.push(...group.cards);
    }
  }
  const tabletHtml = tabletCards.length
    ? `<motion.div class="content-block__grid content-block__grid--tablet blocks"${CB}><motion.div class="col-4 content-block__grid-wrapper"${CB}>${buildTabletGridHtml(tabletCards)}</motion.div></motion.div>`
    : "";
  return descHtml + tabletHtml;
}

function blockSection(title, href, introSmall, introLarge, cards, outro) {
  return blockSectionWithGroups(title, href, introSmall, introLarge, cards.length ? [{ cards }] : [], outro);
}

function blockSectionWithGroups(title, href, introSmall, introLarge, groups, outro) {
  const gridsHtml = buildGridsHtml(groups);
  const outroHtml = outro
    ? `<p class="content-block__desc marketing-section__outro"${CB}>${escHtml(outro)}</p>`
    : "";

  return `${marketingSectionOpenTag("", title)}
  <motion.div class="modern content-block"${CB}>
    <motion.div class="page__container"${CB}>
      ${buildSectionHeaderHtml(title, href, introSmall, introLarge)}
      ${gridsHtml}
      ${outroHtml}
    </motion.div>
  </motion.div>
</section>`;
}

/** Prod row[0]: grid_three (3 карточки) + h3 «Бренд-стратегия» + ещё 3 карточки. */
function buildStrategySection($, row) {
  const $introWrap = $("<div></div>");
  $introWrap.append(row.children().eq(1).clone());
  const stratHeader = sectionHeaderFromSlice($, $introWrap, "Cтратегия");

  const $grid1 = $("<div></div>");
  $grid1.append(row.children().eq(2).clone());
  const cards1 = collectCardsFromSlice($, $grid1);

  const $nested = row.children().eq(4);
  const subHead = applySubheadLink(parseSectionInfoHeader($, $nested.find(".section-info").first()));

  const $grid2 = $("<div></div>");
  $grid2.append($nested.find(".section-info").eq(1).clone());
  const cards2 = collectCardsFromSlice($, $grid2);

  const $outroWrap = $("<div></div>");
  $outroWrap.append(row.children().eq(3).clone());
  const outro = sectionOutro($, $outroWrap);

  return blockSectionWithGroups(
    "Cтратегия",
    SECTION_LINKS["Cтратегия"],
    stratHeader.introSmall,
    stratHeader.introLarge,
    [
      { cards: cards1 },
      { subhead: subHead, cards: cards2 },
    ],
    outro,
  );
}

/** Prod: Контент-стратегия (h3 + 3 карточки + слайдер) → h2 Бренд + 3 карточки. */
function buildBrandSection($, row) {
  const brandSec = row.children(".service-section").last();
  if (!brandSec.length) {
    return blockSection("Бренд", SECTION_LINKS.Бренд, "", "", [], "");
  }

  const csHead = parseSectionInfoHeader($, brandSec.children().eq(0));

  const $csGrid = $("<div></div>");
  $csGrid.append(brandSec.children().eq(1).clone());
  const csCards = collectCardsFromSlice($, $csGrid);

  const slides = extractCmSlides($, brandSec.children().eq(2));

  const brandHeader = sectionHeaderFromSlice($, brandSec.children().eq(3), "Бренд");

  const $brandGrid = $("<div></div>");
  $brandGrid.append(brandSec.children().eq(4).clone());
  const brandCards = collectCardsFromSlice($, $brandGrid);

  const groups = [
    {
      subhead: csHead,
      subheadClass: "content-strategy",
      cards: csCards,
    },
    { slider: slides },
    {
      innerHeader: {
        title: "Бренд",
        href: SECTION_LINKS.Бренд,
        introSmall: brandHeader.introSmall,
        introLarge: brandHeader.introLarge,
      },
      cards: brandCards,
    },
  ];

  return buildBrandSectionHtml(groups);
}

function buildBrandSectionHtml(groups) {
  let body = "";
  const tabletCards = [];
  for (const group of groups) {
    if (group.subhead) {
      body += buildSubheadHtml(group.subhead, group.subheadClass || "");
    }
    if (group.slider?.length) {
      body += buildCmSliderHtml(group.slider);
    }
    if (group.innerHeader) {
      body += buildInnerH2Html(
        group.innerHeader.title,
        group.innerHeader.href,
        group.innerHeader.introSmall ?? group.innerHeader.intro ?? "",
        group.innerHeader.introLarge ?? "",
      );
    }
    if (group.cards?.length) {
      body += `<motion.div class="content-block__grid content-block__grid--desc blocks marketing-section__grid"${CB}>${buildCardsGridHtml(group.cards)}</motion.div>`;
      tabletCards.push(...group.cards);
    }
  }
  const tabletHtml = tabletCards.length
    ? `<motion.div class="content-block__grid content-block__grid--tablet blocks"${CB}><motion.div class="col-4 content-block__grid-wrapper"${CB}>${buildTabletGridHtml(tabletCards)}</motion.div></motion.div>`
    : "";

  return `${marketingSectionOpenTag("marketing-brand-section", "Бренд")}
  <motion.div class="modern content-block"${CB}>
    <motion.div class="page__container"${CB}>
      ${body}
      ${tabletHtml}
    </motion.div>
  </motion.div>
</section>`;
}

function dedupeCards(cards) {
  const seen = new Set();
  return cards.filter((c) => {
    const key = `${c.title}\0${c.href || ""}\0${c.body}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function pushCard(cards, { title, href, body }) {
  if (!title) return;
  cards.push({
    title,
    href: href || null,
    body: body ? escHtml(body) : "",
  });
}

function pushGridItems($, cards, $root) {
  const pushGi = ($gi) => {
    const title = innerText($, $gi.find("h4.title, h4").first());
    if (!title) return;
    const href = canonHref($gi.find("h4 a").attr("href"));
    let body = innerText($, $gi.find("p.small, p").first());
    pushCard(cards, { title, href, body });
  };
  $root.children(".grid__item").each((_, gi) => pushGi($(gi)));
  $root.children(".grid, .grid_two, .grid_three").each((_, grid) => {
    $(grid).children(".grid__item").each((__, gi) => pushGi($(gi)));
  });
}

/** Обход только прямых потомков среза — без глобального find(h4), иначе дубли. */
function processSliceChild($, cards, $node) {
  if ($node.hasClass("sites-slider") || $node.hasClass("cm-about")) return;

  if ($node.hasClass("service-section")) {
    $node.children().each((_, ch) => processSliceChild($, cards, $(ch)));
    return;
  }

  if ($node.hasClass("section-info")) {
    const $wrap = $node.find("> .section-info__title-wrap").first();
    const h3 = innerText($, $wrap.find("> h3").first());
    if (h3) {
      const href = canonHref($wrap.find("h3 a").attr("href"));
      let body = innerText($, $wrap.find("p.small").first());
      if (!body) body = innerText($, $node.find("> .section-info__discription p").first());
      pushCard(cards, { title: h3, href, body });
    }
    pushGridItems($, cards, $node);
    return;
  }

  if ($node.hasClass("cm-section") || $node.hasClass("cm-promotion")) {
    if ($node.children(".section-info").length) {
      $node.children().each((_, ch) => processSliceChild($, cards, $(ch)));
      return;
    }
    const h3 = innerText($, $node.children("h3").first());
    if (h3) {
      let body = innerText($, $node.children("p").first());
      if (!body) body = innerText($, $node.find("p.small").first());
      pushCard(cards, { title: h3, href: null, body });
    }
    pushGridItems($, cards, $node);
    return;
  }

  if ($node.hasClass("grid_three") || ($node.hasClass("grid") && $node.children(".grid__item").length)) {
    pushGridItems($, cards, $node);
  }
}

function collectCardsFromSlice($, $slice) {
  const cards = [];
  $slice.children().each((_, ch) => processSliceChild($, cards, $(ch)));
  return dedupeCards(cards);
}

/** Только .grid__item — без h3 заголовков подсекций. */
function collectCardsFromGridOnly($, $slice) {
  const cards = [];
  $slice.find(".grid__item").each((_, gi) => {
    const $gi = $(gi);
    const title = innerText($, $gi.find("h4.title, h4").first());
    if (!title) return;
    const href = canonHref($gi.find("h4 a").attr("href"));
    let body = innerText($, $gi.find("p.small, p").first());
    pushCard(cards, { title, href, body });
  });
  return dedupeCards(cards);
}

function applySubheadLink(subhead) {
  if (!subhead?.title) return subhead;
  if (subhead.title === "Контент-маркетинг") {
    subhead.href = "/services/content";
  } else if (SECTION_LINKS[subhead.title]) {
    subhead.href = SECTION_LINKS[subhead.title];
  }
  return subhead;
}

function buildPromotionGraphBlockHtml(graphSrc, cards) {
  const gridHtml = cards.length
    ? `<motion.div class="content-block__grid content-block__grid--desc blocks marketing-section__grid marketing-promotion-graph-grid"${CB}>${buildCardsGridHtml(cards)}</motion.div>`
    : "";
  const graphHtml = graphSrc
    ? `<img src="${escHtml(graphSrc)}" alt="" loading="lazy" class="cm-promotion__graph"${CB} />`
    : "";
  return `<motion.div class="marketing-promotion-graph-wrap cm-promotion cm-section"${CB}>
      ${graphHtml}
      ${gridHtml}
    </motion.div>`;
}

/** Prod: cm-promotion (h2 + 3 карточки + график + outro) + cm-section «Реклама» / «Инструменты» / «Контент-маркетинг». */
function buildPromotionSection($, $row) {
  const $sec = $row.children(".service-section").first();
  const $main = $sec.children().eq(5);
  if (!$main.length || !$main.hasClass("cm-promotion")) {
    return blockSection("Измеримое продвижение", SECTION_LINKS["Измеримое продвижение"], "", "", [], "");
  }

  const $cap = $main.find(".cm-promotion__caption").first();
  const introSmall = innerText($, $cap.find("p").first());
  const outro = sectionOutro($, $main);
  const $graphGrid = $main.find(".section-info.grid_three, .section-info.grid").first();
  const topCards = collectCardsFromGridOnly($, $graphGrid);
  const graphSrc = mapCmSrc($main.find(".cm-promotion__graph").attr("src"));

  let body = buildSectionHeaderHtml(
    "Измеримое продвижение",
    SECTION_LINKS["Измеримое продвижение"],
    introSmall,
    "",
  );
  body += buildPromotionGraphBlockHtml(graphSrc, topCards);

  const tabletCards = [...topCards];
  for (let i = 6; i <= 8; i += 1) {
    const $ch = $sec.children().eq(i);
    if (!$ch.hasClass("cm-section")) continue;
    const $info = $ch.children(".section-info").first();
    if (!$info.length) continue;
    const subhead = applySubheadLink(parseSectionInfoHeader($, $info));
    const $gridSlice = $("<motion.div></motion.div>");
    $ch.children().each((_, child) => {
      const $child = $(child);
      if ($child.find(".grid__item").length) $gridSlice.append($child.clone());
    });
    const cards = collectCardsFromGridOnly($, $gridSlice);
    body += buildSubheadHtml(subhead);
    if (cards.length) {
      body += `<motion.div class="content-block__grid content-block__grid--desc blocks marketing-section__grid"${CB}>${buildCardsGridHtml(cards)}</motion.div>`;
      tabletCards.push(...cards);
    }
  }

  const outroHtml = outro
    ? `<p class="content-block__desc marketing-section__outro"${CB}>${escHtml(outro)}</p>`
    : "";
  const tabletHtml = tabletCards.length
    ? `<motion.div class="content-block__grid content-block__grid--tablet blocks"${CB}><motion.div class="col-4 content-block__grid-wrapper"${CB}>${buildTabletGridHtml(tabletCards)}</motion.div></motion.div>`
    : "";

  return `${marketingSectionOpenTag("marketing-promotion-section", "Измеримое продвижение")}
  <motion.div class="modern content-block"${CB}>
    <motion.div class="page__container"${CB}>
      ${body}
      ${outroHtml}
      ${tabletHtml}
    </motion.div>
  </motion.div>
</section>`;
}

/** Prod .cm-sales: h2 + intro → sales.png → grid_two (4 карточки) → outro. */
function buildSalesSection($, $salesSlice) {
  if (!$salesSlice.children().length) {
    return blockSection("Продажи", SECTION_LINKS.Продажи, "", "", [], "");
  }
  const salesHdr = sectionHeaderFromSlice($, $salesSlice, "Продажи");
  const cards = collectCardsFromSlice($, $salesSlice);
  const salesSrc = mapCmSrc($salesSlice.find(".sales-figure__img, .sales-figure img").first().attr("src"));
  const outro = sectionOutro($, $salesSlice);

  const figureHtml = salesSrc
    ? `<motion.div class="marketing-sales-figure sales-figure"${CB}><img src="${escHtml(salesSrc)}" alt="" loading="lazy" class="sales-figure__img"${CB} /></motion.div>`
    : "";

  const gridsHtml = cards.length
    ? `<motion.div class="content-block__grid content-block__grid--desc blocks marketing-section__grid marketing-sales-grid"${CB}>${buildSalesCardsGridHtml(cards)}</motion.div>`
    : "";
  const tabletHtml = cards.length
    ? `<motion.div class="content-block__grid content-block__grid--tablet blocks"${CB}><motion.div class="col-4 content-block__grid-wrapper"${CB}>${buildTabletGridHtml(cards)}</motion.div></motion.div>`
    : "";
  const outroHtml = outro
    ? `<p class="content-block__desc marketing-section__outro"${CB}>${escHtml(outro)}</p>`
    : "";

  return `${marketingSectionOpenTag("marketing-sales-section", "Продажи")}
  <motion.div class="modern content-block"${CB}>
    <motion.div class="page__container"${CB}>
      ${buildSectionHeaderHtml(
        "Продажи",
        SECTION_LINKS.Продажи,
        salesHdr.introSmall,
        salesHdr.introLarge,
      )}
      ${figureHtml}
      ${gridsHtml}
      ${outroHtml}
      ${tabletHtml}
    </motion.div>
  </motion.div>
</section>`;
}

function sectionIntro($, $slice, title) {
  if (title) {
    const $directH2 = $slice
      .children(".section-info")
      .filter((_, el) => innerText($, $(el).children("h2.h2.title, h2.title").first()) === title)
      .first();
    if ($directH2.length) return "";

    const $wrap = $slice
      .find(".section-info__title-wrap")
      .filter((_, el) => {
        const heading = innerText($, $(el).find("h2, h3").first());
        return heading === title;
      })
      .first();
    if ($wrap.length) return innerText($, $wrap.find("p").first());
    const $cm = $slice
      .find(".cm-section, .cm-promotion")
      .filter((_, el) => innerText($, $(el).find("h2").first()) === title)
      .first();
    if ($cm.length) return innerText($, $cm.find("p").first());
    const $cap = $slice
      .find(".cm-promotion__caption")
      .filter((_, el) => innerText($, $(el).find("h2").first()) === title)
      .first();
    if ($cap.length) return innerText($, $cap.find("p").first());
  }
  return innerText($, $slice.find(".section-info__title-wrap > p").first());
}

function sectionOutro($, $slice) {
  return innerText($, $slice.find(".service-section__result p").first());
}

function rowSectionH2($, $ch) {
  if (!$ch.hasClass("section-info")) return "";
  return innerText($, $ch.find("> .section-info__title-wrap > h2.title, > .section-info__title-wrap > h2.h2.title").first());
}

function serviceSectionContainsH2($, $sec, title) {
  return (
    $sec.find(".section-info__title-wrap > h2").filter((_, el) => innerText($, el) === title).length > 0
  );
}

function sliceRow1Parts($, $row) {
  const $sec = $row.children(".service-section").first();
  const channels = $("<div></div>");
  const seo = $("<div></div>");
  const sales = $("<div></div>");
  if (!$sec.length) return { channels, seo, sales };
  $sec.children().each((i, child) => {
    const $ch = $(child);
    if ($ch.hasClass("service-section")) {
      const h2 = innerText(
        $,
        $ch
          .find(
            ".section-info__title-wrap > h2, .cm-promotion__caption > h2, > .section-info > h2.title, h2.h2.title",
          )
          .first(),
      );
      if (h2 === "SEO") seo.append($ch.clone());
      if (h2 === "Продажи") sales.append($ch.clone());
      return;
    }
    if (i >= 10 && i <= 11) channels.append($ch.clone());
  });
  return { channels, seo, sales };
}

function prodPromotionCards($, row) {
  const $sec = $row.children(".service-section").first();
  const cards = [];
  for (let i = 5; i <= 8; i += 1) {
    const $slice = $("<motion.div></motion.div>");
    $slice.append($sec.children().eq(i).clone());
    cards.push(...collectCardsFromGridOnly($, $slice));
  }
  return cards;
}

function sliceBrandSection($, row) {
  const $slice = $("<div></div>");
  const $brandSec = row.children(".service-section").last();
  if (!$brandSec.length) return $slice;
  $brandSec.children().each((_, ch) => {
    const $ch = $(ch);
    if ($ch.find(".cm-swiper").length && !$ch.find("h3, h4").length) return;
    $slice.append($ch.clone());
  });
  return $slice;
}

function sliceRowChildren($, row, startTitle, endTitle) {
  const $slice = $("<div></div>");
  let capture = false;
  $(row)
    .children()
    .each((_, child) => {
      const $ch = $(child);
      if ($ch.hasClass("cm-about")) return;
      if (endTitle && $ch.hasClass("service-section") && serviceSectionContainsH2($, $ch, endTitle)) {
        return false;
      }
      const h2t = rowSectionH2($, $ch);
      if (h2t === startTitle) capture = true;
      if (!capture) return;
      if (endTitle && h2t === endTitle) return false;
      $slice.append($ch.clone());
    });
  return $slice;
}

function sliceStrategySection($, row) {
  const $slice = $("<div></div>");
  let capture = false;
  $(row)
    .children()
    .each((_, child) => {
      const $ch = $(child);
      if ($ch.hasClass("cm-about")) return;
      const h2t = rowSectionH2($, $ch);
      if (h2t === "Cтратегия") capture = true;
      if (!capture) return;
      if ($ch.hasClass("service-section")) {
        if (serviceSectionContainsH2($, $ch, "Бренд")) return false;
        $ch.children().each((__, sub) => $slice.append($(sub).clone()));
        return;
      }
      if (h2t === "Бренд") return false;
      $slice.append($ch.clone());
    });
  return $slice;
}

function buildAboutDiagramSection() {
  if (!fs.existsSync(diagramPartialPath)) {
    console.error("Нет", diagramPartialPath);
    return "";
  }
  return fs.readFileSync(diagramPartialPath, "utf8");
}

function expandShowMore(html) {
  let s = html;
  s = s.replace(/<p class="show-more"[^>]*>Подробнее<\/p>\s*/gi, "");
  s = s.replace(/\sclass="([^"]*)\bhide\b([^"]*)"/gi, (m, a, b) => {
    const cls = `${a}${b}`.replace(/\s+/g, " ").trim();
    return cls ? ` class="${cls}"` : "";
  });
  s = s.replace(/\sclass="hide"/gi, "");
  return s;
}

function main() {
  if (!fs.existsSync(capturePath)) {
    console.error("Нет", capturePath);
    process.exit(1);
  }
  const raw = expandShowMore(fs.readFileSync(capturePath, "utf8"));
  const $ = cheerio.load(raw, { decodeEntities: false });

  const parts = [buildAboutDiagramSection()];
  const rows = $(".cm-page .row").toArray().map((el) => $(el));

  if (rows[0]) {
    parts.push(buildStrategySection($, rows[0]));

    parts.push(buildBrandSection($, rows[0]));
    parts.push(buildWideSliderSection($));
  }

  if (rows[1]) {
    const $promoSec = rows[1].children(".service-section").first();
    parts.push(buildPrePromotionSection($, $promoSec));

    parts.push(buildPromotionSection($, rows[1]));

    const { channels, seo, sales } = sliceRow1Parts($, rows[1]);
    const channelsHdr = sectionHeaderFromSlice($, channels, "Каналы контент-маркетинга");
    parts.push(
      blockSection(
        "Каналы контент-маркетинга",
        null,
        channelsHdr.introSmall,
        channelsHdr.introLarge,
        collectCardsFromSlice($, channels),
        sectionOutro($, channels),
      ),
    );
    const seoHdr = sectionHeaderFromSlice($, seo, "SEO");
    parts.push(
      blockSection(
        "SEO",
        SECTION_LINKS.SEO,
        seoHdr.introSmall,
        seoHdr.introLarge,
        collectCardsFromSlice($, seo),
        "",
      ),
    );
    parts.push(buildSalesSection($, sales));
  }

  let html = parts
    .filter(Boolean)
    .join("\n")
    .replace(/<motion\.motion.div/g, "<motion.div")
    .replace(/<\/motion\.motion.div>/g, "</motion.div>");
  html = rewriteHtml(html);
  html = html.replace(/<motion\.div/g, "<div").replace(/<\/motion.div>/g, "</div>");
  const typo = processTypographyHtml(html, { force: true });
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `${typo.html.trim()}\n`, "utf8");
  console.log("wrote", outPath);
}

main();

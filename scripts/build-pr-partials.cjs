#!/usr/bin/env node
/**
 * Генерация html/partials/services/pr-*.html из json/services/pr/legacy-content.json
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const partialsDir = path.join(root, "html", "partials", "services");
const legacy = JSON.parse(
  fs.readFileSync(path.join(root, "json", "services", "pr", "legacy-content.json"), "utf8"),
);
const content = legacy.content;
const imgBase = "/_sa/img/services/pr";

function strategyFigureSrc(media) {
  if (!media) return "";
  if (media.startsWith("/")) return media;
  const file =
    media === "R4hEcrEhw2nVVsDO9gz7xE6JAAOU3TiehbkEk3JU.png" ? "illustration.png" : media;
  return `${imgBase}/strategy/${file}`;
}

function esc(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function legacyDesc(s) {
  let t = esc(String(s || "").replace(/\\n/g, "\n"));
  t = t.replace(/&lt;br&gt;/gi, "<br>");
  return t
    .replace(/\s+—\s+/g, "&nbsp;— ")
    .replace(/\s+и\s+/g, "&nbsp;и ")
    .replace(/ PR /g, " PR&nbsp;");
}

function nbspText(s) {
  return legacyDesc(s).replace(/\n/g, " ");
}

function blockDesc(s) {
  const t = legacyDesc(s);
  if (t.includes("<br>")) {
    return t.replace(/<br>\s*<br>/g, "</p><p class=\"block__description\">");
  }
  return t;
}

function flattenContentBlocks(blocks) {
  const cols = (blocks || []).filter((col) => col.some((it) => it && it.title));
  const figureMedia = (blocks || []).flat().find((it) => it && it.media && !it.title)?.media || "";
  if (!cols.length) return { items: [], figureMedia };
  if (cols.length === 1 || cols.every((c) => c.filter((it) => it?.title).length <= 1)) {
    return { items: cols.flat().filter((it) => it && it.title), figureMedia };
  }
  const maxRows = Math.max(...cols.map((c) => c.length));
  const items = [];
  for (let r = 0; r < maxRows; r++) {
    for (const col of cols) {
      if (col[r]?.title) items.push(col[r]);
    }
  }
  return { items, figureMedia };
}

function blockItemInner(name, desc) {
  const d = blockDesc(desc);
  return `<div data-v-4ed7dc78="" class="col-4 col-sm-12 block-item">
            <div data-v-4ed7dc78="" class="block__name-wrapper">
              <h3 data-v-4ed7dc78="" class="block__name">${nbspText(name)}</h3>
            </div>
            <p data-v-4ed7dc78="" class="block__description">${d}</p>
          </div>`;
}

function blockItem(name, desc) {
  return `<div data-v-4ed7dc78="" class="col-4">
          ${blockItemInner(name, desc)}
        </div>`;
}

function descCustomFigureItem(src) {
  return `<div data-v-4ed7dc78="" class="col-4 col-sm-12 block-item pr-strategy-illustration-item">
            <figure data-v-4ed7dc78="" class="block-item__figure">
              <img data-v-4ed7dc78="" src="${src}" alt="" loading="lazy" class="block-item__figure-img" width="496" height="496">
            </figure>
          </div>`;
}

function descCustomColumnHtml(col) {
  return (col || [])
    .filter((it) => it && (it.title || it.media))
    .map((it) => {
      if (it.media && !it.title) {
        return descCustomFigureItem(strategyFigureSrc(it.media));
      }
      return blockItemInner(it.title, it.description);
    })
    .join("\n          ");
}

function descCustomGrid(blocks) {
  const cols = (blocks || []).filter((col) => col.some((it) => it && (it.title || it.media)));
  if (!cols.length) return "";
  return `<div data-v-4ed7dc78="" class="content-block__grid content-block__grid--desc blocks content-block__number-container content-block__grid--desc-custom pr-content-grid">
        ${cols
          .map(
            (col) => `<div data-v-4ed7dc78="" class="col-4">
          ${descCustomColumnHtml(col)}
        </div>`,
          )
          .join("\n        ")}
      </div>`;
}

function tabletBlockItem(name, desc) {
  return `<div data-v-4ed7dc78="" class="col-4 col-sm-12 block-item">
            <h3 data-v-4ed7dc78="" class="block__name">${nbspText(name)}</h3>
            <p data-v-4ed7dc78="" class="block__description">${blockDesc(desc)}</p>
          </div>`;
}

function contentBlockSection({
  marker,
  sectionClass,
  title,
  number,
  description,
  items,
  blocks,
  figure,
  titleLarge,
  layout,
}) {
  const bullet = number
    ? `<div data-v-490c7534="" class="numbered-header__bullet">${number}</div>`
    : `<div data-v-490c7534="" class="numbered-header__bullet"></div>`;
  const headerClass = number ? "numbered-header title-large" : "numbered-header title-large number-header__empty";
  const subtitleCol = description
    ? `<div data-v-490c7534="" class="col-6 col-md-12 numbered-header__subtitle-column">
            <p data-v-4ed7dc78="" data-v-490c7534="" class="content-block__desc">${legacyDesc(description)}</p>
          </div>`
    : "";

  const flattened = blocks ? flattenContentBlocks(blocks) : { items: items || [], figureMedia: "" };
  const figureSrc =
    figure ||
    (flattened.figureMedia ? strategyFigureSrc(flattened.figureMedia) : "");

  const gridClassExtra =
    layout === "impl-row"
      ? " pr-implementation-grid"
      : titleLarge
        ? " pr-content-grid--title-large"
        : "";

  const figureCol = figureSrc
    ? `<div data-v-4ed7dc78="" class="col-4">
          <div data-v-4ed7dc78="" class="col-4 col-sm-12 block-item pr-strategy-illustration-item">
            <figure data-v-4ed7dc78="" class="block-item__figure">
              <img data-v-4ed7dc78="" src="${figureSrc}" alt="" loading="lazy" class="block-item__figure-img" width="496" height="496">
            </figure>
          </div>
        </div>`
    : "";

  const figureTablet = figureSrc
    ? `<div data-v-4ed7dc78="" class="col-4 col-sm-12 block-item pr-strategy-illustration-item">
            <figure data-v-4ed7dc78="" class="block-item__figure">
              <img data-v-4ed7dc78="" src="${figureSrc}" alt="" loading="lazy" class="block-item__figure-img" width="496" height="496">
            </figure>
          </div>`
    : "";

  const flatItems = flattened.items;
  const descGrid =
    layout === "desc-custom" && blocks
      ? descCustomGrid(blocks)
      : flatItems.length
        ? `<div data-v-4ed7dc78="" class="content-block__grid content-block__grid--desc blocks pr-content-grid${gridClassExtra}">
        ${flatItems.map((it) => blockItem(it.title, it.description)).join("\n        ")}
        ${figureCol}
      </div>`
        : figureCol
          ? `<div data-v-4ed7dc78="" class="content-block__grid content-block__grid--desc blocks pr-content-grid">
        ${figureCol}
      </div>`
          : "";

  const tabletSource =
    layout === "desc-custom" && blocks
      ? blocks.flat().filter((it) => it && (it.title || it.media))
      : flatItems;
  const tabletItems = tabletSource
    .filter((it) => it.title)
    .map((it) => tabletBlockItem(it.title, it.description))
    .join("\n          ");
  const tabletFigure =
    layout === "desc-custom" && blocks
      ? (() => {
          const media = blocks.flat().find((it) => it && it.media && !it.title)?.media;
          if (!media) return figureTablet;
          return descCustomFigureItem(strategyFigureSrc(media));
        })()
      : figureTablet;
  const tabletGrid = tabletSource.length || tabletFigure
    ? `<div data-v-4ed7dc78="" class="content-block__grid content-block__grid--tablet blocks pr-content-grid--tablet">
        <div data-v-4ed7dc78="" class="col-4 content-block__grid-wrapper">
          ${tabletItems}
          ${tabletFigure}
        </div>
      </div>`
    : "";

  return `<!-- ${marker}-START -->
<section class="page-constructor__section ${sectionClass}">
  <div data-v-4ed7dc78="" class="modern content-block">
    <div data-v-4ed7dc78="" class="page__container">
      <div data-v-490c7534="" data-v-4ed7dc78="" class="${headerClass}">
        <div data-v-490c7534="" class="row">
          <div data-v-490c7534="" class="col-6 col-md-12 numbered-header__title-column">
            ${bullet}
            <div data-v-490c7534="" class="numbered-header__title">
              <h2 data-v-490c7534="">${nbspText(title)}</h2>
              <h4 data-v-490c7534="" style="display: none;"></h4>
            </div>
          </div>
          ${subtitleCol}
        </div>
      </div>
      ${descGrid}
      ${tabletGrid}
    </div>
  </div>
</section>
<!-- ${marker}-END -->`;
}

function caseSlide(slug, { name, subtitle, description, slideImg, bgImg, href, video, bigFont }) {
  const titleClass = bigFont ? " cases-block__swiper-slide-title_big" : "";
  const media = video
    ? `<video data-v-bd2e570a="" class="pr-case-video" autoplay="autoplay" muted="muted" loop="loop" webkit-playsinline="true" playsinline="true" preload="none" src="${video}"></video>`
    : `<img data-v-bd2e570a="" src="${slideImg}" alt="${esc(name)}" loading="lazy" class="cases-block__swiper-slide-contant-image">`;
  const btn = href
    ? `<a data-v-7f5f1051="" data-v-bd2e570a="" href="${href}" class="buttonlink cases-block__swiper-slide-button">
                  <div data-v-7f5f1051="" class="buttonlink__content">
                    <div data-v-bd2e570a="" data-v-7f5f1051="">
                      Смотреть кейс
                      <svg data-v-bd2e570a="" xmlns="http://www.w3.org/2000/svg" width="16" height="13" viewBox="0 0 16 13" fill="none" data-v-7f5f1051="" aria-hidden="true"><path d="M1 6.5H15M15 6.5L9.4 1M15 6.5L9.4 12" stroke="white" stroke-linecap="round" stroke-linejoin="round"></path></svg>
                    </div>
                  </div>
                  <div data-v-7f5f1051="" class="buttonlink__backplate"></div>
                </a>`
    : "";

  return `<div data-v-bd2e570a="" class="swiper-slide cases-block__swiper-slide swiper-slide-pr-${slug} cases-block__swiper-slide--pr-${slug}">
            <div data-v-bd2e570a="" class="background" style="background-image: url(&quot;${bgImg}&quot;);"></div>
            <div data-v-bd2e570a="" class="cases-block__swiper-slide-tags-wrapper cases-block__swiper-slide-tags-wrapper_hidden">
              <div data-v-bd2e570a="" class="cases-block__swiper-slide-tags"></div>
            </div>
            <div data-v-bd2e570a="" class="cases-block__swiper-slide-contant">
              <div data-v-bd2e570a="" class="old">${media}</div>
            </div>
            <div data-v-bd2e570a="" class="cases-block__swiper-slide-text-contant">
              <div data-v-bd2e570a="" class="cases-block__swiper-slide-title-wrapper">
                <h3 data-v-bd2e570a="" class="cases-block__swiper-slide-title${titleClass}">${nbspText(name)}</h3>
                <p data-v-bd2e570a="" class="cases-block__swiper-slide-subtitle">${nbspText(subtitle)}</p>
              </div>
              <div data-v-bd2e570a="" class="cases-block__swiper-slide-button-wrapper">
                <p data-v-bd2e570a="" class="cases-block__swiper-slide-description">${nbspText(description)}</p>
                ${btn}
              </div>
            </div>
          </div>`;
}

const caseAssets = {
  "ИдетШоу": { slug: "idet-shou", bg: `${imgBase}/cases/idet-shou-bg.webp`, slide: `${imgBase}/cases/idet-shou-slide.webp` },
  Digitale: { slug: "digitale", bg: `${imgBase}/cases/digitale-bg.webp`, slide: `${imgBase}/cases/digitale-slide.webp` },
  "Urban Boris": { slug: "urban-boris", bg: `${imgBase}/cases/urban-boris-bg.webp`, slide: `${imgBase}/cases/urban-boris-slide.webp` },
  "Хэлп-центр": { slug: "help-center", bg: `${imgBase}/cases/help-center-bg.webp`, slide: `${imgBase}/cases/help-center-slide.webp` },
  "Gio Wellness": {
    slug: "gio-wellness",
    bg: `${imgBase}/cases/gio-wellness-bg.webp`,
    slide: `${imgBase}/cases/gio-wellness-bg.webp`,
    video: `${imgBase}/cases/gio-wellness-video.mp4`,
  },
  Osnova: { slug: "osnova", bg: `${imgBase}/cases/osnova-bg.webp`, slide: `${imgBase}/cases/osnova-slide.webp` },
};

function casesSlider(marker, sectionClass, swiperId, cases) {
  const slides = cases
    .map((c) => {
      const a = caseAssets[c.name] || {};
      const href = c.button_link ? c.button_link.replace("https://serenity.agency", "") : "";
      return caseSlide(a.slug || c.name.toLowerCase(), {
        name: c.name,
        subtitle: c.subtitle,
        description: c.description,
        slideImg: a.slide,
        bgImg: a.bg,
        href,
        video: a.video,
        bigFont: c.big_font === 1,
      });
    })
    .join("\n          ");

  return `<!-- ${marker}-START -->
<section class="page-constructor__section pr-cases-section uks-case-section ${sectionClass}">
  <div data-v-bd2e570a="" class="cases-block">
    <div data-v-bd2e570a="" class="cases-block__slider">
      <div data-v-bd2e570a="" id="swiper-container-${swiperId}" class="swiper-container cases-block__slider-swiper-container">
        <div data-v-bd2e570a="" class="swiper-wrapper cases-block__swiper-wrapper swiper-wrapper-${swiperId}">
          ${slides}
        </div>
      </div>
      <div data-v-bd2e570a="" class="swiper-pagination swiper-pagination-${swiperId} swiper-pagination-clickable swiper-pagination-bullets"></div>
      <div data-v-bd2e570a="" class="swiper__navigation">
        <button data-v-bd2e570a="" type="button" class="swiper-button-prev swiper-pagination-prev-${swiperId}" aria-label="Предыдущий слайд">
          <svg data-v-bd2e570a="" xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 42 42" fill="none" aria-hidden="true"><circle cx="21" cy="21" r="20.5" stroke="white"></circle><path d="M23 14L15.9289 21.0711L23 28.1421" stroke="white" stroke-linecap="round" stroke-linejoin="round"></path></svg>
        </button>
        <button data-v-bd2e570a="" type="button" class="swiper-button-next swiper-pagination-next-${swiperId}" aria-label="Следующий слайд">
          <svg data-v-bd2e570a="" xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 42 42" fill="none" style="transform: rotate(180deg)" aria-hidden="true"><circle cx="21" cy="21" r="20.5" stroke="white"></circle><path d="M23 14L15.9289 21.0711L23 28.1421" stroke="white" stroke-linecap="round" stroke-linejoin="round"></path></svg>
        </button>
      </div>
    </div>
  </div>
</section>
<!-- ${marker}-END -->`;
}

function write(name, body) {
  fs.writeFileSync(path.join(partialsDir, name), `${body.trim()}\n`, "utf8");
  console.log("partial", name);
}

function main() {
  const facts = content.find((b) => b.component === "facts-block").data;
  const factItems = facts.facts.desktop.columns[0].items;
  write(
    "pr-mission-facts-block.html",
    `<!-- PR-MISSION-FACTS-START -->
<section class="page-constructor__section pr-mission-facts-section">
  <div class="facts">
    <div class="page__container desktop">
      <div class="facts-header">
        <div class="col-6 page__title">
          <p class="title">${nbspText(facts.title)}</p>
        </div>
        <div class="description-item">
          <p class="lead">${nbspText(facts.description.main)}</p>
        </div>
      </div>
      <ul class="facts__items facts__items--desktop pr-mission-facts__items">
        ${factItems
          .map(
            (it) => `<li class="facts__item">
          <div class="facts__number">${it.number}</div>
          <p class="facts__text">${nbspText(it.text)}</p>
        </li>`,
          )
          .join("\n        ")}
      </ul>
    </div>
  </div>
</section>
<!-- PR-MISSION-FACTS-END -->`,
  );

  const approach = content.find((b) => b.data?.title?.content === "Наш подход");
  write(
    "pr-approach-block.html",
    contentBlockSection({
      marker: "PR-APPROACH",
      sectionClass: "pr-approach-section",
      title: approach.data.title.content,
      blocks: approach.data.blocks,
      titleLarge: approach.data.title.large,
    }),
  );

  const cases1 = content.filter((b) => b.component === "cases-block")[0].data;
  write("pr-cases-slider-1.html", casesSlider("PR-CASES-1", "pr-cases-slider-1-section", "pr-cases-1", cases1));

  const stages = content.find((b) => b.data?.title?.content === "Этапы PR-продвижения");
  const stagesTitle = String(stages.data.title.content || "").replace(
    /^Этапы\s+PR-продвижения$/i,
    "Этапы<br>PR-продвижения",
  );
  write(
    "pr-stages-block.html",
    contentBlockSection({
      marker: "PR-STAGES",
      sectionClass: "pr-stages-section",
      title: stagesTitle,
      description: stages.data.description,
      items: [],
    }),
  );

  const strategy = content.find((b) => b.data?.title?.content === "Разработка PR-стратегии");
  write(
    "pr-strategy-development-block.html",
    contentBlockSection({
      marker: "PR-STRATEGY-DEVELOPMENT",
      sectionClass: "pr-strategy-development-section",
      title: strategy.data.title.content,
      number: "1",
      blocks: strategy.data.blocks,
      layout: "desc-custom",
    }),
  );

  const impl = content.find((b) => b.data?.title?.content === "Внедрение PR-стратегии");
  write(
    "pr-strategy-implementation-block.html",
    contentBlockSection({
      marker: "PR-STRATEGY-IMPLEMENTATION",
      sectionClass: "pr-strategy-implementation-section",
      title: impl.data.title.content,
      number: "2",
      blocks: impl.data.blocks,
      layout: "desc-custom",
    }),
  );

  const cases2 = content.filter((b) => b.component === "cases-block")[1].data;
  write("pr-cases-slider-2.html", casesSlider("PR-CASES-2", "pr-cases-slider-2-section", "pr-cases-2", cases2));

  const whenPr = content.find((b) => b.data?.title?.content === "Когда PR необходим");
  write(
    "pr-when-necessary-block.html",
    contentBlockSection({
      marker: "PR-WHEN-NECESSARY",
      sectionClass: "pr-when-necessary-section",
      title: whenPr.data.title.content,
      blocks: whenPr.data.blocks,
    }),
  );

  const adv = content.find((b) => b.component === "advantages-block").data;
  const advIcons = ["icon-years.png", "icon-clients.png", "icon-rank.png"];
  write(
    "pr-advantages-block.html",
    `<!-- PR-ADVANTAGES-START -->
<section class="page-constructor__section pr-advantages-section">
  <div data-v-1e31df85="" class="advantage">
    <div data-v-1e31df85="" class="page__container">
      <div data-v-1aed48bd="" data-v-1e31df85="" class="advantages-card">
        <div data-v-1aed48bd="" class="advantages-card__header">
          <h2 data-v-1aed48bd="" class="advantages-card__title">Преимущества работы с&nbsp;нами</h2>
          <p data-v-1aed48bd="" class="advantages-card__description">${nbspText(adv.description)}</p>
        </div>
        <div data-v-1aed48bd="" class="advantages-card__content">
          <ul data-v-1aed48bd="" class="advantages-card__content-list">
            ${adv.advantages
              .map(
                (item, i) => `<li data-v-1aed48bd="" class="advantages-card__content-item">
              <div data-v-1aed48bd="" class="advantages-card__content-image">
                <img data-v-1aed48bd="" src="${imgBase}/advantages/${advIcons[i]}" alt="" loading="lazy" />
              </div>
              <div data-v-1aed48bd="" class="advantages-card__content-info">
                <h3 data-v-1aed48bd="" class="advantages-card__content-title">${item.title}</h3>
                <div data-v-1aed48bd="" class="advantages-card__content-text">${nbspText(item.description)}</div>
              </div>
            </li>`,
              )
              .join("\n            ")}
          </ul>
        </div>
      </div>
    </div>
  </div>
</section>
<!-- PR-ADVANTAGES-END -->`,
  );

  console.log("build-pr-partials: ok");
}

main();

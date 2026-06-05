/**
 * Третий слайд третьего cases-block (swiper-24ow7) на /korporativnyj_sajt — Foil.
 */
const FOIL_CASE_BG =
  "/_sa/img/services/korporativnyj_sajt/foil-case-slide.webp?v=20260605foil1080";

const FOIL_CASE_IMG =
  "/_sa/img/services/korporativnyj_sajt/foil-case-slide.webp?v=20260605foil1080";

const FOIL_CASE_HREF =
  "https://www.behance.net/gallery/138703289/biznes-klub-FOIL";

const FOIL_CASE_SUBTITLE = "Бизнес-клуб.";

const FOIL_CASE_DESC =
  "Сайт бизнес-клуба с&nbsp;уникальным дизайном и&nbsp;структурой под запросы целевой аудитории. Полное редактирование контента в&nbsp;Bitrix CMS. Срок реализации&nbsp;— 1&nbsp;месяц.";

const CASE_BUTTON_SVG = `<svg data-v-bd2e570a="" xmlns="http://www.w3.org/2000/svg" width="16" height="13" viewBox="0 0 16 13" fill="none" data-v-7f5f1051=""><path d="M1 6.5H15M15 6.5L9.4 1M15 6.5L9.4 12" stroke="white" stroke-linecap="round" stroke-linejoin="round"></path></svg>`;

function buildFoilThirdOw24SlideHtml(activeClass = "") {
  const bgEsc = FOIL_CASE_BG.replace(/"/g, "&quot;");
  const hrefEsc = FOIL_CASE_HREF.replace(/"/g, "&quot;");
  const active = activeClass ? ` ${activeClass}` : "";
  return `<div data-v-bd2e570a="" class="swiper-slide cases-block__swiper-slide cases-block__swiper-slide--foil swiper-slide-24ow7${active}" style="width: 1440px;"><div data-v-bd2e570a="" class="background" style="background-image: url(&quot;${bgEsc}&quot;);"></div> <div data-v-bd2e570a="" class="cases-block__swiper-slide-tags-wrapper cases-block__swiper-slide-tags-wrapper_hidden"><div data-v-bd2e570a="" class="cases-block__swiper-slide-tags"></div></div> <div data-v-bd2e570a="" class="cases-block__swiper-slide-contant"><div data-v-bd2e570a="" class="old"><img data-v-bd2e570a="" src="${FOIL_CASE_IMG}" alt="Foil — сайт бизнес-клуба" width="1920" height="1080" loading="lazy" class="cases-block__swiper-slide-contant-image"></div></div> <div data-v-bd2e570a="" class="cases-block__swiper-slide-text-contant"><div data-v-bd2e570a="" class="cases-block__swiper-slide-title-wrapper"><h3 data-v-bd2e570a="" class="cases-block__swiper-slide-title">Foil</h3> <p data-v-bd2e570a="" class="cases-block__swiper-slide-subtitle">${FOIL_CASE_SUBTITLE}</p></div> <div data-v-bd2e570a="" class="cases-block__swiper-slide-button-wrapper"><p data-v-bd2e570a="" class="cases-block__swiper-slide-description">${FOIL_CASE_DESC}</p> <a data-v-7f5f1051="" data-v-bd2e570a="" to="${hrefEsc}" href="${FOIL_CASE_HREF}" class="buttonlink cases-block__swiper-slide-button" target="_blank" rel="noopener noreferrer"><div data-v-7f5f1051="" class="buttonlink__content"><div data-v-bd2e570a="" data-v-7f5f1051="">
                                    Смотреть кейс
                                    ${CASE_BUTTON_SVG}</div></div> <div data-v-7f5f1051="" class="buttonlink__backplate" style="transform: translate3d(0px, 0px, 0px);"></div></a></div></div></div>`;
}

const { patchOw24CasesBlock, replaceOw24SlideAt } = require("./korporativnyj-24ow7-cases-common.cjs");

function patchKorporativnyjOw24ThirdSlideFoil(html) {
  return patchOw24CasesBlock(html, (chunk) =>
    replaceOw24SlideAt(chunk, 2, buildFoilThirdOw24SlideHtml),
  );
}

module.exports = {
  FOIL_CASE_BG,
  FOIL_CASE_IMG,
  FOIL_CASE_HREF,
  FOIL_CASE_SUBTITLE,
  FOIL_CASE_DESC,
  buildFoilThirdOw24SlideHtml,
  patchKorporativnyjOw24ThirdSlideFoil,
};

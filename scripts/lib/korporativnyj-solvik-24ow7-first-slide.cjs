/**
 * Первый слайд третьего cases-block (swiper-24ow7) на /korporativnyj_sajt — Solvik.
 */
const SOLVIK_CASE_BG =
  "/_sa/img/services/korporativnyj_sajt/solvik-bg.webp?v=20260605solvikBgCover";

const SOLVIK_CASE_IMG =
  "/_sa/img/services/korporativnyj_sajt/solvik-case-slide.webp?v=20260605solvik1080";

const SOLVIK_CASE_HREF = "/case/all/solvik";

const SOLVIK_CASE_SUBTITLE = "Автосервис для современной аудитории.";

const SOLVIK_CASE_DESC =
  "Личный кабинет с гаражом авто, историей ремонта и рекомендациями по диагностике и плановым работам на основе прошлых визитов. Кастомная CMS, каталог из данных API, буфер временных данных в БД, чтобы не перегружать API&nbsp;1С. Срок реализации — 4,5&nbsp;месяца.";

const CASE_BUTTON_SVG = `<svg data-v-bd2e570a="" xmlns="http://www.w3.org/2000/svg" width="16" height="13" viewBox="0 0 16 13" fill="none" data-v-7f5f1051=""><path d="M1 6.5H15M15 6.5L9.4 1M15 6.5L9.4 12" stroke="white" stroke-linecap="round" stroke-linejoin="round"></path></svg>`;

function buildSolvikFirstOw24SlideHtml(activeClass = "") {
  const bgEsc = SOLVIK_CASE_BG.replace(/"/g, "&quot;");
  const active = activeClass ? ` ${activeClass}` : "";
  return `<div data-v-bd2e570a="" class="swiper-slide cases-block__swiper-slide cases-block__swiper-slide--solvik swiper-slide-24ow7${active}" style="width: 1440px;"><div data-v-bd2e570a="" class="background" style="background-image: url(&quot;${bgEsc}&quot;);"></div> <div data-v-bd2e570a="" class="cases-block__swiper-slide-tags-wrapper cases-block__swiper-slide-tags-wrapper_hidden"><div data-v-bd2e570a="" class="cases-block__swiper-slide-tags"></div></div> <div data-v-bd2e570a="" class="cases-block__swiper-slide-contant"><div data-v-bd2e570a="" class="old cases-block__swiper-slide-contant-frame"><img data-v-bd2e570a="" src="${SOLVIK_CASE_IMG}" alt="Solvik — веб-сервис автосервиса" width="1920" height="1080" loading="lazy" class="cases-block__swiper-slide-contant-image"></div></div> <div data-v-bd2e570a="" class="cases-block__swiper-slide-text-contant"><div data-v-bd2e570a="" class="cases-block__swiper-slide-title-wrapper"><h3 data-v-bd2e570a="" class="cases-block__swiper-slide-title">Solvik</h3> <p data-v-bd2e570a="" class="cases-block__swiper-slide-subtitle">${SOLVIK_CASE_SUBTITLE}</p></div> <div data-v-bd2e570a="" class="cases-block__swiper-slide-button-wrapper"><p data-v-bd2e570a="" class="cases-block__swiper-slide-description">${SOLVIK_CASE_DESC}</p> <a data-v-7f5f1051="" data-v-bd2e570a="" to="https://serenity.agency/case/all/solvik" href="${SOLVIK_CASE_HREF}" class="buttonlink cases-block__swiper-slide-button"><div data-v-7f5f1051="" class="buttonlink__content"><div data-v-bd2e570a="" data-v-7f5f1051="">
                                    Смотреть кейс
                                    ${CASE_BUTTON_SVG}</div></div> <div data-v-7f5f1051="" class="buttonlink__backplate" style="transform: translate3d(0px, 0px, 0px);"></div></a></div></div></div>`;
}

const { patchOw24CasesBlock, replaceOw24SlideAt } = require("./korporativnyj-24ow7-cases-common.cjs");

function patchKorporativnyjOw24FirstSlideSolvik(html) {
  return patchOw24CasesBlock(html, (chunk) =>
    replaceOw24SlideAt(chunk, 0, buildSolvikFirstOw24SlideHtml),
  );
}

module.exports = {
  SOLVIK_CASE_BG,
  SOLVIK_CASE_IMG,
  SOLVIK_CASE_HREF,
  SOLVIK_CASE_SUBTITLE,
  SOLVIK_CASE_DESC,
  buildSolvikFirstOw24SlideHtml,
  patchKorporativnyjOw24FirstSlideSolvik,
};

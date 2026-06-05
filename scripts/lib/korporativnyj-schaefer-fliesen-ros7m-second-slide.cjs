/**
 * Второй слайд второго cases-block (swiper-ros7m) на /korporativnyj_sajt.
 */
const SCHAEFER_FLIESEN_CASE_IMG =
  "/_sa/img/services/korporativnyj_sajt/schaefer-fliesen-case-slide.webp?v=20260605schaefer1080";

const SCHAEFER_FLIESEN_CASE_HREF = "/case/all/schaeferfliesen";

const SCHAEFER_FLIESEN_CASE_SUBTITLE =
  "Дистрибьютор испанской напольной плитки на&nbsp;рынке Германии.";

const SCHAEFER_FLIESEN_CASE_DESC =
  "Сайт-каталог для дистрибуции коллекций плитки. Срок реализации&nbsp;— 3&nbsp;месяца: удобная навигация по&nbsp;ассортименту, структура для&nbsp;B2B-аудитории и&nbsp;гибкое управление контентом.";

const CASE_BUTTON_SVG = `<svg data-v-bd2e570a="" xmlns="http://www.w3.org/2000/svg" width="16" height="13" viewBox="0 0 16 13" fill="none" data-v-7f5f1051=""><path d="M1 6.5H15M15 6.5L9.4 1M15 6.5L9.4 12" stroke="white" stroke-linecap="round" stroke-linejoin="round"></path></svg>`;

function buildSchaeferFliesenSecondRos7mSlideHtml(activeClass = "") {
  const imgEsc = SCHAEFER_FLIESEN_CASE_IMG.replace(/"/g, "&quot;");
  const active = activeClass ? ` ${activeClass}` : "";
  return `<div data-v-bd2e570a="" class="swiper-slide cases-block__swiper-slide cases-block__swiper-slide--schaefer-fliesen swiper-slide-ros7m${active}" style="width: 1440px;"><div data-v-bd2e570a="" class="background" style="background-image: url(&quot;${imgEsc}&quot;);"></div> <div data-v-bd2e570a="" class="cases-block__swiper-slide-tags-wrapper cases-block__swiper-slide-tags-wrapper_hidden"><div data-v-bd2e570a="" class="cases-block__swiper-slide-tags"></div></div> <div data-v-bd2e570a="" class="cases-block__swiper-slide-contant"><div data-v-bd2e570a="" class="old"><img data-v-bd2e570a="" src="${SCHAEFER_FLIESEN_CASE_IMG}" alt="Schaefer Fliesen — сайт-каталог напольной плитки для рынка Германии" loading="lazy" class="cases-block__swiper-slide-contant-image"></div></div> <div data-v-bd2e570a="" class="cases-block__swiper-slide-text-contant"><div data-v-bd2e570a="" class="cases-block__swiper-slide-title-wrapper"><h3 data-v-bd2e570a="" class="cases-block__swiper-slide-title">Schaefer Fliesen</h3> <p data-v-bd2e570a="" class="cases-block__swiper-slide-subtitle">${SCHAEFER_FLIESEN_CASE_SUBTITLE}</p></div> <div data-v-bd2e570a="" class="cases-block__swiper-slide-button-wrapper"><p data-v-bd2e570a="" class="cases-block__swiper-slide-description">${SCHAEFER_FLIESEN_CASE_DESC}</p> <a data-v-7f5f1051="" data-v-bd2e570a="" to="https://serenity.agency/case/all/schaeferfliesen" href="${SCHAEFER_FLIESEN_CASE_HREF}" class="buttonlink cases-block__swiper-slide-button"><div data-v-7f5f1051="" class="buttonlink__content"><div data-v-bd2e570a="" data-v-7f5f1051="">
                                    Смотреть кейс
                                    ${CASE_BUTTON_SVG}</div></div> <div data-v-7f5f1051="" class="buttonlink__backplate" style="transform: translate3d(0px, 0px, 0px);"></div></a></div></div></div>`;
}

const { patchRos7mCasesBlock, replaceRos7mSlideAt } = require("./korporativnyj-ros7m-cases-common.cjs");

function patchKorporativnyjRos7mSecondSlideSchaeferFliesen(html) {
  return patchRos7mCasesBlock(html, (chunk) =>
    replaceRos7mSlideAt(chunk, 1, buildSchaeferFliesenSecondRos7mSlideHtml),
  );
}

module.exports = {
  SCHAEFER_FLIESEN_CASE_IMG,
  SCHAEFER_FLIESEN_CASE_HREF,
  SCHAEFER_FLIESEN_CASE_SUBTITLE,
  SCHAEFER_FLIESEN_CASE_DESC,
  buildSchaeferFliesenSecondRos7mSlideHtml,
  patchKorporativnyjRos7mSecondSlideSchaeferFliesen,
};

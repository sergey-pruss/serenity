/**
 * Первый слайд второго cases-block (swiper-ros7m) на /korporativnyj_sajt.
 */
const SYTNIE_UGODIYA_CASE_IMG =
  "/_sa/img/services/korporativnyj_sajt/sytnie-ugodiya-case-slide.webp?v=20260605sytnie1080";

const SYTNIE_UGODIYA_CASE_HREF = "/case/all/sytnie-ugodia";

const SYTNIE_UGODIYA_CASE_SUBTITLE = "Новый бренд мясной продукции.";

const SYTNIE_UGODIYA_CASE_DESC =
  "Запустили корпоративный сайт за&nbsp;3&nbsp;месяца на&nbsp;1С-Битрикс: гибкое редактирование контента, понятная структура разделов и&nbsp;удобная админка для&nbsp;маркетинговой команды.";

const CASE_BUTTON_SVG = `<svg data-v-bd2e570a="" xmlns="http://www.w3.org/2000/svg" width="16" height="13" viewBox="0 0 16 13" fill="none" data-v-7f5f1051=""><path d="M1 6.5H15M15 6.5L9.4 1M15 6.5L9.4 12" stroke="white" stroke-linecap="round" stroke-linejoin="round"></path></svg>`;

function buildSytnieUgodiyaFirstRos7mSlideHtml(activeClass = "") {
  const imgEsc = SYTNIE_UGODIYA_CASE_IMG.replace(/"/g, "&quot;");
  const hrefEsc = SYTNIE_UGODIYA_CASE_HREF.replace(/"/g, "&quot;");
  const active = activeClass ? ` ${activeClass}` : "";
  return `<div data-v-bd2e570a="" class="swiper-slide cases-block__swiper-slide cases-block__swiper-slide--sytnie-ugodiya swiper-slide-ros7m${active}" style="width: 1440px;"><div data-v-bd2e570a="" class="background" style="background-image: url(&quot;${imgEsc}&quot;);"></div> <div data-v-bd2e570a="" class="cases-block__swiper-slide-tags-wrapper cases-block__swiper-slide-tags-wrapper_hidden"><div data-v-bd2e570a="" class="cases-block__swiper-slide-tags"></div></div> <div data-v-bd2e570a="" class="cases-block__swiper-slide-contant"><div data-v-bd2e570a="" class="old"><img data-v-bd2e570a="" src="${SYTNIE_UGODIYA_CASE_IMG}" alt="Сытные угодья — сайт нового бренда мясной продукции" loading="lazy" class="cases-block__swiper-slide-contant-image"></div></div> <div data-v-bd2e570a="" class="cases-block__swiper-slide-text-contant"><div data-v-bd2e570a="" class="cases-block__swiper-slide-title-wrapper"><h3 data-v-bd2e570a="" class="cases-block__swiper-slide-title">Сытные угодья</h3> <p data-v-bd2e570a="" class="cases-block__swiper-slide-subtitle">${SYTNIE_UGODIYA_CASE_SUBTITLE}</p></div> <div data-v-bd2e570a="" class="cases-block__swiper-slide-button-wrapper"><p data-v-bd2e570a="" class="cases-block__swiper-slide-description">${SYTNIE_UGODIYA_CASE_DESC}</p> <a data-v-7f5f1051="" data-v-bd2e570a="" to="https://serenity.agency/case/all/sytnie-ugodia" href="${SYTNIE_UGODIYA_CASE_HREF}" class="buttonlink cases-block__swiper-slide-button"><div data-v-7f5f1051="" class="buttonlink__content"><div data-v-bd2e570a="" data-v-7f5f1051="">
                                    Смотреть кейс
                                    ${CASE_BUTTON_SVG}</div></div> <div data-v-7f5f1051="" class="buttonlink__backplate" style="transform: translate3d(0px, 0px, 0px);"></div></a></div></div></div>`;
}

const { patchRos7mCasesBlock, replaceRos7mSlideAt } = require("./korporativnyj-ros7m-cases-common.cjs");

function patchKorporativnyjRos7mFirstSlideSytnieUgodiya(html) {
  return patchRos7mCasesBlock(html, (chunk) =>
    replaceRos7mSlideAt(chunk, 0, buildSytnieUgodiyaFirstRos7mSlideHtml),
  );
}

module.exports = {
  SYTNIE_UGODIYA_CASE_IMG,
  SYTNIE_UGODIYA_CASE_HREF,
  SYTNIE_UGODIYA_CASE_SUBTITLE,
  SYTNIE_UGODIYA_CASE_DESC,
  buildSytnieUgodiyaFirstRos7mSlideHtml,
  patchKorporativnyjRos7mFirstSlideSytnieUgodiya,
};

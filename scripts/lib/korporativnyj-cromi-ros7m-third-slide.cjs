/**
 * Третий слайд второго cases-block (swiper-ros7m) на /korporativnyj_sajt — Cromi (prod parity).
 */
const CROMI_CASE_BG = "/_sa/img/storage__Y9cdMgA4dYggBFiq18lhRRFWYfYyO1KuMpj9h49i.jpg";
const CROMI_CASE_IMG = "/_sa/img/storage__gIIiCl56OxxYqrdKGDYZP7Ezsr7D9bR8cK9TcNXo.webp";
const CROMI_CASE_HREF = "/case/cromi";

const CROMI_CASE_SUBTITLE = "Корпоративный сайт для&nbsp;дистрибьютера оборудования.";

const CROMI_CASE_DESC =
  "На&nbsp;нем можно подробно ознакомиться со&nbsp;всеми услугами, изучить кейсы и&nbsp;вдохновиться лаконичным ярким дизайном.";

const CASE_BUTTON_SVG = `<svg data-v-bd2e570a="" xmlns="http://www.w3.org/2000/svg" width="16" height="13" viewBox="0 0 16 13" fill="none" data-v-7f5f1051=""><path d="M1 6.5H15M15 6.5L9.4 1M15 6.5L9.4 12" stroke="white" stroke-linecap="round" stroke-linejoin="round"></path></svg>`;

function buildCromiThirdRos7mSlideHtml(activeClass = "") {
  const bgEsc = CROMI_CASE_BG.replace(/"/g, "&quot;");
  const active = activeClass ? ` ${activeClass}` : "";
  return `<div data-v-bd2e570a="" class="swiper-slide cases-block__swiper-slide cases-block__swiper-slide--cromi swiper-slide-ros7m${active}" style="width: 1440px;"><div data-v-bd2e570a="" class="background" style="background-image: url(&quot;${bgEsc}&quot;);"></div> <div data-v-bd2e570a="" class="cases-block__swiper-slide-tags-wrapper cases-block__swiper-slide-tags-wrapper_hidden"><div data-v-bd2e570a="" class="cases-block__swiper-slide-tags"></div></div> <div data-v-bd2e570a="" class="cases-block__swiper-slide-contant"><div data-v-bd2e570a="" class="old"><img data-v-bd2e570a="" src="${CROMI_CASE_IMG}" alt="picture" loading="lazy" class="cases-block__swiper-slide-contant-image"></div></div> <div data-v-bd2e570a="" class="cases-block__swiper-slide-text-contant"><div data-v-bd2e570a="" class="cases-block__swiper-slide-title-wrapper"><h3 data-v-bd2e570a="" class="cases-block__swiper-slide-title">Cromi</h3> <p data-v-bd2e570a="" class="cases-block__swiper-slide-subtitle">${CROMI_CASE_SUBTITLE}</p></div> <div data-v-bd2e570a="" class="cases-block__swiper-slide-button-wrapper"><p data-v-bd2e570a="" class="cases-block__swiper-slide-description">${CROMI_CASE_DESC}</p> <a data-v-7f5f1051="" data-v-bd2e570a="" to="https://serenity.agency/case/cromi" href="${CROMI_CASE_HREF}" class="buttonlink cases-block__swiper-slide-button"><div data-v-7f5f1051="" class="buttonlink__content"><div data-v-bd2e570a="" data-v-7f5f1051="">
                                    Смотреть кейс
                                    ${CASE_BUTTON_SVG}</div></div> <div data-v-7f5f1051="" class="buttonlink__backplate" style="transform: translate3d(0px, 0px, 0px);"></div></a></div></div></div>`;
}

const { patchRos7mCasesBlock, replaceRos7mSlideAt } = require("./korporativnyj-ros7m-cases-common.cjs");

function patchKorporativnyjRos7mThirdSlideCromi(html) {
  return patchRos7mCasesBlock(html, (chunk) =>
    replaceRos7mSlideAt(chunk, 2, buildCromiThirdRos7mSlideHtml),
  );
}

module.exports = {
  CROMI_CASE_IMG,
  CROMI_CASE_HREF,
  buildCromiThirdRos7mSlideHtml,
  patchKorporativnyjRos7mThirdSlideCromi,
};

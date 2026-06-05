/**
 * Второй слайд третьего cases-block (swiper-24ow7) на /korporativnyj_sajt — Volvo Penta.
 */
const VOLVO_PENTA_CASE_BG =
  "/_sa/img/storage__cNYxHmvNcyNhzeCGWeovuIaSS00Dgi7gV2NirmIE.webp";

const VOLVO_PENTA_CASE_IMG =
  "/_sa/img/storage__RtrYAahBuC9RLgt5v2NMq2pDUbZxX4Bfnb2CJxSK.webp";

const VOLVO_PENTA_CASE_HREF = "/case/volvo-penta";

const VOLVO_PENTA_CASE_SUBTITLE =
  "Сайт для&nbsp;производителя судовых и&nbsp;промышленных двигателей.";

const VOLVO_PENTA_CASE_DESC =
  "Единый сайт с&nbsp;картой сервисных центров и&nbsp;уникальным конструктором лендингов для&nbsp;дилеров.";

const CASE_BUTTON_SVG = `<svg data-v-bd2e570a="" xmlns="http://www.w3.org/2000/svg" width="16" height="13" viewBox="0 0 16 13" fill="none" data-v-7f5f1051=""><path d="M1 6.5H15M15 6.5L9.4 1M15 6.5L9.4 12" stroke="white" stroke-linecap="round" stroke-linejoin="round"></path></svg>`;

function buildVolvoPentaSecondOw24SlideHtml(activeClass = "") {
  const bgEsc = VOLVO_PENTA_CASE_BG.replace(/"/g, "&quot;");
  const active = activeClass ? ` ${activeClass}` : "";
  return `<div data-v-bd2e570a="" class="swiper-slide cases-block__swiper-slide cases-block__swiper-slide--volvo-penta swiper-slide-24ow7${active}" style="width: 1440px;"><div data-v-bd2e570a="" class="background" style="background-image: url(&quot;${bgEsc}&quot;);"></div> <div data-v-bd2e570a="" class="cases-block__swiper-slide-tags-wrapper cases-block__swiper-slide-tags-wrapper_hidden"><div data-v-bd2e570a="" class="cases-block__swiper-slide-tags"></div></div> <div data-v-bd2e570a="" class="cases-block__swiper-slide-contant"><div data-v-bd2e570a="" class="old"><img data-v-bd2e570a="" src="${VOLVO_PENTA_CASE_IMG}" alt="Volvo Penta — сайт производителя судовых и промышленных двигателей" loading="lazy" class="cases-block__swiper-slide-contant-image"></div></div> <div data-v-bd2e570a="" class="cases-block__swiper-slide-text-contant"><div data-v-bd2e570a="" class="cases-block__swiper-slide-title-wrapper"><h3 data-v-bd2e570a="" class="cases-block__swiper-slide-title">Volvo Penta</h3> <p data-v-bd2e570a="" class="cases-block__swiper-slide-subtitle">${VOLVO_PENTA_CASE_SUBTITLE}</p></div> <div data-v-bd2e570a="" class="cases-block__swiper-slide-button-wrapper"><p data-v-bd2e570a="" class="cases-block__swiper-slide-description">${VOLVO_PENTA_CASE_DESC}</p> <a data-v-7f5f1051="" data-v-bd2e570a="" to="https://serenity.agency/case/volvo-penta" href="${VOLVO_PENTA_CASE_HREF}" class="buttonlink cases-block__swiper-slide-button"><div data-v-7f5f1051="" class="buttonlink__content"><div data-v-bd2e570a="" data-v-7f5f1051="">
                                    Смотреть кейс
                                    ${CASE_BUTTON_SVG}</div></div> <div data-v-7f5f1051="" class="buttonlink__backplate" style="transform: translate3d(0px, 0px, 0px);"></div></a></div></div></div>`;
}

const { patchOw24CasesBlock, replaceOw24SlideAt } = require("./korporativnyj-24ow7-cases-common.cjs");

function patchKorporativnyjOw24SecondSlideVolvoPenta(html) {
  return patchOw24CasesBlock(html, (chunk) =>
    replaceOw24SlideAt(chunk, 1, buildVolvoPentaSecondOw24SlideHtml),
  );
}

module.exports = {
  VOLVO_PENTA_CASE_BG,
  VOLVO_PENTA_CASE_IMG,
  VOLVO_PENTA_CASE_HREF,
  VOLVO_PENTA_CASE_SUBTITLE,
  VOLVO_PENTA_CASE_DESC,
  buildVolvoPentaSecondOw24SlideHtml,
  patchKorporativnyjOw24SecondSlideVolvoPenta,
};

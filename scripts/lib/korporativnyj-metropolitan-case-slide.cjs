/**
 * Первый слайд первого cases-block (swiper-n4fvk) на /korporativnyj_sajt.
 */
const METROPOLITAN_CASE_IMG =
  "/_sa/img/services/korporativnyj_sajt/metropolitan-case-slide.webp?v=20260604k1920";

const METROPOLITAN_CASE_SUBTITLE =
  "Премиальный сайт объектов недвижимости в&nbsp;ОАЭ.";

const METROPOLITAN_CASE_DESC =
  "Современный, премиальный дизайн для обеспеченной целевой аудитории со&nbsp;всего мира. Срок реализации&nbsp;— 4,5&nbsp;месяца: мультиязычность, полное редактирование в&nbsp;CMS, интеграция с&nbsp;ERP компании и&nbsp;админка на&nbsp;WordPress.";

const FIRST_N4FVK_SLIDE_RE =
  /<div data-v-bd2e570a="" class="swiper-slide cases-block__swiper-slide swiper-slide-n4fvk[^"]*"[^>]*>[\s\S]*?(?=<div data-v-bd2e570a="" class="swiper-slide cases-block__swiper-slide swiper-slide-n4fvk)/;

const METROPOLITAN_N4FVK_SLIDE_RE =
  /<div data-v-bd2e570a="" class="swiper-slide cases-block__swiper-slide cases-block__swiper-slide--metropolitan swiper-slide-n4fvk[^"]*"[^>]*>[\s\S]*?(?=<div data-v-bd2e570a="" class="swiper-slide cases-block__swiper-slide swiper-slide-n4fvk)/;

function buildMetropolitanFirstSlideHtml(activeClass = "swiper-slide-active") {
  const imgEsc = METROPOLITAN_CASE_IMG.replace(/"/g, "&quot;");
  return `<div data-v-bd2e570a="" class="swiper-slide cases-block__swiper-slide cases-block__swiper-slide--metropolitan swiper-slide-n4fvk ${activeClass}" style="width: 1440px;"><div data-v-bd2e570a="" class="background" style="background-image: url(&quot;${imgEsc}&quot;);"></div> <div data-v-bd2e570a="" class="cases-block__swiper-slide-tags-wrapper cases-block__swiper-slide-tags-wrapper_hidden"><div data-v-bd2e570a="" class="cases-block__swiper-slide-tags"></div></div> <div data-v-bd2e570a="" class="cases-block__swiper-slide-contant"><div data-v-bd2e570a="" class="old"><img data-v-bd2e570a="" src="${METROPOLITAN_CASE_IMG}" alt="Метрополитан — премиальный сайт недвижимости в ОАЭ" loading="lazy" class="cases-block__swiper-slide-contant-image"></div></div> <div data-v-bd2e570a="" class="cases-block__swiper-slide-text-contant"><div data-v-bd2e570a="" class="cases-block__swiper-slide-title-wrapper"><h3 data-v-bd2e570a="" class="cases-block__swiper-slide-title">Метрополитан</h3> <p data-v-bd2e570a="" class="cases-block__swiper-slide-subtitle">${METROPOLITAN_CASE_SUBTITLE}</p></div> <div data-v-bd2e570a="" class="cases-block__swiper-slide-button-wrapper"><p data-v-bd2e570a="" class="cases-block__swiper-slide-description">${METROPOLITAN_CASE_DESC}</p></div></div></div>`;
}

const { patchN4fvkCasesBlock } = require("./korporativnyj-n4fvk-cases-common.cjs");

/** Заменить первый слайд Digitale в первом cases-block (swiper-n4fvk). */
function patchKorporativnyjFirstCasesSlideMetropolitan(html) {
  return patchN4fvkCasesBlock(html, (chunk) => {
    const re = chunk.includes("cases-block__swiper-slide--metropolitan")
      ? METROPOLITAN_N4FVK_SLIDE_RE
      : FIRST_N4FVK_SLIDE_RE;
    const m = re.exec(chunk);
    if (!m) return chunk;
    const active = /\bswiper-slide-active\b/.test(m[0]);
    const next = buildMetropolitanFirstSlideHtml(active ? "swiper-slide-active" : "");
    if (m[0] === next) return chunk;
    return chunk.slice(0, m.index) + next + chunk.slice(m.index + m[0].length);
  });
}

module.exports = {
  METROPOLITAN_CASE_IMG,
  METROPOLITAN_CASE_SUBTITLE,
  METROPOLITAN_CASE_DESC,
  buildMetropolitanFirstSlideHtml,
  patchKorporativnyjFirstCasesSlideMetropolitan,
};

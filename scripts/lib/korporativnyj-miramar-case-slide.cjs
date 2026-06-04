/**
 * Второй слайд первого cases-block (swiper-n4fvk) на /korporativnyj_sajt.
 */
const MIRAMAR_CASE_IMG =
  "/_sa/img/services/korporativnyj_sajt/miramar-case-slide.webp?v=20260604miramar";

const MIRAMAR_CASE_HREF =
  "https://www.behance.net/gallery/154676089/Miramar-website";

const MIRAMAR_CASE_SUBTITLE =
  "Испанский застройщик по&nbsp;продаже элитных вилл в&nbsp;Испании.";

const MIRAMAR_CASE_DESC =
  "Сайт девелоперского проекта Coral Village: премиальная подача вилл, мультиязычность, полное редактирование контента в&nbsp;CMS и&nbsp;админка на&nbsp;WordPress. Срок реализации&nbsp;— 1,5&nbsp;месяца.";

/** Второй слайд n4fvk (после «Метрополитан»). */
const SECOND_N4FVK_SLIDE_RE =
  /<div data-v-bd2e570a="" class="swiper-slide cases-block__swiper-slide(?![^"]*--metropolitan)[^"]*swiper-slide-n4fvk[^"]*"[^>]*>[\s\S]*?(?=<div data-v-bd2e570a="" class="swiper-slide cases-block__swiper-slide swiper-slide-n4fvk)/;

const MIRAMAR_N4FVK_SLIDE_RE =
  /<div data-v-bd2e570a="" class="swiper-slide cases-block__swiper-slide cases-block__swiper-slide--miramar swiper-slide-n4fvk[^"]*"[^>]*>[\s\S]*?(?=<div data-v-bd2e570a="" class="swiper-slide cases-block__swiper-slide swiper-slide-n4fvk)/;

const CASE_BUTTON_SVG = `<svg data-v-bd2e570a="" xmlns="http://www.w3.org/2000/svg" width="16" height="13" viewBox="0 0 16 13" fill="none" data-v-7f5f1051=""><path d="M1 6.5H15M15 6.5L9.4 1M15 6.5L9.4 12" stroke="white" stroke-linecap="round" stroke-linejoin="round"></path></svg>`;

function buildMiramarSecondSlideHtml(activeClass = "") {
  const imgEsc = MIRAMAR_CASE_IMG.replace(/"/g, "&quot;");
  const hrefEsc = MIRAMAR_CASE_HREF.replace(/"/g, "&quot;");
  const active = activeClass ? ` ${activeClass}` : "";
  return `<div data-v-bd2e570a="" class="swiper-slide cases-block__swiper-slide cases-block__swiper-slide--miramar swiper-slide-n4fvk${active}" style="width: 1440px;"><div data-v-bd2e570a="" class="background" style="background-image: url(&quot;${imgEsc}&quot;);"></div> <div data-v-bd2e570a="" class="cases-block__swiper-slide-tags-wrapper cases-block__swiper-slide-tags-wrapper_hidden"><div data-v-bd2e570a="" class="cases-block__swiper-slide-tags"></div></div> <div data-v-bd2e570a="" class="cases-block__swiper-slide-contant"><div data-v-bd2e570a="" class="old"><img data-v-bd2e570a="" src="${MIRAMAR_CASE_IMG}" alt="Miramar — сайт Coral Village, элитные виллы в Испании" loading="lazy" class="cases-block__swiper-slide-contant-image"></div></div> <div data-v-bd2e570a="" class="cases-block__swiper-slide-text-contant"><div data-v-bd2e570a="" class="cases-block__swiper-slide-title-wrapper"><h3 data-v-bd2e570a="" class="cases-block__swiper-slide-title">Miramar</h3> <p data-v-bd2e570a="" class="cases-block__swiper-slide-subtitle">${MIRAMAR_CASE_SUBTITLE}</p></div> <div data-v-bd2e570a="" class="cases-block__swiper-slide-button-wrapper"><p data-v-bd2e570a="" class="cases-block__swiper-slide-description">${MIRAMAR_CASE_DESC}</p> <a data-v-7f5f1051="" data-v-bd2e570a="" to="${hrefEsc}" href="${MIRAMAR_CASE_HREF}" class="buttonlink cases-block__swiper-slide-button" target="_blank" rel="noopener noreferrer"><div data-v-7f5f1051="" class="buttonlink__content"><div data-v-bd2e570a="" data-v-7f5f1051="">
                                    Смотреть кейс
                                    ${CASE_BUTTON_SVG}</div></div> <div data-v-7f5f1051="" class="buttonlink__backplate" style="transform: translate3d(0px, 0px, 0px);"></div></a></div></div></div>`;
}

function patchKorporativnyjSecondCasesSlideMiramar(html) {
  if (!html.includes("swiper-slide-n4fvk")) return html;
  const re = html.includes("cases-block__swiper-slide--miramar")
    ? MIRAMAR_N4FVK_SLIDE_RE
    : SECOND_N4FVK_SLIDE_RE;
  const m = re.exec(html);
  if (!m) return html;
  const active = /\bswiper-slide-active\b/.test(m[0]);
  const next = buildMiramarSecondSlideHtml(active ? "swiper-slide-active" : "");
  if (m[0] === next) return html;
  return html.slice(0, m.index) + next + html.slice(m.index + m[0].length);
}

module.exports = {
  MIRAMAR_CASE_IMG,
  MIRAMAR_CASE_HREF,
  MIRAMAR_CASE_SUBTITLE,
  MIRAMAR_CASE_DESC,
  buildMiramarSecondSlideHtml,
  patchKorporativnyjSecondCasesSlideMiramar,
};

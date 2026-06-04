/**
 * Третий слайд swiper-n4fvk: Riderra (без Sunseeker — 3 слайда в блоке).
 */
const fs = require("fs");
const path = require("path");
const {
  N4FVK_PAGINATION_START,
  patchN4fvkCasesBlock,
  listN4fvkSlideStarts,
  replaceN4fvkSlideAt,
  appendN4fvkSlidesBeforePagination,
  patchN4fvkFixNestedSlides,
  patchN4fvkCloseWrapperBeforePagination,
  getN4fvkSlidesChunkBounds,
} = require("./korporativnyj-n4fvk-cases-common.cjs");

const libDir = __dirname;

function readSlideSnippet(name) {
  return fs
    .readFileSync(path.join(libDir, name), "utf8")
    .trim()
    .replace(/\s*transform: translate3d\([^)]+\)/g, "transform: translate3d(0px, 0px, 0px)");
}

const RIDERRA_SLIDE_HTML = readSlideSnippet("korporativnyj-n4fvk-riderra-slide-snippet.html");

const BROKEN_PAGINATION_RE =
  /<\/div><\/div><\/div>swiper-pagination-n4fvk/;

function slideTitleAt(slidesRegion, slideIndex) {
  const starts = listN4fvkSlideStarts(slidesRegion);
  if (starts.length <= slideIndex) return "";
  const end =
    starts[slideIndex + 1] ?? slidesRegion.indexOf(N4FVK_PAGINATION_START);
  return (
    slidesRegion
      .slice(starts[slideIndex], end >= 0 ? end : slidesRegion.length)
      .match(/cases-block__swiper-slide-title[^>]*>([^<]+)/) || []
  )[1] || "";
}

function n4fvkSlideEnd(chunk, starts, slideIndex) {
  if (starts[slideIndex + 1] != null) return starts[slideIndex + 1];
  const pag = chunk.indexOf(N4FVK_PAGINATION_START);
  return pag >= 0 ? pag : chunk.length;
}

function removeSunseekerSlide(slidesRegion) {
  const starts = listN4fvkSlideStarts(slidesRegion);
  for (let i = starts.length - 1; i >= 0; i--) {
    if (slideTitleAt(slidesRegion, i) !== "Sunseeker") continue;
    const start = starts[i];
    const end = n4fvkSlideEnd(slidesRegion, starts, i);
    return slidesRegion.slice(0, start) + slidesRegion.slice(end);
  }
  return slidesRegion;
}

function fixBrokenPaginationGlue(html) {
  if (!BROKEN_PAGINATION_RE.test(html)) return html;
  return html.replace(
    BROKEN_PAGINATION_RE,
    `${RIDERRA_SLIDE_HTML}</div></div></div></div></div> ${N4FVK_PAGINATION_START}`,
  );
}

/** Riderra без тегов «Кейс / Эстония» (как Метрополитан / Miramar). */
function stripN4fvkSlideTags(slideHtml) {
  return slideHtml
    .replace(
      /<div data-v-bd2e570a="" class="cases-block__swiper-slide-tags-wrapper">[\s\S]*?<\/div>\s*<div data-v-bd2e570a="" class="cases-block__swiper-slide-contant">/,
      '<div data-v-bd2e570a="" class="cases-block__swiper-slide-tags-wrapper cases-block__swiper-slide-tags-wrapper_hidden"><div data-v-bd2e570a="" class="cases-block__swiper-slide-tags"></div></div> <div data-v-bd2e570a="" class="cases-block__swiper-slide-contant">',
    )
    .replace(
      /cases-block__swiper-slide-tags-wrapper(?!_hidden)/g,
      "cases-block__swiper-slide-tags-wrapper cases-block__swiper-slide-tags-wrapper_hidden",
    );
}

const RIDERRA_SLIDE_HTML_CLEAN = stripN4fvkSlideTags(RIDERRA_SLIDE_HTML);

function buildRiderraSlideHtml(activeClass = "") {
  const active = activeClass ? ` ${activeClass}` : "";
  return RIDERRA_SLIDE_HTML_CLEAN.replace(
    'swiper-slide-n4fvk"',
    `swiper-slide-n4fvk${active}"`,
  );
}

function ensureThirdSlideRiderra(slidesRegion) {
  let region = removeSunseekerSlide(slidesRegion);
  const starts = listN4fvkSlideStarts(region);

  if (starts.length < 3) {
    return appendN4fvkSlidesBeforePagination(region, buildRiderraSlideHtml());
  }

  return replaceN4fvkSlideAt(region, 2, buildRiderraSlideHtml);
}

const N4FVK_PAGINATION_THREE_BULLETS =
  '<div data-v-bd2e570a="" class="swiper-pagination swiper-pagination-n4fvk swiper-pagination-clickable swiper-pagination-bullets">' +
  '<span class="swiper-pagination-bullet swiper-pagination-bullet-active" tabindex="0" role="button" aria-label="Go to slide 1"></span>' +
  '<span class="swiper-pagination-bullet" tabindex="0" role="button" aria-label="Go to slide 2"></span>' +
  '<span class="swiper-pagination-bullet" tabindex="0" role="button" aria-label="Go to slide 3"></span></div>';

function patchN4fvkPaginationThreeBullets(html) {
  const bounds = getN4fvkSlidesChunkBounds(html);
  if (!bounds) return html;
  const pagIdx = html.indexOf(N4FVK_PAGINATION_START, bounds.start);
  if (pagIdx < 0 || pagIdx !== bounds.pagStart) return html;
  const closeIdx = html.indexOf("</div>", pagIdx);
  if (closeIdx < 0) return html;
  return html.slice(0, pagIdx) + N4FVK_PAGINATION_THREE_BULLETS + html.slice(closeIdx + 6);
}

function patchKorporativnyjN4fvkTrailingSlides(html) {
  let next = fixBrokenPaginationGlue(html);
  next = patchN4fvkFixNestedSlides(next);
  next = patchN4fvkCasesBlock(next, ensureThirdSlideRiderra);
  next = patchN4fvkFixNestedSlides(next);
  next = patchN4fvkCloseWrapperBeforePagination(next);
  next = patchN4fvkPaginationThreeBullets(next);
  return next;
}

module.exports = {
  RIDERRA_SLIDE_HTML,
  patchKorporativnyjN4fvkTrailingSlides,
};

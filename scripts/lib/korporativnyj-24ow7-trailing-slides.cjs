/**
 * Слайды 2–3 swiper-24ow7: Volvo Penta, Foil; обрезка до трёх слайдов.
 */
const {
  patchOw24CasesBlock,
  replaceOw24SlideAt,
  trimOw24Slides,
  patchOw24PaginationBulletCount,
  closeOw24WrapperBeforePagination,
} = require("./korporativnyj-24ow7-cases-common.cjs");
const { buildVolvoPentaSecondOw24SlideHtml } = require("./korporativnyj-volvo-penta-24ow7-second-slide.cjs");
const { buildFoilThirdOw24SlideHtml } = require("./korporativnyj-foil-24ow7-third-slide.cjs");

const OW24_SLIDE_COUNT = 3;

function patchKorporativnyjOw24TrailingSlides(html) {
  let next = patchOw24CasesBlock(html, (chunk) => {
    let region = replaceOw24SlideAt(chunk, 1, buildVolvoPentaSecondOw24SlideHtml);
    region = replaceOw24SlideAt(region, 2, buildFoilThirdOw24SlideHtml);
    region = trimOw24Slides(region, OW24_SLIDE_COUNT);
    return closeOw24WrapperBeforePagination(region);
  });
  next = patchOw24PaginationBulletCount(next, OW24_SLIDE_COUNT);
  return next;
}

module.exports = {
  OW24_SLIDE_COUNT,
  patchKorporativnyjOw24TrailingSlides,
};

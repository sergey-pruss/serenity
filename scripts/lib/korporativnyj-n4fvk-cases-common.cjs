/**
 * Общие хелперы первого cases-block (swiper-n4fvk) на /korporativnyj_sajt.
 */
const N4FVK_CONTAINER_ID = 'id="swiper-container-n4fvk"';
const N4FVK_PAGINATION_START =
  '<div data-v-bd2e570a="" class="swiper-pagination swiper-pagination-n4fvk';

const N4FVK_SLIDE_MARKER =
  '<div data-v-bd2e570a="" class="swiper-slide cases-block__swiper-slide';

/** Границы swiper-container (открывающий <div> … перед pagination). */
function getN4fvkSlidesChunkBounds(html) {
  const idIdx = html.indexOf(N4FVK_CONTAINER_ID);
  if (idIdx < 0) return null;
  const start = html.lastIndexOf("<div", idIdx);
  if (start < 0) return null;
  const pagStart = html.indexOf(N4FVK_PAGINATION_START, start);
  if (pagStart < 0) return null;
  return { start, pagStart, slidesEnd: pagStart };
}

function patchN4fvkCasesBlock(html, patchSlidesRegion) {
  const bounds = getN4fvkSlidesChunkBounds(html);
  if (!bounds) return html;
  const { start, pagStart } = bounds;
  const slidesRegion = html.slice(start, pagStart);
  const nextRegion = patchSlidesRegion(slidesRegion);
  if (nextRegion === slidesRegion) return html;
  return html.slice(0, start) + nextRegion + html.slice(pagStart);
}

function listN4fvkSlideStarts(chunk) {
  const starts = [];
  let pos = 0;
  while ((pos = chunk.indexOf(N4FVK_SLIDE_MARKER, pos)) >= 0) {
    starts.push(pos);
    pos += N4FVK_SLIDE_MARKER.length;
  }
  return starts;
}

/** Конец слайда: следующий слайд или pagination (не chunk.length). */
function n4fvkSlideEnd(chunk, starts, slideIndex) {
  if (starts[slideIndex + 1] != null) return starts[slideIndex + 1];
  const pag = chunk.indexOf(N4FVK_PAGINATION_START);
  return pag >= 0 ? pag : chunk.length;
}

function replaceN4fvkSlideAt(slidesRegion, slideIndex, buildHtml) {
  const starts = listN4fvkSlideStarts(slidesRegion);
  if (starts.length <= slideIndex) return slidesRegion;
  const start = starts[slideIndex];
  const end = n4fvkSlideEnd(slidesRegion, starts, slideIndex);
  const old = slidesRegion.slice(start, end);
  const active = /\bswiper-slide-active\b/.test(old);
  const next = buildHtml(active ? "swiper-slide-active" : "");
  if (old === next) return slidesRegion;
  return slidesRegion.slice(0, start) + next + slidesRegion.slice(end);
}

/** Вставить слайды перед pagination, если их меньше ожидаемого. */
function appendN4fvkSlidesBeforePagination(slidesRegion, slidesHtml) {
  const pag = slidesRegion.indexOf(N4FVK_PAGINATION_START);
  if (pag < 0) return slidesRegion + slidesHtml;
  return slidesRegion.slice(0, pag) + slidesHtml + slidesRegion.slice(pag);
}

/** Слайд 3+ внутри кнопки Miramar ломает swiper и прячет .swiper__navigation (overflow). */
const NESTED_SLIDE_AFTER_CASE_LINK_RE =
  /(<\/a>)<div data-v-bd2e570a="" class="swiper-slide cases-block__swiper-slide swiper-slide-n4fvk/g;

function fixN4fvkNestedSlidesAfterCaseLink(slidesRegion) {
  let region = slidesRegion;
  let prev;
  do {
    prev = region;
    region = region.replace(
      NESTED_SLIDE_AFTER_CASE_LINK_RE,
      '$1</div></div></div><div data-v-bd2e570a="" class="swiper-slide cases-block__swiper-slide swiper-slide-n4fvk',
    );
  } while (region !== prev);
  return region;
}

function patchN4fvkFixNestedSlides(html) {
  return patchN4fvkCasesBlock(html, fixN4fvkNestedSlidesAfterCaseLink);
}

/** Перед pagination: закрыть swiper-wrapper + container (иначе стрелки уезжают на 2+ слайде). */
function closeN4fvkWrapperBeforePagination(slidesRegion) {
  const opens = (slidesRegion.match(/<div\b/g) || []).length;
  const closes = (slidesRegion.match(/<\/div>/g) || []).length;
  if (opens <= closes) return slidesRegion;
  return slidesRegion + "</div>".repeat(opens - closes);
}

function patchN4fvkCloseWrapperBeforePagination(html) {
  return patchN4fvkCasesBlock(html, closeN4fvkWrapperBeforePagination);
}

module.exports = {
  N4FVK_CONTAINER_ID,
  N4FVK_PAGINATION_START,
  N4FVK_SLIDE_MARKER,
  getN4fvkSlidesChunkBounds,
  patchN4fvkCasesBlock,
  listN4fvkSlideStarts,
  replaceN4fvkSlideAt,
  appendN4fvkSlidesBeforePagination,
  fixN4fvkNestedSlidesAfterCaseLink,
  patchN4fvkFixNestedSlides,
  closeN4fvkWrapperBeforePagination,
  patchN4fvkCloseWrapperBeforePagination,
};

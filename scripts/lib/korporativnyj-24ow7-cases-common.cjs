/**
 * Общие хелперы третьего cases-block (swiper-24ow7) на /korporativnyj_sajt.
 */
const OW24_CONTAINER_ID = 'id="swiper-container-24ow7"';
const OW24_PAGINATION_START =
  '<div data-v-bd2e570a="" class="swiper-pagination swiper-pagination-24ow7';

const OW24_SLIDE_CLASS_NEEDLE = "swiper-slide-24ow7";

function getOw24SlidesChunkBounds(html) {
  const idIdx = html.indexOf(OW24_CONTAINER_ID);
  if (idIdx < 0) return null;
  const start = html.lastIndexOf("<div", idIdx);
  if (start < 0) return null;
  const pagStart = html.indexOf(OW24_PAGINATION_START, start);
  if (pagStart < 0) return null;
  return { start, pagStart, slidesEnd: pagStart };
}

function patchOw24CasesBlock(html, patchSlidesRegion) {
  const bounds = getOw24SlidesChunkBounds(html);
  if (!bounds) return html;
  const { start, pagStart } = bounds;
  const slidesRegion = html.slice(start, pagStart);
  const nextRegion = patchSlidesRegion(slidesRegion);
  if (nextRegion === slidesRegion) return html;
  return html.slice(0, start) + nextRegion + html.slice(pagStart);
}

/** Слайды с модификатором (--solvik и т.п.) тоже находим по классу 24ow7. */
function listOw24SlideStarts(chunk) {
  const starts = [];
  let pos = 0;
  while ((pos = chunk.indexOf(OW24_SLIDE_CLASS_NEEDLE, pos)) >= 0) {
    const start = chunk.lastIndexOf('<div data-v-bd2e570a=""', pos);
    if (start >= 0 && (starts.length === 0 || start > starts[starts.length - 1])) {
      starts.push(start);
    }
    pos += OW24_SLIDE_CLASS_NEEDLE.length;
  }
  return starts;
}

function ow24SlideEnd(chunk, starts, slideIndex) {
  if (starts[slideIndex + 1] != null) return starts[slideIndex + 1];
  const pag = chunk.indexOf(OW24_PAGINATION_START);
  return pag >= 0 ? pag : chunk.length;
}

function replaceOw24SlideAt(slidesRegion, slideIndex, buildHtml) {
  const starts = listOw24SlideStarts(slidesRegion);
  if (starts.length <= slideIndex) return slidesRegion;
  const start = starts[slideIndex];
  const end = ow24SlideEnd(slidesRegion, starts, slideIndex);
  const old = slidesRegion.slice(start, end);
  const active = /\bswiper-slide-active\b/.test(old);
  const next = buildHtml(active ? "swiper-slide-active" : "");
  if (old === next) return slidesRegion;
  return slidesRegion.slice(0, start) + next + slidesRegion.slice(end);
}

function trimOw24Slides(slidesRegion, keepCount) {
  const starts = listOw24SlideStarts(slidesRegion);
  if (starts.length <= keepCount) return slidesRegion;
  const cutFrom = starts[keepCount];
  const pag = slidesRegion.indexOf(OW24_PAGINATION_START, cutFrom);
  const end = pag >= 0 ? pag : slidesRegion.length;
  return slidesRegion.slice(0, cutFrom) + slidesRegion.slice(end);
}

const OW24_PAGINATION_BLOCK_RE =
  /(<div data-v-bd2e570a="" class="swiper-pagination swiper-pagination-24ow7[^>]*>)([\s\S]*?)(<\/div>)/;

function patchOw24PaginationBulletCount(html, count) {
  return html.replace(OW24_PAGINATION_BLOCK_RE, (_m, open, _inner, close) => {
    const bullets = Array.from({ length: count }, (_v, i) => {
      const active = i === 0 ? " swiper-pagination-bullet-active" : "";
      return `<span class="swiper-pagination-bullet${active}" tabindex="0" role="button" aria-label="Go to slide ${i + 1}"></span>`;
    }).join("");
    return `${open}${bullets}${close}`;
  });
}

/** Перед pagination: закрыть swiper-wrapper (иначе 3-й слайд не листается). */
function closeOw24WrapperBeforePagination(slidesRegion) {
  const pagInRegion = slidesRegion.indexOf(OW24_PAGINATION_START);
  const pagEnd = pagInRegion >= 0 ? pagInRegion : slidesRegion.length;
  const wrapMarker = slidesRegion.indexOf("swiper-wrapper");
  if (wrapMarker < 0 || wrapMarker > pagEnd) return slidesRegion;
  const wrapDivStart = slidesRegion.lastIndexOf("<div", wrapMarker);
  if (wrapDivStart < 0) return slidesRegion;
  const segment = slidesRegion.slice(wrapDivStart, pagEnd);
  const opens = (segment.match(/<div\b/g) || []).length;
  const closes = (segment.match(/<\/div>/g) || []).length;
  if (opens <= closes) return slidesRegion;
  return (
    slidesRegion.slice(0, pagEnd) +
    "</div>".repeat(opens - closes) +
    slidesRegion.slice(pagEnd)
  );
}

function patchOw24CloseWrapperBeforePagination(html) {
  return patchOw24CasesBlock(html, closeOw24WrapperBeforePagination);
}

module.exports = {
  OW24_CONTAINER_ID,
  OW24_PAGINATION_START,
  OW24_SLIDE_CLASS_NEEDLE,
  getOw24SlidesChunkBounds,
  patchOw24CasesBlock,
  listOw24SlideStarts,
  replaceOw24SlideAt,
  trimOw24Slides,
  patchOw24PaginationBulletCount,
  closeOw24WrapperBeforePagination,
  patchOw24CloseWrapperBeforePagination,
};

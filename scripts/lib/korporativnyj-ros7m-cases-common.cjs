/**
 * Общие хелперы второго cases-block (swiper-ros7m) на /korporativnyj_sajt.
 */
const ROS7M_CONTAINER_ID = 'id="swiper-container-ros7m"';
const ROS7M_PAGINATION_START =
  '<div data-v-bd2e570a="" class="swiper-pagination swiper-pagination-ros7m';

const ROS7M_SLIDE_CLASS_NEEDLE = "swiper-slide-ros7m";

function getRos7mSlidesChunkBounds(html) {
  const idIdx = html.indexOf(ROS7M_CONTAINER_ID);
  if (idIdx < 0) return null;
  const start = html.lastIndexOf("<div", idIdx);
  if (start < 0) return null;
  const pagStart = html.indexOf(ROS7M_PAGINATION_START, start);
  if (pagStart < 0) return null;
  return { start, pagStart, slidesEnd: pagStart };
}

function patchRos7mCasesBlock(html, patchSlidesRegion) {
  const bounds = getRos7mSlidesChunkBounds(html);
  if (!bounds) return html;
  const { start, pagStart } = bounds;
  const slidesRegion = html.slice(start, pagStart);
  const nextRegion = patchSlidesRegion(slidesRegion);
  if (nextRegion === slidesRegion) return html;
  return html.slice(0, start) + nextRegion + html.slice(pagStart);
}

/** Слайды с модификатором (--sytnie-ugodiya и т.п.) тоже находим по классу ros7m. */
function listRos7mSlideStarts(chunk) {
  const starts = [];
  let pos = 0;
  while ((pos = chunk.indexOf(ROS7M_SLIDE_CLASS_NEEDLE, pos)) >= 0) {
    const start = chunk.lastIndexOf('<div data-v-bd2e570a=""', pos);
    if (start >= 0 && (starts.length === 0 || start > starts[starts.length - 1])) {
      starts.push(start);
    }
    pos += ROS7M_SLIDE_CLASS_NEEDLE.length;
  }
  return starts;
}

function ros7mSlideEnd(chunk, starts, slideIndex) {
  if (starts[slideIndex + 1] != null) return starts[slideIndex + 1];
  const pag = chunk.indexOf(ROS7M_PAGINATION_START);
  return pag >= 0 ? pag : chunk.length;
}

function replaceRos7mSlideAt(slidesRegion, slideIndex, buildHtml) {
  const starts = listRos7mSlideStarts(slidesRegion);
  if (starts.length <= slideIndex) return slidesRegion;
  const start = starts[slideIndex];
  const end = ros7mSlideEnd(slidesRegion, starts, slideIndex);
  const old = slidesRegion.slice(start, end);
  const active = /\bswiper-slide-active\b/.test(old);
  const next = buildHtml(active ? "swiper-slide-active" : "");
  if (old === next) return slidesRegion;
  return slidesRegion.slice(0, start) + next + slidesRegion.slice(end);
}

/** Перед pagination: закрыть swiper-wrapper (иначе Cromi не листается). */
function closeRos7mWrapperBeforePagination(slidesRegion) {
  const pagInRegion = slidesRegion.indexOf(ROS7M_PAGINATION_START);
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

function patchRos7mCloseWrapperBeforePagination(html) {
  return patchRos7mCasesBlock(html, closeRos7mWrapperBeforePagination);
}

module.exports = {
  ROS7M_CONTAINER_ID,
  ROS7M_PAGINATION_START,
  ROS7M_SLIDE_CLASS_NEEDLE,
  getRos7mSlidesChunkBounds,
  patchRos7mCasesBlock,
  listRos7mSlideStarts,
  replaceRos7mSlideAt,
  closeRos7mWrapperBeforePagination,
  patchRos7mCloseWrapperBeforePagination,
};

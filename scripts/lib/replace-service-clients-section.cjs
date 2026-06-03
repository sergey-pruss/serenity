/**
 * Legacy-секция «Наши клиенты» (clients-new__title, без clients-mainstr)
 * → parity с /kontekstnaya_reklama (clients-mainstr + home-clients-awards__title).
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..", "..");
const CLIENTS_PARTIAL = path.join(
  root,
  "html",
  "partials",
  "services",
  "clients-kontekstnaya-reklama.html",
);

const SMALL_ARROW_SVG =
  '<svg width="12" height="20" viewBox="0 0 12 20" fill="none" xmlns="http://www.w3.org/2000/svg" class=""><path d="M1.39844 0.900391L10.5908 10.0928L1.39844 19.2852" stroke="white" stroke-linecap="round" stroke-linejoin="round"></path></svg>';

const SECTION_OPEN = '<section class="page-constructor__section';

function sanitizeClientsSectionHtml(html) {
  return html
    .replace(/\s*swiper-container-initialized/g, "")
    .replace(/\s*swiper-container-horizontal/g, "")
    .replace(/\s*swiper-container-free-mode/g, "")
    .replace(/<span class="swiper-notification"[^>]*><\/span>/g, "")
    .replace(/\s*style="transition-duration:\s*[^"]*;?"/g, "")
    .replace(/\s*style="transform:\s*translate3d\([^"]*\);?"/g, "")
    .replace(/\s*style="cursor:\s*grab;?"/g, "")
    .replace(
      /\s*swiper-slide-(?:duplicate|active|next|prev|duplicate-active|duplicate-next|duplicate-prev)(?:-\w+)*/g,
      "",
    );
}

function extractClientsSectionBounds(html) {
  const idx = html.indexOf('class="clients-wrapper"');
  if (idx < 0) return null;
  const secStart = html.lastIndexOf(SECTION_OPEN, idx);
  if (secStart < 0) return null;
  const titleIdx = html.indexOf("Наши клиенты", idx);
  const anchor = titleIdx >= 0 ? titleIdx : idx;
  const secEnd = html.indexOf("</section>", anchor) + "</section>".length;
  return { secStart, secEnd, sectionHtml: html.slice(secStart, secEnd) };
}

function upgradeServiceClientsSectionHtml(sectionHtml, options = {}) {
  if (!sectionHtml.includes('class="clients-wrapper"')) return sectionHtml;

  let out = sanitizeClientsSectionHtml(sectionHtml.trim());

  out = out.replace(/<section class="page-constructor__section([^"]*)">/, (_, rest) => {
    const parts = new Set(["page-constructor__section", "kontekst-clients-section"]);
    rest.trim()
      .split(/\s+/)
      .filter(Boolean)
      .forEach((p) => parts.add(p));
    if (options.extraSectionClass) parts.add(options.extraSectionClass);
    return `<section class="${[...parts].join(" ")}">`;
  });

  if (!out.includes('style="z-index: 10"')) {
    out = out.replace(
      /(<section class="page-constructor__section[^"]*">)\s*(<div[^>]*class="clients-wrapper)/,
      `$1\n<div data-v-6f8a040c="" style="z-index: 10">\n              $2`,
    );
    out = out.replace(/<\/section>\s*$/, "            </div>\n</section>");
  }

  if (!out.includes("clients-mainstr")) {
    out = out.replace(
      /class="clients-wrapper"/,
      'class="clients-wrapper clients-mainstr clients-wrapper_main-structure"',
    );
  }

  if (!out.includes("home-between")) {
    out = out.replace(/class="clients-new-section"/, 'class="clients-new-section home-between"');
  }

  if (!out.includes("home-ledge")) {
    out = out.replace(/class="clients-new"/, 'class="clients-new home-ledge"');
  }

  out = out.replace(/class="clients-new__title"/, 'class="home-clients-awards__title"');

  out = out.replace(
    /<svg[^>]*width="40"[^>]*viewBox="0 0 42 42"[\s\S]*?<\/svg>/g,
    SMALL_ARROW_SVG,
  );

  return out;
}

function upgradeClientsInPage(html, options = {}) {
  const bounds = extractClientsSectionBounds(html);
  if (!bounds) return html;
  const upgraded = upgradeServiceClientsSectionHtml(bounds.sectionHtml, options);
  return `${html.slice(0, bounds.secStart)}${upgraded}${html.slice(bounds.secEnd)}`;
}

function loadClientsPartial(extraSectionClass = "") {
  let partial = fs.readFileSync(CLIENTS_PARTIAL, "utf8").trim();
  if (extraSectionClass) {
    partial = partial.replace(
      'class="page-constructor__section kontekst-clients-section"',
      `class="page-constructor__section kontekst-clients-section ${extraSectionClass}"`,
    );
  }
  return sanitizeClientsSectionHtml(partial);
}

function replaceServiceClientsSection(html, options = {}) {
  const bounds = extractClientsSectionBounds(html);
  if (!bounds) return html;
  const partial = loadClientsPartial(options.extraSectionClass || "");
  return `${html.slice(0, bounds.secStart)}${partial}${html.slice(bounds.secEnd)}`;
}

module.exports = {
  CLIENTS_PARTIAL,
  sanitizeClientsSectionHtml,
  extractClientsSectionBounds,
  upgradeServiceClientsSectionHtml,
  upgradeClientsInPage,
  loadClientsPartial,
  replaceServiceClientsSection,
};

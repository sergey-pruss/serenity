/**
 * Разметка карточек more-case-wr из объектов cases-all (как js/case-all.js / home-cases-auto.js).
 */
const fs = require("fs");
const path = require("path");

const EXTERNAL_SVG_WHITE = `<svg data-v-38965faa="" width="46" height="46" viewBox="0 0 46 46" fill="none" xmlns="http://www.w3.org/2000/svg" class="mor-cases-slide__svg"><path data-v-38965faa="" d="M21.2644 22.3648C21.2644 22.3648 22.9678 22.2317 22.9678 20.129C22.9678 18.0262 21.5742 17 19.8089 17H14V28.7509H19.8089C19.8089 28.7509 23.3551 28.8688 23.3551 25.2825C23.3551 25.2826 23.5097 22.3648 21.2644 22.3648ZM19.3908 19.0886H19.8089C19.8089 19.0886 20.5985 19.0886 20.5985 20.3112C20.5985 21.5337 20.1342 21.7109 19.6074 21.7109H16.5595V19.0886H19.3908ZM19.6448 26.6624H16.5595V23.5221H19.8089C19.8089 23.5221 20.9858 23.5058 20.9858 25.1359C20.9858 26.5103 20.1068 26.652 19.6448 26.6624ZM28.0844 19.9898C23.7915 19.9898 23.7953 24.5048 23.7953 24.5048C23.7953 24.5048 23.5007 28.9967 28.0844 28.9967C28.0844 28.9967 31.9042 29.2264 31.9042 25.8719H29.9397C29.9397 25.8719 30.0053 27.1352 28.15 27.1352C28.15 27.1352 26.1852 27.2738 26.1852 25.0908H31.9697C31.9697 25.0907 32.6026 19.9898 28.0844 19.9898ZM26.1636 23.5221C26.1636 23.5221 26.4035 21.7109 28.1281 21.7109C29.8523 21.7109 29.8307 23.5221 29.8307 23.5221H26.1636ZM30.2883 19.1393H25.6827V17.6923H30.2883V19.1393Z" fill="white"></path><rect data-v-38965faa="" x="1" y="1" width="44" height="44" rx="13" stroke="white"></rect></svg>`;

const EXTERNAL_SVG_BLACK = `<div data-v-c0adc676="" class="case__external-link"><svg data-v-c0adc676="" width="46" height="46" viewBox="0 0 46 46" fill="none" xmlns="http://www.w3.org/2000/svg" class="cases__case-svg"><path data-v-c0adc676="" d="M21.2644 22.3648C21.2644 22.3648 22.9678 22.2317 22.9678 20.129C22.9678 18.0262 21.5742 17 19.8089 17H14V28.7509H19.8089C19.8089 28.7509 23.3551 28.8688 23.3551 25.2825C23.3551 25.2826 23.5097 22.3648 21.2644 22.3648V22.3648ZM19.3908 19.0886H19.8089C19.8089 19.0886 20.5985 19.0886 20.5985 20.3112C20.5985 21.5337 20.1342 21.7109 19.6074 21.7109H16.5595V19.0886H19.3908V19.0886ZM19.6448 26.6624H16.5595V23.5221H19.8089C19.8089 23.5221 20.9858 23.5058 20.9858 25.1359C20.9858 26.5103 20.1068 26.652 19.6448 26.6624V26.6624ZM28.0844 19.9898C23.7915 19.9898 23.7953 24.5048 23.7953 24.5048C23.7953 24.5048 23.5007 28.9967 28.0844 28.9967C28.0844 28.9967 31.9042 29.2264 31.9042 25.8719H29.9397C29.9397 25.8719 30.0053 27.1352 28.15 27.1352C28.15 27.1352 26.1852 27.2738 26.1852 25.0908H31.9697C31.9697 25.0907 32.6026 19.9898 28.0844 19.9898ZM26.1636 23.5221C26.1636 23.5221 26.4035 21.7109 28.1281 21.7109C29.8523 21.7109 29.8307 23.5221 29.8307 23.5221H26.1636ZM30.2883 19.1393H25.6827V17.6923H30.2883V19.1393Z" fill="black"></path> <rect data-v-c0adc676="" x="1" y="1" width="44" height="44" rx="13" stroke="black"></rect></svg></div>`;

const SKELETON = `<div data-v-c0adc676="" class="skeleton" style="display: none;"><div data-v-c0adc676="" class="case__top skeleton"><p data-v-c0adc676="" class="case__description skeleton_description case__description--static"></p> <p data-v-c0adc676="" class="case__description skeleton_description case__description--static"></p> <p data-v-c0adc676="" class="case__description skeleton_description case__description--static"></p></div> <div data-v-c0adc676="" class="case__media skeleton"></div></div>`;

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function normalizeHref(href) {
  const h = String(href || "").trim();
  if (!h) return "#";
  return h.replace(/^https?:\/\/serenity\.agency/i, "") || h;
}

function buildResponsiveAttrs(url) {
  const src = normalizeHref(url);
  if (!src || !src.includes("/_sa/img/case/")) {
    return { src, srcset: "", sizes: "" };
  }
  const mobileSrc = src.replace(/(\.[a-zA-Z0-9]+)(\?.*)?$/, "__m$1$2");
  return {
    src,
    srcset: `${mobileSrc} 820w, ${src} 1920w`,
    sizes: "(max-width: 768px) 92vw, (max-width: 1200px) 48vw, 31vw",
  };
}

function renderGridMedia(c, idx) {
  const imageUrl = c.media?.kind === "video" ? c.media.poster || c.media.image : c.media?.image;
  const imageAttrs = buildResponsiveAttrs(imageUrl);
  const fetchPriority = idx < 2 ? "high" : "low";
  const loading = idx < 2 ? "eager" : "lazy";
  const imgAttrs = imageAttrs.src
    ? `src="${esc(imageAttrs.src)}"${imageAttrs.srcset ? ` srcset="${esc(imageAttrs.srcset)}" sizes="${esc(imageAttrs.sizes)}"` : ""} loading="${loading}" fetchpriority="${fetchPriority}" decoding="async"`
    : "";
  if (c.media?.kind === "video" && c.media.videoSrc) {
    return `<div data-v-c0adc676="" class="case__media video"><img data-v-c0adc676="" ${imgAttrs} class="case__media--front" alt="" /> <!----> <video data-v-c0adc676="" playsinline="" autoplay="autoplay" muted="muted" loop="loop" preload="none" class="case__media--video"><source data-v-c0adc676="" data-src="${esc(normalizeHref(c.media.videoSrc))}" type="video/mp4" /></video> <!----></div>`;
  }
  return `<div data-v-c0adc676="" class="case__media zoom"><img data-v-c0adc676="" ${imgAttrs} class="case__media--front" alt="" /> <!----> <!----> <!----></div>`;
}

function renderMorSlide(c) {
  const bg = c.media?.kind === "video" ? c.media.poster || c.media.image : c.media?.image;
  const textClass =
    c.linkClass === "dark-text" ? "mor-cases-slide__text mor-cases-slide__text_black" : "mor-cases-slide__text";
  const href = esc(normalizeHref(c.href));
  const target = c.isResource ? ' target="_blank"' : "";
  const icon = c.isResource ? ` ${EXTERNAL_SVG_WHITE}` : " <!---->";
  return `<div data-v-38965faa="" class="swiper-slide mor-cases-slide" style="background-image: url(&quot;${esc(normalizeHref(bg || ""))}&quot;);"><a data-v-38965faa="" href="${href}"${target} class="mor-cases-slide__link"><p data-v-38965faa="" class="${textClass}">${esc(c.description || "")}</p>${icon}</a></div>`;
}

function renderGridCase(c, idx) {
  const tags = (c.tags || [])
    .map(
      (t) => `<span data-v-c0adc676="" class="case__tag">\n        ${esc(t)}\n      </span>`,
    )
    .join("");
  const href = esc(normalizeHref(c.href));
  const isDark = c.linkClass === "dark-text";
  const linkClasses = [c.linkClass || "white-text", c.isResource ? "case--resource" : ""].filter(Boolean).join(" ");
  const caseClass = isDark ? "case case--dark-card" : "case";
  const caseStyle = isDark ? ' style="background-color:#e8e8ea;"' : "";
  const linkStyle = isDark ? ' style="background-color:#e8e8ea;"' : "";
  const target = c.isResource ? ' target="_blank"' : "";
  const resourceIcon = c.isResource ? EXTERNAL_SVG_BLACK : " <!---->";
  return `<div data-v-c0adc676="" data-v-27a87df0="" class="${caseClass}"${caseStyle}><a data-v-c0adc676="" href="${href}"${target} class="${linkClasses}"${linkStyle}><div data-v-c0adc676="" class="case__tags">${tags}</div> <p data-v-c0adc676="" class="case__description">\n      ${esc(c.description || "")}\n    </p> <!----> ${renderGridMedia(c, idx)}${resourceIcon}</a> ${SKELETON}</div>`;
}

function buildCtaSlide(moreHref) {
  const href = esc(moreHref || "/case/all/category/sites/");
  return `<div data-v-38965faa="" class="swiper-slide mor-cases-slide mor-cases-slide_link" style="background-color: #2c2c30"><div data-v-38965faa="" class="mor-cases-slide__cta-fill"><img fetchpriority="low" decoding="async" data-v-38965faa="" src="/_sa/img/video__lastBlogGif.gif" alt="" loading="eager" class="mor-cases-slide__cta-gif" /><div data-v-38965faa="" class="mor-cases-slide__cta-shade" aria-hidden="true"></div><p data-v-38965faa="" class="more-cases-slider__slide-link"><a data-v-38965faa="" href="${href}" class="">Смотреть<br>больше&nbsp;кейсов</a></p></div></div>`;
}

function isBehanceHref(href) {
  return /behance\.net/i.test(String(href || ""));
}

/** Все кейсы рубрики «Сайты» в порядке /case/all/category/sites (page-1 + page-2). */
function loadSitesCategoryCases(root, opts = {}) {
  const excludeBehance = opts.excludeBehance === true;
  const cases = [];
  const dir = path.join(root, "json", "case-all-pages", "sites");
  for (let p = 1; ; p++) {
    const fp = path.join(dir, `page-${p}.json`);
    if (!fs.existsSync(fp)) break;
    const page = JSON.parse(fs.readFileSync(fp, "utf8"));
    if (Array.isArray(page.cases)) cases.push(...page.cases);
  }
  let list = cases;
  if (!list.length) {
    const allPath = path.join(root, "json", "cases-all.json");
    const data = JSON.parse(fs.readFileSync(allPath, "utf8"));
    list = (data.cases || []).filter((c) => (c.tagCodes || []).includes("sites"));
  }
  if (excludeBehance) {
    list = list.filter((c) => !isBehanceHref(c.href));
  }
  return list;
}

module.exports = {
  esc,
  normalizeHref,
  isBehanceHref,
  renderMorSlide,
  renderGridCase,
  buildCtaSlide,
  loadSitesCategoryCases,
};

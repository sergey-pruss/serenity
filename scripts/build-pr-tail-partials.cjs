#!/usr/bin/env node
/**
 * Хвост /pr: форма, команда, клиенты, FAQ, блог, кейсы, награды, синергия.
 * Контент — json/services/pr/legacy-content.json; разметка — как lending / korporativnyj.
 */
const fs = require("fs");
const path = require("path");
const { processTypographyHtml } = require("./typography-nbsp.cjs");
const { syncFaqBodyHtmlJsonLd, stripNuxtScopedAttrs } = require("./lib/build-faq-page-jsonld.cjs");
const { renderSlides } = require("./lib/service-awards-render.cjs");
const { renderMorSlide, renderGridCase, buildCtaSlide } = require("./lib/build-more-cases-cards-html.cjs");

const ROOT = path.resolve(__dirname, "..");
const SLUG = "pr";
const PARTIALS = path.join(ROOT, "html", "partials", "services");
const JSON_DIR = path.join(ROOT, "json", "services", SLUG);
const LEGACY = JSON.parse(fs.readFileSync(path.join(JSON_DIR, "legacy-content.json"), "utf8"));
const IMG = `/_sa/img/services/${SLUG}`;
const BLOGS_ALL = path.join(ROOT, "json", "blogs-all.json");
const CASES_ALL = path.join(ROOT, "json", "cases-all.json");
const BLOG_TEMPLATE = path.join(ROOT, "html", "partials", "section-blog.html");
const KONTEKST_HTML = path.join(ROOT, "kontekstnaya_reklama", "index.html");
const AWARDS_SHELL = path.join(PARTIALS, "_service-awards.shell.html");
const FAQ_SHELL = path.join(PARTIALS, "_service-faq.shell.html");
const INLINE_SHELL = path.join(PARTIALS, "_service-inline-lead.shell.html");

const EXPECTED_CASES = 8;
const SLIDE_COUNT_MAX = 10;
const MIN_PUBLISH_YEAR = 2020;

const PR_TOPIC_RE =
  /\bpr\b|пиар|репутац|бренд|сми|медиа|имидж|узнаваем|инфоповод|коммуникац/i;
const PR_CASE_TOPIC_RE =
  /pr|продвижен|репутац|бренд|сми|узнаваем|подписчик|имидж|медиа|инфопол/i;
const PR_CASE_RESULT_RE = /увеличил|снизил|в\s+\d+\s+раз|на\s+\d+\s*%|подписчик|охват|заявк|продаж/i;

const CURATED_BLOG_SLUGS = [
  "prodvizhenie-brenda-v-telegram",
  "kak-pridumat-nazvanie-brenda",
  "unisender-tsennost-brenda-cherez-produktovyj-podhod",
  "effektivnoe-prodvizhenie-kak-rabotaet-strategiya",
  "kak-sozdat-konkurentosposobnoe-imya",
  "kontent-dlya-sajta-strategiya-i-prakticheskie-sovety-ot-serenity",
  "prodvizhenie-sajta-statyami-ekspertnyj-kontent-kotoryj-rabotaet",
  "kak-sozdat-kachestvennyj-tekst-dlya-sajta-prakticheskoe-rukovodstvo",
  "etapy-seo-prodvizheniya-sajta",
  "kompleksnyj-seo-audit-sajta-zachem-kogda-i-iz-chego-sostoit",
];

const LEGACY_CASE_SLUGS = [
  "gio-welness",
  "school",
  "darkrain-store",
  "toofli",
  "kaury",
  "vomoloko",
];

const TEAM_FILE = {
  "NO2ApogyXILOcyoK4X7BZBOmJgdrPH5N07L7kcWV.png": "marketer.png",
  "lAUqfNrVDCerOVjNDDIo9rO2dKxppgACBvOSOKC7.png": "project-manager.png",
  "4M6erOidPr77djLpxISP1WkrXstnxmTSNRzpIxtf.png": "strategist.png",
  "e3aU9vJISKph8aboLDjMi53fWxme9YMUhPNQOw6k.png": "pr-manager.png",
  "BoKBOHbWBHNwmgZCprOnl0v0YBT4SXZHAcLbXhoo.png": "copywriter.png",
  "11iWUPE8YjbzkfiJEbgKftlCaUJ3yOMuAH2i7yvM.png": "leader.png",
};

const SYNERGY_FILES = {
  "W4rGTPQCrD1ma0xtOnhvmKGSJPytWTLhy394z4B6.png": "content-desc.png",
  "LyenrN60o407eA92b6oqKKsGuUa4bKNosSIclRwL.png": "content-tablet.png",
  "TwxujPPcAVrXC8IFAATCj4CsPW50ttq1OIrQQ6YA.png": "content-mobile.png",
};

const SYNERGY_IMG_FALLBACK = {
  "Контент-маркетинг": {
    desc: `${IMG}/synergy/content-desc.png`,
    tablet: `${IMG}/synergy/content-tablet.png`,
    mobile: `${IMG}/synergy/content-mobile.png`,
  },
  "Комплексный SMM": {
    desc: "/_sa/img/services/strategy/synergy/smm-desc.png",
    tablet: "/_sa/img/services/strategy/synergy/smm-tablet.png",
    mobile: "/_sa/img/services/strategy/synergy/smm-mobile.png",
  },
  SEO: {
    desc: "/_sa/img/storage__kZKCokdVJJ0juenyabbgnTAfJvjyUXr0GriQDRh3.png",
    tablet: "/_sa/img/storage__sozdTTaoL9Xw2e0d9LYoExd9T2AUbzQZQ78Clv9J.png",
    mobile: "/_sa/img/storage__2ESWMTivkoyLXgkBdkyU8Pqp0faZFOIdZrVwzOmg.png",
  },
  "Фото и видео": {
    desc: "/_sa/img/storage__1Yt1GYgHbovF9gOFZok055VJhROOXSp6GgOvev9m.png",
    tablet: "/_sa/img/storage__QYEKkKmG5Sc15apUCJImHJBQMfTgajkp1wbT4f8J.png",
    mobile: "/_sa/img/storage__jVQhfjAvEkF30CcGHZn12CjIfXAf1VSYSms2tRl2.png",
  },
  "Контекстная реклама": {
    desc: "/_sa/img/storage__1Yt1GYgHbovF9gOFZok055VJhROOXSp6GgOvev9m.png",
    tablet: "/_sa/img/storage__QYEKkKmG5Sc15apUCJImHJBQMfTgajkp1wbT4f8J.png",
    mobile: "/_sa/img/storage__jVQhfjAvEkF30CcGHZn12CjIfXAf1VSYSms2tRl2.png",
  },
  "Таргетированная реклама": {
    desc: "/_sa/img/storage__2MRra5DUPNo2hTBZKN6FwTih3CENW6iwFPPhefjx.png",
    tablet: "/_sa/img/storage__22coyPtNpva5LAxcC6rng1WJa7laye9yojsNE8uQ.png",
    mobile: "/_sa/img/storage__IQrET6dOZ5lBMvXXLrxjGEJaUVN5FGyWgbi7sV2k.png",
  },
};

function blockByComponent(name) {
  return LEGACY.content.find((b) => b.component === name);
}

function legacyDesc(s) {
  return String(s || "")
    .replace(/\s+—\s+/g, "&nbsp;— ")
    .replace(/\s+и\s+/g, "&nbsp;и ");
}

function escapeXml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function hrefForPage(href) {
  let h = String(href || "").trim();
  if (!h) return "#";
  try {
    const u = new URL(h, "https://serenity.agency");
    h = u.pathname || h;
  } catch {
    /* keep */
  }
  if (h.endsWith("/")) h = h.slice(0, -1);
  return h;
}

function slugFromHref(href) {
  const m = String(href).match(/\/blog\/(?:article|case)\/([^/]+)/);
  return m ? m[1] : null;
}

function caseSlugFromHref(href) {
  const h = hrefForPage(href);
  const m = h.match(/\/case(?:\/all)?\/([^/]+)$/);
  return m ? m[1] : null;
}

function synergyStorageSrc(hash) {
  if (!hash) return "";
  return `${IMG}/synergy/${SYNERGY_FILES[hash] || hash}`;
}

function extractTeamSection(html) {
  const idx = html.indexOf("team-block");
  if (idx === -1) return null;
  const secStart = html.lastIndexOf("<section", idx);
  let pos = secStart;
  let depth = 0;
  while (pos < html.length) {
    if (html.slice(pos, pos + 8) === "<section") depth += 1;
    else if (html.slice(pos, pos + 10) === "</section>") {
      depth -= 1;
      if (depth === 0) return html.slice(secStart, pos + 10);
    }
    pos += 1;
  }
  return null;
}

function stripTags(s) {
  return s.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

function memberSlideHtml(m) {
  const alt = stripTags(m.h4).slice(0, 120);
  return (
    `<div class="team__member-slide swiper-slide" style="margin-right:30px">` +
    `<div data-v-c03ce8dc="" class="team__member-card">` +
    `<figure data-v-c03ce8dc=""><img data-v-c03ce8dc="" src="${m.img}" alt="${alt}" loading="lazy"></figure> ` +
    `<h4 data-v-c03ce8dc="">${m.h4}</h4> ` +
    `<p data-v-c03ce8dc="">${m.p}</p>` +
    `</div></div>`
  );
}

function buildTeamSection(templateSection, intro, members) {
  let out = templateSection;
  if (intro) {
    out = out.replace(
      /(<p data-v-c03ce8dc="">)([\s\S]*?)(<\/p><\/div> <div data-v-c03ce8dc="" class="row team__cards)/,
      `$1${intro}$3`,
    );
  } else {
    out = out.replace(
      /<p data-v-c03ce8dc="">[\s\S]*?<\/p>(?=<\/div> <div data-v-c03ce8dc="" class="row team__cards)/,
      "<!----> ",
    );
  }
  const trackOpen = '<div class="team__members-track swiper-wrapper">';
  const carouselOpen = '<div data-v-3b1bcda9="" data-v-c03ce8dc="" class="team-carousel-block"';
  const trackIdx = out.indexOf(trackOpen);
  const carouselIdx = out.indexOf(carouselOpen);
  if (trackIdx < 0 || carouselIdx < 0) throw new Error("team track/carousel markers missing");
  const trackContentStart = out.indexOf(">", trackIdx) + 1;
  const slidesHtml = members.map((m) => memberSlideHtml(m)).join("");
  out =
    out.slice(0, trackContentStart) +
    slidesHtml +
    "</div></div></div>" +
    out.slice(carouselIdx);
  return out
    .replace(/<section class="page-constructor__section">/, '<section class="page-constructor__section pr-team-section">')
    .replace(/\s*swiper-container-initialized\b/g, "")
    .replace(/\s*swiper-container-horizontal\b/g, "")
    .replace(/\s*swiper-container-free-mode\b/g, "")
    .replace(/<span class="swiper-notification"[^>]*><\/span>/g, "");
}

function inlineLeadTitle(forms) {
  const base = String(forms?.title || "PR-продвижение").trim();
  if (/^заказать\b/i.test(base)) return base;
  return `Заказать ${base}`;
}

function buildInlineLeadPartial() {
  const forms = blockByComponent("forms-block").data;
  const shell = fs.readFileSync(INLINE_SHELL, "utf8");
  return shell
    .replace("__TITLE_HTML__", inlineLeadTitle(forms))
    .replace("__LEAD_HTML__", legacyDesc(forms.description))
    .replace(
      'class="page-constructor__section sa-service-lead-section"',
      'class="page-constructor__section sa-service-lead-section pr-inline-lead-section"',
    );
}

function buildTeamPartial() {
  const team = blockByComponent("team-block").data;
  const template = extractTeamSection(fs.readFileSync(KONTEKST_HTML, "utf8"));
  if (!template?.includes("team__members-slider")) throw new Error("kontekst team slider missing");
  const members = (team.team_members || []).map((m) => ({
    img: `${IMG}/team/${TEAM_FILE[m.movie] || m.movie}`,
    h4: legacyDesc(m.title),
    p: legacyDesc(m.description),
  }));
  return buildTeamSection(template, legacyDesc(team.description || ""), members);
}

function buildClientsPartial() {
  const raw = fs.readFileSync(path.join(PARTIALS, "clients-kontekstnaya-reklama.html"), "utf8");
  return raw
    .replace("kontekst-clients-section", "kontekst-clients-section pr-clients-section")
    .replace("<!-- clients-kontekstnaya -->", "<!-- PR-CLIENTS-START -->")
    .replace(/<!--[\s\S]*?clients-kontekstnaya[\s\S]*?-->/, "<!-- PR-CLIENTS-START -->");
}

function buildFaqPartial() {
  const faq = blockByComponent("faq-block").data;
  const pairs = (faq.questions || []).map((q) => ({
    question: q.question,
    answer: legacyDesc(q.answer),
  }));
  const ico =
    '<div class="spoiler__ico"><svg width="16" height="9" viewBox="0 0 16 9" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M15.4238 1L8.05694 7.96972L0.885888 0.798671" stroke="white" stroke-linecap="round" stroke-linejoin="round"></path></svg></div>';
  const spoiler = (q, a) =>
    `<div class="spoiler block"><div class="spoiler__head"><h3 class="block__question">${q}</h3> ${ico}</div> <div class="spoiler__content"><div class="spoiler__content-inner"><div class="spoiler__content-wr"><div class="spoiler__content-slot"><div class="block__content">${a}</div></div></div></div></div></div>`;
  const cols = [[], [], []];
  pairs.forEach((p, i) => cols[i % 3].push(spoiler(p.question, p.answer)));
  const columns = cols.map((c) => `<div class="blocks__column">${c.join("")}</div>`).join("");
  const bodyInner = `<div class=""><div class="questions"><h3 class="questions__title kontekstnaya-page__section-heading">Вопрос-ответ</h3> <div class="questions__blocks">${columns}</div></div></div>`;
  const bodyHtml = syncFaqBodyHtmlJsonLd(bodyInner);
  const faqJson = {
    mountId: "pr-faq-mounted",
    sectionClass: "pr-faq-section korporativnyj-faq-section",
    rootClass: "pr-faq-root korporativnyj-faq-root korporativnyj-faq-root--always-visible",
    bodyHtml,
  };
  fs.writeFileSync(path.join(JSON_DIR, "faq.json"), `${JSON.stringify(faqJson, null, 2)}\n`, "utf8");
  const shell = fs.readFileSync(FAQ_SHELL, "utf8");
  return (
    `<!-- FAQ ${SLUG}: json/services/${SLUG}/faq.json + service-faq.css. -->\n` +
    shell
      .replace("__MOUNT_ID__", faqJson.mountId)
      .replace("__SECTION_CLASS__", faqJson.sectionClass)
      .replace("__ROOT_CLASS__", faqJson.rootClass)
      .replace("__BODY_HTML__", stripNuxtScopedAttrs(bodyHtml))
  );
}

function publishTime(post) {
  const t = Date.parse(post.publishDate || "");
  return Number.isFinite(t) ? t : 0;
}

function publishYear(post) {
  const t = publishTime(post);
  return t ? new Date(t).getUTCFullYear() : 0;
}

function pickPostsBySlugs(posts, slugs) {
  const picked = [];
  const seen = new Set();
  for (const slug of slugs) {
    const p = posts.find((x) => slugFromHref(x.href) === slug);
    if (!p || publishYear(p) < MIN_PUBLISH_YEAR) continue;
    const h = hrefForPage(p.href);
    if (seen.has(h)) continue;
    seen.add(h);
    picked.push(p);
  }
  return picked;
}

function postIsPrTopic(post) {
  if (PR_TOPIC_RE.test(post.description || "") || PR_TOPIC_RE.test(post.subtitle || "")) return true;
  const slug = slugFromHref(post.href);
  if (!slug) return false;
  const file = path.join(ROOT, "json", "blog-articles", `${slug}.json`);
  if (!fs.existsSync(file)) return false;
  const j = JSON.parse(fs.readFileSync(file, "utf8"));
  return PR_TOPIC_RE.test(j.title || "") || PR_TOPIC_RE.test(j.description || "");
}

function selectPrBlogPosts(posts) {
  const picked = pickPostsBySlugs(posts, CURATED_BLOG_SLUGS);
  const seen = new Set(picked.map((p) => hrefForPage(p.href)));
  for (const p of posts
    .filter((x) => postIsPrTopic(x) && publishYear(x) >= MIN_PUBLISH_YEAR)
    .sort((a, b) => publishTime(b) - publishTime(a))) {
    const h = hrefForPage(p.href);
    if (seen.has(h)) continue;
    seen.add(h);
    picked.push(p);
    if (picked.length >= SLIDE_COUNT_MAX) break;
  }
  return picked.slice(0, SLIDE_COUNT_MAX);
}

function linkClasses(post) {
  const parts = ["case", post.linkClass === "dark-text" ? "dark-text" : "white-text"];
  if (post.isResource !== false) parts.push("case--resource", "case-cutted");
  parts.push("more-blog-case");
  for (const code of post.tagCodesNorm || []) {
    if (code === "article") parts.push("articles");
    else if (code) parts.push(code);
  }
  return parts.join(" ");
}

function renderBlogSlide(post, idx) {
  const tagsHtml = (post.tags || [])
    .map((t) => `<span data-v-410c06b6="" class="case__tag">\n                            ${escapeXml(t)}\n                          </span>`)
    .join("\n                          ");
  const imageUrl = post.media?.kind === "video" ? post.media.poster || post.media.image : post.media?.image;
  const slideClass = idx === 0 ? "swiper-slide blog-block__content-box-slide swiper-slide-active" : "swiper-slide blog-block__content-box-slide";
  const href = escapeXml(hrefForPage(post.href));
  const imgSrc = escapeXml(imageUrl || "");
  const alt = post.description ? escapeXml(post.description) : "";
  return `                    <div data-v-25bf775d="" class="${slideClass}" style="margin-right: 30px">
                      <a data-v-410c06b6="" data-v-25bf775d="" href="${href}" class="${linkClasses(post)}"
                        ><div data-v-410c06b6="" class="case__tags">${tagsHtml}</div>
                        <div data-v-410c06b6="" class="case__top">
                          <p data-v-410c06b6="" class="case__description case__description--static">${escapeXml(post.description)}</p>
                          <p data-v-410c06b6="" class="case__subtitle">${escapeXml(post.subtitle || "")}</p>
                        </div>
                        <div data-v-410c06b6="" class="case__media zoom">
                          <img fetchpriority="low" decoding="async" data-v-410c06b6="" src="${imgSrc}" loading="lazy" class="case__media--front" alt="${alt}" />
                        </div>
                        <div data-v-410c06b6="" class="blur"></div
                      ></a>
                    </div>`;
}

function buildBlogPartial(posts) {
  const template = fs.readFileSync(BLOG_TEMPLATE, "utf8");
  const wrapIdx = template.indexOf('class="swiper-wrapper"');
  const contentStart = template.indexOf(">", wrapIdx) + 1;
  const lastBox = template.indexOf('class="blog-box blog-box__last"');
  const tailStart = template.lastIndexOf("<div", lastBox);
  const slides = posts.map((p, i) => renderBlogSlide(p, i)).join("\n");
  let inner = `${template.slice(0, contentStart)}\n${slides}\n${template.slice(tailStart)}`;
  inner = inner.replace(
    /<h2 data-v-56f85d51="" class="services__title">Блог<\/h2>/,
    '<h2 data-v-56f85d51="" class="services__title kontekstnaya-page__section-heading">Блог</h2>',
  );
  return `<section class="page-constructor__section pr-blog-section korporativnyj-blog-section">
${inner.trim()}
</section>`;
}

function normalizeCaseRow(c) {
  return { ...c, href: hrefForPage(c.href) };
}

function caseIsPrTopic(c) {
  const desc = c.description || "";
  const tags = (c.tags || []).join(" ");
  return PR_CASE_TOPIC_RE.test(`${desc} ${tags}`) && PR_CASE_RESULT_RE.test(desc);
}

function pickPrCases() {
  const { cases } = JSON.parse(fs.readFileSync(CASES_ALL, "utf8"));
  const bySlug = new Map();
  for (const c of cases) {
    const slug = caseSlugFromHref(c.href);
    if (slug) bySlug.set(slug, normalizeCaseRow(c));
  }
  const picked = [];
  const seen = new Set();
  for (const slug of LEGACY_CASE_SLUGS) {
    const c = bySlug.get(slug);
    if (!c) throw new Error(`pr more-cases: нет кейса «${slug}» в cases-all.json`);
    picked.push(c);
    seen.add(slug);
  }
  for (const c of cases) {
    if (picked.length >= EXPECTED_CASES) break;
    const slug = caseSlugFromHref(c.href);
    if (!slug || seen.has(slug)) continue;
    if (!caseIsPrTopic(c)) continue;
    picked.push(normalizeCaseRow(c));
    seen.add(slug);
  }
  if (picked.length !== EXPECTED_CASES) {
    throw new Error(`pr more-cases: нужно ${EXPECTED_CASES} кейсов, есть ${picked.length}`);
  }
  return picked;
}

function buildMoreCasesPartial(cases) {
  const slides = cases.map((c) => renderMorSlide(c)).join("");
  const cta = buildCtaSlide("/case/all/");
  const gridCases = cases
    .map((c, i) => {
      const card = {
        ...c,
        description: processTypographyHtml(c.description, { force: true }).html.replace(/<[^>]+>/g, ""),
      };
      return renderGridCase(card, i);
    })
    .join("");
  const lastCase = `<a data-v-27a87df0="" href="/case/all/" class="last-case"><p data-v-27a87df0="">Смотреть больше&nbsp;кейсов</p> <img data-v-27a87df0="" src="/_sa/img/video__lastBlogGif.gif" loop="loop" playsinline="" loading="lazy" class="video_last"> <div data-v-27a87df0="" class="last-case__bg"></div></a>`;
  const grid = `<div data-v-27a87df0="" class="more-cases"><h3 class="services__title kontekstnaya-page__section-heading">Кейсы</h3> <div data-v-27a87df0="" class="more-cases__item">${gridCases} ${lastCase}</div></div>`;
  return `<section class="page-constructor__section pr-more-cases-section"><div data-v-27a87df0="" class="more-case-wr more-case-wr__main"><div data-v-27a87df0="" class="page__container"><h3 class="services__title kontekstnaya-page__section-heading more-case-wr__slider-heading">Кейсы</h3> <div data-v-38965faa="" data-v-27a87df0="" class="mor-cases-slider-wrapper more-cases--active"><div data-v-38965faa="" class="mor-cases-slider swiper-container"><div data-v-38965faa="" class="swiper-wrapper">${slides}${cta} </div> <div data-v-38965faa="" class="swiper-pagination"></div></div></div> ${grid}</div></div></section>`;
}

function buildAwardsPartial(awards) {
  const shell = fs.readFileSync(AWARDS_SHELL, "utf8");
  const slidesHtml = renderSlides(awards);
  let sectionHtml = shell
    .replace("__HEADING_ID__", "pr-awards-heading")
    .replace("__SLIDES_HTML__", slidesHtml)
    .replace('<section class="page-constructor__section">', '<section class="page-constructor__section pr-awards-section">');
  return `<!-- Награды /${SLUG}: json/services/${SLUG}/awards.json + home-awards.css. -->\n${sectionHtml}`;
}

function buildSynergyCards() {
  const synergy = blockByComponent("synergy-block").data;
  return synergy.blocks
    .flat()
    .filter((b) => b.title)
    .map((b) => {
      const fb = SYNERGY_IMG_FALLBACK[b.title] || SYNERGY_IMG_FALLBACK["Контекст-маркетинг"];
      const imgDesc = b.picture ? synergyStorageSrc(b.picture) : fb.desc;
      const imgTablet = b.tabletpicture ? synergyStorageSrc(b.tabletpicture) : fb.tablet;
      const imgMobile = b.mobilepicture ? synergyStorageSrc(b.mobilepicture) : fb.mobile;
      return {
        title: b.title,
        href: hrefForPage(b.url),
        description: legacyDesc(b.description),
        imgDesc,
        imgTablet,
        imgMobile,
      };
    });
}

function renderSynergyCard(card) {
  const href = escapeXml(card.href);
  return `<div data-v-627ccbce="" class="synergy__slide swiper-slide" style="margin-right: 30px;"><div data-v-627ccbce=""><div data-v-627ccbce="" class="synergy__card"><a data-v-627ccbce="" href="${href}" target="_blank" class="synergy__card-container synergy__card-container-img"><h3 data-v-627ccbce="">${escapeXml(card.title)}</h3> <p data-v-627ccbce="" class="synergy__card-description">${card.description}</p> <div data-v-627ccbce="" class="synergy__card-img-wr"><img data-v-627ccbce="" src="${escapeXml(card.imgDesc)}" alt="" loading="lazy" class="synergy__card-img synergy__card-img_desc"> <img data-v-627ccbce="" src="${escapeXml(card.imgTablet)}" alt="" loading="lazy" class="synergy__card-img synergy__card-img_tablet"> <img data-v-627ccbce="" src="${escapeXml(card.imgMobile)}" alt="" loading="lazy" class="synergy__card-img synergy__card-img_mobile"></div></a></div></div></div>`;
}

function buildSynergyPartial() {
  const cards = buildSynergyCards();
  const slides = cards.map(renderSynergyCard).join("");
  return `<!-- Синергия /${SLUG}. -->
<section class="page-constructor__section pr-synergy-section">
<div data-v-627ccbce="" class="synergy__text"><h2 data-v-627ccbce="" class="synergy__title kontekstnaya-page__section-heading">Синергия с&nbsp;услугами</h2></div>
<div data-v-627ccbce="" class="synergy__context-slider swiper-container">
<div data-v-627ccbce="" class="synergy__context-wrapper swiper-wrapper">
${slides}
</div>
<button data-v-627ccbce="" class="swiper-button-next" tabindex="0" role="button" aria-label="Next slide"><svg data-v-627ccbce="" width="12" height="20" viewBox="0 0 12 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path data-v-627ccbce="" d="M1.39844 0.900391L10.5908 10.0928L1.39844 19.2852" stroke="white" stroke-linecap="round" stroke-linejoin="round"></path></svg></button>
<button data-v-627ccbce="" class="swiper-button-prev swiper-button-disabled" style="transform: rotate(180deg);" tabindex="0" role="button" aria-label="Previous slide"><svg data-v-627ccbce="" width="12" height="20" viewBox="0 0 12 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path data-v-627ccbce="" d="M1.39844 0.900391L10.5908 10.0928L1.39844 19.2852" stroke="white" stroke-linecap="round" stroke-linejoin="round"></path></svg></button>
</div>
</section>`;
}

function mapAwards() {
  const awards = blockByComponent("awards-block").data.awards || [];
  return [...awards]
    .sort((a, b) => (b.sortblock || 0) - (a.sortblock || 0))
    .map((a) => ({
      rating: a.title,
      year: a.date,
      description: a.description,
      href: a.link || null,
    }));
}

function main() {
  if (!fs.existsSync(BLOGS_ALL)) throw new Error("Нет json/blogs-all.json");
  if (!fs.existsSync(CASES_ALL)) throw new Error("Нет json/cases-all.json — npm run build:cases");
  const { posts } = JSON.parse(fs.readFileSync(BLOGS_ALL, "utf8"));
  const blogPosts = selectPrBlogPosts(posts);
  if (!blogPosts.length) throw new Error("Нет материалов для блога PR");
  const prCases = pickPrCases();
  const moreCasesHtml = buildMoreCasesPartial(prCases);
  const awards = mapAwards();
  const forms = blockByComponent("forms-block").data;

  fs.mkdirSync(JSON_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(JSON_DIR, "inline-lead.json"),
    `${JSON.stringify({ titleHtml: inlineLeadTitle(forms), leadHtml: legacyDesc(forms.description) }, null, 2)}\n`,
    "utf8",
  );
  fs.writeFileSync(path.join(JSON_DIR, "more-cases.json"), `${JSON.stringify({ bodyHtml: moreCasesHtml }, null, 2)}\n`, "utf8");
  fs.writeFileSync(
    path.join(JSON_DIR, "awards.json"),
    `${JSON.stringify({ headingId: "pr-awards-heading", mountId: "sa-home-awards-mounted", awards }, null, 2)}\n`,
    "utf8",
  );
  fs.writeFileSync(
    path.join(JSON_DIR, "more-cases-manifest.json"),
    `${JSON.stringify(
      {
        builtAt: new Date().toISOString(),
        source: "legacy more-cases-block + PR-topic supplement",
        expected: EXPECTED_CASES,
        hrefs: prCases.map((c) => c.href),
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  fs.writeFileSync(
    path.join(JSON_DIR, "synergy.json"),
    `${JSON.stringify({ cards: buildSynergyCards() }, null, 2)}\n`,
    "utf8",
  );

  const outputs = [
    ["service-inline-lead-pr.html", buildInlineLeadPartial()],
    ["pr-team-block.html", buildTeamPartial()],
    ["clients-pr.html", buildClientsPartial()],
    ["faq-pr.html", buildFaqPartial()],
    ["blog-pr.html", buildBlogPartial(blogPosts)],
    ["more-cases-pr.html", moreCasesHtml],
    ["awards-pr.html", buildAwardsPartial(awards)],
    ["synergy-pr.html", buildSynergyPartial()],
  ];

  for (const [name, html] of outputs) {
    const out = processTypographyHtml(html, { force: true }).html;
    fs.writeFileSync(path.join(PARTIALS, name), `${out.trim()}\n`, "utf8");
    console.log("partial", name);
  }
  console.log("build-pr-tail-partials: ok");
}

main();

#!/usr/bin/env node
/**
 * Хвост /seo после «Команда»: клиенты, FAQ (контент prod, оболочка korporativnyj),
 * блог, кейсы, награды, синергия — из tmp/seo-prod-full.html + blogs-all.
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const { processTypographyHtml } = require("./typography-nbsp.cjs");
const { syncFaqBodyHtmlJsonLd, stripNuxtScopedAttrs } = require("./lib/build-faq-page-jsonld.cjs");
const { rewriteProdSliceBase } = require("./lib/assemble-service-common.cjs");
const { upgradeServiceClientsSectionHtml } = require("./lib/replace-service-clients-section.cjs");

const root = path.resolve(__dirname, "..");
const CAPTURE = path.join(root, "tmp", "seo-prod-full.html");
const PARTIALS = path.join(root, "html", "partials", "services");
const BLOGS_ALL = path.join(root, "json", "blogs-all.json");
const BLOG_TEMPLATE = path.join(root, "html", "partials", "section-blog.html");

const SEO_TOPIC_RE = /\bseo\b|seo-|\bпоисков|оптимизац/i;
const CURATED_BLOG_SLUGS = [
  "etapy-seo-prodvizheniya-sajta",
  "kompleksnyj-seo-audit-sajta-zachem-kogda-i-iz-chego-sostoit",
  "seo-optimizatsiya-internet-magazina",
  "kak-pravilno-pisat-seo-teksty",
  "seo-meditsinskih-sajtov",
];
const SLIDE_COUNT_MAX = 5;
const MIN_PUBLISH_YEAR = 2020;

function extractSectionContaining(html, needle) {
  const idx = html.indexOf(needle);
  if (idx < 0) return null;
  const secStart = html.lastIndexOf("<section", idx);
  if (secStart < 0) return null;
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

/** Связанные услуги после «Команда»: внешняя section + .dies.modern (не вложенная .prices). */
function extractRelatedServicesAfterTeam(html) {
  const teamIdx = html.indexOf("team-block");
  const searchFrom = teamIdx >= 0 ? teamIdx : 0;
  const diesIdx = html.indexOf('class="dies modern"', searchFrom);
  if (diesIdx < 0) return null;
  const secStart = html.lastIndexOf('<section class="page-constructor__section"', diesIdx);
  if (secStart < 0) return null;
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

function sanitizeSliceHtml(html) {
  let s = rewriteProdSliceBase(html);
  s = s.replace(/\s*swiper-container-initialized/g, "");
  s = s.replace(/\s*swiper-container-horizontal/g, "");
  s = s.replace(/\s*swiper-container-free-mode/g, "");
  s = s.replace(/<span class="swiper-notification"[^>]*><\/span>/g, "");
  s = s.replace(/\s*style="transition-duration:\s*0ms;?"/g, "");
  s = s.replace(/\s*style="height:\s*0px;?"/g, "");
  s = s.replace(/Кейсы комплексного маркетинга/g, "Кейсы");
  s = s.replace(/href="\/case\/all\/"/g, 'href="/case/all"');
  return s;
}

function innerClientsSection(sectionHtml) {
  const wrapIdx = sectionHtml.indexOf('class="clients-wrapper"');
  const secIdx = sectionHtml.indexOf('class="clients-new-section"');
  const anchor = wrapIdx >= 0 ? wrapIdx : secIdx;
  if (anchor < 0) return sectionHtml;
  const open = sectionHtml.indexOf("<div", anchor);
  if (open < 0) return sectionHtml;
  let depth = 0;
  let pos = open;
  while (pos < sectionHtml.length) {
    if (sectionHtml.slice(pos, pos + 4) === "<div") {
      depth += 1;
      pos += 4;
      continue;
    }
    if (sectionHtml.slice(pos, pos + 6) === "</div>") {
      depth -= 1;
      pos += 6;
      if (depth === 0) return sectionHtml.slice(open, pos);
      continue;
    }
    pos += 1;
  }
  return sectionHtml.slice(open);
}

function normalizeFaqBodyFromProd(sectionHtml) {
  const m = sectionHtml.match(/<div[^>]*\bclass="questions"[\s>]/i);
  if (!m) throw new Error("FAQ: нет .questions в capture");
  const open = m.index;
  let pos = open;
  let depth = 0;
  while (pos < sectionHtml.length) {
    if (sectionHtml.slice(pos, pos + 4) === "<div") depth += 1;
    else if (sectionHtml.slice(pos, pos + 6) === "</div>") {
      depth -= 1;
      if (depth === 0) {
        let inner = sectionHtml.slice(open, pos + 6);
        inner = inner.replace(
          /<h2[^>]*class="questions__title"[^>]*>[\s\S]*?<\/h2>/,
          '<h3 class="questions__title kontekstnaya-page__section-heading">Вопрос-ответ</h3>',
        );
        inner = inner.replace(/<div[^>]*class="block__content"[^>]*>/g, '<div class="block__content">');
        inner = inner.replace(/class="spoiler__content" style="[^"]*"/g, 'class="spoiler__content"');
        inner = stripNuxtScopedAttrs(inner);
        const body = `<div class="">${inner}</div>`;
        let out = syncFaqBodyHtmlJsonLd(body);
        out = out.replace(/145&nbsp;000&nbsp;рублей/g, "120&nbsp;000&nbsp;рублей");
        out = out.replace(/145 000 рублей/g, "120 000 рублей");
        out = out.replace(/при&nbsp;подготовки/g, "при&nbsp;подготовке");
        out = out.replace(/В&nbsp;чем разница/g, "В&nbsp;чём разница");
        out = out.replace(/SEO нацелено на&nbsp;/g, "SEO нацелена на&nbsp;");
        return out;
      }
    }
    pos += 1;
  }
  throw new Error("FAQ: не закрыт блок .questions");
}

function normalizeMoreCasesSection(sectionHtml) {
  let s = sectionHtml;
  if (!s.includes("more-case-wr__main")) {
    s = s.replace(
      /class="more-case-wr"/,
      'class="more-case-wr more-case-wr__main"',
    );
  }
  if (!s.includes("more-case-wr__slider-heading")) {
    s = s.replace(
      /<h2[^>]*class="case__title-mobile"[^>]*>Кейсы<\/h2>\s*<!---->\s*/,
      `<h3 class="services__title kontekstnaya-page__section-heading more-case-wr__slider-heading">Кейсы</h3> `,
    );
    s = s.replace(
      /<h2[^>]*class="case__title"[^>]*>Кейсы<\/h2>/,
      '<h3 class="services__title kontekstnaya-page__section-heading">Кейсы</h3>',
    );
  }
  const inner = s.replace(/^<section[^>]*>/, "").replace(/<\/section>\s*$/, "").trim();
  return `<section class="page-constructor__section seo-cases-section">${inner}</section>`;
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

function articleTopicMeta(slug) {
  const file = path.join(root, "json", "blog-articles", `${slug}.json`);
  if (!fs.existsSync(file)) return null;
  const j = JSON.parse(fs.readFileSync(file, "utf8"));
  return { title: j.title || "", description: j.description || "" };
}

function postIsSeoTopic(post) {
  if (SEO_TOPIC_RE.test(post.description || "")) return true;
  const slug = slugFromHref(post.href);
  if (!slug) return false;
  const meta = articleTopicMeta(slug);
  if (!meta) return false;
  return SEO_TOPIC_RE.test(meta.title) || SEO_TOPIC_RE.test(meta.description);
}

function publishTime(post) {
  const t = Date.parse(post.publishDate || "");
  return Number.isFinite(t) ? t : 0;
}

function publishYear(post) {
  const t = publishTime(post);
  return t ? new Date(t).getUTCFullYear() : 0;
}

function selectSeoBlogPosts(posts) {
  const topic = posts.filter((p) => postIsSeoTopic(p) && publishYear(p) >= MIN_PUBLISH_YEAR);
  const seen = new Set(topic.map((p) => hrefForPage(p.href)));
  const extra = [];
  for (const slug of CURATED_BLOG_SLUGS) {
    const p = posts.find((x) => slugFromHref(x.href) === slug);
    if (!p || publishYear(p) < MIN_PUBLISH_YEAR) continue;
    const h = hrefForPage(p.href);
    if (seen.has(h)) continue;
    seen.add(h);
    extra.push(p);
  }
  return [...topic, ...extra]
    .sort((a, b) => publishTime(b) - publishTime(a))
    .slice(0, SLIDE_COUNT_MAX);
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
    .map(
      (t) =>
        `<span data-v-410c06b6="" class="case__tag">\n                            ${escapeXml(t)}\n                          </span>`,
    )
    .join("\n                          ");
  const imageUrl =
    post.media?.kind === "video" ? post.media.poster || post.media.image : post.media?.image;
  const slideClass =
    idx === 0
      ? "swiper-slide blog-block__content-box-slide swiper-slide-active"
      : "swiper-slide blog-block__content-box-slide";
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
  const inner = `${template.slice(0, contentStart)}\n${slides}\n${template.slice(tailStart)}`;
  const blogLead =
    "Материалы про&nbsp;<a href=\"/seo\" class=\"seo-text-link\">SEO-продвижение сайта</a>: этапы работ, аудит, оптимизация интернет-магазинов и&nbsp;медицинских проектов.";
  const withLead = inner.replace(
    /<p data-v-56f85d51="" class="services__description">[\s\S]*?<\/p>/,
    `<p data-v-56f85d51="" class="services__description">\n                    ${blogLead}\n                  </p>`,
  );
  return `<section class="page-constructor__section seo-blog-section">
${withLead.trim()}
</section>`;
}

function main() {
  if (!fs.existsSync(CAPTURE)) {
    console.error("Нет", CAPTURE, "— node scripts/capture-prod-seo-full-html.cjs");
    process.exit(1);
  }
  const raw = fs.readFileSync(CAPTURE, "utf8");

  const relatedSec = extractRelatedServicesAfterTeam(raw);
  if (!relatedSec || !relatedSec.includes("SEO YouTube")) {
    console.error("dies modern / SEO YouTube после команды не найден в capture");
    process.exit(1);
  }
  let relatedBlock = sanitizeSliceHtml(relatedSec);
  relatedBlock = relatedBlock.replace(
    /^<section class="page-constructor__section">/,
    '<section class="page-constructor__section seo-related-services-section">',
  );
  fs.writeFileSync(
    path.join(PARTIALS, "seo-related-services-block.html"),
    `<!-- Связанные услуги после «Команда» /seo: prod capture. -->\n${processTypographyHtml(relatedBlock, { force: true }).html}\n`,
    "utf8",
  );
  console.log("Wrote html/partials/services/seo-related-services-block.html");

  const clientsSec = extractSectionContaining(raw, 'class="clients-wrapper"');
  if (!clientsSec) {
    console.error("clients-wrapper не найден в capture");
    process.exit(1);
  }
  let clientsInner = sanitizeSliceHtml(innerClientsSection(clientsSec));
  if (!clientsInner.includes('class="clients-wrapper"')) {
    clientsInner = `<div data-v-08586076="" class="clients-wrapper">${clientsInner}</div>`;
  }
  let clientsBlock = `<!-- Клиенты /seo: prod capture. -->\n<section class="page-constructor__section seo-clients-section">\n${clientsInner}\n</section>`;
  clientsBlock = upgradeServiceClientsSectionHtml(clientsBlock, { extraSectionClass: "seo-clients-section" });
  fs.writeFileSync(path.join(PARTIALS, "clients-seo.html"), `${clientsBlock}\n`, "utf8");
  console.log("Wrote html/partials/services/clients-seo.html");

  const faqSec = extractSectionContaining(raw, "questions__title");
  if (!faqSec) {
    console.error("FAQ не найден в capture");
    process.exit(1);
  }
  const faqJsonPath = path.join(root, "json", "services", "seo", "faq.json");
  const faqBody = normalizeFaqBodyFromProd(sanitizeSliceHtml(faqSec));
  const faqData = {
    mountId: "korporativnyj-faq-mounted",
    sectionClass: "korporativnyj-faq-section",
    rootClass: "korporativnyj-faq-root korporativnyj-faq-root--always-visible",
    bodyHtml: processTypographyHtml(faqBody, { force: true }).html,
  };
  fs.mkdirSync(path.dirname(faqJsonPath), { recursive: true });
  fs.writeFileSync(faqJsonPath, `${JSON.stringify(faqData, null, 2)}\n`, "utf8");
  console.log("Wrote json/services/seo/faq.json");

  if (!fs.existsSync(BLOGS_ALL)) {
    console.warn("Нет blogs-all — пропуск blog-seo.html (npm run build:blog-prereq)");
  } else {
    const { posts } = JSON.parse(fs.readFileSync(BLOGS_ALL, "utf8"));
    const top = selectSeoBlogPosts(posts);
    if (!top.length) {
      console.warn("Нет SEO-тематики в blogs-all — blog-seo не создан");
    } else {
      const blogHtml = processTypographyHtml(buildBlogPartial(top), { force: true }).html;
      fs.writeFileSync(path.join(PARTIALS, "blog-seo.html"), `${blogHtml}\n`, "utf8");
      console.log("Wrote html/partials/services/blog-seo.html —", top.length, "карточек");
    }
  }

  execSync("node scripts/build-seo-more-cases.cjs", { cwd: root, stdio: "inherit" });

  execSync("node scripts/build-service-awards-partials.cjs", { cwd: root, stdio: "inherit" });
  const awardsPartial = path.join(PARTIALS, "awards-seo.html");
  if (!fs.existsSync(awardsPartial)) {
    console.error("awards-seo.html не создан — build-service-awards-partials");
    process.exit(1);
  }
  console.log("Wrote html/partials/services/awards-seo.html (shell + json/services/seo/awards.json)");

  const synSec = extractSectionContaining(raw, 'class="synergy-section"');
  if (!synSec) {
    console.error("synergy-section не найден");
    process.exit(1);
  }
  const synInner = sanitizeSliceHtml(
    synSec.replace(/^<section[^>]*>/, "").replace(/<\/section>\s*$/, ""),
  );
  fs.writeFileSync(
    path.join(PARTIALS, "synergy-seo.html"),
    `<!-- Синергия /seo: prod capture (synergy-section). -->\n<section class="page-constructor__section seo-synergy-section">\n${processTypographyHtml(synInner, { force: true }).html}\n</section>\n`,
    "utf8",
  );
  console.log("Wrote html/partials/services/synergy-seo.html");

  execSync("node scripts/build-service-faq-partials.cjs", { cwd: root, stdio: "inherit" });
  console.log("build-seo-tail-partials: ok");
}

main();

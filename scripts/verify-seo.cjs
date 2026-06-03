#!/usr/bin/env node
/**
 * Smoke: /seo — static shell без Nuxt runtime (как kompleksnoye-prodvizheniye).
 */
const fs = require("fs");
const path = require("path");
const { loadServiceConfig } = require("./lib/load-service-config.cjs");

const root = path.resolve(__dirname, "..");
const SEO_HERO_DESKTOP = "/_sa/img/services/seo/hero/hero.webp";
const SEO_HERO_MOBILE = "/_sa/img/services/seo/hero/hero__m.webp";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function main() {
  const cfg = loadServiceConfig("seo");
  const html = fs.readFileSync(cfg.indexPath, "utf8");
  const stack = fs.readFileSync(path.join(root, "css", cfg.assemble.cssStack), "utf8");

  assert(!html.includes('id="__nuxt"'), "нет #__nuxt");
  assert(!html.includes('id="__layout"'), "нет #__layout");
  assert(!html.includes("/_nuxt/"), "нет /_nuxt/");
  assert(/class="page-constructor seo-page"/.test(html), "обёртка seo-page");
  assert(html.includes("seo-static-stack.css"), "CSS stack");
  assert(html.includes("korporativnyj-nuxt.bundle.css"), "Nuxt CSS bundle (scoped, не runtime)");
  assert(html.includes('href="https://serenity.agency/seo"'), "canonical /seo");
  assert(html.includes("SEO-продвижение"), "H1/заголовок");
  assert(!html.includes('href="/services/search"'), "нет legacy /services/search");
  assert(stack.includes("korporativnyj-sajt-static-stack"), "stack импортирует korporativnyj");
  assert(
    stack.includes("content-block__grid--desc") && stack.includes("display: flex !important"),
    "override desc-сетки на десктопе",
  );
  assert(html.includes(SEO_HERO_DESKTOP), "hero desktop path");
  assert(html.includes(SEO_HERO_MOBILE), "hero mobile path");
  assert(fs.existsSync(path.join(root, "img/services/seo/hero/hero.webp")), "hero.webp на диске");
  assert(fs.existsSync(path.join(root, "img/services/seo/hero/hero__m.webp")), "hero__m.webp на диске");
  assert(stack.includes("margin-bottom: 42px"), "hero: отступ h1 → подзаголовок");
  assert(stack.includes("service-hero-header.css"), "hero: service-hero-header");
  assert(
    stack.includes("numbered-header__subtitle-column") && stack.includes("max-width: 50%"),
    "колонки заголовок/описание как kompleksnoye",
  );
  assert(stack.includes(".facts .facts-header .lead") && stack.includes("max-width: none"), "facts: lead без 520px");

  const missing = [];
  for (const m of html.matchAll(/\/_sa\/img\/(storage__[a-zA-Z0-9._-]+\.(?:webp|jpg|jpeg|png|gif|mp4))/g)) {
    const name = m[1];
    if (!fs.existsSync(path.join(root, "img", name))) missing.push(name);
  }
  assert(missing.length === 0, `storage на диске: ${missing.slice(0, 3).join(", ")}`);

  assert(html.includes("cases-block__swiper-slide-contant-image"), "cases-block: превью кейса");

  assert(html.includes('id="sa-inline-lead-root"'), "инлайн-форма sa-inline-lead");
  assert(!html.includes('class="forms modern"'), "нет legacy forms modern");
  assert(html.includes("SEO-продвижение</span>"), "форма: заголовок SEO-продвижение");
  assert(
    /От(?:&nbsp;|\s)120(?:&nbsp;|\s)000(?:&nbsp;|\s)?₽/.test(html),
    "форма: От 120 000 ₽",
  );
  assert(html.includes("team__members-slider"), "команда: слайдер как kompleksnoye");
  assert(html.includes("seo-team-section"), "команда: seo-team-section");
  const formIdx = html.indexOf("sa-service-lead-section");
  const teamIdx = html.indexOf("seo-team-section");
  assert(formIdx >= 0 && teamIdx > formIdx, "порядок: форма перед командой");

  assert(html.includes("seo-clients-section"), "блок «Наши клиенты»");
  assert(html.includes("korporativnyj-faq-section"), "FAQ: korporativnyj-faq-section");
  assert(html.includes("seo-blog-section") || html.includes("blog-block-mainstr"), "блок «Блог»");
  assert(html.includes("more-case-wr__slider-heading"), "кейсы: заголовок h3");
  assert(!html.includes("Кейсы комплексного маркетинга"), "кейсы: без заголовка комплексного маркетинга");
  assert(html.includes("seo-cases-section"), "кейсы: seo-cases-section");

  const manifestPath = path.join(root, "json", "services", "seo", "more-cases-manifest.json");
  assert(fs.existsSync(manifestPath), "more-cases-manifest.json — npm run build:seo-more-cases");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const expectedHrefs = manifest.hrefs || [];
  assert(expectedHrefs.length === 8, "more-cases-manifest: 8 SEO-кейсов");
  const casesChunk = html.slice(html.indexOf("seo-cases-section"));
  const gridChunk = casesChunk.slice(casesChunk.indexOf("more-cases__item"));
  const gridHrefs = [
    ...gridChunk.matchAll(/<a data-v-c0adc676="" href="(\/case\/[^"]+)"/g),
  ].map((m) => m[1]);
  assert(
    gridHrefs.length === expectedHrefs.length,
    `кейсы: ${expectedHrefs.length} карточек в сетке (сейчас ${gridHrefs.length})`,
  );
  for (let i = 0; i < expectedHrefs.length; i++) {
    assert(
      gridHrefs[i] === expectedHrefs[i],
      `кейсы: порядок [${i}] ожидали ${expectedHrefs[i]}, в сетке ${gridHrefs[i]}`,
    );
  }
  assert(!gridHrefs.includes("/case/toofli"), "кейсы: без Toofli (SMM)");
  for (const bad of [
    "/case/all/boca",
    "/case/darkrain-store",
    "/case/all/sytnie-ugodia",
    "/case/evrostroj",
    "/case/toofli",
    "/case/all/miramarhome",
  ]) {
    assert(!gridHrefs.includes(bad), `кейсы: без ${bad}`);
  }
  assert(gridHrefs.includes("/case/awm-trade"), "кейсы: AWM-Trade");
  assert(
    gridHrefs.includes("/case/all/skladno-internet-magazin-mebeli"),
    "кейсы: Складно",
  );
  assert(gridHrefs.includes("/case/all/minisklad"), "кейсы: Минисклад (SEO, рост трафика)");
  assert(html.includes("seo-awards-section") || html.includes('class="awards__title"'), "блок «Награды»");
  assert(html.includes('id="sa-home-awards-mounted"'), "награды: shell #sa-home-awards-mounted для ленты");
  assert(!html.includes('class="swiper-slider swiper-container"'), "награды: без prod swiper-slider");
  const casesTailIdx = html.indexOf("seo-cases-section");
  const beforeTail = casesTailIdx > 0 ? html.slice(0, casesTailIdx) : html;
  assert(beforeTail.includes(">AWM-Trade</h3>"), "inline cases-block: AWM-Trade");
  assert(!/cases-block__swiper-slide-title[^>]*>ИРиПА<\/h3>/.test(html), "inline cases-block: без ИРиПА (есть в сетке внизу)");
  assert(html.includes("seo-synergy-section") || html.includes("synergy-section"), "синергия");
  assert(
    html.includes("seo-related-services-section") && html.includes("SEO YouTube"),
    "связанные услуги после команды (SEO YouTube, техподдержка, конверсия)",
  );

  const relatedIdx = html.indexOf("seo-related-services-section");
  const clientsIdx = html.indexOf("seo-clients-section");
  const faqIdx = html.indexOf("korporativnyj-faq-section");
  const blogIdx = Math.max(html.indexOf("seo-blog-section"), html.indexOf("blog-block-mainstr"));
  const casesIdx = html.indexOf("more-case-wr__slider-heading");
  const awardsIdx = Math.max(html.indexOf("seo-awards-section"), html.indexOf('class="awards__title"'));
  const synergyIdx = Math.max(html.indexOf("seo-synergy-section"), html.indexOf("synergy-section"));
  assert(teamIdx > 0 && relatedIdx > teamIdx, "порядок: связанные услуги после команды");
  assert(clientsIdx > relatedIdx, "порядок: клиенты после связанных услуг");
  assert(faqIdx > clientsIdx, "порядок: FAQ после клиентов");
  assert(blogIdx > faqIdx, "порядок: блог после FAQ");
  assert(casesIdx > blogIdx, "порядок: кейсы после блога");
  assert(awardsIdx > casesIdx, "порядок: награды после кейсов");
  assert(synergyIdx > awardsIdx, "порядок: синергия после наград");

  const MS = "<!-- SEO-MAIN-START -->";
  const ME = "<!-- SEO-MAIN-END -->";
  const i0 = html.indexOf(MS);
  const i1 = html.indexOf(ME);
  if (i0 >= 0 && i1 > i0) {
    const main = html.slice(i0 + MS.length, i1);
    const secO = (main.match(/<section/g) || []).length;
    const secC = (main.match(/<\/section>/g) || []).length;
    const divO = (main.match(/<div/g) || []).length;
    const divC = (main.match(/<\/div>/g) || []).length;
    assert(secO === secC, `main: section ${secO}/${secC}`);
    assert(divO === divC, `main: div ${divO}/${divC}`);
    const teamEnd = main.indexOf("seo-team-section");
    const teamClose = teamEnd >= 0 ? main.indexOf("</section>", teamEnd) : -1;
    const relatedStart = main.indexOf("seo-related-services-section");
    const clientsStart = main.indexOf("seo-clients-section");
    if (teamClose >= 0 && relatedStart > teamClose) {
      const betweenTeamRelated = main.slice(teamClose, relatedStart);
      assert(
        !/<\/section>\s*<\/div>\s*<\/div>\s*<\/section>/.test(betweenTeamRelated),
        "нет лишних </div></div></section> между командой и связанными услугами",
      );
    }
    if (relatedStart > 0 && clientsStart > relatedStart) {
      const relatedEnd = main.indexOf("</section>", relatedStart);
      const betweenRelatedClients = main.slice(
        relatedEnd > 0 ? relatedEnd + "</section>".length : relatedStart,
        clientsStart,
      );
      assert(
        !/<\/section>\s*<\/div>\s*<\/div>\s*<\/section>/.test(betweenRelatedClients),
        "нет лишних </div></div></section> между связанными услугами и клиентами",
      );
    }
    assert(!/class="[^"]*?><div/.test(main), "нет оборванных class перед <div (cases-block)");
  }

  const teamPartial = path.join(root, "html/partials/services/seo-team-block.html");
  if (fs.existsSync(teamPartial)) {
    const tp = fs.readFileSync(teamPartial, "utf8");
    const divO = (tp.match(/<div/g) || []).length;
    const divC = (tp.match(/<\/div>/g) || []).length;
    assert(divO === divC, `seo-team-block: div ${divO}/${divC}`);
  }

  console.log("verify-seo: ok");
}

try {
  main();
} catch (e) {
  console.error("verify-seo:", e.message || e);
  process.exit(1);
}

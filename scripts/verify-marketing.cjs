#!/usr/bin/env node
/**
 * Smoke-тест для /services/marketing — тот же каркас, что /targeting; свои SEO и герой.
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const { loadServiceConfig } = require("./lib/load-service-config.cjs");
const { MARKETING_H2 } = require("./lib/marketing-h2-anchors.cjs");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function read(relPath) {
  return fs.readFileSync(path.join(root, relPath), "utf8");
}

function fileExists(relPath) {
  return fs.existsSync(path.join(root, relPath));
}

async function run() {
  loadServiceConfig("marketing");
  const html = read("services/marketing/index.html");

  assert(html.includes("Комплексный маркетинг"), "H1: Комплексный маркетинг");
  assert(
    html.includes(
      "<title>Комплексный маркетинг в Москве и Петербурге для бизнеса — Услуги — Serenity</title>",
    ),
    "<title> marketing SEO",
  );
  assert(
    html.includes(
      'meta name="description" content="Заказать услуги комплексного маркетинга в СПБ и Москве',
    ),
    "description marketing",
  );
  assert(
    html.includes('property="og:title" content="Комплексный маркетинг"'),
    "og:title marketing",
  );
  assert(
    html.includes(
      'property="og:description" content="Синергия маркетинговых инструментов многократно увеличивает их эффективность для бизнеса.<br /> "',
    ),
    "og:description marketing",
  );
  assert(
    html.includes(
      'property="og:image" content="https://serenity.agency/admin/wp-content/uploads/2018/10/10-1.jpg"',
    ),
    "og:image marketing",
  );
  assert(
    /<h1[^>]*>\s*Комплексный маркетинг/.test(html),
    "<h1> Комплексный маркетинг",
  );
  const mainStart = html.indexOf("<!-- MARKETING-MAIN-START -->");
  const mainEnd = html.indexOf("<!-- MARKETING-MAIN-END -->");
  const main = html.slice(mainStart, mainEnd);
  assert(!main.includes("Таргетированная реклама — гибкий формат"), "нет блока .facts targeting");
  assert(!main.includes("facts__items--desktop"), "нет facts__items targeting");
  const BRAND_H2 =
    '<h2 data-v-490c7534=""><a class="marketing-section__link" href="/services#services-branding">Бренд</a></h2>';
  assert(
    /<h1 class="c-title-block__title"[^>]*>[^<]*Комплексный маркетинг/.test(main),
    "герой H1: Комплексный маркетинг",
  );
  assert(html.includes("targeting-nuxt.bundle.css"), "CSS: targeting-nuxt.bundle.css");
  assert(fileExists("css/targeting-nuxt.bundle.css"), "файл targeting-nuxt.bundle.css");
  assert(html.includes("targeting-static-stack.css"), "CSS: targeting-static-stack.css");
  assert(!html.includes("marketing-static-stack.css"), "без marketing-static-stack.css");
  assert(/class="page-constructor targeting-page"/.test(html), "обёртка targeting-page");
  assert(!html.includes("marketing-kontekst-on-targeting.css"), "без kontekst CSS overlay");
  assert(!main.includes("targeting-faq-mounted"), "нет FAQ /targeting");
  assert(!main.includes("targeting-faq-section"), "нет секции Вопрос-ответ");
  assert(!main.includes("Будут ли доступы к рекламным кампаниям"), "нет вопросов FAQ targeting");
  assert(html.includes('id="sa-inline-lead-root"'), "inline lead");
  assert(html.includes("more-case-wr more-case-wr__main"), "кейсы more-case-wr__main");
  assert(html.includes("marketing-cases-section"), "кейсы: marketing-cases-section");
  assert(main.includes('class="more-cases"'), "кейсы: сетка .more-cases (desktop)");
  assert(main.includes('class="case__description"'), "кейсы: карточки в сетке");
  assert(html.includes("cases-block__header-subtitle"), "кейсы: шапка с подзаголовком");
  assert(
    /брендформанса|брендформанс/.test(html) && /Darkrain/.test(html),
    "кейсы: контент marketing (не только targeting capture)",
  );
  assert(html.includes("/_sa/img/video__lastBlogGif.gif"), "кейсы: CTA gif под /_sa/img/");
  assert(!html.includes('src="/video/lastBlogGif.gif"'), "кейсы: без битого /video/lastBlogGif.gif");
  assert(html.includes('id="marketing-awards-heading"'), "награды: marketing-awards-heading");
  assert(html.includes("marketing-awards__lead"), "награды: lead с ссылкой на главную");
  assert(html.includes("sa-home-awards-mounted"), "награды: home awards mount");
  assert(html.includes('class="awards__card"'), "награды: карточки awards__card");
  assert(
    /инфлюенс-маркетингу/.test(html) && /отдыха и&nbsp;досуга|отдыха и досуга/.test(html),
    "награды: слайды с главной (marketing)",
  );
  assert(!main.includes("Наш подход"), "блок «Наш подход» заменён");
  assert(main.includes('href="/services#services-strategy">Стратегия</a>'), "блок стратегии: заголовок-ссылка");
  assert(main.includes('href="/kontekstnaya_reklama">Контекстная реклама</a>'), "инструменты: ссылка контекст");
  assert(main.includes('href="/targeting">Таргетинг'), "инструменты: ссылка таргетинг");
  assert(main.includes('href="/services/smm">SMM</a>'), "каналы: ссылка SMM");
  assert(
    /numbered-header__bullet">1<\/div>[\s\S]{0,400}>Стратегия</.test(main),
    "блок стратегии: нумерация 1",
  );
  assert(main.includes(">Бренд-стратегия<"), "блок бренд-стратегии: заголовок");
  assert(main.includes("Идентификация") && main.includes("Коммуникации"), "бренд-стратегия: колонки");
  const brandStratIdx = main.indexOf(">Бренд-стратегия<");
  const stratIdx = main.indexOf(">Стратегия<");
  assert(main.includes(">Контент-стратегия<"), "блок контент-стратегии: заголовок");
  assert(
    main.includes("Способы коммуникации") && main.includes("Дизайн-система") && main.includes(">Медиаплан<"),
    "контент-стратегия: колонки",
  );
  const contentIdx = main.indexOf(">Контент-стратегия<");
  assert(brandStratIdx > stratIdx, "порядок: бренд-стратегия после Стратегия");
  assert(contentIdx > brandStratIdx, "порядок: контент-стратегия после бренд-стратегии");
  assert(main.includes(BRAND_H2), "блок Бренд: заголовок");
  assert(
    /numbered-header__bullet">2<\/div>[\s\S]{0,400}>Бренд</.test(main),
    "блок Бренд: нумерация 2",
  );
  assert(
    main.includes("Благодаря сильному бренду вас узнают") &&
      main.includes("Масштабируемость") &&
      main.includes(">Цель<"),
    "блок Бренд: тексты и колонки",
  );
  const brandIdx = main.indexOf(BRAND_H2);
  assert(brandIdx > contentIdx, "порядок: Бренд после контент-стратегии");
  assert(!main.includes('id="marketing-strategy"'), "без kontekst marketing-strategy");
  assert(main.includes(">Увеличение известности бренда<"), "блок увеличения известности: заголовок");
  assert(
    main.includes("Цифровая аудитория") && main.includes("PR-продвижение") && main.includes("Блоги и&nbsp;порталы"),
    "увеличение известности: 6 карточек",
  );
  assert(main.includes("marketing-brand-awareness-grid"), "увеличение известности: сетка 3×2");
  const awarenessIdx = main.indexOf(">Увеличение известности бренда<");
  assert(awarenessIdx > brandIdx, "порядок: увеличение известности после Бренд");
  const SITE_H2 =
    '<h2 data-v-490c7534=""><a class="marketing-section__link" href="/services#services-sites">Сайт</a></h2>';
  assert(main.includes(SITE_H2), "блок Сайт: заголовок");
  assert(
    main.includes("Маркетинговый подход") && main.includes("Соединение с&nbsp;CRM") && main.includes("Прототипирование"),
    "блок Сайт: колонки",
  );
  const siteIdx = main.indexOf(SITE_H2);
  assert(siteIdx > awarenessIdx, "порядок: Сайт после увеличения известности");
  const PROMOTION_H2 =
    '<h2 data-v-490c7534=""><a class="marketing-section__link" href="/services#services-promotion">Измеримое продвижение</a></h2>';
  assert(main.includes(PROMOTION_H2), "блок измеримое продвижение: заголовок");
  assert(
    /numbered-header__bullet">3<\/div>[\s\S]{0,500}>Измеримое продвижение</.test(main),
    "измеримое продвижение: нумерация 3",
  );
  assert(
    main.includes("Максимально увеличиваем число заявок") &&
      main.includes(">Измеримость<") &&
      main.includes("Влияние на&nbsp;бренд"),
    "измеримое продвижение: тексты и колонки",
  );
  const promotionIdx = main.indexOf(PROMOTION_H2);
  assert(promotionIdx > siteIdx, "порядок: измеримое продвижение после Сайт");
  assert(main.includes('<h2 data-v-490c7534="">Реклама</h2>'), "блок Реклама");
  assert(main.includes("marketing-advertising-grid"), "Реклама: сетка 3 колонки");
  assert(main.includes('<h2 data-v-490c7534="">Инструменты</h2>'), "блок Инструменты");
  assert(
    main.includes(
      '<h2 data-v-490c7534=""><a class="marketing-section__link" href="/services/content">Контент-маркетинг</a></h2>',
    ),
    "блок Контент-маркетинг",
  );
  assert(
    main.includes('<h2 data-v-490c7534="">Каналы контент-маркетинга</h2>'),
    "блок Каналы контент-маркетинга",
  );
  assert(
    main.includes("Построение диалога с&nbsp;аудиторией") &&
      main.includes("Email-маркетинг") &&
      main.includes("создаём ботов"),
    "каналы контент-маркетинга: колонки SMM, Email, Мессенджеры",
  );
  assert(
    main.includes("Контекстную рекламу видят пользователи") &&
      main.includes("поисковых системах интернета"),
    "Инструменты: текст контекстной рекламы",
  );
  const adIdx = main.indexOf('<h2 data-v-490c7534="">Реклама</h2>');
  const toolsIdx = main.indexOf('<h2 data-v-490c7534="">Инструменты</h2>');
  const cmIdx = main.indexOf('href="/services/content">Контент-маркетинг</a>');
  const channelsIdx = main.indexOf('<h2 data-v-490c7534="">Каналы контент-маркетинга</h2>');
  const seoIdx = main.indexOf('href="/services/seo">SEO</a>');
  const salesIdx = main.indexOf('href="/services/salesmarketing">Продажи</a>');
  assert(
    adIdx > promotionIdx &&
      toolsIdx > adIdx &&
      cmIdx > toolsIdx &&
      channelsIdx > cmIdx &&
      seoIdx > channelsIdx &&
      salesIdx > seoIdx,
    "порядок: … → каналы → SEO → продажи",
  );
  assert(
    /numbered-header__bullet">4<\/div>[\s\S]{0,500}>Продажи</.test(main),
    "продажи: нумерация 4",
  );
  assert(main.includes("marketing-sales-grid"), "продажи: сетка");
  const salesSlice = main.match(/marketing-sales-grid[\s\S]*?<\/section>/)?.[0] || "";
  assert(!salesSlice.includes('aria-hidden="true"'), "продажи: без пустой col-4");
  assert(
    salesSlice.includes("Автоматизируем процессы") && salesSlice.includes("Соединяем маркетинг"),
    "продажи: все 4 карточки в desc-сетке",
  );
  assert(
    main.includes("Автоматизируем процессы") &&
      main.includes("приносит больше продаж") &&
      main.includes("Соединяем маркетинг и&nbsp;продажи"),
    "продажи: описание и карточки",
  );
  assert(main.includes('href="/services/seo">SEO</a>') && main.includes("Рост целевого трафика"), "блок SEO");
  assert(
    main.includes("Оптимизируем сайт так, чтобы его находили в&nbsp;поисковиках") &&
      main.includes("Усиление бренда") &&
      main.includes("органического трафика"),
    "SEO: описание и колонки",
  );
  assert(!main.includes("Этапы таргетинга"), "нет блока «Этапы таргетинга» (только /targeting)");
  assert(!main.includes('<h2 data-v-490c7534="">Исследование</h2>'), "нет блока «Исследование»");
  assert(!main.includes('<h2 data-v-490c7534="">Первые шаги</h2>'), "нет блока «Первые шаги»");
  assert(!main.includes('<h2 data-v-490c7534="">Ведение</h2>'), "нет блока «Ведение»");
  assert(!main.includes('<h2 data-v-490c7534="">Оптимизация</h2>'), "нет блока «Оптимизация» (этапы targeting)");
  assert(!main.includes("advantages-card__title"), "нет блока «Преимущества работы с нами»");
  const channelsSlice = main.slice(
    channelsIdx,
    main.indexOf("</section>", channelsIdx) + "</section>".length,
  );
  assert(
    !channelsSlice.includes("numbered-header__subtitle-column") ||
      !channelsSlice.includes("content-block__desc"),
    "каналы контент-маркетинга: без описания в шапке",
  );
  assert(
    main.includes("Маркетинговая стратегия выявляет ваши конкурентные преимущества"),
    "блок стратегии: lead",
  );
  assert(main.includes("Позиционирование") && main.includes("Медиапланирование"), "блок стратегии: карточки");
  assert(stratIdx >= 0, "Стратегия в main");
  const stratSlice = main.slice(stratIdx, stratIdx + 4000);
  assert(!stratSlice.includes("content-block__slider"), "стратегия: без горизонтального слайдера");
  assert(!html.includes("kontekst-synergy-root"), "нет блока «Синергия с услугами»");
  assert(!main.includes("case-slider__wrapper"), "герой: без коллажа case-slider");
  assert(html.includes("overrides.parity-sync.css"), "CSS: parity-sync");
  assert(html.includes("<!-- MARKETING-MAIN-START -->"), "маркер MAIN-START");
  assert(html.includes("<!-- MARKETING-MAIN-END -->"), "маркер MAIN-END");
  assert(!html.includes("marketing-static-stack"), "без отдельного marketing CSS");
  assert(!html.includes("marketing-kontekst-section"), "без kontekst-section (targeting-каркас)");
  assert(!html.includes("marketing-synergy-diagram"), "без legacy диаграммы");
  assert(!html.includes("jumbotron-img-aurora__title"), "без legacy jumbotron hero");
  assert(!html.includes("home-cases-auto.js"), "без home-cases-auto.js");
  assert(!html.includes("mod.calltouch.ru"), "без Calltouch");
  assert(
    html.includes('rel="canonical" href="https://serenity.agency/services/marketing"'),
    "canonical /services/marketing",
  );

  assert(!main.includes("team-block"), "нет блока «Команда» (дубль из /targeting)");
  assert(!main.includes('<h2 data-v-490c7534="">Команда</h2>'), "нет заголовка «Команда»");
  assert(
    !main.includes("AWM-Trade") || main.includes("marketing-case-slider-seo"),
    "AWM-Trade только в слайдере после SEO, не в targeting cases-block",
  );
  assert(!main.includes("marketing-cm-wide-slider"), "нет cm-wide-slider (подарочный сертификат) после «Бренд»");
  assert(!main.includes("/_sa/img/services/marketing/cm/cm-slide1.jpg"), "нет cm-slide слайдов");
  const brandStratH2Idx = main.indexOf('href="/services/brend-strategy">Бренд-стратегия</a>');
  assert(brandStratH2Idx > stratIdx && contentIdx > brandStratH2Idx && brandIdx > contentIdx, "порядок: Стратегия → бренд-стратегия → контент → Бренд");
  const orangeSliderIdx = main.indexOf("marketing-case-slider-orange");
  assert(orangeSliderIdx > contentIdx && brandIdx > orangeSliderIdx, "порядок: контент-стратегия → слайдер Orange → Бренд");
  assert(main.includes('href="/case/orange"'), "слайдер Orange: ссылка на кейс");
  assert(main.includes("cases-block__swiper-slide-title_big"), "слайдер Orange: разметка cases-block");
  const seoSliderIdx = main.indexOf("marketing-case-slider-seo");
  const seoH2Idx = main.indexOf(MARKETING_H2.SEO);
  const salesH2Idx = main.indexOf(MARKETING_H2.SALES);
  assert(seoSliderIdx > seoH2Idx && salesH2Idx > seoSliderIdx, "порядок: SEO → слайдер Darkrain/Складно/AWM → продажи");
  assert(main.includes("swiper-container-marketing-seo"), "слайдер SEO: swiper id");
  assert(/cases-block__swiper-slide-title[^>]*>Darkrain<\/h3>/.test(main), "слайдер SEO: Darkrain");
  assert(/cases-block__swiper-slide-title[^>]*>Складно<\/h3>/.test(main), "слайдер SEO: Складно");
  assert(/cases-block__swiper-slide-title[^>]*>AWM-Trade<\/h3>/.test(main), "слайдер SEO: AWM-Trade");
  const siteSliderIdx = main.indexOf("marketing-case-slider-site");
  const siteH2Idx = main.indexOf(MARKETING_H2.SITE);
  const promoH2Idx = main.indexOf(MARKETING_H2.PROMOTION);
  assert(siteSliderIdx > siteH2Idx && promoH2Idx > siteSliderIdx, "порядок: Сайт → слайдер Cromi/Riderra/Каскад → продвижение");
  assert(main.includes('cases-block__swiper-slide-title">Cromi'), "слайдер сайт: Cromi");
  assert(main.includes('cases-block__swiper-slide-title">Riderra'), "слайдер сайт: Riderra");
  assert(main.includes('cases-block__swiper-slide-title">Каскад'), "слайдер сайт: Каскад");
  assert(brandIdx >= 0 && awarenessIdx > brandIdx, "порядок: Бренд → увеличение известности (без cm-wide)");
  const leadIdx = main.indexOf("sa-service-lead-section");
  const casesIdx = main.indexOf("marketing-cases-section");
  assert(leadIdx >= 0 && casesIdx > leadIdx, "порядок: форма до блока «Наши кейсы»");

  const targetingHtml = read("targeting/index.html");
  assert(targetingHtml.includes("Таргетированная реклама"), "targeting/index.html не тронут");

  console.log("verify-marketing: ok");
}

run().catch((e) => {
  console.error("verify-marketing:", e.message || e);
  process.exit(1);
});

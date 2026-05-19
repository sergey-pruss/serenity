#!/usr/bin/env node
/**
 * Smoke-тест для /services/marketing (локальная статика).
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const { loadServiceConfig } = require("./lib/load-service-config.cjs");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function read(relPath) {
  return fs.readFileSync(path.join(root, relPath), "utf8");
}

async function run() {
  loadServiceConfig("marketing");
  const html = read("services/marketing/index.html");

  assert(html.includes("Комплексный маркетинг"), "H1/контент: Комплексный маркетинг");
  assert(
    html.includes(
      "<title>Комплексный маркетинг в Москве и Петербурге для бизнеса — Услуги — Serenity</title>",
    ),
    "<title> как на prod",
  );
  assert(
    html.includes(
      'meta name="description" content="Заказать услуги комплексного маркетинга в СПБ и Москве',
    ),
    "description как на prod",
  );
  assert(
    html.includes('property="og:title" content="Комплексный маркетинг"'),
    "og:title как на prod",
  );
  assert(
    html.includes(
      'property="og:description" content="Синергия маркетинговых инструментов многократно увеличивает их эффективность для бизнеса.<br /> "',
    ),
    "og:description (подзаголовок героя) как на prod",
  );
  assert(
    html.includes(
      'property="og:image" content="https://serenity.agency/admin/wp-content/uploads/2018/10/10-1.jpg"',
    ),
    "og:image как на prod",
  );
  assert(
    /<h1[^>]*>\s*Комплексный маркетинг/.test(html),
    "<h1> Комплексный маркетинг",
  );
  assert(html.includes("marketing-static-stack.css"), "CSS: marketing-static-stack.css");
  assert(html.includes("kontekstnaya-reklama-nuxt.bundle.css"), "CSS: kontekst Nuxt bundle");
  assert(html.includes('class="page-constructor marketing-page"'), "обёртка marketing-page");
  assert(!html.includes('id="gradient-canvas"'), "без gradient-canvas (prod: сплошной #191a1b)");
  assert(html.includes("jumbotron-img-aurora__title"), "hero jumbotron (как kontekst)");
  const heroSection = html.match(/marketing-hero-section[\s\S]*?<\/section>/);
  assert(heroSection, "marketing-hero-section");
  assert(
    !heroSection[0].includes("background-image"),
    "герой без фонового фото (как targeting)",
  );
  assert(html.includes("marketing-synergy-diagram"), "диаграмма marketing-synergy-diagram");
  assert(
    html.includes('class="marketing-synergy-diagram__link" href="#marketing-strategy"'),
    "диаграмма: якорь на раздел стратегии",
  );
  assert(
    html.includes('class="marketing-synergy-diagram__link" href="#marketing-promotion"'),
    "диаграмма: якорь на раздел продвижения",
  );
  assert(
    html.includes('class="marketing-synergy-diagram__link" href="#marketing-branding"'),
    "диаграмма: якорь на раздел бренда",
  );
  assert(
    html.includes('class="marketing-synergy-diagram__link" href="#marketing-sales"'),
    "диаграмма: якорь на раздел продаж",
  );
  assert(html.includes('id="marketing-strategy"'), "якорь секции marketing-strategy");
  assert(html.includes('id="marketing-promotion"'), "якорь секции marketing-promotion");
  assert(html.includes('id="marketing-branding"'), "якорь секции marketing-branding");
  assert(html.includes('id="marketing-sales"'), "якорь секции marketing-sales");
  assert(
    html.includes('class="marketing-section__link" href="/services#services-strategy"'),
    "заголовок секции: ссылка на /services",
  );
  assert(html.includes("Проектирование"), "карточка Проектирование из grid_three");
  assert(html.includes("Медиапланирование"), "карточка Медиапланирование");
  assert(html.includes("marketing-section__subhead"), "Cтратегия: подблок Бренд-стратегия как на prod");
  assert(
    html.includes("marketing-section__subhead-title") && html.includes("Бренд-стратегия"),
    "подзаголовок Бренд-стратегия",
  );
  assert(html.includes("marketing-section__subhead-lead"), "мелкий текст под подзаголовком");
  assert(
    html.includes("Словесно и&nbsp;визуально выражаем ценности"),
    "крупный intro справа у Бренд-стратегия",
  );
  assert(html.includes("marketing-cm-strip"), "контент-стратегия: лента примеров");
  assert(html.includes("marketing-cm-wide-slider"), "cm-wide-slider между брендом и продвижением");
  assert(html.includes("cm-slide3.jpg"), "слайд cm-slide3 в wide-slider");
  assert(html.includes("marketing-pre-promotion-section"), "блоки до «Измеримое продвижение»");
  assert(
    html.includes("Через&nbsp;полезный контент увеличиваем аудиторию"),
    "«Увеличение известности бренда»: intro справа",
  );
  assert(html.includes(">PR-продвижение</h3>"), "сетка узнаваемости: PR-продвижение");
  assert(
    html.includes('href="/services#services-sites">Сайт</a></h3>'),
    "подблок «Сайт» с якорем services-sites",
  );
  assert(
    html.includes("Центральное место для&nbsp;взаимодействия с&nbsp;аудиторией"),
    "«Сайт»: intro справа",
  );
  assert(html.includes(">Маркетинговый подход</h3>"), "«Сайт»: карточки");
  assert(html.includes("marketing-sites-slider"), "слайдер кейсов сайтов");
  assert(html.includes("case_slide_1.png"), "слайд case_slide_1");
  assert(html.includes("marketing-brand-section"), "секция бренда по структуре prod");
  assert(
    html.includes('marketing-section__subhead--content-strategy') &&
      html.includes('href="/content-strategy">Контент-стратегия'),
    "подблок Контент-стратегия",
  );
  assert(html.includes('href="/services/seo">SEO</a></h2>'), "секция SEO");
  assert(html.includes('href="/services/seo"'), "ссылка SEO");
  assert(html.includes('href="/services/salesmarketing">Продажи</a></h2>'), "секция Продажи");
  assert(html.includes('href="/services/salesmarketing"'), "ссылка Продажи");
  assert(
    html.includes('marketing-section__subhead--content-strategy') &&
      html.includes("Способы коммуникации"),
    "контент-стратегия: подблок и карточки, не одна сетка с брендом",
  );
  assert(html.includes("/_sa/img/services/marketing/cm/figure1.png"), "иллюстрация figure1");
  assert(html.includes("marketing-kontekst-section"), "секции content-block (kontekst)");
  assert(html.includes("content-block__grid"), "сетка content-block__grid");
  assert(html.includes("block__description"), "карточки block__description");
  assert(html.includes("numbered-header__title"), "заголовки numbered-header");
  assert(!html.includes("blog-header__title"), "без legacy blog-header");
  assert(!html.includes('class="cm-page'), "без legacy cm-page");
  assert(!html.includes('class="cm-about'), "без legacy cm-about");
  assert(
    !/<h2>\s*Комплексный маркетинг\s*<\/h2>/.test(html),
    "без дублирующего H2 «Комплексный маркетинг» в content-block",
  );
  assert(!html.includes("grid_three"), "без legacy grid_three");
  assert(!html.includes("marketing-team-section"), "без секции «Команда»");
  assert(!html.includes('">Команда</h2>'), "без заголовка «Команда»");
  assert(html.includes('id="sa-inline-lead-root"'), "inline lead");
  assert(html.includes("more-case-wr more-case-wr__main"), "кейсы с главной");
  assert(html.includes("more-case-wr__slider-heading"), "заголовок слайдера кейсов");
  assert(html.includes('data-v-27a87df0=""'), "кейсы: data-v для CSS бандла");
  assert(html.includes("marketing-cases-section"), "секция marketing-cases-section");
  assert(!html.includes("home-cases-auto.js"), "без home-cases-auto (как targeting)");
  assert(html.includes("sa-home-awards-mounted"), "награды с главной");
  assert(html.includes('class="awards__card"'), "карточки наград в DOM");
  assert(!html.includes("sa-home-awards-fragment"), "без пустого template наград");
  assert(html.includes("marketing-awards-heading"), "id заголовка наград");
  assert(!html.includes("Стоимость ведения комплексного маркетинга"), "без блока стоимости");
  assert(!html.includes("main-cases__inner"), "без prod-кейсов");
  assert(!html.includes('class="show-more"'), "без кнопок Подробнее");
  assert(html.includes('href="/services#services-strategy"'), "ссылка Cтратегия → /services");
  assert(
    (html.match(/page-constructor__section marketing-kontekst-section/g) || []).length === 7,
    "7 секций content-block (включая pre-promotion)",
  );
  assert(html.includes("marketing-promotion-section"), "секция «Измеримое продвижение» по структуре prod");
  assert(html.includes("marketing-promotion-graph-wrap"), "график + 3 карточки в начале продвижения");
  assert(html.includes("figure3.png"), "иллюстрация графика figure3");
  assert(html.includes(">Синергия</h3>") && html.includes(">Измеримость</h3>"), "верхняя тройка карточек");
  const promoBlock = html.match(/marketing-promotion-section[\s\S]*?marketing-section__outro/);
  assert(promoBlock, "блок продвижения с outro");
  assert(
    promoBlock[0].includes("marketing-section__subhead") &&
      promoBlock[0].includes(">Реклама</h3>") &&
      promoBlock[0].includes(">Инструменты</h3>"),
    "подсекции Реклама и Инструменты",
  );
  assert(html.includes(">Реклама</h3>"), "карточка «Реклама» в блоке продвижения");
  assert(html.includes("Автоматизируем процессы"), "карточки секции «Продажи»");
  assert(html.includes("marketing-sales-figure"), "секция «Продажи»: макет CRM");
  assert(html.includes("/_sa/img/services/marketing/cm/sales.png"), "иллюстрация sales.png");
  assert(
    html.includes("Высокий уровень сервиса в&nbsp;отделе продаж"),
    "секция «Продажи»: outro",
  );
  assert(html.includes("marketing-sales-grid"), "секция «Продажи»: сетка 2×2");
  assert(html.includes('href="/content-strategy"'), "канон content-strategy");
  assert(html.includes('href="/kontekstnaya_reklama"'), "канон kontekstnaya_reklama");
  assert(html.includes("<!-- MARKETING-MAIN-START -->"), "маркер MAIN-START");
  assert(html.includes("<!-- MARKETING-MAIN-END -->"), "маркер MAIN-END");
  assert(!html.includes("mod.calltouch.ru"), "без Calltouch");
  assert(
    html.includes('rel="canonical" href="https://serenity.agency/services/marketing"'),
    "canonical /services/marketing",
  );

  const servicesHtml = read("services/index.html");
  assert(servicesHtml.includes('id="services-strategy"'), "якорь services-strategy на /services");
  assert(servicesHtml.includes('id="services-promotion"'), "якорь services-promotion");

  console.log("verify-marketing: ok");
}

run().catch((e) => {
  console.error("verify-marketing:", e.message || e);
  process.exit(1);
});

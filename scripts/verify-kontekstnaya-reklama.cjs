#!/usr/bin/env node
/**
 * Smoke-тест для страницы /kontekstnaya_reklama:
 * - HTML присутствует и корректен
 * - title содержит нужный текст
 * - H1 содержит нужный текст
 * - ключевые ассеты присутствуют на диске
 * - разметка кейсов как на prod (cases-block__slider + swiper-слайды), блок кейсов внизу — как на /services/ (mor-cases + сетка)
 */
const fs = require("fs");
const path = require("path");
const http = require("http");

const root = path.resolve(__dirname, "..");
const { loadServiceConfig } = require("./lib/load-service-config.cjs");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function read(relPath) {
  return fs.readFileSync(path.join(root, relPath), "utf8");
}

function fileExists(relPath) {
  return fs.existsSync(path.join(root, relPath));
}

function httpGet(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => resolve(res.statusCode)).on("error", reject);
  });
}

async function run() {
  loadServiceConfig("kontekstnaya_reklama");
  const html = read("kontekstnaya_reklama/index.html");

  assert(
    html.includes("Настройка и ведение контекстной рекламы"),
    "title/контент: должно содержать 'Настройка и ведение контекстной рекламы'",
  );

  assert(
    /<ul class="navigation-new__list"[^>]*>[\s\S]*?<a\s+href="\/"[^>]*>\s*Главная\s*<\/a>/i.test(html),
    "HTML: в бургер-меню (navigation-new__list) есть пункт «Главная»",
  );

  assert(
    /<title>[^<]*Контекстная реклама[^<]*настройка и ведение[^<]*Serenity[^<]*<\/title>/i.test(html),
    "<title>: Контекстная реклама + настройка и ведение + Serenity",
  );

  assert(
    html.includes(
      'meta name="description" content="Настройка и ведение контекстной рекламы в Яндекс Директе и Google Ads.',
    ),
    "SEO: description — Яндекс Директ, Google Ads, гео и бесплатный аудит",
  );
  assert(
    html.includes("Санкт-Петербург") &&
      html.includes("Бесплатный аудит и медиаплан") &&
      !/meta name="description"[^>]*\bСПб\b/.test(html),
    "SEO: description — Санкт-Петербург полностью, аудит и медиаплан",
  );

  {
    const { extractFaqPairsFromHtml } = require("./lib/build-faq-page-jsonld.cjs");
    const normFaqText = (s) =>
      String(s ?? "")
        .replace(/&nbsp;/g, " ")
        .replace(/\u00a0/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    const faqBlock = html.match(/id="kontekst-faq-mounted"[\s\S]*?<\/section>/);
    assert(faqBlock, "SEO: блок FAQ (#kontekst-faq-mounted)");
    const faqHtml = faqBlock[0];
    const ldMatch = faqHtml.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    assert(ldMatch, "SEO: FAQPage JSON-LD в блоке FAQ");
    const ld = JSON.parse(ldMatch[1]);
    assert(ld["@type"] === "FAQPage" && Array.isArray(ld.mainEntity), "SEO: FAQPage mainEntity");
    const visible = extractFaqPairsFromHtml(faqHtml);
    assert(
      visible.length >= 3 && ld.mainEntity.length === visible.length,
      `SEO: FAQPage — ${ld.mainEntity.length} в JSON-LD vs ${visible.length} в HTML`,
    );
    for (let i = 0; i < visible.length; i++) {
      const q = normFaqText(visible[i].question);
      const entity = ld.mainEntity.find((e) => normFaqText(e.name) === q);
      assert(entity, `SEO: FAQPage — нет вопроса «${q}»`);
      assert(
        normFaqText(entity.acceptedAnswer?.text) === normFaqText(visible[i].answer),
        `SEO: FAQPage — ответ не совпадает с HTML для «${q}»`,
      );
    }
  }

  assert(
    html.includes('name="google-site-verification"') &&
      html.includes("LDRx_-Q9yZ6z32F4lojL-TtK3FuUXGV8c6P4zkbppZA"),
    "SEO: meta google-site-verification как на остальных страницах Serenity",
  );
  assert(
    html.includes(
      'name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"',
    ),
    "SEO: robots как на главной (index, follow + лимиты сниппета, без noyaca)",
  );
  assert(
    !html.includes("mod.calltouch.ru"),
    "HTML: без Calltouch на статическом контуре (аналитика — Яндекс.Метрика внизу страницы)",
  );
  assert(
    html.includes('property="og:image:secure_url"') && html.includes('name="twitter:image"'),
    "SEO: og:image:secure_url и twitter:image для превью шаринга",
  );

  assert(
    html.includes('"@type":"Product"') &&
      html.includes('"image":"https://serenity.agency/_sa/img/storage__2lwfrwamwdjZrXwCGrqHh1iCd0TASXMPCTozoLqM.png"') &&
      !html.includes('"image":"/img/og.png"'),
    "SEO: Product JSON-LD — абсолютный image (как og:image), без /img/og.png",
  );
  {
    const re = /<script[^>]+type="application\/ld\+json"[^>]*>(\{[^<]+\})<\/script>/g;
    let m;
    while ((m = re.exec(html)) !== null) {
      try {
        const o = JSON.parse(m[1]);
        if (o["@type"] === "Product" && typeof o.description === "string") {
          assert(
            !/[<>]/.test(o.description),
            "SEO: Product JSON-LD description — только текст, без HTML-тегов",
          );
        }
      } catch (_) {
        /* не JSON — пропускаем */
      }
    }
  }

  assert(
    /<h1[^>]*>\s*Настройка и(?:&nbsp;|\s+)ведение контекстной рекламы/.test(html),
    "<h1>: должен содержать 'Настройка и ведение контекстной рекламы'",
  );

  assert(
    html.includes("kontekstnaya-reklama-nuxt.bundle.css"),
    "HTML: один prod Nuxt CSS — /_sa/css/kontekstnaya-reklama-nuxt.bundle.css",
  );

  assert(
    html.includes("kontekstnaya-reklama-static-stack.css"),
    "HTML: слой контента над фиксированным градиентом — kontekstnaya-reklama-static-stack.css",
  );

  assert(
    /<\/span> <p data-v-1444f1fb=""><i>Рекламный бюджет от(?:&nbsp;| )300 000&nbsp;₽<\/i><\/p>/.test(html) &&
      /<\/span> <p data-v-1444f1fb=""><i>Рекламный бюджет от(?:&nbsp;| )350 000&nbsp;₽<\/i><\/p>/.test(html) &&
      /<\/span> <p data-v-1444f1fb=""><i>Рекламный бюджет от(?:&nbsp;| )400 000&nbsp;₽<\/i><\/p>/.test(html),
    "HTML: под ценой пакетов — бюджет тем же разметочным паттерном, что «Подходит для…» (<p><i>…</i></p>, после типографа — от&nbsp; перед суммой)",
  );

  assert(
    html.includes("prices__cards--packages") && html.includes("prices__packages-slider"),
    "HTML: блок «Пакеты» — слайдер-обёртка (prices__cards--packages + prices__packages-slider)",
  );
  assert(
    (html.match(/class="prices__packages-slide swiper-slide(?:\s[^"]*)?"/g) || []).length === 3,
    "HTML: три слайда тарифов (prices__packages-slide)",
  );
  assert(
    (html.match(/class="price-card__title-rule price-card__title-rule--[123]"/g) || []).length === 3,
    "HTML: сразу под заголовком каждого тарифа — градиентная полоска (price-card__title-rule ×3)",
  );
  assert(
    !html.includes("price-card__wrapper col-6 col-sm-12"),
    "HTML: три тарифа — не двухколоночная сетка col-6 у price-card__wrapper",
  );
  assert(
    !html.includes("price-card__wrapper col-4 col-md-6 col-sm-12"),
    "HTML: тарифы без bootstrap col-* (ширина из flex слайдера / десктоп-сетки)",
  );

  assert(
    html.includes('id="kontekst-packages-compare-mounted"') &&
      html.includes("kontekst-packages-compare__table") &&
      !html.includes("kontekst-packages-compare__title") &&
      html.includes('class="kontekst-packages-compare__plan-name">Минимальный</span>'),
    "HTML: таблица сравнения пакетов внутри блока «Пакеты» (без отдельного h3-заголовка)",
  );
  assert(
    !html.includes("kontekst-packages-compare-section"),
    "HTML: таблица пакетов — не отдельная page-constructor__section",
  );
  {
    const iSlider = html.indexOf("prices__packages-slider");
    const iCompare = html.indexOf("kontekst-packages-compare-mounted");
    const iLead = html.indexOf("sa-service-lead-section");
    assert(
      iSlider >= 0 && iCompare > iSlider && iLead > iCompare,
      "HTML: порядок — слайдер пакетов → таблица сравнения → инлайн-форма",
    );
  }
  assert(
    /<link[^>]+href="\/_sa\/css\/sections\/kontekstnaya-packages-compare\.css/.test(html),
    "HTML: в head подключён kontekstnaya-packages-compare.css (link rel)",
  );
  {
    const compareCss = fs.readFileSync(
      path.join(root, "css/sections/kontekstnaya-packages-compare.css"),
      "utf8",
    );
    assert(
      compareCss.includes("max-width: 1024px") &&
        compareCss.includes(".kontekst-packages-compare") &&
        compareCss.includes("display: none"),
      "CSS: таблица скрыта на viewport ≤1024px",
    );
    assert(
      compareCss.includes("min-width: 1025px") &&
        compareCss.includes(".prices__cards--packages") &&
        /prices__cards--packages[\s\S]*display:\s*none/.test(compareCss),
      "CSS: на десктопе скрыты карточки пакетов (остаётся таблица)",
    );
  }

  assert(
    html.includes("css__home-snapshot__native-row-scroll.css"),
    "HTML: native-row-scroll — горизонтальный scroll ленты наград/клиентов (overflow-x на треке при data-clients-strip)",
  );

  const iBundleEnd = html.indexOf("<!-- KONTEKST-CSS-BUNDLE-END -->");
  const iSwiper = html.indexOf("Swiper/8.4.7/swiper-bundle.min.css");
  const iSliderArrows = html.indexOf("css__home-snapshot__slider-arrows.css");
  const iMobileCss = html.indexOf("css__home-snapshot__overrides.mobile.css");
  const iFooterBurger = html.indexOf("sections/footer-burger-chrome.css");
  const iServiceInlineLead = html.indexOf("sections/service-inline-lead-form.css");
  const iHeaderCss = html.indexOf("sections/header.css");
  assert(
    iBundleEnd !== -1 &&
      iSwiper !== -1 &&
      iSliderArrows !== -1 &&
      iMobileCss !== -1 &&
      iFooterBurger !== -1 &&
      iServiceInlineLead !== -1 &&
      iHeaderCss !== -1,
    "HTML: Swiper, slider-arrows, overrides.mobile, footer-burger-chrome, service-inline-lead-form и sections/header.css должны быть в head",
  );
  assert(
    iSwiper < iSliderArrows &&
      iSliderArrows < iMobileCss &&
      iMobileCss < iFooterBurger &&
      iFooterBurger < iServiceInlineLead &&
      iServiceInlineLead < iHeaderCss &&
      iHeaderCss < iBundleEnd,
    "HTML: порядок стилей — … → footer-burger-chrome → service-inline-lead-form → header.css последним до KONTEKST-CSS-BUNDLE-END (каскад шапки)",
  );
  assert(
    (html.match(/swiper-bundle\.min\.css/g) || []).length >= 1 &&
      (html.match(/swiper-bundle\.min\.css/g) || []).length <= 2,
    "HTML: Swiper bundle (один URL; допускается preload+noscript для отложенной загрузки)",
  );

  assert(
    html.includes("<!-- KONTEKST-CSS-BUNDLE-START"),
    "HTML: маркер KONTEKST-CSS-BUNDLE-START для сборки стилей",
  );

  assert(
    html.includes("<!-- KONTEKST-MAIN-START -->"),
    "HTML: маркер KONTEKST-MAIN-START — граница среза колонки (не indexOf по page-constructor из-за SVG)",
  );

  assert(
    html.includes("</header><!-- KONTEKST-MAIN-START -->"),
    "HTML: перед MAIN должен закрываться </header> — колонка не внутри .new-static-menu",
  );

  assert(
    html.includes("<!-- KONTEKST-MAIN-END -->"),
    "HTML: маркер KONTEKST-MAIN-END перед локальным footer",
  );

  assert(
    !html.includes('itemprop="image" src="/_sa/img/storage__">'),
    "HTML: не должно быть битого microdata image (storage__ без имени файла)",
  );

  assert(
    html.includes(
      'link itemprop="image" href="https://serenity.agency/_sa/img/storage__xjhFEA49677OGQDTXjw6he9xnUh71ef9GgvspTHz.webp"',
    ),
    "HTML: Product microdata — itemprop=image через <link href> (без <img> в display:none, Safari не показывает битую иконку)",
  );
  assert(
    !/<img[^>]*\sitemprop=/i.test(html),
    "HTML: в Product microdata не использовать <img itemprop=…> (WebKit может показать битую иконку при проблемах с загрузкой)",
  );
  assert(
    html.includes('itemprop="lowPrice" content="107000.00"') &&
      html.includes('itemprop="highPrice" content="149000.00"') &&
      html.includes('itemprop="offerCount" content="3"'),
    "SEO: Product microdata AggregateOffer — lowPrice, highPrice, offerCount (GSC)",
  );
  assert(
    !html.includes('data-sa-cases-swiper-init="1"') && !html.includes('data-mor-cases-init="1"'),
    "HTML: без Nuxt-флагов init слайдеров (data-sa-cases-swiper-init / data-mor-cases-init) — иначе app.js не инициализирует Swiper",
  );

  assert(
    html.includes("css__home-snapshot__snapshot.bundle.css"),
    "HTML: нужен snapshot.bundle — иначе бургер-меню и контакты в потоке ломают вёрстку",
  );

  assert(
    html.includes("swiper-bundle.min.js"),
    "HTML: подключён Swiper (листание cases-block, synergy, mor-cases)",
  );

  assert(
    html.includes("swiper-bundle.min.css"),
    "HTML: стили Swiper (swiper-bundle.min.css)",
  );

  assert(
    html.includes("gradient-canvas"),
    "HTML: должен содержать canvas для градиентного фона",
  );

  assert(
    html.includes("page-constructor-gradient.js"),
    "HTML: инициализация WebGL-градиента (page-constructor-gradient.js после gradient-animation)",
  );

  assert(
    html.includes("jumbotron-img-aurora__title"),
    "HTML: должен содержать legacy hero-элемент .jumbotron-img-aurora__title",
  );

  assert(
    html.includes("header-full header-background desctop"),
    "HTML: должен содержать legacy .header-full.desctop для hero-блока",
  );

  assert(
    !html.includes("service-detail.css"),
    "HTML: не должен подключать service-detail.css (новый дизайн ломает parity)",
  );

  assert(
    !html.includes("kontekstnaya-reklama-parity.css"),
    "HTML: не подключать kontekstnaya-reklama-parity.css — стили из prod Nuxt",
  );

  assert(
    html.includes("cases-block__slider"),
    "HTML: кейсы — разметка prod (cases-block__slider)",
  );

  assert(
    html.includes("cases-block__swiper-slide"),
    "HTML: кейсы — слайды prod (cases-block__swiper-slide)",
  );

  assert(
    html.includes("mor-cases-slider") && html.includes('class="cases-block"'),
    "HTML: mor-cases-slider и секции cases-block (prod)",
  );


  assert(
    html.includes("Кейсы") && !html.includes("Кейсы комплексного маркетинга"),
    "HTML: заголовок сетки кейсов — «Кейсы» (не «Кейсы комплексного маркетинга»)",
  );

  assert(
    fileExists("html/partials/services/more-cases-kontekstnaya-from-services.html"),
    "Частичный блок кейсов (services): html/partials/services/more-cases-kontekstnaya-from-services.html",
  );
  assert(
    fileExists("json/services/kontekstnaya_reklama/more-cases.json"),
    "more-cases JSON: json/services/kontekstnaya_reklama/more-cases.json",
  );
  assert(
    fileExists("html/partials/services/_service-more-cases.shell.html"),
    "more-cases shell: _service-more-cases.shell.html",
  );

  assert(
    html.includes("more-case-wr more-case-wr__main"),
    "HTML: блок кейсов — оболочка как на /services/ (more-case-wr__main)",
  );

  assert(
    fileExists("html/partials/services/awards-kontekstnaya-reklama.html"),
    "Частичный блок наград: html/partials/services/awards-kontekstnaya-reklama.html",
  );
  assert(
    fileExists("json/services/kontekstnaya_reklama/awards.json"),
    "awards JSON: json/services/kontekstnaya_reklama/awards.json",
  );
  assert(
    fileExists("html/partials/services/_service-awards.shell.html"),
    "awards shell: _service-awards.shell.html",
  );

  assert(
    html.includes("home-awards.css?v=20260514kontekstAwardsShell"),
    "HTML: подключён home-awards.css для ленты наград (как на главной)",
  );

  assert(
    html.includes('id="sa-home-awards-mounted"') &&
      html.includes("home-awards-block") &&
      html.includes("award-wreath-union.svg"),
    "HTML: блок наград — оболочка главной (sa-home-awards-mounted, home-awards-block, венки /_sa/img/home/)",
  );

  const iSynOrder = html.indexOf('id="kontekst-synergy-mounted"');
  const iAwardsOrder = html.indexOf('id="sa-home-awards-mounted"');
  assert(
    iSynOrder >= 0 && iAwardsOrder >= 0 && iAwardsOrder < iSynOrder,
    "HTML: награды выше блока «Синергия с услугами» (после кейсов, до синергии)",
  );

  assert(
    !html.includes('class="awards__title">Награды</h3>'),
    "HTML: не остаётся legacy-заголовок Nuxt awards__title — подставлен partial",
  );

  assert(
    fileExists("html/partials/services/synergy-kontekstnaya-reklama.html"),
    "Частичный блок синергии: html/partials/services/synergy-kontekstnaya-reklama.html",
  );

  assert(
    fileExists("html/partials/services/faq-kontekstnaya-reklama.html"),
    "Частичный блок FAQ: html/partials/services/faq-kontekstnaya-reklama.html",
  );
  assert(
    fileExists("json/services/kontekstnaya_reklama/faq.json"),
    "FAQ JSON: json/services/kontekstnaya_reklama/faq.json",
  );
  assert(
    fileExists("html/partials/services/_service-faq.shell.html"),
    "FAQ shell: html/partials/services/_service-faq.shell.html",
  );
  assert(
    fileExists("json/services/kontekstnaya_reklama/synergy.json"),
    "synergy JSON: json/services/kontekstnaya_reklama/synergy.json",
  );
  assert(
    fileExists("html/partials/services/_service-synergy.shell.html"),
    "synergy shell: _service-synergy.shell.html",
  );

  assert(
    fileExists("css/sections/service-faq.css"),
    "Общие стили FAQ: css/sections/service-faq.css",
  );

  assert(
    html.includes('id="kontekst-faq-mounted"') && html.includes("service-faq.css"),
    "HTML: FAQ — #kontekst-faq-mounted и подключение service-faq.css",
  );

  assert(
    html.includes("kontekst-faq-root--always-visible"),
    "HTML: FAQ контекстной — класс kontekst-faq-root--always-visible (ответы развёрнуты, без аккордеона)",
  );

  assert(
    !html.includes('id="kontekst-faq-mounted"') ||
      !/id="kontekst-faq-mounted"[\s\S]{0,120000}spoiler__content" style="height:\s*0/.test(html),
    "HTML: FAQ — нет inline height:0 на .spoiler__content (иначе ответы скрыты до клика)",
  );

  const iPackagesHeading = html.indexOf(">Пакеты</h2>");
  const iInlineLead = html.indexOf('id="sa-inline-lead-root"');
  const iFaqMounted = html.indexOf('id="kontekst-faq-mounted"');
  const iCasesMain = html.indexOf("more-case-wr more-case-wr__main");
  assert(
    iPackagesHeading >= 0 && iFaqMounted > iPackagesHeading,
    "HTML: блок «Вопрос-ответ» (FAQ) идёт после секции с заголовком «Пакеты»",
  );
  assert(
    iInlineLead < 0 || (iInlineLead > iPackagesHeading && iFaqMounted > iInlineLead),
    "HTML: при наличии инлайн-формы заявки — она между «Пакеты» и FAQ",
  );
  assert(
    iCasesMain >= 0 && iFaqMounted < iCasesMain,
    "HTML: блок «Вопрос-ответ» (FAQ) идёт перед блоком кейсов (more-case-wr__main)",
  );

  const iBlog = html.indexOf("kontekst-blog-section");
  const iClients = html.indexOf("kontekst-clients-section");
  assert(
    iBlog >= 0 &&
      iClients > iBlog &&
      iFaqMounted < iBlog &&
      iClients < iCasesMain &&
      html.includes("blog-block-mainstr") &&
      html.includes("clients-wrapper_main-structure"),
    "HTML: после FAQ — «Блог» и «Наши клиенты» (partials с главной), затем кейсы",
  );

  assert(
    html.includes("kak-privlekat-auditoriyu-konkurentov-cherez-yandeks-direkt") &&
      html.includes("kak-uvelichit-trafik-sajta") &&
      html.includes("serenity-kak-stroim-uspeshnyj-marketing-ot-sotrudnika-do-klienta"),
    "HTML: блог контекстной — кураторские статьи про Директ/контекст в слайдере",
  );

  assert(
    !html.includes("<!-- KONTEKST-BLOG-CLIENTS-START -->"),
    "HTML: маркеры KONTEKST-BLOG-CLIENTS не должны попадать в итоговую страницу",
  );

  assert(
    html.includes('id="kontekst-synergy-mounted"') &&
      html.includes("kontekst-synergy-root") &&
      html.includes("services-section_main-structure") &&
      html.includes('class="services__context-slider swiper-container'),
    "HTML: синергия — оболочка главной (services-section + services__context-slider)",
  );

  assert(
    html.includes('id="body"') &&
      html.includes("body-application") &&
      html.includes("footer__link application"),
    "HTML: плавающая кнопка «Оставить заявку» — #body.body-application + .footer__link.application (leave-request-cta.js + app.js)",
  );

  assert(
    html.includes('id="sa-inline-lead-root"') &&
      html.includes('id="sa-inline-lead-meta"') &&
      html.includes("service-inline-lead-form.css"),
    "HTML: инлайн-заявка — #sa-inline-lead-root, template meta, service-inline-lead-form.css",
  );
  const leaveJs = read("js/leave-request-cta.js");
  assert(
    leaveJs.includes("data-sa-service-lead") &&
      leaveJs.includes("serviceLeadVisibilityMarker") &&
      leaveJs.includes("order-popup__inner"),
    "JS: зона скрытия CTA — data-sa-service-lead на .order-popup__inner (не min-height #sa-inline-lead-root)",
  );
  assert(
    !/\bid="sa-inline-lead-root"[^>]*\bdata-sa-service-lead=/.test(html),
    "HTML: data-sa-service-lead не на #sa-inline-lead-root (маркер ставит JS на .order-popup__inner)",
  );
  assert(
    !html.includes('class="forms modern"'),
    "HTML: Nuxt-блок forms modern заменён на partial service-inline-lead",
  );

  assert(
    fileExists("js/service-spoilers.js"),
    "JS: service-spoilers.js — раскрытие FAQ на страницах услуг",
  );

  assert(
    html.includes("service-spoilers.js"),
    "HTML: подключён service-spoilers.js для FAQ",
  );

  assert(
    fileExists("js/service-packages-slider.js"),
    "JS: service-packages-slider.js — слайдер «Пакеты» (только страницы услуг)",
  );
  assert(
    html.includes("service-packages-slider.js"),
    "HTML: подключён service-packages-slider.js после app.js для «Пакеты»",
  );
  assert(
    !read("js/app.js").includes('.querySelectorAll(".prices__packages-slider")'),
    "JS: инициализация «Пакеты» не в app.js (service-packages-slider.js)",
  );

  const manPath = "kontekstnaya_reklama/nuxt-css-manifest.json";
  assert(fileExists(manPath), `Отсутствует манифест ${manPath} (скачайте Nuxt CSS)`);
  const man = JSON.parse(read(manPath));
  const hrefs = man.hrefs || [];
  assert(hrefs.length === 1, "Манифест Nuxt CSS: один бандл (kontekstnaya-reklama-nuxt.bundle.css)");
  const chunks = man.sourceChunks || [];
  assert(chunks.length >= 10, "Манифест: sourceChunks должны перечислять исходные чанки prod");
  assert(
    typeof man.nuxtOrigin === "string" && man.nuxtOrigin.length > 0,
    "Манифест: поле nuxtOrigin (откуда скачивали чанки)",
  );

  const assets = [
    "css/css__home-snapshot__snapshot.bundle.css",
    "css/css__home-snapshot__overrides.parity-sync.css",
    "css/css__home-snapshot__native-row-scroll.css",
    "_sa/img/storage__xjhFEA49677OGQDTXjw6he9xnUh71ef9GgvspTHz.webp",
    "_sa/img/storage__aUi8YfnntliHTrn6OU6JOaCMEcOOY8NGt16t15Zh.webp",
    "_sa/img/storage__R16Tij6hzShVdtyA5ZbyTu0bM19BmNBE9eTlnQRT.png",
    "css/kontekstnaya-reklama-nuxt.bundle.css",
    "css/kontekstnaya-reklama-static-stack.css",
    "css/sections/service-faq.css",
    "css/sections/home-awards.css",
    "_sa/js/gradient-animation.min.js",
  ];

  for (const asset of assets) {
    assert(fileExists(asset), `Ассет отсутствует: ${asset}`);
  }

  const BASE = process.env.TEST_BASE_URL || "http://127.0.0.1:8895";

  try {
    const pageStatus = await httpGet(`${BASE}/kontekstnaya_reklama`);
    assert(pageStatus === 200, `HTTP-статус /kontekstnaya_reklama: ожидался 200, получен ${pageStatus}`);

    const cssStatus = await httpGet(`${BASE}/_sa/css/kontekstnaya-reklama-nuxt.bundle.css`);
    assert(cssStatus === 200, `HTTP-статус nuxt-prod CSS: ожидался 200, получен ${cssStatus}`);

    const stackCssStatus = await httpGet(`${BASE}/_sa/css/kontekstnaya-reklama-static-stack.css`);
    assert(stackCssStatus === 200, `HTTP-статус static-stack CSS: ожидался 200, получен ${stackCssStatus}`);
  } catch (e) {
    if (e.code === "ECONNREFUSED") {
      console.warn("  [skip] dev-сервер недоступен, HTTP-проверки пропущены");
    } else {
      throw e;
    }
  }

  console.log("verify-kontekstnaya-reklama: ok");
}

run().catch((err) => {
  console.error(`verify-kontekstnaya-reklama: FAIL\n${err.stack || err.message}`);
  process.exit(1);
});

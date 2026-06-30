#!/usr/bin/env node
/**
 * Smoke-тест для /targeting (локальный черновик статики).
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

function fileExists(relPath) {
  return fs.existsSync(path.join(root, relPath));
}

async function run() {
  loadServiceConfig("targeting");
  const html = read("targeting/index.html");
  const captureBaseline =
    process.env.TARGETING_VERIFY_CAPTURE_ONLY === "1" ||
    process.env.TARGETING_VERIFY_CAPTURE_ONLY === "true" ||
    html.includes("targetingCaptureBaseline");

  assert(html.includes("Таргетированная реклама"), "title/контент: Таргетированная реклама");
  assert(
    /<title>Таргетированная реклама — настройка и ведение в VK и Telegram \| Serenity<\/title>/.test(html),
    "<title>: таргет — настройка и ведение в VK и Telegram",
  );
  assert(
    html.includes(
      'meta name="description" content="Настройка и ведение таргетированной рекламы в VK, Telegram Ads и MyTarget: Москва и Санкт-Петербург. Пакеты от 107 000 ₽, кейсы, аналитика — Serenity. Заявка на расчёт →"',
    ),
    "description: VK, Telegram, гео, пакеты",
  );
  assert(html.includes('property="og:lowPrice" content="107000.00"'), "og:lowPrice как на проде");
  assert(
    /<h1[^>]*>\s*Настройка и(?:&nbsp;|\u00a0| )ведение таргетированной рекламы/.test(html),
    "<h1>: Настройка и ведение таргетированной рекламы",
  );
  assert(html.includes("targeting-nuxt.bundle.css"), "CSS: targeting-nuxt.bundle.css");
  assert(fileExists("css/targeting-nuxt.bundle.css"), "файл на диске: css/targeting-nuxt.bundle.css");
  assert(html.includes("targeting-static-stack.css"), "CSS: targeting-static-stack.css");
  if (captureBaseline) {
    assert(html.includes("targetingCaptureBaseline"), "CSS: capture baseline");
    assert(!html.includes("overrides.parity-sync.css"), "baseline: без kontekst parity-sync");
    assert(/class="page-constructor targeting-page"/.test(html), "обёртка page-constructor targeting-page");
    assert(html.includes("more-case-wr"), "блок кейсов");
    assert(
      html.includes("questions-wr") || html.includes("targeting-faq-mounted"),
      "FAQ: prod questions-wr или static partial",
    );
    assert(
      read("css/targeting-static-stack.css").includes("targeting-hero.css"),
      "CSS: targeting-hero",
    );
  } else {
    assert(html.includes('id="targeting-faq-mounted"'), "FAQ: targeting-faq-mounted");
    assert(html.includes("targeting-faq-section"), "FAQ: targeting-faq-section");
    assert(
      html.includes("targeting-faq-root--always-visible"),
      "FAQ: targeting-faq-root--always-visible (ответы развёрнуты)",
    );
    assert(
      !html.includes('id="targeting-faq-mounted"') ||
        !/id="targeting-faq-mounted"[\s\S]{0,120000}spoiler__content" style="height:\s*0/.test(html),
      "FAQ: без inline height:0 на spoiler__content",
    );
    assert(/class="page-constructor targeting-page"/.test(html), "обёртка page-constructor targeting-page");
    assert(!html.includes("targeting-page__section-heading"), "заголовки: kontekstnaya-page__section-heading");
    assert(html.includes('id="sa-inline-lead-root"'), "inline lead root");
    assert(html.includes("more-case-wr"), "блок кейсов");
    assert(html.includes('id="targeting-awards-heading"'), "награды partial");
    assert(html.includes("kontekst-synergy-root"), "синергия partial");
    assert(html.includes("targeting-static-stack.css"), "CSS: targeting-static-stack (import kontekst stack)");
    assert(html.includes("overrides.parity-sync.css"), "CSS: kontekst parity-sync");
    assert(
      read("css/targeting-static-stack.css").includes("targeting-hero.css"),
      "CSS: targeting-hero",
    );
  }
  assert(html.includes("<!-- TARGETING-MAIN-START -->"), "маркер MAIN-START");
  assert(html.includes("<!-- TARGETING-MAIN-END -->"), "маркер MAIN-END");
  assert(!html.includes("mod.calltouch.ru"), "без Calltouch");
  assert(
    html.includes(
      'name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"',
    ),
    "SEO: robots как у kontekstnaya (index, follow + лимиты сниппета)",
  );
  assert(html.includes("case-slider__wrapper"), "коллаж под заголовком (case-slider)");
  assert(html.includes("case-slider__margin-fix"), "герой: case-slider__margin-fix (высота коллажа desktop/tablet)");

  const mainStart = html.indexOf("<!-- TARGETING-MAIN-START -->");
  const mainEnd = html.indexOf("<!-- TARGETING-MAIN-END -->");
  const main = html.slice(mainStart, mainEnd);
  if (!captureBaseline) {
    const leadIdx = main.indexOf("sa-service-lead-section");
    const teamIdx = main.indexOf("team-block");
    const faqIdx = main.indexOf("targeting-faq-mounted");
    const casesIdx = main.indexOf('class="more-case-wr');
    const geoIdx = main.indexOf("Таргетированная реклама в&nbsp;Москве и&nbsp;Санкт-Петербурге");
    const pkgIdx = main.indexOf("<!-- TARGETING-PACKAGES-START -->");
    assert(geoIdx >= 0 && pkgIdx > geoIdx, "порядок: пакеты после гео-блока");
    assert(pkgIdx >= 0 && leadIdx > pkgIdx, "порядок: форма после пакетов");
    assert(leadIdx >= 0 && teamIdx > leadIdx, "порядок: форма до команды (как kontekst)");
    assert(faqIdx >= 0 && casesIdx > faqIdx, "порядок: FAQ до кейсов (как kontekst)");
  }
  assert(
    read("css/targeting-static-stack.css").includes(
      ".page-constructor > .page-constructor__section:first-of-type::before",
    ) && read("css/targeting-static-stack.css").includes("display: none !important"),
    "без фонового фото kontekst ::before в герое",
  );
  assert(html.includes("service-packages-slider.js"), "packages: service-packages-slider.js");
  assert(html.includes("kontekst-packages-compare-rows.js"), "packages: kontekst-packages-compare-rows.js");
  assert(html.includes("targeting-packages-compare-mounted"), "packages: compare-таблица");
  assert(
    html.includes("team__members-slider") || html.includes("team-block"),
    "команда: слайдер или сетка team-block",
  );
  if (!captureBaseline) {
    assert(html.includes("team__members-slider"), "команда: слайдер team__members-slider");
    assert(!main.includes('class="col-4 col-md-6"'), "команда: без сетки col-4 col-md-6");
    assert(html.includes("service-team-slider.js"), "service-team-slider.js для команды");
    assert(html.includes("service-spoilers.js"), "service-spoilers.js");
  }
  assert(html.includes("gradient-canvas"), "gradient-canvas");
  assert(html.includes("page-constructor-gradient.js"), "page-constructor-gradient.js");
  assert(html.includes("swiper-bundle.min.js"), "swiper-bundle.min.js");
  assert(
    !html.includes('itemprop="image" src="/_sa/img/storage__">'),
    "нет битого microdata image",
  );
  assert(
    html.includes(
      'link itemprop="image" href="https://serenity.agency/_sa/img/storage__xjhFEA49677OGQDTXjw6he9xnUh71ef9GgvspTHz.webp"',
    ),
    "Product microdata через link itemprop=image",
  );
  assert(!/<img[^>]*\sitemprop=/i.test(html), "нет img itemprop в microdata");
  assert(!html.includes("<img <link itemprop"), "нет сломанного img+link");
  assert(
    fileExists("html/partials/services/hero-targeting.html"),
    "partial hero-targeting.html",
  );
  assert(
    fileExists("html/partials/services/faq-targeting.html"),
    "partial faq-targeting.html",
  );
  assert(
    fileExists("html/partials/services/blog-targeting.html"),
    "partial blog-targeting.html",
  );
  assert(
    fileExists("html/partials/services/clients-targeting.html"),
    "partial clients-targeting.html",
  );
  assert(
    fileExists("json/services/targeting/faq.json"),
    "FAQ JSON: json/services/targeting/faq.json",
  );
  assert(
    fileExists("html/partials/services/_service-faq.shell.html"),
    "FAQ shell: _service-faq.shell.html",
  );
  assert(
    fileExists("json/services/targeting/synergy.json"),
    "synergy JSON: json/services/targeting/synergy.json",
  );
  assert(
    fileExists("html/partials/services/_service-synergy.shell.html"),
    "synergy shell: _service-synergy.shell.html",
  );
  assert(
    fileExists("html/partials/services/more-cases-targeting.html"),
    "partial more-cases-targeting.html",
  );
  assert(
    fileExists("json/services/targeting/more-cases.json"),
    "more-cases JSON: json/services/targeting/more-cases.json",
  );
  assert(
    fileExists("html/partials/services/_service-more-cases.shell.html"),
    "more-cases shell: _service-more-cases.shell.html",
  );
  assert(
    fileExists("html/partials/services/awards-targeting.html"),
    "partial awards-targeting.html",
  );
  assert(
    fileExists("json/services/targeting/awards.json"),
    "awards JSON: json/services/targeting/awards.json",
  );
  assert(
    fileExists("html/partials/services/_service-awards.shell.html"),
    "awards shell: _service-awards.shell.html",
  );
  assert(
    fileExists("html/partials/services/synergy-targeting.html"),
    "partial synergy-targeting.html",
  );
  const synergyPartial = read("html/partials/services/synergy-targeting.html");
  assert(
    !synergyPartial.includes('href="/targeting/"'),
    "synergy: без ссылки на текущую услугу /targeting/",
  );
  assert(
    synergyPartial.includes('href="/kontekstnaya_reklama"') &&
      synergyPartial.includes("Контекстная реклама"),
    "synergy: карточка контекстной рекламы вместо таргета",
  );
  assert(fileExists("targeting/nuxt-css-manifest.json"), "nuxt-css-manifest.json");

  const phase2 = !captureBaseline && process.env.TARGETING_VERIFY_PHASE2 === "1";
  if (phase2) {
    assert(html.includes('class="facts"') || html.includes("Наш подход"), "phase2: факты/подход");
    assert(html.includes("targeting-blog-section"), "phase2: блок блога после FAQ");
    assert(html.includes("targeting-clients-section"), "phase2: блок «Наши клиенты» после FAQ");
    assert(html.includes("Наши клиенты"), "phase2: секция клиентов");
    assert(!html.includes("<!-- TARGETING-BLOG-CLIENTS-START -->"), "HTML: без маркеров TARGETING-BLOG-CLIENTS");
    assert(!html.includes("TARGETING-PHASE2:middle"), "phase2: нет маркера middle");
    assert(!html.includes("https://serenity.agency/storage/"), "phase2: пути storage переписаны в /_sa/img/");
    assert(html.includes('class="cases-block"'), "phase2: слайдер cases-block в середине страницы");
    assert(html.includes("cases-block__slider-swiper-container"), "cases-block: разметка swiper");
  } else if (!captureBaseline) {
    assert(
      html.includes("TARGETING-PHASE2:middle") ||
        html.includes("TARGETING-PHASE2:clients") ||
        html.includes('class="facts"'),
      "phase1: маркеры пропуска секций, facts или phase2 включён",
    );
  }
  if (!captureBaseline) {
    assert(html.includes("more-case-wr__main"), "кейсы: класс more-case-wr__main");
    assert(html.includes("more-case-wr__slider-heading"), "кейсы: заголовок слайдера");
    assert(
      !html.includes("Кейсы комплексного маркетинга"),
      "кейсы: заголовок — «Кейсы», не «Кейсы комплексного маркетинга»",
    );
    assert(html.includes("mor-cases-slide__cta-fill"), "кейсы: CTA-слайд с gif");
  }
  assert(!html.includes("swiper-container-initialized"), "кейсы: без классов гидрации Swiper");
  assert(
    /data-v-[a-z0-9]+=/i.test(main) || html.includes("c-title-block modern"),
    "main: Nuxt scoped data-v на герое или c-title-block",
  );
  assert(html.includes("c-title-block modern"), "герой: c-title-block");
  if (!captureBaseline) {
    assert(html.includes("service-faq.css"), "CSS: service-faq.css");
  }

  const imgRe = /\/_sa\/img\/[a-zA-Z0-9._/-]+/g;
  const imgs = [...new Set(html.match(imgRe) || [])];
  for (const rel of imgs.slice(0, 80)) {
    const disk = rel.replace(/^\/_sa\//, "");
    if (disk.includes("..")) continue;
    assert(fileExists(disk), `файл на диске: ${disk}`);
  }

  const appJs = read("js/app.js");
  assert(
    /measureMenuCollapseY[\s\S]*?rect\.bottom \+ 2/.test(appJs),
    "app.js: порог сворачивания шапки — rect.bottom, без scrollY в сумме",
  );
  assert(
    !/menuCollapseYCache = Math\.max\(32, Math\.round\(y \+ rect\.bottom/.test(appJs),
    "app.js: не кэшировать y + rect.bottom (ломает fixed header после restore scroll)",
  );
  assert(
    read("css/targeting-static-stack.css").includes(".header.header--collapsed:not(.active)"),
    "CSS: скрытие navigation-menu при header--collapsed на targeting",
  );

  const heroCollageSrc = "storage__kdf27Tl7T5MVvim1JcSZcnXiQzm4QOhE3IycP5bV.webp";
  assert(html.includes(heroCollageSrc), "герой: коллаж webp в HTML");
  assert(fileExists(`img/${heroCollageSrc}`), "герой: файл коллажа на диске");

  const heroCss = read("css/sections/targeting-hero.css");
  assert(
    !/height:\s*700px\s*!important/.test(heroCss),
    "герой CSS: без фиксированных 700px (ломает flex+absolute в Nuxt)",
  );
  assert(
    /\.page-constructor\.targeting-page[\s\S]*case-slider-slide[\s\S]*position:\s*static !important/.test(
      heroCss,
    ),
    "герой CSS: slide в потоке на всех брейкпоинтах",
  );
  assert(
    /\.page-constructor\.targeting-page[\s\S]*case-slider-slide__media img[\s\S]*position:\s*static !important/.test(
      heroCss,
    ),
    "герой CSS: img коллажа position:static (не скрыт padding-box Nuxt)",
  );
  assert(
    /\.page-constructor\.targeting-page[\s\S]*\.case-slider[\s\S]*overflow:\s*visible !important/.test(
      heroCss,
    ),
    "герой CSS: case-slider overflow:visible",
  );
  const stackCss = read("css/targeting-static-stack.css");
  assert(
    /targeting-page > \.page-constructor__section:first-of-type[\s\S]*z-index:\s*2/.test(stackCss),
    "stack CSS: герой выше .facts (z-index)",
  );
  assert(
    /case-slider-slide__media img\[data-v-77cabad6\][\s\S]*position:\s*static !important/.test(stackCss),
    "stack CSS: коллаж img в потоке (scoped Nuxt)",
  );
  assert(
    /max-width:\s*719px\)[\s\S]*\.facts[\s\S]*--page-gutter-x/.test(stackCss),
    "stack CSS: .facts на телефоне — поля как у hero (--page-gutter-x)",
  );
  assert(
    /min-width:\s*721px\)[\s\S]*content-block__grid--desc[\s\S]*display:\s*flex !important/.test(
      stackCss,
    ),
    "stack CSS: desc-сетка на десктопе (override parity, без legacy slider)",
  );
  assert(
    !main.includes('class="content-block__slider'),
    "HTML: без legacy content-block__slider (columns-with-progress)",
  );
  const motionClose = String.fromCharCode(60, 47, 109, 111, 116, 105, 111, 110, 46, 100, 105, 118, 62);
  assert(!main.includes(motionClose), "HTML: без битых </motion.div> (desc не в .row)");
  assert(
    /Исследование<\/h2>[\s\S]{0,1200}numbered-header__subtitle-column/.test(main),
    "этап «Исследование»: subtitle-column в шапке (статика без Nuxt-scroll)",
  );
  assert(
    /Наш подход<\/h2>[\s\S]{0,1200}numbered-header__subtitle-column/.test(main),
    "блок «Наш подход»: subtitle-column в шапке",
  );
  assert(
    !/<\/p>(?:<\/motion.div>){4,}\s*<motion.div[^>]*class="content-block__grid content-block__grid--desc/.test(
      main,
    ),
    "HTML: не более трёх </div> между subtitle и desc-сеткой (иначе рвётся .page-constructor)",
  );
  for (const step of ["Исследование", "Первые шаги", "Ведение", "Оптимизация"]) {
    const h2 = main.indexOf(`>${step}</h2>`);
    assert(h2 >= 0, `этап «${step}»: заголовок h2`);
    const desc = main.indexOf("content-block__grid--desc", h2);
    assert(desc > h2, `этап «${step}»: desc-сетка в блоке`);
    const beforeDesc = main.slice(h2, desc);
    const closeRun = beforeDesc.match(/<\/p>((?:<\/div>)+)/);
    if (closeRun) {
      const n = (closeRun[1].match(/<\/div>/g) || []).length;
      assert(n <= 3, `этап «${step}»: между </p> и desc не больше 3×</div> (сейчас ${n})`);
    }
  }

  console.log("verify-targeting: ok");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});

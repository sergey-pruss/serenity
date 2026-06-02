#!/usr/bin/env node
/**
 * Smoke-тест для /korporativnyj_sajt (локальный черновик статики).
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
  loadServiceConfig("korporativnyj_sajt");
  const html = read("korporativnyj_sajt/index.html");
  const captureBaseline =
    process.env.KORPORATIVNYJ_VERIFY_CAPTURE_ONLY === "1" ||
    process.env.KORPORATIVNYJ_VERIFY_CAPTURE_ONLY === "true" ||
    html.includes("targetingCaptureBaseline");

  assert(html.includes("Корпоративный сайт"), "breadcrumb/контент: Корпоративный сайт");
  assert(
    /<title>Разработка корпоративных сайтов — Serenity<\/title>/.test(html),
    "<title>: Разработка корпоративных сайтов — Serenity",
  );
  assert(
    /property="og:title" content="Разработка корпоративных сайтов — Serenity"/.test(html),
    "og:title синхронизирован с <title>",
  );
  assert(
    html.includes(
      'meta name="description" content="Услуги по созданию корпоративных сайтов',
    ),
    "description как на проде",
  );
  assert(html.includes('property="og:lowPrice" content="400000.00"'), "og:lowPrice как на проде");
  assert(
    /<h1[^>]*>\s*Разработка корпоративных сайтов/.test(html),
    "<h1>: Разработка корпоративных сайтов",
  );
  assert(html.includes("korporativnyj-nuxt.bundle.css"), "CSS: korporativnyj-nuxt.bundle.css");
  assert(fileExists("css/korporativnyj-nuxt.bundle.css"), "файл на диске: css/korporativnyj-nuxt.bundle.css");
  assert(html.includes("korporativnyj-sajt-static-stack.css"), "CSS: korporativnyj-sajt-static-stack.css");
  if (captureBaseline) {
    assert(html.includes("targetingCaptureBaseline"), "CSS: capture baseline");
    assert(!html.includes("overrides.parity-sync.css"), "baseline: без kontekst parity-sync");
    assert(/class="page-constructor korporativnyj-page"/.test(html), "обёртка page-constructor korporativnyj-page");
    assert(html.includes("more-case-wr"), "блок кейсов");
    assert(
      html.includes("questions-wr") || html.includes("korporativnyj-faq-mounted"),
      "FAQ: prod questions-wr или static partial",
    );
    assert(
      read("css/korporativnyj-sajt-static-stack.css").includes("korporativnyj-hero.css") ||
        read("css/korporativnyj-sajt-static-stack.css").includes("jumbotron-video-aurora"),
      "CSS: korporativnyj-hero или jumbotron-video",
    );
  } else {
    assert(html.includes('id="korporativnyj-faq-mounted"'), "FAQ: korporativnyj-faq-mounted");
    assert(html.includes("korporativnyj-faq-section"), "FAQ: korporativnyj-faq-section");
    assert(
      html.includes("korporativnyj-faq-root--always-visible"),
      "FAQ: korporativnyj-faq-root--always-visible (ответы развёрнуты)",
    );
    assert(
      !html.includes('id="korporativnyj-faq-mounted"') ||
        !/id="korporativnyj-faq-mounted"[\s\S]{0,120000}spoiler__content" style="height:\s*0/.test(html),
      "FAQ: без inline height:0 на spoiler__content",
    );
    assert(/class="page-constructor korporativnyj-page"/.test(html), "обёртка page-constructor korporativnyj-page");
    assert(!html.includes("korporativnyj-page__section-heading"), "заголовки: kontekstnaya-page__section-heading");
    assert(html.includes('id="sa-inline-lead-root"'), "inline lead root");
    assert(html.includes("more-case-wr"), "блок кейсов");
    assert(html.includes('id="korporativnyj-awards-heading"'), "награды partial");
    assert(html.includes("kontekst-synergy-root"), "синергия partial");
    assert(
      /data-v-56f85d51=""[^>]*class="services__card-img services__card-img_desc"|class="services__card-img services__card-img_desc"[^>]*data-v-56f85d51=""/.test(
        html,
      ),
      "синергия: data-v-56f85d51 на card-img (snapshot.bundle скрывает tablet/mobile)",
    );
    assert(html.includes("Наши клиенты"), "клиенты: заголовок «Наши клиенты»");
    assert(html.includes('class="clients-wrapper"'), "клиенты: clients-wrapper (как /targeting)");
    assert(html.includes("clients-new__title"), "клиенты: clients-new__title (как /targeting)");
    assert(!html.includes("kontekst-clients-section"), "клиенты: без kontekst-clients-section");
    assert(html.includes("korporativnyj-sajt-static-stack.css"), "CSS: korporativnyj-sajt-static-stack (import kontekst stack)");
    assert(html.includes("overrides.parity-sync.css"), "CSS: kontekst parity-sync");
    assert(
      read("css/korporativnyj-sajt-static-stack.css").includes("korporativnyj-hero.css") ||
        read("css/korporativnyj-sajt-static-stack.css").includes("jumbotron-video-aurora"),
      "CSS: korporativnyj-hero или jumbotron-video",
    );
  }
  assert(html.includes("<!-- KORPORATIVNYJ-MAIN-START -->"), "маркер MAIN-START");
  assert(html.includes("<!-- KORPORATIVNYJ-MAIN-END -->"), "маркер MAIN-END");
  assert(!html.includes("mod.calltouch.ru"), "без Calltouch");
  assert(
    html.includes(
      'name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"',
    ),
    "SEO: robots как у kontekstnaya (index, follow + лимиты сниппета)",
  );
  assert(
    html.includes("case-slider__wrapper") ||
      html.includes("jumbotron-video-aurora") ||
      html.includes("video-header"),
    "герой: case-slider или jumbotron-video-aurora",
  );

  const mainStart = html.indexOf("<!-- KORPORATIVNYJ-MAIN-START -->");
  const mainEnd = html.indexOf("<!-- KORPORATIVNYJ-MAIN-END -->");
  const main = html.slice(mainStart, mainEnd);
  if (!captureBaseline) {
    const compareIdx = main.indexOf("korporativnyj-packages-compare-mounted");
    const calcIdx = main.indexOf("sa-site-calc-section");
    const leadIdx = main.indexOf("sa-service-lead-section");
    const teamIdx = main.indexOf("team-block");
    const clientsIdx = main.indexOf('class="clients-wrapper"');
    const faqIdx = main.indexOf("korporativnyj-faq-mounted");
    const casesIdx = main.indexOf('class="more-case-wr');
    const creonIdx = main.indexOf("Creon Group");
    assert(html.includes('id="korporativnyj-site-calc-root"'), "квиз: korporativnyj-site-calc-root");
    assert(html.includes("korporativnyj-site-calc.js"), "квиз: korporativnyj-site-calc.js");
    assert(html.includes("korporativnyj-site-calc.css"), "квиз: korporativnyj-site-calc.css");
    assert(compareIdx >= 0 && calcIdx > compareIdx, "порядок: квиз после таблицы сравнения");
    assert(calcIdx >= 0 && leadIdx > calcIdx, "порядок: квиз до формы");
    assert(leadIdx >= 0 && teamIdx > leadIdx, "порядок: форма до команды");
    assert(creonIdx >= 0 && compareIdx > creonIdx, "порядок: «Стоимость» после кейса Creon");
    assert(clientsIdx >= 0 && faqIdx > clientsIdx, "порядок: клиенты до FAQ (как prod)");
    assert(faqIdx >= 0 && casesIdx > faqIdx, "порядок: FAQ до кейсов (как kontekst)");
  }
  const stackCssPath = "css/korporativnyj-sajt-static-stack.css";
  const stackCss = read(stackCssPath);
  const targetingStackCss = read("css/targeting-static-stack.css");
  assert(
    (stackCss.includes(".page-constructor > .page-constructor__section:first-of-type::before") &&
      stackCss.includes("display: none !important")) ||
      targetingStackCss.includes("display: none !important"),
    "без фонового фото kontekst ::before в герое",
  );
  assert(html.includes("service-packages-slider.js"), "packages: service-packages-slider.js");
  assert(html.includes('id="korporativnyj-packages-compare-mounted"'), "packages: таблица сравнения");
  assert(html.includes("prices__packages-slider"), "packages: слайдер тарифов");
  assert(
    html.includes(">Стоимость и пакеты</h2>") || html.includes(">Стоимость и&nbsp;пакеты</h2>"),
    "packages: заголовок «Стоимость и пакеты»",
  );
  assert(
    html.includes('class="kontekst-packages-compare__plan-name">Базовый</span>'),
    "packages: колонка «Базовый»",
  );
  assert(!html.includes(">Лендинг на&nbsp;Tilda</h3>"), "без legacy dies «Лендинг на Tilda»");
  assert(html.includes("team__members-slider"), "команда: слайдер team__members-slider (как targeting/kontekst)");
  if (!captureBaseline) {
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
    fileExists("html/partials/services/korporativnyj-phase2-middle.html"),
    "partial korporativnyj-phase2-middle.html",
  );
  assert(
    fileExists("html/partials/services/faq-korporativnyj-sajt.html"),
    "partial faq-korporativnyj-sajt.html",
  );
  assert(
    fileExists("json/services/korporativnyj_sajt/faq.json"),
    "FAQ JSON: json/services/korporativnyj_sajt/faq.json",
  );
  assert(
    fileExists("html/partials/services/_service-faq.shell.html"),
    "FAQ shell: _service-faq.shell.html",
  );
  assert(
    fileExists("json/services/korporativnyj_sajt/synergy.json"),
    "synergy JSON: json/services/korporativnyj_sajt/synergy.json",
  );
  assert(
    fileExists("html/partials/services/_service-synergy.shell.html"),
    "synergy shell: _service-synergy.shell.html",
  );
  assert(
    fileExists("html/partials/services/more-cases-korporativnyj-sajt.html"),
    "partial more-cases-korporativnyj-sajt.html",
  );
  assert(
    fileExists("json/services/korporativnyj_sajt/more-cases.json"),
    "more-cases JSON: json/services/korporativnyj_sajt/more-cases.json",
  );
  assert(
    fileExists("html/partials/services/_service-more-cases.shell.html"),
    "more-cases shell: _service-more-cases.shell.html",
  );
  assert(
    fileExists("html/partials/services/awards-korporativnyj-sajt.html"),
    "partial awards-korporativnyj-sajt.html",
  );
  assert(
    fileExists("json/services/korporativnyj_sajt/awards.json"),
    "awards JSON: json/services/korporativnyj_sajt/awards.json",
  );
  assert(
    fileExists("html/partials/services/_service-awards.shell.html"),
    "awards shell: _service-awards.shell.html",
  );
  assert(
    fileExists("html/partials/services/synergy-korporativnyj-sajt.html"),
    "partial synergy-korporativnyj-sajt.html",
  );
  const synergyPartial = read("html/partials/services/synergy-korporativnyj-sajt.html");
  assert(
    !synergyPartial.includes('href="/korporativnyj_sajt/"'),
    "synergy: без ссылки на текущую услугу /korporativnyj_sajt/",
  );
  assert(/Синергия с(?:\s|&nbsp;)+услугами/.test(synergyPartial), "synergy: заголовок секции");
  assert(synergyPartial.includes("Комплексное продвижение"), "synergy: комплексное продвижение");
  assert(synergyPartial.includes("Контент-маркетинг"), "synergy: контент-маркетинг");
  assert(synergyPartial.includes("Фирменный стиль"), "synergy: фирменный стиль");
  assert(/Фото и(?:\s|&nbsp;)видео/.test(synergyPartial), "synergy: фото и видео");
  assert(!synergyPartial.includes('href="/targeting"'), "synergy: без ссылки на targeting");
  assert(!synergyPartial.includes("kontekstnaya_reklama"), "synergy: без карточек targeting");
  assert(!synergyPartial.includes("business-analytics"), "synergy: без карточек targeting");
  assert(!synergyPartial.includes("influence-marketing"), "synergy: без карточки influence из targeting");
  assert(
    (synergyPartial.match(/class="services__slide swiper-slide/g) || []).length === 3,
    "synergy: ровно 3 слайда korporativnyj",
  );
  assert(fileExists("korporativnyj_sajt/nuxt-css-manifest.json"), "nuxt-css-manifest.json");

  const phase2 = !captureBaseline && process.env.KORPORATIVNYJ_VERIFY_PHASE2 === "1";
  if (phase2) {
    assert(html.includes('class="facts"') || html.includes("Наш подход"), "phase2: факты/подход");
    assert(!html.includes("KORPORATIVNYJ-PHASE2:middle"), "phase2: нет маркера middle");
    assert(!html.includes("https://serenity.agency/storage/"), "phase2: пути storage переписаны в /_sa/img/");
    assert(html.includes('class="cases-block"'), "phase2: слайдер cases-block в середине страницы");
    assert(html.includes("cases-block__slider-swiper-container"), "cases-block: разметка swiper");
  } else if (!captureBaseline) {
    assert(
      html.includes("KORPORATIVNYJ-PHASE2:middle") ||
        html.includes("KORPORATIVNYJ-PHASE2:clients") ||
        html.includes('class="facts"'),
      "phase1: маркеры пропуска секций, facts или phase2 включён",
    );
  }
  if (!captureBaseline) {
    assert(html.includes("more-case-wr__main"), "кейсы: класс more-case-wr__main");
    assert(html.includes('class="more-cases"'), "кейсы: десктопная сетка .more-cases (как /targeting)");
    assert(html.includes("more-case-wr__slider-heading"), "кейсы: заголовок слайдера");
    assert(
      !html.includes("Кейсы комплексного маркетинга"),
      "кейсы: заголовок — «Кейсы», не «Кейсы комплексного маркетинга»",
    );
    assert(html.includes("mor-cases-slide__cta-fill"), "кейсы: CTA-слайд с gif");
    assert(html.includes('href="/case/all/category/sites/"'), "кейсы: CTA на рубрику «Сайты»");
    const casesBlockStart = html.indexOf('class="more-case-wr');
    const casesBlockEnd = html.indexOf("kontekst-synergy-root", casesBlockStart);
    const casesBlock =
      casesBlockStart >= 0
        ? html.slice(casesBlockStart, casesBlockEnd > casesBlockStart ? casesBlockEnd : undefined)
        : "";
    assert(casesBlock && !/behance\.net/i.test(casesBlock), "кейсы: без ссылок на Behance");
    const caseCards = (casesBlock.match(/data-v-c0adc676="" data-v-27a87df0="" class="case(?: case--dark-card)?"/g) || [])
      .length;
    assert(caseCards === 8, `кейсы: сетка more-cases — ровно 8 карточек (есть ${caseCards})`);
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
    targetingStackCss.includes(".header.header--collapsed:not(.active)") ||
      stackCss.includes(".header.header--collapsed:not(.active)"),
    "CSS: скрытие navigation-menu при header--collapsed",
  );

  assert(html.includes("jumbotron-video-aurora"), "герой: jumbotron-video-aurora");
  assert(
    /jumbotron-video-aurora[\s\S]{0,4000}video[^>]+src="\/_sa\/img\/storage__[^"]+\.mp4"/.test(main),
    "герой: video mp4 в /_sa/img/",
  );
  assert(fileExists("css/sections/korporativnyj-hero.css"), "CSS: korporativnyj-hero.css");
  assert(
    /min-width:\s*721px\)[\s\S]*korporativnyj-page[\s\S]*content-block__grid--desc[\s\S]*display:\s*flex !important/.test(
      stackCss,
    ),
    "stack CSS: desc-сетка на десктопе (korporativnyj-page)",
  );
  assert(
    !main.includes('class="content-block__slider'),
    "HTML: без legacy content-block__slider (columns-with-progress)",
  );
  const motionClose = String.fromCharCode(60, 47, 109, 111, 116, 105, 111, 110, 46, 100, 105, 118, 62);
  assert(!main.includes(motionClose), "HTML: без битых </motion.div>");
  assert(main.includes("Наш подход"), "блок «Наш подход»");
  assert(main.includes("Маркетинговое проектирование"), "этап: маркетинговое проектирование");
  assert(main.includes("Дизайн"), "этап: дизайн");
  assert(main.includes("Разработка сайтов"), "этап: разработка сайтов");
  const caseBlockCount = (main.match(/class="cases-block"/g) || []).length;
  assert(caseBlockCount >= 3, `inline cases-block: ≥3 (сейчас ${caseBlockCount})`);

  console.log("verify-korporativnyj: ok");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});

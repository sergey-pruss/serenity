/**
 * Конфигурация onepage SEO-ТЗ (без полного SERP gap — чеклист + аудит + панели).
 * @typedef {object} OnepageTzPage
 * @property {string} id
 * @property {string} slug — имя файла docs/{slug}-onepage-seo-tz.html
 * @property {string} title
 * @property {string} path
 * @property {string} url
 * @property {boolean} isStatic
 * @property {string} [staticSince] — подпись «дата статика»
 * @property {string} rankDashboardPageId
 * @property {{ id: string; text: string }[]} queries
 * @property {string[]} checklistP1
 * @property {string[]} checklistP2
 * @property {string[]} checklistP3
 * @property {{ title?: string; description?: string; h1?: string }} metaRecommendations
 * @property {string[]} contentNotes
 * @property {string[]} technicalNotes
 * @property {string[]} [migrationNotes]
 */

/** @type {OnepageTzPage[]} */
export const ONEPAGE_TZ_PAGES = [
  {
    id: "marketing",
    slug: "marketing",
    title: "Комплексный маркетинг",
    path: "/services/marketing",
    url: "https://serenity.agency/services/marketing",
    isStatic: true,
    staticSince: "2026-05",
    rankDashboardPageId: "marketing",
    queries: [
      { id: "kompleksnyj", text: "услуги комплексного маркетинга" },
      { id: "agentstvo", text: "агентство комплексного маркетинга" },
    ],
    checklistP1: [
      "Сниппет: title 50–60 симв., в начале «услуги комплексного маркетинга» или «агентство комплексного маркетинга»; description — Москва/СПб, кейсы, CTA без переспама (сейчас 0 кликов при позициях 1/13 в Google).",
      "Hero: подзаголовок с явным «агентство комплексного маркетинга»; полоса KPI (проекты, отрасли, NPS/лиды).",
      "H2 «Что входит в комплексный маркетинг» — перечень каналов со ссылками на /kontekstnaya_reklama, /targeting, SEO, бренд.",
      "Таблица пакетов / сравнение «Старт — Рост — Премиум» (не только слайдер карточек).",
    ],
    checklistP2: [
      "Отзывы и логотипы клиентов — отдельно от блока кейсов.",
      "Кейсы с метриками (рост лидов, CPL, доля каналов).",
      "FAQ: сроки, бюджет, как строится стратегия; JSON-LD FAQPage = видимый текст.",
      "Внутренние ссылки: главная → marketing; marketing → комплексное продвижение (после переноса).",
    ],
    checklistP3: [
      "Блок «Читайте в блоге» — 3–4 статьи про комплексный маркетинг / digital.",
      "og:image на /_sa/, не admin/wp-content.",
      "Переобход URL в GSC и Я.Вебмастер после правок meta.",
    ],
    metaRecommendations: {
      title:
        "Агентство комплексного маркетинга в Москве и СПб — услуги — Serenity",
      description:
        "Комплексный маркетинг для бизнеса: стратегия, контекст, таргет, SEO и аналитика. Кейсы и стоимость — агентство Serenity, Москва и Санкт-Петербург.",
      h1: "Комплексный маркетинг для бизнеса (или оставить H1 + подзаголовок с ВЧ-фразой)",
    },
    contentNotes: [
      "H1 сейчас «Комплексный маркетинг» — ок для бренда страницы; ВЧ лучше дублировать в первом H2 и description.",
      "Страница на статике — сохранить скорость: не плодить CSS, поднять ?v= после правок stack.",
    ],
    technicalNotes: [
      "Канон: https://serenity.agency/services/marketing (без слэша).",
      "Проверить дубли title с «— Услуги — Serenity» в сниппете — упростить для CTR.",
      "Форма заявки в DOM; CWV: LCP hero, immutable ?v= на /_sa/.",
    ],
  },
  {
    id: "home",
    slug: "home",
    title: "Главная страница",
    path: "/",
    url: "https://serenity.agency",
    isStatic: true,
    staticSince: "2026-05",
    rankDashboardPageId: "home",
    queries: [
      { id: "brand", text: "маркетинговое агентство" },
      { id: "agency", text: "агентство маркетинга" },
    ],
    checklistP1: [
      "Не каннибализировать /services/marketing: на главной — бренд «маркетинговое агентство», коммерческий блок со ссылкой «Комплексный маркетинг».",
      "Title/description: в начале «маркетинговое агентство» + Москва/СПб; description не общими фразами — УТП и 1 CTA.",
      "Первый экран: H1 или подзаголовок с «маркетинговое агентство» (сейчас H1 «Делаем маркетинг лучше» — слабая связь с ВЧ).",
      "Полоса KPI / цифры доверия над сгибом (как у лидеров выдачи по бренду).",
    ],
    checklistP2: [
      "Блок услуг: якоря на /services/marketing, /kontekstnaya_reklama, /kompleksnoye-prodvizheniye (после переноса).",
      "Кейсы и награды — видимы без глубокого скролла.",
      "Organization JSON-LD уже есть — проверить sameAs, logo на /_sa/.",
    ],
    checklistP3: [
      "После правок — 4–6 недель на переоценку (статика с начала мая 2026); не менять H1 каждую неделю.",
      "Слайдер блога — анкоры под «маркетинговое агентство» / кейсы, не «читать ещё» без контекста.",
    ],
    metaRecommendations: {
      title: "Маркетинговое агентство Serenity — Москва и Санкт-Петербург",
      description:
        "Маркетинговое агентство полного цикла: стратегия, digital, контекст и продвижение. Кейсы и заявка — Serenity, Москва и СПб.",
      h1: "Маркетинговое агентство Serenity (или H1 бренд + subtitle с ВЧ)",
    },
    contentNotes: [
      "Google: «маркетинговое агентство» — позиция ~1–11 (снимки 18–20.05), Яндекс SERP часто >20 при 600+ показов в панели.",
      "Главная — хаб; не перегружать коммерческими кластерами услуг.",
    ],
    technicalNotes: [
      "Канон: https://serenity.agency (без слэша).",
      "Статика с мая 2026 — переобход в Вебмастере/GSC обязателен после meta/H1.",
      "no-store на главной в meta cache — для CDN см. AGENTS.md (origin no-cache без no-store на проде).",
    ],
  },
  {
    id: "kompleksnoye-prodvizheniye",
    slug: "kompleksnoye-prodvizheniye",
    title: "Комплексное продвижение",
    path: "/kompleksnoye-prodvizheniye",
    url: "https://serenity.agency/kompleksnoye-prodvizheniye",
    isStatic: false,
    staticSince: "",
    rankDashboardPageId: "kompleksnoye-prodvizheniye",
    queries: [{ id: "prodvizhenie", text: "комплексное продвижение" }],
    checklistP1: [
      "Перенос на статический контур + routing.conf (после ОК на конфиг) — приоритет выше точечных правок WP.",
      "Title/H1 с «комплексное продвижение»; description — SEO + контекст + контент, Москва/СПб.",
      "H2: этапы продвижения, состав услуг, сроки и KPI.",
      "Таблица форматов / пакетов; кейсы с цифрами.",
    ],
    checklistP2: [
      "301 с сохранением URL /kompleksnoye-prodvizheniye (канон без слэша).",
      "Перелинковка: marketing ↔ kompleksnoye; ссылки с блога.",
      "FAQ + schema; форма в HTML.",
    ],
    checklistP3: [
      "После go-live — полный SERP gap (как kontekstnaya) для уточнения блоков.",
      "og:image и ассеты в /_sa/img/services/…",
    ],
    metaRecommendations: {
      title: "Комплексное продвижение сайта — агентство Serenity, Москва и СПб",
      description:
        "Комплексное продвижение бизнеса: SEO, контекст, контент и аналитика. Стоимость и кейсы — Serenity.",
      h1: "Комплексное продвижение",
    },
    contentNotes: [
      "Сейчас legacy WordPress — аудит ниже по live HTML; GSC ~325 показов, Google SERP ~17–18 (май 2026).",
      "Яндекс панель ~7.5 при SERP 18 СПб — потенциал роста после статики.",
    ],
    technicalNotes: [
      "До переноса: не ломать URL; проверить canonical на WP.",
      "В sitemap URL уже есть — после статики обновить lastmod и переобход.",
    ],
    migrationNotes: [
      "Собрать страницу в репозитории (паритет с marketing/kontekstnaya static stack).",
      "Добавить в nginx/routing.conf только после явного «да» на конфиг.",
      "deploy-prod + deploy-dev для превью на static.serenity.agency.",
    ],
  },
  {
    id: "smm",
    slug: "smm-marketing",
    title: "Комплексный SMM",
    path: "/smm_marketing",
    url: "https://serenity.agency/smm_marketing",
    isStatic: true,
    staticSince: "2026-05",
    rankDashboardPageId: "smm",
    queries: [
      { id: "smm-prodvizhenie", text: "smm продвижение" },
      { id: "smm-agentstvo", text: "smm агентство" },
      { id: "vedenie-sotssetey", text: "ведение соцсетей" },
    ],
    checklistP1: [
      "Title: в начале «SMM продвижение» или «SMM агентство»; description — Москва/СПб, кейсы, стоимость, CTA. Сейчас title «Комплексный SMM — Serenity» — нет ВЧ-запроса в начале.",
      "H1 «SMM продвижение» или «SMM продвижение в соцсетях» (сейчас «Комплексный SMM» — не совпадает с ВЧ-запросами); subtitle с «ведение соцсетей» и «smm агентство».",
      "Коммерческий H2: «SMM продвижение под ключ» или «Ведение соцсетей для бизнеса» — явная связь с ВЧ-кластером, которого нет в текущих 10 H2.",
      "Go-live статики + routing.conf (после ОК на конфиг): на prod сейчас legacy — блокер для индексации и ранжирования новой страницы.",
    ],
    checklistP2: [
      "Таблица тарифов / пакетов SMM (Старт — Стандарт — Премиум) — усилить текущий слайдер price-card сравнительной таблицей.",
      "Кейсы SMM с метриками (охват, вовлечённость, лиды/заявки) — три кейса уже есть (Toofli, Во!Молоко, Композит), добавить цифры результатов.",
      "FAQ: 8 пунктов уже есть — проверить наличие schema FAQPage JSON-LD = видимый текст; добавить «стоимость SMM продвижения», «сроки запуска».",
      "Перелинковка: marketing → smm_marketing; smm → targeting (таргет); smm → kontekstnaya_reklama; блог про SMM-кейсы.",
    ],
    checklistP3: [
      "Полный SERP gap (топ-20 конкурентов) по запросам «smm продвижение», «smm агентство», «ведение соцсетей» × Яндекс/Google × Москва/СПб.",
      "Блок «Читайте в блоге» — 3–4 статьи про SMM, контент-стратегию, продвижение в соцсетях.",
      "og:image: проверить /_sa/img/services/smm_marketing/hero/collage.webp — размер и качество для сниппетов.",
      "Переобход URL в GSC и Я.Вебмастер после правок meta и go-live.",
    ],
    metaRecommendations: {
      title:
        "SMM продвижение и ведение соцсетей — агентство Serenity, Москва и СПб",
      description:
        "SMM продвижение для бизнеса: стратегия, контент, таргет и аналитика. Кейсы, стоимость и тарифы — SMM агентство Serenity, Москва и Санкт-Петербург.",
      h1: "SMM продвижение (subtitle: «ведение соцсетей для бизнеса — стратегия, контент, реклама»)",
    },
    contentNotes: [
      "GSC: 1578 показов, 8 кликов, средняя позиция 22.9 — страница проиндексирована, но далеко от топ-10.",
      "Яндекс: «ведение соцсетей цена» — 264 показа, позиция 29.1; «smm агентство» — 76 показов, позиция 15.1.",
      "Google: «смм агентство» — 123 показа, позиция 25.6; «смм агентство спб» — 45 показов, позиция 3.8 (уже в топ!).",
      "Структура контента сильная (10 H2, 8 FAQ, кейсы, команда, ~2000 слов), но H2 не содержат целевые ВЧ-запросы — «smm продвижение», «ведение соцсетей».",
      "Текущие H2: Наш подход, Этапы, Исследование, SMM-стратегия, Оформление, Реализация, Отчеты, Результат, Преимущества, Команда — хорошо для UX, но нет SEO-сигналов.",
    ],
    technicalNotes: [
      "Канон: https://serenity.agency/smm_marketing (без слэша).",
      "BreadcrumbList JSON-LD есть; FAQPage JSON-LD — нет (добавить по FAQ-блоку из 8 пунктов).",
      "Product/Offer schema на price-card — проверить цены и image на /_sa/.",
      "Форма заявки в DOM (#desktop-order-popup); inline-form на странице — ДА.",
      "CWV после Nuxt CSS bundle; immutable ?v= на /_sa/.",
    ],
    migrationNotes: [
      "Статика собрана: smm_marketing/index.html в репозитории.",
      "Добавить в nginx/routing.conf только после явного «да» на конфиг.",
      "deploy-prod + deploy-dev; после go-live — sitemap lastmod и переобход.",
    ],
  },
  {
    id: "korporativnyj",
    slug: "korporativnyj-sajt",
    title: "Корпоративный сайт",
    path: "/korporativnyj_sajt",
    url: "https://serenity.agency/korporativnyj_sajt",
    isStatic: false,
    staticSince: "",
    rankDashboardPageId: "korporativnyj-sajt",
    queries: [
      { id: "sozdanie", text: "создание корпоративного сайта" },
      { id: "razrabotka", text: "разработка корпоративного сайта" },
    ],
    checklistP1: [
      "Go-live статики + routing.conf (после ОК на конфиг): на prod сейчас legacy без H2 — главный блокер для топ-10.",
      "Title/description: в начале «разработка корпоративного сайта» и «создание корпоративного сайта»; Москва/СПб; CTA без переспама (Яндекс ~12 при 800+ показов, 0 кликов в Google).",
      "Hero: H1 «Разработка корпоративных сайтов» + подзаголовок с «создание корпоративного сайта»; полоса KPI (сайты, отрасли, сроки, награды).",
      "Два коммерческих H2: «Создание корпоративного сайта» и «Разработка корпоративного сайта под ключ» — развести интенты, не только h3 в этапах.",
    ],
    checklistP2: [
      "Таблица сравнения пакетов (корпоративный / интернет-магазин / лендинг) в дополнение к слайдеру price-card.",
      "Кейсы корпоративных сайтов с метриками (срок, CMS, конверсия) — блок «Ещё кейсы» уже есть, усилить SEO-текстом.",
      "FAQ 5–7 пунктов: сроки, стоимость, CMS, поддержка; FAQPage JSON-LD = видимый текст.",
      "Перелинковка: главная, /services, marketing, блог про разработку сайтов.",
    ],
    checklistP3: [
      "После go-live — полный SERP gap (как kontekstnaya/targeting) по двум запросам × Яндекс/Google × Москва/СПб.",
      "Блок «Читайте в блоге» — 3–4 статьи про корпоративные сайты / UX / CMS.",
      "og:image и ассеты в /_sa/img/services/korporativnyj_sajt/…; переобход в GSC и Я.Вебмастер.",
    ],
    metaRecommendations: {
      title: "Разработка и создание корпоративного сайта — Serenity, Москва и СПб",
      description:
        "Создание корпоративного сайта под ключ: дизайн, разработка, интеграции и поддержка. Стоимость и кейсы — агентство Serenity, Москва и Санкт-Петербург.",
      h1: "Разработка корпоративных сайтов (subtitle с «создание корпоративного сайта»)",
    },
    contentNotes: [
      "Яндекс (панель): «разработка» ~12.1 (451 пок.), «создание» ~12.1 (372 пок.) — на границе топ-10; SERP СПб: 3 и 8 (снимок 2026-05-19), Москва: 13 и 28.",
      "Google: страница вне топ-20 по обоим запросам — после статики усилить title/H2 и внутренние ссылки.",
      "Статическая сборка в репо: 8 H2, FAQ, кейсы, награды, price-cards — выше legacy на prod (0 H2, h1 «корпоративный сайт»).",
    ],
    technicalNotes: [
      "Канон: https://serenity.agency/korporativnyj_sajt (без слэша).",
      "Product/Offer schema на price-card — проверить цены и image на /_sa/.",
      "Форма заявки в DOM (#desktop-order-popup); CWV после Nuxt CSS bundle.",
      "301 с /korporativnyj_sajt/ при go-live; sitemap lastmod после деплоя.",
    ],
    migrationNotes: [
      "Статика собрана: korporativnyj_sajt/index.html, verify-korporativnyj.cjs.",
      "Добавить в nginx/routing.conf только после явного «да» на конфиг.",
      "deploy-prod + deploy-dev; test:korporativnyj + test:layout-smoke.",
    ],
  },
];

export function getOnepageTzPage(id) {
  const p = ONEPAGE_TZ_PAGES.find((x) => x.id === id);
  if (!p) throw new Error(`Unknown onepage TZ page: ${id}`);
  return p;
}

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
];

export function getOnepageTzPage(id) {
  const p = ONEPAGE_TZ_PAGES.find((x) => x.id === id);
  if (!p) throw new Error(`Unknown onepage TZ page: ${id}`);
  return p;
}

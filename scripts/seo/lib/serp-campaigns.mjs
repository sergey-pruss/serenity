import path from "node:path";
import { ARTIFACTS_DIR, ENGINES, GAP_REGION_IDS, REGIONS, ROOT, serpMatrixKey } from "./serp-shared.mjs";

export const SNAPSHOT_DATE =
  process.env.SERP_SNAPSHOT_DATE ||
  new Date().toISOString().slice(0, 10).replace(/-/g, "");

/** @typedef {'kontekstnaya' | 'targeting' | 'korporativnyj'} SerpCampaignId */

/** @type {Record<SerpCampaignId, import('./serp-campaigns.mjs').SerpCampaign>} */
export const SERP_CAMPAIGNS = {
  kontekstnaya: {
    id: "kontekstnaya",
    serenityUrl:
      process.env.SERENITY_KONTEKST_URL || "https://serenity.agency/kontekstnaya_reklama",
    queries: [
      { id: "nastroyka", text: "настройка контекстной рекламы" },
      { id: "vedenie", text: "ведение контекстной рекламы" },
    ],
    poolsFixture: "kontekstnaya-serp-url-pools.json",
    docOut: path.join(ROOT, "docs", "kontekstnaya-serp-content-gap.html"),
    snapshotsBasename: "kontekstnaya-serp-snapshots",
    auditBasename: "kontekstnaya-serp-audit",
    reportTitle: "Serenity — gap-анализ /kontekstnaya_reklama (SERP)",
    reportH1: "Gap-анализ: контекстная реклама (SERP)",
    reportSubtitleQueries:
      "с органической выдачей топ-20 по 2 запросам, Яндекс и Google, Москва и Санкт-Петербург",
    serenityPathLabel: "/kontekstnaya_reklama",
    excludeBlocksFromPriority: ["focus_nastroyka", "focus_vedenie"],
    aggregatePriorityThresholds: { p1: 6, p2: 4, p3: 2 },
    querySectionNote: (block) =>
      block.queryId === "vedenie"
        ? "Запрос про <strong>ведение</strong>: в топе чаще акцент на отчёты, ежемесячную оптимизацию и SLA — проверьте строки <code>focus_vedenie</code>."
        : "Запрос про <strong>настройку</strong>: в топе чаще запуск, аудит, семантика — смотрите <code>focus_nastroyka</code>.",
    executive: {
      intro:
        "На основе SERP-снимка и аудита посадочных. Служебные URL Яндекса в сравнении не участвуют.",
      priorities: [
        "Полоса KPI над сгибом — 3–4 цифры (проекты, годы, кампании, сертификация).",
        "Доверие: логотипы клиентов сразу под hero.",
        "Отзывы — отдельная секция с рейтингом/цитатами.",
        "Гео в первом экране — Москва и Санкт-Петербург.",
        "Развести H2 под интенты «настройка» и «ведение» контекста.",
        "Таблица сравнения пакетов в дополнение к карточкам.",
        "Гарантии и SLA — видимым блоком, не только в FAQ.",
      ],
      technical: [
        "Title и H1 — связка «настройка» + «ведение»; в description — Москва/СПб и «Яндекс Директ».",
        "FAQPage и Product/Offer — синхронизировать JSON-LD с видимым текстом.",
        "Форма в DOM для краулера.",
        "CWV и актуальный <code>?v=</code> на <code>/_sa/</code>.",
        "Внутренние ссылки на статьи блога про контекст/B2B/Директ.",
        "Канон на <code>/kontekstnaya_reklama</code>, sitemap, переобход в Вебмастере/GSC.",
      ],
      optional: [
        "Калькулятор/квиз бюджета.",
        "Короткое видео (эксперт или кейс).",
        "Онлайн-чат при реальной обработке диалогов.",
      ],
      rollout:
        "KPI + гео в hero → логотипы + отзывы → таблица пакетов + блоки «ведение»/«настройка» → гарантии/SLA → блог-тизер и CWV/schema.",
    },
  },
  targeting: {
    id: "targeting",
    serenityUrl:
      process.env.SERENITY_TARGETING_URL || "https://serenity.agency/targeting",
    queries: [{ id: "targetirovka", text: "таргетинговая реклама" }],
    poolsFixture: "targeting-serp-url-pools.json",
    docOut: path.join(ROOT, "docs", "targeting-serp-content-gap.html"),
    snapshotsBasename: "targeting-serp-snapshots",
    auditBasename: "targeting-serp-audit",
    reportTitle: "Serenity — gap-анализ /targeting (SERP)",
    reportH1: "Gap-анализ: таргетинговая реклама (SERP)",
    reportSubtitleQueries:
      "с органической выдачей топ-20 по запросу «таргетинговая реклама», Яндекс и Google, Москва и Санкт-Петербург",
    serenityPathLabel: "/targeting",
    excludeBlocksFromPriority: ["focus_nastroyka", "focus_vedenie", "platforms_direct"],
    aggregatePriorityThresholds: { p1: 3, p2: 2, p3: 1 },
    querySectionNote: () =>
      "Запрос <strong>таргетинговая реклама</strong>: в топе чаще VK, Telegram, креативы, этапы запуска и пакеты — смотрите <code>platforms_social</code>, кейсы и FAQ.",
    executive: {
      intro:
        "На основе SERP-снимка и аудита посадочных по запросу «таргетинговая реклама». Служебные URL Яндекса исключены.",
      priorities: [
        "Полоса KPI — проекты, охваты, CPA/лиды, опыт в соцсетях (у лидеров выдачи часто в hero).",
        "Площадки — явный блок VK / Telegram / (при необходимости) других соцсетей с иконками, не только в тексте.",
        "Логотипы клиентов и отзывы — social proof отдельно от кейсов.",
        "Гео в первом экране — «таргет в Москве и Санкт-Петербурге».",
        "Этапы таргетинга — отдельный H2 с брифом, креативами, запуском и оптимизацией.",
        "Таблица или сравнение пакетов таргета (не только слайдер).",
        "Кейсы по соцсетям — с метриками (CTR, CPL, охват).",
        "FAQ по маркировке, бюджету, срокам запуска — синхронно со schema.",
      ],
      technical: [
        "Title/H1 — «таргетинговая реклама» + соцсети + Москва/СПб; description без переспама.",
        "FAQPage / Product — JSON-LD совпадает с видимым FAQ.",
        "Форма заявки в DOM; канон <code>/targeting</code>.",
        "CWV: Nuxt CSS, <code>?v=</code> на <code>/_sa/</code>, LCP hero.",
        "Перелинковка на статьи блога про VK/Telegram/таргет.",
        "Sitemap и переобход после выкладки.",
      ],
      optional: [
        "Калькулятор бюджета на таргет.",
        "Видео-кейс или разбор креативов.",
        "Чат/мессенджер при операторе.",
      ],
      rollout:
        "KPI + площадки в hero → логотипы + отзывы → таблица пакетов + кейсы соцсетей → FAQ/гарантии → блог и CWV.",
    },
  },
  korporativnyj: {
    id: "korporativnyj",
    rankDashboardPageId: "korporativnyj-sajt",
    serenityUrl:
      process.env.SERENITY_KORPORATIVNYJ_URL ||
      "https://static.serenity.agency/korporativnyj_sajt",
    queries: [
      { id: "sozdanie", text: "создание корпоративного сайта" },
      { id: "razrabotka", text: "разработка корпоративного сайта" },
    ],
    poolsFixture: "korporativnyj-serp-url-pools.json",
    docOut: path.join(ROOT, "docs", "korporativnyj-serp-content-gap.html"),
    snapshotsBasename: "korporativnyj-serp-snapshots",
    auditBasename: "korporativnyj-serp-audit",
    reportTitle: "Serenity — SEO-стратегия /korporativnyj_sajt (onepage, топ-10)",
    reportH1: "SEO-стратегия: корпоративный сайт → топ-10",
    reportLayout: "onepage-strategy",
    serenityPathLabel: "/korporativnyj_sajt",
    excludeBlocksFromPriority: [
      "focus_nastroyka",
      "focus_vedenie",
      "platforms_direct",
      "platforms_social",
    ],
    aggregatePriorityThresholds: { p1: 5, p2: 3, p3: 2 },
    querySectionNote: (block) =>
      block.queryId === "sozdanie"
        ? "Запрос про <strong>создание</strong>: в топе чаще «под ключ», сроки, стоимость, CMS — смотрите <code>process_steps</code>, <code>pricing_packages</code>, FAQ."
        : "Запрос про <strong>разработку</strong>: в топе чаще этапы, стек, кейсы, команда — смотрите <code>process_steps</code>, <code>cases</code>, <code>team</code>.",
    recommendations: {
      stats_kpi:
        "Полоса KPI над сгибом: сайты, отрасли, сроки, награды (3–4 цифры).",
      trust_logos: "Логотипы клиентов / «нам доверяют» сразу под hero.",
      process_steps:
        "Этапы разработки — отдельный H2: бриф, прототип, дизайн, вёрстка, CMS, запуск.",
      price_table_compare:
        "Таблица сравнения форматов (корпоративный / магазин / лендинг) — не только слайдер.",
      cases: "Кейсы корпоративных сайтов с метриками: срок, CMS, результат.",
      testimonials: "Отзывы клиентов — отдельно от кейсов.",
      team: "Блок команды или экспертизы (дизайн, разработка, поддержка).",
      faq: "FAQ 5–7 пунктов: сроки, стоимость, CMS, поддержка; schema FAQPage.",
      geo_moscow_spb: "Гео в hero/subtitle — Москва и Санкт-Петербург.",
      guarantees: "Гарантии, SLA поддержки, условия сопровождения после запуска.",
      blog_teaser: "3–4 статьи блога про разработку сайтов / UX / CMS.",
      calculator: "Калькулятор или квиз «рассчитать стоимость сайта».",
    },
    onepageStrategy: {
      targetWordCountMin: 2800,
      targetFaqMin: 7,
      keywordHeadings: [
        {
          title: "Создание корпоративного сайта",
          hint: "H2 + 300–500 слов: под ключ, сроки, стоимость «от», CMS, что входит.",
        },
        {
          title: "Разработка корпоративного сайта",
          hint: "H2 + 300–500 слов: этапы, стек, интеграции, кейсы, команда.",
        },
        {
          title: "Москва и Санкт-Петербург",
          hint: "В hero/subtitle и одном H2 — региональная привязка без спама.",
        },
      ],
      faqQuestions: [
        "Сколько стоит разработка корпоративного сайта?",
        "Сколько времени занимает создание сайта под ключ?",
        "Какие CMS используете (1С-Битрикс, WordPress, headless)?",
        "Что входит в стоимость: дизайн, вёрстка, наполнение, SEO-база?",
        "Делаете ли сайты для Москвы и Санкт-Петербурга / удалённо?",
        "Есть ли поддержка и доработки после запуска?",
        "Можно ли интегрировать CRM, оплату, личный кабинет?",
        "Чем корпоративный сайт отличается от лендинга и интернет-магазина?",
      ],
      actions: [
        "Таблица сравнения пакетов (корпоративный / магазин / лендинг) — у большинства конкурентов есть тарифная сетка, у нас только слайдер карточек.",
        "Блок «Читайте в блоге» — 3–4 статьи про разработку сайтов, CMS, UX (внутренняя перелинковка).",
        "Усилить FAQ: сейчас ~3 вопроса, у сильных страниц — 7–15.",
        "Опционально: калькулятор/квиз «рассчитать стоимость» (есть у части топ-20).",
        "Поддержка после запуска — отдельный подблок: SLA, сроки реакции, что входит в сопровождение.",
      ],
      techChecklist: [
        "Title/description: оба запроса дашборда + Москва/СПб; H1 согласован с title.",
        "FAQPage и Product/Offer JSON-LD = видимый текст на странице.",
        "Канон <code>/korporativnyj_sajt</code>, форма заявки в DOM, CWV, актуальный <code>?v=</code> на <code>/_sa/</code>.",
        "Hub-ссылки: главная, /services, marketing, блог; переобход в GSC и Я.Вебмастер после go-live.",
      ],
      blockers: [
        "На prod сейчас legacy без нормальной структуры H2 — go-live статики /korporativnyj_sajt обязателен до SEO-работ.",
        "Google: оба запроса вне топ-20; Яндекс: «разработка» ~12, «создание» ~12 — нужны сниппет и объём, не только блоки.",
      ],
      rollout:
        "Go-live статики → KPI и гео в hero → H2 «создание» / «разработка» → таблица пакетов → кейсы → FAQ 7+ → блог и schema → переобход.",
    },
  },
};

/**
 * @param {SerpCampaignId} [id]
 * @returns {typeof SERP_CAMPAIGNS[SerpCampaignId] & {
 *   docOut: string;
 *   serpCount: number;
 *   snapshotsPath: (date?: string) => string;
 *   auditPath: (date?: string) => string;
 * }}
 */
export function getSerpCampaign(id) {
  const key =
    id ||
    /** @type {SerpCampaignId} */ (process.env.SERP_CAMPAIGN || "kontekstnaya");
  const c = SERP_CAMPAIGNS[key];
  if (!c) {
    throw new Error(`Unknown SERP_CAMPAIGN: ${key}`);
  }
  const serpCount = c.queries.length * ENGINES.length * GAP_REGION_IDS.length;
  return {
    ...c,
    serpCount,
    snapshotsPath(date = SNAPSHOT_DATE) {
      return path.join(ARTIFACTS_DIR, `${c.snapshotsBasename}-${date}.json`);
    },
    auditPath(date = SNAPSHOT_DATE) {
      return path.join(ARTIFACTS_DIR, `${c.auditBasename}-${date}.json`);
    },
  };
}

export { ENGINES, REGIONS, serpMatrixKey, ARTIFACTS_DIR };

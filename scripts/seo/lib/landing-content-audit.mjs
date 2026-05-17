import * as cheerio from "cheerio";

/** @typedef {typeof BLOCK_IDS[number]} BlockId */

export const BLOCK_IDS = [
  "hero_cta",
  "trust_logos",
  "stats_kpi",
  "process_steps",
  "services_grid",
  "pricing_packages",
  "price_table_compare",
  "calculator",
  "cases",
  "testimonials",
  "team",
  "faq",
  "awards_certs",
  "platforms_direct",
  "geo_moscow_spb",
  "guarantees",
  "video",
  "blog_teaser",
  "lead_form",
  "chat_widget",
  "b2b_focus",
  "ecommerce_focus",
  "seo_footer_text",
  "schema_product",
  "schema_faq",
  "focus_vedenie",
  "focus_nastroyka",
  "platforms_social",
];

export const BLOCK_LABELS = {
  hero_cta: "Hero + CTA",
  trust_logos: "Логотипы клиентов / доверие",
  stats_kpi: "Цифры KPI",
  process_steps: "Этапы / процесс",
  services_grid: "Сетка услуг / форматов",
  pricing_packages: "Тарифы / пакеты",
  price_table_compare: "Таблица сравнения тарифов",
  calculator: "Калькулятор",
  cases: "Кейсы / портфолио",
  testimonials: "Отзывы",
  team: "Команда",
  faq: "FAQ",
  awards_certs: "Награды / сертификаты",
  platforms_direct: "Яндекс Директ / Google Ads",
  geo_moscow_spb: "Москва / СПб в тексте",
  guarantees: "Гарантии / SLA",
  video: "Видео",
  blog_teaser: "Блок статей",
  lead_form: "Форма на странице",
  chat_widget: "Чат / виджет",
  b2b_focus: "B2B-оффер",
  ecommerce_focus: "E-commerce",
  seo_footer_text: "SEO-текст внизу",
  schema_product: "Schema Product/Offer",
  schema_faq: "Schema FAQPage",
  focus_vedenie: "Акцент «ведение»",
  focus_nastroyka: "Акцент «настройка»",
  platforms_social:
    "VK / Telegram / соцсети (иконки или явный блок)",
};

const FETCH_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

/** @param {string} s */
function normText(s) {
  return String(s || "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/** @param {string} hay */
function hasAny(hay, needles) {
  return needles.some((n) => hay.includes(n));
}

/** @param {cheerio.CheerioAPI} $ */
function pickContentRoot($) {
  const selectors = [
    "main",
    "article",
    '[role="main"]',
    ".page-constructor",
    "#content",
    ".content",
    ".page__container",
  ];
  for (const sel of selectors) {
    const el = $(sel).first();
    if (el.length && normText(el.text()).length > 200) return el;
  }
  return $("body");
}

/** @param {cheerio.CheerioAPI} $ @param {import('cheerio').AnyNode} root */
function wordCount($, root) {
  const text = $(root).text();
  const words = normText(text).split(" ").filter((w) => w.length > 1);
  return words.length;
}

/** @param {cheerio.CheerioAPI} $ */
function collectJsonLd($) {
  const types = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const raw = $(el).html() || "";
      const data = JSON.parse(raw);
      const list = Array.isArray(data) ? data : [data];
      for (const item of list) {
        if (item && item["@type"]) {
          const t = item["@type"];
          if (Array.isArray(t)) types.push(...t.map(String));
          else types.push(String(t));
        }
      }
    } catch {
      /* ignore */
    }
  });
  return types.map((t) => t.toLowerCase());
}

/**
 * @param {string} html
 * @param {string} pageUrl
 */
export function auditLandingHtml(html, pageUrl) {
  const $ = cheerio.load(html);
  const root = pickContentRoot($);
  const bodyText = normText($("body").text());
  const contentText = normText($(root).text());
  const h1 = normText($("h1").first().text());
  const h2s = $("h2")
    .map((_, el) => normText($(el).text()))
    .get();
  const h3s = $("h3")
    .map((_, el) => normText($(el).text()))
    .get();
  const headings = [...h2s, ...h3s].join(" | ");

  const ctaPattern =
    /оставить заявку|заказать|получить консультац|оставить заявку|связаться|заказать услуг|рассчитать стоимость|получить предложен/i;
  const hasCta =
    $('a, button, [role="button"]').filter((_, el) => {
      const t = normText($(el).text());
      return ctaPattern.test(t) || /application|buttonlink|order-popup/i.test($(el).attr("class") || "");
    }).length > 0;

  const ldTypes = collectJsonLd($);

  const faqItems =
    $(".spoiler, .faq-item, .accordion, [itemtype*='FAQPage'] .question, details").length ||
    (bodyText.includes("вопрос") && bodyText.includes("ответ") ? 3 : 0);

  const caseCards =
    $('[class*="case"], .cases-block, .portfolio, [class*="portfolio"]').length ||
    (hasAny(headings, ["кейс", "портфолио", "проект"]) ? 2 : 0);

  const forms = $("form").length;

  /** @type {Record<BlockId, boolean>} */
  const blocks = {
    hero_cta: h1.length > 3 && hasCta,
    trust_logos:
      hasAny(bodyText, ["нам доверяют", "наши клиенты", "клиенты"]) ||
      $('[class*="client"], [class*="partner"], [class*="logo-wall"]').length > 2,
    stats_kpi:
      hasAny(bodyText, [
        "лет на рынке",
        "проектов",
        "клиентов",
        "лидов",
        "nps",
        "более ",
        "от ",
      ]) &&
      /\d{2,}/.test(contentText.slice(0, 8000)),
    process_steps:
      hasAny(headings, ["этап", "процесс", "как мы работаем", "запуск"]) ||
      $('[class*="step"], [class*="timeline"], .columns-with-progress').length > 0,
    services_grid:
      hasAny(headings, ["услуг", "формат", "виды реклам", "что входит"]) ||
      $('[class*="service"]').length > 4,
    pricing_packages:
      hasAny(bodyText, ["пакет", "тариф", "от ", " ₽", "руб"]) &&
      hasAny(bodyText, ["стоимость", "цена", "пакет", "тариф"]),
    price_table_compare:
      $("table").length > 0 &&
      hasAny(bodyText, ["сравнен", "тариф", "пакет", "базовый", "расширен"]),
    calculator:
      hasAny(bodyText, ["калькулятор", "рассчитать стоимость"]) ||
      $('[class*="calcul"]').length > 0,
    cases:
      caseCards > 0 || hasAny(headings, ["кейс", "портфолио", "наши работы"]),
    testimonials:
      hasAny(bodyText, ["отзыв", "рейтинг", "нам написали", "благодар"]) ||
      $('[class*="review"], [class*="testimonial"]').length > 0,
    team:
      hasAny(headings, ["команд", "специалист", "эксперт"]) ||
      $('[class*="team"]').length > 0,
    faq:
      faqItems >= 2 ||
      hasAny(headings, ["вопрос", "faq", "частые вопросы"]),
    awards_certs:
      hasAny(headings, ["наград", "сертифик", "партнёр", "аккредит"]) ||
      $('[class*="award"]').length > 0,
    platforms_direct:
      hasAny(bodyText, ["яндекс директ", "директ", "google ads", "google ads"]) ||
      $('img[alt*="директ"], img[alt*="Direct"]').length > 0,
    geo_moscow_spb:
      hasAny(bodyText, ["москв", "санкт-петербург", "петербург", "спб"]) &&
      hasAny(bodyText, ["контекст", "директ", "реклам", "таргет", "соцсет"]),
    platforms_social:
      hasAny(bodyText, [
        "вконтакт",
        " vk",
        "vkontakte",
        "instagram",
        "инстаграм",
        "telegram",
        "телеграм",
        "фейсбук",
        "facebook",
        "одноклассник",
        "mytarget",
      ]) ||
      $('img[alt*="VK"], img[alt*="ВК"], img[alt*="Telegram"], img[alt*="Instagram"]')
        .length > 0,
    guarantees:
      hasAny(bodyText, ["гарант", "sla", "возврат", "без риска"]),
    video:
      $("video, iframe[src*='youtube'], iframe[src*='rutube'], iframe[src*='vkvideo']").length > 0,
    blog_teaser:
      hasAny(headings, ["блог", "статьи", "публикац"]) ||
      $('[class*="blog"]').length > 2,
    lead_form:
      forms > 0 ||
      $("#sa-inline-lead-root, #desktop-order-popup, .lead-form, .order-popup, [data-sa-inline-lead]")
        .length > 0,
    chat_widget:
      hasAny(bodyText, []) ||
      $("script[src*='jivo'], script[src*='carrot'], script[src*='intercom']").length > 0 ||
      $('[class*="jivo"], #jivo, [id*="carrot"]').length > 0,
    b2b_focus: hasAny(bodyText, ["b2b", "для бизнеса", "юридическ", "корпоратив"]),
    ecommerce_focus: hasAny(bodyText, ["интернет-магазин", "e-commerce", "ecommerce", "товарн"]),
    seo_footer_text:
      contentText.length > 3500 &&
      $("footer").length > 0 &&
      wordCount($, root) > 1200,
    schema_product: ldTypes.some((t) => t.includes("product") || t.includes("offer")),
    schema_faq: ldTypes.some((t) => t.includes("faqpage")),
    focus_vedenie: hasAny(contentText, ["ведение", "ведём", "ведем", "ежемесяч", "отчёт", "отчет"]),
    focus_nastroyka: hasAny(contentText, ["настройк", "запуск", "настроим", "настроим"]),
  };

  let host = "";
  try {
    host = new URL(pageUrl).hostname;
  } catch {
    host = "";
  }

  const pageType = classifyPageType(host, bodyText, pageUrl);

  return {
    url: pageUrl,
    host,
    pageType,
    blocks,
    volumes: {
      word_count_visible: wordCount($, root),
      h2_count: $("h2").length,
      h3_count: $("h3").length,
      image_count: $("img").length,
      faq_items: faqItems,
      case_cards_est: caseCards,
      form_count: forms,
      internal_links: $('a[href^="/"], a[href*="' + host + '"]').length,
      external_links: $('a[href^="http"]').filter((_, el) => {
        const h = $(el).attr("href") || "";
        return !h.includes(host);
      }).length,
    },
    h1: h1.slice(0, 200),
    error: null,
  };
}

/**
 * @param {string} host
 * @param {string} bodyText
 * @param {string} url
 */
function classifyPageType(host, bodyText, url) {
  if (/serenity\.agency/i.test(host)) return "serenity";
  if (
    /vc\.ru|habr\.|medium\.|blog\.|\/blog\/|\/article\/|tjournal|spark\.ru/i.test(url) ||
    hasAny(bodyText, ["минут на чтение", "автор:", "опубликован"])
  ) {
    return "article";
  }
  if (
    /uslugi\.|avito\.|profi\.|youdo\.|fl\.ru|kwork\./i.test(host) ||
    hasAny(bodyText, ["исполнител", "заказать услугу на"])
  ) {
    return "aggregator";
  }
  if (
    hasAny(bodyText, [
      "агентств",
      "контекстн",
      "директ",
      "настройк",
      "ведение",
      "рекламн",
      "таргет",
      "таргетир",
    ]) &&
    (hasAny(bodyText, ["оставить заявку", "стоимость", "тариф", "кейс"]) ||
      /\/uslugi|\/services|\/kontekst|\/context|\/ppc|\/direct/i.test(url))
  ) {
    return "agency_landing";
  }
  return "other";
}

/**
 * @param {string} url
 * @param {{ timeoutMs?: number }} [opts]
 */
export async function fetchAndAudit(url, opts = {}) {
  const timeoutMs = opts.timeoutMs ?? 25000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": FETCH_UA,
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "ru-RU,ru;q=0.9",
      },
      redirect: "follow",
    });
    if (!res.ok) {
      return {
        url,
        host: "",
        pageType: "error",
        blocks: Object.fromEntries(BLOCK_IDS.map((id) => [id, false])),
        volumes: emptyVolumes(),
        h1: "",
        error: `HTTP ${res.status}`,
      };
    }
    const html = await res.text();
    const audit = auditLandingHtml(html, res.url || url);
    return audit;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      url,
      host: "",
      pageType: "error",
      blocks: Object.fromEntries(BLOCK_IDS.map((id) => [id, false])),
      volumes: emptyVolumes(),
      h1: "",
      error: msg,
    };
  } finally {
    clearTimeout(timer);
  }
}

function emptyVolumes() {
  return {
    word_count_visible: 0,
    h2_count: 0,
    h3_count: 0,
    image_count: 0,
    faq_items: 0,
    case_cards_est: 0,
    form_count: 0,
    internal_links: 0,
    external_links: 0,
  };
}

/** @param {number[]} arr */
export function median(arr) {
  const a = arr.filter((n) => Number.isFinite(n)).sort((x, y) => x - y);
  if (!a.length) return 0;
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
}

/** @param {number[]} arr */
export function percentile25(arr) {
  const a = arr.filter((n) => Number.isFinite(n)).sort((x, y) => x - y);
  if (!a.length) return 0;
  const idx = Math.floor(a.length * 0.25);
  return a[Math.min(idx, a.length - 1)];
}

#!/usr/bin/env node
/**
 * Генерирует json/services/uvelichenie-konversii-saita/faq.json и partial faq-uvelichenie-konversii-saita.html
 */
const fs = require("fs");
const path = require("path");
const { syncFaqBodyHtmlJsonLd } = require("./lib/build-faq-page-jsonld.cjs");

const root = path.resolve(__dirname, "..");
const slug = "uvelichenie-konversii-saita";
const ico =
  '<div class="spoiler__ico"><svg width="16" height="9" viewBox="0 0 16 9" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M15.4238 1L8.05694 7.96972L0.885888 0.798671" stroke="white" stroke-linecap="round" stroke-linejoin="round"></path></svg></div>';

function spoiler(question, answer) {
  return `<div class="spoiler block"><div class="spoiler__head"><h3 class="block__question">${question}</h3> ${ico}</div> <div class="spoiler__content" ><div class="spoiler__content-inner"><div class="spoiler__content-wr"><div class="spoiler__content-slot"><div class="block__content">${answer}</div></div></div></div></div></div>`;
}

const items = [
  [
    spoiler(
      "Сколько времени занимает работа по&nbsp;увеличению конверсии?",
      "Обычно для среднего корпоративного сайта первые изменения внедряются в&nbsp;течение 2–4 недель после старта и&nbsp;согласования плана работ — в&nbsp;том числе в&nbsp;рамках <a href=\"/tehnicheskaya-podderzhka-saita\" class=\"sa-invisible-text-link\">технической поддержки сайта</a>. После внедрения требуется от&nbsp;1 до&nbsp;3 месяцев, чтобы корректно замерить эффект: собрать данные, сравнить поведение пользователей и&nbsp;подтвердить влияние изменений на&nbsp;конверсию и&nbsp;бизнес-метрики. Работа строится циклично: анализ — гипотезы — внедрение — измерение — усиление. Каждый цикл даёт измеримый результат, а&nbsp;сайт развивается постоянно — не&nbsp;по&nbsp;принципу «сделали один раз и&nbsp;забыли».",
    ),
    spoiler(
      "Как вы прогнозируете, что улучшения дадут рост?",
      "Каждая гипотеза проходит оценку по&nbsp;Impact–Effort: прогноз влияния на&nbsp;конверсию, сложность внедрения, сроки и&nbsp;стоимость. Чем больше исходных данных есть на&nbsp;старте, тем точнее можно оценить, какие изменения дадут максимальный эффект.",
    ),
    spoiler(
      "Когда я увижу изменения в&nbsp;доходе?",
      "Первый эффект обычно появляется после внедрения быстрых улучшений — иногда уже в&nbsp;первый месяц. Дальше включается продуктовый цикл: тестирование, анализ, масштабирование работающих гипотез и&nbsp;усиление слабых мест. Итог — устойчивый рост, который накапливается с&nbsp;каждой итерацией.",
    ),
  ],
  [
    spoiler(
      "Что нужно от меня на&nbsp;старте?",
      "Минимум: доступ к&nbsp;аналитике (GA4 или Яндекс.Метрика), CMS и&nbsp;понимание бизнес-целей. Желательно участие маркетолога или владельца бизнеса — продуктовый подход работает эффективнее, когда обсуждаются бизнес-процессы, УТП и&nbsp;логика продаж.",
    ),
    spoiler(
      "Что если аналитика не&nbsp;настроена или работает некорректно?",
      "Мы поможем её настроить. Корректная аналитика — обязательное условие для&nbsp;оценки эффективности, поэтому при необходимости начинаем с&nbsp;настройки GA4 или Яндекс.Метрики, событий, целей и&nbsp;трекинга поведения пользователей. Пока данные собираются, параллельно проводятся UX/UI-анализы, контент- и&nbsp;SEO-аудит или продуктовые исследования с&nbsp;реальной целевой аудиторией.",
    ),
  ],
  [
    spoiler(
      "Можно ли увеличить конверсию без редизайна?",
      "Да. Работа начинается с&nbsp;быстрых улучшений, которые часто дают рост без полной переработки сайта: исправление интерфейсных ошибок, улучшение логики каталога, корректировка контента, оптимизация сценариев конверсии, SEO-доработки, анализ поведения пользователей. Редизайн — это опция, а&nbsp;не обязательное условие.",
    ),
    spoiler(
      "Подходит ли услуга для малого бизнеса или только для крупных проектов?",
      "Услуга подходит для&nbsp;проектов любого масштаба, если есть трафик и&nbsp;задача увеличить конверсию. Особенно эффективно работает с&nbsp;e-commerce, корпоративными сайтами, услугами и&nbsp;каталогами. При небольшом объёме трафика сначала настраивается аналитика и&nbsp;оптимизируются маркетинговые каналы.",
    ),
  ],
];

const columns = items.map((col) => `<div class="blocks__column">${col.join("")}</div>`).join("");
const bodyInner = `<div class=""><div class="questions"><h3 class="questions__title kontekstnaya-page__section-heading">Вопрос-ответ</h3> <div class="questions__blocks">${columns}</div></div></div>`;
const bodyHtml = syncFaqBodyHtmlJsonLd(bodyInner);

const data = {
  mountId: "uks-faq-mounted",
  sectionClass: "uks-faq-section",
  rootClass: "uks-faq-root uks-faq-root--always-visible",
  bodyHtml,
};

const jsonPath = path.join(root, "json", "services", slug, "faq.json");
fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
fs.writeFileSync(jsonPath, `${JSON.stringify(data, null, 2)}\n`, "utf8");

const shell = fs.readFileSync(path.join(root, "html", "partials", "services", "_service-faq.shell.html"), "utf8");
const partial =
  `<!-- FAQ ${slug}: json/services/${slug}/faq.json + service-faq.css. -->\n` +
  shell
    .replace(/__SECTION_CLASS__/g, data.sectionClass)
    .replace(/__MOUNT_ID__/g, data.mountId)
    .replace(/__ROOT_CLASS__/g, data.rootClass)
    .replace("__BODY_HTML__", bodyHtml);

const partialPath = path.join(root, "html", "partials", "services", "faq-uvelichenie-konversii-saita.html");
fs.writeFileSync(partialPath, partial, "utf8");
console.log("build-uks-faq: ok →", path.relative(root, jsonPath), path.relative(root, partialPath));

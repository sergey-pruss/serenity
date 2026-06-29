#!/usr/bin/env node
/**
 * FAQ /sozdanie-internet-magazina → json + partial + index.html
 */
const fs = require("fs");
const path = require("path");
const { syncFaqBodyHtmlJsonLd } = require("./lib/build-faq-page-jsonld.cjs");

const root = path.resolve(__dirname, "..");
const slug = "sozdanie-internet-magazina";
const ico =
  '<div class="spoiler__ico"><svg width="16" height="9" viewBox="0 0 16 9" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M15.4238 1L8.05694 7.96972L0.885888 0.798671" stroke="white" stroke-linecap="round" stroke-linejoin="round"></path></svg></div>';

function spoiler(question, answer) {
  return `<div class="spoiler block"><div class="spoiler__head"><h3 class="block__question">${question}</h3> ${ico}</div> <div class="spoiler__content"><div class="spoiler__content-inner"><div class="spoiler__content-wr"><div class="spoiler__content-slot"><div class="block__content">${answer}</div></div></div></div></div></div>`;
}

const items = [
  [
    spoiler(
      "Может&nbsp;ли цена на&nbsp;интернет-магазин измениться?",
      "Да, стоимость указана «от» за&nbsp;разработку онлайн-магазина с&nbsp;нуля, поскольку под&nbsp;каждого клиента мы&nbsp;подбираем индивидуальное решение и&nbsp;количество страниц на&nbsp;сайте может отличаться от&nbsp;базового набора.",
    ),
    spoiler(
      "Оплата работ происходит сразу или&nbsp;делится на&nbsp;этапы?",
      "Каждый этап разработки интернет-магазина оплачивается по&nbsp;очереди. Сначала происходит пред- и&nbsp;постоплата этапа маркетингового проектирования, затем&nbsp;— оплата дизайна и&nbsp;после вы&nbsp;платите за&nbsp;этап разработки.",
    ),
    spoiler(
      "Сколько стоит интернет-магазин?",
      "Стартовая цена&nbsp;— 600&nbsp;000&nbsp;₽. Финальная сумма зависит от&nbsp;объёма каталога, сложности фильтров, нужных интеграций и&nbsp;уникальности дизайна. После брифа и&nbsp;обсуждения задач называем точную стоимость в&nbsp;коммерческом предложении.",
    ),
  ],
  [
    spoiler(
      "Можно&nbsp;ли заказать только часть работ по&nbsp;сайту, например, только дизайн или&nbsp;только разработку?",
      "Можно, но&nbsp;так&nbsp;ли эффективно это будет работать? Создавая сайт с&nbsp;нуля, от&nbsp;первого брифа до&nbsp;конечного релиза на&nbsp;продакшене, мы&nbsp;отвечаем за&nbsp;качество созданного онлайн-магазина. Но&nbsp;если мы&nbsp;выполняем только одну часть работ, например, дизайн, то&nbsp;не&nbsp;можем гарантировать лучший результат. Возможно, тексты написаны без SEO-оптимизации или&nbsp;недостаточно доносят преимущества компании, даже несмотря на&nbsp;современные визуалы. А&nbsp;возможно, скорость загрузки карточек товара низкая, поэтому покупатели уходят, не&nbsp;купив.",
    ),
    spoiler(
      "Какие сроки разработки?",
      "В&nbsp;среднем&nbsp;— от&nbsp;1,5 до&nbsp;7&nbsp;месяцев. Простой магазин с&nbsp;базовым каталогом запускаем за&nbsp;1,5–2&nbsp;месяца. Проект с&nbsp;уникальным дизайном и&nbsp;интеграциями&nbsp;— за&nbsp;3–4&nbsp;месяца. Крупный магазин с&nbsp;нестандартным функционалом и&nbsp;большим каталогом&nbsp;— 5–7&nbsp;месяцев.",
    ),
    spoiler(
      "С&nbsp;какими CMS вы работаете?",
      "Подбираем платформу под&nbsp;задачи проекта. Чаще всего работаем с&nbsp;1С-Битрикс: она удобна для&nbsp;интеграции различных интеграций и&nbsp;хорошо масштабируется. Для&nbsp;небольших магазинов подходит Wordpress или&nbsp;Tilda Store. Для&nbsp;проектов с&nbsp;особыми требованиями делаем самописные решения на&nbsp;Laravel или&nbsp;Symfony.",
    ),
  ],
  [
    spoiler(
      "Есть&nbsp;ли интеграция с&nbsp;1С и&nbsp;CRM?",
      "Да. Подключаем 1С в&nbsp;конфигурациях «Управление торговлей», «Розница», «УНФ», а&nbsp;также МойСклад. Со&nbsp;стороны CRM работаем с&nbsp;amoCRM и&nbsp;Битрикс24. Настраиваем обмен остатками, ценами и&nbsp;заказами&nbsp;— по&nbsp;расписанию или&nbsp;в&nbsp;реальном времени. Заявки сразу попадают в&nbsp;воронку менеджера.",
    ),
    spoiler(
      "Есть&nbsp;ли SEO при запуске?",
      "В&nbsp;работу входит базовая SEO-подготовка: семантическое ядро, мета-теги, ЧПУ-адреса, микроразметка Schema.org, sitemap, robots.txt. Магазин запускается готовым к&nbsp;индексации. Дальнейшее продвижение ведём отдельной услугой&nbsp;— комплексным SEO.",
    ),
    spoiler(
      "Есть&nbsp;ли поддержка после релиза?",
      "В&nbsp;стандартный пакет входит месяц сопровождения: правим ошибки, помогаем команде освоить админку, дорабатываем мелочи. После&nbsp;— предлагаем абонентское сопровождение или&nbsp;работу по&nbsp;часам. Формат подбираем под&nbsp;нагрузку и&nbsp;пожелания клиента.",
    ),
  ],
];

const columns = items.map((col) => `<div class="blocks__column">${col.join("")}</div>`).join("");
const bodyInner = `<div class=""><div class="questions"><h3 class="questions__title kontekstnaya-page__section-heading">Вопрос-ответ</h3> <div class="questions__blocks">${columns}</div></div></div>`;
const bodyHtml = syncFaqBodyHtmlJsonLd(bodyInner);

const data = {
  mountId: "korporativnyj-faq-mounted",
  sectionClass: "korporativnyj-faq-section",
  rootClass: "korporativnyj-faq-root korporativnyj-faq-root--always-visible",
  bodyHtml,
};

const jsonPath = path.join(root, "json", "services", slug, "faq.json");
fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
fs.writeFileSync(jsonPath, `${JSON.stringify(data, null, 2)}\n`, "utf8");

const shell = fs.readFileSync(path.join(root, "html/partials/services/_service-faq.shell.html"), "utf8");
const partial =
  `<!-- FAQ ${slug}: json/services/${slug}/faq.json + service-faq.css. -->\n` +
  shell
    .replace(/__SECTION_CLASS__/g, data.sectionClass)
    .replace(/__MOUNT_ID__/g, data.mountId)
    .replace(/__ROOT_CLASS__/g, data.rootClass)
    .replace("__BODY_HTML__", bodyHtml);

const partialPath = path.join(root, "html/partials/services/faq-sozdanie-internet-magazina.html");
fs.writeFileSync(partialPath, partial, "utf8");

const indexPath = path.join(root, "sozdanie-internet-magazina/index.html");
const startMarker = "<!-- INTERNET-MAGAZINA-FAQ-START -->";
const endMarker = "<!-- INTERNET-MAGAZINA-FAQ-END -->";
let indexHtml = fs.readFileSync(indexPath, "utf8");

if (!indexHtml.includes(startMarker)) {
  indexHtml = indexHtml.replace(
    /<!-- FAQ sozdanie-internet-magazina:[\s\S]*?<section class="page-constructor__section korporativnyj-faq-section">[\s\S]*?<\/section>/,
    `${startMarker}\n${partial.trim()}\n${endMarker}`,
  );
}

const start = indexHtml.indexOf(startMarker);
const end = indexHtml.indexOf(endMarker);
if (start === -1 || end === -1 || end < start) {
  console.error("build-internet-magazina-faq: markers not found in index.html");
  process.exit(1);
}
const patched =
  indexHtml.slice(0, start) +
  startMarker +
  "\n" +
  partial.trim() +
  "\n" +
  endMarker +
  indexHtml.slice(end >= 0 ? end + endMarker.length : start + startMarker.length);
fs.writeFileSync(indexPath, patched, "utf8");

console.log("build-internet-magazina-faq: ok →", path.relative(root, jsonPath));
console.log("build-internet-magazina-faq: ok →", path.relative(root, partialPath));
console.log("build-internet-magazina-faq: ok →", path.relative(root, indexPath));

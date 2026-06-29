#!/usr/bin/env node
/**
 * FAQ /tehnicheskaya-podderzhka-saita — контент с legacy serenity.agency.
 */
const fs = require("fs");
const path = require("path");
const { syncFaqBodyHtmlJsonLd } = require("./lib/build-faq-page-jsonld.cjs");

const root = path.resolve(__dirname, "..");
const slug = "tehnicheskaya-podderzhka-saita";
const ico =
  '<div class="spoiler__ico"><svg width="16" height="9" viewBox="0 0 16 9" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M15.4238 1L8.05694 7.96972L0.885888 0.798671" stroke="white" stroke-linecap="round" stroke-linejoin="round"></path></svg></div>';

function spoiler(question, answer) {
  return `<div class="spoiler block"><div class="spoiler__head"><h3 class="block__question">${question}</h3> ${ico}</div> <div class="spoiler__content" ><div class="spoiler__content-inner"><div class="spoiler__content-wr"><div class="spoiler__content-slot"><div class="block__content">${answer}</div></div></div></div></div></div>`;
}

const items = [
  [
    spoiler(
      "Сколько стоит техподдержка, и&nbsp;какой минимальный бюджет?",
      "Минимальный пакет&nbsp;— 10&nbsp;часов за&nbsp;47&nbsp;000&nbsp;₽. Этого объёма достаточно для&nbsp;регулярных задач: доработок, исправлений, поддержки и&nbsp;небольшого развития сайта.",
    ),
    spoiler(
      "Что происходит с&nbsp;неизрасходованными часами из&nbsp;месячного пакета?",
      "Оставшиеся часы переносятся на&nbsp;следующий отчётный период. Вы не&nbsp;теряете оплаченный объём и&nbsp;можете использовать его позже.",
    ),
    spoiler(
      "Как понять эффективность работы?",
      "Вы получаете регулярный отчёт по&nbsp;всем задачам: объём в&nbsp;часах, статус, выполненные работы и&nbsp;результат. Это позволяет контролировать процесс и&nbsp;понимать, на&nbsp;что расходуется бюджет. Для оценки влияния на&nbsp;бизнес полезен <a href=\"/uvelichenie-konversii-saita\" class=\"tehpod-text-link\">продуктовый UX-анализ</a>.",
    ),
  ],
  [
    spoiler(
      "Сколько задач можно выполнить в&nbsp;рамках пакета?",
      "Количество зависит от&nbsp;типа задач и&nbsp;их сложности. Каждая задача предварительно оценивается в&nbsp;часах, поэтому вы заранее понимаете, что именно будет сделано в&nbsp;рамках пакета.",
    ),
    spoiler(
      "Работаете ли вы с&nbsp;разовыми запросами?",
      "Да, работаем, но&nbsp;с&nbsp;ограничениями по&nbsp;минимальному количеству часов. Для эпизодических задач иногда уместнее <a href=\"/blog/article/sajt-na-konstruktore-protiv-polnotsennogo-sajta-kto-kogo/\" class=\"tehpod-text-link\">разовая доработка сайта</a>.",
    ),
  ],
  [
    spoiler(
      "Можно ли расширить пакет?",
      "Да. В&nbsp;любой момент можно докупить дополнительные часы, если объём задач увеличился или появилась срочная потребность.",
    ),
    spoiler(
      "Как быстро вы реагируете на&nbsp;запросы?",
      "Реакция&nbsp;— от&nbsp;30&nbsp;минут в&nbsp;рабочее время, в&nbsp;соответствии с&nbsp;SLA. Это означает, что задачи не&nbsp;«висят» без ответа и&nbsp;быстро берутся в&nbsp;работу.",
    ),
  ],
];

const columns = items.map((col) => `<div class="blocks__column">${col.join("")}</div>`).join("");
const bodyInner = `<div class=""><div class="questions"><h3 class="questions__title kontekstnaya-page__section-heading">Вопрос-ответ</h3> <div class="questions__blocks">${columns}</div></div></div>`;
const bodyHtml = syncFaqBodyHtmlJsonLd(bodyInner);

const data = {
  mountId: "tehpod-faq-mounted",
  sectionClass: "tehpod-faq-section",
  rootClass: "tehpod-faq-root tehpod-faq-root--always-visible",
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

const partialPath = path.join(root, "html", "partials", "services", "faq-tehnicheskaya-podderzhka-saita.html");
fs.writeFileSync(partialPath, partial, "utf8");
console.log("build-tehpod-faq: ok →", path.relative(root, jsonPath), path.relative(root, partialPath));

#!/usr/bin/env node
/** Дополняет FAQ /targeting вопросами из ТЗ тимлида. */
const fs = require("fs");
const path = require("path");
const { syncFaqBodyHtmlJsonLd } = require("./lib/build-faq-page-jsonld.cjs");

const root = path.resolve(__dirname, "..");
const jsonPath = path.join(root, "json", "services", "targeting", "faq.json");

const NEW_ITEMS = [
  {
    q: "За сколько запускается таргетированная реклама после брифа?",
    a: "Обычно запуск занимает до двух недель. За это время анализируем конкурентов и аудиторию, подключаем аналитику, согласовываем офферы, разрабатываем креативы и проходим модерацию рекламных площадок.",
  },
  {
    q: "Какой минимальный рекламный бюджет?",
    a: "В среднем рекомендуем рекламный бюджет от 200 000 ₽ в месяц. Точная сумма зависит от площадок, географии, конкуренции, количества продвигаемых товаров или услуг и целей кампании.",
  },
  {
    q: "Когда появятся первые результаты и заявки?",
    a: "Охваты и трафик появляются уже в первую неделю. Срок получения заявок и покупок зависит от продукта и цикла сделки. Для недорогих товаров и услуг первые результаты обычно получаем через две недели или в течение первого месяца. Для автомобилей, недвижимости и сложных B2B-продуктов цикл может занимать от двух–трёх месяцев и более.",
  },
  {
    q: "Чем таргетированная реклама отличается от контекстной?",
    a: "Контекстная реклама преимущественно работает с уже сформированным спросом — людьми, которые прямо сейчас ищут товар или услугу. Таргет помогает находить потенциальных клиентов раньше конкурентов: по интересам, поведению, географии и другим характеристикам. Он решает задачи на всех этапах воронки: формирует спрос и узнаваемость, привлекает подписчиков, возвращает заинтересованных пользователей и генерирует заявки. Встроенные лид-формы позволяют оставить контакты прямо внутри площадки, без перехода на сайт, что особенно полезно при сложной или недостаточно конверсионной посадочной странице.",
  },
  {
    q: "Работаете ли вы с B2B и e-commerce?",
    a: "Да. Продвигаем B2B-компании и интернет-магазины, а также проекты в недвижимости, IT, SaaS, образовании, медицине и других сферах. Подбираем площадки, рекламные форматы и KPI с учётом специфики бизнеса и длины цикла сделки.",
  },
  {
    q: "В каких регионах вы ведёте таргетированную рекламу?",
    a: "Работаем по всей России: в Москве, Санкт-Петербурге, городах-миллионниках и небольших населённых пунктах. Также запускаем кампании в странах ближнего зарубежья, включая Казахстан и Беларусь.",
  },
];

const ICO =
  '<div class="spoiler__ico"><svg width="16" height="9" viewBox="0 0 16 9" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M15.4238 1L8.05694 7.96972L0.885888 0.798671" stroke="white" stroke-linecap="round" stroke-linejoin="round"></path></svg></div>';

function spoiler(q, a) {
  return `<div class="spoiler block"><div class="spoiler__head"><h3 class="block__question">${q}</h3> ${ICO}</div> <div class="spoiler__content" ><div class="spoiler__content-inner"><div class="spoiler__content-wr"><div class="spoiler__content-slot"><div class="block__content">${a}</div></div></div></div></div></div>`;
}

function run() {
  const data = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
  let body = data.bodyHtml;
  if (body.includes(NEW_ITEMS[0].q.slice(0, 20))) {
    const colCount = (body.match(/blocks__column/g) || []).length;
    if (colCount !== 3) {
      require("child_process").execSync("node scripts/rebalance-targeting-faq-columns.cjs", {
        cwd: root,
        stdio: "inherit",
      });
    } else {
      console.log("update-targeting-faq-tz: уже дополнен");
    }
    return;
  }
  const chunks = [[0, 2], [2, 4], [4, 6]];
  const columns = chunks
    .map(([a, b]) => `<div class="blocks__column">${NEW_ITEMS.slice(a, b).map((it) => spoiler(it.q, it.a)).join("")}</div>`)
    .join("");
  const needle = "</div></div></div> <script type=\"application/ld+json\">";
  const idx = body.indexOf(needle);
  if (idx < 0) throw new Error("FAQ blocks anchor not found");
  body = body.slice(0, idx) + columns + body.slice(idx);
  data.bodyHtml = syncFaqBodyHtmlJsonLd(body);
  fs.writeFileSync(jsonPath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  console.log("update-targeting-faq-tz: ok", path.relative(root, jsonPath));
  require("child_process").execSync("node scripts/rebalance-targeting-faq-columns.cjs", {
    cwd: root,
    stdio: "inherit",
  });
}

run();

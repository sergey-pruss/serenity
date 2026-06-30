/**
 * DOCX: перелинковки для главной, листинга услуг и «Комплексный маркетинг».
 * Выход: tmp/Перелинковки-главная-услуги-маркетинг-Serenity.docx
 */
const fs = require("fs");
const path = require("path");

const PAGES = [
  {
    title: "Главная",
    url: "/",
    note:
      "Учитываются блоки «Услуги», «Кейсы» (только шапка, без слайдера), «Мы любим маркетинг». Не учитываются: слайдер кейсов, блог, клиенты, награды, карточки услуг целиком (у них своя ссылка на заголовке). Класс для новых ссылок в тексте: sa-invisible-text-link (как на /services).",
    existing: [],
    suggested: [
      ["«Услуги» → лид «комплексный маркетинг»", "/services/marketing"],
      ["«Услуги» → «долгосрочные результаты»", "/strategy"],
      [
        "«Кейсы» → подзаголовок «брендинга и перформанса»",
        "/blog/article/brending-i-performance-marketing-pochemu-odno-bez-drugogo-sliv-byudzheta/",
      ],
      ["«Кейсы» → «синергии брендинга и перформанса»", "/kompleksnoye-prodvizheniye"],
      ["«Мы любим маркетинг» → «комплексных результатов» (карточка 100+)", "/services/marketing"],
      ["«Мы любим маркетинг» → «увеличению продаж» (карточка 13+)", "/uvelichenie-konversii-saita"],
      ["«Мы любим маркетинг» → «развития брендов»", "/services#services-branding"],
      [
        "«Мы любим маркетинг» → лид «работаем над развитием бизнеса»",
        "/blog/article/serenity-kak-stroim-uspeshnyj-marketing-ot-sotrudnika-do-klienta/",
      ],
    ],
  },
  {
    title: "Услуги (листинг)",
    url: "/services",
    note:
      "Тексты секций services__description и описания внутри карточек (не заголовки-кнопки). Карточки с href на весь блок не дублировать ссылкой в том же заголовке. Класс: sa-invisible-text-link.",
    existing: [
      ["«Сайты» → «интернет-магазины»", "/sozdanie-internet-magazina"],
    ],
    suggested: [
      ["«Стратегия» → «комплексный маркетинг»", "/services/marketing"],
      ["«Стратегия» → «performance»", "/kompleksnoye-prodvizheniye"],
      ["«Стратегия» → «брендинга»", "/services#services-branding"],
      ["«Продвижение» → «performance»", "/kontekstnaya_reklama или /kompleksnoye-prodvizheniye"],
      ["«Продвижение» → «максимизируем прибыль от маркетинга»", "/uvelichenie-konversii-saita"],
      [
        "Карточка «Коммуникационная стратегия» → «контент-маркетинг и performance»",
        "/prodvizhenie-statey-v-dzene-i-promostranitsah, /kontekstnaya_reklama",
      ],
      ["«Брендинг» → «контент-маркетинг в блог»", "/prodvizhenie-statey-v-dzene-i-promostranitsah"],
      [
        "«Брендинг» → «Усиливаем performance»",
        "/blog/article/brending-i-performance-marketing-pochemu-odno-bez-drugogo-sliv-byudzheta/",
      ],
      ["«Брендинг» → «дизайн для сайта»", "/korporativnyj_sajt"],
      ["«Сайты» → «Увеличиваем конверсию»", "/uvelichenie-konversii-saita"],
      ["«Сайты» → «поддержку и развитие проектов»", "/tehnicheskaya-podderzhka-saita"],
      ["Карточка «Контекстная реклама» → описание «привлечь клиентов»", "/kontekstnaya_reklama (уже карточка — опционально в тексте)"],
    ],
  },
  {
    title: "Комплексный маркетинг",
    url: "/services/marketing",
    note:
      "Страница «Комплексный маркетинг» (не путать с /kompleksnoye-prodvizheniye — «Комплексное продвижение»). Сейчас много ссылок в заголовках h2 (marketing-section__link) и в карточках «Инструменты» — это видимые ссылки на заголовках. Ниже — кандидаты для невидимых ссылок в тексте (marketing-text-link / sa-invisible-text-link в теле абзацев). Не учитываются: кейсы-слайдеры, синергия, FAQ, награды (кроме лида).",
    existing: [
      ["Hero / h2 → «Стратегия»", "/services#services-strategy"],
      ["h2 → «Бренд-стратегия»", "/services/brend-strategy"],
      ["h2 → «Контент-стратегия»", "/content-strategy"],
      ["h2 → «Бренд»", "/services#services-branding"],
      ["h2 → «Сайт»", "/services#services-sites"],
      ["h2 → «Измеримое продвижение»", "/services#services-promotion"],
      ["h2 → «Контент-маркетинг»", "/services/content"],
      ["h2 → «SEO-продвижение»", "/seo"],
      ["h2 → «Продажи»", "/services/salesmarketing"],
      ["«Инструменты» → заголовки: Контекстная, Таргет, SEO, Аналитика", "/kontekstnaya_reklama, /targeting, /seo, /end-to-end-analytics"],
      ["«Смотрите также» → «комплексное продвижение»", "/kompleksnoye-prodvizheniye"],
    ],
    suggested: [
      ["Hero → «Синергия маркетинговых инструментов»", "/kompleksnoye-prodvizheniye"],
      ["«Стратегия» → лид «каналы продвижения»", "/kompleksnoye-prodvizheniye"],
      ["«Стратегия» → «маркетинговая стратегия»", "/strategy"],
      [
        "«Стратегия» → «приносящим продажи»",
        "/blog/article/effektivnyj-marketing-dlya-biznesa-kompleksnost-i-ili-spetsializatsiya/",
      ],
      ["«Контент-стратегия» → «темы для статей»", "/blog/article/prodvizhenie-sajta-statyami-ekspertnyj-kontent-kotoryj-rabotaet/"],
      ["«Контент-стратегия» → «соцсети»", "/smm_marketing или /prodvizhenie-statey-v-dzene-i-promostranitsah"],
      ["«Увеличение известности бренда» → «лидеров мнений»", "/blog/article/kak-rabotaet-targetirovannaya-reklama-v-telegram-sekrety-uspeha/"],
      ["«Сайт» → «Увеличиваем конверсию в заявку»", "/uvelichenie-konversii-saita"],
      ["«Сайт» → «дизайн-системы»", "/korporativnyj_sajt"],
      ["«Измеримое продвижение» → «число заявок»", "/uvelichenie-konversii-saita"],
      ["«Реклама» → «поисковых системах»", "/kontekstnaya_reklama или /seo"],
      ["«Реклама» → «социальных сетях»", "/targeting"],
      ["«SEO-продвижение» → «технический аудит»", "/blog/article/kompleksnyj-seo-audit-sajta-zachem-kogda-i-iz-chego-sostoit/"],
      ["«SEO-продвижение» → «юзабилити»", "/uvelichenie-konversii-saita"],
      ["«Продажи» → «комплексный маркетинг с продажами»", "/kompleksnoye-prodvizheniye"],
      ["«Каналы контент-маркетинга» → «Дзен» (если есть в тексте карточки)", "/prodvizhenie-statey-v-dzene-i-promostranitsah"],
    ],
  },
];

const C = {
  ink: "1A2332",
  muted: "5C6578",
  accent: "2A6DF4",
  head: "0F1C2E",
  greenHead: "1B5E20",
  greenBg: "E8F5E9",
  blueHead: "1565C0",
  blueBg: "E3F2FD",
  white: "FFFFFF",
  stripe: "FAFBFD",
};

function run(text, opts = {}) {
  return new (require("docx").TextRun)({
    text: String(text),
    font: "Calibri",
    size: opts.size ?? 20,
    bold: opts.bold,
    italics: opts.italics,
    color: opts.color ?? C.ink,
  });
}

function para(children, opts = {}) {
  return new (require("docx").Paragraph)({
    spacing: opts.spacing,
    heading: opts.heading,
    border: opts.border,
    indent: opts.indent,
    children: Array.isArray(children) ? children : [children],
  });
}

function makeCell(text, { fill, color, bold, italics } = {}) {
  const { TableCell } = require("docx");
  return new TableCell({
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    shading: fill ? { fill, type: "clear" } : undefined,
    children: [para([run(text, { color, bold, italics })])],
    verticalAlign: "top",
  });
}

function makeLinkTable(rows, headerFill, headerColor) {
  const { Table, TableRow, WidthType } = require("docx");
  const data = rows.length ? rows : [["—", "Нет записей"]];
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: [5200, 4160],
    rows: [
      new TableRow({
        tableHeader: true,
        children: [
          makeCell("Где в тексте / блок", { fill: headerFill, color: headerColor, bold: true }),
          makeCell("Куда ведёт / вести", { fill: headerFill, color: headerColor, bold: true }),
        ],
      }),
      ...data.map(([where, target], i) =>
        new TableRow({
          children: [
            makeCell(where, { fill: i % 2 ? C.stripe : C.white }),
            makeCell(target, { fill: i % 2 ? C.stripe : C.white, color: C.accent }),
          ],
        }),
      ),
    ],
  });
}

async function main() {
  let docx;
  try {
    docx = require("docx");
  } catch {
    console.error("Установите пакет: npm install --no-save docx");
    process.exit(1);
  }

  const { Document, Packer, Table, TableRow, PageBreak, BorderStyle, HeadingLevel, WidthType } = docx;

  const children = [
    para([run("Serenity", { bold: true, color: C.accent, size: 22 }), run("  ·  аудит перелинковок", { color: C.muted, size: 22 })], {
      spacing: { after: 120 },
    }),
    para([run("Перелинковки: главная, услуги, комплексный маркетинг", { bold: true, color: C.head, size: 52 })], {
      heading: HeadingLevel.TITLE,
      spacing: { after: 200 },
    }),
    para(
      [
        run(
          "Срез по репозиторию serenity · 30.06.2026. Страницы: главная (/), листинг услуг (/services), «Комплексный маркетинг» (/services/marketing). ",
        ),
      ],
      { spacing: { after: 80 } },
    ),
    para(
      [
        run("Не включены: ", { bold: true }),
        run(
          "блог, синергия, «Наши клиенты», слайды/блок кейсов, факты, FAQ, карточки тарифов «Узнать больше». На /services/marketing заголовки h2 с marketing-section__link учтены в «Сейчас есть»; для тела абзацев — кандидаты в «Можно добавить» с классом невидимой ссылки.",
          { color: C.muted },
        ),
      ],
      { spacing: { after: 120 } },
    ),
    para(
      [
        run("Ограничения при внедрении: ", { bold: true }),
        run(
          "не более 12–14 невидимых ссылок в SEO-зоне страницы; без дублей одной статьи в соседних карточках; кейсы в SEO-текст не вставлять; /targeting — только где в тексте про соцсети/таргет, не вместо статей про Директ.",
          { color: C.muted },
        ),
      ],
      { spacing: { after: 240 } },
    ),
    para([run("Сводка", { bold: true, color: C.head, size: 32 })], {
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 120, after: 160 },
    }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      columnWidths: [2800, 3600, 1480, 1480],
      rows: [
        new TableRow({
          tableHeader: true,
          children: [
            makeCell("Страница", { fill: C.head, color: C.white, bold: true }),
            makeCell("URL", { fill: C.head, color: C.white, bold: true }),
            makeCell("Есть", { fill: C.greenHead, color: C.white, bold: true }),
            makeCell("Можно", { fill: C.blueHead, color: C.white, bold: true }),
          ],
        }),
        ...PAGES.map((p, i) =>
          new TableRow({
            children: [
              makeCell(p.title, { fill: i % 2 ? C.stripe : C.white }),
              makeCell(`https://serenity.agency${p.url}`, { fill: i % 2 ? C.stripe : C.white, color: C.accent }),
              makeCell(String(p.existing.length), { fill: i % 2 ? C.stripe : C.white }),
              makeCell(String(p.suggested.length), { fill: i % 2 ? C.stripe : C.white }),
            ],
          }),
        ),
      ],
    }),
    para([new PageBreak()]),
  ];

  PAGES.forEach((page, idx) => {
    if (idx > 0) children.push(para([new PageBreak()]));
    children.push(
      para([run(page.title, { bold: true, color: C.head, size: 36 })], {
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 80 },
      }),
      para([run("https://serenity.agency", { color: C.muted }), run(page.url, { color: C.accent })], { spacing: { after: 200 } }),
    );
    if (page.note) {
      children.push(
        para([run(page.note, { italics: true, color: "9A6700" })], {
          spacing: { after: 200 },
          border: { left: { color: "F9A825", size: 12, style: BorderStyle.SINGLE } },
          indent: { left: 200 },
        }),
      );
    }
    children.push(
      para([run("Сейчас есть", { bold: true, color: C.greenHead, size: 28 })], {
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 160, after: 120 },
      }),
      makeLinkTable(page.existing, C.greenBg, C.greenHead),
      para([run("Можно добавить", { bold: true, color: C.blueHead, size: 28 })], {
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 280, after: 120 },
      }),
      makeLinkTable(page.suggested, C.blueBg, C.blueHead),
    );
  });

  const doc = new Document({
    sections: [
      {
        properties: { page: { margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 } } },
        children,
      },
    ],
  });

  const outDir = path.join(__dirname, "..", "tmp");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "Перелинковки-главная-услуги-маркетинг-Serenity.docx");
  fs.writeFileSync(outPath, await Packer.toBuffer(doc));
  console.log(outPath);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

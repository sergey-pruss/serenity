/**
 * Генерирует DOCX для Google Документов (загрузка на Диск → Открыть).
 * Выход: tmp/Перелинковки-страниц-услуг-Serenity.docx
 */
const fs = require("fs");
const path = require("path");

const PAGES = [
  {
    title: "Контекстная реклама",
    url: "/kontekstnaya_reklama",
    note: "Остальные SEO-секции без -text-link; при пересборке из kontekstnaya-seo-sections.cjs ссылки легко теряются.",
    existing: [
      ["«Виды контекстной рекламы» → карточка «Геомедийная контекстная реклама» (заголовок)", "/prodvizhenie-yandex-karty-2gis"],
    ],
    suggested: [
      ["«Агентство контекстной рекламы» → лид «Стратегию продвижения строим…»", "/strategy"],
      ["«Доступ к инсайтам рынка» → «повышающие конверсию сайта»", "/uvelichenie-konversii-saita"],
      ["«Глубокая аналитика…» → «привлекать аудиторию конкурентов»", "/blog/article/kak-privlechat-auditoriyu-konkurentov-cherez-yandeks-direkt/"],
      ["«Настройка…» → «аудит посадочных страниц»", "/uvelichenie-konversii-saita"],
      ["«Контекстная реклама в Москве…» → «геотаргетинга»", "/prodvizhenie-yandex-karty-2gis"],
      ["«Опытная и обученная команда» → «Над стратегией каждого клиента»", "/strategy"],
    ],
  },
  {
    title: "Корпоративный сайт",
    url: "/korporativnyj_sajt",
    note: "Часть ссылок без класса korporativnyj-text-link — стили hover могут отличаться.",
    existing: [
      ["«Создание корпоративного сайта» → «комплексный экспертный подход»", "/kompleksnoye-prodvizheniye"],
      ["«Выбор CMS» → «создание интернет-магазина»", "/sozdanie-internet-magazina"],
      ["«Выбор CMS» → «технической поддержке сайта»", "/tehnicheskaya-podderzhka-saita"],
      ["«Маркетинговое проектирование» → «полезными и ценными текстами»", "/blog/article/kak-sozdat-kachestvennyj-tekst-dlya-sajta-prakticheskoe-rukovodstvo"],
      ["«Маркетинговое проектирование» → «подготовку к оптимизации»", "/blog/article/etapy-seo-prodvizheniya-sajta"],
      ["«Поддержка, развитие и SLA» → заголовок «Техническая поддержка»", "/tehnicheskaya-podderzhka-saita"],
      ["«Поддержка…» → «контентное развитие»", "/blog/article/prodvizhenie-sajta-statyami-ekspertnyj-kontent-kotoryj-rabotaet"],
      ["«Поддержка…» → «SEO-сопровождение»", "/seo"],
      ["Пакет «Базовый» → «базовое SEO»", "/seo"],
    ],
    suggested: [
      ["«Этапы разработки» → «выбрать успешную стратегию»", "/strategy"],
      ["«Оптимизация» → «Работа SEO-специалиста» / «топовой выдачи в поисковых системах»", "/seo"],
      ["«Дизайн» → «эффективный с точки зрения UX/UI дизайн»", "/uvelichenie-konversii-saita"],
      ["«Интеграция и поддержка» → «техническую поддержку и дальнейшее развитие»", "/tehnicheskaya-podderzhka-saita"],
    ],
  },
  {
    title: "Интернет-магазин",
    url: "/sozdanie-internet-magazina",
    note: "Похоже, большая часть настроенных ранее ссылок затерлась (как на targeting).",
    existing: [["«Наш подход» → «Думаем о синергии» → «SEO для магазина»", "/seo"]],
    suggested: [
      ["«Маркетинговое проектирование» → «Оптимизируем сайт для поисковых систем»", "/seo"],
      ["«Наш подход» → «Каждую карточку товара можно рекламировать»", "/kontekstnaya_reklama или /targeting"],
      ["«Наш подход» → «эффективный контент-маркетинг»", "/blog/article/prodvizhenie-sajta-statyami-ekspertnyj-kontent-kotoryj-rabotaet/"],
      ["«Наш подход» → «технической поддержке» (после запуска)", "/tehnicheskaya-podderzhka-saita"],
      ["«Маркетинговое проектирование» → «интернет-магазина с нуля» / крупного магазина", "/blog/article/proektirovanie-internet-magazinov-i-marketplejsov-marketingovyj-podhod/"],
    ],
  },
  {
    title: "УКС (увеличение конверсии сайта)",
    url: "/uvelichenie-konversii-saita",
    existing: [],
    suggested: [
      ["«Что включает услуга» → «Оцениваем SEO с точки зрения влияния на конверсию»", "/seo"],
      ["«Что включает услуга» → «Аналитика… путь до конверсии»", "/blog/article/produktovyj-ux-analiz-kak-nahodit-tochki-poteri-konversii-i-prevrashhat-trafik-v-prodazhi/"],
      ["«Почему стоит доверить сайт нам» → «Аналитика, UX/UI, SEO, маркетинг»", "/seo, /services/marketing"],
      ["«Кому подходит» → «посетители из поиска или рекламы»", "/seo, /kontekstnaya_reklama"],
      ["«Кому подходит» → «отдельные задачи по SEO, дизайну или UX»", "/seo, /tehnicheskaya-podderzhka-saita"],
      ["«Техническая проверка» → «ошибки и ограничения CMS»", "/tehnicheskaya-podderzhka-saita"],
    ],
  },
  {
    title: "Техподдержка",
    url: "/tehnicheskaya-podderzhka-saita",
    existing: [
      ["Hero / лид → «продуктовое развитие»", "/services/marketing"],
      ["«Подключение смежных экспертиз» → «UX/UI»", "/uvelichenie-konversii-saita"],
      ["«…экспертиз» → «SEO»", "/seo"],
      ["«…экспертиз» → «контент-маркетинг»", "/services/marketing"],
      ["«Лендинги и корпоративные сайты» → «корпоративных сайтов»", "/korporativnyj_sajt"],
      ["«Интернет-магазины…» → «интернет-магазинов»", "/sozdanie-internet-magazina"],
      ["«Проекты с регулярным развитием» → «плане развития молодого сайта»", "/blog/article/prodvizhenie-molodyh-sajtov-poshagovyj-plan-razvitiya-novogo-sajta/"],
      ["«Разовые задачи» → «сайте на конструкторе»", "/blog/article/sajt-na-konstruktore-protiv-polnotsennogo-sajta-kto-kogo/"],
    ],
    suggested: [
      ["Лид блока → «контент-маркетологи» (рядом с продуктовым развитием)", "/prodvizhenie-statey-v-dzene-i-promostranitsah"],
      ["«Проекты с регулярным развитием» → «улучшается UX»", "/uvelichenie-konversii-saita"],
    ],
  },
  {
    title: "Комплексное продвижение",
    url: "/kompleksnoye-prodvizheniye",
    existing: [
      ["«Синергия каналов» → заголовки карточек: SEO, Контент-маркетинг, PPC, Соцсети, Аналитика", "/seo, /content, /kontekstnaya_reklama, /smm_marketing, /end-to-end-analytics"],
      ["Лид блока → «контекстной», «таргетинговой рекламой», «SEO-оптимизацией»", "/kontekstnaya_reklama, /targeting, /seo"],
      ["«Инструменты продвижения» → Контекстная, Таргет, SEO, Аналитика, PR", "/kontekstnaya_reklama, /targeting, /seo, /end-to-end-analytics, /pr"],
    ],
    suggested: [
      ["«Синергия каналов» → лид «комплексная работа»", "/strategy"],
      ["«Контент-маркетинг» → «статьи, блоги, видео»", "/prodvizhenie-statey-v-dzene-i-promostranitsah"],
      ["«PPC/pay-per-click реклама» → «увеличить количество конверсий»", "/uvelichenie-konversii-saita"],
      ["«Аналитика» (инструменты) → «системы оптимизации конверсий»", "/uvelichenie-konversii-saita"],
      ["«Каналы продвижения» → «органическая выдача в поисковиках»", "/seo"],
    ],
  },
  {
    title: "SEO-продвижение",
    url: "/seo",
    note: "Карточки «Связанные услуги» с «Узнать больше» не учитываются.",
    existing: [],
    suggested: [
      ["«Ориентируемся на продажи» → «увеличиваем конверсию»", "/uvelichenie-konversii-saita"],
      ["«Работаем в синергии…» → «контекстной рекламы»", "/kontekstnaya_reklama"],
      ["«Дизайн» → «на конверсию в целом»", "/uvelichenie-konversii-saita"],
      ["«Проектирование и разработка» → «сайт делается с нуля»", "/korporativnyj_sajt, /sozdanie-internet-magazina"],
      ["«Повышаем упоминаемость» → «публикуем статью»", "/prodvizhenie-statey-v-dzene-i-promostranitsah или статья блога"],
      ["«Кластеризация» → «промостраницу»", "/prodvizhenie-statey-v-dzene-i-promostranitsah"],
      ["«Разработка стратегии» (этап 1)", "/strategy"],
      ["«Технический аудит» → поддержка после релиза", "/tehnicheskaya-podderzhka-saita"],
    ],
  },
  {
    title: "Яндекс Карты",
    url: "/prodvizhenie-yandex-karty-2gis",
    existing: [
      ["«Агентство геоперфоманса» → лид «Яндекс Карт»", "/blog/article/prodvizhenie-na-yandex-kartah-dlya-biznesa/"],
      ["«Геореклама в Яндекс Картах…» → «рекламное размещение в картах»", "/blog/article/kontekstnaya-i-georeklama-premium-segment/"],
    ],
    suggested: [
      ["Лид hero → «performance-канал»", "/kontekstnaya_reklama"],
      ["«переходов на сайт» (лид блока)", "/uvelichenie-konversii-saita"],
      ["«филиалы» / «сети» (карточки услуги)", "/kompleksnoye-prodvizheniye"],
    ],
  },
  {
    title: "Дзен и ПромоСтраницы",
    url: "/prodvizhenie-statey-v-dzene-i-promostranitsah",
    existing: [],
    suggested: [
      ["Hero → «настраиваем точный таргетинг»", "/targeting"],
      ["«Показываем материалы в нужных городах»", "/prodvizhenie-yandex-karty-2gis"],
      ["«У которых есть сайт и возможность принимать заказы онлайн»", "/sozdanie-internet-magazina"],
      ["«Там, где важно подробно объяснить выгоды через статью»", "/seo или статья блога"],
      ["«Про которые люди мало знают» → «статьи помогают разогреть интерес»", "/blog/article/prodvizhenie-sajta-statyami-ekspertnyj-kontent-kotoryj-rabotaet/"],
      ["«Когда не подходит» → «контекстная реклама и SEO-продвижение»", "/kontekstnaya_reklama, /seo"],
    ],
  },
  {
    title: "Маркетинговая стратегия",
    url: "/strategy",
    note: "Карточки подстраниц стратегии с «Узнать больше» (legacy /services/…) не учитываются.",
    existing: [],
    suggested: [
      ["«Наш подход» → «можем взять весь маркетинг на себя»", "/kompleksnoye-prodvizheniye или /services/marketing"],
      ["«Исследования» → «каналы продвижения» (блок «Конкуренты»)", "/kompleksnoye-prodvizheniye"],
      ["«SEO-стратегия» → «топ поисковых систем»", "/seo"],
      ["«Команда» → «контекстной и таргетированной рекламы»", "/kontekstnaya_reklama, /targeting"],
      ["Hero → «комплексную систему маркетинга»", "/kompleksnoye-prodvizheniye"],
      ["«Контент-стратегия» → «ваш сайт… продающими»", "/prodvizhenie-statey-v-dzene-i-promostranitsah"],
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
        })
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

  const { Document, Packer, Table, TableRow, TableCell, HeadingLevel, PageBreak, BorderStyle, WidthType } = docx;

  const children = [
    para([run("Serenity", { bold: true, color: C.accent, size: 22 }), run("  ·  аудит перелинковок", { color: C.muted, size: 22 })], {
      spacing: { after: 120 },
    }),
    para([run("Перелинковки в тексте страниц услуг", { bold: true, color: C.head, size: 52 })], {
      heading: HeadingLevel.TITLE,
      spacing: { after: 200 },
    }),
    para(
      [
        run(
          "Срез по репозиторию serenity · 30.06.2026. Учтён только текстовый контент страницы (hero, SEO-блоки, этапы, пакеты, команда). "
        ),
      ],
      { spacing: { after: 80 } }
    ),
    para(
      [
        run("Не включены: ", { bold: true }),
        run(
          "блог, синергия, «Наши клиенты», слайды/блок кейсов, факты, FAQ, карточки тарифов «Узнать больше». Цели ссылок: страницы услуг и статьи блога.",
          { color: C.muted }
        ),
      ],
      { spacing: { after: 240 } }
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
          })
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
      para([run("https://serenity.agency", { color: C.muted }), run(page.url, { color: C.accent })], { spacing: { after: 200 } })
    );
    if (page.note) {
      children.push(
        para([run(page.note, { italics: true, color: "9A6700" })], {
          spacing: { after: 200 },
          border: { left: { color: "F9A825", size: 12, style: BorderStyle.SINGLE } },
          indent: { left: 200 },
        })
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
      makeLinkTable(page.suggested, C.blueBg, C.blueHead)
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
  const outPath = path.join(outDir, "Перелинковки-страниц-услуг-Serenity.docx");
  fs.writeFileSync(outPath, await Packer.toBuffer(doc));
  console.log(outPath);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

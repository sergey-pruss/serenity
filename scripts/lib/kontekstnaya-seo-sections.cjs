/**
 * SEO content-block секции для /kontekstnaya_reklama (ручные правки, не prod-срез).
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const root = path.resolve(__dirname, "..", "..");

const PLACEHOLDER_ITEM =
  '<div data-v-4ed7dc78="" class="col-4 col-sm-12 block-item" aria-hidden="true" style="visibility:hidden;"><div data-v-4ed7dc78="" class="block__name-wrapper"><h3 data-v-4ed7dc78="" class="block__name">&nbsp;</h3> <!----></div> <p data-v-4ed7dc78="" class="block__description">&nbsp;</p> <!----></div>';

function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function descItem(item) {
  return `<div data-v-4ed7dc78="" class="col-4 col-sm-12 block-item"><div data-v-4ed7dc78="" class="block__name-wrapper"><h3 data-v-4ed7dc78="" class="block__name">${item.title}</h3> <!----></div> <p data-v-4ed7dc78="" class="block__description">${item.text}</p> <!----></div>`;
}

function tabletItem(item) {
  return `<div data-v-4ed7dc78="" class="col-4 col-sm-12 block-item"><h3 data-v-4ed7dc78="" class="block__name">${item.title.replace(/<br>/g, "<br>")}</h3> <p data-v-4ed7dc78="" class="block__description">${item.text}</p> <!----></div>`;
}

function splitColumns(items) {
  if (items.length <= 3) return [items.slice(0, 1), items.slice(1, 2), items.slice(2, 3)];
  if (items.length === 4) return [items.slice(0, 2), items.slice(2, 3), items.slice(3, 4)];
  if (items.length === 5) return [items.slice(0, 2), items.slice(2, 4), items.slice(4, 5)];
  const col1 = [];
  const col2 = [];
  const col3 = [];
  items.forEach((it, idx) => {
    if (idx % 3 === 0) col1.push(it);
    else if (idx % 3 === 1) col2.push(it);
    else col3.push(it);
  });
  return [col1, col2, col3];
}

function buildDescGrid(items, { rowAligned = false } = {}) {
  if (rowAligned) {
    const remainder = items.length % 3;
    const placeholders = remainder === 0 ? 0 : 3 - remainder;
    const all = [
      ...items.map((it) => descItem(it)),
      ...Array.from({ length: placeholders }, () => PLACEHOLDER_ITEM),
    ];
    const wrappers = all.map((it) => `<div data-v-4ed7dc78="" class="col-4">${it}</div>`).join("");
    return `<div data-v-4ed7dc78="" class="content-block__grid content-block__grid--desc blocks">${wrappers}</div>`;
  }
  const cols = splitColumns(items);
  return (
    `<div data-v-4ed7dc78="" class="content-block__grid content-block__grid--desc blocks">` +
    cols.map((col) => `<div data-v-4ed7dc78="" class="col-4">${col.map(descItem).join("")}</div>`).join("") +
    `</div>`
  );
}

function buildTabletGrid(items) {
  const splitAt = Math.ceil(items.length / 2);
  return (
    `<div data-v-4ed7dc78="" class="content-block__grid content-block__grid--tablet blocks">` +
    `<div data-v-4ed7dc78="" class="col-4 content-block__grid-wrapper">${items.slice(0, splitAt).map(tabletItem).join("")}</div>` +
    `<div data-v-4ed7dc78="" class="col-4 content-block__grid-wrapper">${items.slice(splitAt).map(tabletItem).join("")}</div>` +
    `</div>`
  );
}

function buildSection(title, items, { description = null, rowAligned = false } = {}) {
  const subtitle = description
    ? `<div data-v-490c7534="" class="col-6 col-md-12 numbered-header__subtitle-column"><p data-v-4ed7dc78="" data-v-490c7534="" class="content-block__desc">${description}</p></div>`
    : `<!---->`;
  return (
    `<section class="page-constructor__section"><div data-v-4ed7dc78="" class="modern content-block"><div data-v-4ed7dc78="" class="page__container">` +
    `<div data-v-490c7534="" data-v-4ed7dc78="" class="numbered-header number-header__empty"><div data-v-490c7534="" class="row">` +
    `<div data-v-490c7534="" class="col-6 col-md-12 numbered-header__title-column"><div data-v-490c7534="" class="numbered-header__bullet"></div> ` +
    `<div data-v-490c7534="" class="numbered-header__title"><h2 data-v-490c7534="">${esc(title)}</h2> <!----> <h4 data-v-490c7534="" style="display: none;"></h4></div></div> ${subtitle}</div></div> ` +
    `${buildDescGrid(items, { rowAligned })} ${buildTabletGrid(items)} <!----></div></div></section>`
  );
}

function buildAgencySection() {
  return `<section class="page-constructor__section"><div data-v-4ed7dc78="" class="modern content-block"><div data-v-4ed7dc78="" class="page__container"><div data-v-490c7534="" data-v-4ed7dc78="" class="numbered-header number-header__empty"><div data-v-490c7534="" class="row"><div data-v-490c7534="" class="col-6 col-md-12 numbered-header__title-column"><div data-v-490c7534="" class="numbered-header__bullet"></div> <div data-v-490c7534="" class="numbered-header__title"><h2 data-v-490c7534="">Агентство контекстной рекламы</h2> <!----> <h4 data-v-490c7534="" style="display: none;"></h4></div></div> <div data-v-490c7534="" class="col-6 col-md-12 numbered-header__subtitle-column"><p data-v-4ed7dc78="" data-v-490c7534="" class="content-block__desc">Мы запускаем и ведем рекламные кампании в Яндекс Директ для бизнеса из разных ниш: от локальных услуг до крупных проектов с высокой конкуренцией. Для каждого проекта формируем отдельную стратегию продвижения и уникальный подход: анализируем спрос, конкурентов и текущую воронку, чтобы реклама приводила не просто трафик, а обращения и продажи, выполняла KPI проекта.</p></div></div></div> <div data-v-4ed7dc78="" class="content-block__grid content-block__grid--desc blocks"><div data-v-4ed7dc78="" class="col-4"><div data-v-4ed7dc78="" class="col-4 col-sm-12 block-item"><div data-v-4ed7dc78="" class="block__name-wrapper"><h3 data-v-4ed7dc78="" class="block__name">Доступ к инсайтам рынка</h3> <!----></div> <p data-v-4ed7dc78="" class="block__description">Мы являемся сертифицированным партнером Яндекса, благодаря чему получаем множество преимуществ: доступ к бенчмаркам по нишам, обладаем знаниями о ситуации на рынке. Это позволяет нам делать прогнозы и рекомендовать улучшения, повышающие конверсию сайта.</p> <!----></div><div data-v-4ed7dc78="" class="col-4 col-sm-12 block-item"><div data-v-4ed7dc78="" class="block__name-wrapper"><h3 data-v-4ed7dc78="" class="block__name">Доступ к закрытым<br>инструментам рекламных платформ</h3> <!----></div> <p data-v-4ed7dc78="" class="block__description">Партнерство с Яндекс также дает нам доступ к закрытым бета-тестам новых форматов для наших клиентов, что позволяет первыми использовать их без большого количества конкурентов. Многими из них мы делимся в наших кейсах.</p> <!----></div></div><div data-v-4ed7dc78="" class="col-4"><div data-v-4ed7dc78="" class="col-4 col-sm-12 block-item"><div data-v-4ed7dc78="" class="block__name-wrapper"><h3 data-v-4ed7dc78="" class="block__name">Прозрачное ценообразование</h3> <!----></div> <p data-v-4ed7dc78="" class="block__description">Мы предлагаем прозрачные условия работы по настройке контекстной рекламы в Яндекс Директ, без агентских комиссий и лишних расходов. Мы не берем агентскую комиссию с бюджетов — весь рекламный бюджет идет только на рекламу. Наши работы оплачиваются отдельно. Стоимость зависит от количества рабочих часов команды на процессы по настройке и оптимизации рекламы.</p> <!----></div><div data-v-4ed7dc78="" class="col-4 col-sm-12 block-item"><div data-v-4ed7dc78="" class="block__name-wrapper"><h3 data-v-4ed7dc78="" class="block__name">Опытная и обученная команда</h3> <!----></div> <p data-v-4ed7dc78="" class="block__description">Все специалисты ежегодно проходят сертификацию и обучаются работе с новыми форматами рекламы. Над стратегией каждого клиента работает команда из менеджеров, дизайнеров с большим опытом, специалистов и тимлидеров направлений, которые ежемесячно проходят обучения и делают аудиты проектов клиентов.</p> <!----></div></div><div data-v-4ed7dc78="" class="col-4"><div data-v-4ed7dc78="" class="col-4 col-sm-12 block-item"><div data-v-4ed7dc78="" class="block__name-wrapper"><h3 data-v-4ed7dc78="" class="block__name">Глубокая аналитика<br>и конкурентные стратегии</h3> <!----></div> <p data-v-4ed7dc78="" class="block__description">Мы систематически анализируем все запущенные нами каналы рекламы в интернете, а также сайты конкурентов, после чего формируем предложения для офферов и отстройки. Знаем, как привлекать аудиторию конкурентов на сайты наших клиентов с соблюдением закона о рекламе.</p> <!----></div><div data-v-4ed7dc78="" class="col-4 col-sm-12 block-item"><div data-v-4ed7dc78="" class="block__name-wrapper"><h3 data-v-4ed7dc78="" class="block__name">Соблюдение законодательства<br>и модерации</h3> <!----></div> <p data-v-4ed7dc78="" class="block__description">С нами клиентам не приходится заботиться о соблюдении законодательства — мы хорошо знаем все правовые аспекты рекламирования, заблаговременно запрашиваем документы для прохождения модерации и самостоятельно маркируем рекламу.</p> <!----></div></div></div> <div data-v-4ed7dc78="" class="content-block__grid content-block__grid--tablet blocks"><div data-v-4ed7dc78="" class="col-4 content-block__grid-wrapper"><div data-v-4ed7dc78="" class="col-4 col-sm-12 block-item"><h3 data-v-4ed7dc78="" class="block__name">Доступ к инсайтам рынка</h3> <p data-v-4ed7dc78="" class="block__description">Мы являемся сертифицированным партнером Яндекса, благодаря чему получаем множество преимуществ: доступ к бенчмаркам по нишам, обладаем знаниями о ситуации на рынке. Это позволяет нам делать прогнозы и рекомендовать улучшения, повышающие конверсию сайта.</p> <!----></div><div data-v-4ed7dc78="" class="col-4 col-sm-12 block-item"><h3 data-v-4ed7dc78="" class="block__name">Доступ к закрытым<br>инструментам рекламных платформ</h3> <p data-v-4ed7dc78="" class="block__description">Партнерство с Яндекс также дает нам доступ к закрытым бета-тестам новых форматов для наших клиентов, что позволяет первыми использовать их без большого количества конкурентов. Многими из них мы делимся в наших кейсах.</p> <!----></div><div data-v-4ed7dc78="" class="col-4 col-sm-12 block-item"><h3 data-v-4ed7dc78="" class="block__name">Прозрачное ценообразование</h3> <p data-v-4ed7dc78="" class="block__description">Мы предлагаем прозрачные условия работы по настройке контекстной рекламы в Яндекс Директ, без агентских комиссий и лишних расходов. Мы не берем агентскую комиссию с бюджетов — весь рекламный бюджет идет только на рекламу. Наши работы оплачиваются отдельно. Стоимость зависит от количества рабочих часов команды на процессы по настройке и оптимизации рекламы.</p> <!----></div></div><div data-v-4ed7dc78="" class="col-4 content-block__grid-wrapper"><div data-v-4ed7dc78="" class="col-4 col-sm-12 block-item"><h3 data-v-4ed7dc78="" class="block__name">Опытная и обученная команда</h3> <p data-v-4ed7dc78="" class="block__description">Все специалисты ежегодно проходят сертификацию и обучаются работе с новыми форматами рекламы. Над стратегией каждого клиента работает команда из менеджеров, дизайнеров с большим опытом, специалистов и тимлидеров направлений, которые ежемесячно проходят обучения и делают аудиты проектов клиентов.</p> <!----></div><div data-v-4ed7dc78="" class="col-4 col-sm-12 block-item"><h3 data-v-4ed7dc78="" class="block__name">Глубокая аналитика<br>и конкурентные стратегии</h3> <p data-v-4ed7dc78="" class="block__description">Мы систематически анализируем все запущенные нами каналы рекламы в интернете, а также сайты конкурентов, после чего формируем предложения для офферов и отстройки. Знаем, как привлекать аудиторию конкурентов на сайты наших клиентов с соблюдением закона о рекламе.</p> <!----></div><div data-v-4ed7dc78="" class="col-4 col-sm-12 block-item"><h3 data-v-4ed7dc78="" class="block__name">Соблюдение законодательства<br>и модерации</h3> <p data-v-4ed7dc78="" class="block__description">С нами клиентам не приходится заботиться о соблюдении законодательства — мы хорошо знаем все правовые аспекты рекламирования, заблаговременно запрашиваем документы для прохождения модерации и самостоятельно маркируем рекламу.</p> <!----></div></div></div> <!----></div></div></section>`;
}

function buildSetupSection() {
  const items = [
      {
        title: "Анализируем конкурентов и лидеров отрасли",
        text: "Находим потенциальных конкурентов в выбранной нише, определяем лидеров рынка. Анализируем, откуда и почему к ним приходят клиенты, что покупают, какие офферы они транслируют покупателям и какие цены устанавливают на товары и услуги. Собираем множество инсайтов и перекрываем их более ценностными предложениями.",
      },
      {
        title: "Проводим аудит посадочных страниц",
        text: "Анализируем как ведут себя пользователи на сайте с помощью Яндекс Метрики и Google Analytics. Предлагаем решения, которые с помощью синергии дизайна и юзабилити сделают клиентский опыт и путь до совершения покупки, максимально комфортным и быстрым. Ориентируемся на показатели, важные для завершения воронки от просмотра рекламы до совершения транзакции или заказа.",
      },
      {
        title: "Формируем стратегию продвижения",
        text: "Собираем семантическое ядро, формируем портреты аудиторий для показа рекламы. Распределяем бюджет между рекламными форматами и создаем медиаплан на период от 4 месяцев до 1 года. В медиаплане формируем прогноз трафика на сайт, количество и стоимость целевых действий. Подробный прогноз помогает определить, как будет работать контекстная реклама и какие гипотезы дадут наибольший эффект.",
      },
      {
        title: "Создаем и запускаем рекламные кампании",
        text: "Формируем технические задания на создание фидов товаров для загрузки их в кампании. Создаем баннеры для медийных форматов и рекламы в сетях. Пишем тексты рекламных объявлений с учетом уникальных преимуществ бренда. Осуществляем итерационную настройку и запуск кампаний от наиболее эффективных к наиболее охватным.",
      },
      {
        title: "Настраиваем аналитику",
        text: "Подключаем системы аналитики для будущей оптимизации и оценки эффективности рекламы по ключевым показателям и сверяем с прогнозом. Делаем настройку целей на сайте, подключаем динамический коллтрекинг и email-трекинг, что позволит отслеживать совершение конверсий с разных источников и грамотно распределять рекламный бюджет.",
      },
    ];
  const cols = splitColumns(items);
  const descGrid =
    `<div data-v-4ed7dc78="" class="content-block__grid content-block__grid--desc blocks">` +
    `<div data-v-4ed7dc78="" class="col-4">${cols[0].map(descItem).join("")}</div>` +
    `<div data-v-4ed7dc78="" class="col-4">${cols[1].map(descItem).join("")}</div>` +
    `<div data-v-4ed7dc78="" class="col-4">${cols[2].map(descItem).join("")}${PLACEHOLDER_ITEM}</div>` +
    `</div>`;
  const subtitle = `<div data-v-490c7534="" class="col-6 col-md-12 numbered-header__subtitle-column"><p data-v-4ed7dc78="" data-v-490c7534="" class="content-block__desc">Мы подготавливаем рекламные кампании в Яндекс Директ с учетом особенностей бизнеса, конкуренции, спроса и целей проекта. Перед запуском делаем аудит и анализируем текущую ситуацию, собираем семантику, выстраиваем структуру рекламных кампаний, настраиваем аналитику и цели для дальнейшей оценки эффективности рекламы.</p></div>`;
  return (
    `<section class="page-constructor__section"><div data-v-4ed7dc78="" class="modern content-block"><div data-v-4ed7dc78="" class="page__container">` +
    `<div data-v-490c7534="" data-v-4ed7dc78="" class="numbered-header number-header__empty"><div data-v-490c7534="" class="row">` +
    `<div data-v-490c7534="" class="col-6 col-md-12 numbered-header__title-column"><div data-v-490c7534="" class="numbered-header__bullet"></div> ` +
    `<div data-v-490c7534="" class="numbered-header__title"><h2 data-v-490c7534="">Настройка контекстной рекламы</h2> <!----> <h4 data-v-490c7534="" style="display: none;"></h4></div></div> ${subtitle}</div></div> ` +
    `${descGrid} ${buildTabletGrid(items)} <!----></div></div></section>`
  );
}

function buildManageSection() {
  const item = {
    title: "Анализируем и оптимизируем",
    text: "Контекстная реклама требует постоянного анализа и обновления кампаний, чтобы сохранять эффективность при изменении конкуренции. Эффективность рекламы мы измеряем с помощью аналитики: показываем детальные отчеты, которые помогают оценить динамику показателей, найти точки роста и неэффективные рекламные элементы. По итогам собранных данных непрерывно оптимизируем кампании: масштабируем эффективные, перераспределяем бюджет и корректируем менее результативные, строим гипотезы для нового тестирования. Выстраиваем фокус на работу с качеством трафика: рост количества целевых действий (звонков, заявок, продаж с сайта) и уменьшение их стоимости.",
  };
  return buildSection("Ведение контекстной рекламы", [item], {
    description:
      "После запуска рекламных кампаний работа с проектом продолжается: мы анализируем эффективность рекламы, оптимизируем кампании, тестируем гипотезы и корректируем стратегии в зависимости от результатов. Ведение контекстной рекламы позволяет улучшать качество трафика, снижать стоимость обращения и находить новые точки роста для проекта.",
  }).replace(
    `<div data-v-4ed7dc78="" class="col-4">${descItem(item)}</div></div>`,
    `<div data-v-4ed7dc78="" class="col-4">${descItem(item)}</div><div data-v-4ed7dc78="" class="col-4">${PLACEHOLDER_ITEM}</div><div data-v-4ed7dc78="" class="col-4">${PLACEHOLDER_ITEM}</div></div>`,
  );
}

function loadHeadSection(title) {
  const headHtml = execSync("git show HEAD:kontekstnaya_reklama/index.html", {
    cwd: root,
    encoding: "utf8",
  });
  const re = /<section class="page-constructor__section"[\s\S]*?<\/section>/g;
  let m;
  while ((m = re.exec(headHtml))) {
    const h2 = m[0].match(/<h2[^>]*>([\s\S]*?)<\/h2>/);
    if (!h2) continue;
    const txt = h2[1].replace(/&nbsp;/g, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (txt === title) return m[0];
  }
  throw new Error(`HEAD section not found: ${title}`);
}

function buildVidySection() {
  let section = loadHeadSection("Форматы контекстной рекламы");
  section = section.replace(/Форматы контекстной рекламы/g, "Виды контекстной рекламы");
  section = section.replace(/numbered-header title-large number-header__empty/g, "numbered-header number-header__empty");
  return flattenDescGrid(section);
}

function buildPochmuSection() {
  return flattenDescGrid(loadHeadSection("Почему работать с нами надежно и выгодно"));
}

function flattenDescGrid(section) {
  const ds = section.indexOf("content-block__grid content-block__grid--desc");
  const ts = section.indexOf("content-block__grid content-block__grid--tablet");
  if (ds < 0 || ts < 0 || ts <= ds) return section;
  const desc = section.slice(ds, ts);
  const openMatch = desc.match(/^<div[^>]*class="content-block__grid content-block__grid--desc[^"]*"[^>]*>/);
  if (!openMatch) return section;
  const openTag = openMatch[0]
    .replace(/\scontent-block__number-container/g, "")
    .replace(/\scontent-block__grid--desc-custom/g, "");
  const itemRe =
    /<div data-v-4ed7dc78="" class="col-4 col-sm-12 block-item"[\s\S]*?<\/div>\s*<!----><\/div>|<div data-v-4ed7dc78="" class="col-4 col-sm-12 block-item"[\s\S]*?<\/div>/g;
  const items = [];
  let m;
  while ((m = itemRe.exec(desc))) {
    const it = m[0].replace(/\s*<!----><\/div>$/, "").trim();
    if (!it.includes('class="block__name"')) continue;
    const t = it.match(/class="block__name">([\s\S]*?)<\/h3>/);
    if (!t) continue;
    const title = t[1]
      .replace(/&nbsp;/g, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (!title || title === "—") continue;
    items.push(it);
  }
  if (!items.length) return section;
  const remainder = items.length % 3;
  const placeholders = remainder === 0 ? 0 : 3 - remainder;
  const colWrappers = [
    ...items.map((it) => `<div data-v-4ed7dc78="" class="col-4">${it}</div>`),
    ...Array.from({ length: placeholders }, () => `<div data-v-4ed7dc78="" class="col-4">${PLACEHOLDER_ITEM}</div>`),
  ].join("");
  return section.slice(0, ds) + `${openTag}${colWrappers}</div> ` + section.slice(ts);
}

function buildKpiSections() {
  return [
    buildSection(
      "Как оценивается эффективность рекламы",
      [
        {
          title: "Прозрачная система KPI",
          text: "Эффективность рекламы оценивается по заранее согласованным KPI, которые напрямую связаны с бизнес-целями клиента. Это позволяет отслеживать не только объём трафика, но и реальный вклад рекламы в продажи и рост бизнеса.",
        },
        {
          title: "Оценка стоимости и окупаемости",
          text: "Для анализа результатов используются ключевые метрики эффективности: CPL, CAC и ROMI. Они помогают понимать стоимость лида и клиента, а также оценивать окупаемость рекламных инвестиций и эффективность распределения бюджета.",
        },
        {
          title: "Контроль качества лидов и аналитика",
          text: "При оценке рекламы учитывается не только количество заявок, но и качество лидов, их конверсия в продажи и соответствие целевой аудитории. Сквозная аналитика и постоянный мониторинг данных позволяют оперативно оптимизировать кампании и повышать результат.",
        },
      ],
      { rowAligned: true },
    ),
    buildSection(
      "Отчётность и гарантии",
      [
        {
          title: "SLA и сроки запуска",
          text: "Мы работаем по SLA с фиксированными сроками и прозрачным распределением задач на каждом этапе проекта. Старт работ начинается в день оплаты, а настройка рекламных кампаний занимает от одной до двух недель в зависимости от объёма и сложности проекта.",
        },
        {
          title: "Прозрачная отчётность",
          text: "Мы предоставляем отчётность в удобном формате: Google Sheets, дашборды, PDF или презентации. В отчёты включаем расходы, заявки, CPL, аналитику и рекомендации по оптимизации, а при наличии данных по продажам — также ROMI и показатели окупаемости рекламы.",
        },
        {
          title: "Коммуникация с командой",
          text: "Над проектом работает аккаунт-менеджер, тимлид контекстной рекламы, специалист по контекстной рекламе и аналитик. Мы ведём коммуникацию через чаты, почту и регулярные встречи, а на сообщения и правки отвечаем в течение рабочего дня.",
        },
        {
          title: "Контроль и прозрачность работы",
          text: "Мы предоставляем доступы к рекламным кабинетам и системам аналитики для полного контроля расходов и результатов. Для отслеживания задач и сроков используем таймлайн со списком работ, дедлайнами и актуальными статусами готовности по каждому этапу проекта.",
        },
        {
          title: "Маркировка рекламы и безопасность",
          text: "Мы автоматически маркируем рекламные материалы через ОРД Яндекса в соответствии с законодательством РФ и берём на себя передачу всех необходимых данных. Конфиденциальность информации фиксируем через NDA, а рекламные кампании оптимизируем минимум раз в неделю для достижения KPI и роста эффективности.",
        },
      ],
      { rowAligned: true },
    ),
    buildSection(
      "Контекстная реклама в Москве и Санкт-Петербурге",
      [
        {
          title: "Особенности продвижения в крупных городах",
          text: "Контекстная реклама в Москве и Санкт-Петербурге требует отдельной стратегии и медиапланирования. Эти регионы отличаются более широкой аудиторией, высоким спросом и большим количеством потенциальных клиентов по сравнению с большинством других городов России.",
        },
        {
          title: "Высокая конкуренция и стоимость трафика",
          text: "Из-за высокой конкуренции в аукционе стоимость клика (CPC) и стоимость лида (CPL) в Москве и Санкт-Петербурге обычно выше среднего по рынку. При этом в этих регионах выше покупательская способность аудитории, средний чек и потенциальная прибыль с клиента, поэтому реклама часто показывает более сильный бизнес-результат в долгосрочной перспективе.",
        },
        {
          title: "Отдельные бюджеты и региональные кампании",
          text: "Мы рекомендуем запускать Москву и Санкт-Петербург отдельно от остальных регионов, так как объединение с общей рекламой по России может искажать аналитику и перераспределять бюджет в сторону более дорогого трафика. Разделение кампаний позволяет точнее управлять ставками, KPI и эффективностью рекламы по каждому региону.",
        },
        {
          title: "Локальные рекламные кампании",
          text: "Для бизнеса с офлайн-точками или локальной зоной обслуживания мы настраиваем рекламу с привязкой к конкретным районам, станциям метро и геозонам. Такой подход помогает точнее попадать в целевую аудиторию, эффективнее распределять бюджет и повышать конверсию за счёт более релевантных объявлений и геотаргетинга.",
        },
      ],
      { rowAligned: true },
    ),
  ];
}

/** Полный стек SEO-секций (без «Пакеты», .dies и хвоста страницы). */
function buildKontekstnayaSeoStack() {
  return [
    buildAgencySection(),
    buildSetupSection(),
    buildManageSection(),
    buildVidySection(),
    ...buildKpiSections(),
    buildPochmuSection(),
  ].join("\n");
}

module.exports = {
  buildAgencySection,
  buildSetupSection,
  buildManageSection,
  buildVidySection,
  buildKpiSections,
  buildPochmuSection,
  buildKontekstnayaSeoStack,
  flattenDescGrid,
  PLACEHOLDER_ITEM,
};

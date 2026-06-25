/**
 * SEO content-block секции для /targeting (тексты из ТЗ тимлида).
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..", "..");
const partialsRoot = path.join(root, "html", "partials", "services");

const PLACEHOLDER_ITEM =
  '<div data-v-4ed7dc78="" class="col-4 col-sm-12 block-item" aria-hidden="true" style="visibility:hidden;"><div data-v-4ed7dc78="" class="block__name-wrapper"><h3 data-v-4ed7dc78="" class="block__name">&nbsp;</h3> <!----></div> <p data-v-4ed7dc78="" class="block__description">&nbsp;</p> <!----></div>';

function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function descItem(item) {
  const title = item.titleHtml || esc(item.title);
  return `<div data-v-4ed7dc78="" class="col-4 col-sm-12 block-item"><div data-v-4ed7dc78="" class="block__name-wrapper"><h3 data-v-4ed7dc78="" class="block__name">${title}</h3> <!----></div> <p data-v-4ed7dc78="" class="block__description">${item.text}</p> <!----></div>`;
}

function tabletItem(item) {
  const title = item.titleHtml || esc(item.title);
  return `<div data-v-4ed7dc78="" class="col-4 col-sm-12 block-item"><h3 data-v-4ed7dc78="" class="block__name">${title}</h3> <p data-v-4ed7dc78="" class="block__description">${item.text}</p> <!----></div>`;
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
    const all = [...items.map((it) => descItem(it)), ...Array.from({ length: placeholders }, () => PLACEHOLDER_ITEM)];
    const rows = [];
    for (let i = 0; i < all.length; i += 3) {
      const row = all
        .slice(i, i + 3)
        .map((it) => `<div data-v-4ed7dc78="" class="col-4">${it}</div>`)
        .join("");
      rows.push(`<div data-v-4ed7dc78="" class="content-block__grid-wrapper">${row}</div>`);
    }
    return `<div data-v-4ed7dc78="" class="content-block__grid content-block__grid--desc content-block__grid--desc-by-row blocks">${rows.join("")}</div>`;
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

function buildTargetingKpiSection() {
  return `<section class="page-constructor__section"><div class="advantages"><div class="page__container desktop"><div data-v-1aed48bd="" class="advantages-card advantages-card--targeting-mini"><div data-v-1aed48bd="" class="advantages-card__content"><ul data-v-1aed48bd="" class="advantages-card__content-list"><li data-v-1aed48bd="" class="advantages-card__content-item"><div data-v-1aed48bd="" class="advantages-card__content-image"><img data-v-1aed48bd="" src="/_sa/img/storage__bZbyJclDTGjFeyZcd0uz0G7fRIZVZwNIiSLPqoSa.png" alt="Таргетированная реклама — заказы"></div> <div data-v-1aed48bd="" class="advantages-card__content-info"><h3 data-v-1aed48bd="" class="advantages-card__content-title">1500+</h3> <div data-v-1aed48bd="" class="advantages-card__content-text">заказов приносит клиентам<br>таргетированная реклама</div></div></li><li data-v-1aed48bd="" class="advantages-card__content-item"><div data-v-1aed48bd="" class="advantages-card__content-image"><img data-v-1aed48bd="" src="/_sa/img/storage__rmJphtPKaYSrq3klp9VGbISG6xyjAeAKAlqtBMxt.png" alt="Таргетированная реклама — ниши"></div> <div data-v-1aed48bd="" class="advantages-card__content-info"><h3 data-v-1aed48bd="" class="advantages-card__content-title">20+</h3> <div data-v-1aed48bd="" class="advantages-card__content-text">ниш: от&nbsp;B2B и&nbsp;недвижимости<br>до&nbsp;e-commerce и&nbsp;IT</div></div></li><li data-v-1aed48bd="" class="advantages-card__content-item"><div data-v-1aed48bd="" class="advantages-card__content-image"><img data-v-1aed48bd="" src="/_sa/img/storage__yklhuDG3FTH1d2ZDNOQvx3OXSy3KaM31bhq9LNM3.png" alt="Таргетированная реклама — площадки"></div> <div data-v-1aed48bd="" class="advantages-card__content-info"><h3 data-v-1aed48bd="" class="advantages-card__content-title">15+</h3> <div data-v-1aed48bd="" class="advantages-card__content-text">площадок: от&nbsp;VK и&nbsp;Telegram<br>до&nbsp;программатик-рекламы и&nbsp;LinkedIn</div></div></li></ul></div></div></div></div></section>`;
}

function buildAgencySection() {
  const items = [
    {
      title: "Партнёрство с рекламными платформами",
      text: "Мы являемся партнёрами VK, МТС, МегаФона и СберAds. Благодаря партнёрству быстрее подключаем новые рекламные инструменты, точнее находим целевую аудиторию и эффективнее расходуем бюджет — это помогает получать больше обращений и заказов.",
    },
    {
      title: "Широкий выбор площадок и аудиторий",
      text: "Работаем более чем с 15 рекламными площадками и инструментами — от VK и Telegram до операторских данных, программатик-рекламы и зарубежных социальных сетей. Подбираем каналы под аудиторию, продукт и бюджет проекта.",
    },
    {
      title: "Прозрачное ценообразование",
      text: "Рекламный бюджет полностью направляется на размещение рекламы. Работа команды оплачивается отдельно, а её стоимость зависит от количества продвигаемых товаров и услуг, географии продвижения и задач бизнеса. Закрываем полный цикл: от роста охватов и привлечения подписчиков до лидогенерации и прямых продаж.",
    },
    {
      title: "Опытная команда вместо одного специалиста",
      text: "Над проектом работает команда с маркетинговым образованием: таргетологи, копирайтеры, аналитики, дизайнеры и менеджеры. Объединяем опыт из 20+ ниш, проверенные решения и кейсы, проводим стратегические сессии и брейнштормы. Работа не останавливается из-за отпусков или больничных — специалисты подменяют друг друга, сохраняя темп и качество рекламных кампаний.",
    },
    {
      title: "Глубокая аналитика и точный таргетинг",
      text: "Изучаем аудиторию, конкурентов и путь клиента до покупки. Сегментируем пользователей, тестируем офферы и креативы, анализируем результаты и перераспределяем бюджет в пользу наиболее эффективных связок.",
    },
    {
      title: "Соблюдение законодательства и модерации",
      text: "Учитываем требования законодательства и рекламных площадок. Заранее запрашиваем необходимые документы и самостоятельно передаём их на модерацию. Регистрируем рекламу у оператора рекламных данных и обеспечиваем её корректную маркировку.",
    },
  ];
  return buildSection("Агентство таргетированной рекламы", items, {
    description:
      "Агентство Serenity помогает бизнесу привлекать целевую аудиторию и получать заказы с помощью таргетированной рекламы. Строим стратегию на основе бизнес-целей, аналитики и экономики проекта, подбирая оптимальные площадки, форматы и аудитории.",
    rowAligned: true,
  });
}

function buildSetupSection() {
  const items = [
    {
      title: "Анализируем аудиторию и конкурентов",
      text: "Изучаем продукт, рынок и рекламную активность конкурентов. Определяем потребности, интересы и поведение потенциальных клиентов, формируем сегменты целевой аудитории и гипотезы для продвижения.",
    },
    {
      title: "Подбираем площадки и инструменты",
      text: "Выбираем рекламные каналы с учётом аудитории, географии и задач бизнеса — от VK и Telegram до МТС, МегаФона, СберAds и программатик-платформ. Распределяем бюджет между наиболее перспективными площадками и форматами.",
    },
    {
      title: "Разрабатываем медиаплан",
      text: "На основе прошлых результатов, отраслевых бенчмарков и данных рекламных платформ прогнозируем охваты, трафик, количество и стоимость целевых действий. Распределяем бюджет между площадками, форматами и сегментами аудитории, формируем KPI и сценарии масштабирования кампании.",
    },
    {
      title: "Формируем стратегию продвижения",
      text: "Определяем цели и ключевые показатели кампании: охваты, подписки, обращения, лиды или продажи. Продумываем рекламную воронку, офферы и сценарии взаимодействия с аудиторией на каждом этапе.",
    },
    {
      title: "Создаём и запускаем рекламные кампании",
      text: "Разрабатываем тексты и визуальные концепции, адаптируем креативы под требования площадок. Настраиваем рекламные кабинеты, аудитории, географию, цели и бюджет, после чего запускаем кампании для проверки гипотез.",
    },
    {
      title: "Настраиваем аналитику",
      text: "Подключаем системы аналитики и настраиваем отслеживание целевых действий. Проверяем передачу данных, размечаем рекламные ссылки и формируем понятную систему оценки результатов — от показа объявления до заявки или продажи.",
    },
  ];
  return buildSection("Настройка таргетированной рекламы", items, {
    description:
      "Настройка — фундамент эффективной рекламной кампании. Изучаем продукт и аудиторию, подбираем площадки, разрабатываем креативы и выстраиваем аналитику, чтобы после запуска получать заявки и продажи, а не расходовать бюджет на случайные показы.",
    rowAligned: true,
  });
}

function buildManageSection() {
  const items = [
    {
      title: "Анализируем результаты и тестируем гипотезы",
      text: "Отслеживаем охваты, клики, подписки, заявки и продажи. Анализируем эффективность площадок, аудиторий, объявлений и этапов рекламной воронки. Регулярно тестируем новые сегменты, офферы, форматы и креативы, принимая решения на основе данных.",
    },
    {
      title: "Оптимизируем кампании и управляем бюджетом",
      text: "Отключаем неэффективные объявления и аудитории, корректируем ставки и перераспределяем бюджет в пользу наиболее результативных связок. Сравниваем фактические показатели с медиапланом и контролируем стоимость привлечения клиента.",
    },
    {
      title: "Масштабируем результаты",
      text: "Расширяем эффективные аудитории, географию и набор рекламных площадок. Увеличиваем бюджет постепенно, чтобы сохранять стоимость заявок и продаж. Обновляем креативы и подключаем дополнительные инструменты для дальнейшего роста.",
    },
  ];
  return buildSection("Ведение таргетированной рекламы", items, {
    description:
      "Ведение таргетированной рекламы — это непрерывная работа с данными, аудиториями и креативами. Контролируем показатели кампаний, тестируем гипотезы и корректируем стратегию, чтобы снижать стоимость целевых действий и масштабировать результаты без потери эффективности.",
  });
}

function buildPlatformsSection() {
  const dzenLink = '<a href="/prodvizhenie-statey-v-dzene-i-promostranitsah">Продвижение контента в Дзене</a>';
  const items = [
    {
      title: "Охватная реклама",
      text: "Показываем баннеры и видео широкой целевой аудитории во VK, myTarget, SberAds и на других платформах. Используем социально-демографические характеристики, интересы, поведение и географию пользователей. Подходит для вывода нового продукта, роста узнаваемости бренда, продвижения акций и формирования спроса.",
    },
    {
      title: "Таргетированные SMS",
      text: "Отправляем рекламные сообщения потенциальным и текущим клиентам через МТС, МегаФон и Билайн. Подбираем аудиторию по географии, интересам, социально-демографическим и поведенческим характеристикам. Формат помогает быстро сообщить об акции, открытии новой точки или специальном предложении и привести пользователей на сайт, в магазин или офис.",
    },
    {
      title: "Лидогенерация",
      text: "Запускаем рекламу со встроенными формами во VK, myTarget, SberAds и на других платформах. Пользователь оставляет контакты прямо внутри площадки, не переходя на сайт. Подходит для записи на консультацию, расчёта стоимости, регистрации на мероприятие и сбора заявок на товары и услуги.",
    },
    {
      title: "Продвижение контента в Дзене",
      titleHtml: dzenLink,
      text: "Продвигаем статьи и публикации среди пользователей, которым интересна тематика продукта. Через полезный контент знакомим аудиторию с брендом, раскрываем преимущества предложения и отвечаем на вопросы перед покупкой. Формат особенно полезен для сложных продуктов и услуг с длительным циклом принятия решения.",
    },
    {
      title: "Программатик-реклама",
      text: "Автоматически размещаем баннеры и видео на сайтах, в мобильных приложениях и рекламных сетях. Используем собственные данные бизнеса, готовые сегменты поставщиков данных (АТОЛ, ОФД и др.), ретаргетинг и look-alike-аудитории. Программатик позволяет расширять охват за пределами социальных сетей, точнее находить потенциальных клиентов и управлять частотой контакта с рекламой.",
    },
    {
      title: "Продвижение сообществ и привлечение подписчиков",
      text: "Привлекаем целевую аудиторию в сообщества и на страницы бренда. Продвигаем публикации, подбираем заинтересованные сегменты и тестируем креативы, чтобы получать не случайные подписки, а потенциальных клиентов. Помогаем сформировать собственную аудиторию для регулярных коммуникаций, повторных продаж и дальнейшего ретаргетинга.",
    },
    {
      title: "Реклама в Telegram Ads",
      text: "Размещаем рекламные сообщения в тематических Telegram-каналах и ведём пользователей в канал или бот бренда. Подбираем площадки по тематике и аудитории, тестируем объявления и контролируем стоимость привлечения подписчика. Формат подходит для развития Telegram-канала, продвижения контента, привлечения пользователей в бот и построения собственной аудитории.",
    },
    {
      title: "Цифровая наружная реклама",
      text: "Размещаем рекламу через OOHDesk на цифровых экранах и конструкциях в нужных городах и локациях. Подбираем адреса, период, время и частоту показов с учётом географии и поведения целевой аудитории. Формат подходит для роста узнаваемости, продвижения новых точек, мероприятий и специальных предложений, а также усиливает охват интернет-рекламы.",
    },
  ];
  return buildSection("Виды таргетированной рекламы", items, {
    description:
      "Подбираем формат под этап воронки и задачи бизнеса: от роста узнаваемости и привлечения подписчиков до заявок и прямых продаж. Комбинируем площадки, аудитории и рекламные инструменты, чтобы охватить потенциальных клиентов в подходящий момент.",
    rowAligned: true,
  });
}

function buildEffectivenessSection() {
  return buildSection(
    "Как оценивается эффективность таргетированной рекламы",
    [
      {
        title: "KPI под задачи бизнеса",
        text: "Для охватных кампаний анализируем показы, охват, частоту контакта, просмотры видео и вовлечённость. При продвижении сообществ — стоимость подписчика и качество привлечённой аудитории. Для кампаний на продажи — количество и стоимость лидов, заказов и покупок.",
      },
      {
        title: "Стоимость и окупаемость",
        text: "Контролируем CPM, CPC, CPL, CPA и стоимость привлечения клиента. При наличии данных о продажах оцениваем выручку, ДРР, ROMI и окупаемость рекламы, чтобы направлять бюджет в наиболее результативные каналы и связки.",
      },
      {
        title: "Качество лидов и аудитории",
        text: "Учитываем не только количество заявок, но и их качество: соответствие целевой аудитории, подтверждение контакта, переход по воронке и совершение покупки. Сопоставляем рекламные данные с информацией от отдела продаж и исключаем источники нецелевых обращений.",
      },
    ],
    {
      rowAligned: true,
      description:
        "Оцениваем результат по системе KPI, согласованной с целями бизнеса: от охвата и привлечения подписчиков до заявок и прямых продаж. Сравниваем фактические показатели с медиапланом и корректируем стратегию на основе данных.",
    },
  );
}

function buildReportingSection() {
  return buildSection(
    "Отчётность и гарантии",
    [
      {
        title: "Сроки запуска",
        text: "После получения брифа, доступов и материалов готовим стратегию, медиаплан и рекламные кампании. Срок запуска зависит от количества площадок, продуктов и географии продвижения. План работ и дедлайны согласовываем до старта проекта.",
      },
      {
        title: "Прозрачная отчётность",
        text: "Предоставляем отчёты с расходами, охватами, переходами, заявками, CPL и другими согласованными KPI. Показываем результаты по площадкам, аудиториям и креативам, объясняем изменения и формируем рекомендации на следующий период.",
      },
      {
        title: "Коммуникация с командой",
        text: "Над проектом работают аккаунт-менеджер, руководитель направления, таргетолог, аналитик и дизайнер. Проводим регулярные встречи, отвечаем на вопросы и согласовываем изменения в течение рабочего дня.",
      },
      {
        title: "Контроль рекламных кабинетов",
        text: "Предоставляем клиенту доступ к рекламным кабинетам и статистике кампаний. Бюджет расходуется только на согласованные размещения, а аудитории, пиксели и накопленные данные остаются доступными клиенту.",
      },
      {
        title: "Маркировка и модерация",
        text: "Регистрируем рекламу у оператора рекламных данных и обеспечиваем её корректную маркировку. Заранее запрашиваем у клиента необходимые документы и самостоятельно передаём их на модерацию рекламных площадок.",
      },
    ],
    {
      rowAligned: true,
      description:
        "До начала работ фиксируем сроки, состав команды, формат отчётности и правила взаимодействия. Клиент понимает, какие задачи выполняются, как расходуется бюджет и по каким показателям оценивается результат.",
    },
  );
}

function buildGeoSection() {
  return buildSection(
    "Таргетированная реклама в Москве и Санкт-Петербурге",
    [
      {
        title: "Аудитория крупных городов",
        text: "Жители Москвы и Санкт-Петербурга отличаются высокой покупательской активностью, но ежедневно сталкиваются с большим количеством рекламы. Сегментируем аудиторию по интересам, поведению, уровню дохода и этапу принятия решения, чтобы показывать релевантные предложения.",
      },
      {
        title: "Конкуренция и стоимость рекламы",
        text: "Из-за высокого спроса на аудиторию стоимость показов, переходов и заявок в Москве и Санкт-Петербурге может быть выше, чем в других регионах. Тестируем площадки, сегменты и форматы, контролируем частоту показов и перераспределяем бюджет в пользу эффективных связок.",
      },
      {
        title: "Отдельные региональные кампании",
        text: "Запускаем Москву и Санкт-Петербург в отдельных кампаниях с собственными бюджетами, креативами и KPI. Это позволяет учитывать различия в поведении пользователей, сравнивать показатели и не смешивать результаты двух рынков.",
      },
      {
        title: "Локальное продвижение",
        text: "Для бизнеса с физическими точками настраиваем рекламу по районам, станциям метро и выбранным геозонам. Используем данные операторов связи, цифровую наружную рекламу и геотаргетинг, чтобы охватывать людей рядом с магазинами, офисами и мероприятиями.",
      },
    ],
    {
      rowAligned: true,
      description:
        "Для продвижения в Москве и Санкт-Петербурге разрабатываем отдельную стратегию с учётом высокой конкуренции, особенностей аудитории и стоимости рекламного контакта. Разделяем кампании по городам, чтобы точнее управлять бюджетом и результатами.",
    },
  );
}

function readPartial(name) {
  const p = path.join(partialsRoot, name);
  if (!fs.existsSync(p)) throw new Error(`targeting-seo-sections: нет partial ${name}`);
  return fs.readFileSync(p, "utf8").trim();
}

function buildPackagesSection() {
  const { buildTargetingPackagesBlockHtml } = require("./build-targeting-packages-html.cjs");
  return buildTargetingPackagesBlockHtml(root);
}

function buildPlatformsMarqueeSection() {
  const { buildTargetingPlatformsMarquee } = require("./targeting-platforms-marquee.cjs");
  return buildTargetingPlatformsMarquee();
}

function buildTargetingSeoStack({ caseDarkrain, caseToofli, caseEvrostoy, caseAwm, includeKpi = true } = {}) {
  const parts = [];
  if (includeKpi) parts.push(buildTargetingKpiSection());
  parts.push(
    buildAgencySection(),
    caseDarkrain,
    buildSetupSection(),
    buildManageSection(),
    caseToofli,
    buildPlatformsSection(),
    buildPlatformsMarqueeSection(),
    buildPackagesSection(),
    caseEvrostoy,
    buildEffectivenessSection(),
    buildReportingSection(),
    caseAwm,
    buildGeoSection(),
  );
  return parts.join("\n");
}

module.exports = {
  buildTargetingKpiSection,
  buildAgencySection,
  buildSetupSection,
  buildManageSection,
  buildPlatformsSection,
  buildPackagesSection,
  buildPlatformsMarqueeSection,
  buildEffectivenessSection,
  buildReportingSection,
  buildGeoSection,
  buildTargetingSeoStack,
};

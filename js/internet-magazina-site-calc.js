/**
 * Квиз-калькулятор стоимости интернет-магазина (/sozdanie-internet-magazina).
 * Визуал как /korporativnyj_sajt. Генерация: node scripts/build-internet-magazina-site-calc.cjs
 */
(() => {
  const ROOT_ID = "internet-magazina-site-calc-root";
  const CONTENT_ID = "internet-magazina-site-calc-content";
  const PBAR_ID = "internet-magazina-calc-pbar";
  const PLABEL_ID = "internet-magazina-calc-plabel";
  const INLINE_LEAD_ROOT_ID = "sa-inline-lead-root";
  const COMMENT_MARKER = "Детализация калькулятора";

  function scrollToInlineLeadForm() {
    const leadRoot = document.getElementById(INLINE_LEAD_ROOT_ID);
    if (!leadRoot) return;
    leadRoot.scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(() => {
      leadRoot.querySelector('input[name="name"]')?.focus({ preventScroll: true });
    }, 450);
  }

  function openSitePopup() {
    scrollToInlineLeadForm();
  }

  function mountShell(root) {
    root.innerHTML =
      '<div class="sa-site-calc__card">' +
      '<div class="sa-site-calc__head">' +
      '<div class="sa-site-calc__tag">Калькулятор</div>' +
      '<h2 class="sa-site-calc__title kontekstnaya-page__section-heading">Сколько стоит<br>интернет-магазин?</h2>' +
      '<p class="sa-site-calc__sub">Ориентировочный расчёт за 2 минуты</p>' +
      '<div class="sa-site-calc__progress-wrap">' +
      '<div class="sa-site-calc__progress-track"><div class="sa-site-calc__progress-fill" id="' +
      PBAR_ID +
      '"></div></div>' +
      '<div class="sa-site-calc__progress-label" id="' +
      PLABEL_ID +
      '">Шаг 1 из 6</div>' +
      "</div></div>" +
      '<div id="' +
      CONTENT_ID +
      '" class="sa-site-calc__content"></div>' +
      "</div>";
  }


  /* ---------- ШАГИ ---------- */

  const ALL_STEPS = {
    start: {
      id: 'start',
      q: 'С чего начнём?',
      hint: 'Выберите вариант — следующий шаг откроется автоматически',
      type: 'single',
      cols: 3,
      opts: [
        { v: 'new', label: 'Новый магазин', sub: 'С нуля', pain: 'Без ограничений старой архитектуры и технического долга' },
        { v: 'redesign', label: 'Редизайн', sub: 'Текущий магазин', pain: 'Обновим интерфейс и логику, сохранив рабочие сценарии' },
        { v: 'func', label: 'Доработка', sub: 'Точечные улучшения', pain: 'Доработаем нужные модули без переработки магазина' }
      ]
    },
    site_type: {
      id: 'site_type',
      q: 'Какой формат магазина?',
      hint: 'Выберите вариант — следующий шаг откроется автоматически',
      type: 'single',
      cols: 3,
      opts: [
        { v: 'retail', label: 'Розница', sub: 'B2C, конечный покупатель', pain: 'Конверсия и средний чек растут от удобства покупки' },
        { v: 'opt', label: 'Опт', sub: 'B2B, дилеры', pain: 'Личные цены, минимальные заказы, быстрые повторные закупки' },
        { v: 'marketplace', label: 'Маркетплейс', sub: 'Несколько продавцов', pain: 'Гибкие комиссии, выгрузки, аналитика по продавцам' }
      ]
    },
    scale: {
      id: 'scale',
      q: 'Объём каталога?',
      hint: 'Выберите вариант — следующий шаг откроется автоматически',
      type: 'single',
      cols: 3,
      opts: [
        { v: 'sm', label: 'До 500 товаров', sub: 'Бутик, нишевой магазин', pain: 'Быстрый старт для лимитированной линейки или премиум-сегмента' },
        { v: 'md', label: 'До 5 000 товаров', sub: 'Стандартный магазин', pain: 'Подходит для большинства специализированных магазинов' },
        { v: 'lg', label: 'Без ограничений', sub: 'Крупный магазин', pain: 'Архитектура под нагрузку и постоянное пополнение каталога' }
      ]
    },
    design: {
      id: 'design',
      q: 'Уровень дизайна?',
      hint: 'Выберите вариант — следующий шаг откроется автоматически',
      type: 'single',
      cols: 3,
      opts: [
        { v: 'basic', label: 'Базовый', sub: 'Шаблонный', pain: 'Быстрый старт. Подходит для проверки гипотезы или нишевого магазина' },
        { v: 'unique', label: 'Оптимальный', sub: 'Уникальный под бренд', pain: 'Конверсия выше на 30–40% против шаблонных решений' },
        { v: 'premium', label: 'Премиум', sub: 'Полностью индивидуальный', pain: 'Анимации, WOW-эффект, обязателен в премиум-сегменте' }
      ]
    },
    integ: {
      id: 'integ',
      q: 'Что нужно подключить?',
      hint: '',
      type: 'multi',
      cols: 2,
      opts: [
        { v: '1c', label: '1С / ERP', sub: 'Учётная система', pain: 'Остатки, цены, заказы в реальном времени без ручной работы' },
        { v: 'crm', label: 'CRM', sub: 'amoCRM, Bitrix24', pain: 'Заявки сразу попадают в воронку менеджеру' },
        { v: 'pay', label: 'Онлайн-оплата', sub: 'ЮKassa, СберPay, СБП', pain: 'Карты, СБП, рассрочки, фискализация по 54-ФЗ' },
        { v: 'delivery', label: 'Доставка', sub: 'СДЭК, Boxberry, Почта', pain: 'Расчёт в корзине, автоматическая передача заказов в службу' }
      ]
    },
    mods: {
      id: 'mods',
      q: 'Что нужно доработать?',
      hint: 'Можно выбрать несколько. Минимум один пункт',
      type: 'multi',
      cols: 2,
      opts: [
        { v: 'pay', label: 'Доп. способы оплаты', sub: 'Рассрочки, СБП, новые шлюзы', pain: 'Меньше отказов на чек-ауте, шире охват аудитории' },
        { v: 'speed', label: 'Оптимизация скорости загрузки', sub: 'Ускорение страниц и каталога', pain: 'Быстрая загрузка повышает конверсию и ранжирование' },
        { v: 'filters', label: 'Доработка фильтров каталога', sub: 'Сложные фильтры по характеристикам', pain: 'Покупатель быстрее находит товар — растёт конверсия' },
        { v: 'cart', label: 'Корзина и оформление', sub: 'Быстрый заказ, чек-аут в один шаг', pain: 'Сокращаем шаги от выбора до оплаты — меньше брошенных корзин' },
        { v: 'account', label: 'Личный кабинет', sub: 'История заказов, избранное, отслеживание', pain: 'Удобство покупки и поддержка повторных продаж' },
        { v: 'card', label: 'Улучшение карточки товара', sub: 'Галерея, отзывы, рекомендации', pain: 'Полная информация снимает сомнения и подталкивает к покупке' },
        { v: 'mobile', label: 'Адаптив / мобильная версия', sub: 'Переделка мобильной вёрстки', pain: 'Более 70% покупок идёт с мобильных — адаптив обязателен' },
        { v: 'loyalty', label: 'Система лояльности', sub: 'Бонусы, промокоды, дисконты', pain: 'Повышаем средний чек и стимулируем повторные покупки' },
        { v: 'crm', label: 'Интеграция CRM/ERP', sub: 'amoCRM, Bitrix24, 1С', pain: 'Заявки в воронке, остатки и цены в реальном времени' },
        { v: 'cms', label: 'Миграция на другую CMS', sub: 'Перенос данных и перенастройка', pain: 'Уходим со старой платформы без потери данных и SEO-позиций' }
      ]
    },
    seo_support: {
      id: 'seo_support',
      q: 'Что нужно после запуска?',
      hint: 'Выберите оба параметра, чтобы продолжить',
      type: 'toggle',
      groups: [
        {
          id: 'seo',
          label: 'Расширенная SEO-подготовка',
          opts: [
            { v: 'yes', label: 'Да, нужна', pain: 'Семантическое ядро, разметка Schema, ТЗ для копирайтеров' },
            { v: 'no', label: 'Достаточно базовой', pain: 'Базовая SEO (мета, ЧПУ, sitemap) входит в любой тариф' }
          ]
        },
        {
          id: 'support',
          label: 'Техническая поддержка',
          opts: [
            { v: 'yes', label: 'Да, нужна', pain: 'Мониторинг, обновления, контентные правки и развитие магазина' },
            { v: 'no', label: 'Пока нет', pain: '60% магазинов теряют в скорости и безопасности через 6 месяцев' }
          ]
        }
      ]
    }
  };

  const FLOWS = {
    new:      ['start', 'site_type', 'scale', 'design', 'integ', 'seo_support'],
    redesign: ['start', 'site_type', 'scale', 'design', 'integ', 'seo_support'],
    func:     ['start', 'site_type', 'mods', 'seo_support']
  };

  /* ---------- ТАРИФЫ / ЦЕНЫ ---------- */

  const TARIFFS = {
    basic: {
      name: 'Базовый',
      timeline: '1,5–2 мес',
      worksIncluded: [
        'Базовое SEO (мета-теги, ЧПУ, sitemap, robots.txt)',
        'Сбор требований и бриф',
        'Структура каталога и категорий',
        'Шаблонный дизайн с адаптацией под бренд',
        'Стандартная карточка товара',
        'Каталог с базовыми фильтрами',
        'Корзина и оформление заказа в один шаг',
        'Личный кабинет покупателя',
        '1 интеграция в базе тарифа (онлайн-оплата)',
        'Адаптив для мобильных устройств',
        'Тестирование основных сценариев покупки',
        'Установка на сервер клиента, настройка домена',
        '1 месяц поддержки после запуска'
      ]
    },
    unique: {
      name: 'Оптимальный',
      timeline: '3–4 мес',
      worksIncluded: [
        'Расширенная SEO-подготовка с семантическим ядром',
        'Анализ конкурентов и аудитории',
        'UX-проектирование в Figma',
        'Уникальный дизайн (главная, каталог, карточка товара)',
        'Расширенная карточка: галерея, отзывы, рекомендации',
        'Каталог с расширенными фильтрами по характеристикам',
        'Корзина и оформление в несколько шагов с расчётом доставки',
        'Личный кабинет с историей заказов и избранным',
        '3 интеграции в базе тарифа (1С / CRM / оплата)',
        'Микроразметка Schema.org',
        'Адаптив для мобильных и планшетов',
        'Полное тестирование сценариев и интеграций',
        'Установка на сервер, настройка аналитики',
        '3 месяца поддержки после запуска'
      ]
    },
    premium: {
      name: 'Премиум',
      timeline: '5–7 мес',
      worksIncluded: [
        'Углублённое исследование рынка, конкурентов и аудитории',
        'Подробное ТЗ по ГОСТ',
        'Глубокая SEO-подготовка с ТЗ для копирайтеров',
        'UX-проектирование с пользовательскими сценариями',
        'Полностью индивидуальный дизайн под бренд',
        'Анимации и интерактивные элементы интерфейса',
        'Индивидуальные шаблоны карточки под категории товаров',
        'Каталог с персонализированными фильтрами',
        'Корзина и оформление с авторизацией, бонусами, промокодами',
        'Личный кабинет с программой лояльности',
        'Все интеграции в базе тарифа (1С / CRM / оплата / доставка)',
        'Микроразметка Schema.org',
        'Адаптив под каждое устройство',
        'Полное тестирование, нагрузочное тестирование',
        'Установка, настройка резервных копий, аналитики, мониторинга',
        '6 месяцев поддержки после запуска'
      ]
    }
  };

  const PRICE_RULES = {
    basic: {
      sm: { base: 600000,  includeSeo: false },
      md: { base: 750000,  includeSeo: false },
      lg: { base: 950000,  includeSeo: false }
    },
    unique: {
      sm: { base: 1200000, includeSeo: false },
      md: { base: 1400000, includeSeo: false },
      lg: { base: 1700000, includeSeo: false }
    },
    premium: {
      sm: { base: 2500000, includeSeo: true },
      md: { base: 2900000, includeSeo: true },
      lg: { base: 3500000, includeSeo: true }
    }
  };

  /* Какие интеграции по умолчанию входят в тариф (пред-выбираются на шаге) */
  const TARIFF_DEFAULT_INTEGRATIONS = {
    basic:   ['pay'],
    unique:  ['pay', '1c', 'crm'],
    premium: ['pay', '1c', 'crm', 'delivery']
  };

  /* Размер скидки за каждое снятое из-под умолчания (140k / N включённых).
     Округлено до удобных чисел; суммарный максимум близок к 140 000 ₽. */
  const PER_REMOVAL_DISCOUNT = {
    basic:   140000, // 1 интеграция → 140k
    unique:  45000,  // 3 интеграции → 3 × 45k = 135k
    premium: 35000   // 4 интеграции → 4 × 35k = 140k
  };

  const INTEGRATION_PRICES = { '1c': 120000, crm: 75000, pay: 55000, delivery: 65000 };
  const INTEGRATION_LABELS = { '1c': '1С / ERP', crm: 'CRM', pay: 'Онлайн-оплата', delivery: 'Доставка' };

  const SEO_PRICE = 95000;
  const SUPPORT_PRICE = 45000;

  /* ---------- ДОРАБОТКА ---------- */

  /* Уровень доработки определяется выбранным форматом магазина:
     Розница → ×1 (до 400k), Опт → ×2 (до 800k), Маркетплейс → ×3 (до 1.2M) */
  const MOD_TIERS = {
    retail:      { name: 'Базовая',    multiplier: 1, cap: 400000,  timeline: '2–4 недели' },
    opt:         { name: 'Стандартная', multiplier: 2, cap: 800000,  timeline: '1–2 месяца' },
    marketplace: { name: 'Углублённая', multiplier: 3, cap: 1200000, timeline: '2–4 месяца' }
  };

  /* Названия CTA-кнопок в человеко-читаемом виде (для CRM-комментария) */
  const CTA_LABELS = {
    audit: 'Аудит интернет-магазина',
    consultation: 'Консультация по проекту'
  };

  /* Базовые цены опций доработки (сумма всех = 400 000 ₽).
     На стандарт умножаются ×2, на углублённую ×3. */
  const MOD_BASE_PRICES = {
    pay: 30000, speed: 30000, filters: 35000, cart: 40000, account: 35000,
    card: 40000, mobile: 35000, loyalty: 50000, crm: 55000, cms: 50000
  };

  const MOD_LABELS = {
    pay: 'Доп. способы оплаты',
    speed: 'Оптимизация скорости загрузки',
    filters: 'Доработка фильтров каталога',
    cart: 'Корзина и оформление',
    account: 'Личный кабинет',
    card: 'Улучшение карточки товара',
    mobile: 'Адаптив / мобильная версия',
    loyalty: 'Система лояльности',
    crm: 'Интеграция CRM/ERP',
    cms: 'Миграция на другую CMS'
  };

  /* ---------- СОСТОЯНИЕ ---------- */

  let step = 0;
  let ans = {
    start: null,
    site_type: null,
    scale: null,
    design: null,
    integ: [],
    mods: [],
    seo: null,
    support: null
  };
  let activeCtaType = null;
  let calcPayloadCache = null;
  let lastDesignForInteg = null; // отслеживает первое посещение integ-шага для текущего тарифа

  /* ---------- ВСПОМОГАТЕЛЬНЫЕ ---------- */

  function rub(n) { return n.toLocaleString('ru-RU') + '\u00a0₽'; }

  function flowList() { return FLOWS[ans.start] || FLOWS.new; }
  function currentStepCfg() { return ALL_STEPS[flowList()[step]]; }
  function flowTotal() { return flowList().length; }

  function currentRule() {
    const design = ans.design || 'basic';
    const scale = ans.scale || 'sm';
    return (PRICE_RULES[design] && PRICE_RULES[design][scale]) || PRICE_RULES.basic.sm;
  }

  function defaultIntegrationsForTariff() {
    return TARIFF_DEFAULT_INTEGRATIONS[ans.design || 'basic'] || [];
  }

  function perRemovalDiscount() {
    return PER_REMOVAL_DISCOUNT[ans.design || 'basic'] || 0;
  }

  /* Инициализация чекбоксов интеграций по тарифу — только при первом заходе или смене тарифа */
  function maybeInitIntegrations() {
    if (lastDesignForInteg !== ans.design) {
      ans.integ = [...defaultIntegrationsForTariff()];
      lastDesignForInteg = ans.design;
    }
  }

  /* Анализ выбора интеграций → доплаты и скидки */
  function integrationsBreakdown() {
    const defaults = defaultIntegrationsForTariff();
    const selected = (ans.integ || []);
    const perDisc = perRemovalDiscount();

    const paid = [];     // не в тарифе, но выбрано — доплата
    const saved = [];    // в тарифе, но снято — скидка
    let extra = 0;
    let discount = 0;

    defaults.forEach(v => {
      if (!selected.includes(v)) { discount += perDisc; saved.push(v); }
    });
    selected.forEach(v => {
      if (!defaults.includes(v)) { extra += INTEGRATION_PRICES[v]; paid.push(v); }
    });

    return { paid, saved, extra, discount };
  }

  function integrationBadge(v) {
    const defaults = defaultIntegrationsForTariff();
    const selected = ans.integ.includes(v);
    const isDefault = defaults.includes(v);
    if (isDefault && selected) return { cls: 'included', text: 'В тариф' };
    if (isDefault && !selected) return { cls: 'saving',  text: '− ' + rub(perRemovalDiscount()) };
    return { cls: 'extra', text: '+ ' + rub(INTEGRATION_PRICES[v]) };
  }

  function modPrice(v) {
    const tier = MOD_TIERS[ans.site_type] || MOD_TIERS.retail;
    return (MOD_BASE_PRICES[v] || 0) * tier.multiplier;
  }

  /* ---------- РАСЧЁТ ---------- */

  function calcPrice() {
    if (ans.start === 'func') return calcModScenario();
    return calcNewScenario();
  }

  function calcNewScenario() {
    const design = ans.design || 'basic';
    const rule = currentRule();
    const tariff = TARIFFS[design] || TARIFFS.basic;

    const { paid, saved, extra, discount } = integrationsBreakdown();

    const seoSelected = ans.seo === 'yes';
    const seoExtra = seoSelected && !rule.includeSeo ? SEO_PRICE : 0;

    const total = Math.max(0, rule.base + extra - discount + seoExtra);
    const supAmt = ans.support === 'yes' ? SUPPORT_PRICE : 0;

    return {
      type: 'new',
      total, supAmt, tariff, rule,
      seoSelected, seoExtra, seoIncluded: rule.includeSeo,
      paidIntegrations: paid,
      savedIntegrations: saved,
      integrationsExtra: extra,
      integrationsDiscount: discount,
      perDiscount: perRemovalDiscount(),
      selectedIntegrations: [...ans.integ]
    };
  }

  function calcModScenario() {
    const tier = MOD_TIERS[ans.site_type] || MOD_TIERS.retail;
    const selected = ans.mods || [];

    const modTotal = selected.reduce((s, v) => s + modPrice(v), 0);

    const seoSelected = ans.seo === 'yes';
    const seoExtra = seoSelected ? SEO_PRICE : 0;

    const total = modTotal + seoExtra;
    const supAmt = ans.support === 'yes' ? SUPPORT_PRICE : 0;

    return {
      type: 'mod',
      total, supAmt, tier,
      selectedMods: selected,
      modTotal,
      seoSelected, seoExtra,
      timeline: tier.timeline
    };
  }

  /* ---------- ПРОГРЕСС / ПЕРЕХОДЫ ---------- */

  function updateProgress(idx) {
    const total = flowTotal();
    const pct = ((idx + 1) / (total + 1)) * 100;
    document.getElementById(PBAR_ID).style.width = pct + '%';
    document.getElementById(PLABEL_ID).textContent = idx < total ? 'Шаг ' + (idx + 1) + ' из ' + total : 'Готово';
  }

  function transit(renderFn, first = false) {
    const el = document.getElementById(CONTENT_ID);
    if (first) { renderFn(); return; }
    el.style.transition = 'opacity .2s ease, transform .2s ease';
    el.style.opacity = '0';
    el.style.transform = 'translateX(14px)';
    setTimeout(() => {
      renderFn();
      requestAnimationFrame(() => requestAnimationFrame(() => {
        el.style.transition = 'opacity .32s ease, transform .32s ease';
        el.style.opacity = '1';
        el.style.transform = 'translateX(0)';
      }));
    }, 215);
  }

  function goTo(idx) {
    const flow = flowList();
    if (idx >= flow.length) return showResults();
    step = Math.max(0, idx);
    updateProgress(step);
    renderStep(currentStepCfg(), false);
  }

  /* ---------- РЕНДЕР ---------- */

  function buildStepActions(nextLabel, nextDisabled) {
    const backBtn = step > 0 ? '<button class="sa-site-calc__btn-back" id="internet-magazina-calc-back">← Назад</button>' : '';
    const nextBtn = '<button class="sa-site-calc__btn-next" id="internet-magazina-calc-next" ' + (nextDisabled ? 'disabled' : '') + '>' + nextLabel + '</button>';
    return '<div class="sa-site-calc__step-actions">' + backBtn + nextBtn + '</div>';
  }

  function getDisplayHint(s) {
    if (s.id === 'integ') {
      const design = ans.design || 'basic';
      const hintMap = {
        basic:   'В тариф «Базовый» включена 1 интеграция (онлайн-оплата). Снять — скидка 140 000 ₽. Дополнительные — по своей цене',
        unique:  'В тариф «Оптимальный» включены 3 интеграции (1С, CRM, оплата). Снять каждую — −45 000 ₽. Доставка сверху — по цене',
        premium: 'В тариф «Премиум» включены все 4 интеграции. Снять каждую — −35 000 ₽'
      };
      return hintMap[design] || s.hint;
    }
    return s.hint;
  }

  function buildCards(s) {
    const optsHTML = s.opts.map((o, i) => {
      let sel;
      if (s.id === 'integ') sel = ans.integ.includes(o.v);
      else if (s.id === 'mods') sel = ans.mods.includes(o.v);
      else sel = ans[s.id] === o.v;

      let priceRow = '';
      if (s.id === 'integ') {
        const b = integrationBadge(o.v);
        priceRow = '<div class="sa-site-calc__opt-price-row"><span class="sa-site-calc__price-tag ' + b.cls + '">' + b.text + '</span></div>';
      } else if (s.id === 'mods') {
        priceRow = '<div class="sa-site-calc__opt-price-row"><span class="sa-site-calc__price-tag extra">+ ' + rub(modPrice(o.v)) + '</span></div>';
      }

      return '<div class="sa-site-calc__opt' + (sel ? ' is-selected' : '') + '" data-sid="' + s.id + '" data-val="' + o.v + '" data-type="' + s.type + '" style="animation:saSiteCalcFadeUp .35s ' + (i * .05 + .04) + 's both">' +
        '<div class="sa-site-calc__opt-check">✓</div>' +
        '<div class="sa-site-calc__opt-label">' + o.label + '</div>' +
        (o.sub ? '<div class="sa-site-calc__opt-sub">' + o.sub + '</div>' : '') +
        '<div class="sa-site-calc__opt-pain">' + o.pain + '</div>' +
        priceRow +
      '</div>';
    }).join('');

    let actionsHTML;
    if (s.type === 'multi') {
      // integ: всегда можно дальше (даже с пустым выбором — все default-ы сняты)
      // mods: минимум 1 опция
      const disabled = s.id === 'mods' ? ans.mods.length === 0 : false;
      actionsHTML = buildStepActions('Продолжить →', disabled);
    } else {
      actionsHTML = step > 0 ? '<div class="sa-site-calc__step-actions"><button class="sa-site-calc__btn-back" id="internet-magazina-calc-back">← Назад</button></div>' : '';
    }

    return '<div class="sa-site-calc__step-num">Шаг <em>' + (step + 1) + '</em> из ' + flowTotal() + '</div>' +
      '<h3 class="sa-site-calc__step-q">' + s.q + '</h3>' +
      '<p class="sa-site-calc__step-hint">' + getDisplayHint(s) + '</p>' +
      '<div class="sa-site-calc__options sa-site-calc__options--cols-' + s.cols + '">' + optsHTML + '</div>' +
      actionsHTML;
  }

  function buildToggle(s) {
    const rule = currentRule();
    const isModScenario = ans.start === 'func';

    const groupsHTML = s.groups.map(g => {
      const hasAns = ans[g.id] !== null;
      const optsHTML = g.opts.map(o => {
        const sel = ans[g.id] === o.v;
        let priceRow = '';

        if (g.id === 'seo' && o.v === 'yes') {
          // В сценарии доработки тарифа нет — SEO всегда +95k
          if (!isModScenario && rule.includeSeo) {
            priceRow = '<div class="sa-site-calc__topt-price-row"><span class="sa-site-calc__price-tag included">В тариф</span></div>';
          } else {
            priceRow = '<div class="sa-site-calc__topt-price-row"><span class="sa-site-calc__price-tag extra">+ ' + rub(SEO_PRICE) + '</span></div>';
          }
        }
        if (g.id === 'support' && o.v === 'yes') {
          priceRow = '<div class="sa-site-calc__topt-price-row"><span class="sa-site-calc__price-tag info">1 мес бесплатно, далее от ' + rub(SUPPORT_PRICE) + ' / мес</span></div>';
        }

        return '<div class="sa-site-calc__topt' + (sel ? ' is-selected' : '') + '" data-gid="' + g.id + '" data-val="' + o.v + '">' +
          '<div class="sa-site-calc__topt-label">' + o.label + '</div>' +
          '<div class="sa-site-calc__topt-pain">' + o.pain + '</div>' +
          priceRow +
        '</div>';
      }).join('');
      return '<div class="sa-site-calc__tgroup' + (hasAns ? ' is-answered' : '') + '">' +
        '<div class="sa-site-calc__tgroup-label">' + g.label + '</div>' +
        '<div class="sa-site-calc__tgroup-opts">' + optsHTML + '</div>' +
      '</div>';
    }).join('');

    const canGo = ans.seo !== null && ans.support !== null;

    return '<div class="sa-site-calc__step-num">Шаг <em>' + (step + 1) + '</em> из ' + flowTotal() + '</div>' +
      '<h3 class="sa-site-calc__step-q">' + s.q + '</h3>' +
      '<p class="sa-site-calc__step-hint">' + s.hint + '</p>' +
      '<div class="sa-site-calc__toggle-groups" style="animation:saSiteCalcFadeUp .35s .04s both">' + groupsHTML + '</div>' +
      buildStepActions('Рассчитать стоимость →', !canGo);
  }

  function renderStep(s, first) {
    // Инициализация дефолтов перед рендером integ
    if (s.id === 'integ') maybeInitIntegrations();

    const el = document.getElementById(CONTENT_ID);
    transit(() => {
      el.innerHTML = s.type === 'toggle' ? buildToggle(s) : buildCards(s);
      attachHandlers(s);
    }, first);
  }

  function refreshIntegrationBadges() {
    document.querySelectorAll('.sa-site-calc__opt[data-sid="integ"]').forEach(o => {
      const v = o.dataset.val;
      const tag = o.querySelector('.sa-site-calc__price-tag');
      if (!tag) return;
      const b = integrationBadge(v);
      tag.textContent = b.text;
      tag.classList.remove('included', 'extra', 'saving');
      tag.classList.add(b.cls);
    });
  }

  function attachHandlers(s) {
    const backBtn = document.getElementById("internet-magazina-calc-back");
    if (backBtn) backBtn.addEventListener('click', () => goTo(step - 1));

    document.querySelectorAll('.sa-site-calc__opt').forEach(el => {
      el.addEventListener('click', () => {
        const val = el.dataset.val;
        const type = el.dataset.type;
        const sid = el.dataset.sid;

        if (type === 'single') {
          // Если меняется start — сбрасываем шаги после него и progress
          if (sid === 'start' && ans.start !== val) {
            // сохраняем общие ответы, чтобы не терять site_type/seo/support
            ans.start = val;
          } else {
            ans[sid] = val;
          }
          // Сброс инициализации интеграций, если поменялся тариф
          if (sid === 'design') lastDesignForInteg = null;
          goTo(step + 1);
          return;
        }

        // multi: integ или mods
        if (sid === 'integ') {
          const idx = ans.integ.indexOf(val);
          idx === -1 ? ans.integ.push(val) : ans.integ.splice(idx, 1);
          document.querySelectorAll('.sa-site-calc__opt[data-sid="integ"]').forEach(o => {
            o.classList.toggle('is-selected', ans.integ.includes(o.dataset.val));
          });
          refreshIntegrationBadges();
        } else if (sid === 'mods') {
          const idx = ans.mods.indexOf(val);
          idx === -1 ? ans.mods.push(val) : ans.mods.splice(idx, 1);
          document.querySelectorAll('.sa-site-calc__opt[data-sid="mods"]').forEach(o => {
            o.classList.toggle('is-selected', ans.mods.includes(o.dataset.val));
          });
          const btn = document.getElementById("internet-magazina-calc-next");
          if (btn) btn.disabled = ans.mods.length === 0;
        }
      });
    });

    document.querySelectorAll('.sa-site-calc__topt').forEach(el => {
      el.addEventListener('click', () => {
        const gid = el.dataset.gid;
        const val = el.dataset.val;
        ans[gid] = val;

        document.querySelectorAll('[data-gid="' + gid + '"]').forEach(o => {
          o.classList.toggle('is-selected', o.dataset.val === val);
        });
        document.querySelectorAll('.sa-site-calc__tgroup').forEach((g, i) => {
          const gid2 = s.groups[i] && s.groups[i].id;
          if (gid2) g.classList.toggle('is-answered', ans[gid2] !== null);
        });

        const btn = document.getElementById("internet-magazina-calc-next");
        if (btn) btn.disabled = !(ans.seo !== null && ans.support !== null);
      });
    });

    const btn = document.getElementById("internet-magazina-calc-next");
    if (btn) btn.addEventListener('click', () => {
      if (!btn.disabled) goTo(step + 1);
    });
  }

  /* ---------- РЕЗУЛЬТАТ ---------- */

  function showResults() {
    updateProgress(flowTotal());
    const calc = calcPrice();
    if (calc.type === 'mod') return showModResults(calc);
    return showNewResults(calc);
  }

  function showNewResults(calc) {
    const { total, supAmt, tariff, rule, seoSelected, seoIncluded, paidIntegrations, savedIntegrations, perDiscount } = calc;

    const startMap = { new: 'Новый магазин', redesign: 'Редизайн' };
    const siteTypeMap = { retail: 'розница', opt: 'опт', marketplace: 'маркетплейс' };
    const scaleMap = { sm: 'до 500 товаров', md: 'до 5 000 товаров', lg: 'каталог без ограничений' };
    const designMap = { basic: 'базовый дизайн', unique: 'оптимальный дизайн', premium: 'премиум-дизайн' };

    const params = [startMap[ans.start], siteTypeMap[ans.site_type], scaleMap[ans.scale], designMap[ans.design]]
      .filter(Boolean).map(p => '<strong>' + p + '</strong>').join(' · ');

    const worksHTML = tariff.worksIncluded.map(w => '<li>' + w + '</li>').join('');

    const extraRows = [];
    paidIntegrations.forEach(v => {
      extraRows.push(
        '<div class="sa-site-calc__brow"><span class="sa-site-calc__brow-label">' + INTEGRATION_LABELS[v] + ' (сверх тарифа)</span>' +
        '<span class="sa-site-calc__brow-val">+ ' + rub(INTEGRATION_PRICES[v]) + '</span></div>'
      );
    });
    if (seoSelected && !seoIncluded) {
      extraRows.push(
        '<div class="sa-site-calc__brow"><span class="sa-site-calc__brow-label">SEO-подготовка (расширенная)</span>' +
        '<span class="sa-site-calc__brow-val">+ ' + rub(SEO_PRICE) + '</span></div>'
      );
    }
    if (savedIntegrations.length) {
      const savedNames = savedIntegrations.map(v => INTEGRATION_LABELS[v]).join(', ');
      const totalDisc = savedIntegrations.length * perDiscount;
      extraRows.push(
        '<div class="sa-site-calc__brow"><span class="sa-site-calc__brow-label">Скидка за отключённые интеграции (' + savedNames + ')</span>' +
        '<span class="sa-site-calc__brow-val saving">− ' + rub(totalDisc) + '</span></div>'
      );
    }

    calcPayloadCache = buildPayloadNew(total, tariff, calc);
    window.SerenityCalcPayload = calcPayloadCache;

    const el = document.getElementById(CONTENT_ID);
    transit(() => {
      el.innerHTML =
        '<div class="sa-site-calc__result-badge" style="animation:saSiteCalcFadeUp .4s .05s both">Расчёт готов</div>' +
        '<div class="sa-site-calc__result-params" style="animation:saSiteCalcFadeUp .4s .1s both">' + params + '</div>' +
        '<div class="sa-site-calc__included-works" style="animation:saSiteCalcFadeUp .4s .15s both">' +
        '<div class="sa-site-calc__included-works-title">Что входит в тариф «' + tariff.name + '»</div>' +
        '<ul class="sa-site-calc__included-works-list">' + worksHTML + '</ul>' +
        '</div>' +
        (extraRows.length
          ? '<div class="sa-site-calc__breakdown" style="animation:saSiteCalcFadeUp .4s .18s both"><div class="sa-site-calc__breakdown-head">Корректировки и доплаты</div>' + extraRows.join('') + '</div>'
          : '') +
        '<div class="sa-site-calc__total-row" style="animation:saSiteCalcFadeUp .4s .2s both">' +
        '<div><div class="sa-site-calc__total-lbl">Итого от</div><div class="sa-site-calc__step-hint sa-site-calc__timeline-hint">Срок реализации: <strong>' + tariff.timeline + '</strong></div></div>' +
        '<div class="sa-site-calc__total-num" id="internet-magazina-calc-tcnt">0&nbsp;₽</div>' +
        '</div>' +
        (supAmt ? '<div style="animation:saSiteCalcFadeUp .4s .22s both"><div class="sa-site-calc__support-chip">+ поддержка: <strong>первый месяц бесплатно, далее от ' + rub(supAmt) + ' / мес</strong></div></div>' : '') +
        resultNoteHTML() + ctaGridHTML() +
        '<button type="button" class="sa-site-calc__reset-btn" id="internet-magazina-calc-reset">← Рассчитать заново</button>';

      bindCtaHandlers();
      bindResetHandler();
      setTimeout(() => animCounter(document.getElementById("internet-magazina-calc-tcnt"), total), 250);
    }, false);
  }

  function showModResults(calc) {
    const { total, supAmt, tier, selectedMods, seoSelected, modTotal } = calc;

    const siteTypeMap = { retail: 'розница', opt: 'опт', marketplace: 'маркетплейс' };

    const params = ['Доработка', siteTypeMap[ans.site_type], tier.name.toLowerCase() + ' доработка']
      .filter(Boolean).map(p => '<strong>' + p + '</strong>').join(' · ');

    const modsRows = selectedMods.map(v =>
      '<div class="sa-site-calc__brow"><span class="sa-site-calc__brow-label">' + MOD_LABELS[v] + '</span>' +
      '<span class="sa-site-calc__brow-val">+ ' + rub(modPrice(v)) + '</span></div>'
    ).join('');

    const extraRows = [];
    if (seoSelected) {
      extraRows.push(
        '<div class="sa-site-calc__brow"><span class="sa-site-calc__brow-label">SEO-подготовка (расширенная)</span>' +
        '<span class="sa-site-calc__brow-val">+ ' + rub(SEO_PRICE) + '</span></div>'
      );
    }

    calcPayloadCache = buildPayloadMod(total, tier, calc);
    window.SerenityCalcPayload = calcPayloadCache;

    const el = document.getElementById(CONTENT_ID);
    transit(() => {
      el.innerHTML =
        '<div class="sa-site-calc__result-badge" style="animation:saSiteCalcFadeUp .4s .05s both">Расчёт готов</div>' +
        '<div class="sa-site-calc__result-params" style="animation:saSiteCalcFadeUp .4s .1s both">' + params + '</div>' +
        '<div class="sa-site-calc__breakdown" style="animation:saSiteCalcFadeUp .4s .15s both">' +
        '<div class="sa-site-calc__breakdown-head">Выбранные доработки (' + tier.name + ')</div>' + modsRows + '</div>' +
        (extraRows.length
          ? '<div class="sa-site-calc__breakdown" style="animation:saSiteCalcFadeUp .4s .18s both"><div class="sa-site-calc__breakdown-head">Дополнительно</div>' + extraRows.join('') + '</div>'
          : '') +
        '<div class="sa-site-calc__total-row" style="animation:saSiteCalcFadeUp .4s .2s both">' +
        '<div><div class="sa-site-calc__total-lbl">Итого от</div><div class="sa-site-calc__step-hint sa-site-calc__timeline-hint">Срок реализации: <strong>' + tier.timeline + '</strong></div></div>' +
        '<div class="sa-site-calc__total-num" id="internet-magazina-calc-tcnt">0&nbsp;₽</div>' +
        '</div>' +
        (supAmt ? '<div style="animation:saSiteCalcFadeUp .4s .22s both"><div class="sa-site-calc__support-chip">+ поддержка: <strong>первый месяц бесплатно, далее от ' + rub(supAmt) + ' / мес</strong></div></div>' : '') +
        resultNoteHTML() + ctaGridHTML() +
        '<button type="button" class="sa-site-calc__reset-btn" id="internet-magazina-calc-reset">← Рассчитать заново</button>';

      bindCtaHandlers();
      bindResetHandler();
      setTimeout(() => animCounter(document.getElementById("internet-magazina-calc-tcnt"), total), 250);
    }, false);
  }

  function resultNoteHTML() {
    return '<div class="sa-site-calc__result-note" style="animation:saSiteCalcFadeUp .4s .25s both">Это ориентир. Реальная стоимость может отличаться и быть ниже или выше — цена оптимизируется за счёт выбора CMS, объёма работ и поэтапного запуска. Детали разберём на бесплатной консультации.</div>';
  }

  function ctaGridHTML() {
    return '<div class="sa-site-calc__cta-grid" style="animation:saSiteCalcFadeUp .4s .3s both">' +
      '<button type="button" class="sa-site-calc__cta-card sa-site-calc__cta-card--primary" data-cta="audit" type="button"><div class="sa-site-calc__cta-free">Бесплатно</div><div class="sa-site-calc__cta-title">Аудит интернет-магазина</div><div class="sa-site-calc__cta-desc">Разберём, что работает, а что мешает продажам</div></button>' +
      '<button type="button" class="sa-site-calc__cta-card sa-site-calc__cta-card--outline" data-cta="consultation" type="button"><div class="sa-site-calc__cta-free">Бесплатно</div><div class="sa-site-calc__cta-title">Консультация по проекту</div><div class="sa-site-calc__cta-desc">Подберём оптимальное решение по срокам и бюджету</div></button>' +
      '</div>';
  }

  function bindCtaHandlers() {
    document.querySelectorAll('[data-cta]').forEach(btn => {
      btn.addEventListener('click', () => {
        activeCtaType = btn.getAttribute('data-cta');
        calcPayloadCache = { ...calcPayloadCache, ctaType: activeCtaType };
        window.SerenityCalcPayload = calcPayloadCache;
        openSitePopup();
      });
    });
  }

  /* ---------- ПЕЙЛОАДЫ ДЛЯ ФОРМЫ ---------- */

  function buildPayloadNew(total, tariff, calc) {
    const startMap = { new: 'Новый магазин', redesign: 'Редизайн' };
    const siteTypeMap = { retail: 'Розница (B2C)', opt: 'Опт (B2B)', marketplace: 'Маркетплейс' };
    const scaleMap = { sm: 'до 500 товаров', md: 'до 5 000 товаров', lg: 'без ограничений' };
    const designMap = { basic: 'Базовый', unique: 'Оптимальный', premium: 'Премиум' };

    return {
      scenario: 'new_or_redesign',
      ctaType: activeCtaType || '',
      startLabel: startMap[ans.start] || '',
      siteTypeLabel: siteTypeMap[ans.site_type] || '',
      scaleLabel: scaleMap[ans.scale] || '',
      designLabel: designMap[ans.design] || '',
      selectedIntegrations: calc.selectedIntegrations.map(v => INTEGRATION_LABELS[v]),
      paidIntegrations: calc.paidIntegrations.map(v => INTEGRATION_LABELS[v]),
      savedIntegrations: calc.savedIntegrations.map(v => INTEGRATION_LABELS[v]),
      discountTotal: calc.integrationsDiscount,
      seoLabel: ans.seo === 'yes' ? 'Расширенная' : 'Базовая (в тарифе)',
      supportLabel: ans.support === 'yes' ? 'Да (1 мес бесплатно, далее от ' + rub(SUPPORT_PRICE) + ' / мес)' : 'Нет',
      totalLabel: rub(total),
      timeline: tariff.timeline,
      worksIncluded: tariff.worksIncluded,
      ctaTypeLabel: CTA_LABELS[activeCtaType] || ''
    };
  }

  function buildPayloadMod(total, tier, calc) {
    const siteTypeMap = { retail: 'Розница (B2C)', opt: 'Опт (B2B)', marketplace: 'Маркетплейс' };

    return {
      scenario: 'modification',
      ctaType: activeCtaType || '',
      startLabel: 'Доработка',
      siteTypeLabel: siteTypeMap[ans.site_type] || '',
      tierLabel: tier.name + ' доработка (до ' + rub(tier.cap) + ')',
      selectedMods: calc.selectedMods.map(v => MOD_LABELS[v] + ' — ' + rub(modPrice(v))),
      seoLabel: ans.seo === 'yes' ? 'Расширенная (+' + rub(SEO_PRICE) + ')' : 'Не нужна',
      supportLabel: ans.support === 'yes' ? 'Да (1 мес бесплатно, далее от ' + rub(SUPPORT_PRICE) + ' / мес)' : 'Нет',
      totalLabel: rub(total),
      timeline: tier.timeline,
      ctaTypeLabel: CTA_LABELS[activeCtaType] || ''
    };
  }

  function buildCalculatorCommentMask(p) {
    if (p.scenario === 'modification') {
      return [
        'Детализация калькулятора (доработка интернет-магазина):',
        'Тип работ: ' + p.startLabel,
        'Формат магазина: ' + p.siteTypeLabel,
        'Уровень доработки (по формату): ' + p.tierLabel,
        'Выбранные доработки:',
        ...p.selectedMods.map(m => '  • ' + m),
        'SEO: ' + p.seoLabel,
        'Техподдержка: ' + p.supportLabel,
        'Стоимость от: ' + p.totalLabel,
        'Срок: ' + p.timeline,
        'Нажата кнопка: ' + (p.ctaTypeLabel || '—')
      ].join('\n');
    }
    return [
      'Детализация калькулятора (интернет-магазин):',
      'Тип работ: ' + p.startLabel,
      'Формат магазина: ' + p.siteTypeLabel,
      'Объём каталога: ' + p.scaleLabel,
      'Тариф: ' + p.designLabel,
      'Все выбранные интеграции: ' + (p.selectedIntegrations.length ? p.selectedIntegrations.join(', ') : 'не выбраны'),
      'Сверх тарифа (доплата): ' + (p.paidIntegrations.length ? p.paidIntegrations.join(', ') : '—'),
      'Снято из тарифа (скидка ' + rub(p.discountTotal) + '): ' + (p.savedIntegrations.length ? p.savedIntegrations.join(', ') : '—'),
      'SEO: ' + p.seoLabel,
      'Техподдержка: ' + p.supportLabel,
      'Стоимость от: ' + p.totalLabel,
      'Срок: ' + p.timeline,
      'Состав работ: ' + p.worksIncluded.join('; '),
      'Нажата кнопка: ' + (p.ctaTypeLabel || '—')
    ].join('\n');
  }

  function bindPopupFormAugment() {
    if (window.__serenityCalcFormBound) return;
    window.__serenityCalcFormBound = true;

    document.addEventListener('submit', (e) => {
      const form = e.target;
      if (!(form instanceof HTMLFormElement)) return;
      if (!calcPayloadCache) return;

      const commentField = form.querySelector(
        'textarea[name*="comment" i],input[name*="comment" i],textarea[placeholder*="Комментар" i],input[placeholder*="Комментар" i]'
      );
      if (!commentField) return;

      const marker = 'Детализация калькулятора';
      const current = (commentField.value || '').trim();
      const pureUserText = current.includes(marker) ? current.split(marker)[0].trim() : current;

      const calcMask = buildCalculatorCommentMask(calcPayloadCache);
      commentField.value = pureUserText ? (pureUserText + '\n\n' + calcMask) : calcMask;
    }, true);
  }

  function openSitePopup() {
    const trigger = document.querySelector(
      '[data-open-popup], [data-popup-open], .js-open-popup, .open-popup, [href*="#popup"], [href*="modal"]'
    );
    if (trigger) {
      trigger.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      return;
    }
    window.location.href = 'https://serenity.agency/contacts';
  }

  function animCounter(el, target) {
    const dur = 1100;
    const t0 = Date.now();
    function tick() {
      const prog = Math.min((Date.now() - t0) / dur, 1);
      const eased = 1 - Math.pow(1 - prog, 3);
      el.textContent = rub(Math.round(eased * target));
      if (prog < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  function bindResetHandler() {
    document.getElementById("internet-magazina-calc-reset")?.addEventListener("click", reset);
  }

  function reset() {
    step = 0;
    ans = {
      start: null, site_type: null, scale: null, design: null, integ: [],
      mods: [], seo: null, support: null
    };
    calcPayloadCache = null;
    activeCtaType = null;
    lastDesignForInteg = null;
    window.SerenityCalcPayload = null;
    updateProgress(0);
    renderStep(ALL_STEPS.start, false);
  }



  function boot() {
    updateProgress(0);
    renderStep(ALL_STEPS.start, true);
    window.SerenitySiteCalc = {
      COMMENT_MARKER,
      buildCommentMask: buildCalculatorCommentMask,
    };
  }

  function init() {
    const root = document.getElementById(ROOT_ID);
    if (!root || root.dataset.saSiteCalcMounted === "1") return;
    root.dataset.saSiteCalcMounted = "1";
    mountShell(root);
    boot();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

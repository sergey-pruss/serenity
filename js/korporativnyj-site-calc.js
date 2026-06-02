/**
 * Квиз-калькулятор стоимости корпоративного сайта (/korporativnyj_sajt).
 * Данные расчёта → window.SerenityCalcPayload → comments в leave-request-cta.js.
 */
(() => {
  const ROOT_ID = "korporativnyj-site-calc-root";
  const CONTENT_ID = "korporativnyj-site-calc-content";
  const PBAR_ID = "korporativnyj-calc-pbar";
  const PLABEL_ID = "korporativnyj-calc-plabel";
  const INLINE_LEAD_ROOT_ID = "sa-inline-lead-root";
  const COMMENT_MARKER = "Детализация калькулятора:";

  const STEPS = [
    {
      id: "start",
      q: "С чего начнём?",
      hint: "Выберите вариант — следующий шаг откроется автоматически",
      type: "single",
      cols: 3,
      opts: [
        { v: "new", label: "Новый сайт", sub: "С нуля", pain: "Без ограничений старой архитектуры и технического долга" },
        { v: "redesign", label: "Редизайн", sub: "Текущий сайт", pain: "Обновим структуру, сохранив то, что уже работает" },
        { v: "func", label: "Доработка", sub: "Новый функционал", pain: "Добавим нужные модули без переработки всего сайта" },
      ],
    },
    {
      id: "scale",
      q: "Сколько разделов планируется?",
      hint: "Выберите вариант — следующий шаг откроется автоматически",
      type: "single",
      cols: 3,
      opts: [
        { v: "sm", label: "5–10 страниц", sub: "Сайт-визитка", pain: "Чёткое позиционирование и быстрый выход на рынок" },
        { v: "md", label: "15–20 страниц", sub: "Корпоративный сайт", pain: "Полное раскрытие услуг и охват SEO-запросов" },
        { v: "lg", label: "25–30+ страниц", sub: "С каталогом или блогом", pain: "Широкое семантическое ядро — максимальный органический трафик" },
      ],
    },
    {
      id: "design",
      q: "Уровень дизайна?",
      hint: "Выберите вариант — следующий шаг откроется автоматически",
      type: "single",
      cols: 3,
      opts: [
        { v: "basic", label: "Базовый", sub: "Готовый шаблон", pain: "Быстрый старт. Подходит, если бренд пока в стадии формирования" },
        { v: "unique", label: "Уникальный", sub: "Разработка под бренд", pain: "Конверсия на уникальных сайтах выше до 40% против шаблонов" },
        { v: "premium", label: "Премиальный", sub: "Анимации, WOW", pain: "Запоминающийся эффект — обязателен в премиум-сегменте" },
      ],
    },
    {
      id: "integ",
      q: "Что нужно подключить?",
      hint: "Можно выбрать несколько вариантов",
      type: "multi",
      cols: 2,
      opts: [
        { v: "crm", label: "CRM", sub: "AmoCRM, Bitrix24", pain: "Все заявки в систему — ни один лид не потеряется" },
        { v: "1c", label: "1С / ERP", sub: "Синхронизация данных", pain: "Данные в реальном времени без ручного труда" },
        { v: "pay", label: "Онлайн-оплата", sub: "ЮKassa, эквайринг", pain: "Сокращает цикл сделки — клиент платит сразу" },
        { v: "none", label: "Ничего пока", sub: "Не нужно", pain: "Архитектура позволит добавить интеграции позже" },
      ],
    },
    {
      id: "seo_support",
      q: "Что нужно после запуска?",
      hint: "Выберите оба параметра, чтобы продолжить",
      type: "toggle",
      groups: [
        {
          id: "seo",
          label: "SEO-подготовка при разработке",
          opts: [
            { v: "yes", label: "Да, нужна", pain: "Семантика, структура, мета-теги — готово к продвижению с первого дня" },
            { v: "no", label: "Пока нет", pain: "Без базы — 2–4 месяца отставания и лишние затраты на старте" },
          ],
        },
        {
          id: "support",
          label: "Техническая поддержка сайта",
          opts: [
            { v: "yes", label: "Да, нужна", pain: "Мониторинг, обновления, контентные правки и развитие сайта" },
            { v: "no", label: "Пока нет", pain: "60% сайтов теряют в скорости и безопасности через 6 месяцев без поддержки" },
          ],
        },
      ],
    },
  ];

  const TARIFFS = {
    basic: {
      timeline: "от 1–1,5 мес",
      worksIncluded: [
        "Базовое SEO",
        "Разработка общих требований к проекту",
        "Разработка полной структуры сайта",
        "Проектирование в HTML с использованием ИИ",
        "Написание текстов с использованием ИИ",
        "Использование шаблона",
        "Дизайн сайта с использованием ИИ",
        "Разработка с использованием ИИ",
        "Интеграции с CRM",
        "Тестирование",
        "Перенос на сервер клиента",
      ],
    },
    unique: {
      timeline: "от 2,5 мес",
      worksIncluded: [
        "Базовое SEO",
        "Разработка общих требований к проекту",
        "Разработка полной структуры сайта",
        "UX прототипирование в Figma",
        "Написание текстов под каждую страницу сайта",
        "Дизайн сайта с использованием ИИ",
        "Интеграция управления в CMS",
        "Разработка с использованием ИИ",
        "Интеграции с CRM",
        "Тестирование",
        "Перенос на сервер клиента",
      ],
    },
    premium: {
      timeline: "от 3,5 мес",
      worksIncluded: [
        "Углубленное исследование конкурентов, рынка, поиск лучших практик",
        "Выделение портретов целевой аудитории бизнеса",
        "SEO проектирование сайта",
        "Разработка подробного ТЗ на разработку сайта, соответствует требованиям ГОСТ",
        "Разработка полной структуры сайта",
        "UX прототипирование в Figma",
        "Написание текстов под каждую страницу сайта",
        "Дизайн макеты с адаптивами в Figma",
        "Верстка и бэкенд разработка",
        "Интеграция управления в CMS",
        "Интеграции с CRM",
        "Тестирование",
        "Перенос на сервер клиента",
      ],
    },
  };

  const PRICE_RULES = {
    basic: {
      sm: { base: 400000, includeIntegrations: false, includeSeo: false },
      md: { base: 500000, includeIntegrations: true, includeSeo: false },
      lg: { base: 650000, includeIntegrations: true, includeSeo: true },
    },
    unique: {
      sm: { base: 520000, includeIntegrations: false, includeSeo: false },
      md: { base: 600000, includeIntegrations: true, includeSeo: false },
      lg: { base: 800000, includeIntegrations: true, includeSeo: true },
    },
    premium: {
      sm: { base: 900000, includeIntegrations: false, includeSeo: false },
      md: { base: 1150000, includeIntegrations: false, includeSeo: false },
      lg: { base: 1400000, includeIntegrations: true, includeSeo: true },
    },
  };

  const INTEGRATION_PRICES = { crm: 65000, "1c": 95000, pay: 45000 };
  const SEO_PRICE = 85000;
  const SUPPORT_PRICE = 35000;

  const CTA_LABELS = {
    audit: "Запрос: Аудит текущего сайта",
    consultation: "Запрос: Консультация по проекту",
  };

  let step = 0;
  let ans = { start: null, scale: null, design: null, integ: [], seo: null, support: null };
  let activeCtaType = null;
  let calcPayloadCache = null;

  function rub(n) {
    return n.toLocaleString("ru-RU") + "\u00a0₽";
  }

  function buildCommentMask(payload) {
    if (!payload) return "";
    const extraParts = [];
    if (payload.integrations?.length) extraParts.push("CRM/1С/Оплата");
    if (payload.seoLabel === "Да") extraParts.push("SEO-подготовка");
    if (payload.supportLabel === "Да") extraParts.push("Техподдержка");

    const lines = [COMMENT_MARKER];
    if (payload.ctaType && CTA_LABELS[payload.ctaType]) {
      lines.push(CTA_LABELS[payload.ctaType]);
    }
    lines.push(
      "Тип работ: " + (payload.startLabel || ""),
      "Масштаб: " + (payload.scaleLabel || ""),
      "Тариф: " + (payload.designLabel || ""),
      "Стоимость от: " + (payload.totalLabel || ""),
      "Срок: " + (payload.timeline || ""),
      "Доп. услуги: " + (extraParts.length ? extraParts.join(", ") : "не выбраны"),
      "SEO: " + (payload.seoLabel || ""),
      "Техподдержка: " + (payload.supportLabel || ""),
      "Состав работ: " + (payload.worksIncluded || []).join("; "),
    );
    return lines.join("\n");
  }

  window.SerenitySiteCalc = { buildCommentMask, COMMENT_MARKER };

  function calcPrice() {
    const design = ans.design || "basic";
    const scale = ans.scale || "sm";
    const rule = (PRICE_RULES[design] && PRICE_RULES[design][scale]) || PRICE_RULES.basic.sm;
    const tariff = TARIFFS[design] || TARIFFS.basic;

    const selectedIntegrations = (ans.integ || []).filter((v) => v !== "none");
    const integrationsUi = selectedIntegrations.reduce((s, v) => s + (INTEGRATION_PRICES[v] || 0), 0);
    const seoSelected = ans.seo === "yes";
    const seoUi = seoSelected ? SEO_PRICE : 0;

    const integrationsToTotal = rule.includeIntegrations ? 0 : integrationsUi;
    const seoToTotal = seoSelected && !rule.includeSeo ? SEO_PRICE : 0;
    const total = rule.base + integrationsToTotal + seoToTotal;
    const supAmt = ans.support === "yes" ? SUPPORT_PRICE : 0;

    return {
      total,
      supAmt,
      tariff,
      seoUi,
      integrationsUi,
      includeSeo: rule.includeSeo,
      includeIntegrations: rule.includeIntegrations,
    };
  }

  function updateProgress(idx) {
    const total = STEPS.length;
    const pct = ((idx + 1) / (total + 1)) * 100;
    const pbar = document.getElementById(PBAR_ID);
    const plabel = document.getElementById(PLABEL_ID);
    if (pbar) pbar.style.width = pct + "%";
    if (plabel) plabel.textContent = idx < total ? "Шаг " + (idx + 1) + " из " + total : "Готово";
  }

  function transit(renderFn, first = false) {
    const el = document.getElementById(CONTENT_ID);
    if (!el) return;
    if (first) {
      renderFn();
      return;
    }
    el.style.transition = "opacity .2s ease, transform .2s ease";
    el.style.opacity = "0";
    el.style.transform = "translateX(14px)";
    setTimeout(() => {
      renderFn();
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          el.style.transition = "opacity .32s ease, transform .32s ease";
          el.style.opacity = "1";
          el.style.transform = "translateX(0)";
        }),
      );
    }, 215);
  }

  function buildStepActions(nextLabel, nextDisabled) {
    const backBtn = step > 0 ? '<button type="button" class="sa-site-calc__btn-back" id="korporativnyj-calc-back">← Назад</button>' : "";
    const nextBtn =
      '<button type="button" class="sa-site-calc__btn-next" id="korporativnyj-calc-next" ' +
      (nextDisabled ? "disabled" : "") +
      ">" +
      nextLabel +
      "</button>";
    return '<div class="sa-site-calc__step-actions">' + backBtn + nextBtn + "</div>";
  }

  function buildCards(s) {
    const optsHTML = s.opts
      .map((o, i) => {
        const sel = s.type === "multi" ? ans.integ.includes(o.v) : ans[s.id] === o.v;
        return (
          '<div class="sa-site-calc__opt' +
          (sel ? " is-selected" : "") +
          '" data-sid="' +
          s.id +
          '" data-val="' +
          o.v +
          '" data-type="' +
          s.type +
          '" style="animation:saSiteCalcFadeUp .35s ' +
          (i * 0.07 + 0.04) +
          's both">' +
          '<div class="sa-site-calc__opt-check" aria-hidden="true">✓</div>' +
          '<div class="sa-site-calc__opt-label">' +
          o.label +
          "</div>" +
          (o.sub ? '<div class="sa-site-calc__opt-sub">' + o.sub + "</div>" : "") +
          '<div class="sa-site-calc__opt-pain">' +
          o.pain +
          "</div>" +
          "</div>"
        );
      })
      .join("");

    const actionsHTML =
      s.type === "multi"
        ? buildStepActions("Продолжить →", ans.integ.length === 0)
        : step > 0
          ? '<div class="sa-site-calc__step-actions"><button type="button" class="sa-site-calc__btn-back" id="korporativnyj-calc-back">← Назад</button></div>'
          : "";

    return (
      '<div class="sa-site-calc__step-num">Шаг <em>' +
      (step + 1) +
      "</em> из " +
      STEPS.length +
      "</div>" +
      '<h3 class="sa-site-calc__step-q">' +
      s.q +
      "</h3>" +
      '<p class="sa-site-calc__step-hint">' +
      s.hint +
      "</p>" +
      '<div class="sa-site-calc__options sa-site-calc__options--cols-' +
      s.cols +
      '">' +
      optsHTML +
      "</div>" +
      actionsHTML
    );
  }

  function buildToggle(s) {
    const groupsHTML = s.groups
      .map((g) => {
        const hasAns = ans[g.id] !== null;
        const optsHTML = g.opts
          .map((o) => {
            const sel = ans[g.id] === o.v;
            return (
              '<div class="sa-site-calc__topt' +
              (sel ? " is-selected" : "") +
              '" data-gid="' +
              g.id +
              '" data-val="' +
              o.v +
              '">' +
              '<div class="sa-site-calc__topt-label">' +
              o.label +
              "</div>" +
              '<div class="sa-site-calc__topt-pain">' +
              o.pain +
              "</div>" +
              "</div>"
            );
          })
          .join("");
        return (
          '<div class="sa-site-calc__tgroup' +
          (hasAns ? " is-answered" : "") +
          '">' +
          '<div class="sa-site-calc__tgroup-label">' +
          g.label +
          "</div>" +
          '<div class="sa-site-calc__tgroup-opts">' +
          optsHTML +
          "</div>" +
          "</div>"
        );
      })
      .join("");

    const canGo = ans.seo !== null && ans.support !== null;

    return (
      '<div class="sa-site-calc__step-num">Шаг <em>' +
      (step + 1) +
      "</em> из " +
      STEPS.length +
      "</div>" +
      '<h3 class="sa-site-calc__step-q">' +
      s.q +
      "</h3>" +
      '<p class="sa-site-calc__step-hint">' +
      s.hint +
      "</p>" +
      '<div class="sa-site-calc__toggle-groups" style="animation:saSiteCalcFadeUp .35s .04s both">' +
      groupsHTML +
      "</div>" +
      buildStepActions("Рассчитать стоимость →", !canGo)
    );
  }

  function attachHandlers(s) {
    document.getElementById("korporativnyj-calc-back")?.addEventListener("click", () => goTo(step - 1));

    document.querySelectorAll(".sa-site-calc__opt").forEach((el) => {
      el.addEventListener("click", () => {
        const val = el.dataset.val;
        const type = el.dataset.type;
        const sid = el.dataset.sid;

        if (type === "single") {
          ans[sid] = val;
          goTo(step + 1);
        } else {
          if (val === "none") {
            ans.integ = ans.integ[0] === "none" ? [] : ["none"];
          } else {
            const noneIdx = ans.integ.indexOf("none");
            if (noneIdx !== -1) ans.integ.splice(noneIdx, 1);
            const idx = ans.integ.indexOf(val);
            if (idx === -1) ans.integ.push(val);
            else ans.integ.splice(idx, 1);
          }
          document.querySelectorAll(".sa-site-calc__opt").forEach((o) => {
            o.classList.toggle("is-selected", ans.integ.includes(o.dataset.val));
          });
          const btn = document.getElementById("korporativnyj-calc-next");
          if (btn) btn.disabled = ans.integ.length === 0;
        }
      });
    });

    document.querySelectorAll(".sa-site-calc__topt").forEach((el) => {
      el.addEventListener("click", () => {
        const gid = el.dataset.gid;
        const val = el.dataset.val;
        ans[gid] = val;

        document.querySelectorAll('[data-gid="' + gid + '"]').forEach((o) => {
          o.classList.toggle("is-selected", o.dataset.val === val);
        });

        document.querySelectorAll(".sa-site-calc__tgroup").forEach((g, i) => {
          const gid2 = s.groups[i] && s.groups[i].id;
          if (gid2) g.classList.toggle("is-answered", ans[gid2] !== null);
        });

        const btn = document.getElementById("korporativnyj-calc-next");
        if (btn) btn.disabled = !(ans.seo !== null && ans.support !== null);
      });
    });

    document.getElementById("korporativnyj-calc-next")?.addEventListener("click", (e) => {
      const btn = e.currentTarget;
      if (!btn.disabled) goTo(step + 1);
    });
  }

  function renderStep(s, first) {
    transit(() => {
      const el = document.getElementById(CONTENT_ID);
      if (!el) return;
      el.innerHTML = s.type === "toggle" ? buildToggle(s) : buildCards(s);
      attachHandlers(s);
    }, first);
  }

  function goTo(idx) {
    if (idx >= STEPS.length) return showResults();
    step = Math.max(0, idx);
    updateProgress(step);
    renderStep(STEPS[step], false);
  }

  function buildPayload(total, tariff) {
    const startMap = { new: "Новый сайт", redesign: "Редизайн", func: "Доработка функционала" };
    const scaleMap = { sm: "5–10 стр.", md: "15–20 стр.", lg: "25–30+ стр." };
    const designMap = { basic: "Базовый", unique: "Уникальный", premium: "Премиальный" };

    return {
      ctaType: activeCtaType || "",
      startLabel: startMap[ans.start] || "",
      scaleLabel: scaleMap[ans.scale] || "",
      designLabel: designMap[ans.design] || "",
      integrations: (ans.integ || []).filter((v) => v !== "none"),
      seoLabel: ans.seo === "yes" ? "Да" : "Нет",
      supportLabel: ans.support === "yes" ? "Да" : "Нет",
      totalLabel: rub(total),
      timeline: tariff.timeline,
      worksIncluded: tariff.worksIncluded,
    };
  }

  function scrollToInlineLeadForm() {
    const root = document.getElementById(INLINE_LEAD_ROOT_ID);
    if (!root) return;
    root.scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(() => {
      root.querySelector('input[name="name"]')?.focus({ preventScroll: true });
    }, 450);
  }

  function showResults() {
    updateProgress(STEPS.length);
    const { total, supAmt, tariff, seoUi, integrationsUi, includeSeo, includeIntegrations } = calcPrice();

    const startMap = { new: "Новый сайт", redesign: "Редизайн", func: "Доработка функционала" };
    const scaleMap = { sm: "5–10 стр.", md: "15–20 стр.", lg: "25–30+ стр." };
    const designMap = { basic: "базовый дизайн", unique: "уникальный дизайн", premium: "премиальный дизайн" };
    const params = [startMap[ans.start], scaleMap[ans.scale], designMap[ans.design]]
      .filter(Boolean)
      .map((p) => "<strong>" + p + "</strong>")
      .join(" · ");

    const worksHTML = tariff.worksIncluded.map((w) => "<li>" + w + "</li>").join("");

    const extraRows = [];
    if (ans.seo === "yes") {
      extraRows.push(
        '<div class="sa-site-calc__brow"><span class="sa-site-calc__brow-label">SEO-подготовка</span><span class="sa-site-calc__brow-val">+ ' +
          rub(seoUi) +
          (includeSeo ? " (включено)" : "") +
          "</span></div>",
      );
    }
    if (integrationsUi > 0) {
      extraRows.push(
        '<div class="sa-site-calc__brow"><span class="sa-site-calc__brow-label">Доп. интеграции</span><span class="sa-site-calc__brow-val">+ ' +
          rub(integrationsUi) +
          (includeIntegrations ? " (включено)" : "") +
          "</span></div>",
      );
    }

    calcPayloadCache = buildPayload(total, tariff);
    window.SerenityCalcPayload = calcPayloadCache;

    transit(() => {
      const el = document.getElementById(CONTENT_ID);
      if (!el) return;
      el.innerHTML =
        '<div class="sa-site-calc__result-badge" style="animation:saSiteCalcFadeUp .4s .05s both">Расчёт готов</div>' +
        '<div class="sa-site-calc__result-params" style="animation:saSiteCalcFadeUp .4s .1s both">' +
        params +
        "</div>" +
        '<div class="sa-site-calc__included-works" style="animation:saSiteCalcFadeUp .4s .15s both">' +
        '<div class="sa-site-calc__included-works-title">Что входит в тариф</div>' +
        '<ul class="sa-site-calc__included-works-list">' +
        worksHTML +
        "</ul></div>" +
        (extraRows.length
          ? '<div class="sa-site-calc__breakdown" style="animation:saSiteCalcFadeUp .4s .18s both"><div class="sa-site-calc__breakdown-head">Дополнительные услуги</div>' +
            extraRows.join("") +
            "</div>"
          : "") +
        '<div class="sa-site-calc__total-row" style="animation:saSiteCalcFadeUp .4s .2s both">' +
        '<div><div class="sa-site-calc__total-lbl">Итого от</div><p class="sa-site-calc__step-hint sa-site-calc__timeline-hint">Срок реализации: <strong>' +
        tariff.timeline +
        "</strong></p></div>" +
        '<div class="sa-site-calc__total-num" id="korporativnyj-calc-tcnt">0&nbsp;₽</div>' +
        "</div>" +
        (supAmt
          ? '<div style="animation:saSiteCalcFadeUp .4s .22s both"><div class="sa-site-calc__support-chip">+ поддержка и развитие:&nbsp;<strong>от ' +
            rub(supAmt) +
            " / мес</strong></div></div>"
          : "") +
        '<p class="sa-site-calc__result-note" style="animation:saSiteCalcFadeUp .4s .25s both">Это ориентир. Реальная стоимость может отличаться и быть ниже или выше — цена может быть оптимизирована за счёт правильного выбора CMS и поэтапного запуска. Детали разберём на бесплатной консультации.</p>' +
        '<div class="sa-site-calc__cta-grid" style="animation:saSiteCalcFadeUp .4s .3s both">' +
        '<button type="button" class="sa-site-calc__cta-card sa-site-calc__cta-card--primary" data-cta="audit"><div class="sa-site-calc__cta-free">Бесплатно</div><div class="sa-site-calc__cta-title">Аудит текущего сайта</div><div class="sa-site-calc__cta-desc">Разберём, что реально нужно менять, а что уже работает</div></button>' +
        '<button type="button" class="sa-site-calc__cta-card sa-site-calc__cta-card--outline" data-cta="consultation"><div class="sa-site-calc__cta-free">Бесплатно</div><div class="sa-site-calc__cta-title">Консультация по проекту</div><div class="sa-site-calc__cta-desc">Подберём оптимальное решение по срокам и бюджету</div></button>' +
        "</div>" +
        '<button type="button" class="sa-site-calc__reset-btn" id="korporativnyj-calc-reset">← Рассчитать заново</button>';

      document.querySelectorAll("[data-cta]").forEach((btn) => {
        btn.addEventListener("click", () => {
          activeCtaType = btn.getAttribute("data-cta");
          calcPayloadCache = { ...calcPayloadCache, ctaType: activeCtaType };
          window.SerenityCalcPayload = calcPayloadCache;
          scrollToInlineLeadForm();
        });
      });

      document.getElementById("korporativnyj-calc-reset")?.addEventListener("click", resetCalc);

      setTimeout(() => animCounter(document.getElementById("korporativnyj-calc-tcnt"), total), 250);
    }, false);
  }

  function animCounter(el, target) {
    if (!el) return;
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

  function resetCalc() {
    step = 0;
    ans = { start: null, scale: null, design: null, integ: [], seo: null, support: null };
    calcPayloadCache = null;
    activeCtaType = null;
    window.SerenityCalcPayload = null;
    updateProgress(0);
    renderStep(STEPS[0], false);
  }

  function mountShell(root) {
    root.innerHTML =
      '<div class="sa-site-calc__card">' +
      '<div class="sa-site-calc__head">' +
      '<div class="sa-site-calc__tag">Калькулятор</div>' +
      '<h2 class="sa-site-calc__title kontekstnaya-page__section-heading">Сколько стоит<br>корпоративный сайт?</h2>' +
      '<p class="sa-site-calc__sub">Ориентировочный расчёт за 2 минуты</p>' +
      '<div class="sa-site-calc__progress-wrap">' +
      '<div class="sa-site-calc__progress-track"><div class="sa-site-calc__progress-fill" id="' +
      PBAR_ID +
      '"></div></div>' +
      '<div class="sa-site-calc__progress-label" id="' +
      PLABEL_ID +
      '">Шаг 1 из 5</div>' +
      "</div></div>" +
      '<div id="' +
      CONTENT_ID +
      '" class="sa-site-calc__content"></div>' +
      "</div>";
  }

  function init() {
    const root = document.getElementById(ROOT_ID);
    if (!root || root.dataset.saSiteCalcInit === "1") return;
    root.dataset.saSiteCalcInit = "1";
    mountShell(root);
    updateProgress(0);
    renderStep(STEPS[0], true);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

#!/usr/bin/env node
/**
 * Калькулятор интернет-магазина: логика из sources/calculator_internet_magazin.html,
 * визуал — как korporativnyj-site-calc (sa-site-calc__* + korporativnyj-site-calc.css).
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const srcPath =
  process.argv[2] || path.join(root, "sources/calculator_internet_magazin.html");
const html = fs.readFileSync(srcPath, "utf8");

const scriptM = html.match(/<script>([\s\S]*?)<\/script>/);
if (!scriptM) {
  console.error("build-internet-magazina-site-calc: не найден script");
  process.exit(1);
}

const CALC_BACK_ID = "internet-magazina-calc-back";
const CALC_NEXT_ID = "internet-magazina-calc-next";
const CALC_TCNT_ID = "internet-magazina-calc-tcnt";

function transformCalcJs(body) {
  let js = body;
  js = js.replace(/document\.getElementById\('pbar'\)/g, "document.getElementById(PBAR_ID)");
  js = js.replace(/document\.getElementById\('plabel'\)/g, "document.getElementById(PLABEL_ID)");
  js = js.replace(
    /document\.getElementById\('calc-content'\)/g,
    "document.getElementById(CONTENT_ID)",
  );
  js = js.replace(/\bbindPopupFormAugment\(\);\s*/g, "");
  js = js.replace(
    '<button class="reset-btn" onclick="reset()">',
    '<button type="button" class="sa-site-calc__reset-btn" id="internet-magazina-calc-reset">',
  );
  js = js.replace(/\bupdateProgress\(0\);\s*renderStep\(ALL_STEPS\.start, true\);\s*$/, "");
  js = js.replace(/getElementById\('tcnt'\)/g, `getElementById("${CALC_TCNT_ID}")`);
  js = js.replace(/getElementById\('btn-back'\)/g, `getElementById("${CALC_BACK_ID}")`);
  js = js.replace(/getElementById\('btn-next'\)/g, `getElementById("${CALC_NEXT_ID}")`);
  js = js.replace(/id="btn-back"/g, `id="${CALC_BACK_ID}"`);
  js = js.replace(/id="btn-next"/g, `id="${CALC_NEXT_ID}"`);
  js = js.replace(/id="tcnt"/g, `id="${CALC_TCNT_ID}"`);

  const pairs = [
    ['class="btn-back"', 'class="sa-site-calc__btn-back"'],
    ['class="btn-next"', 'class="sa-site-calc__btn-next"'],
    ['class="step-actions"', 'class="sa-site-calc__step-actions"'],
    ['class="step-num"', 'class="sa-site-calc__step-num"'],
    ["'<div class=\"step-q\">' + s.q + '</div>'", "'<h3 class=\"sa-site-calc__step-q\">' + s.q + '</h3>'"],
    ["'<div class=\"step-hint\">' + getDisplayHint(s) + '</div>'", "'<p class=\"sa-site-calc__step-hint\">' + getDisplayHint(s) + '</p>'"],
    ["'<div class=\"step-hint\">' + s.hint + '</div>'", "'<p class=\"sa-site-calc__step-hint\">' + s.hint + '</p>'"],
    ["'<div class=\"options cols-' + s.cols + '\">'", "'<div class=\"sa-site-calc__options sa-site-calc__options--cols-' + s.cols + '\">'"],
    ["(sel ? ' sel' : '')", "(sel ? ' is-selected' : '')"],
    ["(hasAns ? ' answered' : '')", "(hasAns ? ' is-answered' : '')"],
    ["'<div class=\"opt'", "'<div class=\"sa-site-calc__opt'"],
    ["'<div class=\"topt'", "'<div class=\"sa-site-calc__topt'"],
    ["'<div class=\"tgroup'", "'<div class=\"sa-site-calc__tgroup'"],
    ['class="opt-check"', 'class="sa-site-calc__opt-check"'],
    ['class="opt-label"', 'class="sa-site-calc__opt-label"'],
    ['class="opt-sub"', 'class="sa-site-calc__opt-sub"'],
    ['class="opt-pain"', 'class="sa-site-calc__opt-pain"'],
    ['class="opt-price-row"', 'class="sa-site-calc__opt-price-row"'],
    ['class="topt-label"', 'class="sa-site-calc__topt-label"'],
    ['class="topt-pain"', 'class="sa-site-calc__topt-pain"'],
    ['class="topt-price-row"', 'class="sa-site-calc__topt-price-row"'],
    ['class="tgroup-label"', 'class="sa-site-calc__tgroup-label"'],
    ['class="tgroup-opts"', 'class="sa-site-calc__tgroup-opts"'],
    ['class="price-tag ', 'class="sa-site-calc__price-tag '],
    ['class="toggle-groups"', 'class="sa-site-calc__toggle-groups"'],
    ['class="result-badge"', 'class="sa-site-calc__result-badge"'],
    ['class="result-params"', 'class="sa-site-calc__result-params"'],
    ['class="included-works-title"', 'class="sa-site-calc__included-works-title"'],
    ['class="included-works-list"', 'class="sa-site-calc__included-works-list"'],
    ['<div class="included-works"', '<div class="sa-site-calc__included-works"'],
    ['class="breakdown-head"', 'class="sa-site-calc__breakdown-head"'],
    ['<div class="breakdown"', '<div class="sa-site-calc__breakdown"'],
    ['class="brow-label"', 'class="sa-site-calc__brow-label"'],
    ['class="brow-val saving"', 'class="sa-site-calc__brow-val saving"'],
    ['class="brow-val"', 'class="sa-site-calc__brow-val"'],
    ['<div class="brow"', '<div class="sa-site-calc__brow"'],
    ['class="total-lbl"', 'class="sa-site-calc__total-lbl"'],
    ['class="total-num"', 'class="sa-site-calc__total-num"'],
    ['class="total-row"', 'class="sa-site-calc__total-row"'],
    ['class="support-chip"', 'class="sa-site-calc__support-chip"'],
    ['class="result-note"', 'class="sa-site-calc__result-note"'],
    ['class="cta-grid"', 'class="sa-site-calc__cta-grid"'],
    ['class="cta-free"', 'class="sa-site-calc__cta-free"'],
    ['class="cta-title"', 'class="sa-site-calc__cta-title"'],
    ['class="cta-desc"', 'class="sa-site-calc__cta-desc"'],
    ["classList.toggle('sel'", "classList.toggle('is-selected'"],
    ["classList.toggle('answered'", "classList.toggle('is-answered'"],
    ["querySelectorAll('.opt[data-sid=\"integ\"]')", "querySelectorAll('.sa-site-calc__opt[data-sid=\"integ\"]')"],
    ["querySelectorAll('.opt[data-sid=\"mods\"]')", "querySelectorAll('.sa-site-calc__opt[data-sid=\"mods\"]')"],
    ["querySelectorAll('.opt')", "querySelectorAll('.sa-site-calc__opt')"],
    ["querySelectorAll('.topt')", "querySelectorAll('.sa-site-calc__topt')"],
    ["querySelectorAll('.tgroup')", "querySelectorAll('.sa-site-calc__tgroup')"],
    ["querySelector('.price-tag')", "querySelector('.sa-site-calc__price-tag')"],
    ["animation:fadeUp", "animation:saSiteCalcFadeUp"],
    [
      'class="step-hint" style="margin:6px 0 0;color:var(--text-soft)"',
      'class="sa-site-calc__step-hint sa-site-calc__timeline-hint"',
    ],
    [
      "'<button class=\"cta-card gold\"",
      "'<button type=\"button\" class=\"sa-site-calc__cta-card sa-site-calc__cta-card--primary\"",
    ],
    [
      "'<button class=\"cta-card outline\"",
      "'<button type=\"button\" class=\"sa-site-calc__cta-card sa-site-calc__cta-card--outline\"",
    ],
  ];

  for (const [from, to] of pairs) {
    js = js.split(from).join(to);
  }

  js = js.replace(
    /bindCtaHandlers\(\);\s*setTimeout\(\(\) => animCounter/g,
    "bindCtaHandlers();\n      bindResetHandler();\n      setTimeout(() => animCounter",
  );

  js = js.replace(
    /function openSitePopup\(\) \{[\s\S]*?\n  function animCounter/,
    "function animCounter",
  );

  return js;
}

let body = transformCalcJs(scriptM[1]);

const js = `/**
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

${body
  .split("\n")
  .map((line) => (line ? "  " + line : line))
  .join("\n")}

  function bindResetHandler() {
    document.getElementById("internet-magazina-calc-reset")?.addEventListener("click", reset);
  }

  function boot() {
    updateProgress(0);
    renderStep(ALL_STEPS.start, true);
    document.getElementById("internet-magazina-calc-reset")?.addEventListener("click", reset);
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
`;

const css = `/**
 * Калькулятор интернет-магазина — визуал как korporativnyj-site-calc + отступы страницы.
 * Генерация: node scripts/build-internet-magazina-site-calc.cjs
 */
@import url("korporativnyj-site-calc.css");

.sa-site-calc-section.internet-magazina-site-calc-section {
  position: relative;
  z-index: 2;
}

.page-constructor.internet-magazina-page
  > .page-constructor__section.internet-magazina-packages-dies
  + .page-constructor__section.internet-magazina-site-calc-section
  .sa-site-calc-section__container {
  padding-top: var(--home-between, 112px);
}

.page-constructor.internet-magazina-page
  > .page-constructor__section.internet-magazina-site-calc-section
  + .page-constructor__section.internet-magazina-lead-section {
  margin-top: 0 !important;
}

.page-constructor.internet-magazina-page
  > .page-constructor__section.internet-magazina-site-calc-section:has(+ .page-constructor__section.internet-magazina-lead-section)
  .sa-site-calc-section__container {
  padding-bottom: var(--home-between, 112px) !important;
}

@media screen and (max-width: 800px) {
  .page-constructor.internet-magazina-page
    > .page-constructor__section.internet-magazina-packages-dies
    + .page-constructor__section.internet-magazina-site-calc-section
    .sa-site-calc-section__container {
    padding-top: var(--home-between, 97px);
  }

  .page-constructor.internet-magazina-page
    > .page-constructor__section.internet-magazina-site-calc-section:has(+ .page-constructor__section.internet-magazina-lead-section)
    .sa-site-calc-section__container {
    padding-bottom: var(--home-between, 97px) !important;
  }
}

@media screen and (max-width: 425px) {
  .page-constructor.internet-magazina-page
    > .page-constructor__section.internet-magazina-packages-dies
    + .page-constructor__section.internet-magazina-site-calc-section
    .sa-site-calc-section__container {
    padding-top: var(--home-between, 60px);
  }

  .page-constructor.internet-magazina-page
    > .page-constructor__section.internet-magazina-site-calc-section:has(+ .page-constructor__section.internet-magazina-lead-section)
    .sa-site-calc-section__container {
    padding-bottom: var(--home-between, 60px) !important;
  }
}

#internet-magazina-site-calc-root.sa-site-calc {
  width: 100%;
  box-sizing: border-box;
}

#internet-magazina-site-calc-root .sa-site-calc__opt-price-row,
#internet-magazina-site-calc-root .sa-site-calc__topt-price-row {
  margin-top: 8px;
}

#internet-magazina-site-calc-root .sa-site-calc__price-tag {
  display: inline-block;
  font-size: 11px;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 6px;
  line-height: 1.3;
}

#internet-magazina-site-calc-root .sa-site-calc__price-tag.included {
  color: #6ee7a0;
  background: rgba(110, 231, 160, 0.1);
  border: 1px solid rgba(110, 231, 160, 0.25);
}

#internet-magazina-site-calc-root .sa-site-calc__price-tag.extra {
  color: rgba(255, 255, 255, 0.75);
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
}

#internet-magazina-site-calc-root .sa-site-calc__price-tag.saving {
  color: #6ee7a0;
  background: rgba(110, 231, 160, 0.08);
  border: 1px solid rgba(110, 231, 160, 0.2);
}

#internet-magazina-site-calc-root .sa-site-calc__price-tag.info {
  color: rgba(255, 255, 255, 0.65);
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

#internet-magazina-site-calc-root .sa-site-calc__brow-val.saving {
  color: #6ee7a0;
}
`;

fs.writeFileSync(path.join(root, "css/sections/internet-magazina-site-calc.css"), css);
fs.writeFileSync(path.join(root, "js/internet-magazina-site-calc.js"), js);
console.log("build-internet-magazina-site-calc: ok");

#!/usr/bin/env node
/**
 * Неразрывные пробелы после коротких предлогов/союзов (типографика «висячих» слов).
 * Содержимое `<head>...</head>` не трогаем: в `<title>` и мета-тегах не должно быть NBSP.
 * Перед прогоном в `<head>` нормализуются `&nbsp;` / `&#160;` / `&#xa0;` в обычные пробелы (наследие старых сборок).
 * Если на открывающем теге <html> уже есть data-typography-nbsp="1", полный прогон пропускается
 * (см. `--force`, чтобы пересчитать весь документ).
 *
 * Запуск после сборки: npm run build:html && npm run typography:nbsp
 * Внимание: npm run test:html-assemble пересобирает index.html и снимает маркер — после проверки снова typography:nbsp.
 * Путь: node scripts/typography-nbsp.cjs path/to/file.html
 * Принудительно: node scripts/typography-nbsp.cjs --force path/to/file.html
 */
const fs = require("fs");
const path = require("path");

const MARKER_ATTR = "data-typography-nbsp";
const MARKER_VALUE = "1";

/** Длина по убыванию — чтобы «над» не резалось как «на» + «д». */
const RU_SHORT_WORDS = [
  "без",
  "внутри",
  "вне",
  "для",
  "ещё",
  "еще",
  "или",
  "лишь",
  "меж",
  "над",
  "обо",
  "под",
  "пред",
  "при",
  "про",
  "через",
  "чрез",
  "чтоб",
  "из",
  "от",
  "со",
  "во",
  "ко",
  "об",
  "до",
  "за",
  "на",
  "по",
  "как",
  "что",
  "вот",
  "это",
  "все",
  "всё",
  "том",
  "тем",
  "тут",
  "уже",
  "в",
  "к",
  "о",
  "у",
  "с",
  "а",
  "и",
  "я",
  "да",
  "но",
  "же",
  "ли",
  "бы",
  "ни",
];

function uniqueSortedByLength(words) {
  const seen = new Set();
  const out = [];
  for (const w of words) {
    const k = w.toLowerCase();
    if (!w || seen.has(k)) continue;
    seen.add(k);
    out.push(w);
  }
  out.sort((a, b) => b.length - a.length || a.localeCompare(b));
  return out;
}

const WORDS = uniqueSortedByLength(RU_SHORT_WORDS.filter(Boolean));

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const WORD_ALT = WORDS.map(escapeRe).join("|");

/**
 * После предлога/союза — неразрывный пробел перед следующим «словом».
 * Слева только разделитель (пробел, скобка, кавычка, тире…), иначе ловятся окончания («агентство Serenity»).
 */
const SHORT_WORD_SPACE_RE = new RegExp(
  `(?:^|(?<=[\\s>\\u00A0()\\[\\]{}«„‚"';:,\\-\\u2013\\u2014]))(${WORD_ALT})(\\s+)(?=[а-яёА-ЯЁa-zA-Z0-9«""„‚])`,
  "giu"
);

function hasTypographyMarker(html) {
  const m = html.match(/<html[^>]*>/i);
  return Boolean(m && new RegExp(`${MARKER_ATTR}\\s*=\\s*["']?${MARKER_VALUE}["']?`, "i").test(m[0]));
}

function addTypographyMarker(html) {
  return html.replace(/<html([^>]*)>/i, (full, attrs) => {
    if (new RegExp(MARKER_ATTR, "i").test(full)) return full;
    const insert = ` ${MARKER_ATTR}="${MARKER_VALUE}"`;
    return `<html${attrs}${insert}>`;
  });
}

function stashProtectedRegions(html) {
  const stash = [];
  let idx = 0;
  const token = () => `\uE000TYPOSHIELD${idx++}\uE000`;

  const hide = (re) => {
    html = html.replace(re, (block) => {
      const t = token();
      stash.push({ t, block });
      return t;
    });
  };

  // Целиком head: title, meta, JSON-LD внутри <script> — без NBSP-типографики между тегами.
  hide(/<head\b[^>]*>[\s\S]*?<\/head>/gi);
  hide(/<script\b[^>]*>[\s\S]*?<\/script>/gi);
  hide(/<style\b[^>]*>[\s\S]*?<\/style>/gi);
  hide(/<!--[\s\S]*?-->/g);

  return { html, stash };
}

function unstash(html, stash) {
  for (const { t, block } of stash) {
    if (!html.includes(t)) {
      throw new Error(`typography-nbsp: потерян плейсхолдер ${t.slice(0, 20)}…`);
    }
    html = html.split(t).join(block);
  }
  return html;
}

function tieShortWordsInTextChunk(text) {
  return text.replace(SHORT_WORD_SPACE_RE, (_, word, spaces) => `${word}&nbsp;`);
}

function applyNbspBetweenTags(html) {
  return html.replace(/>([^<]*)</g, (full, chunk) => `>${tieShortWordsInTextChunk(chunk)}<`);
}

/**
 * Убирает неразрывные пробелы в разметке `<head>` (title, атрибуты meta, ld+json и т.д.).
 * @param {string} html
 * @returns {string}
 */
function normalizeNbspInHead(html) {
  return html.replace(/<head\b[^>]*>[\s\S]*?<\/head>/gi, (headBlock) =>
    headBlock
      .replace(/&nbsp;/gi, " ")
      .replace(/&#160;/gi, " ")
      .replace(/&#xA0;/gi, " ")
      .replace(/&#xa0;/gi, " ")
  );
}

/**
 * @param {string} html
 * @param {{ force?: boolean }} [options]
 * @returns {{ html: string, skipped: boolean, changed: boolean }}
 */
function processTypographyHtml(html, options = {}) {
  const force = Boolean(options?.force);
  const cleaned = normalizeNbspInHead(html);
  if (hasTypographyMarker(cleaned) && !force) {
    return { html: cleaned, skipped: true, changed: cleaned !== html };
  }
  const { html: stripped, stash } = stashProtectedRegions(cleaned);
  const tied = applyNbspBetweenTags(stripped);
  const restored = unstash(tied, stash);
  const marked = addTypographyMarker(restored);
  const changed = marked !== html;
  return { html: marked, skipped: false, changed };
}

function main() {
  const root = path.resolve(__dirname, "..");
  const argv = process.argv.slice(2);
  const force = argv.includes("--force");
  const files = argv.filter((a) => a !== "--force");
  const target = path.resolve(root, files[0] || "index.html");
  if (!fs.existsSync(target)) {
    console.error("typography-nbsp: файл не найден:", target);
    process.exit(1);
  }
  const raw = fs.readFileSync(target, "utf8");
  const { html, skipped, changed } = processTypographyHtml(raw, { force });
  if (skipped) {
    if (changed) {
      fs.writeFileSync(target, html.replace(/\n+$/, "\n"), "utf8");
      console.log("typography-nbsp: нормализован <head> (", MARKER_ATTR, "):", path.relative(root, target));
    } else {
      console.log("typography-nbsp: уже обработано (", MARKER_ATTR, "), пропуск:", path.relative(root, target));
    }
    process.exit(0);
  }
  if (changed) {
    fs.writeFileSync(target, html.replace(/\n+$/, "\n"), "utf8");
    console.log("typography-nbsp: записано:", path.relative(root, target));
  } else {
    console.log("typography-nbsp: изменений нет:", path.relative(root, target));
  }
}

module.exports = {
  MARKER_ATTR,
  MARKER_VALUE,
  hasTypographyMarker,
  normalizeNbspInHead,
  processTypographyHtml,
  tieShortWordsInTextChunk,
  WORDS,
};

if (require.main === module) {
  main();
}

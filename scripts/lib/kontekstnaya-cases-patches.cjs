/**
 * Контент cases-block на /kontekstnaya_reklama (ТЗ: Darkrain, Складно, Минисклад, Boca).
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..", "..");
const partialsRoot = path.join(root, "html", "partials", "services");

const COPY = {
  darkrain: {
    title: "Darkrain",
    subtitle:
      "Обеспечили устойчивый рост продаж и узнаваемости бренда с помощью контекстной рекламы",
    description:
      "Получаем от 300 до 700 заказов в месяц. Увеличили клиентскую базу в 10 раз, продажи в 5 раз и брендовый спрос в 6 раз.",
    href: "/case/darkrain-store",
  },
  skladno: {
    title: "Складно",
    subtitle: "Увеличили продажи интернет-магазина мебели с помощью контекстной рекламы.",
    description:
      "Увеличили продажи на 79% и обеспечили рост выручки до 71% благодаря поисковым, товарным и медийным рекламным кампаниям. Получаем более 200 заявок в месяц для интернет-магазина мебели.",
    href: "/case/all/skladno-internet-magazin-mebeli",
  },
};

const SLIDE_OPEN =
  '<div data-v-bd2e570a="" class="swiper-slide cases-block__swiper-slide';

function readPartial(name) {
  const p = path.join(partialsRoot, name);
  if (!fs.existsSync(p)) throw new Error(`kontekstnaya-cases-patches: нет partial ${name}`);
  return fs.readFileSync(p, "utf8").trim();
}

function findSlideBounds(html, titlePattern) {
  const re = new RegExp(
    `cases-block__swiper-slide-title[^>]*>\\s*${titlePattern.source}\\s*<\\/h3>`,
    titlePattern.flags,
  );
  const titleMatch = re.exec(html);
  if (!titleMatch) return null;

  const titleIdx = titleMatch.index;
  const slideStart = html.lastIndexOf(SLIDE_OPEN, titleIdx);
  if (slideStart < 0) return null;

  let depth = 0;
  let pos = slideStart;
  while (pos < html.length) {
    const nextOpen = html.indexOf("<div", pos);
    const nextClose = html.indexOf("</div>", pos);
    if (nextClose < 0) break;
    if (nextOpen >= 0 && nextOpen < nextClose) {
      depth++;
      pos = nextOpen + 4;
      continue;
    }
    depth--;
    pos = nextClose + 6;
    if (depth === 0) {
      return { start: slideStart, end: pos, slide: html.slice(slideStart, pos) };
    }
  }
  return null;
}

function patchSlideCopy(slide, { title, subtitle, description, href }) {
  let out = slide;
  if (title) {
    out = out.replace(
      /(cases-block__swiper-slide-title(?:\s+cases-block__swiper-slide-title_big)?">)[^<]+(<\/h3>)/,
      `$1${title}$2`,
    );
  }
  out = out.replace(
    /(<p data-v-bd2e570a="" class="cases-block__swiper-slide-subtitle">)[\s\S]*?(<\/p>)/,
    `$1${subtitle}$2`,
  );
  out = out.replace(
    /(<p data-v-bd2e570a="" class="cases-block__swiper-slide-description">)[\s\S]*?(<\/p>)/,
    `$1${description}$2`,
  );
  if (href) {
    out = out.replace(/\shref="[^"]*"/, ` href="${href}"`);
    out = out.replace(/\sto="[^"]*"/, "");
  }
  return out;
}

function replaceSlideByTitle(blockHtml, titlePattern, replacementHtml) {
  const bounds = findSlideBounds(blockHtml, titlePattern);
  if (!bounds) {
    throw new Error(`kontekstnaya-cases-patches: слайд «${titlePattern}» не найден`);
  }
  return blockHtml.slice(0, bounds.start) + replacementHtml.trim() + blockHtml.slice(bounds.end);
}

function patchSlideByTitle(blockHtml, titlePattern, copy) {
  const bounds = findSlideBounds(blockHtml, titlePattern);
  if (!bounds) {
    throw new Error(`kontekstnaya-cases-patches: слайд «${titlePattern}» не найден`);
  }
  const patched = patchSlideCopy(bounds.slide, copy);
  return blockHtml.slice(0, bounds.start) + patched + blockHtml.slice(bounds.end);
}

function replaceOrangeSlideWithMinisklad(blockHtml) {
  if (/cases-block__swiper-slide-title[^>]*>\s*Минисклад\s*</i.test(blockHtml)) {
    return blockHtml;
  }
  const slide = readPartial("kontekstnaya-case-slide-minisklad.html");
  return replaceSlideByTitle(blockHtml, /Orange/i, slide);
}

function patchSkladnoInBlock(blockHtml) {
  return patchSlideByTitle(blockHtml, /Складно/, COPY.skladno);
}

function patchDarkrainInBlock(blockHtml) {
  return patchSlideByTitle(blockHtml, /DarkRain|Darkrain/i, COPY.darkrain);
}

function applyKontekstnayaCasesPatches(casesBlocks) {
  if (!Array.isArray(casesBlocks) || casesBlocks.length !== 3) {
    throw new Error(`kontekstnaya-cases-patches: ожидалось 3 cases-block, получено ${casesBlocks?.length}`);
  }
  const [b1, b2, b3] = casesBlocks;
  const out1 = replaceOrangeSlideWithMinisklad(patchDarkrainInBlock(b1));
  const out2 = patchSkladnoInBlock(b2);
  return [out1, out2, b3];
}

function loadBocaSliderSection() {
  return readPartial("kontekstnaya-case-slider-boca.html");
}

module.exports = {
  applyKontekstnayaCasesPatches,
  loadBocaSliderSection,
  COPY,
};

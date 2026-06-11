/**
 * В prod-срезе /seo третий inline cases-block — ИРиПА; на странице AWM оказывается ниже по скроллу.
 * Заменяем контент блока на AWM-Trade (как в kompleksnoye-cases-slider-block).
 */
function extractCasesBlockSection(html, titleNeedle) {
  const idx = html.indexOf(titleNeedle);
  if (idx < 0) return null;
  const secStart = html.lastIndexOf("<section", idx);
  if (secStart < 0) return null;
  let pos = secStart;
  let depth = 0;
  while (pos < html.length) {
    if (html.slice(pos, pos + 8) === "<section") depth += 1;
    else if (html.slice(pos, pos + 10) === "</section>") {
      depth -= 1;
      if (depth === 0) return { start: secStart, end: pos + 10, html: html.slice(secStart, pos + 10) };
    }
    pos += 1;
  }
  return null;
}

const AWM_IMG = "/_sa/img/storage__YfZu2MFOKX0qzGVd00TtLP1fWFVVv9yrvNNKN0nP.webp";

const AWM = {
  title: "AWM-Trade",
  titleNeedle: 'cases-block__swiper-slide-title">ИРиПА',
  bg: AWM_IMG,
  img: AWM_IMG,
  slideClass: "cases-block__swiper-slide--awm-trade",
  href: "/case/awm-trade",
  subtitle: "Дистрибьютор квадрациклов, мотоциклетной техники, экипировки и&nbsp;аксессуаров.",
  description:
    "Помогли увеличить посещаемость сайта, повысить узнаваемость бренда и&nbsp;снизить стоимость рекламы за&nbsp;счёт точного таргетинга, оптимизации кампаний и&nbsp;работы с&nbsp;аудиторией.",
};

function swapSeoInlineIripaToAwm(html) {
  const block = extractCasesBlockSection(html, AWM.titleNeedle);
  if (!block) return html;

  let s = block.html;
  s = s.replace(
    /cases-block__swiper-slide-title([^>]*)>ИРиПА<\/h3>/,
    'cases-block__swiper-slide-title cases-block__swiper-slide-title_big">AWM-Trade</h3>',
  );
  s = s.replace(
    /cases-block__swiper-slide-subtitle[^>]*>[\s\S]*?<\/p>/,
    `cases-block__swiper-slide-subtitle">${AWM.subtitle}</p>`,
  );
  s = s.replace(
    /cases-block__swiper-slide-description[^>]*>[\s\S]*?<\/p>/,
    `cases-block__swiper-slide-description">${AWM.description}</p>`,
  );
  s = s.replace(/background-image:\s*url\(&quot;[^&]+&quot;\)/, `background-image: url(&quot;${AWM.bg}&quot;)`);
  s = s.replace(/href="\/case\/all\/iripa"/g, `href="${AWM.href}"`);
  s = s.replace(
    /(<img[^>]*class="cases-block__swiper-slide-contant-image"[^>]*\ssrc=")[^"]+(")/,
    `$1${AWM.img}$2`,
  );
  if (!s.includes(AWM.slideClass)) {
    s = s.replace(
      /class="swiper-slide cases-block__swiper-slide/,
      `class="swiper-slide cases-block__swiper-slide ${AWM.slideClass}`,
    );
  }

  return html.slice(0, block.start) + s + html.slice(block.end);
}

module.exports = { swapSeoInlineIripaToAwm };

/**
 * HTML блока «Стоимость» (заголовок + слайдер + таблица) для /korporativnyj_sajt.
 * Данные: json/services/korporativnyj_sajt/packages.json
 */
const fs = require("fs");
const path = require("path");
const { getKorporativnyjPackagesRowIcon } = require("./korporativnyj-packages-row-icons.cjs");

const PRODUCT_IMAGE =
  "https://serenity.agency/_sa/img/storage__xjhFEA49677OGQDTXjw6he9xnUh71ef9GgvspTHz.webp";

function formatPriceRub(n) {
  const s = String(Math.round(n));
  return s.replace(/\B(?=(\d{3})+(?!\d))/g, "\u00a0");
}

function compareCell(kind) {
  if (kind === "yes") {
    return '<td class="kontekst-packages-compare__cell kontekst-packages-compare__cell--yes" aria-label="Входит"><span aria-hidden="true">✓</span></td>';
  }
  if (kind === "no") {
    return '<td class="kontekst-packages-compare__cell kontekst-packages-compare__cell--no" aria-label="Не входит"><span aria-hidden="true">—</span></td>';
  }
  return `<td class="kontekst-packages-compare__cell kontekst-packages-compare__cell--text">${kind}</td>`;
}

function buildCompareTable(data) {
  const planHeads = data.plans
    .map(
      (name) =>
        `<th scope="col" class="kontekst-packages-compare__th-plan"><span class="kontekst-packages-compare__plan-name">${name}</span></th>`,
    )
    .join("\n            ");

  const pinnedBodyRows = data.rows
    .map((row) => {
      const labelClass = row.text
        ? "kontekst-packages-compare__row-label kontekst-packages-compare__row-label--text"
        : "kontekst-packages-compare__row-label";
      const trClass = row.text ? ' class="kontekst-packages-compare__row--text"' : "";
      const iconSvg = !row.text ? getKorporativnyjPackagesRowIcon(row.label) : "";
      const iconHtml = iconSvg
        ? `<span class="kontekst-packages-compare__icon" aria-hidden="true">\n                  ${iconSvg}\n                </span>\n                `
        : "";
      const labelBody = row.text
        ? row.label
        : `<span class="kontekst-packages-compare__row-label-text">${row.label}</span>`;
      return `            <tr${trClass}>
              <th scope="row" class="${labelClass}">${iconHtml}${labelBody}</th>
            </tr>`;
    })
    .join("\n");

  const plansBodyRows = data.rows
    .map((row) => {
      const trClass = row.text ? ' class="kontekst-packages-compare__row--text"' : "";
      const cells = row.cells.map((c) => compareCell(c)).join("\n              ");
      return `            <tr${trClass}>
              ${cells}
            </tr>`;
    })
    .join("\n");

  return `<!-- Сравнение пакетов: .dies — kontekstnaya-packages-compare.css -->
<div id="korporativnyj-packages-compare-mounted" class="kontekst-packages-compare">
  <figure class="kontekst-packages-compare__figure">
    <div class="kontekst-packages-compare__layout">
      <div class="kontekst-packages-compare__pinned">
        <table class="kontekst-packages-compare__table kontekst-packages-compare__table--pinned">
          <thead>
            <tr>
              <th scope="col" class="kontekst-packages-compare__th-feature">${data.compareFeatureHeader}</th>
            </tr>
          </thead>
          <tbody>
${pinnedBodyRows}
          </tbody>
        </table>
      </div>
      <div class="kontekst-packages-compare__scroll">
        <table class="kontekst-packages-compare__table kontekst-packages-compare__table--plans">
          <caption class="kontekst-packages-compare__caption">
            ${data.compareCaption}
          </caption>
          <thead>
            <tr>
              ${planHeads}
            </tr>
          </thead>
          <tbody>
${plansBodyRows}
          </tbody>
        </table>
      </div>
    </div>
  </figure>
</div>`;
}

function buildPriceCardSlide(card, ruleIndex) {
  const priceDisplay = formatPriceRub(card.priceRub);
  const descPlain = card.description
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const jsonLd = JSON.stringify({
    "@context": "https://schema.org/",
    "@type": "Product",
    name: card.name,
    image: PRODUCT_IMAGE,
    description: descPlain,
    brand: { "@type": "Brand", name: "Serenity" },
    offers: {
      "@type": "Offer",
      priceCurrency: "RUB",
      price: `${card.priceRub}.00`,
      availability: "https://schema.org/InStock",
    },
  });

  return `<div class="prices__packages-slide swiper-slide" style="margin-right:30px"><div data-v-1444f1fb="" data-v-1505791e="" class="price-card__wrapper"><div data-v-1444f1fb="" class="price-card noImg"><h3 data-v-1444f1fb="">${card.name}</h3><div class="price-card__title-rule price-card__title-rule--${ruleIndex}" aria-hidden="true"></div> <p data-v-1444f1fb="">${card.description}</p> <div data-v-1444f1fb="" class="price-card__details"><span data-v-1444f1fb="" class="price-card__price">
				От&nbsp;${priceDisplay} <span data-v-1444f1fb="">¤</span></span> <p data-v-1444f1fb=""><i>${card.termLine}</i></p> <!----> <!----></div> <!----></div> <script data-v-1444f1fb="" type="application/ld+json">${jsonLd}</script></div></div>`;
}

function buildPackagesBlockHtml(rootDir) {
  const jsonPath = path.join(rootDir, "json/services/korporativnyj_sajt/packages.json");
  const data = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
  const slides = data.cards
    .map((card, i) => buildPriceCardSlide(card, i + 1))
    .join("");
  const compare = buildCompareTable(data);

  return `<!-- KORPORATIVNYJ-PACKAGES-START -->
<section class="page-constructor__section korporativnyj-packages-heading"><div data-v-4ed7dc78="" class="modern content-block"><div data-v-4ed7dc78="" class="page__container"><div data-v-490c7534="" data-v-4ed7dc78="" class="numbered-header number-header__empty"><div data-v-490c7534="" class="row"><div data-v-490c7534="" class="col-6 col-md-12 numbered-header__title-column"><div data-v-490c7534="" class="numbered-header__bullet"></div> <div data-v-490c7534="" class="numbered-header__title"><h2 data-v-490c7534="">${data.heading}</h2> <!----> <h4 data-v-490c7534="" style="display: none;"></h4></div></div> <!----></div></div> <!----> <!----> <!----> <!----></div></div></section>
<section class="page-constructor__section korporativnyj-packages-dies"><div data-v-07db1e8a="" class="dies modern"><div data-v-07db1e8a="" class="page__container"><section data-v-1505791e="" data-v-07db1e8a="" class="prices"><div data-v-1505791e="" class="prices__cards row prices__cards--packages"><div data-v-1505791e="" class="prices__packages-slider swiper-container swiper-container-horizontal swiper-container-free-mode"><div data-v-1505791e="" class="prices__packages-track swiper-wrapper">${slides}</div></div></div>
${compare}
</section></div></div></section>
<!-- KORPORATIVNYJ-PACKAGES-END -->`;
}

module.exports = { buildPackagesBlockHtml, buildCompareTable };

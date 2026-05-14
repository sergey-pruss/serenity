#!/usr/bin/env node
/**
 * Генерирует html/partials/services/awards-kontekstnaya-reklama.html
 * (оболочка home-awards + тексты карточек с prod /kontekstnaya_reklama).
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const outPath = path.join(root, "html", "partials", "services", "awards-kontekstnaya-reklama.html");

const awards = [
  { r: "Connect", y: "2026", d: "ТОП-50 в списке проверенных агентств контекстной рекламы в России", href: null },
  { r: "Рейтинг Рунета", y: "2025", d: "6 место по России в контекстной рекламе в сфере медицины и здоровья", href: null },
  {
    r: "Workspace Digital",
    y: "2024",
    d: "1 место за комплексные услуги для eCom бренда Darkrain",
    href: "https://workspace.ru/awards/cases/kompleksnaya-usluga-dlya-peterburgskogo-brenda-ukrasheniy-darkrain/",
  },
  {
    r: "Рейтинг Рунета",
    y: "2024",
    d: "3 место по России в рейтинге комплексных digital-агентств в сфере «Красота, мода»",
    href: null,
  },
  { r: "Рейтинг Рунета", y: "2024", d: "4 место в СПб по комплексному продвижению в интернете", href: null },
  { r: "Рейтинг Рунета", y: "2024", d: "23 место в СПб по настройке контекстной рекламы", href: null },
  {
    r: "Рейтинг Рунета",
    y: "2024",
    d: "14 место в России по комплексному продвижению в сфере «Промышленность»",
    href: null,
  },
  { r: "Рейтинг Рунета", y: "2024", d: "14 место в России по комплексному продвижению микро-бизнеса", href: null },
  {
    r: "Рейтинг Рунета",
    y: "2024",
    d: "16 место в России по комплексному продвижению корпоративных сайтов",
    href: null,
  },
  { r: "Рейтинг Рунета", y: "2024", d: "29 место в России по комплексному продвижению в интернете", href: null },
  {
    r: "Рейтинг Рунета",
    y: "2023",
    d: "11 место в рейтинге агентств контекстной рекламы Санкт-Петербурга",
    href: null,
  },
  { r: "Ruward", y: "2022", d: "2 место в России по performance-маркетингу для IT-услуг и сервисов", href: null },
  {
    r: "Рейтинг Рунета",
    y: "2022",
    d: "14 место в рейтинге агентств контекстной рекламы Санкт-Петербурга",
    href: "https://api.cabinet.cmsmagazine.ru/diplom/show/28d58dab9fc743a06e23b15c496d3f03",
  },
  { r: "Tagline", y: "2018", d: "6 место в рейтинге агентств performance-маркетинга Петербурга", href: null },
  { r: "Tagline", y: "2017", d: "9 место по performance-маркетингу в Санкт-Петербурге", href: null },
  { r: "Ruward", y: "2017", d: "6 место по контекстной рекламе в Санкт-Петербурге", href: null },
  { r: "Рейтинг Рунета", y: "2021", d: "8 место в СПб в рейтинге агентств по контекстной рекламе", href: null },
];

function esc(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function slideShellOpen(href) {
  if (href) {
    return `<a class="home-awards-slide-shell" data-v-6f8a040c="" href="${esc(href)}" target="_blank" rel="noopener noreferrer">`;
  }
  return `<div class="home-awards-slide-shell" data-v-6f8a040c="">`;
}

function slideShellClose(href) {
  return href ? `</a>` : `</div>`;
}

const slides = awards
  .map(
    ({ r, y, d, href }) => `
                        <div
                          class="swiper-slide clients-new__slide awards__card-wraper"
                          data-v-6f8a040c=""
                        >${slideShellOpen(href)}
                            <div class="awards__card" data-v-6f8a040c="">
                              <div class="awards__card-info">
                                <span class="awards__card-rating">${esc(r)}</span>
                                <span class="awards__card-year">${esc(y)}</span>
                              </div>
                              <img
                                class="awards__card-img"
                                src="/_sa/img/home/award-wreath-union.svg"
                                alt=""
                                width="148"
                                height="131"
                                loading="lazy"
                                decoding="async"
                              />
                              <img
                                class="awards__card-img"
                                src="/_sa/img/home/award-wreath-union1.svg"
                                alt=""
                                width="148"
                                height="131"
                                loading="lazy"
                                decoding="async"
                              />
                              <p class="awards__card-description">
                                ${esc(d)}
                              </p>
                            </div>
                          ${slideShellClose(href)}
                        </div>`,
  )
  .join("");

const html = `<!-- Частичный блок «Награды» для /kontekstnaya_reklama: оболочка как на главной (home-awards), тексты — с https://serenity.agency/kontekstnaya_reklama. Другие услуги — отдельные partials в этой папке. Сгенерировано: node scripts/build-awards-kontekstnaya-partial.cjs -->
<section class="page-constructor__section">
  <div id="sa-home-awards-mounted" data-v-6f8a040c="" style="z-index: 10">
    <div class="component-block home-awards-block isNewContent" data-v-6f8a040c="">
      <section class="wrapper home-awards-section">
        <div class="awards">
          <div class="awards__header">
            <h3 class="home-clients-awards__title kontekstnaya-page__section-heading" data-v-08586076="" id="kontekstnaya-awards-heading">Награды</h3>
          </div>
          <div
            class="swiper-container swiper-container-horizontal swiper-container-free-mode swiper-container-clients-new"
            data-v-08586076=""
            data-v-6f8a040c=""
          >
            <div class="swiper-wrapper clients-new__context-wrapper" data-v-08586076="" data-v-6f8a040c="">
${slides}
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</section>
`;

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, html.trim() + "\n", "utf8");
console.log("wrote", outPath);

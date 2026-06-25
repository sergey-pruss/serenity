/**
 * cases-block слайдеры для /targeting (ТЗ тимлида).
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..", "..");

const CASES = {
  darkrain: {
    slideClass: "targeting-case-darkrain",
    swiperId: "swiper-container-targeting-darkrain",
    href: "/case/darkrain-store",
    title: "Darkrain",
    subtitle:
      "Продвигаем сайт бренда ювелирных изделий и&nbsp;товары в&nbsp;соцсетях. Наращиваем узнаваемость и&nbsp;увеличиваем число подписчиков.",
    description:
      "В&nbsp;5 раз увеличили продажи бренда за&nbsp;7 лет работы, а&nbsp;за&nbsp;2023 год на&nbsp;15&nbsp;000 увеличили количество подписчиков в&nbsp;ВК и&nbsp;получили рекордно низкую стоимость покупки в&nbsp;соцсетях — 1&nbsp;900&nbsp;₽.",
    bg: "/_sa/img/storage__Vke93wzObsiS5bp5PsVi0NgCguLtv7ldc3MQfu4R.webp",
    img: "/_sa/img/storage__eoSAuU72TOQRPvoNlsSHLeFtl9qZxyUE8aTj2yFN.webp",
    imgAlt: "Бренд украшений Darkrain",
  },
  toofli: {
    slideClass: "targeting-case-toofli",
    swiperId: "swiper-container-targeting-toofli",
    href: "/case/toofli",
    title: "Toofli",
    subtitle:
      "Продвижение в&nbsp;социальных сетях трёх аккаунтов интернет-магазина обуви. Использовали таргетированную рекламу, интеграции с&nbsp;инфлюенсерами и&nbsp;фотопродакшен.",
    description:
      "На&nbsp;27&nbsp;000 увеличили количество подписчиков и&nbsp;получили 1&nbsp;111 заявок на&nbsp;покупку обуви в&nbsp;трёх аккаунтах бренда.",
    bg: "/_sa/img/services/smm_marketing/cases/toofli-bg.png?v=20260625toofliUser2",
    img: "/_sa/img/services/smm_marketing/cases/toofli-product.png?v=20260625toofliUser2",
    imgAlt: "Интернет-магазин обуви Toofli",
    imgWidth: 900,
    imgHeight: 500,
  },
  evrostoy: {
    slideClass: "targeting-case-evrostoy",
    swiperId: "swiper-container-targeting-evrostoy",
    href: "/case/evrostroj",
    title: "Еврострой",
    subtitle:
      "Продвигали четыре проекта застройщика элитной недвижимости с&nbsp;помощью контент-стратегии, таргетированной и&nbsp;контекстной рекламы. Настроили лид-формы, ретаргетинг и&nbsp;сквозную аналитику.",
    description:
      "В&nbsp;10 раз снизили стоимость конверсии и&nbsp;на&nbsp;30% увеличили их&nbsp;количество. Каждая шестая качественная заявка поступала с&nbsp;лид-форм.",
    bg: "/_sa/img/storage__HhS9VdX50mVFhdZWABo4rE60Ep1aqftv0sV7B7Ud.webp",
    img: "/_sa/img/storage__xcMSh9DeEHZ7QTTbOzwi8u4fW2Ml0AKNpkODXAsD.webp",
    imgAlt: "Застройщик элитной недвижимости Еврострой",
  },
  awm: {
    slideClass: "targeting-case-awm",
    swiperId: "swiper-container-targeting-awm",
    href: "/case/awm-trade",
    title: "AWM-Trade",
    subtitle:
      "Продвигали дистрибьютора квадроциклов и&nbsp;мототехники — сегментировали аудиторию, протестировали рекламные креативы и&nbsp;настроили ретаргетинг.",
    description:
      "В&nbsp;3 раза увеличили посещаемость сайта, на&nbsp;60% повысили узнаваемость бренда и&nbsp;снизили показатель отказов до&nbsp;13%.",
    bg: "/_sa/img/storage__Bi4SfXYRWQx51163FZqwfYRzWjDBjds5GD1YxAoW.webp",
    img: "/_sa/img/storage__YfZu2MFOKX0qzGVd00TtLP1fWFVVv9yrvNNKN0nP.webp",
    imgAlt: "Дистрибьютор мототехники AWM-Trade",
  },
};

function buildCaseSlider(key) {
  const c = CASES[key];
  const subtitleHtml = c.subtitle
    ? `<p data-v-bd2e570a="" class="cases-block__swiper-slide-subtitle">${c.subtitle}</p>`
    : "";
  const imgSizeAttr =
    c.imgWidth && c.imgHeight ? ` width="${c.imgWidth}" height="${c.imgHeight}"` : "";
  const descriptionHtml =
    c.descriptionLeft && c.descriptionRight
      ? `<div data-v-bd2e570a="" class="targeting-case-description-row">
                <p data-v-bd2e570a="" class="cases-block__swiper-slide-description targeting-case-description-left">${c.descriptionLeft}</p>
                <p data-v-bd2e570a="" class="cases-block__swiper-slide-description targeting-case-description-right">${c.descriptionRight}</p>
              </div>`
      : c.description
        ? `<p data-v-bd2e570a="" class="cases-block__swiper-slide-description">${c.description}</p>`
        : "";
  return `<!-- targeting-case:${key} -->
<section class="page-constructor__section targeting-case-slider-section targeting-case-slider-section--${key}">
  <div data-v-bd2e570a="" class="cases-block">
    <div data-v-bd2e570a="" class="cases-block__slider">
      <div data-v-bd2e570a="" id="${c.swiperId}" class="swiper-container cases-block__slider-swiper-container">
        <div data-v-bd2e570a="" class="swiper-wrapper cases-block__swiper-wrapper">
          <div data-v-bd2e570a="" class="swiper-slide cases-block__swiper-slide ${c.slideClass} swiper-slide-active">
            <div data-v-bd2e570a="" class="background" style="background-image: url(&quot;${c.bg}&quot;);"></div>
            <div data-v-bd2e570a="" class="cases-block__swiper-slide-tags-wrapper cases-block__swiper-slide-tags-wrapper_hidden">
              <div data-v-bd2e570a="" class="cases-block__swiper-slide-tags"></div>
            </div>
            <div data-v-bd2e570a="" class="cases-block__swiper-slide-contant">
              <div data-v-bd2e570a="" class="old">
                <img data-v-bd2e570a="" src="${c.img}" alt="${c.imgAlt}"${imgSizeAttr} loading="lazy" class="cases-block__swiper-slide-contant-image" />
              </div>
            </div>
            <div data-v-bd2e570a="" class="cases-block__swiper-slide-text-contant">
              <div data-v-bd2e570a="" class="cases-block__swiper-slide-title-wrapper">
                <h3 data-v-bd2e570a="" class="cases-block__swiper-slide-title cases-block__swiper-slide-title_big">${c.title}</h3>
                ${subtitleHtml}
              </div>
              <div data-v-bd2e570a="" class="cases-block__swiper-slide-button-wrapper">
                ${descriptionHtml}
                <a data-v-7f5f1051="" data-v-bd2e570a="" href="${c.href}" class="buttonlink cases-block__swiper-slide-button">
                  <div data-v-7f5f1051="" class="buttonlink__content">
                    <div data-v-bd2e570a="" data-v-7f5f1051="">
                      Смотреть кейс
                      <svg data-v-bd2e570a="" xmlns="http://www.w3.org/2000/svg" width="16" height="13" viewBox="0 0 16 13" fill="none" data-v-7f5f1051="" aria-hidden="true">
                        <path d="M1 6.5H15M15 6.5L9.4 1M15 6.5L9.4 12" stroke="white" stroke-linecap="round" stroke-linejoin="round"></path>
                      </svg>
                    </div>
                  </div>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>`;
}

function buildAllCaseSliders() {
  return {
    darkrain: buildCaseSlider("darkrain"),
    toofli: buildCaseSlider("toofli"),
    evrostoy: buildCaseSlider("evrostoy"),
    awm: buildCaseSlider("awm"),
  };
}

module.exports = {
  CASES,
  buildCaseSlider,
  buildAllCaseSliders,
};

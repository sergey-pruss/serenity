/**
 * Карусель логотипов рекламных площадок для /targeting.
 * Разметка и поведение — как блок «Наши клиенты» (clients-strip в app.js).
 */
const IMG_PREFIX = "/_sa/img/services/targeting/platforms";
const CACHE_BUST = "v=20260625platformsTelegramAds2";

const PLATFORMS = [
  { src: `${IMG_PREFIX}/beeline-prodvizhenie.png?${CACHE_BUST}`, alt: "билайн бизнес" },
  { src: `${IMG_PREFIX}/mts-marketolog.png?${CACHE_BUST}`, alt: "МТС Маркетолог" },
  { src: `${IMG_PREFIX}/vkontakte.png?${CACHE_BUST}`, alt: "ВКонтакте" },
  { src: `${IMG_PREFIX}/sber-ads.png?${CACHE_BUST}`, alt: "SberAds" },
  { src: `${IMG_PREFIX}/megafon-probiznes.png?${CACHE_BUST}`, alt: "МегаФон Бизнес" },
  { src: `${IMG_PREFIX}/oohdesk-dsp.png?${CACHE_BUST}`, alt: "OOHDesk DSP" },
  { src: `${IMG_PREFIX}/hybrid.png?${CACHE_BUST}`, alt: "Hybrid" },
  { src: `${IMG_PREFIX}/mytarget.png?${CACHE_BUST}`, alt: "myTarget" },
  { src: `${IMG_PREFIX}/dzen.png?${CACHE_BUST}`, alt: "Дзен" },
  { src: `${IMG_PREFIX}/telegram-ads.png?${CACHE_BUST}`, alt: "Telegram Ads" },
];

const SWIPER_ARROWS = `<div data-v-08586076="" class="swiper-buttons"><div data-v-08586076="" class="swiper-button-prev"><svg width="12" height="20" viewBox="0 0 12 20" fill="none" xmlns="http://www.w3.org/2000/svg" class=""><path d="M1.39844 0.900391L10.5908 10.0928L1.39844 19.2852" stroke="white" stroke-linecap="round" stroke-linejoin="round"></path></svg></div> <div data-v-08586076="" class="swiper-button-next"><svg width="12" height="20" viewBox="0 0 12 20" fill="none" xmlns="http://www.w3.org/2000/svg" class=""><path d="M1.39844 0.900391L10.5908 10.0928L1.39844 19.2852" stroke="white" stroke-linecap="round" stroke-linejoin="round"></path></svg></div></div>`;

function slideMarkup({ src, alt }, index) {
  return `<span data-v-08586076="" class="swiper-slide clients-new__slide" data-swiper-slide-index="${index}" style="margin-right: 40px;"><img fetchpriority="low" decoding="async" data-v-08586076="" src="${src}" alt="${alt}" loading="lazy" /></span>`;
}

function buildTargetingPlatformsMarquee() {
  const slides = PLATFORMS.map((p, i) => slideMarkup(p, i)).join("\n                      ");

  return `<!-- Карусель логотипов рекламных площадок (как «Наши клиенты») -->
<section class="page-constructor__section targeting-platforms-section kontekst-clients-section">
<div data-v-6f8a040c="" style="z-index: 10">
              <div data-v-08586076="" data-v-6f8a040c="" class="clients-wrapper clients-mainstr clients-wrapper_main-structure"><div data-v-08586076="" class="clients-new-section home-between"><div data-v-08586076="" class="clients-new home-ledge"><h2 data-v-08586076="" class="home-clients-awards__title">
        Рекламные площадки
      </h2> ${SWIPER_ARROWS}</div>
      <p class="targeting-platforms-section__lead content-block__desc">Работаем с ведущими рекламными платформами и операторами данных, чтобы подбирать каналы под аудиторию, географию и задачи бизнеса.</p>
      <div data-v-08586076="" class="swiper-container swiper-container-clients-new clients-strip" data-clients-strip="1">
                    <div data-v-08586076="" class="swiper-wrapper clients-new__context-wrapper">
                      ${slides}
                    </div></div></div></div>            </div>
</section>`;
}

module.exports = {
  PLATFORMS,
  buildTargetingPlatformsMarquee,
};

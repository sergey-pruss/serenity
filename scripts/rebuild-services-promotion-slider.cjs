#!/usr/bin/env node
/**
 * Пересборка слайдера «Продвижение» на /services:
 * 1) комплексные IMG, 2) услуги 2-го уровня IMG, 3) половинки TEXT без картинки.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const INDEX = path.join(ROOT, 'services/index.html');

const TAB_IMG = '\n\t\t\t\t\t\t\t\t\t\t';
const TAB_TEXT = '\n\t\t\t\t\t\t\t\t\t\t\t\t';

function priceSpan(price, indent, variant) {
  const line = `От ${price}`;
  return `<span data-v-56f85d51="" class="services__card-price ${variant}">${indent}${line}${indent}<span data-v-56f85d51="" class="rooble">₽</span></span>`;
}

function buildImgSlide({ href, title, price, desc, images, slideClass = '' }) {
  const imgBase = '/_sa/img/services/';
  const descHtml = `<p data-v-56f85d51="" class="services__card-description services__card-description-animation">${desc}</p>`;
  const imgs = `<div data-v-56f85d51="" class="services__card-img-wr"><img data-v-56f85d51="" src="${imgBase}${images.desc}" alt="#" loading="lazy" class="services__card-img services__card-img_desc"> <img data-v-56f85d51="" src="${imgBase}${images.tablet}" alt="#" loading="lazy" class="services__card-img services__card-img_tablet"> <img data-v-56f85d51="" src="${imgBase}${images.mobile}" alt="#" loading="lazy" class="services__card-img services__card-img_mobile"></div>`;
  const priceDesktop = priceSpan(price, TAB_IMG, 'desctop');
  const priceMobile = priceSpan(price, TAB_IMG, 'tablet-mobile');
  return `<div data-v-56f85d51="" class="services__slide swiper-slide${slideClass}" style="margin-right: 30px;"><div data-v-56f85d51=""><div data-v-56f85d51="" class="services__card"><a data-v-56f85d51="" href="${href}" class="services__card-container services__card-container-img"><h3 data-v-56f85d51="">${title}</h3> ${priceDesktop} ${descHtml} ${priceMobile} ${imgs}</a> <!----></div></div></div>`;
}

function buildTextCard({ href, title, price, desc }) {
  const descHtml = `<p data-v-56f85d51="" class="services__card-description services__card-description-animation">${desc}</p>`;
  const priceDesktop = priceSpan(price, TAB_TEXT, 'desctop');
  const priceMobile = priceSpan(price, TAB_TEXT, 'tablet-mobile');
  return `<a data-v-56f85d51="" href="${href}" class="services__card-container services__card-container-text" style="-webkit-tap-highlight-color: transparent;"><h3 data-v-56f85d51="">${title}</h3> ${priceDesktop} ${descHtml} ${priceMobile}</a>`;
}

function wrapTextCard(inner) {
  return `<div data-v-56f85d51=""><div data-v-56f85d51="" class="services__card"><!----> <div data-v-56f85d51="" class="services__card-ccccc">${inner}</div></div></div>`;
}

function buildTextPairSlide(cards, slideClass = '') {
  const body = cards.map((c) => wrapTextCard(buildTextCard(c))).join('');
  return `<div data-v-56f85d51="" class="services__slide swiper-slide${slideClass}" style="margin-right: 30px;">${body}</div>`;
}

function buildTextSingleSlide(card, slideClass = '') {
  return buildTextPairSlide([card], slideClass);
}

function extractPromotionWrapper(html) {
  const promoIdx = html.indexOf('id="services-promotion"');
  if (promoIdx < 0) throw new Error('services-promotion not found');
  const wrapStart = html.indexOf('class="services__context-wrapper swiper-wrapper"', promoIdx);
  const wrapEnd = html.indexOf('</div> <div data-v-56f85d51=""><button', wrapStart);
  if (wrapStart < 0 || wrapEnd < 0) throw new Error('promotion swiper-wrapper bounds not found');
  return { wrapStart, wrapEnd };
}

function buildPromotionSlides() {
  const imgCards = [
    {
      href: '/kompleksnoye-prodvizheniye',
      title: 'Комплексное продвижение',
      price: '300 000',
      desc: 'Доносим преимущества бренда до аудитории и увеличиваем конверсию через различные инструменты.',
      images: {
        desc: '5lXRPRmqGnKTGgJGa3g7Y3iPejliMrVuKDx8bpXp.png',
        tablet: 'XH6X8dd7nP4NZ1aAjTaerMwwGYvIlDWBnOrGhN77.png',
        mobile: '50lqzMOLSnqh2D93CrmUgJu4xxPO24ipUD4PtTyF.png',
      },
      slideClass: ' swiper-slide-active',
    },
    {
      href: '/smm_marketing',
      title: 'Комплексный SMM',
      price: '235 000',
      desc: 'Создаем сильный бренд, регулярно общаемся с аудиторией и отслеживаем ее путь от поста до покупки.',
      images: {
        desc: 'WaD3ICf6YvMYCaDuNPSDnKv0sDfHyqM5NcJonrQj.png',
        tablet: '62hhgcZoPWxIBS9y9CJOtkfD06VxptTHBuXvYusF.png',
        mobile: '12PZ7ZZRMJmGygjbUdCQf4NxniSGS9yAB1OaP9IH.png',
      },
      slideClass: ' swiper-slide-next',
    },
    {
      href: '/kontekstnaya_reklama',
      title: 'Контекстная реклама',
      price: '107 000',
      desc: 'Увеличиваем трафик на сайт и доводим аудиторию до покупки.',
      images: {
        desc: 'P59g84goAUdEc9h8xH9YpACf9T4jZqxQf5DxhESD.png',
        tablet: 'uJEVTMswdwntPfDGMjc9NshSj1zzC5KoEZslI9PS.png',
        mobile: 'F7Dv44rQ3onIMC4xd5vwQfqq044O5iHmQ5JBGHoH.png',
      },
    },
    {
      href: '/targeting',
      title: 'Таргетированная реклама',
      price: '107 000',
      desc: 'Увеличиваем продажи с помощью соцсетей.',
      images: {
        desc: 'jaGBzuO8PmLL7F6CC5KGu7ogXGyw061KZqzctj6d.png',
        tablet: 'rYECvJ4lQtng1wTQVTvbeh2YVQnD2eTBWs5iDdFd.png',
        mobile: '45x4Djynue4IvMeJ2k2r63muNK6iPQQdn8dfE9n8.png',
      },
    },
    {
      href: '/seo',
      title: 'SEO',
      price: '120 000',
      desc: 'Оптимизируем сайт и выводим его в топ по релевантным запросам.',
      images: {
        desc: 'F7Dv44rQ3onIMC4xd5vwQfqq044O5iHmQ5JBGHoH.png',
        tablet: 'rYECvJ4lQtng1wTQVTvbeh2YVQnD2eTBWs5iDdFd.png',
        mobile: 'Q39cUbMwyHvkoTijs7bmgPuEq1tyFEvboMNWPHO3.png',
      },
    },
  ];

  const textSlides = [
    buildTextPairSlide([
      {
        href: '/prodvizhenie-yandex-karty-2gis',
        title: 'Продвижение в Яндекс Картах и 2ГИС',
        price: '80 000',
        desc: 'Настраиваем георекламу и продвижение карточек, чтобы клиенты находили вас в картах.',
      },
      {
        href: '/prodvizhenie-statey-v-dzene-i-promostranitsah',
        title: 'Продвижение статей в Дзен/ПромоСтраницах',
        price: '15 000',
        desc: 'Расскажем о вашем бизнесе через статьи, которые читают тысячи людей в нужных вам городах.',
      },
    ]),
    buildTextPairSlide([
      {
        href: '/end-to-end-analytics',
        title: 'Сквозная аналитика',
        price: '88 000',
        desc: 'Оптимизируем маркетинговые расходы и повышаем эффективность.',
      },
      {
        href: '/business-analytics',
        title: 'Бизнес-аналитика',
        price: '108 000',
        desc: 'Оцениваем эффективность рекламы и рентабельность бизнеса.',
      },
    ]),
  ];

  return imgCards.map((c) => buildImgSlide(c)).join('') + textSlides.join('');
}

function main() {
  const html = fs.readFileSync(INDEX, 'utf8');
  const { wrapStart, wrapEnd } = extractPromotionWrapper(html);
  const prefix = 'class="services__context-wrapper swiper-wrapper" style="transform: translate3d(0px, 0px, 0px);">';
  const start = html.indexOf(prefix, wrapStart);
  if (start < 0) throw new Error('wrapper prefix not found');
  const contentStart = start + prefix.length;
  const newWrapper = prefix + buildPromotionSlides();
  const next = html.slice(0, wrapStart) + newWrapper + html.slice(wrapEnd);
  fs.writeFileSync(INDEX, next);
  const slideCount = (buildPromotionSlides().match(/class="services__slide/g) || []).length;
  console.log(`OK: promotion slider rebuilt (${slideCount} slides) → ${INDEX}`);
}

if (require.main === module) main();

module.exports = { buildPromotionSlides, extractPromotionWrapper };

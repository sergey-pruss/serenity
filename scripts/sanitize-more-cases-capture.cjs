/**
 * Снятие гидрации Nuxt/Swiper с блока more-case-wr для статики (targeting, kontekst extract).
 */
const CTA_SLIDE = '<div data-v-38965faa="" class="swiper-slide mor-cases-slide mor-cases-slide_link" style="background-color: #2c2c30"><div data-v-38965faa="" class="mor-cases-slide__cta-fill"><img fetchpriority="low" decoding="async" data-v-38965faa="" src="/_sa/img/video__lastBlogGif.gif" alt="" loading="eager" class="mor-cases-slide__cta-gif" /><div data-v-38965faa="" class="mor-cases-slide__cta-shade" aria-hidden="true"></div><p data-v-38965faa="" class="more-cases-slider__slide-link"><a data-v-38965faa="" href="/case/all/" class="">Смотреть<br>больше&nbsp;кейсов</a></p></div></div>';

function sanitizeMoreCasesCapture(html) {
  let s = html;
  s = s.replace(/\s*swiper-container-initialized/g, "");
  s = s.replace(/\s*swiper-container-horizontal/g, "");
  s = s.replace(/\s*swiper-container-free-mode/g, "");
  s = s.replace(/<span class="swiper-notification"[^>]*><\/span>/g, "");
  s = s.replace(/\s*style="transition-duration:\s*0ms;?"/g, "");
  s = s.replace(/class="more-case-wr"/, 'class="more-case-wr more-case-wr__main"');
  if (!s.includes("more-case-wr__slider-heading")) {
    s = s.replace(
      /<h2[^>]*class="case__title-mobile"[^>]*>[\s\S]*?<\/h2>\s*<!---->\s*/,
      `<h3 data-v-56f85d51="" class="services__title kontekstnaya-page__section-heading more-case-wr__slider-heading">Кейсы комплексного маркетинга</h3>\n`,
    );
  }
  s = s.replace(
    /<div[^>]*class="swiper-slide mor-cases-slide mor-cases-slide_link"[^>]*>[\s\S]*?<\/div>\s*(?=<\/div>\s*<div[^>]*swiper-pagination)/,
    `${CTA_SLIDE} `,
  );
  return s;
}

module.exports = { sanitizeMoreCasesCapture, CTA_SLIDE };

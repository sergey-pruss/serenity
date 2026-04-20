/**
 * Для зеркала на localhost: не трогаем навигацию (/case, /blog, …),
 * только статику Nuxt и публичные файлы — грузим с продакшена.
 */
const STATIC_PATH_RE =
  "(?:_nuxt/|fonts/|img/|video/|svgset\\.svg|favicon\\.ico)";

export function stripBaseTag(html) {
  return html.replace(/<base\s[^>]*>\s*/gi, "");
}

/** Опечатка в SSR (`dislay`) ломает inline-style — «скрытый» блок может дать полоску */
export function fixMirrorTypos(html) {
  return html.replace(/\bdislay\s*:/gi, "display:");
}

export function absolutizeStaticAssets(html, originRaw) {
  const o = originRaw.replace(/\/+$/, "");
  const attrs = ["href", "src", "xlink:href"];
  let out = html;
  for (const attr of attrs) {
    const re = new RegExp(`\\b${attr}=(["'])\\/(${STATIC_PATH_RE})`, "gi");
    out = out.replace(re, (_, q, p) => `${attr}=${q}${o}/${p}`);
  }
  return out;
}

/**
 * Nuxt/Webpack подгружает доп. CSS/JS с путём от текущего сайта — на localhost это 404.
 * Задаём public path на прод до первого чанка _nuxt.
 */
export function injectWebpackPublicPath(html, originRaw) {
  /** В payload/чанках может встречаться текст `__webpack_public_path__` — нельзя от этого отказываться от инъекции */
  if (/\bdata-serenity-mirror-pp=["']1["']/.test(html)) return html;
  const o = originRaw.replace(/\/+$/, "");
  const publicPath = `${o}/_nuxt/`;
  const tag = `<script data-serenity-mirror-pp="1">try{__webpack_public_path__=${JSON.stringify(publicPath)};}catch(e){}<\/script>`;
  const needle = `<script charset="utf-8" src="${o}/_nuxt/`;
  const idx = html.indexOf(needle);
  if (idx !== -1) return html.slice(0, idx) + tag + html.slice(idx);
  return html.replace(/<html([^>]*)><head>/i, `<html$1><head>${tag}`);
}

/** Preload шрифтов с crossorigin + другой origin даёт CORS-ошибку на localhost */
export function stripFontPreloadCrossorigin(html) {
  return html.replace(/<link\b[^>]*\bas=["']font["'][^>]*>/gi, (tag) =>
    tag.replace(/\s+crossorigin=["'][^"']*["']/gi, "")
  );
}

/** Спрайт с того же хоста, что и страница — иначе браузер не даёт <use xlink:href> с чужого origin */
export function rewriteSvgsetToLocal(html, originRaw) {
  const o = originRaw.replace(/\/+$/, "");
  let out = html;
  const needles = [
    `${o}/svgset.svg`,
    "https://serenity.agency/svgset.svg",
    "http://serenity.agency/svgset.svg",
    "https://www.serenity.agency/svgset.svg",
    "http://www.serenity.agency/svgset.svg",
  ];
  for (const n of needles) {
    if (out.includes(n)) out = out.split(n).join("/svgset.svg");
  }
  out = out.replace(/https?:\/\/(?:www\.)?serenity\.agency\/svgset\.svg/gi, "/svgset.svg");
  return out;
}

/** SSR часто отдаёт шапку в «сжатом» виде; без полной гидрации меню остаётся как на скролле */
export function relaxMirrorHeader(html) {
  return html.replace(/class="header compressed"/g, 'class="header"');
}

/** После снятия `compressed` мобильная иконка может остаться в DOM и перекрывать десктопное меню */
export function injectMirrorDesktopNavFix(html) {
  if (/\bid=["']serenity-mirror-desktop-nav["']/.test(html)) return html;
  const tag =
    '<style id="serenity-mirror-desktop-nav" data-serenity-mirror="1">' +
    "@media (min-width:1024px){.header .menu-icon__wrapper_main,.header .menu-icon__wrapper{display:none!important}}" +
    "</style>";
  return html.replace(/<\/head>/i, `${tag}</head>`);
}

/**
 * Полоски в зеркале: спейсеры у «Мы любим маркетинг», дубль footer.hidden;
 * у футера снимаем фон из бандла (_nuxt css), иначе поверх градиента видна полоска #191a1b;
 * блок «Мы любим маркетинг»: в снимке с прода остаётся hover-CSS — разворачиваем и ссылку всегда видны.
 * Градиентные полоски под цифрами (.live-marketing-block__card-gradient) не скрываем — они часть дизайна.
 * Отступ «Кейсы» после видео не переопределяем — пусть действуют стили Nuxt (.more-case-wr / .more-case-wr__main), иначе ломается паритет с продом.
 */
export function injectMirrorBandArtifactFix(html) {
  const css =
    ".live-marketing-block-wr .component-block__top-element-last," +
    ".live-marketing-block-wr .component-block__top-element-big{display:none!important;height:0!important;margin:0!important;padding:0!important;border:0!important;overflow:hidden!important}" +
    "footer.footer-modern.hidden{display:none!important}" +
    ".footer-modern,.footer-modern--fill{background-color:transparent!important;background-image:none!important}" +
    ".live-marketing-block .live-marketing-block__content .live-marketing-block__card:last-of-type{padding-bottom:115px!important}" +
    "@media screen and (max-width:1024px){.live-marketing-block .live-marketing-block__content .live-marketing-block__card:last-of-type{padding-bottom:48px!important}}" +
    "@media screen and (max-width:768px){.live-marketing-block .live-marketing-block__content .live-marketing-block__card:last-of-type{padding-bottom:0!important}}" +
    "@media screen and (max-width:550px){.live-marketing-block .live-marketing-block__content .live-marketing-block__card:last-of-type{padding-bottom:58px!important}}" +
    ".live-marketing-block__content-link{opacity:1!important}" +
    "@media screen and (max-width:578px){.live-marketing-block__content-link{display:inline-flex!important;align-items:center!important}}";
  const tag = `<style id="serenity-mirror-band" data-serenity-mirror="1">${css}</style>`;
  if (/\bid=["']serenity-mirror-band["']/.test(html)) {
    return html.replace(/<style\b[^>]*\bid=["']serenity-mirror-band["'][^>]*>[\s\S]*?<\/style>/i, tag);
  }
  return html.replace(/<\/head>/i, `${tag}</head>`);
}

/** Сторонние счётчики: вызывать только при MIRROR_STRIP_TRACKERS=1 (см. capture-home / fix-publish) */
const TRACKER_SRC_MARKERS = [
  "googletagmanager.com",
  "google-analytics.com",
  "mc.yandex.ru",
  "yandex.ru/metrika",
  "vk.com/js/api",
  "calltouch.ru",
  "top-fwz1.mail.ru",
  "st.top100.ru",
  "top100.ru",
  "ab-ct.ru",
];

export function stripMirrorTrackers(html) {
  let out = html;
  out = out.replace(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>\s*<\/script>/gi, (full, src) => {
    const s = src.toLowerCase();
    return TRACKER_SRC_MARKERS.some((m) => s.includes(m)) ? "" : full;
  });
  out = out.replace(
    /<script[^>]*data-n-head=["']ssr["'][^>]*data-hid=["']gtm-script["'][^>]*>[\s\S]*?<\/script>/gi,
    ""
  );
  out = out.replace(
    /<script[^>]*data-n-head=["']ssr["'][^>]*>\s*\(function\(m,e,t,r,i,k,a\)[\s\S]*?<\/script>/gi,
    ""
  );
  out = out.replace(
    /<noscript\b[^>]*data-hid=["']gtm-noscript["'][^>]*>[\s\S]*?<\/noscript>/gi,
    ""
  );
  out = out.replace(/<noscript\b[^>]*>[\s\S]*?googletagmanager\.com[\s\S]*?<\/noscript>/gi, "");
  return out;
}

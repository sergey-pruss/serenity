#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function read(relPath) {
  return fs.readFileSync(path.join(root, relPath), "utf8");
}

const html = read("404.html");
assert(!html.includes("<!-- @partial"), "404.html: не должно оставаться маркеров @partial");
assert(
  /<title>\s*404\s*\(\s*Страница не найдена\s*\)\s*—\s*Serenity\s*<\/title>/.test(html),
  "404.html: title «404 (Страница не найдена) — Serenity» (см. .cursor/rules/page-title-serenity.mdc)",
);
assert(html.includes('class="header page-top compressed"'), "404.html: должен использовать общий header Serenity");
assert(!html.includes("sa-not-found-footer"), "404.html: без отдельного блока футера страницы");
assert(!/<footer\b[^>]*\bclass="footer-modern"\b/.test(html), "404.html: без нижнего <footer class=\"footer-modern\">");
assert(!html.includes('class="btns white"'), "404.html: на странице 404 не должно быть floating CTA «Оставить заявку»");
assert(html.includes(".sa-not-found-page #body.body-application"), "404.html: header CTA «Оставить заявку» должен быть скрыт на 404");
assert(html.includes('class="darktheme error-page nuxt sa-not-found-legacy"'), "404.html: должна использовать legacy error-page/darktheme разметку");
assert(html.includes('class="error-page__number">404</div>'), "404.html: нужен legacy номер 404");
assert(html.includes('class="error-page__text h2">— Серенити, у нас проблемы</h1>'), "404.html: нужен legacy русский текст 404");
assert(/\.sa-not-found-page\s+\.error-page__number\s*\{[\s\S]*?font-weight:\s*700;/.test(html), "404.html: жирным должен оставаться только номер 404");
assert(/\.sa-not-found-page\s+\.error-page__text\s*\{[\s\S]*?font-size:\s*clamp\(36px,\s*3\.25vw,\s*52px\);[\s\S]*?font-weight:\s*500;/.test(html), "404.html: текст «Серенити, у нас проблемы» должен быть меньше и не bold");
assert(html.includes('class="sa-not-found-home-button error-page__button"'), "404.html: кнопка на главную должна быть в стиле текущей CTA-кнопки");
assert(html.includes("<span>На главную</span>"), "404.html: текст кнопки должен быть как на legacy 404");
assert(/\.sa-not-found-page\s+\.sa-not-found-home-button\s*\{[\s\S]*?margin-top:\s*50px;/.test(html), "404.html: отступ до кнопки «На главную» должен быть увеличен на 20px");
assert(!/transform:\s*translate\(-50%,\s*-50%\)/.test(html), "404.html: нельзя центрировать 404 через transform — на крупном тексте появляется размытие");
assert(
  /\.sa-not-found-page\s+\.sa-not-found-root\s*\{[\s\S]*?display:\s*flex;[\s\S]*?flex-direction:\s*column;/.test(html),
  "404.html: колонка на весь экран под шапкой для вертикального центра",
);
assert(
  /\.sa-not-found-page\s+\.sa-not-found-legacy\s*\{[\s\S]*?flex:\s*1\s+1\s+auto;/.test(html),
  "404.html: main растягивается в области под шапкой",
);
assert(/min-height:\s*542px/.test(html), "404.html: скролл допустим только ниже минимальной высоты из контрольного скрина");
assert(/\.sa-not-found-page\s*\{[\s\S]*?overflow:\s*hidden\s*!important;/.test(html), "404.html: на нормальной высоте не должно быть принудительного вертикального скролла");
assert(/max-height:\s*733px/.test(html) && /overflow-y:\s*auto\s*!important;/.test(html), "404.html: вертикальный скролл разрешён только ниже минимальной высоты");
assert(!html.includes("404 Not Found"), "404.html: не должно оставаться nginx-текста на английском");
assert(!html.includes("nginx/1.24.0"), "404.html: не должно оставаться подписи nginx");
assert(/<meta\s+name="robots"\s+content="noindex, follow"\s*\/>/.test(html), "404.html: должен быть noindex, follow");

const router = read("nginx/serenity-router.live.conf");
assert(
  /error_page\s+404\s+@serenity_static_404\s*;/.test(router),
  "prod vhost: нужен error_page 404 @serenity_static_404 (named location с кастомной 404)",
);
assert(
  /\blocation\s*=\s*\/404\.html\s*\{[\s\S]*?Cache-Control "no-cache, max-age=0, must-revalidate"/.test(router),
  "prod vhost: /404.html должен отдаваться без долгого кэша",
);

const preview = read("nginx/static.serenity.agency.live.conf");
assert(/^\s*error_page\s+404\s+\/404\.html;\s*$/m.test(preview), "static preview vhost: нужен error_page 404 /404.html");
assert(
  /\blocation\s+\/\s*\{[\s\S]*?try_files\s+\$uri\s+\$uri\/\s+=404;/.test(preview),
  "static preview vhost: неизвестные URL должны уходить в 404, а не в /index.html",
);

console.log("verify-404-page: ok");

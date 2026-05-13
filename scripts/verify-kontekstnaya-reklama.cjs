#!/usr/bin/env node
/**
 * Smoke-тест для страницы /kontekstnaya_reklama:
 * - HTML присутствует и корректен
 * - title содержит нужный текст
 * - H1 содержит нужный текст
 * - ключевые ассеты присутствуют на диске
 * - разметка кейсов как на prod (cases-block__slider + swiper-слайды), блок «Больше кейсов» — mor-cases
 */
const fs = require("fs");
const path = require("path");
const http = require("http");

const root = path.resolve(__dirname, "..");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function read(relPath) {
  return fs.readFileSync(path.join(root, relPath), "utf8");
}

function fileExists(relPath) {
  return fs.existsSync(path.join(root, relPath));
}

function httpGet(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => resolve(res.statusCode)).on("error", reject);
  });
}

async function run() {
  const html = read("kontekstnaya_reklama/index.html");

  assert(
    html.includes("Настройка и ведение контекстной рекламы"),
    "title/контент: должно содержать 'Настройка и ведение контекстной рекламы'",
  );

  assert(
    /<title>[^<]*Настройка и ведение контекстной рекламы[^<]*<\/title>/.test(html),
    "<title>: должен содержать 'Настройка и ведение контекстной рекламы'",
  );

  assert(
    /<h1[^>]*>\s*Настройка и(?:&nbsp;|\s+)ведение контекстной рекламы/.test(html),
    "<h1>: должен содержать 'Настройка и ведение контекстной рекламы'",
  );

  assert(
    html.includes("kontekstnaya-reklama-nuxt.bundle.css"),
    "HTML: один prod Nuxt CSS — /_sa/css/kontekstnaya-reklama-nuxt.bundle.css",
  );

  assert(
    html.includes("<!-- KONTEKST-CSS-BUNDLE-START"),
    "HTML: маркер KONTEKST-CSS-BUNDLE-START для сборки стилей",
  );

  assert(
    html.includes("<!-- KONTEKST-MAIN-START -->"),
    "HTML: маркер KONTEKST-MAIN-START — граница среза колонки (не indexOf по page-constructor из-за SVG)",
  );

  assert(
    html.includes("<!-- KONTEKST-MAIN-END -->"),
    "HTML: маркер KONTEKST-MAIN-END перед локальным footer",
  );

  assert(
    !html.includes('itemprop="image" src="/_sa/img/storage__">'),
    "HTML: не должно быть битого microdata image (storage__ без имени файла)",
  );

  assert(
    html.includes("css__home-snapshot__snapshot.bundle.css"),
    "HTML: нужен snapshot.bundle — иначе бургер-меню и контакты в потоке ломают вёрстку",
  );

  assert(
    html.includes("gradient-canvas"),
    "HTML: должен содержать canvas для градиентного фона",
  );

  assert(
    html.includes("jumbotron-img-aurora__title"),
    "HTML: должен содержать legacy hero-элемент .jumbotron-img-aurora__title",
  );

  assert(
    html.includes("header-full header-background desctop"),
    "HTML: должен содержать legacy .header-full.desctop для hero-блока",
  );

  assert(
    !html.includes("service-detail.css"),
    "HTML: не должен подключать service-detail.css (новый дизайн ломает parity)",
  );

  assert(
    !html.includes("kontekstnaya-reklama-parity.css"),
    "HTML: не подключать kontekstnaya-reklama-parity.css — стили из prod Nuxt",
  );

  assert(
    html.includes("cases-block__slider"),
    "HTML: кейсы — разметка prod (cases-block__slider)",
  );

  assert(
    html.includes("cases-block__swiper-slide"),
    "HTML: кейсы — слайды prod (cases-block__swiper-slide)",
  );

  assert(
    html.includes("mor-cases-slider") && html.includes('class="cases-block"'),
    "HTML: mor-cases-slider и секции cases-block (prod)",
  );

  assert(
    html.includes("Больше кейсов"),
    "HTML: заголовок блока «ещё кейсов» должен быть «Больше кейсов», как на prod more-cases-block",
  );

  assert(
    !html.includes("Кейсы комплексного маркетинга"),
    "HTML: не должно остаться ошибочного заголовка «Кейсы комплексного маркетинга»",
  );

  const manPath = "kontekstnaya_reklama/nuxt-css-manifest.json";
  assert(fileExists(manPath), `Отсутствует манифест ${manPath} (скачайте Nuxt CSS)`);
  const man = JSON.parse(read(manPath));
  const hrefs = man.hrefs || [];
  assert(hrefs.length === 1, "Манифест Nuxt CSS: один бандл (kontekstnaya-reklama-nuxt.bundle.css)");
  const chunks = man.sourceChunks || [];
  assert(chunks.length >= 10, "Манифест: sourceChunks должны перечислять исходные чанки prod");
  assert(
    typeof man.nuxtOrigin === "string" && man.nuxtOrigin.length > 0,
    "Манифест: поле nuxtOrigin (откуда скачивали чанки)",
  );

  const assets = [
    "css/css__home-snapshot__snapshot.bundle.css",
    "css/css__home-snapshot__overrides.parity-sync.css",
    "_sa/img/storage__xjhFEA49677OGQDTXjw6he9xnUh71ef9GgvspTHz.webp",
    "_sa/img/storage__aUi8YfnntliHTrn6OU6JOaCMEcOOY8NGt16t15Zh.webp",
    "_sa/img/storage__R16Tij6hzShVdtyA5ZbyTu0bM19BmNBE9eTlnQRT.png",
    "css/kontekstnaya-reklama-nuxt.bundle.css",
    "_sa/js/gradient-animation.min.js",
  ];

  for (const asset of assets) {
    assert(fileExists(asset), `Ассет отсутствует: ${asset}`);
  }

  const BASE = process.env.TEST_BASE_URL || "http://127.0.0.1:8765";

  try {
    const pageStatus = await httpGet(`${BASE}/kontekstnaya_reklama`);
    assert(pageStatus === 200, `HTTP-статус /kontekstnaya_reklama: ожидался 200, получен ${pageStatus}`);

    const cssStatus = await httpGet(`${BASE}/_sa/css/kontekstnaya-reklama-nuxt.bundle.css`);
    assert(cssStatus === 200, `HTTP-статус nuxt-prod CSS: ожидался 200, получен ${cssStatus}`);
  } catch (e) {
    if (e.code === "ECONNREFUSED") {
      console.warn("  [skip] dev-сервер недоступен, HTTP-проверки пропущены");
    } else {
      throw e;
    }
  }

  console.log("verify-kontekstnaya-reklama: ok");
}

run().catch((err) => {
  console.error(`verify-kontekstnaya-reklama: FAIL\n${err.stack || err.message}`);
  process.exit(1);
});

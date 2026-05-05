/**
 * Проверка скрипта неразрывных пробелов после коротких слов.
 * Запуск: npm run test:typography-nbsp
 */
const assert = (ok, msg) => {
  if (!ok) throw new Error(msg);
};

const {
  hasTypographyMarker,
  normalizeNbspInHead,
  processTypographyHtml,
  tieShortWordsInTextChunk,
} = require("./typography-nbsp.cjs");

(() => {
  assert(
    tieShortWordsInTextChunk("маркетинга в России").includes("в&nbsp;России"),
    "в + пробел + слово"
  );

  const agency = tieShortWordsInTextChunk("Маркетинговое агентство Serenity");
  assert(
    !agency.includes("агентство&nbsp;Serenity"),
    "не трогаем окончание «…о» перед латиницей"
  );

  assert(
    tieShortWordsInTextChunk("маркетинга в\nРоссии").includes("в&nbsp;России"),
    "в + перевод строки + слово"
  );

  const withMarker = '<html lang="ru" data-typography-nbsp="1"><body>в России</body></html>';
  const r1 = processTypographyHtml(withMarker);
  assert(r1.skipped && !r1.changed, "при маркере не меняем документ");

  const noMarker =
    '<html lang="ru"><head><title>Услуги в России</title></head><body><p>Услуги в России</p></body></html>';
  const r2 = processTypographyHtml(noMarker);
  assert(!r2.skipped && r2.changed, "без маркера — правки");
  assert(r2.html.includes("<title>Услуги в России</title>"), "в <title> без &nbsp;");
  assert(r2.html.includes("в&nbsp;России</p>"), "nbsp в теле страницы");
  assert(!r2.html.includes("&nbsp;</title>"), "title не содержит сущность nbsp");
  assert(hasTypographyMarker(r2.html), "маркер на html");

  const r3 = processTypographyHtml(r2.html);
  assert(r3.skipped && !r3.changed, "повторный прогон — без изменений");

  const scriptInner = '<html lang="ru"><body><script>var a = b < c && " в тесте "</script><p>и далее</p></body></html>';
  const r4 = processTypographyHtml(scriptInner);
  assert(r4.html.includes('var a = b < c'), "внутри script не трогаем");
  assert(r4.html.includes("и&nbsp;далее"), "вне script правим");

  const markedBadTitle =
    '<html lang="ru" data-typography-nbsp="1"><head><title>в&nbsp;России</title></head><body></body></html>';
  const r5 = processTypographyHtml(markedBadTitle);
  assert(r5.skipped && r5.changed, "маркер: только нормализация head");
  assert(r5.html.includes("<title>в России</title>"), "очистка nbsp в title при пропуске полного прогона");

  const headMetaNbsp = normalizeNbspInHead(
    '<head><meta name="x" content="в&nbsp;Москве и&nbsp;СПб" /></head>'
  );
  assert(
    headMetaNbsp.includes('content="в Москве и СПб"'),
    "normalizeNbspInHead: meta content без сущностей nbsp"
  );

  console.log("verify-typography-nbsp: ok");
})();

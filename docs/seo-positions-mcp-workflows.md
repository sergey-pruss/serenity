# SEO: позиции только своего сайта (MCP, скрипт, трекеры)

## Супер-кратко: что уже готово и что только вы

**Что видно из репозитория (MCP)**

- В `[.cursor/mcp.json](../.cursor/mcp.json)` подключены три сервера: `**google-search-console**`, `**yandex-webmaster**`, `**yandex-metrika**` — лаунчеры в `[scripts/mcp/](../scripts/mcp/)` (`run-google-search-console-mcp.sh`, `run-yandex-webmaster-mcp.sh`, `run-yandex-metrika-mcp.sh`).
- Лаунчеры при старте подключают `**secrets/mcp/env.sh**`, если файл есть (токены Яндекса и прочие переменные).
- Позиции во внешней выдаче (Яндекс/Google) по фиксированному списку фраз команда ведёт через **[Топвизор](https://topvisor.com/)** и импорт CSV в репозитории (`npm run seo:import-topvisor`, см. ниже), а не через отдельный MCP-трекер.
- Содержимое каталога `**secrets/**` в git не попадает, поэтому с моей стороны **нельзя проверить**, что токены реально записаны — это только на вашей машине.

**Команда `npm run seo:positions-report`**

- Запускается через `[scripts/seo/run-positions-report.sh](../scripts/seo/run-positions-report.sh)`: тоже подхватывает `**secrets/mcp/env.sh**`, поэтому **Яндекс** в отчёте использует тот же `**YANDEX_WEBMASTER_TOKEN`**, что и MCP Вебмастера.
- **Google:** отчёт читает **JSON сервисного аккаунта** `secrets/mcp/google-search-console-sa.json` (как в лаунчере MCP). Если GSC у вас в MCP работает **только через OAuth** (`gsc-oauth-desktop.json`) и файла SA нет — отчёт в терминале попросит SA; MCP при этом может работать. Тогда либо положите SA-ключ по пути выше, либо пользуйтесь только MCP для Google.

**MCP и только OAuth (без SA в Search Console):** установите Desktop JSON — `npm run mcp:gsc-install-oauth -- /путь/к/client_secret_….json` или `npm run mcp:gsc-sync-oauth` (см. `npm run mcp:gsc-help`). Лаунчер [`scripts/mcp/run-google-search-console-mcp.sh`](../scripts/mcp/run-google-search-console-mcp.sh) при наличии OAuth **не передаёт** SA, чтобы не ловить 403; при необходимости SA вместе с OAuth: `GSC_FORCE_SERVICE_ACCOUNT=1`.

**Продолжение после OAuth (слой GSC в ядро):**

- **Автоматически (рекомендуется):** в терминале **на своей машине** (не в фоне агента — нужен браузер):
  - **`npm run seo:pull-gsc-home-into-core`** — OAuth через [`@google-cloud/local-auth`](https://www.npmjs.com/package/@google-cloud/local-auth), выгрузка запросов по страницам с `https://serenity.agency/` за ~90 дней → [`json/seo/sources/gsc-home-queries.json`](../json/seo/sources/gsc-home-queries.json) → слияние в [`json/seo/semantic-core.json`](../json/seo/semantic-core.json) (`notes: gsc`). Переменные: `GSC_SITE_URL`, `GSC_HOME_FILTER`, `REPORT_START_DATE`, `REPORT_END_DATE`.
  - Отдельно: **`npm run seo:fetch-gsc-home-queries`** (только выгрузка) и **`npm run seo:merge-gsc-core`** (только merge).
- **Вручную через MCP:** `get_search_analytics` с `filter_page` на главную → вставить строки в `gsc-home-queries.json` → **`npm run seo:merge-gsc-core`**.

Проверка: **`npm run test:semantic-core`**.

**Уже сделано в репозитории**

- Рабочий файл ядра: `[json/seo/semantic-core.json](../json/seo/semantic-core.json)` — откройте и **допишите свои запросы** (по одному в `query`, группа в `cluster`, важность 1–5 в `priority`).
- Отчёт по Google (и по Яндексу, если есть токен): в корне проекта в терминале команда `npm run seo:positions-report` → результат в папке `artifacts/seo/` (файл `positions-report-…json`).

**Сделать только вам — у робота нет доступа к вашему Google**

1. Откройте в браузере: [Google Cloud Console](https://console.cloud.google.com/) → включите API **Google Search Console API** (раздел APIs & Services → Library).
2. Создайте **сервисный аккаунт** → вкладка **Keys** → **Add key** → **JSON**. Сохраните файл **точно** сюда: `secrets/mcp/google-search-console-sa.json` (папки `secrets/mcp/` нет — создайте).
3. В терминале в корне проекта: `npm run mcp:gsc-email` — скопируйте показанный **email** вида `…@….iam.gserviceaccount.com`.
4. Откройте: [Google Search Console](https://search.google.com/search-console) → свойство **serenity.agency** → **Настройки** → нажмите строку **«Пользователи и разрешения»** → **Добавить пользователя** → вставьте email → роль **Полный** (если API пустой — не «только чтение», а полный или как в подсказке GSC).
5. Снова в терминале: `npm run seo:positions-report` — откройте созданный JSON в `artifacts/seo/`.

**Яндекс (по желанию)** — если для MCP вы уже настраивали `YANDEX_WEBMASTER_TOKEN` в `secrets/mcp/env.sh`, отчёт подхватит Яндекс автоматически. Иначе отчёт будет **только по Google** — этого достаточно для старта.

Полная пошаговая справка по ключу GSC (тот же сценарий, что выше): `npm run mcp:gsc-help`.

---

Канонический формат: [json/seo/semantic-core.schema.json](../json/seo/semantic-core.schema.json). Образец полей: [json/seo/semantic-core.example.json](../json/seo/semantic-core.example.json). Редактируемый файл ядра: `[json/seo/semantic-core.json](../json/seo/semantic-core.json)` (если список секретный — не коммитьте в git).

Нормализация строки запроса для join: [scripts/seo/lib/normalize-query.mjs](../scripts/seo/lib/normalize-query.mjs) — NFKC, trim, lower case, NBSP → пробел, схлопывание пробелов.

## Сценарии в Cursor через MCP

Перед вызовами: `bash scripts/mcp/bootstrap.sh`, токены в `secrets/mcp/env.sh`, для GSC см. `npm run mcp:gsc-help`. Подсказка по доступу GSC: [docs/team-handbook.html](team-handbook.html) (раздел про Search Console).

### 1. Сравнение периодов по Google (победители / проигравшие)

Инструмент MCP: `get_search_analytics` (сервер **google-search-console**).

- Укажите `site_url` (например `sc-domain:serenity.agency` или `https://serenity.agency/` — как в свойстве GSC).
- `dimensions`: `["query"]` или `["date","query"]` для динамики.
- `compare_period`: `previous_period` или `year_over_year`.
- При необходимости `filter_query` для подстроки по кластеру из ядра.

Промпт агенту: «Вызови get_search_analytics для нашего сайта за последние 28 дней с compare_period=previous_period, dimensions [query], row_limit 200; выдели запросы с наибольшим падением и ростом avg position при заметных impressions.»

### 2. Фильтр по кластеру (через подстроку запроса)

Если кластер в ядре не совпадает с текстом запроса в GSC, фильтруйте по характерным морфемам бренда/услуги через `filter_query` или `filters` с `dimension: query`, `operator: includingRegex`.

Промпт: «Для site_url … dimensions [query], filter_query …; верни топ по clicks и отдельно топ по impressions с position.»

### 3. Яндекс: популярные запросы и позиции

Инструменты MCP: `list-hosts` → `host_id`, затем `get-popular-queries` (сортировка `TOTAL_SHOWS` или `TOTAL_CLICKS`) и при необходимости `get-query-history` для агрегированной динамики.

Промпт: «Сначала list-hosts, выбери хост serenity.agency, затем get-popular-queries с date_from/date_to за последние 14 дней, limit 300; отметь запросы с лучшей AVG_SHOW_POSITION из ответа.»

(Точные имена инструментов совпадают с дескрипторами MCP: `get-popular-queries`, `list-hosts`.)

## Автоматизация без Cursor

```bash
# из корня репозитория, после копирования semantic-core.json
export GSC_SERVICE_ACCOUNT_KEY_FILE="$PWD/secrets/mcp/google-search-console-sa.json"
# опционально:
export YANDEX_WEBMASTER_TOKEN="…"   # как в secrets/mcp/env.sh
npm run seo:positions-report
```

Артефакт по умолчанию: `artifacts/seo/positions-report-<timestamp>.json` (каталог в `.gitignore`).

Переменные окружения: `SEMANTIC_CORE_PATH`, `GSC_SITE_URL`, `REPORT_START_DATE`, `REPORT_END_DATE`, `SEO_REPORT_DIR`, `YANDEX_WEBMASTER_HOST_ID` (если авто-подбор хоста не подошёл). `**SEO_SKIP_GSC=1**` — не дергать Google API (только Яндекс из `env.sh`); удобно при 403 у SA или для быстрой проверки. Команда-обёртка: `**npm run seo:positions-report:yandex-only**`.

Проверка примера ядра в CI: `npm run test:semantic-core`.

GitHub Actions: [.github/workflows/seo-positions-report.yml](../.github/workflows/seo-positions-report.yml) — ручной запуск; задайте секреты `GSC_SERVICE_ACCOUNT_JSON` (полный JSON ключа SA) и при необходимости `YANDEX_WEBMASTER_TOKEN`.

## Платный rank-tracker (когда в панелях «дыры» по ядру)

Официальные API GSC/Яндекс не показывают часть запросов с низким числом показов. Если по важным фразам из `semantic-core.json` часто `panelGap`, подключите один внешний трекер с API и **склеивайте** выгрузку по тому же `normalizeQueryForJoin`:


| Сервис                                                                           | Зачем                                                                 |
| -------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| [Topvisor](https://topvisor.com/)                                                | Мониторинг позиций и аудит (Яндекс/Google, РФ); в этом репо — импорт **CSV** или **XLSX** (первый лист) через `npm run seo:import-topvisor*`. |
| [SE Ranking](https://seranking.com/)                                             | Трекинг + API на коммерческих тарифах (лимиты уточнять в тарифах).    |
| [Rush Analytics](https://rush-analytics.ru/) и др.                               | Альтернативы при других процессах команды.                            |

### Топвизор: отбор 50–100 фраз и CSV

Критерии по умолчанию для старта:

- **Волна A** (`--preset wave-a`): только `priority` **1–2** (самые важные; в текущем ядре это порядка **24** фраз).
- **Первая пятидесятка** (`--preset tracked-50`): `priority` **≤ 3**, сортировка по приоритету и фразе, затем **первые 50** строк — удобно под недельный съём в трекере.

Команды из корня репозитория:

```bash
npm run seo:export-topvisor-queries -- --preset wave-a
npm run seo:export-topvisor-queries -- --preset tracked-50
```

CSV по умолчанию: `artifacts/seo/topvisor-queries-<preset>.csv` (каталог в `.gitignore`). Один столбец `query` — обычно достаточно для импорта в Топвизор; расширенный вид: `--columns query,priority,cluster`; для Excel: `--bom`.

Урезанное ядро для `npm run seo:positions-report` (тот же список, что в CSV):

```bash
npm run seo:export-topvisor-queries -- --preset tracked-50 --write-core artifacts/seo/semantic-core-tracked.json
SEMANTIC_CORE_PATH="$PWD/artifacts/seo/semantic-core-tracked.json" npm run seo:positions-report
```

Справка по всем флагам: `npm run seo:export-topvisor-queries -- --help`.

**Импорт выгрузки Топвизора (CSV или XLSX → JSON, опционально слияние с отчётом панелей)**

Файл **`.xlsx`**: читается **первый лист**. Для **`.csv`**: кодировка **UTF-8** в [настройках аккаунта](https://topvisor.com/ru/support/account/settings/) снижает риск «кракозябр» в Excel; скрипт с **`--encoding auto`** также пробует **cp1251** для CSV.

1. В Топвизоре: «Проверка позиций» → экспорт **CSV** или **XLSX** (нужная таблица на **первом** листе книги).
2. Сначала проверка колонок без записи большого файла:

   ```bash
   npm run seo:import-topvisor -- --input /путь/к/export.csv --dry-run
   ```

   Если колонка с фразой не угадалась, укажите заголовок **точно как в первой строке таблицы**: `--query-column "Ключ"` (или как у вас в файле).

3. Импорт в `artifacts/seo/topvisor-import-<дата>.json` (join с `semantic-core` по `normalizedKey` для `cluster` / `priority` / `targetUrl`):

   ```bash
   npm run seo:import-topvisor -- --input /путь/к/export.csv
   ```

4. Дописать позиции Топвизора в уже снятый отчёт `npm run seo:positions-report` (файл `positions-report-*.json`):

   ```bash
   npm run seo:import-topvisor -- --input /путь/к/export.csv --merge-report artifacts/seo/positions-report-ВАШ_ФАЙЛ.json
   ```

   На выходе: `artifacts/seo/positions-report-with-topvisor-<дата>.json`. Строки отчёта без совпадения в выгрузке **сохраняют** прежний блок `topvisor` (если был).

Справка: `npm run seo:import-topvisor -- --help`. Флаги **`--delimiter`** и **`--encoding`** относятся только к **CSV**; для XLSX в JSON-метаданных `delimiter` и `encoding` будут `null`.

**Аудит Топвизора: проблемные страницы (CSV или XLSX «Страницы» → JSON)**

Экспорт из раздела аудита со списком URL и счётчиками `? warnings`, `? errors`, `!! problems` (колонки могут называться так же, как в интерфейсе). Для **CSV** часто **Windows-1251** — скрипт с **`--encoding auto`** сам берёт UTF-8, если в начале файла видно «Код ответа», иначе декодирует как **cp1251** (зависимость `iconv-lite`). Для **XLSX** читается первый лист.

```bash
npm run seo:import-topvisor-audit -- --input ~/Downloads/pages.csv --sort problems
# или: --input ~/Downloads/pages.xlsx
```

По умолчанию: `artifacts/seo/topvisor-audit-pages-<timestamp>.json` (компактно: URL, `statusRaw`, числа, `auditedAt`). Полные колонки по каждой строке: `--with-raw-columns`. Явная кодировка: `--encoding utf8` или `--encoding cp1251`.

Справка: `npm run seo:import-topvisor-audit -- --help`.

**Топвизор: ссылки без анкоров (`links.csv` / `links.xlsx` → JSON)**

Экспорт отчёта по ссылкам (колонки вроде «Код ответа», URL, «Стр.», «Текст (анкор)», «Текст (title)», rel-флаги, TTFB мс). Кодировка: тот же **`--encoding auto`**, что у аудита страниц.

```bash
npm run seo:import-topvisor-links -- --input ~/Downloads/links.csv --sort ttfb
```

Только ссылки на ваш домен: `--only-host serenity.agency`. Только пустой анкор в выгрузке: `--empty-anchor-only`. Справка: `npm run seo:import-topvisor-links -- --help`.

**Топвизор: изображения без alt (`images.csv` / `images.xlsx` → JSON)**

Экспорт вкладки изображений / ресурсов. Автоопределение: две колонки **`URL`** (страница и файл), либо **`URL`** + **`Адрес изображения`**, плюс при наличии **`Alt`**, **`Размер`**, **`Код ответа`**. Если шаблон столбцов другой — **`--dry-run`**, затем **`--page-url-column`** / **`--image-url-column`** / **`--alt-column`** (строка **точно как в заголовке CSV**).

```bash
npm run seo:import-topvisor-images -- --input ~/Downloads/images.csv --empty-alt-only --only-host serenity.agency
```

Справка: `npm run seo:import-topvisor-images -- --help`.

**Топвизор: проблемные скрипты (`js.csv` / `js.xlsx` → JSON)**

Колонки вроде **`Код ответа`**, **`URL страницы`** (если есть), **`URL`** или **«Адрес скрипта»**, **`? warnings` / `? errors` / `!! problems`**, **`TTFB мс`**. Две колонки **`URL`** подряд — первая считается страницей, вторая скриптом (если нет явного «URL страницы»).

```bash
npm run seo:import-topvisor-js -- --input ~/Downloads/js.csv --sort problems --only-script-host serenity.agency
```

Явные заголовки: `--script-url-column "…"` и при необходимости `--page-url-column "…"`. Проверка колонок: `--dry-run`. Справка: `npm run seo:import-topvisor-js -- --help`.

**Топвизор: проблемные CSS (`css.csv` / `css.xlsx` → JSON)**

Те же идеи, что для JS: **`URL страницы`** + **`URL`**, либо две колонки **`URL`**, либо явный адрес стилей. Счётчики **`? warnings` / `? errors` / `!! problems`**, **`TTFB мс`**.

```bash
npm run seo:import-topvisor-css -- --input ~/Desktop/css.csv --sort problems --only-css-host serenity.agency
```

`--css-url-column`, `--page-url-column`, `--dry-run`, `--with-raw-columns`. Справка: `npm run seo:import-topvisor-css -- --help`.

Паттерн интеграции: экспорт/API трекера → CSV/JSON с колонками `query`, `position_google`, `position_yandex`, `checked_at` → маленький join-скрипт (по желанию — рядом с `fetch-positions-report.mjs`, общая нормализация из `lib/normalize-query.mjs`).

## SEO-дашборд позиций (топ-20, dev-static)

Команда ведёт **страницы → до 3 запросов → позиция в органике топ-50** (ручная SERP-съёмка) по Яндекс/Google и регионам **Москва / СПб / Россия**. Источник правды: [`json/seo/rank-dashboard.json`](../json/seo/rank-dashboard.json). HTML после сборки: [`docs/seo-rank-dashboard.html`](seo-rank-dashboard.html) (только **static.serenity.agency** / Worker после `bash scripts/deploy-dev.sh`).

**Еженедельный ритуал (на своей машине, с браузером):**

1. Интерактивная SERP-съёмка (капча в Chromium, Enter в терминале):

   ```bash
   npm run seo:rank-dashboard:serp:interactive
   ```

   Скрипт обходит все комбинации страниц/запросов/ПС/регионов, ищет `serenity.agency` в топ-20 и пишет снимок с датой `RANK_CHECK_DATE` (по умолчанию сегодня). Продолжить с пропуском уже записанных ячеек: `SERP_RESUME=1`. Пропуск ячеек: `SERP_SKIP_KEYS=home|brand|yandex|moscow`. В интерактиве между запросами пауза ~4–6 с (`SERP_CELL_DELAY_MS`, `SERP_DELAY_JITTER_MS`); при частой капче — увеличить, например `SERP_CELL_DELAY_MS=6000 SERP_DELAY_JITTER_MS=3000`.

2. Ручная правка одной ячейки:

   ```bash
   npm run seo:rank-dashboard:record -- --date 2026-05-18 --page home --query brand \\
     --engine yandex --region moscow --position 8
   ```

   Вне топ-20: `--out-of-top20` вместо `--position`.

3. После интерактивной съёмки (`serp:missing` / `serp:interactive`) скрипт сам запускает `seo:rank-dashboard:build`, `test:rank-dashboard` и `bash scripts/deploy-dev.sh`. Отключить: `RANK_DASHBOARD_SKIP_DEV_DEPLOY=1`. Для `serp:full` deploy один раз в конце `finish` (панели GSC/Я.ВМ уже в HTML).

4. Коммит `json/seo/rank-dashboard.json` + `docs/seo-rank-dashboard.html` при необходимости в git. Дашборд на dev:  
   `https://static.serenity.agency/docs/seo-rank-dashboard.html`

**Добавить страницу или запрос:** отредактируйте `json/seo/rank-dashboard.json` (до 2 запросов на страницу), затем `npm run seo:rank-dashboard:build`. Схема: [`json/seo/rank-dashboard.schema.json`](../json/seo/rank-dashboard.schema.json).

**Колонки GSC и Я.ВМ (без капчи):** те же API, что MCP Search Console и Вебмастер — средняя позиция за ~28 дней, **без** разбивки Москва/СПб/РФ (сравнивать с SERP осторожно):

```bash
npm run seo:rank-dashboard:panels
npm run seo:rank-dashboard:build
```

Нужны `secrets/mcp/env.sh` (`YANDEX_WEBMASTER_TOKEN`) и GSC через **OAuth Desktop** (`secrets/mcp/gsc-oauth-desktop.json`, как MCP — см. `npm run mcp:gsc-help`) или SA-ключ. `SEO_SKIP_GSC=1` — только Яндекс. Период: `REPORT_START_DATE` / `REPORT_END_DATE`.

**Ниже на странице дашборда** — блоки «Популярные запросы» (топ-50) и «Страницы из поиска» (топ-10): GSC `dimensions: query|page`; Яндекс — `get-popular-queries` + страницы через **Метрику** (органика, `ym:s:startURL`) с показами/кликами **Вебмастера** по связанным фразам. Нужны `YANDEX_WEBMASTER_TOKEN` и `YANDEX_METRIKA_TOKEN` в `secrets/mcp/env.sh`. Лимиты: `RANK_DASHBOARD_POPULAR_LIMIT=50`, `RANK_DASHBOARD_POPULAR_PAGES_LIMIT=10`.

## Кластер «главная» (пересборка ядра)

- Команда: `**npm run seo:gen-semantic-core-home`** — перезаписывает `[json/seo/semantic-core.json](../json/seo/semantic-core.json)` кластером `**главная**` с `targetUrl` на корень сайта, дедуп по `[scripts/seo/lib/normalize-query.mjs](../scripts/seo/lib/normalize-query.mjs)`. Перед коммитом при необходимости отредактируйте списки в `[scripts/seo/gen-semantic-core-home.mjs](../scripts/seo/gen-semantic-core-home.mjs)` (слои `meta` / `ywm` / `wordstat`).
- Снимок топа Яндекс Вебмастера, по которому сверялся генератор: `[json/seo/sources/yandex-popular-serenity-agency_2026-02-01_2026-04-30.json](../json/seo/sources/yandex-popular-serenity-agency_2026-02-01_2026-04-30.json)`.
- **GSC по главной:** если `get_search_analytics` или `npm run seo:positions-report` дают **403**, у сервисного аккаунта нет прав на свойство `sc-domain:serenity.agency` — добавьте пользователя в Search Console (см. `npm run mcp:gsc-help`). После выгрузки запросов с `filter_page` на главную допишите строки в ядро вручную или расширьте генератор.

## Не делать

Парсинг HTML выдачи Google/Яндекса как **основной** источник: хрупко, риск блокировок и нарушения правил сервисов. Для «истины по своему сайту» сначала GSC + Вебмастер; трекер — для фиксированного списка и низких показов.
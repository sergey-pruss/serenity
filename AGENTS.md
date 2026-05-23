# Обязательные правила для агентов

**Этот файл — единственный источник регламента:** тесты, выкладка, три поверхности, кэш, CSS, кейсы, коммиты. Не дублируйте полные чеклисты в других местах — достаточно ссылки сюда.

**URL, роутинг, SEO и аналитика простым языком (нарратив без полного регламента деплоя) —** `[docs/team-handbook.html](docs/team-handbook.html)`.

---

## Перед любой выкладкой

Перед деплоем агент обязан явно уточнить у пользователя один из трёх вариантов и действовать только после ответа:

- **DEV** — `bash scripts/deploy-dev.sh`: выкладка в отдельный dev-root `/var/www/static-dev/` для `https://static.serenity.agency` и деплой Worker `https://serenity.sergeyprus.workers.dev`.
- **PROD** — `bash scripts/deploy-prod.sh` (или `./deploy.sh`): выкладка только в prod-root `/var/www/static/` для `https://serenity.agency`; Worker этим шагом не обновляется.
- **ВЕЗДЕ** — сначала DEV, затем PROD, с релевантными тестами и проверками обеих поверхностей.

Нельзя считать фразы вроде «залей», «выложи», «загрузи на сервер» достаточным разрешением: если поверхность не названа явно, спросить **DEV / PROD / ВЕЗДЕ**. Нельзя подменять `deploy-dev.sh` ручным `rsync` в prod-root.

---

## Изменение конфигов Nginx и маршрутизации

Перед **любой** правкой в репозитории (и перед коммитом) файлов:

- `nginx/routing.conf` (карта `map $uri $is_new_page` — какой URL на **serenity.agency** отдаёт статику, а какой уходит в legacy);
- `nginx/serenity-router.live.conf`, `nginx/static.serenity.agency.live.conf` и другие `nginx/*.live.conf`;
- `json/nginx-edge-intercepts.json`;
- `wrangler.toml` — если меняются маршруты, влияющие на поведение Worker.

агент **обязан сначала спросить пользователя**:

> Точно меняем конфиг? (да / нет)

и кратко перечислить суть правки (какой URL, какое правило). **Без явного «да»** или без формулировки в задаче уровня «добавь в `routing.conf` …», «включи `/path/` на статике» — **не менять** эти файлы.

**Не считать** подтверждением: появление статической страницы в репо, ссылки в блоге на `/targeting` или аналогию с уже включённой `/kontekstnaya_reklama`. Go-live маршрута на проде — **отдельное** решение от контента и от `deploy-prod.sh`.

### Канон URL страниц услуг (статика)

- **Без завершающего слэша** (sitemap, canonical, `href`, nginx 301 с `/…/`): главная **`https://serenity.agency`**, `/blog`, `/blog/…`, `/case/all`, `/services`, `/targeting`, `/kontekstnaya_reklama` и пагинация/категории. Подстраницы **`/services/…`** (кроме листинга `/services`) — legacy.
- Проверка: `npm run test:static-canonical-urls`; в цепочке `test:routing-config`. После деплоя vhost: `ORIGIN=https://serenity.agency npm run test:static-canonical-urls`. Правило Cursor: [`.cursor/rules/service-pages-canonical-no-slash.mdc`](.cursor/rules/service-pages-canonical-no-slash.mdc).

Правки конфига **не смешивать** в одном коммите с несвязанными задачами (блог, вёрстка, SEO-тексты), если пользователь отдельно не попросил один релиз «контент + маршрут».

После подтверждения и правки в git выкладка на сервер — по таблице ниже (`deploy-routing.sh`, vhost-скрипты) и только с явным **DEV / PROD / ВЕЗДЕ** (см. «Перед любой выкладкой»).

Краткое правило для Cursor: [`.cursor/rules/nginx-config-confirm.mdc`](.cursor/rules/nginx-config-confirm.mdc).

---

## Только новый сервер (статический контур)

Все шаги выкладки из этого регламента относятся **только к новому серверу** со статикой и Nginx-роутером: `**bash scripts/deploy-dev.sh`** (превью **static.serenity.agency**, отдельный каталог `**/var/www/static-dev/`** + Worker), `**bash scripts/deploy-prod.sh`** (основной **serenity.agency**, каталог `**/var/www/static/`**), корневой `**deploy.sh`** (= `**deploy-prod.sh`**), `**bash scripts/deploy-routing.sh**`, `**bash scripts/deploy-serenity-router-vhost.sh**`, `**bash scripts/deploy-static-vhost.sh**` работают с **этой** машиной и Nginx-конфигами на ней.

**Dev и prod разнесены:** `**deploy-dev.sh`** по умолчанию пишет в `**/var/www/static-dev/`** и обновляет Worker staging; `**deploy-prod.sh`** по умолчанию пишет в `**/var/www/static/`** и Worker не трогает. `**static.serenity.agency`** должен смотреть на `**/var/www/static-dev`** через `nginx/static.serenity.agency.live.conf`; `**serenity.agency`** — на `**/var/www/static`** через `nginx/serenity-router.live.conf`. Переопределять `**DEPLOY_REMOTE_PATH`** можно только осознанно и после явного подтверждения поверхности деплоя. Алиас прежнего имени: `**bash scripts/deploy-static-preview.sh**` = `**deploy-dev.sh**`.

### Каталог `docs/` (только dev)

- **Выкладка:** каталог `**docs/**` в репозитории попадает на сервер **только** через `**bash scripts/deploy-dev.sh**` → `**/var/www/static-dev/docs/**` (**static.serenity.agency**, Worker staging). `**deploy-prod.sh**` задаёт `DEPLOY_EXCLUDE_DOCS=1`: rsync **без** `docs/`, затем удаление `**/var/www/static/docs/**` на prod-origin.
- **serenity.agency:** в `**nginx/serenity-router.live.conf**` префикс `**/docs/**` → **HTTP 404** (не legacy, не статика). В `**nginx/routing.conf**` **нет** правила `~^/docs(/|$)`.
- **robots продакшена:** в `**robots.production.txt**` и корневом `**robots.txt**` **нет** `Disallow: /docs/` — каталога на проде нет.
- **Ссылка для команды:** после dev-деплоя, например `https://static.serenity.agency/docs/team-handbook.html`.

**Старый основной хост WordPress (legacy)** из этого репозитория **не трогаем**: туда нет `rsync`, нет деплоя темы/плагинов и правок PHP. Он участвует в схеме только как **upstream за прокси** в конфиге Nginx **на новом** сервере — менять эту границу можно только осознанно (файлы в `nginx/`, тесты, выкладка на **новый** сервер).

---

## Почему прод не обновляется «сам» после правок в репозитории

Прод-сайт живёт на **отдельной машине** с Nginx и каталогом `/var/www/static`. Изменения в git **никак не затрагивают** её, пока кто‑то с доступом по SSH не выполнит `**bash scripts/deploy-prod.sh`** и при необходимости скрипты Nginx (см. таблицу ниже). `**deploy-dev.sh`** не должен обновлять prod-root.

Если `**https://serenity.agency/robots.txt**` выглядит как правила **WordPress** — запрос почти наверняка уходит в **legacy**, а не в файлы статики **нового** сервера из репо. Префикс `**/docs/**` на **serenity.agency** после актуального vhost даёт **404**; живые справочники — только на **static.serenity.agency** / Worker после `**deploy-dev.sh**`.

**Это не блокируют правила Cursor** — их можно менять через файлы в `[.cursor/rules/](.cursor/rules/)`; они лишь подсказывают агенту читать этот регламент. Реальное ограничение — **отсутствие выкладки на сервер**, а не IDE.

### Почему агент не «чинит» прод из задачи по умолчанию

У агента в среде **нет SSH-ключа** и доверия к вашему серверу. Исполнитель (или CI с секретами) выкладывает изменения **со своей машины**, где настроен доступ: `**bash scripts/deploy-prod.sh`**, `**bash scripts/deploy-dev.sh`**, `**bash scripts/deploy-routing.sh**`, `**bash scripts/depl**выложи на dev**oy-serenity-router-vhost.sh**` и т.д. Без этого шага прод остаётся прежним, даже если коммит уже в `main`.

---

## Три поверхности выкладки (один артефакт в репозитории)


| Поверхность                                   | Как обновить контент                                                                                                                                                                                             |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `**https://serenity.agency`**                 | Статика с диска `/var/www/static` + Nginx-роутер; без `**scripts/deploy-prod.sh`** (или ручного rsync туда же после явного выбора PROD) и корректного vhost пользователи могут продолжать видеть legacy. |
| `**https://static.serenity.agency**`          | Dev-статика с диска `/var/www/static-dev` на том же сервере; для проверки превью — `**bash scripts/deploy-dev.sh**` (rsync в dev-root + purge CDN превью). Отдельно при необходимости — vhost превью: `**bash scripts/deploy-static-vhost.sh**`. |
| `**https://serenity.sergeyprus.workers.dev**` | Worker staging: обновляется в составе `**bash scripts/deploy-dev.sh`** через `**npx wrangler deploy`**. При ручном деплое Worker всё равно считать это DEV-поверхностью. |


**Итого:** изменения только в GitHub без выкладки на сервер **не изменят** `serenity.agency` и `static.serenity.agency`.

---

## Канонический чеклист: сборка, тесты, выкладка

Делайте **только релевантные вашей задаче шаги**; порядок в типичном релизе:

1. **Сборка** (если трогали шаблоны HTML или данные кейсов): `npm run build:html` (в конце цепочки — `**npm run build:sitemap**`: актуальный `**sitemap.xml**` из `**blog/**` на диске + прежние основные URL, затем `**apply:sitemap-policy**`); только карта сайта — `**npm run build:sitemap**`. При нужде — см. другие скрипты из `package.json` и `**npm run build:cases`** для оверлея кейсов. Внутри **npm run build:html** шаг **npm run build:blog-prereq** начинается с **node scripts/build-blog-data.mjs**: лента **json/blogs-all.json** = merge ответа API и **json/blog-posts-manual.json** (ручные карточки в начале, дубликаты по **href** с API удаляются) — подробнее § «Блог: ручные посты» и § «Добавление новой статьи» ниже.
2. **Тесты перед выкладкой**
  - Всегда по контексту релиза: `**npm run test:layout-smoke`**, `**npm run test:routing-config`**. В **layout-smoke** входит **`npm run test:sa-img-disk`**: все пути `/_sa/img/…` из собранного HTML и ключевых JSON существуют на диске; запрещена комбинация **`fetchpriority="high"`** и **`loading="lazy"`** на одном `<img>` (иначе приоритет загрузки противоречит отложенной загрузке).
  - После изменений кейсов и карточек: `**npm run test:case-all**` и визуально `**case/all**` на всех трёх поверхностях (после выкладки).
3. **Статика на сервер**: после явного выбора поверхности. **DEV**: `**bash scripts/deploy-dev.sh`** → rsync в `/var/www/static-dev/`, purge CDN превью и Worker staging. **PROD**: `**bash scripts/deploy-prod.sh`** → rsync в `/var/www/static/` для основного **serenity.agency**; Worker этим шагом не обновляется.
4. **Nginx «карта» маршрутизации** (если менялся `**nginx/routing.conf`**, включая признаки «новая страница» для `/robots.txt`, `/sitemap.xml`): `**bash scripts/deploy-routing.sh`**.
5. **Продовый vhost основного домена** (если менялся `**nginx/serenity-router.live.conf`**): `**bash scripts/deploy-serenity-router-vhost.sh`** (или ручное копирование в конфиг сервера, затем `nginx -t` и reload).
6. **Vhost превью static** (если менялся `**nginx/static.serenity.agency.live.conf`**): `**bash scripts/deploy-static-vhost.sh`**.
7. **Worker**: DEV-деплой обновляет Worker автоматически через `**npx wrangler deploy`**. Отдельный `**npx wrangler deploy`** — только после явного выбора DEV или ВЕЗДЕ.
8. **Git**: `**git push`** уже после принятого для команды набора команд (сообщение коммита — **на русском**).

Краткая таблица «что изменил → что выполнить»:


| Изменено                                     | Обязательно дополнительно                                                                                                           |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| HTML/кейсы/статика репозитория               | После выбора поверхности: `**deploy-dev.sh`** для static + Worker; `**deploy-prod.sh`** (или `**deploy.sh`**) для prod; при сборке из шаблонов — см. шаги 1 и 2 |
| `**nginx/routing.conf**`                     | `deploy-routing.sh`                                                                                                                 |
| `**nginx/serenity-router.live.conf**`        | `deploy-serenity-router-vhost.sh`                                                                                                   |
| `**nginx/static.serenity.agency.live.conf**` | `deploy-static-vhost.sh`                                                                                                            |
| Worker / конфиг Wrangler                     | `npx wrangler deploy`                                                                                                               |


Подробности маршрутизации `**/robots.txt**`, `**/docs/**` и legacy — `**[docs/team-handbook.html](docs/team-handbook.html)**`.

Со страниц legacy WordPress ссылка на листинг блога часто приходит как `**/blog**` без завершающего слэша. Канон — `**/blog/**`: редирект, `**sub_filter**` и перехват клика в `**nginx/serenity-router.live.conf**` (тот же приём, что для `**/case/all/**`). При правках vhost поддерживайте инварианты в `**scripts/verify-routing-config.cjs**` и гоняйте `**npm run test:routing-config**`.

Со страниц legacy WordPress ссылка на листинг блога часто приходит как **`/blog`** без завершающего слэша. Канон — **`/blog/`**: редирект, **`sub_filter`** и перехват клика в **`nginx/serenity-router.live.conf`** (тот же приём, что для **`/case/all/`**). При правках vhost поддерживайте инварианты в **`scripts/verify-routing-config.cjs`** и гоняйте **`npm run test:routing-config`**.

---

## Архитектура и интеграции

- Агентство: Serenity (serenity.agency).
- Репозиторий: [https://github.com/sergey-pruss/serenity](https://github.com/sergey-pruss/serenity).
- Папка проекта: `~/GitHub/serenity`.
- Новый сервер статического контура: `168.222.142.141`, каталог: `/var/www/static`.
- Legacy WordPress: отдельный upstream, из этого репозитория не деплоится (только проксируется Nginx-роутером на новом сервере).
- Прод-URL: `https://serenity.agency`.
- Статик-превью: `https://static.serenity.agency`.
- Worker staging (ASSETS): `https://serenity.sergeyprus.workers.dev`.
- Статика нового сайта в проде должна идти через префикс `/_sa/`; корневые `/css`, `/js`, `/img`, `/json` под legacy не занимаем.
- Основной обработчик Worker: `src/worker.mjs`; API формы: `src/lead-api.mjs`.

### Паритет страницы «Контекстная реклама» (Nuxt-эталон → статика в этом репо)

- **Репозиторий SerenityAgency (старый Nuxt) из задач по `serenity` не правится:** нет патчей и коммитов агентом; эталон — только URL, который пользователь поднимает у себя (`npm run dev` и т.д. в своей копии SerenityAgency).
- **Две «локалки»:** `serenity` — `npm run dev` статики; SerenityAgency — отдельный процесс Nuxt (часто порт 4333). Агент не заменяет запуск Nuxt на машине пользователя.
- **Три артефакта паритета:** (1) срез DOM `page-constructor`…`footer-modern` — по умолчанию из `tmp/kontekst-prod-full.html` после capture (`KONTEKST_LAYOUT_SOURCE=auto|full|parity`, см. `scripts/assemble-kontekstnaya-from-prod-layout.cjs`); (2) один Nuxt CSS-бандл и `kontekstnaya_reklama/nuxt-css-manifest.json` — `scripts/download-nuxt-css-prod-kontekstnaya.cjs`; (3) пути и ассеты под `/_sa/` и тест `npm run test:kontekstnaya-reklama`.
- **Локальные блоки поверх среза (как на главной):** FAQ «Вопрос-ответ» — `html/partials/services/faq-kontekstnaya-reklama.html` + `css/sections/kontekstnaya-faq.css` + `js/kontekstnaya-spoilers.js`; также partials наград / кейсов / синергии — всё подставляет `assemble-kontekstnaya-from-prod-layout.cjs` (тексты FAQ и JSON-LD править в partial, не в `tmp/`).
- **Переменные захвата:** `KONTEKST_CAPTURE_URL` — полный URL страницы для Playwright (`scripts/capture-prod-kontekst-full-html.cjs`); `KONTEKST_NUXT_ORIGIN` — origin для скачивания `/_nuxt/css/*.css`. В `npm run refresh:kontekstnaya-from-local-nuxt`, если `KONTEKST_NUXT_ORIGIN` не задан, он **берётся из origin `KONTEKST_CAPTURE_URL`** (удобно при смене порта). Цепочка prod: `npm run refresh:kontekstnaya-from-prod`.
- **Проверка UI:** не полагаться только на встроенный браузер IDE; `curl -I` на dev-URL и внешний браузер (Console/Network). Проблемы Nuxt/API — вне зоны правок `serenity`.
- **`kontekstnaya-reklama-parity.css`:** при подключении через `*-static-stack.css` обязательны override для desc/tablet/slider (см. [.cursor/rules/content-block-parity-desc-grid.mdc](.cursor/rules/content-block-parity-desc-grid.mdc)) — иначе на `/targeting` и `/services/marketing` этапы без подзаголовка остаются пустыми на десктопе.

### Тайтлы HTML (статический контур)

- Паттерн: **`Название страницы — Serenity`** (длинное тире `—`). Подробности и исключения — в `[.cursor/rules/page-title-serenity.mdc](.cursor/rules/page-title-serenity.mdc)`.

### Статическая страница 404 (новый контур)

- **Назначение:** корневой `404.html` — кастомный ответ **HTTP 404** для **нового статического контура** (не страница WordPress). Разметка собирается из `html/404.layout.html` (`npm run build:html` или `node scripts/assemble-html.cjs build`).
- **Nginx:** кастомная 404 через named location `@serenity_static_404` и `recursive_error_pages` в `nginx/serenity-router.live.conf`; превью `nginx/static.serenity.agency.live.conf` — `error_page 404 /404.html`. У прокси на legacy — `proxy_intercept_errors` и `error_page` внутри `@legacy_proxy` (см. файлы в репозитории).
- **Локально:** `npm run dev` для несуществующего URL отдаёт этот `404.html` с кодом 404, если файл есть в корне репозитория.
- **Проверка:** `npm run test:404-page` (скрипт `scripts/verify-404-page.cjs`).

### Интеграции (секреты в Cloudflare Workers)

- Resend (`RESEND_API_KEY`), текущий email-приемник: `sergeyprus@gmail.com`.
- AmoCRM: `serenity.amocrm.ru` (`AMO_ACCESS_TOKEN`, `AMO_REFRESH_TOKEN`, `AMO_CLIENT_ID`, `AMO_CLIENT_SECRET`, `AMO_SUBDOMAIN=serenity`).
- Домен Resend: `send.serenity.agency` (верификация может быть pending).

### Форма заявки

- Кнопка "Оставить заявку" открывает модал `#desktop-order-popup`.
- `POST /api/lead` отправляет email (Resend) и создаёт лид в AmoCRM.
- После успешной отправки показывается "Спасибо, наш новый друг!" и автозакрытие через 15 секунд.
- Поля: `name`, `phone`, `email`, `message`, `source`.

---

## Тесты и сдача задачи

- На задачу — **реальные тесты**; результат принимается только после их успешного прохода; **временные** проверки после фиксации в коммите **удалять**.
- **Вёрстка / parity страниц:** перед ответом «готово» — визуально проверить и сравнить с эталоном (скриншот, Playwright); не отдавать результат только по зелёным `verify-*.cjs`. См. [`.cursor/rules/visual-verify-before-handoff.mdc`](.cursor/rules/visual-verify-before-handoff.mdc).
- **Продуктовые инварианты** (дефолт города в переключателе телефонов — **Москва**, и т.п.) не менять ради «согласования» с HTML или тестами: при расхождении — **уточнить ТЗ**, поправить тесты/разметку и зафиксировать требование в коде (комментарий рядом с логикой) или здесь одной строкой.
- **Кураторные списки и манифесты** (массивы в JSON, таблицы редиректов, edge-интерцепты и т.п.): перед коммитом убедиться, что **нет дубликатов одного и того же ключа** (например, двух объектов с одинаковым `path`). Пара записей `/foo` и `/foo/` — это **два разных** правила для точного `location =` в nginx, а не «дублирование»; дважды один и тот же `path` — ошибка. Для `json/nginx-edge-intercepts.json` дубликаты `path` ловит `**npm run test:routing-config**` (скрипт `verify-nginx-edge-intercepts.cjs`).

---

## Источник правды и вёрстка

- Дизайн и контент — ориентир `**https://serenity.agency/`**.
- По оригиналу или скриншотам — **pixel-perfect** и свои контрольные снимки.
- Не придумывать элементы сверх оригинала; при сомнениях — **уточнять**.

---

## Коммиты

- Сообщения коммитов — **на русском языке**.

---

## Кэш `immutable` для CSS/JS под `/_sa/`

- После правок этих файлов **повысить** `**?v=`** в `**html/index.layout.html`** и выполнить `**npm run build:html**`, иначе клиенты сохранят старые бандлы.
- Если затронуты оверлей/стили `**case/all**` (в т.ч. `**css/css__home-snapshot__overrides.parity-sync.css**`): шапка листинга — `**html/case-all-index.layout.html**` (счётчики — `**npm run build:cases**`); синхронно поднять `?v=` в сгенерированных `**case/all/**/index.html**`, `**index.html**`, шаблоне главной и выполнить `**npm run build:cases**`.
- На `**static.serenity.agency**` перед origin стоит Yandex CDN: HTML на edge кэшируется **5 минут** (`--cache-expiration-time-default 300`), ассеты `/_sa/*` — по `Cache-Control: immutable` с origin, ключ кэша учитывает `?v=` (`--query-params-whitelist v`). Origin для `**index.html`** отдаёт `**no-cache, must-revalidate`** без `**no-store**`, иначе CDN не сможет хранить ответ на edge. Скрипты `**deploy-dev.sh**` и `**deploy-prod.sh**` после `rsync` запускают `**yc cdn cache purge**` для ресурса CDN превью; без `yc` в PATH HTML обновится по истечении edge-TTL (~5 мин). Ручной сброс при необходимости: `**yc cdn cache purge --resource-id bc8r7ufcvyine32nhiun --path '/*'**`. Смена vhost превью: `**bash scripts/deploy-static-vhost.sh**`.

---

## Пути в `url()` внутри CSS

- В `**css/***` запрещено `**url("../_sa/...")**` — получится `**/_sa/_sa/...**` и **404**. Использовать пути от файла CSS, например `**../img/…`**, `**../js/…`**.

---

## Медиа карточек кейсов (Static / Workers)

- На `**static.serenity.agency**` и `***.workers.dev**` не использовать `**/cdn-cgi/image/...**` в `**srcset**` без проверки `**curl -I**` на целевом хосту (иначе возможен **404** и битые превью).
- Превью карточек — прямые URL вида `**/_sa/img/storage__*`**.
- После изменений — `**npm run test:case-all`** и визуальная проверка `**case/all**` на трёх поверхностях.

---

## Прочее при разработке

- Раздел `**services/**` (маршрут `**/services/…**`) — **тестовый**: не использовать его как эталон продакшена, не приоритизировать правки под SEO, Search Console и отчёты по расширенным результатам, если в задаче явно не попросили обратное.
- **Не множить** стили и скрипты без необходимости.
- Для новых страниц и разделов не создавать дублирующие CSS/JS-файлы без явной причины: сначала переиспользовать существующие секции и компоненты.
- Медиа хранить в доменных каталогах по типу контента и странице:
  - услуги: `**img/services/<slug-страницы>/...`** (например `img/services/production/...`);
  - кейсы: `**img/case/<slug-кейса>/...`** (или в текущей принятой структуре кейсов, но изолированно по кейсу);
  - статьи/блог: `**img/blog/<slug-статьи>/...**`.
- Не складывать ассеты разных страниц «вперемешку» в общие папки без подкаталога страницы; по тем же принципам держать видео в `**video/...**` (сегментация по разделу/странице).
- По возможности не трогать `**src/lead-api.mjs**` без нужды (боевые интеграции).

### Блог: ручные посты в ленте (merge с API)

- Файл **`json/blog-posts-manual.json`**: массив **`posts`** в том же формате элементов, что в **`json/blogs-all.json`** (поля карточки: `href`, `description`, `subtitle`, `tags`, `tagCodes`, `tagCodesNorm`, `linkClass`, `isResource`, `media`).
- При **`node scripts/build-blog-data.mjs`** (в т.ч. внутри **`npm run build:blog-prereq`** / **`npm run build:html`**) ручные посты **подмешиваются в начало** ленты; по каноническому **`href`** дубликаты из ответа API **удаляются** (ручная версия главнее).
- Итоговая лента остаётся в **`json/blogs-all.json`** — на неё завязаны листинг `/blog/`, блок «Читайте ещё», манифесты и прочие скрипты блога.
- Слайдер **«Блог» на главной** — по-прежнему разметка в **`html/partials/section-blog.html`**; при необходимости обновлять карточки там отдельно (не из JSON).

---

## Добавление новой статьи

Регламент для **новых** материалов, которые ведутся **вручную в репозитории** (не через админку). Старые посты из API по-прежнему подтягиваются скриптом; новые — через **`json/blog-posts-manual.json`** и **`json/blog-articles/<slug>.json`**. Не плодить новые CMS, генераторы контента и лишние зависимости; повторять формат существующих статей и карточек.

### Основные правила

- **Источник правды для ленты:** карточку новой статьи добавлять в **`json/blog-posts-manual.json`** (не править вручную только **`json/blogs-all.json`** — файл пересобирается **`node scripts/build-blog-data.mjs`**). Порядок в **`posts`** manual: выше в файле = выше в общей ленте после merge.
- **Страница статьи:** **`json/blog-articles/<slug>.json`** + иллюстрации в **`img/blog/<slug>/`**; сборка HTML: **`npm run build:blog-articles`** (или полный **`npm run build:html`**). Контракт вёрстки и путей — [.cursor/rules/blog-articles-static.mdc](.cursor/rules/blog-articles-static.mdc).
- **Листинг и рубрики** (`/blog/`, `/blog/article/` и т.д.): после merge данные из итогового **`json/blogs-all.json`**; пересборка листинга — **`node scripts/build-blog-pages.mjs`** (или **`npm run build:html`**).
- **Блок «Читайте ещё»** в конце статьи: строится при **`build-blog-article-pages`** из ленты **`blogs-all.json`**; отдельно заполнять не нужно, если карточка корректно есть в ленте.
- **Главная, слайдер «Блог»:** вручную обновить **`html/partials/section-blog.html`**, затем **`node scripts/assemble-html.cjs build`** или **`npm run build:html`**; при необходимости поднять **`?v=`** (см. § кэш выше).
- **Дата публикации:** дата **фактического** появления материала на сайте — в шапке статьи внутри **`bodyHtml`** (как у действующих статей: текст даты и при необходимости **`meta`**).
- **Категория обязательна.** Если в задаче не указана — **уточнить** перед добавлением. Канон кодов рубрик совпадает с **`filters`** в **`json/blogs-all.json`**: **`life`** (Наша жизнь), **`case`** (Кейсы), **`article`** (Статьи), **`podcast`** (Подкаст); поля **`tags`**, **`tagCodes`**, **`tagCodesNorm`** в карточке — по образцу существующих постов в том же файле.
- **SEO — `title` и `description` в JSON статьи:** если в задаче **дан готовый текст** `description` (или явная формулировка под сниппет) — **использовать его** и синхронно в **`bodyHtml`** (мета `description` / `itemprop="description"`), без подмены «улучшенным» вариантом от агента. Если текста нет — **`title`** и **`description`** формулировать осмысленно: **`title`** — понятный, по теме, не перегруженный; **`description`** — кратко польза и тема, ключевые слова **естественно**; **нельзя** просто копировать первый абзац статьи в **`description`**. Ориентир по длине и пустому **`description`** — [.cursor/rules/blog-import-typography-metadata.mdc](.cursor/rules/blog-import-typography-metadata.mdc). Итоговый **`<title>`** страницы статьи проверять на соответствие принятому суффиксу (см. **`scripts/verify-blog.cjs`**, ожидается фрагмент **« — Блог — Serenity»**). Общий паттерн тайтлов — [.cursor/rules/page-title-serenity.mdc](.cursor/rules/page-title-serenity.mdc).
- **Индексация:** после появления **`blog/article/<slug>/index.html`** на диске пересобрать карту сайта (**`npm run build:sitemap`** или полный **`npm run build:html`**). Лента Яндекс.Новостей обновляется **`npm run build:yandex-news-feed`** (входит в типичный **`build:html`**).

### Изображения

- Все файлы статьи — в **`img/blog/<slug>/`**; имя каталога = **slug статьи** (латиница, читаемо). Имена файлов — **латиницей**, без пробелов, по смыслу (**`hero.webp`**, **`diagram-seo.png`** и т.п.).
- Перед коммитом **сжать** изображения (привычный для команды инструмент); в репозитории для производных размеров используется **sharp** в **`scripts/build-blog-mobile-media.mjs`** — после добавления картинок прогонять релевантные шаги **`build:blog-prereq`** / **`build:html`**.
- У каждого значимого изображения в разметке — осмысленный **`alt`** (содержание кадра, не спам ключами). Для **декоративных** допускается пустой **`alt`**, если это явно оправдано. Подписи: использовать канон классов (**.cursor/rules/blog-articles-static.mdc**, **blog-import-typography-metadata**).
- Превью карточки в ленте: путь в **`media.image`** карточки (часто **`/_sa/img/blog/...`**) и файл на диске — по правилам листинга в **blog-articles-static** (не подменять на **`storage__`**, если файла нет в **`img/storage__*`**).

### Структура и качество текста

- **Slug:** уникальный, короткий, латиница, отражает тему; совпадает с именем **`json/blog-articles/<slug>.json`** и каталога **`img/blog/<slug>/`**.
- **Заголовки:** один **`h1`** в шапке статьи; дальше **`h2`/`h3`** без скачков уровней. Таблицы, списки, цитаты — через существующие классы/прозу (**`blog-article-figma.css`**, **`blog-article-prose.css`**).
- **Текст статьи — не трогать смысл (обязательно для агента):** если в задаче передано **тело статьи** (черновик, DOC, абзацы в чате), в **`bodyHtml`** переносить **те же формулировки**, что у автора. **Запрещено** без явной просьбы в задаче: переписывать «лучше» или «короче», сокращать абзацы, менять стиль, подбирать синонимы, объединять/делить смысловые блоки, **добавлять** от себя абзацы, предложения, списки, FAQ, ссылки, призывы и пояснения «для связности». **Разрешено** без согласования с автором: разметка по регламенту (секции, **`h2`/`h3`**, классы, картинки, **`alt`**), NBSP при сборке, технические правки HTML. **Правки текста** (замена формулировок, удаление фраз, новые ссылки) — **только** если пользователь **явно** просит поправить/привести к черновику/указал diff.
- **Ссылки в тексте:** вставлять **только** по **явному указанию** в задаче (URL, якорь, «слово X — ссылка на Y»). Не «додумывать» внутренние ссылки на услуги, кейсы и другие статьи.
- **Типографика NBSP:** после правок тела — **`npm run build:blog-articles`** и/или **`npm run test:typography-nbsp`** — см. [.cursor/rules/blog-import-typography-metadata.mdc](.cursor/rules/blog-import-typography-metadata.mdc).
- **Карточка в `blog-posts-manual.json`:** заполнить **`href`** (канон **`/blog/article/<slug>/`**), **`description`**, **`subtitle`**, **`tags`**, **`tagCodes`**, **`tagCodesNorm`**, **`linkClass`**, **`isResource`**, **`media`** — по образцу записей в **`json/blogs-all.json`**.

### После добавления

- Проверить отсутствие битых ссылок и отсутствующих файлов изображений (локально **`npm run dev`** или статический сервер из корня репо).
- Запустить релевантные проверки из **`package.json`**: минимум **`npm run test:blog`**; перед релизом — **`npm run test:layout-smoke`**. Отдельного **eslint**/**typecheck** в этом проекте для статики нет — не выдумывать команды.

---

## После выкладки (опционально)

Правило Cursor для агента после **PROD** (`deploy-prod.sh`): [`.cursor/rules/post-prod-deploy-verification.mdc`](.cursor/rules/post-prod-deploy-verification.mdc) — коммит/push артефактов релиза, базовый smoke + матрица тестов по затронутым зонам на `https://serenity.agency`.

- При доступе к сети: `**npm run test:post-deploy-smoke**` (Playwright, три origin; внутри — `**/robots.txt**` и `**/sitemap.xml**` на каждом origin из списка). Без Playwright: `**npm run test:prod-robots-sitemap**`. Выборочный GET первых K URL из локального `**sitemap.xml**` на прод: `**SITEMAP_HEAD_SAMPLE_K=30 npm run test:post-deploy-smoke**` или `**npm run test:prod-sitemap-head-sample**`. Экспорт URL из GSC и разбор: `**npm run seo:gsc-coverage-hint**`, `**npm run seo:gsc-url-triage -- путь/к.csv**`. Drilldown `.xlsx` (лист URL + «Проблема»): `**npm run seo:gsc-drilldown-xlsx -- …/Coverage-Drilldown*.xlsx > urls.tsv**`, затем triage по `urls.tsv`.
- Ручные проверки после деплоя — по задаче; нарратив см. `**docs/team-handbook.html**`. Анти‑регресс: при жалобах на «старое поведение» у immutable — сверять `**?v=**` в итоговом `**index.html**` (**см. выше § кэш**).

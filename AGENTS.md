# Обязательные правила для агентов

**Этот файл — единственный источник регламента:** тесты, выкладка, три поверхности, кэш, CSS, кейсы, коммиты. Не дублируйте полные чеклисты в других местах — достаточно ссылки сюда.

**URL, роутинг, SEO и аналитика простым языком (нарратив без полного регламента деплоя) —** `[docs/team-handbook.html](docs/team-handbook.html)`.

---

## Только новый сервер (статический контур)

Все шаги выкладки из этого регламента относятся **только к новому серверу** со статикой и Nginx-роутером: `**bash scripts/deploy-dev.sh`** (превью **static.serenity.agency**), `**bash scripts/deploy-prod.sh`** (основной **serenity.agency**), корневой `**deploy.sh`** (= `**deploy-prod.sh`**), `**bash scripts/deploy-routing.sh**`, `**bash scripts/deploy-serenity-router-vhost.sh**`, `**bash scripts/deploy-static-vhost.sh**` работают с **этой** машиной и каталогом `**/var/www/static`** (плюс конфиги Nginx на ней).

**Dev и prod сейчас на один origin:** в `nginx/` и **static**, и **serenity** смотрят в `**/var/www/static`** на `168.222.142.141`. Скрипты **dev** и **prod** делают один и тот же `rsync` по умолчанию; различаются сценарий, сообщения и обязательность: **dev** ориентирован на проверку по **static.serenity.agency**, **prod** — на выкладку под основной домен. Разнести каталоги на сервере можно через `**DEPLOY_REMOTE_PATH`** / `**DEPLOY_SSH_TARGET`** в окружении (см. `scripts/deploy-lib.sh`). Алиас прежнего имени: `**bash scripts/deploy-static-preview.sh**` = `**deploy-dev.sh**`.

**Старый основной хост WordPress (legacy)** из этого репозитория **не трогаем**: туда нет `rsync`, нет деплоя темы/плагинов и правок PHP. Он участвует в схеме только как **upstream за прокси** в конфиге Nginx **на новом** сервере — менять эту границу можно только осознанно (файлы в `nginx/`, тесты, выкладка на **новый** сервер).

---

## Почему прод не обновляется «сам» после правок в репозитории

Прод-сайт живёт на **отдельной машине** с Nginx и каталогом `/var/www/static`. Изменения в git **никак не затрагивают** её, пока кто‑то с доступом по SSH не выполнит `**bash scripts/deploy-prod.sh`** (или `**deploy-dev.sh`** для того же origin) и при необходимости скрипты Nginx (см. таблицу ниже).

Если `**https://serenity.agency/robots.txt**` выглядит как правила **WordPress**, поиск `**Disallow: /docs/`** ничего не находит — запрос почти наверняка уходит в **legacy** (прокси на отдельный WordPress‑хост), а не в файлы статики **нового** сервера из репо. То же самое с `**/docs/team-handbook.html`**, если там **500**, страница **Nuxt** или другая ошибка legacy: нужны **актуальные файлы на диске** и **активированная маршрутизация/nginx** под префикс `/docs/`.

**Это не блокируют правила Cursor** — их можно менять через файлы в `[.cursor/rules/](.cursor/rules/)`; они лишь подсказывают агенту читать этот регламент. Реальное ограничение — **отсутствие выкладки на сервер**, а не IDE.

### Почему агент не «чинит» прод из задачи по умолчанию

У агента в среде **нет SSH-ключа** и доверия к вашему серверу. Исполнитель (или CI с секретами) выкладывает изменения **со своей машины**, где настроен доступ: `**bash scripts/deploy-prod.sh`**, `**bash scripts/deploy-dev.sh`**, `**bash scripts/deploy-routing.sh**`, `**bash scripts/depl**выложи на dev**oy-serenity-router-vhost.sh**` и т.д. Без этого шага прод остаётся прежним, даже если коммит уже в `main`.

---

## Три прод-поверхности (один артефакт в репозитории)


| Поверхность                                   | Как обновить контент                                                                                                                                                                                             |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `**https://serenity.agency`**                 | Статика с диска `/var/www/static` + Nginx-роутер; без `**scripts/deploy-prod.sh`** (или ручного rsync туда же) и корректного vhost пользователи могут продолжать видеть legacy.                                  |
| `**https://static.serenity.agency**`          | Тот же `**/var/www/static**` на том же сервере; для проверки превью — `**bash scripts/deploy-dev.sh**` (purge CDN превью). Отдельно при необходимости — vhost превью: `**bash scripts/deploy-static-vhost.sh**`. |
| `**https://serenity.sergeyprus.workers.dev**` | Облако: `**npx wrangler deploy**` (тот же артефакт как ASSETS). Сервер прод при этом может ещё не совпасть по версии файлов/Nginx — Worker и Nginx всегда обновлять **раздельно**, если задача затрагивает оба.  |


**Итого:** изменения только в GitHub без выкладки на сервер **не изменят** `serenity.agency` и `static.serenity.agency`.

---

## Канонический чеклист: сборка, тесты, выкладка

Делайте **только релевантные вашей задаче шаги**; порядок в типичном релизе:

1. **Сборка** (если трогали шаблоны HTML или данные кейсов): `npm run build:html` (в конце цепочки — `**npm run build:sitemap**`: актуальный `**sitemap.xml**` из `**blog/**` на диске + прежние основные URL, затем `**apply:sitemap-policy**`); только карта сайта — `**npm run build:sitemap**`. При нужде — см. другие скрипты из `package.json` и `**npm run build:cases`** для оверлея кейсов.
2. **Тесты перед выкладкой**
  - Всегда по контексту релиза: `**npm run test:layout-smoke`**, `**npm run test:routing-config`**.  
  - После изменений кейсов и карточек: `**npm run test:case-all**` и визуально `**case/all**` на всех трёх поверхностях (после выкладки).
3. **Статика на сервер** (**обязательно** для прод-ориентира): `**bash scripts/deploy-prod.sh`** → rsync в `/var/www/static/` (основной **serenity.agency**; только артефакт; nginx и Worker — отдельными шагами ниже). Для проверки на **static.serenity.agency** — `**bash scripts/deploy-dev.sh`** (тот же путь по умолчанию + purge CDN превью).
4. **Nginx «карта» маршрутизации** (если менялся `**nginx/routing.conf`**, включая признаки «новая страница» для `/robots.txt`, `/sitemap.xml`, `/docs/`): `**bash scripts/deploy-routing.sh`**.
5. **Продовый vhost основного домена** (если менялся `**nginx/serenity-router.live.conf`**): `**bash scripts/deploy-serenity-router-vhost.sh`** (или ручное копирование в конфиг сервера, затем `nginx -t` и reload).
6. **Vhost превью static** (если менялся `**nginx/static.serenity.agency.live.conf`**): `**bash scripts/deploy-static-vhost.sh`**.
7. **Worker**: при изменениях, влияющих на стейджинг (`**wrangler.jsonc`**, `src/worker.mjs`, ASSETS и т.п.): `**npx wrangler deploy`**.
8. **Git**: `**git push`** уже после принятого для команды набора команд (сообщение коммита — **на русском**).

Краткая таблица «что изменил → что выполнить»:


| Изменено                                     | Обязательно дополнительно                                                                                                           |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| HTML/кейсы/статика репозитория               | `**deploy-prod.sh`** (или `**deploy.sh`**) для прод; `**deploy-dev.sh**` для превью static; при сборке из шаблонов — см. шаги 1 и 2 |
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
- Папка проекта: `~/Documents/GitHub/serenity`.
- Новый сервер статического контура: `168.222.142.141`, каталог: `/var/www/static`.
- Legacy WordPress: отдельный upstream, из этого репозитория не деплоится (только проксируется Nginx-роутером на новом сервере).
- Прод-URL: `https://serenity.agency`.
- Статик-превью: `https://static.serenity.agency`.
- Worker staging (ASSETS): `https://serenity.sergeyprus.workers.dev`.
- Статика нового сайта в проде должна идти через префикс `/_sa/`; корневые `/css`, `/js`, `/img`, `/json` под legacy не занимаем.
- Основной обработчик Worker: `src/worker.mjs`; API формы: `src/lead-api.mjs`.

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

---

## После выкладки (опционально)

- При доступе к сети: `**npm run test:post-deploy-smoke**` (Playwright, три origin; внутри — `**/robots.txt**` и `**/sitemap.xml**` на каждом origin из списка). Без Playwright: `**npm run test:prod-robots-sitemap**`. Выборочный GET первых K URL из локального `**sitemap.xml**` на прод: `**SITEMAP_HEAD_SAMPLE_K=30 npm run test:post-deploy-smoke**` или `**npm run test:prod-sitemap-head-sample**`. Экспорт URL из GSC и разбор: `**npm run seo:gsc-coverage-hint**`, `**npm run seo:gsc-url-triage -- путь/к.csv**`. Drilldown `.xlsx` (лист URL + «Проблема»): `**npm run seo:gsc-drilldown-xlsx -- …/Coverage-Drilldown*.xlsx > urls.tsv**`, затем triage по `urls.tsv`.
- Ручные проверки после деплоя — по задаче; нарратив см. `**docs/team-handbook.html**`. Анти‑регресс: при жалобах на «старое поведение» у immutable — сверять `**?v=**` в итоговом `**index.html**` (**см. выше § кэш**).
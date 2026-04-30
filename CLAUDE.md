# Serenity — операции и архитектура

**Обязательные правила для агентов и единый краткий перечень требований — в корневом [`AGENTS.md`](AGENTS.md).** Здесь — детальный порядок работ, деплоя, конфигурации и интеграций без дублирования того файла как «источника истины».

## Контекст
- Справочник для команды (поверхности, маршруты, SEO, деплой): **`docs/team-handbook.html`** — после `bash deploy.sh` по URL: `https://serenity.agency/docs/team-handbook.html`, `https://static.serenity.agency/docs/team-handbook.html`, `https://serenity.sergeyprus.workers.dev/docs/team-handbook.html`. Каталог `/docs/` закрыт от индексации (см. `robots.production.txt`, `X-Robots-Tag` в vhost/Worker). На **serenity.agency** путь `/docs/*` должен считаться «новой» статикой в **`nginx/routing.conf`** (`~^/docs/` → `is_new_page=1`); иначе запрос уйдёт на legacy и может дать **500**. Выкладка карты: **`bash scripts/deploy-routing.sh`**. Дополнительно рекомендуется актуальный **`nginx/serenity-router.live.conf`** с `location ^~ /docs/` (заголовки кэша/noindex) и зеркало для превью в **`nginx/static.serenity.agency.live.conf`**. Worker: после правок **`wrangler.jsonc`** — **`npx wrangler deploy`**.
- **`/robots.txt` и `/sitemap.xml`:** в **`nginx/routing.conf`** помечены как статика (`is_new_page=1`), иначе снова отдаётся WordPress без **`Disallow: /docs/`**. После правок — **`bash scripts/deploy-routing.sh`** и **`bash deploy.sh`** (на диске нужны актуальные **`robots.production.txt`** и дублирующий корневой **`robots.txt`**). На **static.serenity.agency** превью — **`robots.static-preview.txt`** через vhost.
- Агентство: Serenity (serenity.agency)
- Репозиторий: https://github.com/sergey-pruss/serenity
- Папка проекта: ~/Documents/GitHub/serenity
- Деплой статики (HTML/CSS/JS/img/json): общий каталог `/var/www/static` на **том же хосте**, что и прод‑Nginx (IP `168.222.142.141`); `docs/` — те же статические файлы, не отдельный приложенческий сервер.
- Превью-домен (тот же артефакт): https://static.serenity.agency
- Основной домен (Nginx-router + статика + прокси на legacy WordPress где страницы ещё не перенесены): https://serenity.agency
- Стейджинг Worker (тот же репозиторий как ASSETS): https://serenity.sergeyprus.workers.dev (Cloudflare Workers)

## Деплой (обязательный порядок)
Все три URL должны получать **одну и ту же** статику из репозитория; различаются только окружение (Nginx / Worker) и кэш.

1. Сборка при изменении шаблонов/кейсов (если задача затрагивает HTML или данные кейсов):
   - `npm run build:html` (или минимально нужные скрипты из `package.json`)
2. Тесты перед выкладкой:
   - `npm run test:layout-smoke` (включает проверку gzip в `nginx/serenity-router.live.conf`)
   - `npm run test:routing-config`
   - при правках кейсов: `npm run test:case-all`
3. Выгрузка статики на сервер (**обновляет и static, и базу для serenity.agency**, т.к. общий `root`):
   - `bash deploy.sh` → rsync в `/var/www/static/` на `168.222.142.141`
4. Nginx на сервере (**только если менялось**):
   - **маршрутизатор** `nginx/routing.conf` → `bash scripts/deploy-routing.sh` (`nginx -t`, затем reload)
   - **продовый vhost** `nginx/serenity-router.live.conf` → `bash scripts/deploy-serenity-router-vhost.sh` (или вручную в `/etc/nginx/sites-available/serenity-router`, затем `nginx -t` и reload). Без актуального vhost путь `/docs/…` может уходить на legacy (**500** или страница **Nuxt**).
   - **превью static.serenity.agency** (`nginx/static.serenity.agency.live.conf`) → `bash scripts/deploy-static-vhost.sh` (по умолчанию копирует в `/etc/nginx/sites-available/static`). Если по адресу `/docs/team-handbook.html` открывается **главная**, на диске нет `docs/` после деплоя **или** на сервере старый vhost без `location ^~ /docs/` (тогда `try_files` уходит в `/index.html`).
5. Cloudflare Workers (**отдельный шаг**, те же файлы как ASSETS):
   - `npx wrangler deploy` (конфиг `wrangler.jsonc`)
6. Git:
   - `git add` → commit сообщение **на русском** → `git push`

Проверка после деплоя на реальных URL (не только локально): главная и `/case/all/` на **https://serenity.agency**, превью на **https://static.serenity.agency**, стейджинг на **https://serenity.sergeyprus.workers.dev**; формы и `/api/*` — по окружению и задаче (на `serenity.agency` см. `nginx/serenity-router.live.conf`; на Worker — `src/worker.mjs`).

Локальный `npm run dev` не заменяет проверку на продакшен-URL с кэшем/CDN.

### Анти-регресс чеклист после деплоя
- Если менялись файлы под `/_sa/` с `immutable` (CSS/JS), обязательно поднять `?v=` в `html/index.layout.html` и пересобрать `npm run build:html`.
- Проверить, что в CSS нет путей `../_sa/...` внутри `url(...)`; для статики использовать относительные пути от CSS, например `../img/...`.
- При жалобах на «пропали стрелки/старое поведение» сначала подозревать кэш immutable-ассетов и сверять `?v=` в итоговом `index.html`.
- Ручные проверки по конкретной задаче и контекст прод-URL — в **`docs/team-handbook.html`**.
- Опционально после выкладки: `npm run test:post-deploy-smoke` (Playwright по трём origin + проверка `/docs/team-handbook.html` по fetch, если настроена сеть) — не заменяет обязательные тесты из раздела «Деплой» выше.

## Архитектура
- Статический сайт в репозитории: index.html + css/ + js/ + img/ + json/
- На прод-домене **публичные URL** статики нового сайта только с префиксом **`/_sa/`** (на диске те же каталоги под `/var/www/static/css|js|img|json`). Корневые `/css`, `/js`, `/img`, `/json` не занимаем — иначе ломается выдача темы WordPress на legacy-страницах.
- На сервере `168.222.142.141`: каталог `/var/www/static` — источник файлов для **static** и для **serenity.agency** (роутинг в Nginx, см. `nginx/routing.conf`, прод: `nginx/serenity-router.live.conf`; превью static: `nginx/static.serenity.agency.live.conf`)
- Worker: `src/worker.mjs` — стейджинг: статика через ASSETS, API через `/api/*`
- API форм: src/lead-api.mjs — обработка заявок

## Интеграции (секреты в Cloudflare Workers)
- Email: Resend (RESEND_API_KEY) — письма идут на sergeyprus@gmail.com пока не верифицирован домен
- AmoCRM: serenity.amocrm.ru (AMO_ACCESS_TOKEN, AMO_REFRESH_TOKEN, AMO_CLIENT_ID, AMO_CLIENT_SECRET, AMO_SUBDOMAIN=serenity)
- Домен Resend: send.serenity.agency (DNS записи добавлены в Reg.ru, верификация pending)

## Форма заявки
- Кнопка "Оставить заявку" → модал #desktop-order-popup
- POST /api/lead → Resend email + AmoCRM лид
- После отправки: экран благодарности ("Спасибо, наш новый друг!") → автозакрытие через 15 сек
- Поля: name, phone, email, message (задача), source (URL страницы)

## CSS структура
- css/css__home-snapshot__snapshot.bundle.css — основные стили (из оригинала Nuxt)
- css/css__home-snapshot__overrides.mobile.css — мобильные правки (наши)
- Мобильный breakpoint: 768px

## JS структура
- js/app.js — основная логика (меню, слайдеры, анимации)
- js/leave-request-cta.js — форма заявки и кнопка CTA

## Соглашения разработки (детали)
- Не трогать `src/lead-api.mjs` без необходимости (боевые интеграции).
- Swiper 8.4.7 подключён через CDN для мобильного слайдера кейсов.
- При конфликтах — не делать force push; использовать revert.
- Общие обязательные правила задач — **[`AGENTS.md`](AGENTS.md)**.

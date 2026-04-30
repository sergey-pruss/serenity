# Serenity — операции и архитектура

**Обязательный регламент для агентов (чеклист выкладки, тесты, кэш, коммиты, три поверхности) — только в [`AGENTS.md`](AGENTS.md).** Здесь — контекст инфраструктуры, маршрутизации, интеграций и структуры фронта без повторения того чеклиста.

## Контекст

- Справочник для команды (URL, SEO, аналитика): **`docs/team-handbook.html`** — полный нарратив без дублирования регламента деплоя (**см. [`AGENTS.md`](AGENTS.md)**).
- Каталог **`/docs/`** закрыт от индексации (см. `robots.production.txt`, `X-Robots-Tag` в vhost/Worker). На **serenity.agency** префикс **`/docs`** в **`nginx/routing.conf`** должен быть помечен как новая статика (`~^/docs(/|$)` → `is_new_page=1`); иначе запрос уйдёт на legacy (**500**, Nuxt и т.п.). Публичная выдача файлов после деплоя — с диска **`/var/www/static/docs/`** через Nginx (**что выполнить на сервере — [`AGENTS.md`](AGENTS.md)**).
- **`/robots.txt` и `/sitemap.xml`:** в **`nginx/routing.conf`** помечены как новая статика (`is_new_page=1`). Иначе снова отдаётся WordPress без строки **`Disallow: /docs/`**. На диске должны быть **`robots.production.txt`** и корневой **`robots.txt`** из репозитория; на **static.serenity.agency** превью — **`robots.static-preview.txt`** через vhost. **Порядок выкладки — [`AGENTS.md`](AGENTS.md)**.
- Агентство: Serenity (serenity.agency)
- Репозиторий: https://github.com/sergey-pruss/serenity
- Папка проекта: ~/Documents/GitHub/serenity
- **Новый сервер (единственная цель выкладки из репо):** каталог **`/var/www/static`** и Nginx на хосте **`168.222.142.141`**. Сюда же указывает **`deploy.sh`** и скрипты vhost/routing. **`docs/`** — обычные статические файлы в этом дереве.
- **Legacy WordPress** — отдельный upstream (см. `nginx/serenity-router.live.conf`); с него этот репозиторий **ничего не деплоит**, только проксирует часть URL с **нового** сервера.
- Превью-домен (тот же артефакт): https://static.serenity.agency
- Основной домен (Nginx-router + статика + прокси на legacy WordPress где страницы ещё не перенесены): https://serenity.agency
- Стейджинг Worker (тот же репозиторий как ASSETS): https://serenity.sergeyprus.workers.dev (Cloudflare Workers)

## Деплой

**Полный обязательный порядок (сборка, тесты, `deploy.sh`, скрипты Nginx, Wrangler, Git) — в [`AGENTS.md`](AGENTS.md).**

Кратко: без **`bash deploy.sh`** прод на сервере не увидит новые файлы; без актуального **`nginx/routing.conf`** и vhost запросы к **`/robots.txt`**, **`/docs/…`** и др. могут уходить в legacy. Локальный **`npm run dev`** не заменяет проверку на прод-URL с кэшем/CDN.

Проверка после деплоя на реальных URL: главная и **`/case/all/`** на **https://serenity.agency**, превью на **https://static.serenity.agency**, стейджинг на **https://serenity.sergeyprus.workers.dev**; формы и **`/api/*`** — по окружению и задаче (на `serenity.agency` см. `nginx/serenity-router.live.conf`; на Worker — `src/worker.mjs`).

### Анти-регресс после выкладки

**Кэш `?v=`, пути `url()` в CSS, smoke-тесты — см. [`AGENTS.md`](AGENTS.md).** Дополнительно: при сомнениях сверяйте итоговый отданный HTML и заголовки кэша на прод-URL; опционально **`npm run test:post-deploy-smoke`**.

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

# Serenity — правила проекта

## Контекст
- Агентство: Serenity (serenity.agency)
- Репозиторий: https://github.com/sergey-pruss/serenity
- Папка проекта: ~/Documents/GitHub/serenity
- Деплой статики (HTML/CSS/JS/img/json): общий каталог на новом сервере `/var/www/static` (IP `168.222.142.141`)
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
   - **продовый vhost** `nginx/serenity-router.live.conf` → залить как `/etc/nginx/sites-available/serenity-router`, затем `nginx -t` и reload
5. Cloudflare Workers (**отдельный шаг**, те же файлы как ASSETS):
   - `npx wrangler deploy` (конфиг `wrangler.jsonc`)
6. Git:
   - `git add` → commit сообщение **на русском** → `git push`

Проверка после деплоя на реальных URL (не только локально): главная и `/case/all/` на **https://serenity.agency**, превью на **https://static.serenity.agency**, стейджинг на **https://serenity.sergeyprus.workers.dev**; формы/API — по задаче (`/api/lead` на Worker).

Локальный `npm run dev` не заменяет проверку на продакшен-URL с кэшем/CDN.

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

## Ключевые правила
- Ориентир — оригинал serenity.agency (источник правды по дизайну)
- Pixel-perfect по оригиналу
- Коммиты на русском языке
- Не трогать src/lead-api.mjs без необходимости (там боевые интеграции)
- Swiper 8.4.7 подключён через CDN для мобильного слайдера кейсов
- При конфликтах с Codex — не делать force push, использовать revert

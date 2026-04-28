# Serenity — правила проекта

## Контекст
- Агентство: Serenity (serenity.agency)
- Репозиторий: https://github.com/sergey-pruss/serenity
- Папка проекта: ~/Documents/GitHub/serenity
- Продакшн: https://serenity.agency (старый WordPress, не трогать)
- Стейджинг: https://serenity.sergeyprus.workers.dev (Cloudflare Workers)

## Деплой
- Платформа: Cloudflare Workers (wrangler.jsonc)
- Деплой: `npx wrangler deploy` из папки проекта
- Wrangler уже авторизован локально
- Публикация после задачи: обязательно в двух местах — `static.serenity.agency` и Cloudflare Workers
- После каждой задачи: git add → git commit (на русском) → git push → npx wrangler deploy
- Проверка **мобильной** вёрстки и меню — на стейджинге после деплоя (`serenity.sergeyprus.workers.dev`); локальный `npm run dev` не заменяет проверку на реальном URL с кэшем/CDN

## Архитектура
- Статический сайт: index.html + css/ + js/ + img/
- Worker: src/worker.mjs — роутинг (статика через ASSETS, API через /api/*)
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

# Serenity

Статический snapshot сайта `serenity.agency` с поэтапной миграцией с legacy WordPress на новый статический контур через Nginx.

## Основные URL

- Прод: https://serenity.agency
- Статик-превью: https://static.serenity.agency
- Worker staging: https://serenity.sergeyprus.workers.dev

## Что важно

- Новый контур отдается как статика из `/var/www/static`.
- Legacy WordPress остается за прокси для путей, которые еще не переключены в `nginx/routing.conf`.
- Публичные ассеты нового контура идут под префиксом `/_sa/`.
- Каталог `docs/` закрыт от индексации.

## Структура проекта

- `html/` — шаблоны и partials.
- `css/`, `js/`, `img/`, `json/` — фронтовые ассеты.
- `case/` — страницы каталога кейсов.
- `nginx/` — роутинг и vhost-конфиги.
- `scripts/` — сборка и проверки.
- `src/worker.mjs`, `src/lead-api.mjs` — Worker/API формы.

## Локальная разработка

```bash
npm install
npm run dev
```

Dev-сервер запускает собранную статику (по умолчанию `127.0.0.1:8765`).

## Сборка

```bash
npm run build:cases
npm run build:html
```

## Проверки

```bash
npm run test:layout-smoke
npm run test:routing-config
npm run test:case-all
```

Опционально после выкладки:

```bash
npm run test:post-deploy-smoke
```

## Деплой (кратко)

Полный регламент деплоя, кэша и роутинга: `AGENTS.md`.

Типовой порядок:

1. Собрать проект и прогнать релевантные тесты.
2. Статика: превью **static.serenity.agency** — `bash scripts/deploy-dev.sh`; основной домен **serenity.agency** — `bash scripts/deploy-prod.sh` (корневой `bash deploy.sh` = prod).
3. Если менялись Nginx-правила, выложить соответствующие конфиги скриптами из `scripts/`.
4. Если менялся Worker: `npx wrangler deploy`.

## Кэш и версии

Если менялись CSS/JS под `/_sa/`, нужно:

- поднять `?v=` в HTML-шаблонах;
- пересобрать HTML (`npm run build:html`).

Иначе пользователи могут видеть старые бандлы из-за `immutable`-кэша.

## Документация

- Правила для задач и выкладки: `AGENTS.md`
- Архитектура и интеграции: `AGENTS.md`
- Командный handbook: `docs/team-handbook.html` (публичный URL: https://serenity.agency/docs/team-handbook.html)

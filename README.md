# Serenity — статика (`serenity_lanidng`)

## Новый путь: Astro (те же URL, без Nuxt на клиенте)

Цель — **полностью статический сайт** с маршрутами как на `https://serenity.agency`, чтобы при переключении на новую версию **пути для поисковиков не менялись** (обновляется только HTML/CSS и лёгкий JS по мере необходимости).

- Разработка: `npm install` → `npm run dev` → [http://localhost:4321/](http://localhost:4321/)
- Сборка: `npm run build` → выход в **`dist/`**
- Локальный просмотр сборки: `npm run serve:dist` → порт **4174** (как раньше у зеркала)

Заглушки страниц: главная, `/case/all`, `/services`, `/about`, `/blog`, `/career/vacancy`, `/contacts`. Остальные URL добавляем поэтапно в `src/pages/` (список-напоминание в `src/data/url-plan.ts`). В шапке стоит **`noindex, nofollow`** до готовности к замене прода — перед запуском убрать в `src/layouts/Site.astro`.

---

## Legacy: снимок главной с прода (Playwright)

Раньше главная собиралась вручную и расходилась с оригиналом. **Снимок** — тот же HTML после гидрации, те же `<script>` / `<link>`, визуально как на `serenity.agency`.

## Как получить «вёрстку с нуля», идентичную оригиналу

1. Установите зависимости и браузер для Playwright:

   ```bash
   npm install
   npx playwright install chromium
   ```

2. Снимите главную с продакшена (по умолчанию):

   ```bash
   npm run capture:home
   ```

   Файл появится в **`publish/index.html`**.    **`<base href="https://serenity.agency/">` не используется**: из‑за него Nuxt и обычные ссылки считают «доменом» прод и переносят вас на `serenity.agency`. Вместо этого в HTML подставляются **абсолютные URL только для статики** (`/_nuxt/`, `/fonts/`, `/favicon.ico`, `/img/`, `/video/`, `svgset.svg`).

   Скрипты и стили грузятся с **оригинального хоста** — отдельно копировать `_nuxt` не нужно.

   Если стили не подтянулись, выполните **`npm run fix:publish`** или заново **`npm run capture:home`**, затем жёсткое обновление вкладки (Cmd+Shift+R).

3. Посмотреть локально:

   ```bash
   npm run serve:publish
   ```

   По умолчанию зеркало: [http://localhost:4174/](http://localhost:4174/) (порт **4174**, чтобы не конфликтовать с типичным `python3 -m http.server 4173`).

   Если `serve` пишет, что порт занят, укажите другой: `npx --yes serve publish -l 4175` или найдите процесс: `lsof -nP -iTCP:4174 | grep LISTEN`.

### Снять с локального Nuxt и подготовить к деплою

Если поднят `http://127.0.0.1:4333/`:

```bash
CAPTURE_URL=http://127.0.0.1:4333/ CAPTURE_REWRITE=1 npm run capture:home
```

`CAPTURE_REWRITE=1` заменяет URL локалки на `https://serenity.agency`, чтобы артефакт нормально работал с GitHub Pages.

### Переменные

| Переменная | Назначение |
|------------|------------|
| `CAPTURE_URL` | URL страницы (по умолчанию `https://serenity.agency/`) |
| `CAPTURE_VIEWPORT` | JSON, например `{"width":1440,"height":900}` |
| `CAPTURE_REWRITE` | `1` — переписать localhost/127.0.0.1:4333 → `https://serenity.agency` |

## Прочее

- **`legacy/hand-built-index.html`** — старая ручная вёрстка (архив).
- **`site-config.js`** — опционально для своих форм; снимок с прода его не подставляет.
- **`scripts/sync-prod-reference.sh`** — по-прежнему можно выгрузить «сырой» HTML/CSS в `reference/prod/` для диффа без Playwright.
- **GitHub Actions** при пуше в `main` запускает `capture:home` и публикует содержимое папки **`publish/`**.

## Ограничения честного «снимка»

- Страница зависит от доступности **serenity.agency** (скрипты/стили с их домена), если вы не делаете офлайн-мirror всех ассетов.
- Антибот или геоблок в CI теоретически возможны; при сбое снимайте локально и коммитьте `publish/index.html` вручную (временно уберите строку из `.gitignore`).

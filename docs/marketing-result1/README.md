# Marketing — Результат1

Снимок `/services/marketing` (targeting-каркас):

1. Стратегия → Бренд-стратегия → Контент-стратегия  
2. Бренд → cm-wide-slider → Увеличение известности → Сайт → …  
3. Ссылки в заголовках/карточках как на prod, без визуального выделения  
4. Без синергии-диаграммы и без case-slider в hero  

**Дата:** `snapshot-date.txt`  
**Коммит:** `git-commit.txt`  
**Список файлов:** `manifest.json`

## Создать / обновить снимок

```bash
npm run assemble:service:marketing
SKIP_MARKETING_LINK_LOCAL=1 npm run test:marketing
npm run snapshot:marketing-result1
```

## Восстановить

```bash
node scripts/restore-marketing-result1.cjs
```

Или пересборка после восстановления partials/assemble:

```bash
node scripts/restore-marketing-result1.cjs
npm run assemble:service:marketing
```

## Тесты (Результат1)

```bash
SKIP_MARKETING_LINK_LOCAL=1 npm run test:marketing
ORIGIN=http://127.0.0.1:8895 npm run test:marketing-layout
npm run test:marketing-visual
```

`test:marketing-links` без skip требует `npm run dev` (локально `/content-strategy` и якоря `/services#…`).

#!/usr/bin/env bash
# Настройка MCP Google Search Console: сначала OAuth Desktop (без SA в GSC), затем опционально SA.
cat <<'EOF'
=== Два разных Google OAuth (не путать) ===

• GSC + колонка «GSC» в дашборде позиций → sergeyprus@gmail.com
  OAuth-клиент: secrets/mcp/gsc-oauth-desktop.json (проект sergeypruss, API Search Console включён)
  Токен без браузера: npm run seo:gsc-oauth-token:install

• Таблица миграции в Google Sheets → prus@serenity.ru
  OAuth-клиент: secrets/mcp/google-sheets-oauth-client.json (проект Serenity SEO, API Sheets)
  Токен: npm run seo:sheets-oauth:install

Не подменяйте gsc-oauth-desktop.json клиентом Serenity SEO — в дашборде будет «API disabled».

=== MCP Google Search Console — OAuth Desktop ===

Не нужно добавлять сервисный аккаунт в Search Console: API ходит от
sergeyprus@gmail.com (доступ к свойству serenity.agency).

1) Google Cloud → проект sergeypruss (не Serenity SEO):
   https://console.cloud.google.com/apis/library/searchconsole.googleapis.com
   Включите API «Google Search Console API».

2) APIs & Services → Credentials → OAuth client ID → тип «Desktop»
   (у вас уже может быть «GSC MCP Desktop»). Скачайте JSON клиента.

3) Положите JSON в репозиторий Serenity одним из способов:
   • npm run mcp:gsc-install-oauth -- "/полный/путь/client_secret_….json"
     → копия окажется в secrets/mcp/gsc-oauth-desktop.json
   • или npm run mcp:gsc-sync-oauth
     → ищет GSC_OAUTH_CLIENT_FILE в ~/.cursor/mcp.json и др.; иначе подсказка
   • или npm run mcp:gsc-sync-oauth -- "/путь/client_secret_….json"
   • или в secrets/mcp/env.sh:
       export GSC_OAUTH_CLIENT_FILE="/полный/путь/к/desktop-client.json"

4) OAuth consent screen → Test users: sergeyprus@gmail.com
   (prus@serenity.ru — только для Sheets, не для GSC).

5) npm run seo:gsc-oauth-token:install — вход sergeyprus@gmail.com, токен в secrets/mcp/gsc-oauth-token.json

6) Перезапуск MCP «google-search-console» в Cursor.
   При первом запросе — браузер, снова sergeyprus@gmail.com.

7) Принудительно использовать SA (если OAuth и SA оба на диске):
     export GSC_FORCE_SERVICE_ACCOUNT=1
   (по умолчанию при наличии OAuth SA не передаётся в MCP.)

---

Опционально: сервисный аккаунт (нужен JSON + добавление …@….iam.gserviceaccount.com в GSC)

• Ключ: secrets/mcp/google-search-console-sa.json
• Email для GSC: npm run mcp:gsc-email
• GSC → Настройки → Пользователи и разрешения → Добавить пользователя → Full

Полезно для npm run seo:positions-report (там пока только SA), см. docs/seo-positions-mcp-workflows.md
EOF

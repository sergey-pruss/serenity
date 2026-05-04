#!/usr/bin/env bash
# Настройка MCP Google Search Console: сначала OAuth Desktop (без SA в GSC), затем опционально SA.
cat <<'EOF'
=== MCP Google Search Console — рекомендуемый обход (OAuth Desktop) ===

Не нужно добавлять сервисный аккаунт в Search Console: API ходит от вашего
личного Google, у которого уже есть доступ к свойству Serenity.

1) Google Cloud → проект (например sergeypruss):
   https://console.cloud.google.com/apis/library/searchconsole.googleapis.com
   Включите API «Google Search Console API».

2) APIs & Services → Credentials → OAuth client ID → тип «Desktop»
   (у вас уже может быть «GSC MCP Desktop»). Скачайте JSON клиента.

3) Положите JSON в репозиторий Serenity одним из способов:
   • npm run mcp:gsc-install-oauth -- "/полный/путь/client_secret_….json"
     → копия окажется в secrets/mcp/gsc-oauth-desktop.json
   • или npm run mcp:gsc-sync-oauth
     → копирует из пути в ~/Documents/GitHub/sergey-pruss.github.io/.cursor/mcp.json
   • или в secrets/mcp/env.sh:
       export GSC_OAUTH_CLIENT_FILE="/полный/путь/к/desktop-client.json"

4) OAuth consent screen → раздел «Test users» / «Тестовые пользователи»:
   добавьте email того Google, под которым входите (например sergeyprus@gmail.com).
   Иначе после входа будет «403: access_denied» — приложение в режиме Testing.

5) Перезапуск MCP «google-search-console» в Cursor (или перезапуск окна).
   При первом обращении к GSC откроется браузер — войдите тем Google,
   который имеет доступ к Search Console для serenity.agency.

6) Принудительно использовать SA (если OAuth и SA оба на диске):
     export GSC_FORCE_SERVICE_ACCOUNT=1
   (по умолчанию при наличии OAuth SA не передаётся в MCP.)

---

Опционально: сервисный аккаунт (нужен JSON + добавление …@….iam.gserviceaccount.com в GSC)

• Ключ: secrets/mcp/google-search-console-sa.json
• Email для GSC: npm run mcp:gsc-email
• GSC → Настройки → Пользователи и разрешения → Добавить пользователя → Full

Полезно для npm run seo:positions-report (там пока только SA), см. docs/seo-positions-mcp-workflows.md
EOF

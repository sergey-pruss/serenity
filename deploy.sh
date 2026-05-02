#!/bin/bash
# Деплой на static.serenity.agency
export RSYNC_RSH="${RSYNC_RSH:-ssh -i $HOME/.ssh/id_ed25519}"
# Права на приёмнике: nginx (www-data) должен читать файлы; иначе «тихие» 403 (например шрифты с mode 600).
rsync -avz \
  --chmod=Du=rwx,Dgo=rx,Fu=rw,Fgo=r \
  --exclude='.git' \
  --exclude='node_modules' \
  --exclude='.wrangler' \
  --exclude='artifacts' \
  --exclude='wrangler.toml' \
  --exclude='deploy.sh' \
  ./ root@168.222.142.141:/var/www/static/
echo "✅ Задеплоено на https://static.serenity.agency"

# CDN edge-кэш HTML на static.serenity.agency держится 5 мин (см. AGENTS.md § кэш).
# Сбрасываем сразу, чтобы новые HTML/документы были видны без задержки.
# Ресурс можно переопределить через CDN_RESOURCE_ID. Без yc в PATH шаг пропускается.
if command -v yc >/dev/null 2>&1; then
  YC_CLI_INITIALIZATION_SILENCE=true yc cdn cache purge \
    --resource-id "${CDN_RESOURCE_ID:-bc8r7ufcvyine32nhiun}" \
    --path '/*' --async \
    && echo "🧹 CDN purge запущен для static.serenity.agency" \
    || echo "⚠️  yc cdn cache purge не выполнен; HTML обновится через ~5 мин"
else
  echo "ℹ️  yc CLI не найден; HTML на static.serenity.agency обновится через ~5 мин (edge TTL)"
fi

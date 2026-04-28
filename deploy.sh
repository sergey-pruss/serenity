#!/bin/bash
# Деплой на static.serenity.agency
export RSYNC_RSH="${RSYNC_RSH:-ssh -i $HOME/.ssh/id_ed25519}"
rsync -avz \
  --exclude='.git' \
  --exclude='node_modules' \
  --exclude='.wrangler' \
  --exclude='wrangler.toml' \
  --exclude='deploy.sh' \
  ./ root@168.222.142.141:/var/www/static/
echo "✅ Задеплоено на https://static.serenity.agency"

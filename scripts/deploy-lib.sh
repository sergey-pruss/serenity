#!/usr/bin/env bash
# Общая логика выкладки статики (rsync в origin). Подключается из deploy-dev.sh / deploy-prod.sh — не запускать напрямую.
# Переопределение цели: DEPLOY_SSH_TARGET (по умолчанию root@168.222.142.141), DEPLOY_REMOTE_PATH (по умолчанию /var/www/static/).

deploy_ensure_blog_built() {
  if [[ -f blog/index.html ]] && grep -q '{{BLOG_TITLE}}' blog/index.html 2>/dev/null; then
    echo "⚠️  blog/index.html с плейсхолдерами {{BLOG_*}} — запускаю node scripts/build-blog-pages.mjs"
    node scripts/build-blog-pages.mjs
  fi
}

deploy_rsync_repo_to_static_root() {
  export RSYNC_RSH="${RSYNC_RSH:-ssh -i $HOME/.ssh/id_ed25519}"
  local host="${DEPLOY_SSH_TARGET:-root@168.222.142.141}"
  local path="${DEPLOY_REMOTE_PATH:-/var/www/static/}"
  rsync -avz \
    --chmod=Du=rwx,Dgo=rx,Fu=rw,Fgo=r \
    --exclude='.git' \
    --exclude='.claude' \
    --exclude='.cursor' \
    --exclude='node_modules' \
    --exclude='.wrangler' \
    --exclude='artifacts' \
    --exclude='wrangler.toml' \
    --exclude='deploy.sh' \
    ./ "${host}:${path}"
}

# Edge Yandex CDN перед static.serenity.agency (см. AGENTS.md). После prod тоже полезен — превью совпадает с origin.
deploy_cdn_purge_yandex_static_preview() {
  if command -v yc >/dev/null 2>&1; then
    YC_CLI_INITIALIZATION_SILENCE=true yc cdn cache purge \
      --resource-id "${CDN_RESOURCE_ID:-bc8r7ufcvyine32nhiun}" \
      --path '/*' --async \
      && echo "🧹 CDN purge (static.serenity.agency) запущен" \
      || echo "⚠️  yc cdn cache purge не выполнен; HTML на static обновится через ~5 мин"
  else
    echo "ℹ️  yc CLI не найден; HTML на static.serenity.agency обновится через ~5 мин (edge TTL)"
  fi
}

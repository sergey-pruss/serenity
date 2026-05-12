#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const deployLib = read("scripts/deploy-lib.sh");
const deployDev = read("scripts/deploy-dev.sh");
const deployProd = read("scripts/deploy-prod.sh");
const staticVhost = read("nginx/static.serenity.agency.live.conf");
const prodVhost = read("nginx/serenity-router.live.conf");
const agents = read("AGENTS.md");

assert(
  /DEPLOY_REMOTE_PATH="\$\{DEPLOY_REMOTE_PATH:-\/var\/www\/static-dev\/\}"/.test(deployDev),
  "deploy-dev.sh должен по умолчанию писать в /var/www/static-dev/",
);
assert(
  /deploy_worker_staging/.test(deployDev),
  "deploy-dev.sh должен обновлять Worker staging",
);
assert(
  /DEPLOY_REMOTE_PATH="\$\{DEPLOY_REMOTE_PATH:-\/var\/www\/static\/\}"/.test(deployProd),
  "deploy-prod.sh должен по умолчанию писать в /var/www/static/",
);
assert(
  !/deploy_worker_staging/.test(deployProd) && !/wrangler deploy/.test(deployProd),
  "deploy-prod.sh не должен обновлять Worker staging",
);
assert(
  /DEPLOY_REMOTE_PATH:\?DEPLOY_REMOTE_PATH is required/.test(deployLib),
  "deploy-lib.sh не должен иметь общий fallback на prod-root",
);
assert(
  /--exclude='\.codex'/.test(deployLib),
  "deploy-lib.sh должен исключать локальную .codex/ из rsync",
);
assert(
  /root \/var\/www\/static-dev;/.test(staticVhost) &&
    /alias \/var\/www\/static-dev\/;/.test(staticVhost) &&
    /alias \/var\/www\/static-dev\/robots\.static-preview\.txt;/.test(staticVhost),
  "static.serenity.agency vhost должен смотреть в /var/www/static-dev",
);
assert(
  /root \/var\/www\/static;/.test(prodVhost) && /alias \/var\/www\/static\/;/.test(prodVhost),
  "prod serenity-router vhost должен оставаться на /var/www/static",
);
assert(
  /DEV[\s\S]*deploy-dev\.sh[\s\S]*static-dev[\s\S]*Worker/.test(agents) &&
    /PROD[\s\S]*deploy-prod\.sh[\s\S]*static\/[\s\S]*Worker этим шагом не обновляется/.test(agents) &&
    /ВЕЗДЕ/.test(agents),
  "AGENTS.md должен требовать выбор DEV / PROD / ВЕЗДЕ перед деплоем",
);

console.log("OK: deploy surfaces separated (DEV static-dev+Worker, PROD static only)");

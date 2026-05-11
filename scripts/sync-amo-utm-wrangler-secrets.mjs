#!/usr/bin/env node
/**
 * Тянет список пользовательских полей СДЕЛКИ из Amo API и записывает в Cloudflare Worker
 * секреты AMO_UTM_* (и опционально AMO_SOURCE_FIELD_ID), затем можно выполнить wrangler deploy.
 *
 * Токен Amo в репозиторий не кладём — передаётся только в переменной окружения на время запуска.
 *
 * Запуск из корня репозитория (любой один способ авторизации):
 *
 * 1) Готовый access token (короткоживущий, как у API):
 *    AMO_ACCESS_TOKEN='…' npm run amo:sync-utm-secrets
 *
 * 2) Те же данные, что уже в секретах Worker (refresh → получим access сами):
 *    AMO_REFRESH_TOKEN='…' AMO_CLIENT_ID='…' AMO_CLIENT_SECRET='…' npm run amo:sync-utm-secrets
 *    AMO_REDIRECT_URI — как в интеграции Amo (если не задан: https://static.serenity.agency)
 *
 * Код авторизации (code из ?code= после redirect) — не нужен: это одноразовый шаг OAuth в браузере.
 * «Новый ключ» в Amo нужен только если вы заводите новую интеграцию с нуля; для скрипта достаточно
 * либо актуального access_token, либо пары client_id + client_secret + refresh_token.
 *
 * Опционально:
 *   AMO_SUBDOMAIN=serenity
 *   AMO_SOURCE_FIELD_MATCH=страница   — подстрока в name поля сделки для AMO_SOURCE_FIELD_ID
 */

import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..");

const SUBDOMAIN = (process.env.AMO_SUBDOMAIN || "serenity").trim();
const SOURCE_MATCH = (process.env.AMO_SOURCE_FIELD_MATCH || "").trim().toLowerCase();

let accessToken = (process.env.AMO_ACCESS_TOKEN || "").trim();

async function obtainAccessTokenViaRefresh() {
  const refresh = (process.env.AMO_REFRESH_TOKEN || "").trim();
  const clientId = (process.env.AMO_CLIENT_ID || "").trim();
  const clientSecret = (process.env.AMO_CLIENT_SECRET || "").trim();
  if (!refresh || !clientId || !clientSecret) return null;

  const redirectUri = (process.env.AMO_REDIRECT_URI || "https://static.serenity.agency").trim();
  const url = `https://${SUBDOMAIN}.amocrm.ru/oauth2/access_token`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
      refresh_token: refresh,
      redirect_uri: redirectUri,
    }),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Amo oauth2/access_token (refresh) → ${res.status}: ${text.slice(0, 500)}`);
  }
  const data = JSON.parse(text);
  const at = data.access_token;
  if (!at) throw new Error("Amo: в ответе refresh нет access_token");
  return String(at).trim();
}

/** Имя поля в Amo (как в кабинете) → имя секрета Worker */
const UTM_FIELD_MAP = [
  ["source", "AMO_UTM_SOURCE_FIELD_ID"],
  ["medium", "AMO_UTM_MEDIUM_FIELD_ID"],
  ["campaign", "AMO_UTM_CAMPAIGN_FIELD_ID"],
  ["content", "AMO_UTM_CONTENT_FIELD_ID"],
  ["keyword", "AMO_UTM_TERM_FIELD_ID"],
];

async function fetchLeadCustomFields() {
  const url = `https://${SUBDOMAIN}.amocrm.ru/api/v4/leads/custom_fields`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Amo GET leads/custom_fields → ${res.status}: ${text.slice(0, 500)}`);
  }
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("Amo: не JSON в ответе");
  }
  return data._embedded?.custom_fields || [];
}

function fieldIdByExactName(fields, name) {
  const want = name.toLowerCase();
  const hits = fields.filter((f) => String(f.name).toLowerCase() === want);
  if (!hits.length) return null;
  if (hits.length > 1) {
    console.warn(`Несколько полей «${name}», используем id=${hits[0].id}`);
  }
  return hits[0].id;
}

function wranglerSecretPut(secretName, value) {
  const r = spawnSync("npx", ["wrangler", "secret", "put", secretName], {
    cwd: REPO_ROOT,
    input: String(value),
    encoding: "utf8",
    stdio: ["pipe", "inherit", "inherit"],
  });
  if (r.status !== 0) {
    throw new Error(`wrangler secret put ${secretName} завершился с кодом ${r.status}`);
  }
}

async function main() {
  if (!accessToken) {
    accessToken = (await obtainAccessTokenViaRefresh()) || "";
  }
  if (!accessToken) {
    console.error(
      "Нужна авторизация к Amo API v4 — один из вариантов:\n\n" +
        "  A) AMO_ACCESS_TOKEN='…' npm run amo:sync-utm-secrets\n" +
        "     (короткоживущий bearer; удобно, если уже скопировали из отладки интеграции)\n\n" +
        "  B) AMO_REFRESH_TOKEN='…' AMO_CLIENT_ID='…' AMO_CLIENT_SECRET='…' npm run amo:sync-utm-secrets\n" +
        "     (те же три значения, что вы когда-то клали в секреты Worker; скрипт сам получит access)\n\n" +
        "Не нужны: «код авторизации» из URL (это одноразовый шаг в браузере) и отдельный «долгосрочный» тип токена —\n" +
        "в Amo для интеграций как раз пара refresh + периодическое обновление access, как в lead-api.mjs.",
    );
    process.exit(1);
  }

  console.log(`Запрос полей сделки: ${SUBDOMAIN}.amocrm.ru …`);
  const fields = await fetchLeadCustomFields();
  console.log(`Всего полей сделки в ответе: ${fields.length}`);

  for (const [amoName, secretName] of UTM_FIELD_MAP) {
    const id = fieldIdByExactName(fields, amoName);
    if (id == null) {
      console.warn(`Поле «${amoName}» не найдено — пропуск ${secretName}`);
      continue;
    }
    console.log(`\n→ ${secretName} = ${id}  (Amo: ${amoName})`);
    wranglerSecretPut(secretName, id);
  }

  if (SOURCE_MATCH) {
    const hit = fields.find((f) => String(f.name).toLowerCase().includes(SOURCE_MATCH));
    if (!hit) {
      console.warn(`\nПоле с подстрокой «${SOURCE_MATCH}» не найдено — AMO_SOURCE_FIELD_ID не трогаем.`);
    } else {
      console.log(`\n→ AMO_SOURCE_FIELD_ID = ${hit.id}  (Amo: ${hit.name})`);
      wranglerSecretPut("AMO_SOURCE_FIELD_ID", hit.id);
    }
  }

  console.log("\nСекреты в Cloudflare обновлены; для Worker повторный deploy не обязателен.\n");
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});

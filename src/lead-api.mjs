import { normalizeLeadUtm } from "./lead-utm.mjs";

/**
 * Обработка заявок с сайта serenity.agency
 * Отправляет письмо через Resend и создаёт лид в AmoCRM.
 *
 * Env secrets (wrangler secret put ...):
 *   RESEND_API_KEY   — ключ Resend
 *   AMO_SUBDOMAIN    — "serenity"
 *   AMO_ACCESS_TOKEN — OAuth2 access token AmoCRM (bootstrap/fallback)
 *   AMO_REFRESH_TOKEN — refresh token AmoCRM (bootstrap/fallback)
 *   AMO_CLIENT_ID
 *   AMO_CLIENT_SECRET
 *   AMO_REDIRECT_URI — должен совпадать с redirect_uri интеграции в Amo
 *
 * Optional (ID пользовательских полей сделки в Amo — см. API /api/v4/leads/custom_fields):
 *   AMO_SOURCE_FIELD_ID — полный URL страницы отправки (поле «страница заявки» и т.п.)
 *   AMO_UTM_SOURCE_FIELD_ID, AMO_UTM_MEDIUM_FIELD_ID, AMO_UTM_CAMPAIGN_FIELD_ID,
 *   AMO_UTM_CONTENT_FIELD_ID, AMO_UTM_TERM_FIELD_ID — utm_* в пользовательские поля **сделки**
 *   AMO_CONTACT_UTM_SOURCE_FIELD_ID … AMO_CONTACT_UTM_TERM_FIELD_ID — то же в поля **контакта** (если source/medium только в карточке контакта)
 *
 * Optional binding:
 *   AMO_TOKENS_KV (KV namespace) — хранение актуальных access/refresh токенов.
 *
 * Одноразовая подсказка id полей (без новых ключей Amo — те же токены, что у /api/lead):
 *   AMO_FIELD_MAP_SECRET — случайная строка; открыть в браузере (один раз):
 *   GET /api/internal/amo-lead-field-map?k=<AMO_FIELD_MAP_SECRET>
 *   После копирования чисел в Secrets Cloudflare — удалить AMO_FIELD_MAP_SECRET и задеплоить.
 */

const UTM_PARAM_TO_ENV = [
  ["utm_source", "AMO_UTM_SOURCE_FIELD_ID"],
  ["utm_medium", "AMO_UTM_MEDIUM_FIELD_ID"],
  ["utm_campaign", "AMO_UTM_CAMPAIGN_FIELD_ID"],
  ["utm_content", "AMO_UTM_CONTENT_FIELD_ID"],
  ["utm_term", "AMO_UTM_TERM_FIELD_ID"],
];

/** Поля контакта (те же utm_*, другие id в Amo) */
const UTM_PARAM_TO_CONTACT_ENV = [
  ["utm_source", "AMO_CONTACT_UTM_SOURCE_FIELD_ID"],
  ["utm_medium", "AMO_CONTACT_UTM_MEDIUM_FIELD_ID"],
  ["utm_campaign", "AMO_CONTACT_UTM_CAMPAIGN_FIELD_ID"],
  ["utm_content", "AMO_CONTACT_UTM_CONTENT_FIELD_ID"],
  ["utm_term", "AMO_CONTACT_UTM_TERM_FIELD_ID"],
];

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

export async function handleLeadRequest(request, env) {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS });
  }
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  let data;
  try {
    const ct = request.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      data = await request.json();
    } else {
      const form = await request.formData();
      data = Object.fromEntries(form.entries());
    }
  } catch {
    return json({ error: "Invalid request body" }, 400);
  }

  const name    = (data.name                        || "").trim();
  const phone   = (data.phone                       || "").trim();
  const email   = (data.email                       || "").trim();
  const message = (data.comments || data.message    || "").trim();
  const source  = (data.source                      || "").trim();
  const utm     = mergeUtmFromRequest(data, source);

  if (!name || !phone || !email) {
    return json({ error: "Заполните обязательные поля: имя, телефон, email" }, 422);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: "Некорректный email" }, 422);
  }

  const results = await Promise.allSettled([
    sendEmail(env, { name, phone, email, message, source, utm }),
    createAmoCRMLead(env, { name, phone, email, message, source, utm }),
  ]);

  const emailOk = results[0].status === "fulfilled";
  const amoOk   = results[1].status === "fulfilled";

  if (!emailOk) console.error("Resend error:", results[0].reason);
  if (!amoOk)   console.error("AmoCRM error:", results[1].reason);

  if (!emailOk && !amoOk) {
    return json({ error: "Ошибка отправки. Пожалуйста, свяжитесь с нами напрямую." }, 500);
  }

  return json({ success: true });
}

function pickTrimmed(data, key) {
  const v = data[key];
  if (v == null) return "";
  return String(v).trim();
}

/** Явные поля формы перекрывают значения из query в source; без меток — direct / none. */
function mergeUtmFromRequest(data, source) {
  return normalizeLeadUtm(data, source);
}

function appendUtmToAmoValues(env, utm, paramToEnvKey, targetArray) {
  for (const [param, envKey] of paramToEnvKey) {
    const val = utm[param];
    const fieldIdRaw = env[envKey];
    if (!val || fieldIdRaw == null || String(fieldIdRaw).trim() === "") continue;
    const fieldId = Number(fieldIdRaw);
    if (!Number.isFinite(fieldId)) continue;
    targetArray.push({ field_id: fieldId, values: [{ value: val }] });
  }
}

function appendAmoUtmCustomFields(env, leadCustomFields, utm) {
  appendUtmToAmoValues(env, utm, UTM_PARAM_TO_ENV, leadCustomFields);
}

function makeAmoSourceUid() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function formatUtmForNote(utm) {
  const lines = [];
  for (const [param] of UTM_PARAM_TO_ENV) {
    if (utm[param]) lines.push(`${param}: ${utm[param]}`);
  }
  return lines.join("\n");
}

async function sendEmail(env, { name, phone, email, message, source, utm }) {
  if (!env.RESEND_API_KEY) throw new Error("RESEND_API_KEY не задан");

  const utmBlock = formatUtmForNote(utm);
  const html = `
    <p><strong>Имя:</strong> ${esc(name)}</p>
    <p><strong>Телефон:</strong> <a href="tel:${esc(phone)}">${esc(phone)}</a></p>
    <p><strong>Почта:</strong> <a href="mailto:${esc(email)}">${esc(email)}</a></p>
    ${message ? `<p><strong>Комментарий:</strong> ${esc(message)}</p>` : ""}
    ${source  ? `<p><strong>Страница отправки заявки:</strong> <a href="${esc(source)}">${esc(source)}</a></p>` : ""}
    ${utmBlock ? `<p><strong>UTM:</strong></p><pre style="white-space:pre-wrap;font-family:inherit">${esc(utmBlock)}</pre>` : ""}
  `;

  const payload = {
    from: "Serenity <hello@send.serenity.agency>",
    to: ["mail@serenity.ru"],
    reply_to: email,
    subject: `Новая заявка от ${name}`,
    html,
  };

  let res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Resend ${res.status}: ${text}`);
  }
}

const AMO_KV_KEY = "amo_oauth_tokens";

async function getAmoAuthState(env) {
  const accessTokenFallback = env.AMO_ACCESS_TOKEN;
  const refreshTokenFallback = env.AMO_REFRESH_TOKEN;
  if (!env.AMO_TOKENS_KV) {
    return {
      accessToken: accessTokenFallback,
      refreshToken: refreshTokenFallback,
    };
  }

  try {
    const raw = await env.AMO_TOKENS_KV.get(AMO_KV_KEY);
    if (!raw) {
      return {
        accessToken: accessTokenFallback,
        refreshToken: refreshTokenFallback,
      };
    }
    const parsed = JSON.parse(raw);
    return {
      accessToken: parsed.accessToken || accessTokenFallback,
      refreshToken: parsed.refreshToken || refreshTokenFallback,
    };
  } catch (e) {
    console.error("AmoKV read error:", e);
    return {
      accessToken: accessTokenFallback,
      refreshToken: refreshTokenFallback,
    };
  }
}

async function saveAmoAuthState(env, authState) {
  if (!env.AMO_TOKENS_KV) return;
  try {
    await env.AMO_TOKENS_KV.put(
      AMO_KV_KEY,
      JSON.stringify({
        accessToken: authState.accessToken,
        refreshToken: authState.refreshToken,
        updatedAt: Date.now(),
      }),
    );
  } catch (e) {
    console.error("AmoKV write error:", e);
  }
}

async function refreshAmoToken(env, refreshToken) {
  const redirectUri = env.AMO_REDIRECT_URI || "https://static.serenity.agency";
  const res = await fetch(`https://${env.AMO_SUBDOMAIN}.amocrm.ru/oauth2/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: env.AMO_CLIENT_ID,
      client_secret: env.AMO_CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      redirect_uri: redirectUri,
    }),
  });
  if (!res.ok) throw new Error(`AMO refresh ${res.status}: ${await res.text()}`);
  const d = await res.json();
  return {
    accessToken: d.access_token,
    refreshToken: d.refresh_token || refreshToken,
  };
}

async function amoRequest(env, authState, path, body, retry = true) {
  const base = `https://${env.AMO_SUBDOMAIN}.amocrm.ru/api/v4`;
  const headers = {
    Authorization: `Bearer ${authState.accessToken}`,
    "Content-Type": "application/json",
  };

  let res = await fetch(`${base}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  // Если токен протух — пробуем обновить
  if (res.status === 401 && retry) {
    const nextAuth = await refreshAmoToken(env, authState.refreshToken);
    authState.accessToken = nextAuth.accessToken;
    authState.refreshToken = nextAuth.refreshToken;
    await saveAmoAuthState(env, authState);
    headers.Authorization = `Bearer ${authState.accessToken}`;
    res = await fetch(`${base}${path}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
  }

  return res;
}

async function amoPatchRequest(env, authState, path, body, retry = true) {
  const base = `https://${env.AMO_SUBDOMAIN}.amocrm.ru/api/v4`;
  const headers = {
    Authorization: `Bearer ${authState.accessToken}`,
    "Content-Type": "application/json",
  };

  let res = await fetch(`${base}${path}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(body),
  });

  if (res.status === 401 && retry) {
    const nextAuth = await refreshAmoToken(env, authState.refreshToken);
    authState.accessToken = nextAuth.accessToken;
    authState.refreshToken = nextAuth.refreshToken;
    await saveAmoAuthState(env, authState);
    headers.Authorization = `Bearer ${authState.accessToken}`;
    res = await fetch(`${base}${path}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify(body),
    });
  }

  return res;
}

async function amoGetRequest(env, authState, path, retry = true) {
  const base = `https://${env.AMO_SUBDOMAIN}.amocrm.ru/api/v4`;
  const headers = { Authorization: `Bearer ${authState.accessToken}` };

  let res = await fetch(`${base}${path}`, { method: "GET", headers });

  if (res.status === 401 && retry) {
    const nextAuth = await refreshAmoToken(env, authState.refreshToken);
    authState.accessToken = nextAuth.accessToken;
    authState.refreshToken = nextAuth.refreshToken;
    await saveAmoAuthState(env, authState);
    headers.Authorization = `Bearer ${authState.accessToken}`;
    res = await fetch(`${base}${path}`, { method: "GET", headers });
  }

  return res;
}

/** AMO_UTM_* → AMO_CONTACT_UTM_* для подсказки по полям контакта */
function contactUtmSecretName(leadSecret) {
  return String(leadSecret).replace(/^AMO_UTM_/, "AMO_CONTACT_UTM_");
}

/** Секрет Worker → возможные имена/code поля сделки в Amo (первое совпадение побеждает) */
const SECRET_TO_AMO_CANDIDATES = [
  { secret: "AMO_UTM_SOURCE_FIELD_ID", candidates: ["source", "utm_source", "utm source"] },
  { secret: "AMO_UTM_MEDIUM_FIELD_ID", candidates: ["medium", "utm_medium", "utm medium"] },
  { secret: "AMO_UTM_CAMPAIGN_FIELD_ID", candidates: ["campaign", "utm_campaign", "utm campaign"] },
  { secret: "AMO_UTM_CONTENT_FIELD_ID", candidates: ["content", "utm_content", "utm content"] },
  { secret: "AMO_UTM_TERM_FIELD_ID", candidates: ["keyword", "utm_term", "utm term", "term"] },
];

function normFieldKey(s) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function findLeadField(fields, candidates) {
  const want = candidates.map(normFieldKey);
  for (const f of fields) {
    const name = normFieldKey(f.name);
    const code = normFieldKey(f.code || "");
    for (const w of want) {
      if (w && (name === w || code === w)) return f;
    }
  }
  return null;
}

function amoFieldMapHtmlEsc(t) {
  return String(t)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Чтобы в Safari не была «белая страница» при 404/ошибках — отдаём простой HTML */
function amoFieldMapHtmlPage(title, bodyHtml, status = 200) {
  const html = `<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${amoFieldMapHtmlEsc(title)}</title><style>
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;padding:16px;line-height:1.5;max-width:920px;margin:0 auto}
pre{background:#f4f4f5;padding:12px;border-radius:8px;white-space:pre-wrap;word-break:break-word;font-size:13px}
.bad{color:#b42318}.ok{color:#146c43}
h1{font-size:1.2rem}
ul{padding-left:1.2rem}
</style></head><body><h1>${amoFieldMapHtmlEsc(title)}</h1>${bodyHtml}</body></html>`;
  return new Response(html, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}

/**
 * Одноразовая страница: id полей сделки для Secrets (использует уже настроенные токены Amo в Worker).
 * Включено только если задан AMO_FIELD_MAP_SECRET; в query k должен совпадать.
 */
export async function handleAmoFieldMapRequest(request, env) {
  if (request.method !== "GET") {
    return new Response("Method not allowed", { status: 405 });
  }
  const secret = (env.AMO_FIELD_MAP_SECRET || "").trim();
  const k = (new URL(request.url).searchParams.get("k") || "").trim();
  const wantJson = (new URL(request.url).searchParams.get("format") || "").toLowerCase() === "json";

  if (!secret) {
    const body =
      `<p class="bad">В Worker не задан секрет <strong>AMO_FIELD_MAP_SECRET</strong>.</p>` +
      `<p>Сделайте в Терминале в папке сайта:</p><pre>printf 'ВашПароль' | npx wrangler secret put AMO_FIELD_MAP_SECRET\nnpx wrangler deploy</pre>` +
      `<p>Потом откройте ссылку с тем же паролем после <code>k=</code>.</p>`;
    return wantJson ? json({ error: "no_AMO_FIELD_MAP_SECRET" }, 404) : amoFieldMapHtmlPage("Нет доступа", body, 404);
  }
  if (k !== secret) {
    const body =
      `<p class="bad">Параметр <code>k=</code> не совпадает с секретом <strong>AMO_FIELD_MAP_SECRET</strong>.</p>` +
      `<ul><li>Скопируйте пароль <strong>точно</strong> из команды <code>printf '…'</code> (без лишних пробелов в начале/конце).</li>` +
      `<li>Если пароль на русском или со спецсимволами — вставьте в ссылку <strong>закодированный</strong> вариант: в Терминале выполните<br><code>node -e "console.log(encodeURIComponent('ВАШ_ПАРОЛЬ'))"</code> и подставьте вывод после <code>k=</code>.</li></ul>`;
    return wantJson ? json({ error: "bad_k" }, 404) : amoFieldMapHtmlPage("Неверный ключ", body, 404);
  }

  if (!env.AMO_SUBDOMAIN || !env.AMO_CLIENT_ID || !env.AMO_CLIENT_SECRET) {
    const msg = "В Worker не заданы AMO_SUBDOMAIN / AMO_CLIENT_ID / AMO_CLIENT_SECRET.";
    return wantJson ? json({ error: msg }, 500) : amoFieldMapHtmlPage("Ошибка настройки", `<p class="bad">${amoFieldMapHtmlEsc(msg)}</p>`, 500);
  }
  const authState = await getAmoAuthState(env);
  if (!authState.accessToken || !authState.refreshToken) {
    const msg = "Нет рабочих AMO_ACCESS_TOKEN / AMO_REFRESH_TOKEN в Worker.";
    return wantJson ? json({ error: msg }, 500) : amoFieldMapHtmlPage("Нет токена Amo", `<p class="bad">${amoFieldMapHtmlEsc(msg)}</p>`, 500);
  }

  let res = await amoGetRequest(env, authState, "/leads/custom_fields?limit=250");
  let text = await res.text();
  if (!res.ok) {
    res = await amoGetRequest(env, authState, "/leads/custom_fields");
    text = await res.text();
  }
  if (!res.ok) {
    const detail = text.slice(0, 1200);
    const msg = `Amo не отдал список полей сделки (код ${res.status}).`;
    return wantJson
      ? json({ error: msg, detail }, 502)
      : amoFieldMapHtmlPage("Ошибка Amo", `<p class="bad">${amoFieldMapHtmlEsc(msg)}</p><pre>${amoFieldMapHtmlEsc(detail)}</pre>`, 502);
  }
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    const msg = "Ответ Amo не похож на JSON.";
    return wantJson ? json({ error: msg }, 502) : amoFieldMapHtmlPage("Ошибка", `<p class="bad">${amoFieldMapHtmlEsc(msg)}</p>`, 502);
  }
  const fields = data._embedded?.custom_fields || [];

  let contactFields = [];
  let cRes = await amoGetRequest(env, authState, "/contacts/custom_fields?limit=250");
  let cText = await cRes.text();
  if (!cRes.ok) {
    cRes = await amoGetRequest(env, authState, "/contacts/custom_fields");
    cText = await cRes.text();
  }
  if (cRes.ok) {
    try {
      const cData = JSON.parse(cText);
      contactFields = cData._embedded?.custom_fields || [];
    } catch {
      /* ignore */
    }
  }
  const bySecretName = {};
  const matchedAmoNames = [];

  for (const { secret, candidates } of SECRET_TO_AMO_CANDIDATES) {
    const hit = findLeadField(fields, candidates);
    if (hit) {
      bySecretName[secret] = hit.id;
      matchedAmoNames.push({
        cloudflare_secret: secret,
        id: hit.id,
        amo_name: hit.name,
        amo_code: hit.code || null,
        matched_by: candidates,
      });
    }
  }

  const byContactSecretName = {};
  const matchedContactAmo = [];
  for (const { secret, candidates } of SECRET_TO_AMO_CANDIDATES) {
    const cSecret = contactUtmSecretName(secret);
    const hit = findLeadField(contactFields, candidates);
    if (hit) {
      byContactSecretName[cSecret] = hit.id;
      matchedContactAmo.push({
        cloudflare_secret: cSecret,
        id: hit.id,
        amo_name: hit.name,
        amo_code: hit.code || null,
      });
    }
  }

  const allLeadFields = [...fields]
    .sort((a, b) => String(a.name).localeCompare(String(b.name), "ru"))
    .map((f) => ({ id: f.id, name: f.name, code: f.code || null, type: f.type }));

  const allContactFields = [...contactFields]
    .sort((a, b) => String(a.name).localeCompare(String(b.name), "ru"))
    .map((f) => ({ id: f.id, name: f.name, code: f.code || null, type: f.type }));

  const body = {
    ok: true,
    matched: matchedAmoNames,
    /** Скопируйте числа в Cloudflare → Workers → serenity → Settings → Variables and Secrets → Add */
    paste_into_cloudflare_secrets: bySecretName,
    /** Если paste пустой — найдите нужные поля здесь и вручную создайте Secret с именем из подсказки */
    all_lead_custom_fields: allLeadFields,
    /** Если source/medium только здесь — добавьте секреты из paste_into_cloudflare_contact_secrets (запись в контакт уже поддержана в коде) */
    all_contact_custom_fields: allContactFields,
    /** UTM в поля контакта (если не пусто — используйте эти Secret вместо или вместе с paste_into_cloudflare_secrets) */
    paste_into_cloudflare_contact_secrets: byContactSecretName,
    matched_contact_fields: matchedContactAmo,
    hint_ru:
      matchedAmoNames.length > 0
        ? "Сопоставление по сделке найдено — paste_into_cloudflare_secrets."
        : matchedContactAmo.length > 0
          ? "Поля UTM найдены у контакта — добавьте в Cloudflare секреты из paste_into_cloudflare_contact_secrets (имена AMO_CONTACT_UTM_*). Запись при заявке уже делается в контакт."
          : "Смотрите all_lead_custom_fields и all_contact_custom_fields; вручную создайте Secret AMO_UTM_* или AMO_CONTACT_UTM_* = id из списка.",
    steps_ru: [
      "Workers & Pages → serenity → Settings → Variables and Secrets → Add (тип Secret).",
      "Для каждой строки из paste_into_cloudflare_secrets: имя = ключ, значение = число (id).",
      "Удалите секрет AMO_FIELD_MAP_SECRET и снова npx wrangler deploy — страницу больше не открывать.",
    ],
  };

  const jsonStr = JSON.stringify(body, null, 2);
  if (wantJson) {
    return new Response(jsonStr, {
      status: 200,
      headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
    });
  }
  const intro =
    `<p class="ok">Готово. Скопируйте числа в Cloudflare → Workers → serenity → Settings → Variables and Secrets (тип Secret).</p>` +
    `<p>Часто нужен блок <strong>paste_into_cloudflare_contact_secrets</strong> (поля контакта в Amo).</p>` +
    `<p>Тот же текст в JSON: добавьте в конец ссылки <code>&amp;format=json</code></p>`;
  return amoFieldMapHtmlPage("Поля Amo для Cloudflare", `${intro}<pre>${amoFieldMapHtmlEsc(jsonStr)}</pre>`, 200);
}

async function createAmoCRMLead(env, { name, phone, email, message, source, utm }) {
  if (!env.AMO_SUBDOMAIN || !env.AMO_CLIENT_ID || !env.AMO_CLIENT_SECRET) {
    throw new Error("AMO_SUBDOMAIN/AMO_CLIENT_ID/AMO_CLIENT_SECRET не заданы");
  }
  const authState = await getAmoAuthState(env);
  if (!authState.accessToken || !authState.refreshToken) {
    throw new Error("AMO_ACCESS_TOKEN или AMO_REFRESH_TOKEN не заданы");
  }

  // Заявки сайта должны попадать в "Неразобранное": не передаём responsible_user_id/status_id.
  const contactCustomFields = [
    phone && { field_code: "PHONE", values: [{ value: phone, enum_code: "WORK" }] },
    email && { field_code: "EMAIL", values: [{ value: email, enum_code: "WORK" }] },
  ].filter(Boolean);
  appendUtmToAmoValues(env, utm, UTM_PARAM_TO_CONTACT_ENV, contactCustomFields);

  const leadCustomFields = [];
  const amoSource = source || "https://serenity.agency/";
  if (amoSource && env.AMO_SOURCE_FIELD_ID) {
    leadCustomFields.push({ field_id: Number(env.AMO_SOURCE_FIELD_ID), values: [{ value: amoSource }] });
  }
  appendAmoUtmCustomFields(env, leadCustomFields, utm);

  const now = Math.floor(Date.now() / 1000);
  const sourceUid = makeAmoSourceUid();
  const unsortedRes = await amoRequest(env, authState, "/leads/unsorted/forms", [
    {
      request_id: sourceUid,
      source_name: "Serenity Статика",
      source_uid: sourceUid,
      created_at: now,
      _embedded: {
        leads: [
          {
            name: `Заявка с сайта — ${name}`,
            ...(leadCustomFields.length ? { custom_fields_values: leadCustomFields } : {}),
          },
        ],
        contacts: [
          {
            name,
            ...(contactCustomFields.length ? { custom_fields_values: contactCustomFields } : {}),
          },
        ],
      },
      metadata: {
        form_id: "serenity-static-lead-form",
        form_name: "Форма заявки Serenity",
        form_page: amoSource,
        form_sent_at: now,
        referer: amoSource,
      },
    },
  ]);

  if (!unsortedRes.ok) {
    throw new Error(`AmoCRM unsorted forms ${unsortedRes.status}: ${await unsortedRes.text()}`);
  }

  // 2. Добавляем заметку: задача + источник
  const noteParts = [];
  if (message) noteParts.push(`Задача: ${message}`);
  if (amoSource) noteParts.push(`Источник: ${amoSource}`);
  const utmNote = formatUtmForNote(utm);
  if (utmNote) noteParts.push(utmNote);

  if (noteParts.length) {
    const unsortedData = await unsortedRes.json();
    const leadId = unsortedData?._embedded?.unsorted?.[0]?._embedded?.leads?.[0]?.id;
    if (leadId) {
      await amoRequest(env, authState, `/leads/${leadId}/notes`, [
        { note_type: "common", params: { text: noteParts.join("\n") } },
      ]);
    }
  }
}

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

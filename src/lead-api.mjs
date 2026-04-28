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
 * Optional binding:
 *   AMO_TOKENS_KV (KV namespace) — хранение актуальных access/refresh токенов.
 */

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

  if (!name || !phone || !email) {
    return json({ error: "Заполните обязательные поля: имя, телефон, email" }, 422);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: "Некорректный email" }, 422);
  }

  const results = await Promise.allSettled([
    sendEmail(env, { name, phone, email, message, source }),
    createAmoCRMLead(env, { name, phone, email, message, source }),
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

async function sendEmail(env, { name, phone, email, message, source }) {
  if (!env.RESEND_API_KEY) throw new Error("RESEND_API_KEY не задан");

  const html = `
    <p><strong>Имя:</strong> ${esc(name)}</p>
    <p><strong>Телефон:</strong> <a href="tel:${esc(phone)}">${esc(phone)}</a></p>
    <p><strong>Почта:</strong> <a href="mailto:${esc(email)}">${esc(email)}</a></p>
    ${message ? `<p><strong>Комментарий:</strong> ${esc(message)}</p>` : ""}
    ${source  ? `<p><strong>Страница отправки заявки:</strong> <a href="${esc(source)}">${esc(source)}</a></p>` : ""}
  `;

  const payload = {
    from: "Serenity <onboarding@resend.dev>",
    to: ["sergeyprus@gmail.com"],
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

async function createAmoCRMLead(env, { name, phone, email, message, source }) {
  if (!env.AMO_SUBDOMAIN || !env.AMO_CLIENT_ID || !env.AMO_CLIENT_SECRET) {
    throw new Error("AMO_SUBDOMAIN/AMO_CLIENT_ID/AMO_CLIENT_SECRET не заданы");
  }
  const authState = await getAmoAuthState(env);
  if (!authState.accessToken || !authState.refreshToken) {
    throw new Error("AMO_ACCESS_TOKEN или AMO_REFRESH_TOKEN не заданы");
  }

  // 1. Создаём контакт
  const contactRes = await amoRequest(env, authState, "/contacts", [
    {
      name,
      custom_fields_values: [
        phone && { field_code: "PHONE", values: [{ value: phone, enum_code: "WORK" }] },
        email && { field_code: "EMAIL", values: [{ value: email, enum_code: "WORK" }] },
      ].filter(Boolean),
    },
  ]);

  let contactId = null;
  if (contactRes.ok) {
    const cd = await contactRes.json();
    contactId = cd?._embedded?.contacts?.[0]?.id ?? null;
  } else {
    console.error("AmoCRM contact error:", await contactRes.text());
  }

  // 2. Создаём лид
  const leadCustomFields = [];
  if (source && env.AMO_SOURCE_FIELD_ID) {
    leadCustomFields.push({ field_id: Number(env.AMO_SOURCE_FIELD_ID), values: [{ value: source }] });
  }

  const leadRes = await amoRequest(env, authState, "/leads", [
    {
      name: `Заявка с сайта — ${name}`,
      ...(leadCustomFields.length ? { custom_fields_values: leadCustomFields } : {}),
      _embedded: {
        contacts: contactId ? [{ id: contactId }] : [],
      },
    },
  ]);

  if (!leadRes.ok) {
    throw new Error(`AmoCRM leads ${leadRes.status}: ${await leadRes.text()}`);
  }

  // 3. Добавляем заметку: задача + источник
  const noteParts = [];
  if (message) noteParts.push(`Задача: ${message}`);
  if (source)  noteParts.push(`Источник: ${source}`);

  if (noteParts.length) {
    const leadData = await leadRes.json();
    const leadId = leadData?._embedded?.leads?.[0]?.id;
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

/**
 * Прокси Telegram для Senq на VPS (api.telegram.org и входящий webhook недоступны с 168.222.142.141).
 *
 * POST /api/internal/senq-telegram-send
 *   Authorization: Bearer <RANK_DASHBOARD_NOTIFY_SECRET>
 *   Body: { chat_id, text, parse_mode?: "HTML" }
 *
 * POST /api/internal/senq-telegram-webhook
 *   Проксирует тело и X-Telegram-Bot-Api-Secret-Token → Senq prod webhook.
 *
 * Worker secrets:
 *   RANK_DASHBOARD_NOTIFY_SECRET
 *   SENQ_TELEGRAM_BOT_TOKEN
 *   SENQ_TELEGRAM_WEBHOOK_FORWARD_URL (default https://senq.serenity.agency/api/notifications/telegram/webhook)
 */

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function authorize(request, env) {
  const secret = env.RANK_DASHBOARD_NOTIFY_SECRET?.trim() || "";
  if (!secret) {
    return { ok: false, status: 503, error: "RANK_DASHBOARD_NOTIFY_SECRET not configured" };
  }
  const auth = request.headers.get("Authorization") || "";
  if (auth !== `Bearer ${secret}`) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }
  return { ok: true };
}

export async function handleSenqTelegramSend(request, env) {
  if (request.method !== "POST") {
    return json({ ok: false, error: "Method not allowed" }, 405);
  }

  const auth = authorize(request, env);
  if (!auth.ok) {
    return json({ ok: false, error: auth.error }, auth.status);
  }

  const token = env.SENQ_TELEGRAM_BOT_TOKEN?.trim();
  if (!token) {
    return json({ ok: false, error: "SENQ_TELEGRAM_BOT_TOKEN not configured on Worker" }, 503);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "Invalid JSON body" }, 400);
  }

  const chatId = body.chat_id != null ? String(body.chat_id).trim() : "";
  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!chatId || !text) {
    return json({ ok: false, error: "chat_id and text are required" }, 400);
  }

  const payload = {
    chat_id: chatId,
    text: text.slice(0, 4000),
    disable_web_page_preview: body.disable_web_page_preview !== false,
  };
  if (body.parse_mode === "HTML" || body.parse_mode === "Markdown") {
    payload.parse_mode = body.parse_mode;
  }

  const tgRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const tgBody = await tgRes.text();
  let tgJson;
  try {
    tgJson = JSON.parse(tgBody);
  } catch {
    tgJson = { ok: false, raw: tgBody.slice(0, 200) };
  }

  if (!tgRes.ok || !tgJson.ok) {
    return json(
      { ok: false, error: `Telegram API ${tgRes.status}: ${JSON.stringify(tgJson).slice(0, 200)}` },
      502,
    );
  }

  return json({ ok: true, result: tgJson.result ?? null });
}

export async function handleSenqTelegramWebhook(request, env) {
  if (request.method !== "POST") {
    return json({ ok: false, error: "Method not allowed" }, 405);
  }

  const forwardUrl =
    env.SENQ_TELEGRAM_WEBHOOK_FORWARD_URL?.trim() ||
    "https://senq.serenity.agency/api/notifications/telegram/webhook";

  const headers = { "Content-Type": "application/json" };
  const secretHeader = request.headers.get("X-Telegram-Bot-Api-Secret-Token");
  if (secretHeader) {
    headers["X-Telegram-Bot-Api-Secret-Token"] = secretHeader;
  }

  const body = await request.text();

  const forwardRes = await fetch(forwardUrl, {
    method: "POST",
    headers,
    body,
  });

  const forwardBody = await forwardRes.text();
  return new Response(forwardBody, {
    status: forwardRes.status,
    headers: { "Content-Type": forwardRes.headers.get("Content-Type") || "application/json" },
  });
}

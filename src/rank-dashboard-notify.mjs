/**
 * Прокси Telegram для rank dashboard на VPS (api.telegram.org недоступен).
 *
 * POST /api/internal/rank-dashboard-notify
 * Authorization: Bearer <RANK_DASHBOARD_NOTIFY_SECRET>
 * Body: { text, parse_mode?: "HTML" | "Markdown" }
 *
 * Worker secrets (wrangler secret put RANK_DASHBOARD_NOTIFY_SECRET):
 *   RANK_DASHBOARD_NOTIFY_SECRET — shared secret с dashboard VPS
 *   DEPLOY_NOTIFY_TELEGRAM_BOT_TOKEN — токен бота
 *   DEPLOY_NOTIFY_TELEGRAM_CHAT_ID — chat_id получателя
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

export async function handleRankDashboardNotify(request, env) {
  if (request.method !== "POST") {
    return json({ ok: false, error: "Method not allowed" }, 405);
  }

  const auth = authorize(request, env);
  if (!auth.ok) {
    return json({ ok: false, error: auth.error }, auth.status);
  }

  const token = env.DEPLOY_NOTIFY_TELEGRAM_BOT_TOKEN?.trim();
  const chatId = env.DEPLOY_NOTIFY_TELEGRAM_CHAT_ID?.trim();
  if (!token || !chatId) {
    return json(
      { ok: false, error: "DEPLOY_NOTIFY_TELEGRAM_BOT_TOKEN / CHAT_ID not configured on Worker" },
      503,
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "Invalid JSON body" }, 400);
  }

  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text) {
    return json({ ok: false, error: "text is required" }, 400);
  }

  const parseMode = body.parse_mode === "HTML" || body.parse_mode === "Markdown" ? body.parse_mode : "HTML";

  const tgRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: parseMode,
      disable_web_page_preview: true,
    }),
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
      {
        ok: false,
        error: `Telegram API ${tgRes.status}: ${JSON.stringify(tgJson).slice(0, 200)}`,
      },
      502,
    );
  }

  return json({ ok: true, result: tgJson.result ?? null });
}

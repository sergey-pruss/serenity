/**
 * Worker только для API заявок (Resend + AmoCRM).
 * Статика — на nginx (serenity.agency / static.serenity.agency), не в ASSETS.
 */
import { handleAmoFieldMapRequest, handleLeadRequest } from "./lead-api.mjs";
import { handleAmoSiteFunnelRequest } from "./amo-site-funnel.mjs";
import { handleLlmChatCompletions } from "./llm-proxy.mjs";
import { handleRankDashboardNotify } from "./rank-dashboard-notify.mjs";
import {
  handleSenqTelegramSend,
  handleSenqTelegramWebhook,
} from "./senq-telegram-proxy.mjs";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/lead/" || url.pathname === "/api/internal/amo-lead-field-map/") {
      const u = new URL(request.url);
      u.pathname = u.pathname.replace(/\/+$/, "");
      return Response.redirect(u, 308);
    }
    if (url.pathname === "/api/lead") {
      return handleLeadRequest(request, env);
    }
    if (url.pathname === "/api/internal/amo-lead-field-map") {
      return handleAmoFieldMapRequest(request, env);
    }
    if (url.pathname === "/api/internal/llm-chat-completions") {
      return handleLlmChatCompletions(request, env);
    }
    if (url.pathname === "/api/internal/rank-dashboard-notify") {
      return handleRankDashboardNotify(request, env);
    }
    if (url.pathname === "/api/internal/amo-site-funnel") {
      return handleAmoSiteFunnelRequest(request, env);
    }
    if (url.pathname === "/api/internal/senq-telegram-send") {
      return handleSenqTelegramSend(request, env);
    }
    if (url.pathname === "/api/internal/senq-telegram-webhook") {
      return handleSenqTelegramWebhook(request, env);
    }

    if (url.pathname === "/" || url.pathname === "/index.html") {
      const html = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Serenity Worker — staging API</title>
  <style>
    body{font-family:system-ui,sans-serif;max-width:42rem;margin:2rem auto;padding:0 1rem;line-height:1.5;color:#eee;background:#111}
    a{color:#7eb8ff} code{background:#222;padding:.1em .35em;border-radius:4px}
    h1{font-size:1.25rem;font-weight:600}
    ul{padding-left:1.2rem}
  </style>
</head>
<body>
  <h1>Serenity на workers.dev — только API</h1>
  <p>Этот Worker обслуживает форму заявки и внутренние API. Полный сайт здесь не развёрнут.</p>
  <ul>
    <li><strong>Прод:</strong> <a href="https://serenity.agency/">serenity.agency</a></li>
    <li><strong>Dev-превью статики:</strong> <a href="https://static.serenity.agency/">static.serenity.agency</a></li>
    <li><strong>API заявки:</strong> <code>POST /api/lead</code></li>
  </ul>
  <p>Если нужен полный staging на workers.dev — <code>npm run deploy:worker-staging-full</code>.</p>
</body>
</html>`;
      return new Response(html, {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
      });
    }

    return new Response("Not found", { status: 404 });
  },
};

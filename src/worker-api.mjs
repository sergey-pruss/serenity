/**
 * Worker только для API заявок (Resend + AmoCRM).
 * Статика — на nginx (serenity.agency / static.serenity.agency), не в ASSETS.
 */
import { handleAmoFieldMapRequest, handleLeadRequest } from "./lead-api.mjs";

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

    return new Response("Not found", { status: 404 });
  },
};

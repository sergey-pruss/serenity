import { handleAmoFieldMapRequest, handleLeadRequest } from "./lead-api.mjs";

/** Совпадает с nginx `/_sa/` → файлы из корня репозитория (css/, img/, …). Без префикса не перехватываем пути legacy. */
const SNAPSHOT_PREFIX = "/_sa";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith(`${SNAPSHOT_PREFIX}/`) || url.pathname === SNAPSHOT_PREFIX) {
      let inner = url.pathname.slice(SNAPSHOT_PREFIX.length);
      if (inner === "") inner = "/";
      else if (!inner.startsWith("/")) inner = `/${inner}`;
      const assetUrl = new URL(inner + url.search, url.origin);
      return env.ASSETS.fetch(new Request(assetUrl, request));
    }

    if (url.pathname === "/case/all") {
      return Response.redirect(new URL("/case/all/", url.origin), 308);
    }
    if (url.pathname === "/blog") {
      return Response.redirect(new URL("/blog/", url.origin), 308);
    }
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

    /** Как nginx `location = /robots.txt` → `robots.production.txt` (канон продакшена). */
    if (url.pathname === "/robots.txt") {
      const prodRobotsUrl = new URL("/robots.production.txt", url.origin);
      return env.ASSETS.fetch(new Request(prodRobotsUrl, request));
    }

    if (url.pathname === "/docs" || url.pathname.startsWith("/docs/")) {
      const res = await env.ASSETS.fetch(request);
      const headers = new Headers(res.headers);
      headers.set("X-Robots-Tag", "noindex, nofollow");
      return new Response(res.body, {
        status: res.status,
        statusText: res.statusText,
        headers,
      });
    }

    return env.ASSETS.fetch(request);
  },
};

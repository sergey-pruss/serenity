import { handleLeadRequest } from "./lead-api.mjs";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/case/all") {
      return Response.redirect(new URL("/case/all/", url.origin), 308);
    }

    if (url.pathname === "/api/lead") {
      return handleLeadRequest(request, env);
    }

    return env.ASSETS.fetch(request);
  },
};

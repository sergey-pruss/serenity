/**
 * First-touch UTM + органика по referrer для legacy-страниц (без leave-request-cta.js).
 * Тот же ключ sessionStorage, что в leave-request-cta.js.
 */
(() => {
  const UTM_SESSION_KEY = "serenity_sa_utm_v1";
  const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];
  const OWN_SITE_HOSTS = new Set(["serenity.agency", "static.serenity.agency"]);

  const pick = (value) => {
    if (value == null) return "";
    const s = String(value).trim();
    if (!s || s === "(not set)" || s === "(none)") return "";
    return s;
  };

  const normHost = (hostname) => String(hostname || "").replace(/^www\./, "").toLowerCase();

  const isOwnSite = (hostname) => {
    const h = normHost(hostname);
    return OWN_SITE_HOSTS.has(h) || h.endsWith(".serenity.agency");
  };

  const inferFromReferrer = (referrerUrl) => {
    if (!referrerUrl) return {};
    try {
      const url = new URL(referrerUrl);
      const host = normHost(url.hostname);
      if (!host || isOwnSite(host)) return {};
      if (host === "ya.ru" || host.includes("yandex.")) return { utm_source: "yandex", utm_medium: "organic" };
      if (host.includes("google.")) return { utm_source: "google", utm_medium: "organic" };
      if (host === "bing.com" || host.endsWith(".bing.com")) return { utm_source: "bing", utm_medium: "organic" };
      if (host === "duckduckgo.com") return { utm_source: "duckduckgo", utm_medium: "organic" };
      if (host === "go.mail.ru") return { utm_source: "mail", utm_medium: "organic" };
      if (host.includes("rambler.")) return { utm_source: "rambler", utm_medium: "organic" };
      if (host.includes("yahoo.")) return { utm_source: "yahoo", utm_medium: "organic" };
    } catch {
      return {};
    }
    return {};
  };

  const inferFromSearch = (search) => {
    const out = {};
    let sp;
    try {
      sp = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
    } catch {
      return out;
    }
    for (const k of UTM_KEYS) {
      const v = pick(sp.get(k));
      if (v) out[k] = v;
    }
    if (pick(sp.get("yclid"))) {
      if (!out.utm_source) out.utm_source = "yandex";
      if (!out.utm_medium) out.utm_medium = "cpc";
    }
    if (pick(sp.get("gclid"))) {
      if (!out.utm_source) out.utm_source = "google";
      if (!out.utm_medium) out.utm_medium = "cpc";
    }
    if (pick(sp.get("fbclid"))) {
      if (!out.utm_source) out.utm_source = "facebook";
      if (!out.utm_medium) out.utm_medium = "cpc";
    }
    if (out.utm_source === "yadirect") out.utm_source = "yandex";
    return out;
  };

  const mergeParts = (...parts) => {
    const merged = {};
    for (const part of parts) {
      if (!part || typeof part !== "object") continue;
      for (const k of UTM_KEYS) {
        const v = pick(part[k]);
        if (v) merged[k] = v;
      }
    }
    return merged;
  };

  let stored = {};
  try {
    const raw = sessionStorage.getItem(UTM_SESSION_KEY);
    if (raw) {
      const o = JSON.parse(raw);
      if (o && typeof o === "object" && !Array.isArray(o)) stored = o;
    }
  } catch {
    stored = {};
  }

  const fromUrl = inferFromSearch(window.location.search || "");
  const fromReferrer = Object.keys(fromUrl).length ? {} : inferFromReferrer(document.referrer || "");
  const incoming = mergeParts(fromReferrer, fromUrl);
  if (!Object.keys(incoming).length) return;

  const next = { ...stored };
  for (const k of UTM_KEYS) {
    if (incoming[k] && !next[k]) next[k] = incoming[k];
  }
  try {
    sessionStorage.setItem(UTM_SESSION_KEY, JSON.stringify(next));
  } catch {
    /* private mode / quota */
  }
})();

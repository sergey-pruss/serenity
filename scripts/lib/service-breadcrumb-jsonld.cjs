/**
 * BreadcrumbList JSON-LD для статических страниц услуг (канон без завершающего слэша).
 */
const ORIGIN = "https://serenity.agency";
const SERVICES_LIST_PATH = "/services";

function canonicalPath(urlPath) {
  let p = String(urlPath || "").trim();
  if (!p.startsWith("/")) p = `/${p}`;
  if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
  return p;
}

function canonicalUrl(urlPath) {
  return `${ORIGIN}${canonicalPath(urlPath)}`;
}

/** @param {{ breadcrumbLabel: string, urlPath: string }} opts */
function buildServiceBreadcrumbJsonLd(opts) {
  const label = String(opts.breadcrumbLabel || "").trim();
  const pagePath = canonicalPath(opts.urlPath);
  if (!label || !pagePath) {
    throw new Error("buildServiceBreadcrumbJsonLd: нужны breadcrumbLabel и urlPath");
  }
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Serenity",
        item: ORIGIN,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Услуги",
        item: canonicalUrl(SERVICES_LIST_PATH),
      },
      {
        "@type": "ListItem",
        position: 3,
        name: label,
        item: canonicalUrl(pagePath),
      },
    ],
  };
}

function buildServiceBreadcrumbScriptTag(opts) {
  const json = JSON.stringify(buildServiceBreadcrumbJsonLd(opts));
  return `<script type="application/ld+json" data-sa-service-breadcrumb="1">${json}</script>`;
}

function patchServiceBreadcrumbJsonLd(html, opts) {
  let s = String(html ?? "");
  s = s.replace(
    /<script type="application\/ld\+json" data-sa-service-breadcrumb="1">[\s\S]*?<\/script>\s*/g,
    "",
  );
  const tag = buildServiceBreadcrumbScriptTag(opts);
  if (!s.includes("</head>")) {
    throw new Error("patchServiceBreadcrumbJsonLd: нет </head>");
  }
  return s.replace("</head>", `    ${tag}\n  </head>`);
}

/** @returns {{ breadcrumbLabel: string, urlPath: string, items: { name: string, item: string }[] }} */
function parseServiceBreadcrumbFromHtml(html) {
  const m = String(html ?? "").match(
    /<script type="application\/ld\+json" data-sa-service-breadcrumb="1">([\s\S]*?)<\/script>/,
  );
  if (!m) return null;
  const data = JSON.parse(m[1]);
  if (data["@type"] !== "BreadcrumbList" || !Array.isArray(data.itemListElement)) return null;
  const items = data.itemListElement.map((el) => ({
    name: el.name,
    item: el.item,
  }));
  return {
    breadcrumbLabel: items[2]?.name || "",
    urlPath: items[2]?.item ? items[2].item.replace(ORIGIN, "") : "",
    items,
  };
}

function patchServiceBreadcrumbForSlug(html, slug) {
  const { loadServiceConfig } = require("./load-service-config.cjs");
  const cfg = loadServiceConfig(slug);
  return patchServiceBreadcrumbJsonLd(html, {
    breadcrumbLabel: cfg.seo.breadcrumbLabel,
    urlPath: cfg.urlPath,
  });
}

module.exports = {
  ORIGIN,
  canonicalUrl,
  buildServiceBreadcrumbJsonLd,
  buildServiceBreadcrumbScriptTag,
  patchServiceBreadcrumbJsonLd,
  patchServiceBreadcrumbForSlug,
  parseServiceBreadcrumbFromHtml,
};

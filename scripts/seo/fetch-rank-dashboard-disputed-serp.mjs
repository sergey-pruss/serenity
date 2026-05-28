#!/usr/bin/env node
/**
 * Браузерная пересъёмка спорных Яндекс-ячеек (XMLRiver vs панель / регрессия).
 * SmartCaptcha — через RuCaptcha (RUCAPTCHA_API_KEY или CAPTCHA_API_KEY).
 *
 * npm run seo:rank-dashboard:serp:disputed
 * SERP_LIST_DISPUTED=1 — только список без браузера
 */
process.env.SERP_REFETCH_DISPUTED ??= "1";
process.env.SERP_CAPTCHA_SOLVER ??= "1";
process.env.SERP_REFETCH_ENGINE ??= "yandex";

await import("./fetch-rank-dashboard-serp.mjs");

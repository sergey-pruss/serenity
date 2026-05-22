/** Подсказки по аккаунтам (не секреты). */
export const GSC_OAUTH_ACCOUNT_HINT = "sergeyprus@gmail.com";
export const SHEETS_OAUTH_ACCOUNT_HINT = "prus@serenity.ru";

/**
 * @param {string} msg
 * @returns {boolean}
 */
export function isGscApiNotEnabledError(msg) {
  return /has not been used in project|is disabled|accessNotConfigured|SERVICE_DISABLED/i.test(
    msg,
  );
}

/**
 * @param {string} msg
 * @returns {string}
 */
export function formatGscErrorForUi(msg) {
  if (!msg) return msg;
  if (isGscApiNotEnabledError(msg)) {
    const m = msg.match(/project=(\d+)/);
    const project = m ? m[1] : "";
    const url = project
      ? `https://console.cloud.google.com/apis/library/searchconsole.googleapis.com?project=${project}`
      : "https://console.cloud.google.com/apis/library/searchconsole.googleapis.com";
    return (
      `${msg.slice(0, 200)} — включите Search Console API в Cloud-проекте OAuth-клиента ` +
      `(secrets/mcp/gsc-oauth-desktop.json), войдите как ${GSC_OAUTH_ACCOUNT_HINT}. ` +
      `См. npm run mcp:gsc-help. ${url}`
    );
  }
  if (/permission|insufficient|403|forbidden/i.test(msg)) {
    return (
      `${msg.slice(0, 200)} — для GSC нужен OAuth ${GSC_OAUTH_ACCOUNT_HINT} ` +
      `(npm run seo:gsc-oauth-token:install), не сервисный аккаунт.`
    );
  }
  return msg.slice(0, 280);
}

/**
 * Авторазгадывание капчи на странице SERP (Playwright + RuCaptcha).
 * SERP_CAPTCHA_SOLVER=1 и RUCAPTCHA_API_KEY (или CAPTCHA_API_KEY).
 */
import {
  getCaptchaApiKey,
  solveRecaptchaV2Proxyless,
  solveYandexSmartCaptchaProxyless,
} from "./captcha-two-api.mjs";

export { getCaptchaApiKey } from "./captcha-two-api.mjs";

export function captchaSolverEnabled() {
  return process.env.SERP_CAPTCHA_SOLVER === "1" && !!getCaptchaApiKey();
}

/** @param {import('playwright').Page} page */
async function isBlockedPage(page) {
  const pageUrl = page.url();
  if (/showcaptcha|smart-captcha|captcha\.yandex/i.test(pageUrl)) return true;
  const title = await page.title();
  if (/captcha|robot|unusual traffic|подтвердите|automated|не робот/i.test(title)) {
    return true;
  }
  return (
    (await page.locator("form[action*='captcha'], #captcha, .CheckboxCaptcha").count()) > 0
  );
}

/** @param {import('playwright').Page} page */
export async function extractYandexSmartCaptchaSitekey(page) {
  return page.evaluate(() => {
    const el = document.querySelector("[data-sitekey]");
    if (el) {
      const k = el.getAttribute("data-sitekey");
      if (k) return k;
    }
    const html = document.documentElement.innerHTML;
    const m1 = html.match(/sitekey["'\s:=]+([a-zA-Z0-9_-]{10,})/i);
    if (m1) return m1[1];
    return null;
  });
}

/** @param {import('playwright').Page} page */
export async function extractRecaptchaSitekey(page) {
  return page.evaluate(() => {
    const el = document.querySelector(".g-recaptcha[data-sitekey], [data-sitekey]");
    const k = el?.getAttribute("data-sitekey");
    if (k) return k;
    return null;
  });
}

/** @param {import('playwright').Page} page @param {string} token */
export async function injectYandexSmartCaptchaToken(page, token) {
  await page.evaluate((t) => {
    for (const sel of [
      'input[name="smart-token"]',
      'input[name="captcha-token"]',
      'input[name="rep"]',
    ]) {
      document.querySelectorAll(sel).forEach((inp) => {
        /** @type {HTMLInputElement} */ (inp).value = t;
      });
    }
    const w = /** @type {Record<string, unknown>} */ (window);
    if (typeof w.smartCaptchaCallback === "function") w.smartCaptchaCallback(t);
    if (typeof w.onSmartCaptchaSuccess === "function") w.onSmartCaptchaSuccess(t);
    const form = document.querySelector(
      "form[action*='checkcaptcha'], form[action*='captcha']",
    );
    if (form) form.submit();
  }, token);
}

/** @param {import('playwright').Page} page @param {string} token */
export async function injectRecaptchaToken(page, token) {
  await page.evaluate((t) => {
    document
      .querySelectorAll("#g-recaptcha-response, textarea[name='g-recaptcha-response']")
      .forEach((el) => {
        /** @type {HTMLInputElement | HTMLTextAreaElement} */ (el).value = t;
      });
  }, token);
}

/**
 * @param {import('playwright').Page} page
 * @param {{ engine?: 'yandex' | 'google'; label?: string }} [opts]
 */
export async function trySolveSerpCaptcha(page, opts = {}) {
  if (!captchaSolverEnabled()) return false;
  if (!(await isBlockedPage(page))) return true;

  const label = opts.label || (opts.engine === "google" ? "Google" : "Яндекс");
  const pageUrl = page.url();

  try {
    if (opts.engine === "google" || /google\./i.test(pageUrl)) {
      const sitekey = await extractRecaptchaSitekey(page);
      if (!sitekey) return false;
      const token = await solveRecaptchaV2Proxyless({ websiteURL: pageUrl, websiteKey: sitekey });
      await injectRecaptchaToken(page, token);
    } else {
      const sitekey = await extractYandexSmartCaptchaSitekey(page);
      if (!sitekey) {
        console.warn(`  RuCaptcha (${label}): sitekey не найден`);
        return false;
      }
      const token = await solveYandexSmartCaptchaProxyless({
        websiteURL: pageUrl,
        websiteKey: sitekey,
      });
      await injectYandexSmartCaptchaToken(page, token);
    }

    await page.waitForTimeout(2500);
    try {
      await page.waitForURL(/\/search|google\.[^/]+\/search/i, {
        timeout: 45_000,
        waitUntil: "domcontentloaded",
      });
    } catch {
      /* ignore */
    }
    const ok = !(await isBlockedPage(page));
    if (ok) console.log(`  ✓ RuCaptcha: капча пройдена (${label})`);
    return ok;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn(`  RuCaptcha (${label}): ${msg}`);
    return false;
  }
}

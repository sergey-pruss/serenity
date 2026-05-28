/**
 * RuCaptcha / 2Captcha API v2 (createTask / getTaskResult).
 * Yandex SmartCaptcha: https://rucaptcha.com/api-docs/yandex-smart-captcha
 *
 * Env:
 *   RUCAPTCHA_API_KEY, CAPTCHA_API_KEY или TWO_CAPTCHA_API_KEY — ключ кабинета
 *   CAPTCHA_API_BASE — по умолчанию https://api.rucaptcha.com (2captcha.com — тот же API)
 */

const DEFAULT_BASE = "https://api.rucaptcha.com";

/**
 * @returns {string | null}
 */
export function getCaptchaApiKey() {
  const k =
    process.env.CAPTCHA_API_KEY?.trim() ||
    process.env.TWO_CAPTCHA_API_KEY?.trim() ||
    process.env.RUCAPTCHA_API_KEY?.trim();
  return k || null;
}

/**
 * @param {string} path
 * @param {Record<string, unknown>} body
 */
async function apiPost(path, body) {
  const base = (process.env.CAPTCHA_API_BASE || DEFAULT_BASE).replace(/\/$/, "");
  const res = await fetch(`${base}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60_000),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Captcha API HTTP ${res.status}: ${JSON.stringify(json).slice(0, 200)}`);
  }
  if (json.errorId && json.errorId !== 0) {
    throw new Error(
      `Captcha API error ${json.errorId}: ${json.errorCode || ""} ${json.errorDescription || ""}`.trim(),
    );
  }
  return json;
}

/**
 * @param {number} taskId
 * @param {{ pollMs?: number; maxMs?: number }} [opts]
 */
async function waitTaskResult(taskId, opts = {}) {
  const pollMs = opts.pollMs ?? 5000;
  const maxMs = opts.maxMs ?? 180_000;
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    const json = await apiPost("/getTaskResult", {
      clientKey: getCaptchaApiKey(),
      taskId,
    });
    if (json.status === "ready") {
      const token =
        json.solution?.token ||
        json.solution?.gRecaptchaResponse ||
        json.solution?.text;
      if (!token) {
        throw new Error("Captcha API: пустой solution");
      }
      return String(token);
    }
    if (json.status === "processing") {
      await new Promise((r) => setTimeout(r, pollMs));
      continue;
    }
    throw new Error(`Captcha API: неожиданный status ${json.status}`);
  }
  throw new Error("Captcha API: таймаут ожидания решения");
}

/**
 * @param {{ websiteURL: string; websiteKey: string }} params
 */
export async function solveYandexSmartCaptchaProxyless(params) {
  const clientKey = getCaptchaApiKey();
  if (!clientKey) {
    throw new Error("RUCAPTCHA_API_KEY / CAPTCHA_API_KEY не задан");
  }

  const created = await apiPost("/createTask", {
    clientKey,
    task: {
      type: "YandexSmartCaptchaTaskProxyless",
      websiteURL: params.websiteURL,
      websiteKey: params.websiteKey,
    },
  });

  const taskId = created.taskId;
  if (!taskId) {
    throw new Error("Captcha API: нет taskId");
  }

  console.log(`  RuCaptcha: задача ${taskId} (Yandex SmartCaptcha)…`);
  return waitTaskResult(taskId);
}

/**
 * @param {{ websiteURL: string; websiteKey: string }} params
 */
export async function solveRecaptchaV2Proxyless(params) {
  const clientKey = getCaptchaApiKey();
  if (!clientKey) {
    throw new Error("RUCAPTCHA_API_KEY / CAPTCHA_API_KEY не задан");
  }

  const created = await apiPost("/createTask", {
    clientKey,
    task: {
      type: "RecaptchaV2TaskProxyless",
      websiteURL: params.websiteURL,
      websiteKey: params.websiteKey,
      isInvisible: false,
    },
  });

  const taskId = created.taskId;
  if (!taskId) {
    throw new Error("Captcha API: нет taskId");
  }

  console.log(`  2Captcha: задача ${taskId} (reCAPTCHA v2)…`);
  return waitTaskResult(taskId);
}

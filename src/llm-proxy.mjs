/**
 * Прокси chat/completions для сервисов на VPS (Groq/OpenAI недоступны по региону).
 *
 * POST /api/internal/llm-chat-completions
 * Authorization: Bearer <LLM_PROXY_SECRET | RANK_DASHBOARD_NOTIFY_SECRET>
 * Body: OpenAI-compatible chat completion JSON (model, messages, …)
 *
 * Worker secrets (wrangler secret put …):
 *   GROQ_API_KEY — основной ключ Groq
 * Optional:
 *   GROQ_API_KEY_2 — запасной аккаунт Groq (при 429)
 *   GEMINI_API_KEY — Google Gemini (free tier), OpenAI-совместимый API
 *   LLM_PROXY_SECRET — если не задан, используется RANK_DASHBOARD_NOTIFY_SECRET
 *   LLM_UPSTREAM_URL — default https://api.groq.com/openai/v1/chat/completions
 *   LLM_FALLBACK_MODEL — при 429 на Groq, default llama-3.1-8b-instant
 *   GEMINI_MODEL — при fallback на Gemini, default gemini-2.0-flash
 *   GEMINI_UPSTREAM_URL — default Google OpenAI-compat endpoint
 */

const DEFAULT_GROQ_UPSTREAM =
  "https://api.groq.com/openai/v1/chat/completions";

const DEFAULT_GEMINI_UPSTREAM =
  "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";

const DEFAULT_GROQ_FALLBACK_MODEL = "llama-3.1-8b-instant";
const DEFAULT_GEMINI_MODEL = "gemini-2.0-flash";

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function proxySecret(env) {
  return (
    env.LLM_PROXY_SECRET?.trim() ||
    env.RANK_DASHBOARD_NOTIFY_SECRET?.trim() ||
    ""
  );
}

function authorize(request, env) {
  const secret = proxySecret(env);
  if (!secret) {
    return { ok: false, status: 503, error: "Proxy secret not configured" };
  }
  const auth = request.headers.get("Authorization") || "";
  if (auth !== `Bearer ${secret}`) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }
  return { ok: true };
}

function isRateLimitResponse(status, text) {
  if (status === 429) {
    return true;
  }
  return /rate limit|tokens per day|\btpd\b|\btpm\b/i.test(text);
}

/** Уникальные upstream-попытки: Groq (ключ × модель) → Gemini. */
function buildUpstreamAttempts(env, body) {
  const requestedModel =
    typeof body.model === "string" && body.model.trim()
      ? body.model.trim()
      : DEFAULT_GROQ_FALLBACK_MODEL;
  const groqUrl = env.LLM_UPSTREAM_URL?.trim() || DEFAULT_GROQ_UPSTREAM;
  const groqFallbackModel =
    env.LLM_FALLBACK_MODEL?.trim() || DEFAULT_GROQ_FALLBACK_MODEL;
  const geminiUrl = env.GEMINI_UPSTREAM_URL?.trim() || DEFAULT_GEMINI_UPSTREAM;
  const geminiModel = env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;

  const attempts = [];
  const seen = new Set();

  function addAttempt(label, url, apiKey, model) {
    const key = `${url}|${apiKey.slice(0, 8)}|${model}`;
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    attempts.push({ label, url, apiKey, model });
  }

  const groqKeys = [env.GROQ_API_KEY, env.GROQ_API_KEY_2]
    .map((key) => key?.trim())
    .filter(Boolean);

  for (let i = 0; i < groqKeys.length; i++) {
    const key = groqKeys[i];
    const keyLabel = i === 0 ? "groq" : "groq-2";
    addAttempt(keyLabel, groqUrl, key, requestedModel);
    if (requestedModel !== groqFallbackModel) {
      addAttempt(`${keyLabel}:${groqFallbackModel}`, groqUrl, key, groqFallbackModel);
    }
  }

  const geminiKey = env.GEMINI_API_KEY?.trim();
  if (geminiKey) {
    addAttempt("gemini", geminiUrl, geminiKey, geminiModel);
  }

  return attempts;
}

async function callUpstream(attempt, body) {
  const payload = { ...body, model: attempt.model };
  const response = await fetch(attempt.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${attempt.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(120_000),
  });

  const text = await response.text();
  return { response, text };
}

export async function handleLlmChatCompletions(request, env) {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const auth = authorize(request, env);
  if (!auth.ok) {
    return json({ error: auth.error }, auth.status);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  if (!body || typeof body !== "object" || !Array.isArray(body.messages)) {
    return json({ error: "Expected OpenAI chat completion body" }, 400);
  }

  const attempts = buildUpstreamAttempts(env, body);
  if (attempts.length === 0) {
    return json(
      {
        error:
          "No LLM upstream configured (set GROQ_API_KEY and/or GEMINI_API_KEY on worker)",
      },
      503,
    );
  }

  let lastResponse = null;
  let lastText = "";

  for (let i = 0; i < attempts.length; i++) {
    const attempt = attempts[i];
    try {
      const { response, text } = await callUpstream(attempt, body);
      lastResponse = response;
      lastText = text;

      const hasNext = i < attempts.length - 1;
      if (hasNext && isRateLimitResponse(response.status, text)) {
        console.warn(
          `LLM proxy: rate limit on ${attempt.label} (${attempt.model}), trying ${attempts[i + 1].label}`,
        );
        continue;
      }

      return new Response(text, {
        status: response.status,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (i < attempts.length - 1) {
        console.warn(`LLM proxy: ${attempt.label} failed: ${message}`);
        continue;
      }
      return json({ error: `Upstream LLM failed: ${message}` }, 502);
    }
  }

  return new Response(lastText, {
    status: lastResponse?.status ?? 502,
    headers: { "Content-Type": "application/json" },
  });
}

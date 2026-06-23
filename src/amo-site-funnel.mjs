/**
 * Воронка «С сайта» для SEO-дашборда — те же OAuth-токены Amo, что у /api/lead.
 *
 * GET /api/internal/amo-site-funnel
 * Authorization: Bearer <RANK_DASHBOARD_NOTIFY_SECRET>
 * Query: months=6, pipelineId=9795
 */
import { amoGetRequest, getAmoAuthState } from "./lead-api.mjs";

const TZ = "Europe/Moscow";
const DEFAULT_PIPELINE_ID = 9795;
const DEFAULT_IN_WORK = "В работе";
const CLOSED_LOST_RE = /закрыт.*нереализ/i;

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function authorize(request, env) {
  const secret =
    env.RANK_DASHBOARD_AMO_FUNNEL_SECRET?.trim() ||
    env.RANK_DASHBOARD_NOTIFY_SECRET?.trim() ||
    "";
  if (!secret) {
    return { ok: false, status: 503, error: "RANK_DASHBOARD_NOTIFY_SECRET not configured" };
  }
  const auth = request.headers.get("Authorization") || "";
  if (auth !== `Bearer ${secret}`) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }
  return { ok: true };
}

function calendarDateTz(offsetDays = 0) {
  const t = Date.now() + offsetDays * 86400000;
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date(t));
}

function dateToUnixStart(date) {
  return Math.floor(new Date(`${date}T00:00:00+03:00`).getTime() / 1000);
}

function dateToUnixEnd(date) {
  return Math.floor(new Date(`${date}T23:59:59+03:00`).getTime() / 1000);
}

function unixToCalendarDate(ts) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date(ts * 1000));
}

function monthKeyFromDate(dateStr) {
  return String(dateStr).slice(0, 7);
}

/** Первый день месяца, от которого считаем periodMonths календарных месяцев до endDate. */
function startDateForMonths(monthCount, endDate) {
  const [ey, em] = monthKeyFromDate(endDate).split("-").map(Number);
  let y = ey;
  let m = em - (monthCount - 1);
  while (m <= 0) {
    m += 12;
    y -= 1;
  }
  return `${y}-${String(m).padStart(2, "0")}-01`;
}

function listMonthKeys(startDate, endDate) {
  const months = [];
  let [y, m] = monthKeyFromDate(startDate).split("-").map(Number);
  const [ey, em] = monthKeyFromDate(endDate).split("-").map(Number);
  while (y < ey || (y === ey && m <= em)) {
    months.push(`${y}-${String(m).padStart(2, "0")}`);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return months;
}

function monthRowCount(row) {
  return row.enteredInWork ?? row.newDeals ?? 0;
}

/** @param {string} endMonth YYYY-MM @param {number} count */
function monthBefore(endMonth, count) {
  let [y, m] = endMonth.split("-").map(Number);
  m -= count - 1;
  while (m <= 0) {
    m += 12;
    y -= 1;
  }
  return `${y}-${String(m).padStart(2, "0")}`;
}

/** Убираем ведущие месяцы без лидов — график начинается с первой активности. */
function trimLeadingZeroMonths(monthly) {
  let start = 0;
  while (start < monthly.length && monthRowCount(monthly[start]) === 0) start += 1;
  if (start >= monthly.length) return monthly.length ? [monthly[monthly.length - 1]] : [];
  return monthly.slice(start);
}

function pickFunnelStages(statuses, inWorkName, closedLostRe) {
  const sorted = [...statuses].sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
  const norm = (s) => String(s || "").trim().toLowerCase();
  const inWorkIdx = sorted.findIndex((s) => norm(s.name) === norm(inWorkName));
  if (inWorkIdx < 0) throw new Error(`Amo: этап «${inWorkName}» не найден в воронке`);
  let closedIdx = sorted.findIndex((s, i) => i >= inWorkIdx && closedLostRe.test(String(s.name || "")));
  if (closedIdx < 0) closedIdx = sorted.length - 1;
  return { stages: sorted.slice(inWorkIdx, closedIdx + 1), inWorkIdx, sorted };
}

function eventLeadStatus(event, pipelineId) {
  const after = event?.value_after?.[0]?.lead_status;
  const before = event?.value_before?.[0]?.lead_status;
  const accept = (st) => {
    if (!st) return null;
    if (st.pipeline_id != null && st.pipeline_id !== pipelineId) return null;
    return st;
  };
  return { after: accept(after), before: accept(before) };
}

async function amoGetAllPages(env, authState, path, query = {}, maxPages = 30) {
  const items = [];
  let page = 1;
  for (;;) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
      if (v == null || v === "") continue;
      if (Array.isArray(v)) {
        for (const item of v) params.append(k, String(item));
      } else {
        params.set(k, String(v));
      }
    }
    params.set("page", String(page));
    params.set("limit", "250");
    const res = await amoGetRequest(env, authState, `${path}?${params}`);
    const text = await res.text();
    if (!res.ok) throw new Error(`Amo GET ${path} p${page} ${res.status}: ${text.slice(0, 400)}`);
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      break;
    }
    const chunk = data._embedded?.events || data._embedded?.leads || [];
    if (!Array.isArray(chunk) || chunk.length === 0) break;
    items.push(...chunk);
    if (!data._links?.next?.href) break;
    page += 1;
    if (page > maxPages) break;
  }
  return items;
}

/**
 * @param {Record<string, unknown>} env
 * @param {{ pipelineId?: number, periodMonths?: number, inWorkName?: string, debug?: boolean }} [opts]
 */
export async function buildAmoSiteFunnelPayload(env, opts = {}) {
  if (!env.AMO_SUBDOMAIN || !env.AMO_CLIENT_ID || !env.AMO_CLIENT_SECRET) {
    throw new Error("AMO_SUBDOMAIN/AMO_CLIENT_ID/AMO_CLIENT_SECRET не заданы в Worker");
  }

  const pipelineId = Number(opts.pipelineId || env.AMO_SITE_PIPELINE_ID || DEFAULT_PIPELINE_ID);
  const periodMonths = Number(opts.periodMonths || env.AMO_SITE_FUNNEL_MONTHS || 6);
  const inWorkName = String(opts.inWorkName || env.AMO_IN_WORK_STATUS_NAME || DEFAULT_IN_WORK).trim();

  const endDate = calendarDateTz(-1);
  const startDate = startDateForMonths(periodMonths, endDate);
  const chartVisibleMonths = Number(opts.chartMonths || env.AMO_CHART_MONTHS || 5);
  const endMonth = monthKeyFromDate(endDate);
  const defaultChartMinMonth = monthBefore(endMonth, chartVisibleMonths);
  const chartMinMonth = String(
    opts.chartMinMonth || env.AMO_CHART_START_MONTH || defaultChartMinMonth,
  ).trim();
  const fromTs = dateToUnixStart(startDate);
  const toTs = dateToUnixEnd(endDate);

  const authState = await getAmoAuthState(env);
  if (!authState.accessToken || !authState.refreshToken) {
    throw new Error("AMO_ACCESS_TOKEN или AMO_REFRESH_TOKEN не заданы в Worker");
  }

  const pipeRes = await amoGetRequest(env, authState, `/leads/pipelines/${pipelineId}`);
  const pipeText = await pipeRes.text();
  if (!pipeRes.ok) throw new Error(`Amo pipeline ${pipelineId} ${pipeRes.status}: ${pipeText.slice(0, 400)}`);
  const pipeline = JSON.parse(pipeText);

  const allStatuses = [...(pipeline._embedded?.statuses || [])].sort(
    (a, b) => (a.sort ?? 0) - (b.sort ?? 0),
  );
  const { stages } = pickFunnelStages(allStatuses, inWorkName, CLOSED_LOST_RE);
  const inWorkStage = stages[0];
  if (!inWorkStage) throw new Error("Amo: нет этапов воронки");

  const funnelStatusIds = new Set(stages.map((s) => s.id));

  /** @type {Map<number, { firstInWorkAt: number, statusId: number | null }>} */
  const leads = new Map();

  /** Вход в «В работе» — только по событиям (без подстановки даты создания). */
  const statusEvents = await amoGetAllPages(
    env,
    authState,
    "/events",
    {
      "filter[type][]": "lead_status_changed",
      "filter[created_at][from]": fromTs,
      "filter[created_at][to]": toTs,
    },
    15,
  );

  for (const ev of statusEvents) {
    const entity = ev.entity || ev.entity_type;
    if (ev.type !== "lead_status_changed" || entity !== "lead" || !ev.entity_id) continue;
    const { after } = eventLeadStatus(ev, pipelineId);
    if (after?.id !== inWorkStage.id) continue;
    const leadId = ev.entity_id;
    const ts = ev.created_at;
    if (!ts) continue;
    let rec = leads.get(leadId);
    if (!rec) {
      rec = { firstInWorkAt: ts, statusId: null };
      leads.set(leadId, rec);
    } else if (ts < rec.firstInWorkAt) {
      rec.firstInWorkAt = ts;
    }
  }

  /** Актуальный этап (в т.ч. «Закрыто и не реализовано»). */
  const leadIds = [...leads.keys()];
  for (let i = 0; i < leadIds.length; i += 50) {
    const chunk = leadIds.slice(i, i + 50);
    const batch = await amoGetAllPages(
      env,
      authState,
      "/leads",
      { "filter[id][]": chunk },
      1,
    );
    for (const lead of batch) {
      const rec = leads.get(lead.id);
      if (!rec) continue;
      if (lead.pipeline_id !== pipelineId) {
        leads.delete(lead.id);
        continue;
      }
      rec.statusId = lead.status_id;
    }
  }

  function leadInChartPeriod(firstInWorkAt) {
    if (!firstInWorkAt) return false;
    const d = unixToCalendarDate(firstInWorkAt);
    if (d < startDate || d > endDate) return false;
    if (chartMinMonth && monthKeyFromDate(d) < chartMinMonth) return false;
    return true;
  }

  const qualified = [...leads.values()].filter((r) => leadInChartPeriod(r.firstInWorkAt));

  const monthKeys = listMonthKeys(startDate, endDate);
  const monthlyCounts = new Map(monthKeys.map((m) => [m, 0]));
  for (const rec of qualified) {
    const month = monthKeyFromDate(unixToCalendarDate(rec.firstInWorkAt));
    if (monthlyCounts.has(month)) monthlyCounts.set(month, (monthlyCounts.get(month) || 0) + 1);
  }

  const monthlyAll = [...monthlyCounts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, count]) => ({ month, enteredInWork: count }))
    .filter((row) => !chartMinMonth || row.month >= chartMinMonth);
  const monthly = trimLeadingZeroMonths(monthlyAll);
  const chartStartMonth = monthly[0]?.month || chartMinMonth || monthKeyFromDate(startDate);

  const qualifiedIds = new Set(
    [...leads.entries()]
      .filter(([, r]) => leadInChartPeriod(r.firstInWorkAt))
      .map(([id]) => id),
  );

  const currentlyByStage = Object.fromEntries(stages.map((s) => [s.id, 0]));
  for (const [leadId, rec] of leads.entries()) {
    if (!qualifiedIds.has(leadId)) continue;
    const sid = rec.statusId;
    if (sid != null && funnelStatusIds.has(sid)) currentlyByStage[sid] += 1;
  }

  const newInPeriod = await amoGetAllPages(
    env,
    authState,
    "/leads",
    {
      "filter[pipeline_id][]": pipelineId,
      "filter[created_at][from]": fromTs,
      "filter[created_at][to]": toTs,
    },
    1,
  );

  /** @type {{ statusEvents?: number, inWorkEvents?: number, byMonth?: unknown[] }} */
  const debugInfo = {};
  if (opts.debug) {
    debugInfo.statusEvents = statusEvents.length;
    debugInfo.inWorkEvents = leads.size;
    debugInfo.byMonth = [...leads.entries()].map(([id, r]) => ({
      id,
      firstInWorkAt: unixToCalendarDate(r.firstInWorkAt),
      month: monthKeyFromDate(unixToCalendarDate(r.firstInWorkAt)),
      statusId: r.statusId,
    }));
  }

  const payload = {
    fetchedAt: new Date().toISOString(),
    source: "amocrm-via-worker",
    pipelineId,
    pipelineName: pipeline.name,
    inWorkStatus: inWorkStage.name,
    period: { startDate, endDate, months: periodMonths, chartStartMonth, chartMinMonth },
    stages: stages.map((s) => ({
      id: s.id,
      name: s.name,
      sort: s.sort,
      currentCount: currentlyByStage[s.id] || 0,
    })),
    monthly,
    summary: {
      newInPeriod: newInPeriod.length,
      qualifiedInPeriod: qualified.length,
      enteredInWorkInPeriod: qualified.length,
    },
  };
  if (opts.debug) payload._debug = debugInfo;
  return payload;
}

export async function handleAmoSiteFunnelRequest(request, env) {
  if (request.method !== "GET") {
    return json({ ok: false, error: "Method not allowed" }, 405);
  }

  const auth = authorize(request, env);
  if (!auth.ok) {
    return json({ ok: false, error: auth.error }, auth.status);
  }

  const url = new URL(request.url);
  const pipelineId = Number(url.searchParams.get("pipelineId") || env.AMO_SITE_PIPELINE_ID || DEFAULT_PIPELINE_ID);
  const periodMonths = Number(url.searchParams.get("months") || env.AMO_SITE_FUNNEL_MONTHS || 6);
  const chartMinMonth = url.searchParams.get("chartStartMonth")?.trim() || undefined;
  const debug = url.searchParams.get("debug") === "1";

  try {
    const payload = await buildAmoSiteFunnelPayload(env, {
      pipelineId,
      periodMonths,
      chartMinMonth,
      debug,
    });
    return json({ ok: true, ...payload });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return json({ ok: false, error: msg }, 502);
  }
}

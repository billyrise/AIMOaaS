/**
 * 直近 N 日分の pageviews / CTA click / form submit を集計し data/pseo/metrics.json に保存。
 * - Cloudflare GraphQL（zone）で pageviews 取得（CF_API_TOKEN, CF_ZONE_ID ありの場合）
 * - CTA/form は既存計測基盤のエクスポートを events_export.json で取り込む
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..", "..");
const DATA_PSEO = join(ROOT, "data", "pseo");
const METRICS_PATH = join(DATA_PSEO, "metrics.json");
const EVENTS_EXPORT_PATH = join(DATA_PSEO, "events_export.json");

const DEFAULT_DAYS = 28;
const CF_GRAPHQL = "https://api.cloudflare.com/client/v4/graphql";

export interface PathMetrics {
  pageviews: number;
  cta_clicks: number;
  form_submits: number;
}

export interface PseoMetrics {
  period: {
    start_date: string;
    end_date: string;
    days: number;
  };
  by_path: Record<string, PathMetrics>;
}

function getDateRange(days: number): { start: Date; end: Date; startStr: string; endStr: string } {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - days);
  return {
    start,
    end,
    startStr: start.toISOString().slice(0, 19) + "Z",
    endStr: end.toISOString().slice(0, 19) + "Z",
  };
}

/** Cloudflare GraphQL で path 別 visits を取得（zone が CF プロキシの場合） */
async function fetchCloudflarePageviews(
  zoneId: string,
  apiToken: string,
  startStr: string,
  endStr: string
): Promise<Record<string, number>> {
  const query = `
    query PathVisits($zoneTag: string!, $filter: ZoneFilter!) {
      viewer {
        zones(filter: { zoneTag: $zoneTag }) {
          httpRequestsAdaptiveGroups(filter: $filter, limit: 500, orderBy: [sum_visits_DESC]) {
            sum { visits }
            dimensions { clientRequestPath }
          }
        }
      }
    }
  `;
  const body = {
    query,
    variables: {
      zoneTag: zoneId,
      filter: {
        datetime_geq: startStr,
        datetime_lt: endStr,
        requestSource: "eyeball",
      },
    },
  };
  const res = await fetch(CF_GRAPHQL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Cloudflare API ${res.status}: ${await res.text()}`);
  const json = (await res.json()) as {
    data?: { viewer?: { zones?: Array<{ httpRequestsAdaptiveGroups?: Array<{ sum: { visits: number }; dimensions: { clientRequestPath: string } }> }> } };
    errors?: Array<{ message: string }>;
  };
  if (json.errors?.length) throw new Error(json.errors.map((e) => e.message).join("; "));
  const groups = json.data?.viewer?.zones?.[0]?.httpRequestsAdaptiveGroups ?? [];
  const byPath: Record<string, number> = {};
  for (const g of groups) {
    const path = g.dimensions?.clientRequestPath ?? "";
    if (!path) continue;
    const normalized = path.endsWith("/") ? path : path + "/";
    byPath[normalized] = (byPath[normalized] ?? 0) + (g.sum?.visits ?? 0);
  }
  return byPath;
}

interface EventsByPath {
  [path: string]: { cta_clicks?: number; form_submits?: number };
}
interface EventsArray {
  events?: Array<{ path: string; event_type: string; count: number }>;
}

/** data/pseo/events_export.json を読む。形式: by_path または events 配列 */
function loadEventsExport(): Record<string, { cta_clicks: number; form_submits: number }> {
  const path = process.env.EVENTS_EXPORT_PATH || EVENTS_EXPORT_PATH;
  if (!existsSync(path)) return {};
  const raw = readFileSync(path, "utf8");
  const data = JSON.parse(raw) as EventsByPath & { by_path?: EventsByPath } | EventsArray;
  if ("by_path" in data && data.by_path && typeof data.by_path === "object") {
    const out: Record<string, { cta_clicks: number; form_submits: number }> = {};
    for (const [p, v] of Object.entries(data.by_path) as [string, { cta_clicks?: number; form_submits?: number }][]) {
      const key = p.endsWith("/") ? p : p + "/";
      out[key] = { cta_clicks: v.cta_clicks ?? 0, form_submits: v.form_submits ?? 0 };
    }
    return out;
  }
  if ("events" in data && Array.isArray(data.events)) {
    const out: Record<string, { cta_clicks: number; form_submits: number }> = {};
    for (const e of data.events) {
      const key = e.path.endsWith("/") ? e.path : e.path + "/";
      if (!out[key]) out[key] = { cta_clicks: 0, form_submits: 0 };
      if (e.event_type === "cta_click") out[key].cta_clicks += e.count ?? 1;
      else if (e.event_type === "form_submit") out[key].form_submits += e.count ?? 1;
    }
    return out;
  }
  return {};
}

export async function pullMetrics(options?: { days?: number }): Promise<PseoMetrics> {
  const days = options?.days ?? (parseInt(process.env.PSEO_ANALYTICS_DAYS ?? "", 10) || DEFAULT_DAYS);
  const { start, end, startStr, endStr } = getDateRange(days);
  const startDate = start.toISOString().slice(0, 10);
  const endDate = end.toISOString().slice(0, 10);

  const byPath: Record<string, PathMetrics> = {};
  let pageviewsByPath: Record<string, number> = {};

  const zoneId = process.env.CF_ZONE_ID;
  const apiToken = process.env.CF_API_TOKEN;
  if (zoneId && apiToken) {
    try {
      pageviewsByPath = await fetchCloudflarePageviews(zoneId, apiToken, startStr, endStr);
    } catch (err) {
      console.warn("Cloudflare pageviews fetch failed:", (err as Error).message);
    }
  }

  const eventsByPath = loadEventsExport();
  const allPaths = new Set([...Object.keys(pageviewsByPath), ...Object.keys(eventsByPath)]);

  for (const path of allPaths) {
    const normalized = path.endsWith("/") ? path : path + "/";
    byPath[normalized] = {
      pageviews: pageviewsByPath[normalized] ?? pageviewsByPath[path] ?? 0,
      cta_clicks: eventsByPath[normalized]?.cta_clicks ?? eventsByPath[path]?.cta_clicks ?? 0,
      form_submits: eventsByPath[normalized]?.form_submits ?? eventsByPath[path]?.form_submits ?? 0,
    };
  }

  const metrics: PseoMetrics = {
    period: { start_date: startDate, end_date: endDate, days },
    by_path: byPath,
  };
  return metrics;
}

async function main(): Promise<void> {
  const metrics = await pullMetrics();
  if (!existsSync(DATA_PSEO)) {
    const { mkdirSync } = await import("fs");
    mkdirSync(DATA_PSEO, { recursive: true });
  }
  writeFileSync(METRICS_PATH, JSON.stringify(metrics, null, 2), "utf8");
  console.log(`Wrote ${METRICS_PATH} (${metrics.period.start_date}–${metrics.period.end_date}, ${Object.keys(metrics.by_path).length} paths)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

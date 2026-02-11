/**
 * metrics.json を読み、CVR の高い page_type / 産業 / 規格の組み合わせを抽出し、
 * catalog 追加候補のレポートを生成（自動では追加しない）。PR コメント用 Markdown を出力可能。
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";
import yaml from "js-yaml";
import type { Catalog, CatalogPage } from "./types.js";
import type { PseoMetrics, PathMetrics } from "./analytics_pull.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..", "..");
const DATA_PSEO = join(ROOT, "data", "pseo");
const METRICS_PATH = join(DATA_PSEO, "metrics.json");
const CATALOG_PATH = join(DATA_PSEO, "catalog.yaml");
const REPORT_PATH = join(DATA_PSEO, "prioritize-report.json");
const REPORT_MD_PATH = join(DATA_PSEO, "prioritize-report.md");

const MIN_PAGEVIEWS_FOR_CVR = 10;

export interface PageWithMetrics extends CatalogPage {
  path_metrics: PathMetrics;
  conversions: number;
  cvr: number;
}

export interface DimensionCvr {
  dimension: string;
  value: string;
  pageviews: number;
  conversions: number;
  cvr: number;
  page_ids: string[];
}

export interface PrioritizeReport {
  period: PseoMetrics["period"];
  by_page: PageWithMetrics[];
  by_page_type: DimensionCvr[];
  by_industry: DimensionCvr[];
  by_standard: DimensionCvr[];
  candidate_recommendations: string[];
  generated_at: string;
}

function loadCatalog(): Catalog {
  const raw = readFileSync(CATALOG_PATH, "utf8");
  return yaml.load(raw) as Catalog;
}

function loadMetrics(): PseoMetrics | null {
  if (!existsSync(METRICS_PATH)) return null;
  const raw = readFileSync(METRICS_PATH, "utf8");
  return JSON.parse(raw) as PseoMetrics;
}

function normalizePath(p: string): string {
  return p.endsWith("/") ? p : p + "/";
}

export function runPrioritize(metrics: PseoMetrics, catalog: Catalog): PrioritizeReport {
  /** Phase 1–4: ja のみ（i18n-policy.md） */
  const pages = catalog.pages.filter((p) => p.lang === "ja");

  const slugToPage = new Map<string, CatalogPage>();
  for (const page of pages) {
    slugToPage.set(normalizePath(page.slug), page);
  }

  const byPage: PageWithMetrics[] = [];
  for (const page of pages) {
    const path = normalizePath(page.slug);
    const m = metrics.by_path[path] ?? { pageviews: 0, cta_clicks: 0, form_submits: 0 };
    const conversions = m.cta_clicks + m.form_submits;
    const cvr = m.pageviews > 0 ? conversions / m.pageviews : 0;
    byPage.push({
      ...page,
      path_metrics: m,
      conversions,
      cvr,
    });
  }

  const aggregateBy = (keyFn: (p: PageWithMetrics) => string | undefined): DimensionCvr[] => {
    const groups = new Map<
      string,
      { pageviews: number; conversions: number; page_ids: string[] }
    >();
    for (const p of byPage) {
      const key = keyFn(p);
      if (key == null || key === "") continue;
      const cur = groups.get(key) ?? { pageviews: 0, conversions: 0, page_ids: [] };
      cur.pageviews += p.path_metrics.pageviews;
      cur.conversions += p.conversions;
      cur.page_ids.push(p.id);
      groups.set(key, cur);
    }
    return [...groups.entries()]
      .map(([value, g]) => ({
        dimension: "dim",
        value,
        pageviews: g.pageviews,
        conversions: g.conversions,
        cvr: g.pageviews > 0 ? g.conversions / g.pageviews : 0,
        page_ids: g.page_ids,
      }))
      .filter((r) => r.pageviews >= MIN_PAGEVIEWS_FOR_CVR)
      .sort((a, b) => b.cvr - a.cvr);
  };

  const byPageType = aggregateBy((p) => p.page_type).map((r) => ({ ...r, dimension: "page_type" }));
  const byIndustry = aggregateBy((p) => p.artifact_context?.industry).filter((r) => r.value != null).map((r) => ({ ...r, dimension: "industry" }));
  const byStandard = aggregateBy((p) => p.artifact_context?.standard).filter((r) => r.value != null).map((r) => ({ ...r, dimension: "standard" }));

  const candidateRecommendations: string[] = [];
  for (const row of byPageType.slice(0, 3)) {
    if (row.cvr > 0) candidateRecommendations.push(`page_type **${row.value}** が CVR ${(row.cvr * 100).toFixed(2)}%（PV ${row.pageviews}、コンバージョン ${row.conversions}）。同型の追加ページを検討。`);
  }
  for (const row of byIndustry.slice(0, 2)) {
    if (row.cvr > 0) candidateRecommendations.push(`産業 **${row.value}** が CVR ${(row.cvr * 100).toFixed(2)}%。該当 artifact_context のページ追加を検討。`);
  }
  for (const row of byStandard.slice(0, 2)) {
    if (row.cvr > 0) candidateRecommendations.push(`規格 **${row.value}** が CVR ${(row.cvr * 100).toFixed(2)}%。該当 artifact_context のページ追加を検討。`);
  }
  if (candidateRecommendations.length === 0) candidateRecommendations.push("十分な PV またはコンバージョンがまだありません。metrics.json を更新して再実行してください。");

  return {
    period: metrics.period,
    by_page: byPage,
    by_page_type: byPageType,
    by_industry: byIndustry,
    by_standard: byStandard,
    candidate_recommendations: candidateRecommendations,
    generated_at: new Date().toISOString(),
  };
}

export function reportToMarkdown(report: PrioritizeReport): string {
  const lines: string[] = [
    "## 作るべきページ候補（CTA CVR ベース）",
    "",
    `集計期間: ${report.period.start_date} 〜 ${report.period.end_date}（${report.period.days} 日）`,
    "",
    "### 推奨（CVR の高い型を増やす）",
    "",
  ];
  for (const rec of report.candidate_recommendations) {
    lines.push(`- ${rec}`);
  }
  lines.push("", "### page_type 別 CVR（PV≥10）", "");
  for (const r of report.by_page_type.slice(0, 5)) {
    lines.push(`| ${r.value} | PV ${r.pageviews} | コンバージョン ${r.conversions} | CVR ${(r.cvr * 100).toFixed(2)}% |`);
  }
  if (report.by_industry.length > 0) {
    lines.push("", "### 産業別 CVR", "");
    for (const r of report.by_industry.slice(0, 5)) {
      lines.push(`| ${r.value} | PV ${r.pageviews} | コンバージョン ${r.conversions} | CVR ${(r.cvr * 100).toFixed(2)}% |`);
    }
  }
  if (report.by_standard.length > 0) {
    lines.push("", "### 規格別 CVR", "");
    for (const r of report.by_standard.slice(0, 5)) {
      lines.push(`| ${r.value} | PV ${r.pageviews} | コンバージョン ${r.conversions} | CVR ${(r.cvr * 100).toFixed(2)}% |`);
    }
  }
  lines.push("", "---", "*catalog への追加は手動で行い、human approval 後に merge してください。*");
  return lines.join("\n");
}

async function main(): Promise<void> {
  const catalog = loadCatalog();
  const metrics = loadMetrics();
  if (!metrics) {
    console.warn("metrics.json がありません。analytics_pull を先に実行するか、CF_ZONE_ID/CF_API_TOKEN と events_export.json で metrics を生成してください。");
    const stub: PseoMetrics = {
      period: { start_date: "", end_date: "", days: 0 },
      by_path: {},
    };
    const pagesStub = catalog.pages.filter((p) => p.lang === "ja");
    for (const p of pagesStub) {
      stub.by_path[normalizePath(p.slug)] = { pageviews: 0, cta_clicks: 0, form_submits: 0 };
    }
    const report = runPrioritize(stub, catalog);
    writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), "utf8");
    writeFileSync(REPORT_MD_PATH, reportToMarkdown(report), "utf8");
    console.log("Stub report written (no metrics).");
    return;
  }
  const report = runPrioritize(metrics, catalog);
  writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), "utf8");
  writeFileSync(REPORT_MD_PATH, reportToMarkdown(report), "utf8");
  console.log(`Wrote ${REPORT_PATH} and ${REPORT_MD_PATH}`);
  console.log("\n" + reportToMarkdown(report));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

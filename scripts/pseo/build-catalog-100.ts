/**
 * 勝ち筋の集合：100 エントリ（ja のみ、A〜E バランス、高意図キーワード、module_refs 5+、references 3+）。
 * 実行: npx tsx build-catalog-100.ts → data/pseo/catalog.yaml を上書きする。
 */

import { writeFileSync } from "fs";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";
import yaml from "js-yaml";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..", "..");
const OUT = join(ROOT, "data", "pseo", "catalog.yaml");

const AIMO = "https://aimoaas.com/ja";
const AIMO_STANDARD = "https://aimoaas.com/ja/aimo-standard/";
const SHADOW_AI = "https://aimoaas.com/ja/resources/shadow-ai/";
const HITL = "https://aimoaas.com/ja/resources/human-in-the-loop/";
const AUDIT_FIRMS = "https://aimoaas.com/ja/audit-firms/";
const ISO42001 = "https://www.iso.org/standard/81230.html";
const NIST_RMF = "https://www.nist.gov/itl/ai-risk-management-framework";
const EU_AI_ACT = "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R1689";

const MODULES = [
  "audit-questions-pack.md",
  "common-gaps-and-remediation.md",
  "continuous-audit-workflow.md",
  "control-to-evidence-frequency.md",
  "coverage-map-eu-ai-act-perspectives.md",
  "coverage-map-iso42001-perspectives.md",
  "coverage-map-nist-rmf-perspectives.md",
  "coverage-map-overview.md",
  "evidence-bundle-structure-summary.md",
  "evidence-pack-common-formats.md",
  "evidence-pack-index-requirements.md",
  "evidence-pack-table-template.md",
  "glossary-evidence-terms.md",
  "inventory-and-review-cycle.md",
  "minimum-evidence-checklist-shadow-ai.md",
  "minimum-evidence-requirements-table.md",
  "proof-vs-assurance-table.md",
  "raci-request-approval-exception.md",
  "responsibility-boundary-proof-assurance.md",
  "sla-and-responsibility-matrix.md",
  "workflow-request-review-exception-renewal.md",
];

type PageType = "A" | "B" | "C" | "D" | "E";
type CTA = "tier1_free_log_analysis" | "tier2_bpr_sprint" | "exec_onepager_request";

/** 決定的に先頭から n 個を返す（seed の id 順で一貫性を保つ） */
function pick<T>(arr: T[], n: number): T[] {
  return arr.slice(0, n);
}

function pickModules(forType: PageType, count: number): string[] {
  const byType: Record<PageType, string[]> = {
    A: ["evidence-bundle-structure-summary.md", "evidence-pack-table-template.md", "evidence-pack-index-requirements.md", "evidence-pack-common-formats.md", "common-gaps-and-remediation.md", "glossary-evidence-terms.md"],
    B: ["minimum-evidence-requirements-table.md", "minimum-evidence-checklist-shadow-ai.md", "control-to-evidence-frequency.md", "audit-questions-pack.md", "common-gaps-and-remediation.md", "evidence-pack-table-template.md"],
    C: ["workflow-request-review-exception-renewal.md", "raci-request-approval-exception.md", "continuous-audit-workflow.md", "inventory-and-review-cycle.md", "common-gaps-and-remediation.md", "audit-questions-pack.md"],
    D: ["responsibility-boundary-proof-assurance.md", "proof-vs-assurance-table.md", "sla-and-responsibility-matrix.md", "common-gaps-and-remediation.md", "audit-questions-pack.md", "evidence-pack-table-template.md"],
    E: ["coverage-map-overview.md", "coverage-map-iso42001-perspectives.md", "coverage-map-nist-rmf-perspectives.md", "coverage-map-eu-ai-act-perspectives.md", "common-gaps-and-remediation.md", "minimum-evidence-requirements-table.md"],
  };
  return pick(byType[forType], Math.max(count, 5));
}

function refsAimo(min = 3, extra: string[] = []): string[] {
  const base = [AIMO_STANDARD, AIMO, SHADOW_AI, HITL, AUDIT_FIRMS];
  const chosen = base.slice(0, min);
  return [...new Set([...chosen, ...extra])];
}

interface PageSeed {
  id: string;
  page_type: PageType;
  slug: string;
  intent_keywords: string[];
  primary_cta: CTA;
}

const CTAS: CTA[] = ["tier1_free_log_analysis", "tier2_bpr_sprint", "exec_onepager_request"];

const SEEDS: PageSeed[] = [
  { id: "pseo-evidence-pack", page_type: "A", slug: "/ja/resources/pseo/evidence-pack/", intent_keywords: ["Evidence Pack", "証拠パック", "監査提出物", "証跡目次", "証跡バンドル"], primary_cta: "tier1_free_log_analysis" },
  { id: "pseo-evidence-pack-formats", page_type: "A", slug: "/ja/resources/pseo/evidence-pack-formats/", intent_keywords: ["Evidence Pack 形式", "証跡 形式", "監査 提出 形式"], primary_cta: "tier2_bpr_sprint" },
  { id: "pseo-evidence-pack-index", page_type: "A", slug: "/ja/resources/pseo/evidence-pack-index/", intent_keywords: ["証跡目次", "監査 証拠 一覧", "Evidence Pack 目次"], primary_cta: "tier1_free_log_analysis" },
  { id: "pseo-evidence-pack-minimum", page_type: "A", slug: "/ja/resources/pseo/evidence-pack-minimum/", intent_keywords: ["証拠 最小要件", "監査 提出 最小", "Evidence 最小"], primary_cta: "tier2_bpr_sprint" },
  { id: "pseo-evidence-bundle-structure", page_type: "A", slug: "/ja/resources/pseo/evidence-bundle-structure/", intent_keywords: ["証跡バンドル 構成", "監査 証拠 構成", "Evidence Bundle"], primary_cta: "tier1_free_log_analysis" },
  { id: "pseo-audit-submission-checklist", page_type: "A", slug: "/ja/resources/pseo/audit-submission-checklist/", intent_keywords: ["監査 提出 チェックリスト", "証跡 提出物", "申請 証拠"], primary_cta: "tier2_bpr_sprint" },
  { id: "pseo-evidence-gaps-remediation", page_type: "A", slug: "/ja/resources/pseo/evidence-gaps-remediation/", intent_keywords: ["証拠 欠落", "監査 指摘 対策", "証跡 ギャップ"], primary_cta: "tier1_free_log_analysis" },
  { id: "pseo-evidence-formats-standards", page_type: "A", slug: "/ja/resources/pseo/evidence-formats-standards/", intent_keywords: ["証跡 形式 基準", "監査 提出 形式", "Evidence 形式"], primary_cta: "exec_onepager_request" },
  { id: "pseo-minimum-evidence", page_type: "B", slug: "/ja/resources/pseo/minimum-evidence-requirements/", intent_keywords: ["最小証拠要件", "必要証跡", "証拠 頻度", "統制 証跡"], primary_cta: "tier1_free_log_analysis" },
  { id: "pseo-minimum-evidence-shadow-ai", page_type: "B", slug: "/ja/resources/pseo/minimum-evidence-shadow-ai/", intent_keywords: ["シャドーAI 証跡", "シャドーAI 証拠要件", "個人利用 ログ 証跡"], primary_cta: "tier2_bpr_sprint" },
  { id: "pseo-audit-questions-pack", page_type: "B", slug: "/ja/resources/pseo/audit-questions-pack/", intent_keywords: ["監査 質問 証跡", "監査で聞かれる 証拠", "内部監査 AI ガバナンス"], primary_cta: "tier1_free_log_analysis" },
  { id: "pseo-control-evidence-frequency", page_type: "B", slug: "/ja/resources/pseo/control-evidence-frequency/", intent_keywords: ["統制 証跡 頻度", "証拠 頻度 要件", "ログ 保持 頻度"], primary_cta: "tier2_bpr_sprint" },
  { id: "pseo-evidence-requirements-table", page_type: "B", slug: "/ja/resources/pseo/evidence-requirements-table/", intent_keywords: ["証拠要件 表", "統制 証跡 一覧", "最小証拠 表"], primary_cta: "tier1_free_log_analysis" },
  { id: "pseo-internal-audit-evidence", page_type: "B", slug: "/ja/resources/pseo/internal-audit-evidence/", intent_keywords: ["内部監査 証跡", "監査 証拠 準備", "AI ガバナンス 証跡"], primary_cta: "tier2_bpr_sprint" },
  { id: "pseo-operating-workflow", page_type: "C", slug: "/ja/resources/pseo/operating-workflow/", intent_keywords: ["AI 利用 運用フロー", "申請 審査 例外 更新", "棚卸 継続監査", "RACI ガバナンス"], primary_cta: "tier1_free_log_analysis" },
  { id: "pseo-workflow-renewal", page_type: "C", slug: "/ja/resources/pseo/operating-workflow-renewal/", intent_keywords: ["ポリシー 更新 フロー", "例外 申請 審査", "継続監査 棚卸"], primary_cta: "exec_onepager_request" },
  { id: "pseo-request-review-exception", page_type: "C", slug: "/ja/resources/pseo/request-review-exception/", intent_keywords: ["申請 審査", "例外 申請", "AI 利用 申請"], primary_cta: "tier1_free_log_analysis" },
  { id: "pseo-raci-governance", page_type: "C", slug: "/ja/resources/pseo/raci-governance/", intent_keywords: ["RACI", "責任 分担", "申請 承認 責任"], primary_cta: "tier2_bpr_sprint" },
  { id: "pseo-inventory-review-cycle", page_type: "C", slug: "/ja/resources/pseo/inventory-review-cycle/", intent_keywords: ["棚卸", "継続監査", "定期 レビュー"], primary_cta: "tier1_free_log_analysis" },
  { id: "pseo-continuous-audit-workflow", page_type: "C", slug: "/ja/resources/pseo/continuous-audit-workflow/", intent_keywords: ["継続監査 フロー", "棚卸 サイクル", "監査 継続"], primary_cta: "tier2_bpr_sprint" },
  { id: "pseo-responsibility-boundary", page_type: "D", slug: "/ja/resources/pseo/responsibility-boundary/", intent_keywords: ["責任分界", "Proof Assurance", "証憑 保証", "誰が保証するか"], primary_cta: "exec_onepager_request" },
  { id: "pseo-proof-vs-assurance", page_type: "D", slug: "/ja/resources/pseo/proof-vs-assurance/", intent_keywords: ["Proof Assurance", "証憑 保証", "責任 分界"], primary_cta: "exec_onepager_request" },
  { id: "pseo-sla-responsibility-matrix", page_type: "D", slug: "/ja/resources/pseo/sla-responsibility-matrix/", intent_keywords: ["SLA", "責任 マトリクス", "保証 範囲"], primary_cta: "tier2_bpr_sprint" },
  { id: "pseo-coverage-map", page_type: "E", slug: "/ja/resources/pseo/coverage-map/", intent_keywords: ["Coverage Map", "ISO 42001 対応観点", "NIST AI RMF 対応", "EU AI Act 対応観点"], primary_cta: "tier2_bpr_sprint" },
  { id: "pseo-coverage-map-iso", page_type: "E", slug: "/ja/resources/pseo/coverage-map-iso42001/", intent_keywords: ["ISO IEC 42001 対応", "AI マネジメント 証跡", "42001 証拠"], primary_cta: "exec_onepager_request" },
];

// 残り 100 - SEEDS.length を A〜E で均等に追加（高意図キーワード中心）
const INTENT_POOL: Record<PageType, string[][]> = {
  A: [["監査", "証跡", "申請", "Evidence Pack"], ["証拠パック", "提出物", "目次"], ["証跡バンドル", "最小要件"], ["監査提出物", "形式"]],
  B: [["監査", "証跡", "最小証拠"], ["証拠要件", "頻度", "統制"], ["シャドーAI", "ログ", "証跡"], ["内部監査", "質問", "証拠"]],
  C: [["申請", "審査", "例外", "更新"], ["棚卸", "継続監査", "RACI"], ["運用フロー", "ポリシー更新"], ["Human-in-the-Loop", "申請 承認"]],
  D: [["責任分界", "Proof", "Assurance"], ["証憑", "保証", "誰が"], ["SLA", "責任マトリクス"]],
  E: [["ISO/IEC 42001", "NIST AI RMF", "EU AI Act"], ["ISMS", "対応観点", "Coverage Map"], ["AI マネジメント", "規制 対応"]],
};

let seedId = 100;
function moreSeeds(targetTotal: number): PageSeed[] {
  const out = [...SEEDS];
  const perType = Math.ceil((targetTotal - SEEDS.length) / 5);
  const types: PageType[] = ["A", "B", "C", "D", "E"];
  for (const t of types) {
    for (let i = 0; i < perType && out.length < targetTotal; i++) {
      const kw = INTENT_POOL[t][i % INTENT_POOL[t].length];
      seedId++;
      out.push({
        id: `pseo-gen-${t.toLowerCase()}-${seedId}`,
        page_type: t,
        slug: `/ja/resources/pseo/${t.toLowerCase()}-${seedId}/`,
        intent_keywords: [...kw, "監査", "証跡"].slice(0, 5),
        primary_cta: CTAS[i % 3],
      });
    }
  }
  return out.slice(0, targetTotal);
}

function buildPages(seeds: PageSeed[]): Record<string, unknown>[] {
  const allIds = seeds.map((s) => s.id);
  return seeds.map((s, idx) => {
    const refs = s.page_type === "E" ? refsAimo(3, [ISO42001, NIST_RMF, EU_AI_ACT]) : refsAimo(3);
    const others = allIds.filter((id) => id !== s.id);
    const start = idx % Math.max(1, others.length);
    const relatedFinal = [...others.slice(start), ...others.slice(0, start)].slice(0, 8);
    return {
      id: s.id,
      lang: "ja",
      page_type: s.page_type,
      slug: s.slug,
      intent_keywords: s.intent_keywords,
      primary_cta: s.primary_cta,
      module_refs: pickModules(s.page_type, 6),
      references: refs,
      related_pages: relatedFinal,
    };
  });
}

function main(): void {
  const seeds = moreSeeds(100);
  const pages = buildPages(seeds);
  const catalog = { pages };
  const yamlOut =
    "# SSOT 索引：Programmatic SEO ページの定義（100 件・ja のみ・高意図中心）\n" +
    "# module_refs 5本以上・references に AIMO Standard 等 3本以上。\n\n" +
    yaml.dump(catalog, { lineWidth: 120, noRefs: true });
  writeFileSync(OUT, yamlOut, "utf8");
  console.log(`Wrote ${OUT} (${pages.length} pages)`);
  const byType = pages.reduce((acc: Record<string, number>, p: Record<string, unknown>) => {
    const t = p.page_type as string;
    acc[t] = (acc[t] || 0) + 1;
    return acc;
  }, {});
  console.log("By type:", byType);
}

main();

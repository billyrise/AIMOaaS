/**
 * Phase A: PSEO ページ台帳（SSOT）を生成する。
 * 入力: data/pseo/pseo_pages.json
 * 出力: ssot/pseo_pages.json（url, cluster_id, intent_id, is_pillar, robots, canonical_target, page_priority, summary, audience_tags, has_asset, references_min）
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join, resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..", "..");
const DATA_PSEO = join(ROOT, "data", "pseo");
const SSOT_DIR = join(ROOT, "ssot");
const BASE_URL = "https://aimoaas.com";

const PILLAR_URLS = {
  EP1: `${BASE_URL}/ja/resources/pseo/evidence-pack-ai-audit-evidence-pack/`,
  EP2: `${BASE_URL}/ja/resources/pseo/proof-assurance-boundary-ai-audit-evidence-bundle-structure/`,
  INV1: `${BASE_URL}/ja/resources/pseo/ai-audit-controls-inventory-continuous-audit-workflow/`,
  MIN1: `${BASE_URL}/ja/resources/pseo/proof-assurance-boundary-ai-audit-controls-control-evidence-frequency/`,
  WORKFLOW1: `${BASE_URL}/ja/resources/pseo/intake-review-approve-ai-audit-controls-request-review-exception/`,
  RACI1: `${BASE_URL}/ja/resources/pseo/responsibility-boundary-intake-review-approve-ai-raci-governance/`,
} as const;

/** noindex でこの canonical に集約する slug のセット */
const NOINDEX_TO_EP1 = new Set([
  "evidence-pack-evidence-readiness-ai-audit-evidence-pack-formats",
  "evidence-pack-ai-audit-controls-evidence-gaps-remediation",
  "evidence-pack-proof-assurance-boundary-ai-evidence-pack-index",
]);

const NOINDEX_TO_MIN1 = new Set([
  "ai-audit-controls-evidence-pack-minimum",
  "proof-assurance-boundary-ai-audit-evidence-formats-standards",
  "proof-assurance-boundary-controls-minimum-evidence-requirements",
  "proof-assurance-boundary-controls-evidence-readiness-internal-audit-evidence",
  "proof-assurance-boundary-ai-audit-controls-evidence-requirements-table",
  "proof-assurance-boundary-ai-audit-evidence-audit-questions-pack",
]);

const NOINDEX_TO_WORKFLOW1 = new Set([
  "proof-assurance-boundary-ai-audit-intake-audit-submission-checklist",
  "intake-review-approve-ai-audit-inventory-operating-workflow-renewal",
]);

const NOINDEX_TO_RACI1 = new Set([
  "responsibility-boundary-intake-review-approve-ai-operating-workflow",
]);

const NOINDEX_TO_INV1 = new Set([
  "ai-audit-monitoring-inventory-inventory-review-cycle",
]);

/** Pillar の final_slug（index,follow, canonical=self） */
const PILLAR_SLUGS = new Set([
  "evidence-pack-ai-audit-evidence-pack",
  "proof-assurance-boundary-ai-audit-evidence-bundle-structure",
  "ai-audit-controls-inventory-continuous-audit-workflow",
  "proof-assurance-boundary-ai-audit-controls-control-evidence-frequency",
  "intake-review-approve-ai-audit-controls-request-review-exception",
  "responsibility-boundary-intake-review-approve-ai-raci-governance",
]);

/** Shadow AI: 独立 intent で index とする */
const SHADOW_AI_SLUG = "evidence-readiness-proof-assurance-boundary-ai-minimum-evidence-shadow-ai";

function getCanonicalTarget(slug: string): string {
  if (PILLAR_SLUGS.has(slug)) return "";
  if (slug === SHADOW_AI_SLUG) return ""; // 独立 intent で index, canonical=self
  if (NOINDEX_TO_EP1.has(slug)) return PILLAR_URLS.EP1;
  if (NOINDEX_TO_MIN1.has(slug)) return PILLAR_URLS.MIN1;
  if (NOINDEX_TO_WORKFLOW1.has(slug)) return PILLAR_URLS.WORKFLOW1;
  if (NOINDEX_TO_RACI1.has(slug)) return PILLAR_URLS.RACI1;
  if (NOINDEX_TO_INV1.has(slug)) return PILLAR_URLS.INV1;
  const cluster = getClusterId(slug);
  if (cluster === "EvidencePack") return PILLAR_URLS.EP1;
  if (cluster === "MinimumEvidence") return PILLAR_URLS.MIN1;
  if (cluster === "Workflow") return PILLAR_URLS.WORKFLOW1;
  if (cluster === "Responsibility") return PILLAR_URLS.RACI1;
  if (cluster === "Inventory") return PILLAR_URLS.INV1;
  return PILLAR_URLS.MIN1;
}

function getClusterId(slug: string): string {
  if (slug.startsWith("evidence-pack-") && !slug.includes("proof-assurance-boundary-controls")) return "EvidencePack";
  if (slug.startsWith("proof-assurance-boundary-ai-audit-evidence-bundle-structure")) return "EvidencePack";
  if (slug.startsWith("proof-assurance-boundary-evidence-pack-ai-")) return "EvidencePack";
  if (
    slug.startsWith("proof-assurance-boundary-ai-audit-controls-") ||
    slug.startsWith("proof-assurance-boundary-controls-") ||
    slug.startsWith("proof-assurance-boundary-ai-audit-evidence-") ||
    slug.startsWith("proof-assurance-boundary-ai-audit-e-") ||
    slug.startsWith("ai-audit-controls-evidence-pack-minimum") ||
    slug.startsWith("evidence-readiness-proof-assurance-boundary-ai-minimum-evidence-shadow-ai") ||
    slug.startsWith("ai-audit-controls-e-") ||
    slug.startsWith("proof-assurance-boundary-coverage-map-") ||
    slug.startsWith("ai-governance-audit-evidence-controls-workflow-coverage-map")
  )
    return "MinimumEvidence";
  if (slug.startsWith("intake-review-approve-") || slug.startsWith("proof-assurance-boundary-ai-audit-intake-") ||
      slug.startsWith("evidence-readiness-intake-review-approve-") || slug.startsWith("proof-assurance-boundary-evidence-readiness-intake-") ||
      slug.startsWith("proof-assurance-boundary-intake-review-approve-"))
    return "Workflow";
  if (
    slug.startsWith("responsibility-boundary-") ||
    slug.startsWith("proof-assurance-boundary-responsibility-boundary-ai-")
  )
    return "Responsibility";
  if (slug.startsWith("ai-audit-controls-inventory-") || slug.startsWith("ai-audit-monitoring-inventory-"))
    return "Inventory";
  if (slug.startsWith("evidence-pack-") || slug.startsWith("proof-assurance-boundary-ai-audit-") && slug.includes("evidence"))
    return "EvidencePack";
  if (slug.startsWith("ai-audit-evidence-pack-") || slug.startsWith("proof-assurance-boundary-evidence-readiness-ai-"))
    return "MinimumEvidence";
  return "MinimumEvidence";
}

function getIntentId(slug: string, clusterId: string): string {
  if (slug === "evidence-pack-ai-audit-evidence-pack") return "EP_DECISION_GUIDE";
  if (slug === "proof-assurance-boundary-ai-audit-evidence-bundle-structure") return "EB_STRUCTURE_GUIDE";
  if (slug === "ai-audit-controls-inventory-continuous-audit-workflow") return "CONTINUOUS_AUDIT_WORKFLOW";
  if (slug === "proof-assurance-boundary-ai-audit-controls-control-evidence-frequency") return "MIN_EVIDENCE_CATALOG";
  if (slug === "intake-review-approve-ai-audit-controls-request-review-exception") return "INTAKE_REVIEW_EXCEPTION_WORKFLOW";
  if (slug === "responsibility-boundary-intake-review-approve-ai-raci-governance") return "RACI_GOVERNANCE_MODEL";
  if (slug === SHADOW_AI_SLUG) return "SHADOW_AI_EVIDENCE_CHECKLIST";
  return `${clusterId}_NOINDEX_${slug.slice(-20).replace(/-/g, "_")}`;
}

interface LegacyPage {
  id: string;
  title: string;
  topic?: string[];
  final_slug: string;
  final_url: string;
}

interface SsotRow {
  url: string;
  title: string;
  cluster_id: string;
  intent_id: string;
  is_pillar: boolean;
  robots: "index,follow" | "noindex,follow";
  canonical_target: string;
  page_priority: 1 | 2 | 9;
  summary: string;
  audience_tags: string[];
  has_asset: boolean;
  references_min: number;
}

function main(): void {
  const fp = join(DATA_PSEO, "pseo_pages.json");
  if (!existsSync(fp)) {
    console.error("Missing data/pseo/pseo_pages.json");
    process.exit(1);
  }
  const { pages } = JSON.parse(readFileSync(fp, "utf-8")) as { pages: LegacyPage[] };

  const rows: SsotRow[] = pages.map((p) => {
    const slug = p.final_slug;
    const url = BASE_URL + p.final_url.replace(/\/?$/, "/");
    const isPillar = PILLAR_SLUGS.has(slug);
    const canonicalTarget = getCanonicalTarget(slug);
    const noindex = !!canonicalTarget;
    const robots: "index,follow" | "noindex,follow" = noindex ? "noindex,follow" : "index,follow";
    const clusterId = getClusterId(slug);
    const intentId = getIntentId(slug, clusterId);
    const pagePriority: 1 | 2 | 9 = isPillar ? 1 : noindex ? 9 : 2; // Pillar=1, Cluster(Shadow AI含む)=2, Noindex=9
    const summary = `${p.title.slice(0, 80)}${p.title.length > 80 ? "…" : ""}`;
    const audienceTags = ["監査法人/内部監査"];
    if (clusterId === "Responsibility" || slug.includes("sla") || slug.includes("raci")) audienceTags.push("法務");
    if (slug.includes("shadow") || slug.includes("evidence-readiness")) audienceTags.push("CISO/情シス");
    const hasAsset = false;
    const referencesMin = isPillar ? 3 : 0;

    return {
      url,
      title: p.title,
      cluster_id: clusterId,
      intent_id: intentId,
      is_pillar: isPillar,
      robots,
      canonical_target: canonicalTarget,
      page_priority: pagePriority,
      summary,
      audience_tags: audienceTags,
      has_asset: hasAsset,
      references_min: referencesMin,
    };
  });

  if (!existsSync(SSOT_DIR)) mkdirSync(SSOT_DIR, { recursive: true });
  const outPath = join(SSOT_DIR, "pseo_pages.json");
  const out = {
    schema_version: "phase_a",
    generated_at: new Date().toISOString(),
    base_url: BASE_URL,
    pages: rows,
  };
  writeFileSync(outPath, JSON.stringify(out, null, 2), "utf-8");
  console.log(`Wrote ${outPath} (${rows.length} pages)`);
  const indexCount = rows.filter((r) => r.robots === "index,follow").length;
  console.log(`Indexable: ${indexCount}, Noindex: ${rows.length - indexCount}`);
}

main();

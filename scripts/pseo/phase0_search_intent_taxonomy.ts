/**
 * Phase 0-4: Search Intent taxonomy (MECE).
 * Assigns each PSEO page to exactly one intent (A–F), plus audience_tags and scope.
 * Output: search_intent_taxonomy.json
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "..");
const REPORT_DIR = path.join(ROOT, "data", "pseo", "artifacts", "report");
const SSOT_PATH = path.join(REPORT_DIR, "pseo_url_ssot.json");

const INTENT_IDS = ["A", "B", "C", "D", "E", "F"] as const;
type IntentId = (typeof INTENT_IDS)[number];

const INTENT_LABELS: Record<IntentId, string> = {
  A: "成果物が欲しい（テンプレ/チェックリスト/目次/フォーム）",
  B: "判断基準が欲しい（OK/NG基準、例外条件、RACI、責任分界）",
  C: "実装手順が欲しい（手順/ワークフロー/運用設計/KPI）",
  D: "マッピングが欲しい（ISO/EU AI Act/NIST等への対応表）",
  E: "設計思想が知りたい（概念整理・用語定義・全体像）",
  F: "事例が知りたい（失敗/監査指摘/是正/業界別）",
};

const AUDIENCE_TAGS = [
  "CISO/情報シス",
  "監査法人/内部監査",
  "法務/コンプラ",
  "セキュリティベンダー",
  "事業部/プロダクト",
] as const;

const SCOPE_TAGS = [
  "Shadow AI",
  "AI agent governance",
  "Evidence readiness",
  "Continuous Controls Monitoring",
  "AI-BOM/サプライチェーン",
  "ログ保全/改ざん防止",
  "データ保護",
] as const;

function assignIntent(slug: string, title: string, clusterGuess: string): IntentId {
  const s = (slug + " " + title + " " + clusterGuess).toLowerCase();
  if (/checklist|目次|テンプレ|フォーム|雛形|提出物|submission|index|table-template|raci.*雛形|申請.*フォーム/.test(s)) return "A";
  if (/ok|ng|基準|例外|raci|責任分界|proof.*assurance|判断|criteria|boundary|sla|matrix/.test(s)) return "B";
  if (/手順|ワークフロー|運用|workflow|renewal|review-cycle|operating|intake|approve|継続監査|棚卸/.test(s)) return "C";
  if (/coverage|map|iso|nist|eu.*act|42001|マッピング|対応表|perspectives/.test(s)) return "D";
  if (/用語|定義|概念|glossary|全体|responsibility|proof.*vs|evidence.*bundle|structure|boundary/.test(s) && !/sla|matrix|raci/.test(s)) return "E";
  if (/指摘|是正|欠落|remediation|gaps|findings|失敗|事例|監査指摘/.test(s)) return "F";
  if (/evidence-pack|証拠|証跡|evidence.*pack/.test(s)) return "A";
  if (/control|統制|監査/.test(s) && /観点|対応/.test(s)) return "D";
  return "E";
}

function assignAudience(slug: string, title: string): string[] {
  const s = slug + " " + title;
  const out: string[] = [];
  if (/監査|audit|証跡|evidence|統制|control/.test(s)) out.push("監査法人/内部監査");
  if (/CISO|情シス|ガバナンス|governance|統制/.test(s)) out.push("CISO/情報シス");
  if (/法務|コンプラ|規制|compliance|申請|例外/.test(s)) out.push("法務/コンプラ");
  if (/ベンダー|vendor|委託/.test(s)) out.push("セキュリティベンダー");
  if (out.length === 0) out.push("CISO/情報シス", "監査法人/内部監査");
  return [...new Set(out)];
}

function assignScope(slug: string, title: string): string[] {
  const s = slug + " " + title;
  const out: string[] = [];
  if (/shadow|未許可|棚卸|inventory/.test(s)) out.push("Shadow AI");
  if (/evidence|証跡|証拠|readiness/.test(s)) out.push("Evidence readiness");
  if (/continuous|継続|ccm|monitoring|review-cycle/.test(s)) out.push("Continuous Controls Monitoring");
  if (/responsibility|proof|assurance|boundary|責任/.test(s)) out.push("Evidence readiness");
  if (/coverage|iso|nist|eu|規格|マッピング/.test(s)) out.push("Evidence readiness");
  if (/改ざん|ログ|保持|保管/.test(s)) out.push("ログ保全/改ざん防止");
  if (out.length === 0) out.push("Evidence readiness");
  return [...new Set(out)];
}

function run(): void {
  if (!fs.existsSync(SSOT_PATH)) {
    console.error("Run phase0:export-ssot first. Missing:", SSOT_PATH);
    process.exit(1);
  }

  const ssot = JSON.parse(fs.readFileSync(SSOT_PATH, "utf-8")) as {
    rows: Array<{ slug: string; title: string; h1: string; cluster_guess: string; id: string; url: string }>;
  };
  const rows = ssot.rows || [];

  const taxonomy: Array<{
    slug: string;
    id: string;
    url: string;
    intent_id: IntentId;
    intent_label: string;
    cluster_id: string;
    audience_tags: string[];
    scope_tags: string[];
  }> = [];

  for (const r of rows) {
    const intent_id = assignIntent(r.slug, r.title + " " + (r.h1 || ""), r.cluster_guess);
    taxonomy.push({
      slug: r.slug,
      id: r.id,
      url: r.url,
      intent_id,
      intent_label: INTENT_LABELS[intent_id],
      cluster_id: r.cluster_guess,
      audience_tags: assignAudience(r.slug, r.title),
      scope_tags: assignScope(r.slug, r.title),
    });
  }

  const byIntent: Record<string, string[]> = {};
  for (const t of taxonomy) {
    if (!byIntent[t.intent_id]) byIntent[t.intent_id] = [];
    byIntent[t.intent_id].push(t.slug);
  }

  const out = {
    generated_at: new Date().toISOString(),
    intent_definitions: INTENT_LABELS,
    audience_tags: [...AUDIENCE_TAGS],
    scope_tags: [...SCOPE_TAGS],
    by_intent: byIntent,
    pages: taxonomy,
  };

  fs.writeFileSync(
    path.join(REPORT_DIR, "search_intent_taxonomy.json"),
    JSON.stringify(out, null, 2),
    "utf-8"
  );
  console.log(`Wrote ${path.join(REPORT_DIR, "search_intent_taxonomy.json")} (${rows.length} pages, intents A–F)`);
}

run();

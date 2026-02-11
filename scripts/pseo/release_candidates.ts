/**
 * Phase 5: index 解放候補を選定（人間承認前提）。
 * 基準: validate 必須ルール合格、content_similarity が近傍と十分差分、topic 分散、CTA 明確。
 * 出力: data/pseo/artifacts/report/index_candidates.md
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join, resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..", "..");
const REPORT_DIR = join(ROOT, "data", "pseo", "artifacts", "report");
const QUALITY_PATH = join(REPORT_DIR, "pseo_quality_report.json");
const SIMILARITY_PATH = join(REPORT_DIR, "similarity_report.json");
const PSEO_PAGES_PATH = join(ROOT, "data", "pseo", "pseo_pages.json");
const CANDIDATES_PATH = join(REPORT_DIR, "index_candidates.md");

const CONTENT_SIMILARITY_MAX_ALLOWED = 0.92;
const MAX_CANDIDATES = 20;
const SUGGESTED_ALLOWLIST_PATH = join(ROOT, "data", "pseo", "index_allowlist.suggested.json");
const SUGGESTED_FAQ_SCHEMA_PATH = join(ROOT, "data", "pseo", "faq_schema_allowlist.suggested.json");
const MIN_TOPICS_DIVERSITY = 4;
const FAQ_SCHEMA_CANDIDATES = 8;

interface QualityPage {
  page_id: string;
  url: string;
  pass: boolean;
  fail: boolean;
  reasons: string[];
  content_similarity?: number;
  content_similarity_with?: string;
  topic?: string[];
  unique_sections?: string[];
  cta_present?: boolean;
}

interface QualityReport {
  pages: QualityPage[];
  summary: { passed: number; failed: number; total: number };
}

function main(): void {
  if (!existsSync(QUALITY_PATH)) {
    console.warn("pseo_quality_report.json not found. Run validate first.");
    writeFileSync(
      CANDIDATES_PATH,
      `# index 解放候補\n\n生成日: ${new Date().toISOString()}\n\npseo_quality_report.json が存在しません。\n先に \`npm run validate\` を実行してください。\n`,
      "utf8"
    );
    return;
  }

  const quality = JSON.parse(readFileSync(QUALITY_PATH, "utf-8")) as QualityReport;
  const passed = quality.pages.filter((p) => p.pass && !p.fail);

  const finalSlugFromUrl = (url: string): string => {
    try {
      const pathname = new URL(url).pathname.replace(/\/$/, "");
      return pathname.split("/").filter(Boolean).pop() ?? "";
    } catch {
      return "";
    }
  };

  const candidates: QualityPage[] = [];
  for (const p of passed) {
    const contentSim = p.content_similarity ?? 0;
    if (contentSim >= CONTENT_SIMILARITY_MAX_ALLOWED) continue;
    if (!p.cta_present) continue;
    const topics = p.topic ?? ["misc"];
    if (!Array.isArray(topics)) continue;
    candidates.push(p);
  }

  const topicSeen = new Set<string>();
  const selected: QualityPage[] = [];
  for (const p of candidates) {
    const topics = p.topic ?? ["misc"];
    for (const t of topics) topicSeen.add(t);
    selected.push(p);
    if (selected.length >= MAX_CANDIDATES) break;
  }
  while (selected.length < MAX_CANDIDATES && topicSeen.size < MIN_TOPICS_DIVERSITY && candidates.length > selected.length) {
    const next = candidates.find((p) => !selected.includes(p) && (p.topic ?? []).some((t) => !topicSeen.has(t)));
    if (!next) break;
    selected.push(next);
    for (const t of next.topic ?? []) topicSeen.add(t);
  }
  const selectedSlugs = selected.map((p) => finalSlugFromUrl(p.url)).filter(Boolean);

  if (!existsSync(REPORT_DIR)) mkdirSync(REPORT_DIR, { recursive: true });
  const dataPseo = dirname(SUGGESTED_ALLOWLIST_PATH);
  if (!existsSync(dataPseo)) mkdirSync(dataPseo, { recursive: true });
  writeFileSync(SUGGESTED_ALLOWLIST_PATH, JSON.stringify({ allow: selectedSlugs, note: "Suggested only; copy to index_allowlist.json after review" }, null, 2), "utf8");
  const faqSlugs = selectedSlugs.slice(0, FAQ_SCHEMA_CANDIDATES);
  writeFileSync(SUGGESTED_FAQ_SCHEMA_PATH, JSON.stringify({ allow: faqSlugs, note: "FAQ schema for top candidates only" }, null, 2), "utf8");
  console.log(`Wrote ${SUGGESTED_ALLOWLIST_PATH} (${selectedSlugs.length} slugs)`);
  console.log(`Wrote ${SUGGESTED_FAQ_SCHEMA_PATH} (${faqSlugs.length} for FAQ schema)`);

  const lines: string[] = [
    "# index 解放候補（人間承認前提）",
    "",
    `生成日: ${new Date().toISOString()}`,
    "",
    "## 選定基準",
    "- validate 必須ルールを満たす",
    "- content_similarity が近傍と十分に差分（同一/極端近似は除外）",
    "- topic 分散（同 topic ばかりに偏らない）",
    "- CTA が明確で、AIMOaaS の商材価値に直結",
    "",
    "## 候補数",
    `- 必須ルール合格: ${passed.length} 件`,
    `- content_similarity 閾値クリア: ${candidates.length} 件`,
    `- 候補（最大 ${MAX_CANDIDATES} 件）: ${selected.length} 件`,
    "",
    "## 候補一覧（根拠）",
    "",
  ];

  selected.forEach((p, i) => {
    const slug = finalSlugFromUrl(p.url);
    const topics = (p.topic ?? ["misc"]).join(", ");
    lines.push(`### ${i + 1}. ${slug || p.page_id}`);
    lines.push(`- URL: ${p.url}`);
    lines.push(`- topic: ${topics}`);
    lines.push(`- content_similarity: ${((p.content_similarity ?? 0) * 100).toFixed(1)}%${p.content_similarity_with ? ` (with: ${p.content_similarity_with})` : ""}`);
    lines.push("");
  });

  if (!existsSync(REPORT_DIR)) mkdirSync(REPORT_DIR, { recursive: true });
  writeFileSync(CANDIDATES_PATH, lines.join("\n"), "utf8");
  console.log(`Wrote ${CANDIDATES_PATH} (${selected.length} candidates, ${passed.length} passed validation)`);
}

main();

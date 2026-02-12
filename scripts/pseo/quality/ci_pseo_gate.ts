/**
 * Phase C: CI ゲート — SSOT に基づく MECE / 参照数 / unique_value / タイトル重複チェック。
 * 失敗時は exit(1)。WARN のみの場合は exit(0) でログ出力。
 */

import { readFileSync, existsSync } from "fs";
import { join, resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..", "..", "..");
const SSOT_PATH = join(ROOT, "ssot", "pseo_pages.json");
const DATA_PSEO = join(ROOT, "data", "pseo");
const QUALITY_SCORES_PATH = join(DATA_PSEO, "quality_scores.json");

const PILLAR_REFERENCES_MIN = 3;
const UNIQUE_VALUE_THRESHOLD = 50;
const TITLE_OVERLAP_WARN_RATIO = 0.85;

interface SsotPage {
  url: string;
  title?: string;
  cluster_id: string;
  intent_id: string;
  is_pillar: boolean;
  robots: string;
  page_priority: number;
  summary: string;
  audience_tags: string[];
  has_asset: boolean;
  references_min: number;
  unique_value_score?: number;
}

function main(): void {
  if (!existsSync(SSOT_PATH)) {
    console.error("CI gate: SSOT not found. Run: npm run ssot:build");
    process.exit(1);
  }

  const raw = JSON.parse(readFileSync(SSOT_PATH, "utf-8")) as { pages: SsotPage[] };
  const pages = raw.pages || [];
  const indexable = pages.filter((p) => p.robots === "index,follow");
  const pillars = indexable.filter((p) => p.is_pillar);

  const failures: string[] = [];
  const warnings: string[] = [];

  // --- C-1: MECE — 同一 intent_id で index が複数 → FAIL
  const intentToUrls = new Map<string, string[]>();
  for (const p of indexable) {
    const list = intentToUrls.get(p.intent_id) ?? [];
    list.push(p.url);
    intentToUrls.set(p.intent_id, list);
  }
  for (const [intentId, urls] of intentToUrls) {
    if (urls.length > 1) {
      failures.push(`MECE: intent_id="${intentId}" has ${urls.length} indexable pages (max 1). URLs: ${urls.join(", ")}`);
    }
  }

  // --- C-1: 参照 — Pillar が index なら references_min 以上
  for (const p of pillars) {
    const minReq = p.references_min ?? 0;
    if (minReq < PILLAR_REFERENCES_MIN) {
      failures.push(`References: Pillar ${p.url} has references_min=${minReq}, required >= ${PILLAR_REFERENCES_MIN}`);
    }
  }

  // --- C-1: 薄い差分 — unique_value_score が閾値未満で index → FAIL（スコアが存在する場合のみ）
  let slugToScore = new Map<string, number>();
  if (existsSync(QUALITY_SCORES_PATH)) {
    const q = JSON.parse(readFileSync(QUALITY_SCORES_PATH, "utf-8")) as { scores?: Record<string, number> };
    if (q.scores) for (const [slug, score] of Object.entries(q.scores)) slugToScore.set(slug, score as number);
  }
  const urlToSlug = (url: string) => url.replace(/^https?:\/\/[^/]+/, "").replace(/\/$/, "").split("/").filter(Boolean).pop() ?? "";
  for (const p of indexable) {
    const slug = urlToSlug(p.url);
    const score = p.unique_value_score ?? slugToScore.get(slug);
    if (score !== undefined && score < UNIQUE_VALUE_THRESHOLD) {
      failures.push(`Unique value: indexable ${p.url} has unique_value_score=${score} (min ${UNIQUE_VALUE_THRESHOLD})`);
    }
  }

  // --- C-1: 表層 — タイトル n-gram 重複が高い indexable ペア → WARN
  const tokenize = (s: string) =>
    s
      .replace(/[、。・\s]+/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 0);
  for (let i = 0; i < indexable.length; i++) {
    for (let j = i + 1; j < indexable.length; j++) {
      const a = indexable[i];
      const b = indexable[j];
      const titleA = (a.title ?? a.summary ?? "").trim();
      const titleB = (b.title ?? b.summary ?? "").trim();
      if (!titleA || !titleB) continue;
      const setA = new Set(tokenize(titleA));
      const setB = new Set(tokenize(titleB));
      const inter = [...setA].filter((t) => setB.has(t)).length;
      const union = new Set([...setA, ...setB]).size;
      const ratio = union > 0 ? inter / union : 0;
      if (ratio >= TITLE_OVERLAP_WARN_RATIO) {
        warnings.push(`Title overlap (${(ratio * 100).toFixed(0)}%): "${titleA.slice(0, 40)}..." vs "${titleB.slice(0, 40)}..."`);
      }
    }
  }

  if (warnings.length > 0) {
    console.warn("CI gate WARN (future FAIL):");
    warnings.forEach((w) => console.warn("  " + w));
  }

  if (failures.length > 0) {
    console.error("CI gate FAIL:");
    failures.forEach((f) => console.error("  " + f));
    process.exit(1);
  }

  console.log(`CI gate OK: ${indexable.length} indexable, ${pillars.length} pillars, no MECE/reference/unique_value violations.`);
  if (warnings.length > 0) console.log(`  (${warnings.length} title-overlap warning(s))`);
}

main();

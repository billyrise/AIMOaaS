/**
 * Phase 0-3: 重複・近似の定量診断
 * 各ページの「差分テキスト」（ボイラープレート除外後）同士で類似度（Jaccard on shingles）を算出し、
 * - 類似度 >= 0.85: ほぼ重複（統合 or noindex 候補）
 * - 0.70–0.85: 近似（差別化注入が必要）
 * - < 0.70: 独立（残す候補）
 * 結果を duplicate_report.json および cluster 別の重複マップとして出力する。
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "..");
const PSEO_ROOT = path.join(ROOT, "ja", "resources", "pseo");
const REPORT_DIR = path.join(ROOT, "data", "pseo", "artifacts", "report");
const SSOT_PATH = path.join(REPORT_DIR, "pseo_url_ssot.json");

const THRESHOLD_NEAR_DUPLICATE = 0.85;
const THRESHOLD_APPROXIMATE = 0.7;

function stripBoilerplate(html: string): string {
  let h = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<meta[^>]*>/gi, " ")
    .replace(/<link[^>]*>/gi, " ");
  h = h.replace(/<header[\s\S]*?<\/header>/gi, " ");
  h = h.replace(
    /<section[^>]*class="[^"]*above-the-fold[^"]*"[\s\S]*?<section[^>]*class="[^"]*pseo-cta[^"]*"[\s\S]*?<\/section>[\s\S]*?<\/section>/gi,
    " "
  );
  h = h.replace(/<section[^>]*class="[^"]*pseo-cta[^"]*"[\s\S]*?<\/section>/gi, " ");
  h = h.replace(/<section[^>]*class="[^"]*pseo-trust-block[^"]*"[\s\S]*?<\/section>/gi, " ");
  h = h.replace(/<[^>]*class="[^"]*trust-block[^"]*"[^>]*>[\s\S]*?<\/div>\s*<\/section>/gi, " ");
  h = h.replace(/次に読む[\s\S]*?<section[\s\S]*?internal-links[\s\S]*?<\/section>/gi, " ");
  h = h.replace(/<section[^>]*internal-links[^>]*>[\s\S]*?<\/section>/gi, " ");
  h = h.replace(/<h2[^>]*>参考文献|References[\s\S]*?<\/section>/gi, " ");
  h = h.replace(/<[^>]+>/g, " ");
  return h.replace(/\s+/g, " ").trim();
}

function shingle(str: string, k: number): Set<string> {
  const n = str.replace(/\s+/g, " ").trim();
  const set = new Set<string>();
  for (let i = 0; i <= n.length - k; i++) set.add(n.slice(i, i + k));
  return set;
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter) || 0;
}

interface PairRow {
  slug_a: string;
  slug_b: string;
  content_similarity: number;
  tier: "near_duplicate" | "approximate" | "independent";
}

function run(): void {
  if (!fs.existsSync(PSEO_ROOT)) {
    console.error("PSEO root not found:", PSEO_ROOT);
    process.exit(1);
  }

  const dirs = fs.readdirSync(PSEO_ROOT).filter((d) => {
    const full = path.join(PSEO_ROOT, d);
    return fs.statSync(full).isDirectory() && fs.existsSync(path.join(full, "index.html"));
  });

  const contentTexts = new Map<string, string>();
  const shingleCache = new Map<string, Set<string>>();
  const K = 15;

  for (const dir of dirs) {
    const fp = path.join(PSEO_ROOT, dir, "index.html");
    const html = fs.readFileSync(fp, "utf-8");
    const content = stripBoilerplate(html);
    contentTexts.set(dir, content);
    shingleCache.set(dir, shingle(content, K));
  }

  const slugs = [...contentTexts.keys()].sort();
  const pairs: PairRow[] = [];
  const bySlug: Record<
    string,
    { content_max: number; content_with: string; tier: "near_duplicate" | "approximate" | "independent" }
  > = {};

  for (const slugA of slugs) {
    let contentMax = 0;
    let contentWith = "";
    const setA = shingleCache.get(slugA)!;

    for (const slugB of slugs) {
      if (slugA === slugB) continue;
      const setB = shingleCache.get(slugB)!;
      const sim = jaccard(setA, setB);
      if (sim > contentMax) {
        contentMax = sim;
        contentWith = slugB;
      }
      const tier: PairRow["tier"] =
        sim >= THRESHOLD_NEAR_DUPLICATE ? "near_duplicate" : sim >= THRESHOLD_APPROXIMATE ? "approximate" : "independent";
      if (sim >= THRESHOLD_APPROXIMATE) {
        pairs.push({ slug_a: slugA, slug_b: slugB, content_similarity: sim, tier });
      }
    }

    const tier: "near_duplicate" | "approximate" | "independent" =
      contentMax >= THRESHOLD_NEAR_DUPLICATE ? "near_duplicate" : contentMax >= THRESHOLD_APPROXIMATE ? "approximate" : "independent";
    bySlug[slugA] = { content_max: contentMax, content_with: contentWith, tier };
  }

  let clusterGuessMap: Record<string, string> = {};
  if (fs.existsSync(SSOT_PATH)) {
    try {
      const ssot = JSON.parse(fs.readFileSync(SSOT_PATH, "utf-8")) as { rows?: Array<{ slug: string; cluster_guess: string }> };
      if (ssot.rows) for (const r of ssot.rows) clusterGuessMap[r.slug] = r.cluster_guess;
    } catch {
      // ignore
    }
  }
  for (const s of slugs) {
    if (!clusterGuessMap[s]) clusterGuessMap[s] = s.includes("evidence-pack") ? "evidence-pack" : "other";
  }

  const nearDuplicatePairs = pairs.filter((p) => p.tier === "near_duplicate");
  const approximatePairs = pairs.filter((p) => p.tier === "approximate");
  const clusterDuplicateMap: Record<string, Array<{ slug_a: string; slug_b: string; similarity: number }>> = {};
  for (const p of nearDuplicatePairs.concat(approximatePairs)) {
    const c = clusterGuessMap[p.slug_a] || "other";
    if (!clusterDuplicateMap[c]) clusterDuplicateMap[c] = [];
    clusterDuplicateMap[c].push({ slug_a: p.slug_a, slug_b: p.slug_b, similarity: p.content_similarity });
  }

  const summary = {
    total_pages: slugs.length,
    near_duplicate_pairs: nearDuplicatePairs.length,
    approximate_pairs: approximatePairs.length,
    independent_pages: Object.values(bySlug).filter((v) => v.tier === "independent").length,
    approximate_pages: Object.values(bySlug).filter((v) => v.tier === "approximate").length,
    near_duplicate_pages: Object.values(bySlug).filter((v) => v.tier === "near_duplicate").length,
  };

  const report = {
    generated_at: new Date().toISOString(),
    thresholds: { near_duplicate: THRESHOLD_NEAR_DUPLICATE, approximate: THRESHOLD_APPROXIMATE },
    summary,
    by_page: bySlug,
    pairs_near_duplicate: nearDuplicatePairs,
    pairs_approximate: approximatePairs,
    cluster_duplicate_map: clusterDuplicateMap,
  };

  if (!fs.existsSync(REPORT_DIR)) fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(REPORT_DIR, "duplicate_report.json"),
    JSON.stringify(report, null, 2),
    "utf-8"
  );

  console.log(
    `Wrote ${path.join(REPORT_DIR, "duplicate_report.json")} — near_duplicate pairs: ${summary.near_duplicate_pairs}, approximate: ${summary.approximate_pairs}`
  );
}

run();

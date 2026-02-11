/**
 * PR-C: MECE ゲート — 同一 intent_id で index するページは1本のみ。
 * index_allowlist + search_intent_taxonomy を読み、違反があれば exit(1)。
 */

import { readFileSync, existsSync } from "fs";
import { join, resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..", "..", "..");
const DATA_PSEO = join(ROOT, "data", "pseo");
const REPORT_DIR = join(DATA_PSEO, "artifacts", "report");

function loadAllowlist(): Set<string> {
  const fp = join(DATA_PSEO, "index_allowlist.json");
  if (!existsSync(fp)) return new Set();
  const { allow } = JSON.parse(readFileSync(fp, "utf-8")) as { allow?: string[] };
  return new Set(allow || []);
}

function loadTaxonomy(): Map<string, string> {
  const fp = join(REPORT_DIR, "search_intent_taxonomy.json");
  if (!existsSync(fp)) return new Map();
  const data = JSON.parse(readFileSync(fp, "utf-8")) as { pages?: Array<{ slug: string; intent_id: string }> };
  const m = new Map<string, string>();
  if (data.pages) for (const p of data.pages) m.set(p.slug, p.intent_id);
  return m;
}

function main(): void {
  const allowlist = loadAllowlist();
  const slugToIntent = loadTaxonomy();
  if (slugToIntent.size === 0) {
    console.warn("mece_gate: search_intent_taxonomy.json not found or empty; run npm run phase0:search-intent first. Skipping MECE check.");
    return;
  }

  const indexableByIntent = new Map<string, string[]>();
  for (const slug of allowlist) {
    const intent = slugToIntent.get(slug);
    if (!intent) continue;
    if (!indexableByIntent.has(intent)) indexableByIntent.set(intent, []);
    indexableByIntent.get(intent)!.push(slug);
  }

  const violations: string[] = [];
  for (const [intent, slugs] of indexableByIntent) {
    if (slugs.length > 1) {
      violations.push(`intent_id=${intent}: ${slugs.length} indexable pages (MECE: max 1). Slugs: ${slugs.join(", ")}`);
    }
  }

  if (violations.length > 0) {
    console.error("MECE gate FAIL: same intent_id must have at most one indexable page.");
    violations.forEach((v) => console.error("  " + v));
    process.exit(1);
  }
  console.log("MECE gate OK: no duplicate intent_id among indexable pages.");
}

main();

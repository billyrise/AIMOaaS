/**
 * 既存 PSEO HTML に H2 同名重複除去を適用する（generate を再実行せずに解消）。
 * pseo_pages.json の final_slug 配下の index.html の pseo-main 内を処理し、
 * 重複した H2 章を削除して h2_dedup_fixups.json に記録する。
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";
import yaml from "js-yaml";
import { deduplicateH2Sections } from "./quality/dedup_headings.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..", "..");
const DATA_PSEO = join(ROOT, "data", "pseo");
const OUT_BASE = join(ROOT, "ja", "resources", "pseo");
const REPORT_DIR = join(DATA_PSEO, "artifacts", "report");

/** catalog の slug 最終セグメント → page_id */
function loadSegmentToPageId(): Map<string, string> {
  const catalogPath = join(DATA_PSEO, "catalog.yaml");
  if (!existsSync(catalogPath)) return new Map();
  const raw = readFileSync(catalogPath, "utf8");
  const catalog = yaml.load(raw) as { pages?: Array<{ id: string; slug: string }> };
  const m = new Map<string, string>();
  for (const p of catalog.pages ?? []) {
    const segment = p.slug.replace(/^\//, "").replace(/\/$/, "").split("/").pop() ?? p.id;
    m.set(segment, p.id);
  }
  return m;
}

function main(): void {
  const pseoPath = join(DATA_PSEO, "pseo_pages.json");
  if (!existsSync(pseoPath)) {
    console.error("pseo_pages.json not found");
    process.exit(1);
  }
  const { pages } = JSON.parse(readFileSync(pseoPath, "utf8")) as {
    pages: Array<{ id: string; final_slug: string }>;
  };
  const segmentToPageId = loadSegmentToPageId();
  const fixupsByPageId: Record<string, string[]> = {};
  let processed = 0;
  for (const p of pages) {
    const outPath = join(OUT_BASE, p.final_slug, "index.html");
    if (!existsSync(outPath)) continue;
    let html = readFileSync(outPath, "utf8");
    const proseMatch = html.match(
      /(<section[^>]*class="[^"]*pseo-main[^"]*"[^>]*>\s*<div[^>]*class="[^"]*prose[^"]*"[^>]*>)([\s\S]*?)(<\/div>\s*<\/section>)/i
    );
    if (!proseMatch) continue;
    const [, openTag, bodyHtml, closeTag] = proseMatch;
    const { html: deduped, fixups } = deduplicateH2Sections(bodyHtml);
    const pageId = segmentToPageId.get(p.id) ?? p.final_slug;
    if (fixups.length > 0) fixupsByPageId[pageId] = fixups;
    const newHtml = html.replace(proseMatch[0], openTag + deduped + closeTag);
    if (newHtml !== html) {
      writeFileSync(outPath, newHtml, "utf8");
      processed++;
    }
  }
  if (!existsSync(REPORT_DIR)) mkdirSync(REPORT_DIR, { recursive: true });
  const fixupsPath = join(REPORT_DIR, "h2_dedup_fixups.json");
  writeFileSync(fixupsPath, JSON.stringify(fixupsByPageId, null, 2), "utf8");
  console.log(`postprocess_h2_dedup: ${processed} pages updated. Fixups: ${fixupsPath}`);
}

main();

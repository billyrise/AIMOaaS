/**
 * Phase 0: inventory を読み、slugger で final_slug を生成し pseo_pages.json（SSOT）を出力する。
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildFinalSlug } from "./slugger.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "..");
const REPORT_DIR = path.join(ROOT, "data", "pseo", "artifacts", "report");
const PSEO_PAGES_PATH = path.join(ROOT, "data", "pseo", "pseo_pages.json");

interface PageEntry {
  id: string;
  path: string;
  title: string;
  h1: string;
}

interface Inventory {
  pages: PageEntry[];
}

interface PseoPageRecord {
  id: string;
  title: string;
  topic: string[];
  slug_base: string;
  final_slug: string;
  final_url: string;
  legacy_url: string;
}

function run(): void {
  const inventoryPath = path.join(REPORT_DIR, "pseo_inventory.json");
  if (!fs.existsSync(inventoryPath)) {
    console.error("Run inventory first: npm run inventory");
    process.exit(1);
  }

  const inventory: Inventory = JSON.parse(fs.readFileSync(inventoryPath, "utf-8"));
  const basePath = "/ja/resources/pseo";

  const records: PseoPageRecord[] = [];
  for (const p of inventory.pages) {
    const titleOrH1 = p.h1 || p.title || p.id;
    let result;
    try {
      result = buildFinalSlug(p.id, titleOrH1);
    } catch (e) {
      console.warn(`slugger skip ${p.id}:`, (e as Error).message);
      result = buildFinalSlug("ai-governance-1", titleOrH1);
      result = { ...result, id: p.id, final_slug: `${result.slug_base}-${p.id}` };
    }
    records.push({
      id: p.id,
      title: p.title || p.h1,
      topic: result.topic_keys,
      slug_base: result.slug_base,
      final_slug: result.final_slug,
      final_url: `${basePath}/${result.final_slug}/`,
      legacy_url: `${basePath}/${p.id}/`,
    });
  }

  const out = { generated_at: new Date().toISOString(), pages: records };
  fs.writeFileSync(PSEO_PAGES_PATH, JSON.stringify(out, null, 2), "utf-8");
  console.log(`Wrote ${PSEO_PAGES_PATH} (${records.length} pages)`);
}

run();

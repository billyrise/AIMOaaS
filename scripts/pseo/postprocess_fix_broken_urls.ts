/**
 * PSEO 全ページ内の存在しない URL を実在 URL に一括置換する。
 * 本文・References・「次に読む」のいずれに含まれていても置換。
 * 対象: /ja/resources/audit-logs/, data-governance/, compliance/, ai-governance/（末尾スラッシュあり/なし両方）
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from "fs";
import { join, resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..", "..");
const PSEO_ROOT = join(ROOT, "ja", "resources", "pseo");
const BASE = "https://aimoaas.com";

/** 不正URL → 正しいURL（正規表現でマッチ、置換は実在パスへ） */
const REPLACEMENTS: [RegExp, string][] = [
  [new RegExp(`${BASE}/ja/resources/audit-logs/?`, "g"), `${BASE}/ja/resources/pseo/ai-audit-monitoring-inventory-inventory-review-cycle/`],
  [new RegExp(`${BASE}/ja/resources/data-governance/?`, "g"), `${BASE}/ja/resources/ai-governance-guide/`],
  [new RegExp(`${BASE}/ja/resources/compliance/?`, "g"), `${BASE}/ja/resources/eu-ai-act/`],
  // ai-governance のみ（ai-governance-guide は含めない: " の直前に限定）
  [/aimoaas\.com\/ja\/resources\/ai-governance\/?(?=")/g, `${BASE}/ja/resources/ai-governance-guide/`],
];

function main(): void {
  if (!existsSync(PSEO_ROOT)) {
    console.error("PSEO root not found:", PSEO_ROOT);
    process.exit(1);
  }
  const dirs = readdirSync(PSEO_ROOT, { withFileTypes: true }).filter((d) => d.isDirectory());
  let updated = 0;
  for (const d of dirs) {
    const indexPath = join(PSEO_ROOT, d.name, "index.html");
    if (!existsSync(indexPath)) continue;
    let html = readFileSync(indexPath, "utf-8");
    let changed = false;
    for (const [re, replacement] of REPLACEMENTS) {
      const next = html.replace(re, replacement);
      if (next !== html) {
        html = next;
        changed = true;
      }
    }
    if (changed) {
      writeFileSync(indexPath, html, "utf-8");
      updated++;
    }
  }
  console.log(`postprocess_fix_broken_urls: ${dirs.length} dirs, ${updated} updated`);
}

main();

/**
 * 既存 PSEO HTML の本文内のすべての <table> を <div class="table-wrap"> で包む。
 * 既に table-wrap が含まれる場合はスキップ（二重ラップ防止）。
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..", "..");
const DATA_PSEO = join(ROOT, "data", "pseo");
const PSEO_ROOT = join(ROOT, "ja", "resources", "pseo");

function loadPseoPages(): Array<{ final_slug: string }> {
  const fp = join(DATA_PSEO, "pseo_pages.json");
  if (!existsSync(fp)) return [];
  const { pages } = JSON.parse(readFileSync(fp, "utf-8")) as { pages: Array<{ final_slug: string }> };
  return pages;
}

/** 本文 div.prose 内の <table>...</table> を .table-wrap で包む（1回のみ実行想定） */
function wrapTablesInBody(bodyHtml: string): string {
  if (bodyHtml.includes("table-wrap")) return bodyHtml;
  return bodyHtml.replace(
    /<table([^>]*)>([\s\S]*?)<\/table>/gi,
    '<div class="table-wrap"><table$1>$2</table></div>'
  );
}

function main(): void {
  const pages = loadPseoPages();
  let updated = 0;

  for (const p of pages) {
    const indexPath = join(PSEO_ROOT, p.final_slug, "index.html");
    if (!existsSync(indexPath)) continue;

    const html = readFileSync(indexPath, "utf-8");
    const proseMatch = html.match(
      /(<section[^>]*class="[^"]*pseo-main[^"]*"[^>]*>\s*<div[^>]*class="[^"]*prose[^"]*"[^>]*>)([\s\S]*?)(<\/div>\s*<\/section>)/i
    );
    if (!proseMatch) continue;

    const [, openTag, bodyHtml, closeTag] = proseMatch;
    const newBody = wrapTablesInBody(bodyHtml);
    if (newBody === bodyHtml) continue;

    const newHtml = html.replace(proseMatch[0], openTag + newBody + closeTag);
    writeFileSync(indexPath, newHtml, "utf-8");
    updated++;
  }

  console.log(`postprocess_table_wrap: ${pages.length} pages processed, ${updated} updated`);
}

main();

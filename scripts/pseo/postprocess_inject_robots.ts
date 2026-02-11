/**
 * 既存 PSEO HTML に robots meta を注入する（generate 再実行なしで allowlist 連動）。
 * head 内に <meta name="viewport" ...> の直後に <meta name="robots" content="..."> を挿入。
 * 既に robots がある場合は content を allowlist に合わせて上書きする。
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

function loadIndexAllowlist(): Set<string> {
  const fp = join(DATA_PSEO, "index_allowlist.json");
  if (!existsSync(fp)) return new Set();
  const { allow } = JSON.parse(readFileSync(fp, "utf-8")) as { allow?: string[] };
  return new Set(allow || []);
}

function main(): void {
  const pages = loadPseoPages();
  const allowlist = loadIndexAllowlist();
  let updated = 0;

  for (const p of pages) {
    const indexPath = join(PSEO_ROOT, p.final_slug, "index.html");
    if (!existsSync(indexPath)) continue;

    let html = readFileSync(indexPath, "utf-8");
    const content = allowlist.has(p.final_slug) ? "index,follow" : "noindex,follow";
    const metaRobots = `<meta name="robots" content="${content}" />`;

    const existingRobots = /<meta\s+name=["']robots["']\s+content=["'][^"']*["']\s*\/?>/i;
    if (existingRobots.test(html)) {
      const newHtml = html.replace(existingRobots, metaRobots);
      if (newHtml !== html) {
        html = newHtml;
        updated++;
      }
    } else {
      const afterViewport = html.replace(
        /(<meta\s+name=["']viewport["'][^>]*\/?>)/i,
        `$1\n  ${metaRobots}`
      );
      if (afterViewport !== html) {
        html = afterViewport;
        updated++;
      }
    }

    writeFileSync(indexPath, html, "utf-8");
  }

  console.log(`postprocess_inject_robots: ${pages.length} pages processed, ${updated} updated`);
}

main();

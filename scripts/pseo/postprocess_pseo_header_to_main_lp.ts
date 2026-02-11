/**
 * Replace PSEO header (short nav) with main_lp header (same as main page) in all PSEO article HTML files.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from "fs";
import { join, resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { renderHeaderStatic } from "./layout.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..", "..");
const PSEO_ARTICLES_DIR = join(ROOT, "ja", "resources", "pseo");
const BASE_URL = process.env.BASE_URL || "https://aimoaas.com";

// Match: optional PSEO comment, fixed header, mobile-menu div, hamburger script
const PSEO_HEADER_BLOCK =
  /(?:  <!-- 共通ヘッダー（PSEO用[^\n]*\n)?\s*<header class="fixed w-full z-50[\s\S]*?<\/header>\s*<div id="mobile-menu"[\s\S]*?<\/div>\s*<script>[\s\S]*?<\/script>/;

function main(): void {
  const newHeader = renderHeaderStatic("ja", "main_lp", BASE_URL);
  const dirs = readdirSync(PSEO_ARTICLES_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  let updated = 0;
  let skipped = 0;

  for (const dir of dirs) {
    const indexPath = join(PSEO_ARTICLES_DIR, dir, "index.html");
    if (!existsSync(indexPath)) continue;

    let html = readFileSync(indexPath, "utf8");
    if (!PSEO_HEADER_BLOCK.test(html)) {
      skipped++;
      continue;
    }

    html = html.replace(PSEO_HEADER_BLOCK, newHeader.trim());
    writeFileSync(indexPath, html, "utf8");
    updated++;
  }

  console.log(`PSEO header -> main_lp: updated ${updated} article(s), skipped ${skipped}.`);
}

main();

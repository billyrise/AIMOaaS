/**
 * Inject shared header and footer into static HTML (main_lp, aimo_standard, audit_firms, resources).
 * Uses path_config.json for path -> locale, section; replaces existing header and footer blocks.
 */
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { getStaticPagesConfig, renderHeaderStatic, renderFooter } from "./layout.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..", "..");
const BASE_URL = process.env.BASE_URL || "https://aimoaas.com";

// Match only the fixed site header (class contains "fixed"), then optional mobile menu block
const HEADER_BLOCK_REGEX =
  /(?:<!--\s*Header\s*-->\s*)?<header\s+class="[^"]*fixed[^"]*"[^>]*>[\s\S]*?<\/header>(?:\s*(?:<!--[\s\S]*?-->\s*)*<div[^>]*id="mobile-menu"[^>]*>[\s\S]*?<\/div>\s*<script[\s\S]*?<\/script>)?/i;

const FOOTER_BLOCK_REGEX = /<footer\s[^>]*>[\s\S]*?<\/footer>/i;

function main(): void {
  const pages = getStaticPagesConfig();
  if (pages.length === 0) {
    console.log("No pages in path_config; skipping.");
    return;
  }

  let updated = 0;
  let failed = 0;

  for (const { path: filePath, locale, section } of pages) {
    const fullPath = join(ROOT, filePath);
    if (!existsSync(fullPath)) {
      console.warn(`Skip (missing): ${filePath}`);
      failed++;
      continue;
    }

    let html = readFileSync(fullPath, "utf8");

    if (!HEADER_BLOCK_REGEX.test(html)) {
      console.warn(`Skip (no header match): ${filePath}`);
      failed++;
      continue;
    }

    const headerHtml = renderHeaderStatic(locale, section as "main_lp" | "aimo_standard" | "audit_firms" | "resources", BASE_URL);
    const footerHtml = renderFooter(locale, BASE_URL, { showPracticeGuide: locale === "ja" });

    html = html.replace(HEADER_BLOCK_REGEX, headerHtml.trim());

    // Remove orphaned old mobile menu block (comment + div + script) if present
    const ORPHAN_MOBILE_REGEX =
      /\s*<!--[\s\S]*?Mobile menu[\s\S]*?-->\s*<div[^>]*id="mobile-menu"[^>]*>[\s\S]*?<\/div>\s*<script[\s\S]*?<\/script>/i;
    if (ORPHAN_MOBILE_REGEX.test(html)) {
      html = html.replace(ORPHAN_MOBILE_REGEX, "\n        ");
    }

    if (FOOTER_BLOCK_REGEX.test(html)) {
      html = html.replace(FOOTER_BLOCK_REGEX, footerHtml.trim());
    } else {
      console.warn(`No footer match in ${filePath}, header only replaced.`);
    }

    if (!html.includes("lucide") && !html.includes("data-lucide")) {
      // no change for lucide - our header uses data-lucide, so we add script if missing
    }
    if (html.includes("data-lucide") && !html.includes("lucide.createIcons")) {
      html = html.replace("</body>", '\n        <script src="https://unpkg.com/lucide@latest"></script>\n        <script>try { lucide.createIcons(); } catch (e) {}</script>\n</body>');
    }

    writeFileSync(fullPath, html, "utf8");
    updated++;
  }

  console.log(`Static layout: updated ${updated} file(s), skipped/failed ${failed}.`);
}

main();

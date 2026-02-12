/**
 * Phase A: SSOT（ssot/pseo_pages.json）に従い、各 PSEO 記事の meta robots と link canonical を一括適用する。
 * robots.txt では noindex 対象をブロックしない（noindex を読ませるため）。
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..", "..");
const SSOT_PATH = join(ROOT, "ssot", "pseo_pages.json");
const PSEO_ROOT = join(ROOT, "ja", "resources", "pseo");

interface SsotPage {
  url: string;
  robots: "index,follow" | "noindex,follow";
  canonical_target: string;
}

function urlToSlug(url: string): string {
  const pathname = url.replace(/^https?:\/\/[^/]+/, "").replace(/\/$/, "");
  const segments = pathname.split("/").filter(Boolean);
  return segments[segments.length - 1] ?? "";
}

function main(): void {
  if (!existsSync(SSOT_PATH)) {
    console.error("SSOT not found. Run: npx tsx scripts/pseo/build_ssot_phase_a.ts");
    process.exit(1);
  }
  const { pages } = JSON.parse(readFileSync(SSOT_PATH, "utf-8")) as {
    pages: SsotPage[];
  };

  const slugToPage = new Map<string, SsotPage>();
  for (const p of pages) {
    const slug = urlToSlug(p.url);
    slugToPage.set(slug, p);
  }

  let updated = 0;
  for (const [slug, page] of slugToPage) {
    const indexPath = join(PSEO_ROOT, slug, "index.html");
    if (!existsSync(indexPath)) continue;

    let html = readFileSync(indexPath, "utf-8");
    const canonicalHref = page.canonical_target || page.url;
    const metaRobots = `<meta name="robots" content="${page.robots}" />`;
    const linkCanonical = `<link rel="canonical" href="${canonicalHref}" />`;

    const robotsRe = /<meta\s+name=["']robots["']\s+content=["'][^"']*["']\s*\/?>/i;
    const canonicalRe = /<link\s+rel=["']canonical["']\s+href=["'][^"']*["']\s*\/?>/i;

    let changed = false;
    if (robotsRe.test(html)) {
      const newHtml = html.replace(robotsRe, metaRobots);
      if (newHtml !== html) {
        html = newHtml;
        changed = true;
      }
    } else {
      const afterViewport = html.replace(
        /(<meta\s+name=["']viewport["'][^>]*\/?>)/i,
        `$1\n  ${metaRobots}`
      );
      if (afterViewport !== html) {
        html = afterViewport;
        changed = true;
      }
    }

    if (canonicalRe.test(html)) {
      const newHtml = html.replace(canonicalRe, linkCanonical);
      if (newHtml !== html) {
        html = newHtml;
        changed = true;
      }
    } else {
      const afterRobots = html.replace(
        /(<meta\s+name=["']robots["'][^>]*\/?>)/i,
        `$1\n  ${linkCanonical}`
      );
      if (afterRobots !== html) {
        html = afterRobots;
        changed = true;
      }
    }

    if (changed) {
      writeFileSync(indexPath, html, "utf-8");
      updated++;
    }
  }

  console.log(`postprocess_ssot_robots_canonical: ${slugToPage.size} pages in SSOT, ${updated} files updated`);
}

main();

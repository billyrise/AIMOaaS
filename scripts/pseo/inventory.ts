/**
 * Phase 0: PSEO 生成物の所在を特定し、inventory を出力する。
 * 現行: ja/resources/pseo/<final_slug>/index.html のみ（100件）。pseo_pages.json で id を解決。
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "..");
const PSEO_ROOT = path.join(ROOT, "ja", "resources", "pseo");
const REPORT_DIR = path.join(ROOT, "data", "pseo", "artifacts", "report");
const PSEO_PAGES_PATH = path.join(ROOT, "data", "pseo", "pseo_pages.json");

interface PageEntry {
  id: string;
  final_slug: string;
  path: string;
  title: string;
  h1: string;
  canonical: string;
  robots: string;
  og_url: string;
}

function extractTitle(html: string): string {
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (!m) return "";
  return m[1].replace(/\s*\|\s*AIMOaaS.*$/i, "").trim();
}

function extractH1(html: string): string {
  const m = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  if (!m) return "";
  return m[1].trim();
}

function extractCanonical(html: string): string {
  const m = html.match(/<link\s+rel="canonical"\s+href=["']([^"']+)["']/i);
  return m ? m[1].trim() : "";
}

function extractRobots(html: string): string {
  const m = html.match(/<meta\s+name=["']robots["']\s+content=["']([^"']+)["']/i);
  return m ? m[1].trim() : "";
}

function extractOgUrl(html: string): string {
  const m = html.match(/<meta\s+property=["']og:url["']\s+content=["']([^"']+)["']/i);
  return m ? m[1].trim() : "";
}

function loadPseoPagesByFinalSlug(): Map<string, { id: string }> {
  if (!fs.existsSync(PSEO_PAGES_PATH)) return new Map();
  const raw = JSON.parse(fs.readFileSync(PSEO_PAGES_PATH, "utf-8")) as {
    pages: Array<{ id: string; final_slug: string }>;
  };
  const m = new Map<string, { id: string }>();
  for (const p of raw.pages) m.set(p.final_slug, { id: p.id });
  return m;
}

function run(): void {
  if (!fs.existsSync(PSEO_ROOT)) {
    console.error("PSEO root not found:", PSEO_ROOT);
    process.exit(1);
  }

  const byFinalSlug = loadPseoPagesByFinalSlug();
  const dirs = fs.readdirSync(PSEO_ROOT).filter((d) => {
    const full = path.join(PSEO_ROOT, d);
    return fs.statSync(full).isDirectory() && fs.existsSync(path.join(full, "index.html"));
  });

  const pages: PageEntry[] = [];
  for (const dir of dirs.sort()) {
    const indexPath = path.join(PSEO_ROOT, dir, "index.html");
    const html = fs.readFileSync(indexPath, "utf-8");
    const record = byFinalSlug.get(dir);
    pages.push({
      id: record?.id ?? dir,
      final_slug: dir,
      path: path.relative(ROOT, indexPath),
      title: extractTitle(html) || extractH1(html) || dir,
      h1: extractH1(html) || extractTitle(html) || dir,
      canonical: extractCanonical(html),
      robots: extractRobots(html),
      og_url: extractOgUrl(html),
    });
  }

  const inventory = {
    root_dir: PSEO_ROOT,
    generated_at: new Date().toISOString(),
    total: pages.length,
    pages,
  };

  if (!fs.existsSync(REPORT_DIR)) fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(REPORT_DIR, "pseo_inventory.json"),
    JSON.stringify(inventory, null, 2),
    "utf-8"
  );
  fs.writeFileSync(
    path.join(REPORT_DIR, "current_inventory.json"),
    JSON.stringify(inventory, null, 2),
    "utf-8"
  );
  console.log(`Wrote ${path.join(REPORT_DIR, "pseo_inventory.json")} and current_inventory.json (${pages.length} pages)`);
}

run();

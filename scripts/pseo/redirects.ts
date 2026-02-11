/**
 * Phase 1: pseo_pages.json から旧URL→新URL の 301 リダイレクトを生成する。
 * Cloudflare Pages: _redirects。末尾スラッシュなし→ありも 301。
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "..");
const PSEO_PAGES_PATH = path.join(ROOT, "data", "pseo", "pseo_pages.json");
const REDIRECTS_PATH = path.join(ROOT, "_redirects");
const REPORT_DIR = path.join(ROOT, "data", "pseo", "artifacts", "report");

interface PseoPageRecord {
  id: string;
  final_slug: string;
  final_url: string;
  legacy_url: string;
}

function run(): void {
  if (!fs.existsSync(PSEO_PAGES_PATH)) {
    console.error("Run pages:ssot first: npm run pages:ssot");
    process.exit(1);
  }

  const { pages } = JSON.parse(fs.readFileSync(PSEO_PAGES_PATH, "utf-8")) as {
    pages: PseoPageRecord[];
  };

  const lines: string[] = [];
  for (const p of pages) {
    const fromNoSlash = p.legacy_url.replace(/\/$/, "");
    const toSlash = p.final_url.replace(/\/$/, "") + "/";
    lines.push(`${fromNoSlash} ${toSlash} 301`);
    lines.push(`${fromNoSlash}/ ${toSlash} 301`);
  }

  const preview = lines.join("\n");
  if (!fs.existsSync(REPORT_DIR)) fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.writeFileSync(path.join(REPORT_DIR, "pseo_redirects_preview.txt"), preview, "utf-8");
  console.log(`Wrote ${path.join(REPORT_DIR, "pseo_redirects_preview.txt")}`);

  let existing = "";
  if (fs.existsSync(REDIRECTS_PATH)) existing = fs.readFileSync(REDIRECTS_PATH, "utf-8");
  const pseoBlock = "\n# PSEO legacy URL → final_slug (301)\n" + preview + "\n";
  const withoutPseo = existing.replace(/\n# PSEO legacy URL[^\n]*\n[\s\S]*?(?=\n# |$)/, "").trimEnd();
  fs.writeFileSync(REDIRECTS_PATH, (withoutPseo + pseoBlock).trimStart(), "utf-8");
  console.log(`Updated ${REDIRECTS_PATH} (PSEO block replaced)`);
}

run();

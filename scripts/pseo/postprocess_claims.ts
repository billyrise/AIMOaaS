/**
 * Phase 5: 禁止主張の機械的リライト。claims_rules.json の banned_patterns に従い
 * HTML を安全な言い換えに置換し、ログを artifacts/report/claims_rewrite_log.json に保存する。
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";
import { lintClaims } from "./claims_lint.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..", "..");
const DATA_PSEO = join(ROOT, "data", "pseo");
const RULES_PATH = join(DATA_PSEO, "claims_rules.json");
const OUT_BASE = join(ROOT, "ja", "resources", "pseo");
const REPORT_DIR = join(DATA_PSEO, "artifacts", "report");

interface ClaimsRules {
  banned_patterns?: Array<{ pattern: string; replacement: string }>;
  soft_bans?: string[];
  allowed_negations?: string[];
}

function loadRules(): ClaimsRules {
  if (!existsSync(RULES_PATH)) return {};
  return JSON.parse(readFileSync(RULES_PATH, "utf8")) as ClaimsRules;
}

/** マッチ直後の文脈が否定なら true（置換しない） */
function isNegationContext(text: string, index: number): boolean {
  const rest = text.slice(Math.max(0, index - 30), index + 120);
  return /(では)?(ありません|ない)|(し|し)ません|(せ)ず\s|観点であり、保証ではない|保証を提供しません|保証しません/.test(rest);
}

function rewriteHtml(html: string, rules: ClaimsRules): { html: string; log: Array<{ pattern: string; count: number }> } {
  const log: Array<{ pattern: string; count: number }> = [];
  let out = html;
  const patterns = rules.banned_patterns ?? [];
  for (const { pattern, replacement } of patterns) {
    const re = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
    let count = 0;
    out = out.replace(re, (match: string, ...args: unknown[]) => {
      const offset = typeof args[args.length - 2] === "number" ? (args[args.length - 2] as number) : 0;
      if (isNegationContext(out, offset + match.length)) return match;
      count++;
      return replacement;
    });
    if (count > 0) log.push({ pattern, count });
  }
  return { html: out, log };
}

async function main(): Promise<void> {
  const rules = loadRules();
  const pseoPath = join(DATA_PSEO, "pseo_pages.json");
  if (!existsSync(pseoPath)) {
    console.error("pseo_pages.json not found");
    process.exit(1);
  }
  const { pages } = JSON.parse(readFileSync(pseoPath, "utf8")) as {
    pages: Array<{ id: string; final_slug: string }>;
  };
  const rewriteLog: Record<string, Array<{ pattern: string; count: number }>> = {};
  const stillFailing: string[] = [];
  let processed = 0;
  for (const page of pages) {
    const outPath = join(OUT_BASE, page.final_slug, "index.html");
    if (!existsSync(outPath)) continue;
    let html = readFileSync(outPath, "utf8");
    const { html: newHtml, log } = rewriteHtml(html, rules);
    if (log.length > 0) {
      rewriteLog[page.final_slug] = log;
      writeFileSync(outPath, newHtml, "utf8");
      processed++;
    }
    const result = lintClaims(newHtml);
    if (!result.pass) stillFailing.push(`${page.final_slug}: ${result.violations.join("; ")}`);
  }
  if (!existsSync(dirname(REPORT_DIR))) mkdirSync(dirname(REPORT_DIR), { recursive: true });
  if (!existsSync(REPORT_DIR)) mkdirSync(REPORT_DIR, { recursive: true });
  const logPath = join(REPORT_DIR, "claims_rewrite_log.json");
  writeFileSync(
    logPath,
    JSON.stringify(
      { generated_at: new Date().toISOString(), by_page: rewriteLog, still_failing: stillFailing },
      null,
      2
    ),
    "utf8"
  );
  console.log(`postprocess_claims: ${processed} pages rewritten. Log: ${logPath}`);
  if (stillFailing.length > 0) {
    console.warn(`${stillFailing.length} pages still have claims violations (see claims_rewrite_log.json).`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

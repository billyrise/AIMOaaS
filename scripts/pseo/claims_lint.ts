/**
 * 保証・合格・準拠の断言のみを fail とする。一般語（連携/本ページ）は禁止しない。
 * 禁則リスト SSOT: _policy/content-claims.md。fail は「禁止主張パターン」に限定。
 */

import { readFileSync, existsSync } from "fs";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";
import yaml from "js-yaml";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..", "..");
const POLICY_DIR = join(ROOT, "_policy");
const DATA_PSEO = join(ROOT, "data", "pseo");
const CONTENT_CLAIMS_PATH = join(POLICY_DIR, "content-claims.md");
const ALLOWED_INTEGRATIONS_PATH = join(DATA_PSEO, "allowed_integrations.yaml");

export interface ClaimsLintResult {
  pass: boolean;
  violations: string[];
  /** 参考用。fail にはしない */
  warnings?: string[];
}

/** 保証結論・準拠断言・監査合格を示唆するパターンのみ（fail 用）。一般語は含めない。 */
function getAssertionPatterns(): Array<RegExp | string> {
  return [
    /監査に通る|監査で通る|合格する|必ず合格|必ず認められる/,
    /準拠している|適合している|完全準拠|100%準拠|完全適合|法的に問題ない/,
    /保証する|保証を提供する|監査保証|監査合格を保証/,
    /[^\s。]+を満たすことを保証|[^\s。]+の準拠を保証/,
    /監査法人が不要|監査なしで/,
    /100%カバー|すべての規制に対応|漏れなし/,
    /必ず削減|確実に改善|失敗しない/,
    "API で提供",
    "クラウドで即時診断",
  ];
}

/** content-claims.md の「禁止例」表と「禁止する機能・連携」リストをパースして禁則語を返す（SSOT） */
export function getBannedPhrases(): string[] {
  if (!existsSync(CONTENT_CLAIMS_PATH)) return getDefaultBannedPhrases();
  const raw = readFileSync(CONTENT_CLAIMS_PATH, "utf8");
  const phrases: string[] = [];

  const tableMatch = raw.match(/\|\s*禁止例\s*\|[\s\S]*?\n\|[-\s|]+\|([\s\S]*?)(?=\n\n|###|##)/);
  if (tableMatch) {
    const rows = tableMatch[1].split("\n").filter((r) => r.trim().startsWith("|"));
    for (const row of rows) {
      const cells = row.split("|").map((c) => c.trim());
      if (cells.length >= 2) {
        const examples = cells[1].replace(/「|」/g, "").split(/[、，]/);
        phrases.push(...examples.map((e) => e.trim()).filter(Boolean));
      }
    }
  }

  const sectionMatch = raw.match(/###\s*禁止する機能・連携[\s\S]*?\n\n(-[\s\S]*?)(?=\n\n---|\n##|$)/);
  if (sectionMatch) {
    const listBlock = sectionMatch[1];
    const listItems = listBlock.split("\n").filter((line) => line.trim().startsWith("-"));
    for (const line of listItems) {
      const text = line.replace(/^-\s*/, "").trim();
      if (text && !text.startsWith("〇〇") && !text.includes("allowed_integrations")) {
        phrases.push(text);
      }
    }
  }

  return phrases.length >= 3 ? phrases : getDefaultBannedPhrases();
}

function getDefaultBannedPhrases(): string[] {
  return [
    "完全準拠", "100%準拠", "完全適合", "法的に問題ない",
    "監査保証", "監査合格を保証", "必ず合格", "監査で通る",
    "100%カバー", "すべての規制に対応", "漏れなし",
    "必ず削減", "確実に改善", "失敗しない",
    "API で提供", "クラウドで即時診断",
  ];
}

/** data/pseo/allowed_integrations.yaml から許容する連携・機能名を読み込む */
export function getAllowedIntegrations(): string[] {
  if (!existsSync(ALLOWED_INTEGRATIONS_PATH)) return [];
  const data = yaml.load(readFileSync(ALLOWED_INTEGRATIONS_PATH, "utf8")) as { allowed?: string[] };
  return Array.isArray(data?.allowed) ? data.allowed : [];
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** マッチ位置の直後が否定文（しない・ではありません等）なら true */
function isNegationContext(text: string, index: number, matchLength: number = 0): boolean {
  const rest = text.slice(index, index + matchLength + 120);
  if (/(もの|わけ|こと)?(では|では)?(ありません|ない)|(し|し)ません|(せ)ず\s|観点であり、保証ではない/.test(rest)) return true;
  if (/を謳うものではなく|を提供するものではありません|するものではありません/.test(rest)) return true;
  if (/使わない|といった断定的な表現は避け|は避け、/.test(rest.slice(0, 120))) return true;
  const around = text.slice(Math.max(0, index - 80), index + matchLength + 80);
  return /[」』].*使わない|等の表現は使わない|といった表現は使わない|といった断定的な表現は避け/.test(around);
}

/**
 * 本文 HTML を検証。fail は「禁止主張パターン」（保証/合格/準拠断言）のみ。
 * 否定文（「保証を提供しません」等）は除外する。
 */
export function lintClaims(html: string, _options?: { allowedIntegrations?: string[] }): ClaimsLintResult {
  const violations: string[] = [];
  const text = stripHtml(html);
  const patterns = getAssertionPatterns();

  for (const p of patterns) {
    if (typeof p === "string") {
      let idx = text.indexOf(p);
      while (idx !== -1) {
        if (!isNegationContext(text, idx, p.length)) {
          violations.push(`assertion_pattern: "${p}"`);
          break;
        }
        idx = text.indexOf(p, idx + 1);
      }
    } else {
      const re = new RegExp(p.source, p.flags + "g");
      let m: RegExpExecArray | null;
      let foundViolation = false;
      while ((m = re.exec(text)) !== null && m.index !== undefined && !foundViolation) {
        const len = m[0].length;
        if (!isNegationContext(text, m.index, len)) {
          violations.push(`assertion_pattern: ${String(p)}`);
          foundViolation = true;
        }
      }
    }
  }

  const banned = getBannedPhrases();
  for (const phrase of banned) {
    const idx = text.indexOf(phrase);
    if (idx !== -1 && !isNegationContext(text, idx, phrase.length)) violations.push(`banned: "${phrase}"`);
  }

  return {
    pass: violations.length === 0,
    violations,
  };
}

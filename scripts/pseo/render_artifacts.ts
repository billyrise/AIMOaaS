/**
 * 成果物テンプレ（Evidence Pack 目次、監査質問、統制カタログ、RACI）を
 * ページ用に差し込み、HTML の表・チェックリストとして出力する。
 * catalog の artifact_context（業界/規格/成熟度）で差し替え可能。
 */

import { readFileSync, existsSync } from "fs";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";
import yaml from "js-yaml";
import type { CatalogPage, ArtifactContext } from "./types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..", "..");
const ARTIFACTS_DIR = join(ROOT, "data", "pseo", "artifacts");

export interface RenderedArtifacts {
  /** 最小要件表（統制→証跡→頻度） */
  minRequirementTable: string;
  /** 監査質問集（抜粋） */
  auditQuestionsExcerpt: string;
  /** RACI（簡易） */
  raciSimple: string;
}

function loadYaml<T>(name: string): T | null {
  const path = join(ARTIFACTS_DIR, name);
  if (!existsSync(path)) return null;
  return yaml.load(readFileSync(path, "utf8")) as T;
}

function subst(s: string, ctx: ArtifactContext): string {
  return s
    .replace(/\{\{industry\}\}/g, ctx.industry ?? "—")
    .replace(/\{\{standard\}\}/g, ctx.standard ?? "AIMO Standard")
    .replace(/\{\{maturity\}\}/g, ctx.maturity ?? "—");
}

export function renderArtifacts(page: CatalogPage): RenderedArtifacts {
  const ctx: ArtifactContext = page.artifact_context ?? {};

  const controlCatalog = loadYaml<{
    meta: { title: string; note: string };
    controls: Array<{ control: string; evidence: string; log_or_record: string; frequency: string }>;
  }>("control_catalog.yaml");

  const auditQuestions = loadYaml<{
    meta: { title: string; note: string };
    questions: Array<{ question: string; evidence: string }>;
  }>("audit_questions.yaml");

  const raciTemplates = loadYaml<{
    meta: { title: string; note: string };
    activities: Array<{ activity: string; r: string; a: string; c: string; i: string }>;
  }>("raci_templates.yaml");

  const minRequirementTable = controlCatalog
    ? `
<section class="pseo-artifact min-requirement-table" data-artifact="min-requirement">
  <h2 class="text-xl font-bold text-slate-900 mt-8 mb-3">最小要件表</h2>
  <p class="text-sm text-slate-600 mb-3">${subst(controlCatalog.meta.note, ctx)}</p>
  <div class="overflow-x-auto">
    <table class="min-w-full border border-slate-200 text-sm">
      <thead>
        <tr class="bg-slate-100">
          <th class="border border-slate-200 px-3 py-2 text-left">統制項目</th>
          <th class="border border-slate-200 px-3 py-2 text-left">必要証跡の観点</th>
          <th class="border border-slate-200 px-3 py-2 text-left">ログ／運用記録</th>
          <th class="border border-slate-200 px-3 py-2 text-left">頻度の例</th>
        </tr>
      </thead>
      <tbody>
${controlCatalog.controls
  .map(
    (r) =>
      `        <tr>
          <td class="border border-slate-200 px-3 py-2">${escapeHtml(r.control)}</td>
          <td class="border border-slate-200 px-3 py-2">${escapeHtml(r.evidence)}</td>
          <td class="border border-slate-200 px-3 py-2">${escapeHtml(r.log_or_record)}</td>
          <td class="border border-slate-200 px-3 py-2">${escapeHtml(r.frequency)}</td>
        </tr>`
  )
  .join("\n")}
      </tbody>
    </table>
  </div>
</section>`
    : "";

  const auditQuestionsExcerpt = auditQuestions
    ? `
<section class="pseo-artifact audit-questions-excerpt" data-artifact="audit-questions">
  <h2 class="text-xl font-bold text-slate-900 mt-8 mb-3">監査質問集（抜粋）</h2>
  <p class="text-sm text-slate-600 mb-3">${subst(auditQuestions.meta.note, ctx)}</p>
  <div class="overflow-x-auto">
    <table class="min-w-full border border-slate-200 text-sm">
      <thead>
        <tr class="bg-slate-100">
          <th class="border border-slate-200 px-3 py-2 text-left">監査で聞かれやすい質問（例）</th>
          <th class="border border-slate-200 px-3 py-2 text-left">説明に使う証跡・記録の観点</th>
        </tr>
      </thead>
      <tbody>
${auditQuestions.questions
  .map(
    (q) =>
      `        <tr>
          <td class="border border-slate-200 px-3 py-2">${escapeHtml(q.question)}</td>
          <td class="border border-slate-200 px-3 py-2">${escapeHtml(q.evidence)}</td>
        </tr>`
  )
  .join("\n")}
      </tbody>
    </table>
  </div>
</section>`
    : "";

  const raciSimple = raciTemplates
    ? `
<section class="pseo-artifact raci-simple" data-artifact="raci">
  <h2 class="text-xl font-bold text-slate-900 mt-8 mb-3">RACI（簡易）</h2>
  <p class="text-sm text-slate-600 mb-3">${subst(raciTemplates.meta.note, ctx)}</p>
  <div class="overflow-x-auto">
    <table class="min-w-full border border-slate-200 text-sm">
      <thead>
        <tr class="bg-slate-100">
          <th class="border border-slate-200 px-3 py-2 text-left">アクティビティ</th>
          <th class="border border-slate-200 px-3 py-2 text-left">R（実行）</th>
          <th class="border border-slate-200 px-3 py-2 text-left">A（説明責任）</th>
          <th class="border border-slate-200 px-3 py-2 text-left">C（相談）</th>
          <th class="border border-slate-200 px-3 py-2 text-left">I（報告）</th>
        </tr>
      </thead>
      <tbody>
${raciTemplates.activities
  .map(
    (a) =>
      `        <tr>
          <td class="border border-slate-200 px-3 py-2">${escapeHtml(a.activity)}</td>
          <td class="border border-slate-200 px-3 py-2">${escapeHtml(a.r)}</td>
          <td class="border border-slate-200 px-3 py-2">${escapeHtml(a.a)}</td>
          <td class="border border-slate-200 px-3 py-2">${escapeHtml(a.c)}</td>
          <td class="border border-slate-200 px-3 py-2">${escapeHtml(a.i)}</td>
        </tr>`
  )
  .join("\n")}
      </tbody>
    </table>
  </div>
</section>`
    : "";

  return { minRequirementTable, auditQuestionsExcerpt, raciSimple };
}

/** 最小要件表・監査質問集（抜粋）・RACI（簡易）を組み合わせた HTML（最低2つ含まれる。generate で本文に差し込む用） */
export function renderArtifactsMinTwo(page: CatalogPage): string {
  const { minRequirementTable, auditQuestionsExcerpt, raciSimple } = renderArtifacts(page);
  const parts = [minRequirementTable, auditQuestionsExcerpt, raciSimple].filter(Boolean);
  return parts.join("");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

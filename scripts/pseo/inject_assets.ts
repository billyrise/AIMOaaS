/**
 * Phase 4: topic_assets を本文に注入。pseo_pages.json の topic に応じて
 * deterministic に case_study / checklist / findings_fixes / artifact_block / audit_q を
 * References 直前に挿入し、data-unique で機械検出可能にする。
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..", "..");
const DATA_PSEO = join(ROOT, "data", "pseo");
const TOPIC_ASSETS_DIR = join(DATA_PSEO, "topic_assets");
const OUT_BASE = join(ROOT, "ja", "resources", "pseo");

interface TopicAsset {
  topic: string;
  case_studies?: Array<{
    id: string;
    title: string;
    context?: string;
    what_happened?: string;
    evidence_needed?: string[];
    how_aimoaas_helps?: string;
  }>;
  checklists?: Array<{ id: string; title: string; items: string[] }>;
  findings_and_fixes?: Array<{ id: string; finding: string; fix: string }>;
  artifact_blocks?: Array<{
    id: string;
    type: string;
    title: string;
    rows?: string[][];
  }>;
  audit_questions?: Array<{ id: string; q: string; a: string }>;
}

interface PseoPage {
  id: string;
  final_slug: string;
  topic?: string[];
}

function simpleHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function topicToAssetKey(page: PseoPage): string {
  const topics = page.topic ?? [];
  const slug = page.final_slug ?? "";
  if (slug.includes("coverage-map") && topics.length === 0) return "coverage-map";
  if (slug.includes("shadow-ai") || topics.includes("shadow-ai") || slug.includes("minimum-evidence")) return "shadow-ai";
  if (topics.includes("request-review-exception") || (slug.includes("exception") && topics.includes("intake-review-approve"))) return "approval-exception";
  const t = topics[0];
  if (t === "evidence-pack") return "evidence-pack";
  if (t === "intake-review-approve") return "governance-workflow";
  if (t === "coverage-map") return "coverage-map";
  if (
    ["proof-assurance", "ai-audit", "controls", "responsibility-boundary", "evidence-readiness", "monitoring", "inventory"].includes(t)
  )
    return "audit-proof-assurance";
  return "misc";
}

function loadTopicAsset(key: string): TopicAsset | null {
  const path = join(TOPIC_ASSETS_DIR, `${key}.json`);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8")) as TopicAsset;
  } catch {
    return null;
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderCaseStudy(c: TopicAsset["case_studies"][0]): string {
  if (!c) return "";
  const items = (c.evidence_needed ?? []).map((e) => `<li>${escapeHtml(e)}</li>`).join("");
  return `<section class="my-6 p-4 bg-slate-50 rounded-lg border border-slate-200" data-unique="case-study" aria-label="${escapeHtml(c.title)}">
<h3 class="text-lg font-semibold text-slate-900 mb-2">${escapeHtml(c.title)}</h3>
<p class="text-slate-700 mb-2">${escapeHtml(c.context ?? "")} ${escapeHtml(c.what_happened ?? "")}</p>
${items ? `<ul class="list-disc list-inside text-slate-700 mb-2">${items}</ul>` : ""}
<p class="text-slate-600 text-sm">${escapeHtml(c.how_aimoaas_helps ?? "")}</p>
</section>`;
}

function renderChecklist(cl: TopicAsset["checklists"][0]): string {
  if (!cl) return "";
  const items = (cl.items ?? []).map((i) => `<li>${escapeHtml(i)}</li>`).join("");
  return `<section class="my-6 p-4 bg-white rounded-lg border border-slate-200" data-unique="checklist" aria-label="${escapeHtml(cl.title)}">
<h3 class="text-lg font-semibold text-slate-900 mb-2">${escapeHtml(cl.title)}</h3>
<ul class="list-disc list-inside text-slate-700">${items}</ul>
</section>`;
}

function renderFindingsFixes(ff: TopicAsset["findings_and_fixes"][0]): string {
  if (!ff) return "";
  return `<section class="my-6 p-4 bg-amber-50 rounded-lg border border-amber-200" data-unique="findings-fixes" aria-label="指摘と是正観点">
<h3 class="text-lg font-semibold text-slate-900 mb-2">指摘と是正の観点（例）</h3>
<p class="text-slate-700"><strong>指摘例:</strong> ${escapeHtml(ff.finding)}</p>
<p class="text-slate-700 mt-1"><strong>是正観点:</strong> ${escapeHtml(ff.fix)}</p>
</section>`;
}

function renderArtifactBlock(ab: TopicAsset["artifact_blocks"][0]): string {
  if (!ab || !ab.rows?.length) return "";
  const [head, ...bodyRows] = ab.rows;
  const headRow = head?.map((c) => `<th class="border px-2 py-1 text-left">${escapeHtml(c)}</th>`).join("") ?? "";
  const body = bodyRows
    .map((row) => `<tr>${row.map((c) => `<td class="border px-2 py-1">${escapeHtml(c)}</td>`).join("")}</tr>`)
    .join("");
  return `<section class="my-6 overflow-x-auto" data-unique="artifact-block" aria-label="${escapeHtml(ab.title)}">
<h3 class="text-lg font-semibold text-slate-900 mb-2">${escapeHtml(ab.title)}</h3>
<table class="min-w-full border border-slate-200"><thead><tr>${headRow}</tr></thead><tbody>${body}</tbody></table>
</section>`;
}

function renderAuditQuestion(aq: TopicAsset["audit_questions"][0]): string {
  if (!aq) return "";
  return `<section class="my-6 p-4 border-l-4 border-indigo-200 bg-slate-50" data-unique="audit-q" aria-label="監査観点">
<h3 class="text-lg font-semibold text-slate-900 mb-1">${escapeHtml(aq.q)}</h3>
<p class="text-slate-700">${escapeHtml(aq.a)}</p>
</section>`;
}

function buildInjectedBlocks(asset: TopicAsset, seed: number): string[] {
  const blocks: string[] = [];
  const idx = (n: number) => (seed + n) >>> 0;
  const add = (arr: unknown[] | undefined, index: number, render: (x: unknown) => string) => {
    if (!arr?.length) return;
    const item = arr[index % arr.length];
    if (item) blocks.push(render(item as never));
  };
  add(asset.case_studies, idx(0), renderCaseStudy as (x: unknown) => string);
  add(asset.checklists, idx(1), renderChecklist as (x: unknown) => string);
  add(asset.findings_and_fixes, idx(2), renderFindingsFixes as (x: unknown) => string);
  add(asset.artifact_blocks, idx(3), renderArtifactBlock as (x: unknown) => string);
  add(asset.audit_questions, idx(4), renderAuditQuestion as (x: unknown) => string);
  return blocks;
}

function injectBeforeReferences(html: string, injectedHtml: string): string {
  const refPatterns = [
    /<h2[^>]*>\s*References\s*<\/h2>/gi,
    /<h2[^>]*>\s*参考文献\s*<\/h2>/g,
  ];
  for (const re of refPatterns) {
    let lastIndex = -1;
    let m: RegExpExecArray | null;
    re.lastIndex = 0;
    while ((m = re.exec(html)) !== null && m.index != null) lastIndex = m.index;
    if (lastIndex >= 0) {
      const before = html.slice(0, lastIndex);
      const after = html.slice(lastIndex);
      return before + injectedHtml + "\n\n" + after;
    }
  }
  const proseClose = html.indexOf("</div>\n      </section>\n\n      <!-- mid-cta");
  if (proseClose >= 0) {
    return html.slice(0, proseClose) + injectedHtml + "\n\n" + html.slice(proseClose);
  }
  return html.replace(/<\/div>\s*<\/section>/, injectedHtml + "\n\n</div>\n</section>");
}

async function main(): Promise<void> {
  const pseoPath = join(DATA_PSEO, "pseo_pages.json");
  if (!existsSync(pseoPath)) {
    console.error("pseo_pages.json not found");
    process.exit(1);
  }
  const { pages } = JSON.parse(readFileSync(pseoPath, "utf8")) as { pages: PseoPage[] };
  let injected = 0;
  for (const page of pages) {
    const key = topicToAssetKey(page);
    const asset = loadTopicAsset(key);
    if (!asset) continue;
    const seed = simpleHash(page.final_slug);
    const blocks = buildInjectedBlocks(asset, seed);
    if (blocks.length < 2) continue;
    const outPath = join(OUT_BASE, page.final_slug, "index.html");
    if (!existsSync(outPath)) continue;
    let html = readFileSync(outPath, "utf8");
    const injectedHtml = blocks.join("\n\n");
    html = injectBeforeReferences(html, injectedHtml);
    writeFileSync(outPath, html, "utf8");
    injected++;
  }
  console.log(`inject_assets: ${injected} pages updated.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

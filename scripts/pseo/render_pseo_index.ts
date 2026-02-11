/**
 * PSEO ディレクトリトップ（/ja/resources/pseo/index.html）を生成する。
 * PR-D: ナビ＋ハブ。トピック別グループ・セクション要約・まず読むべき3本・フィルタ・ページネーション。
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join, resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { renderHeaderStatic, renderFooter } from "./layout.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..", "..");
const DATA_PSEO = join(ROOT, "data", "pseo");
const REPORT_DIR = join(DATA_PSEO, "artifacts", "report");
const OUT_PATH = join(ROOT, "ja", "resources", "pseo", "index.html");
const BASE_URL = process.env.BASE_URL || "https://aimoaas.com";

interface PseoPage {
  id: string;
  title: string;
  topic: string[];
  final_slug: string;
  final_url: string;
}

interface PseoPagesJson {
  pages: PseoPage[];
}

interface HubConfig {
  section_summaries?: Record<string, string>;
  pillar_slugs?: string[];
  items_per_page?: number;
}

interface TaxonomyPage {
  slug: string;
  intent_id: string;
  intent_label: string;
  audience_tags?: string[];
  scope_tags?: string[];
}

function loadHubConfig(): HubConfig {
  const fp = join(DATA_PSEO, "hub_config.json");
  if (!existsSync(fp)) return {};
  return JSON.parse(readFileSync(fp, "utf-8")) as HubConfig;
}

function loadTaxonomyBySlug(): Map<string, TaxonomyPage> {
  const fp = join(REPORT_DIR, "search_intent_taxonomy.json");
  if (!existsSync(fp)) return new Map();
  const data = JSON.parse(readFileSync(fp, "utf-8")) as { pages?: TaxonomyPage[] };
  const m = new Map<string, TaxonomyPage>();
  if (data.pages) for (const p of data.pages) m.set(p.slug, p);
  return m;
}

/** 掲載OK（index 許可）の final_slug 一覧。一覧ページにはこの slug のみ表示する。 */
function loadIndexAllowlist(): Set<string> {
  const fp = join(DATA_PSEO, "index_allowlist.json");
  if (!existsSync(fp)) return new Set();
  const data = JSON.parse(readFileSync(fp, "utf-8")) as { allow?: string[] };
  return new Set(data.allow || []);
}

/** トピック配列から表示用セクション名を決定（順序は下の SECTION_ORDER で制御） */
function sectionForPage(page: PseoPage): string {
  const t = page.topic || [];
  if (t.includes("evidence-pack")) return "証拠パック・Evidence Pack";
  if (t.includes("coverage-map") || page.final_slug.includes("coverage-map")) return "Coverage Map";
  if (t.includes("responsibility-boundary") || t.some((x) => x.includes("responsibility"))) return "責任分界・SLA・契約";
  if (t.includes("shadow-ai")) return "シャドーAI・最小証拠";
  if (t.some((x) => x.includes("intake") || x.includes("review") || x.includes("approval") || x.includes("workflow") || x.includes("exception"))) return "申請・審査・例外・ワークフロー";
  if (t.includes("inventory") || t.includes("monitoring")) return "棚卸・継続監査";
  if (t.includes("proof-assurance") || t.includes("controls") || t.includes("ai-audit")) return "監査・統制・最小要件";
  return "その他";
}

const SECTION_ORDER = [
  "証拠パック・Evidence Pack",
  "監査・統制・最小要件",
  "申請・審査・例外・ワークフロー",
  "棚卸・継続監査",
  "責任分界・SLA・契約",
  "シャドーAI・最小証拠",
  "Coverage Map",
  "その他",
];

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function main(): void {
  const raw = readFileSync(join(DATA_PSEO, "pseo_pages.json"), "utf8");
  const data = JSON.parse(raw) as PseoPagesJson;
  const allPages = data.pages || [];
  const indexAllowlist = loadIndexAllowlist();
  const pages = allPages.filter((p) => indexAllowlist.has(p.final_slug));
  const hubConfig = loadHubConfig();
  const taxonomyBySlug = loadTaxonomyBySlug();
  const sectionSummaries = hubConfig.section_summaries || {};
  const pillarSlugs = hubConfig.pillar_slugs || [];
  const itemsPerPage = hubConfig.items_per_page ?? 20;

  const bySection = new Map<string, PseoPage[]>();
  for (const p of pages) {
    const section = sectionForPage(p);
    if (!bySection.has(section)) bySection.set(section, []);
    bySection.get(section)!.push(p);
  }

  for (const arr of bySection.values()) {
    arr.sort((a, b) => a.title.localeCompare(b.title, "ja"));
  }

  const slugToPage = new Map<string, PseoPage>();
  for (const p of pages) slugToPage.set(p.final_slug, p);

  const pillarBlocks = pillarSlugs
    .filter((slug) => slugToPage.has(slug))
    .slice(0, 3)
    .map((slug) => {
      const p = slugToPage.get(slug)!;
      return `<a href="${BASE_URL}${p.final_url}" class="block p-4 rounded-lg border border-indigo-200 bg-indigo-50/50 hover:bg-indigo-50 text-slate-800">${escapeHtml(p.title)}</a>`;
    });

  const sections = SECTION_ORDER.filter((s) => bySection.has(s));
  const sectionBlocks = sections.map((sectionName, idx) => {
    const secId = `sec-${idx}`;
    const summary = sectionSummaries[sectionName];
    const items = bySection.get(sectionName) || [];
    const lis = items.map((p, itemIdx) => {
      const tax = taxonomyBySlug.get(p.final_slug);
      const intentId = tax?.intent_id ?? "";
      const audience = (tax?.audience_tags ?? [])[0] ?? "";
      const labels: string[] = [];
      if (intentId) labels.push(`<span class="text-xs text-slate-500">${escapeHtml(intentId)}</span>`);
      if (audience) labels.push(`<span class="text-xs text-slate-500">${escapeHtml(audience)}</span>`);
      const labelHtml = labels.length ? `<div class="flex gap-2 mt-1">${labels.join("")}</div>` : "";
      return `        <li class="pseo-hub-item border-b border-slate-100 last:border-0" data-intent="${escapeHtml(intentId)}" data-audience="${escapeHtml(audience)}" data-page-index="${sections.slice(0, idx).reduce((acc, _, i) => acc + (bySection.get(SECTION_ORDER[i])?.length ?? 0), 0) + itemIdx}"><a href="${BASE_URL}${p.final_url}" class="block py-3 px-1 text-slate-700 hover:text-indigo-600 hover:bg-slate-50 rounded transition">${escapeHtml(p.title)}</a>${labelHtml}</li>`;
    });
    const summaryHtml = summary ? `\n        <p class="text-sm text-slate-600 mb-3">${escapeHtml(summary)}</p>` : "";
    return `      <section class="mb-10 pseo-hub-section" aria-labelledby="${secId}" data-section="${escapeHtml(sectionName)}">
        <h2 id="${secId}" class="text-lg font-semibold text-slate-800 mb-2 pb-2 border-b border-slate-200">${escapeHtml(sectionName)}</h2>${summaryHtml}
        <ul class="divide-y divide-slate-100">
${lis.join("\n")}
        </ul>
      </section>`;
  });

  const navLinks = sections
    .map(
      (s, idx) =>
        `<a href="#sec-${idx}" class="text-sm text-indigo-600 hover:underline">${escapeHtml(s)}</a>`
    )
    .join(' <span class="text-slate-300" aria-hidden="true">|</span> ');

  const filterScript = `
(function(){
  var items = document.querySelectorAll('.pseo-hub-item');
  var perPage = ${itemsPerPage};
  var currentPage = 1;
  var filterIntent = '';
  var filterAudience = '';
  function show(){
    items.forEach(function(el){
      var intent = (el.getAttribute('data-intent')||'').trim();
      var audience = (el.getAttribute('data-audience')||'').trim();
      var match = (!filterIntent || intent===filterIntent) && (!filterAudience || audience===filterAudience);
      el.style.display = match ? '' : 'none';
    });
    var visible = Array.from(items).filter(function(el){ return el.style.display !== 'none'; });
    var maxPage = Math.max(1, Math.ceil(visible.length / perPage));
    if(currentPage > maxPage) currentPage = maxPage;
    var start = (currentPage-1)*perPage;
    var end = start+perPage;
    visible.forEach(function(el, i){ el.style.display = (i>=start&&i<end) ? '' : 'none'; });
    var nav = document.getElementById('pseo-hub-pagination');
    if(nav){ nav.innerHTML = visible.length + '件中 ' + (start+1) + '-' + Math.min(end, visible.length) + '件目' + (maxPage>1 ? ' <button type="button" class="ml-2 text-indigo-600" id="pseo-prev">前へ</button> <button type="button" class="text-indigo-600" id="pseo-next">次へ</button>' : ''); }
  }
  show();
  document.getElementById('pseo-prev')&&document.getElementById('pseo-prev').addEventListener('click', function(){ if(currentPage>1){ currentPage--; show(); } });
  document.getElementById('pseo-next')&&document.getElementById('pseo-next').addEventListener('click', function(){ currentPage++; show(); });
})();
`;

  const headerHtml = renderHeaderStatic("ja", "main_lp", BASE_URL);
  const footerHtml = renderFooter("ja", BASE_URL, { showPracticeGuide: true });

  const pillarHtml =
    pillarBlocks.length > 0
      ? `
    <section class="mb-8 p-4 bg-slate-50 rounded-lg border border-slate-200" aria-label="まず読むべき">
      <h2 class="text-lg font-semibold text-slate-800 mb-3">まず読むべき</h2>
      <div class="grid gap-2 sm:grid-cols-3">
        ${pillarBlocks.join("\n        ")}
      </div>
    </section>`
      : "";

  const html = `<!doctype html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="robots" content="index,follow" />
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <title>監査・証跡（実務）一覧 | AIMOaaS™</title>
  <meta name="description" content="AIMOaaS 監査・統制の実務ガイド一覧。Evidence Pack、証跡の最小要件、申請・審査・例外、責任分界、棚卸・継続監査など、専門家向けの観点整理と実務コンテンツ。" />
  <link rel="canonical" href="${BASE_URL}/ja/resources/pseo/" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${BASE_URL}/ja/resources/pseo/" />
  <meta property="og:title" content="監査・証跡（実務）一覧 | AIMOaaS™" />
  <meta property="og:description" content="AIMOaaS 監査・統制の実務ガイド一覧。Evidence Pack、証跡の最小要件、申請・審査・例外、責任分界など。" />
  <meta property="og:image" content="${BASE_URL}/assets/aimo-standard-unifying-regulations.png" />
  <meta property="og:locale" content="ja_JP" />
  <meta property="og:site_name" content="AIMOaaS™" />
  <link rel="preload" href="/assets/css/main.css" as="style" />
  <link rel="stylesheet" href="/assets/css/main.css" />
  <link rel="preload" href="/assets/css/landing.css" as="style" />
  <link rel="stylesheet" href="/assets/css/landing.css" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&display=swap" rel="stylesheet" />
  <script src="https://cdn.tailwindcss.com"></script>
  <style>body { font-family: 'Noto Sans JP', sans-serif; }</style>
  <script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "ホーム", item: `${BASE_URL}/ja/` },
      { "@type": "ListItem", position: 2, name: "監査・証跡（実務）", item: `${BASE_URL}/ja/resources/pseo/` },
    ],
  })}</script>
</head>
<body class="bg-slate-50 text-slate-900 antialiased">
  ${headerHtml}
  <div class="max-w-4xl mx-auto px-4 pt-24 pb-8">
    <header class="mb-8">
      <nav class="text-sm text-slate-600 mb-4" aria-label="パンくず">
        <a href="${BASE_URL}/ja/" class="text-indigo-600 hover:underline">AIMOaaS™</a>
        <span class="mx-1 text-slate-400">/</span>
        <span class="text-slate-700">監査・証跡（実務）</span>
      </nav>
      <h1 class="text-2xl font-bold text-slate-900 mb-2">監査・証跡（実務）一覧</h1>
      <p class="text-slate-600 leading-relaxed">AIMO Standard に基づく監査・統制の実務ガイドです。Evidence Pack の構成、証跡の最小要件、申請・審査・例外、責任分界（Proof / Assurance）、棚卸・継続監査など、観点整理と実務で使えるコンテンツを掲載しています。保証結論は監査法人の責任範囲であり、本コンテンツは観点の提供と整備支援を目的としています。</p>
      <div class="mt-4 pt-4 border-t border-slate-200 flex flex-wrap gap-x-2 gap-y-1 text-sm">
        ${navLinks}
      </div>
    </header>
${pillarHtml}

    <div id="pseo-hub-pagination" class="mb-4 text-sm text-slate-600"></div>
    <main class="space-y-2">
${sectionBlocks.join("\n\n")}
    </main>

    ${footerHtml}
  </div>
  <script src="https://unpkg.com/lucide@latest"></script>
  <script>try { lucide.createIcons(); } catch (e) {}</script>
  <script>${filterScript}</script>
</body>
</html>
`;

  mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, html, "utf8");
  console.log(`Wrote ${OUT_PATH} (${pages.length} pages, ${sections.length} sections, hub config: ${pillarBlocks.length} pillars)`);
}

main();

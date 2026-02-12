/**
 * PSEO 一覧（/ja/resources/pseo/index.html）を SSOT 駆動で生成する。Phase B ハブ化。
 * - indexable（robots=index,follow）のみ公開一覧に表示
 * - 「まず読むべき」は is_pillar=true かつ page_priority=1 を自動表示（ハードコード禁止）
 * - 各カード: summary / 対象者タグ / 成果物ラベル / 読む順序
 * - MECE: 同一 intent_id は1件のみ。カテゴリ内は Pillar→Cluster（最大3本）の順。
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join, resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { renderHeaderStatic, renderFooter } from "./layout.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..", "..");
const SSOT_PATH = join(ROOT, "ssot", "pseo_pages.json");
const DATA_PSEO = join(ROOT, "data", "pseo");
const OUT_PATH = join(ROOT, "ja", "resources", "pseo", "index.html");
const OUT_ALL_PATH = join(ROOT, "ja", "resources", "pseo", "_all", "index.html");
const BASE_URL = process.env.BASE_URL || "https://aimoaas.com";

interface SsotPage {
  url: string;
  title: string;
  cluster_id: string;
  intent_id: string;
  is_pillar: boolean;
  robots: string;
  page_priority: number;
  summary: string;
  audience_tags: string[];
  has_asset: boolean;
}

const CLUSTER_ORDER: string[] = [
  "EvidencePack",
  "MinimumEvidence",
  "Workflow",
  "Inventory",
  "Responsibility",
];

const PILLAR_READ_ORDER: string[] = [
  "EP_DECISION_GUIDE",
  "EB_STRUCTURE_GUIDE",
  "CONTINUOUS_AUDIT_WORKFLOW",
  "MIN_EVIDENCE_CATALOG",
  "INTAKE_REVIEW_EXCEPTION_WORKFLOW",
  "RACI_GOVERNANCE_MODEL",
];

const CLUSTER_TO_SECTION: Record<string, string> = {
  EvidencePack: "証拠パック・Evidence Pack",
  MinimumEvidence: "監査・統制・最小要件",
  Workflow: "申請・審査・例外・ワークフロー",
  Inventory: "棚卸・継続監査",
  Responsibility: "責任分界・SLA・契約",
};

interface HubConfig {
  section_summaries?: Record<string, string>;
  items_per_page?: number;
}

function loadHubConfig(): HubConfig {
  const fp = join(DATA_PSEO, "hub_config.json");
  if (!existsSync(fp)) return {};
  return JSON.parse(readFileSync(fp, "utf-8")) as HubConfig;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function main(): void {
  if (!existsSync(SSOT_PATH)) {
    console.error("SSOT not found. Run: npm run ssot:build");
    process.exit(1);
  }

  const raw = readFileSync(SSOT_PATH, "utf-8");
  const { pages: allPages } = JSON.parse(raw) as { pages: SsotPage[] };
  const indexable = allPages.filter((p) => p.robots === "index,follow");

  // MECE: 同一 intent_id は1件のみ（先勝ち）
  const seenIntent = new Set<string>();
  const mecePages = indexable.filter((p) => {
    if (seenIntent.has(p.intent_id)) return false;
    seenIntent.add(p.intent_id);
    return true;
  });

  const hubConfig = loadHubConfig();
  const sectionSummaries = hubConfig.section_summaries ?? {};
  const itemsPerPage = hubConfig.items_per_page ?? 20;

  // まず読むべき: is_pillar && page_priority === 1、固定順
  const pillars = mecePages
    .filter((p) => p.is_pillar && p.page_priority === 1)
    .sort((a, b) => {
      const ia = PILLAR_READ_ORDER.indexOf(a.intent_id);
      const ib = PILLAR_READ_ORDER.indexOf(b.intent_id);
      if (ia !== -1 && ib !== -1) return ia - ib;
      if (ia !== -1) return -1;
      if (ib !== -1) return 1;
      return a.title.localeCompare(b.title, "ja");
    });

  // カテゴリ別: Pillar 先、続いて Cluster 最大3本
  const bySection = new Map<string, SsotPage[]>();
  for (const p of mecePages) {
    const section = CLUSTER_TO_SECTION[p.cluster_id] ?? "その他";
    if (!bySection.has(section)) bySection.set(section, []);
    bySection.get(section)!.push(p);
  }
  for (const arr of bySection.values()) {
    arr.sort((a, b) => {
      if (a.page_priority !== b.page_priority) return a.page_priority - b.page_priority;
      return a.title.localeCompare(b.title, "ja");
    });
    // B-2: カテゴリ内 Cluster は最大3本（Pillar は全部出し、そのあと Cluster 最大3）
    const pillarsInSec = arr.filter((p) => p.page_priority === 1);
    const clusterInSec = arr.filter((p) => p.page_priority === 2);
    const capped = [...pillarsInSec, ...clusterInSec.slice(0, 3)];
    arr.length = 0;
    arr.push(...capped);
  }

  const sectionOrder = CLUSTER_ORDER.map((c) => CLUSTER_TO_SECTION[c]).filter(Boolean);
  const sections = sectionOrder.filter((s) => bySection.has(s));

  const pillarBlocks = pillars.map(
    (p) =>
      `<a href="${escapeHtml(p.url)}" class="block p-4 rounded-lg border border-indigo-200 bg-indigo-50/50 hover:bg-indigo-50 text-slate-800">${escapeHtml(p.title)}</a>`
  );

  const sectionBlocks = sections.map((sectionName, idx) => {
    const secId = `sec-${idx}`;
    const summary = sectionSummaries[sectionName];
    const items = bySection.get(sectionName) || [];
    const lis = items.map((p, itemIdx) => {
      const audience = (p.audience_tags || []).join(" / ");
      const labels: string[] = [];
      labels.push(`<span class="text-xs text-slate-500">${escapeHtml(p.intent_id)}</span>`);
      if (audience) labels.push(`<span class="text-xs text-slate-500">${escapeHtml(audience)}</span>`);
      if (p.has_asset) labels.push(`<span class="text-xs text-indigo-600">成果物あり</span>`);
      const readOrder = p.page_priority === 1 ? "まず読む" : "次に読む";
      labels.push(`<span class="text-xs text-slate-500">${readOrder}</span>`);
      const labelHtml = labels.length ? `<div class="flex flex-wrap gap-2 mt-1">${labels.join("")}</div>` : "";
      const summaryHtml = p.summary ? `<p class="text-sm text-slate-600 mt-1">${escapeHtml(p.summary)}</p>` : "";
      return `        <li class="pseo-hub-item border-b border-slate-100 last:border-0" data-intent="${escapeHtml(p.intent_id)}" data-audience="${escapeHtml(audience)}" data-page-index="${sections.slice(0, idx).reduce((acc, _, i) => acc + (bySection.get(sectionOrder[i])?.length ?? 0), 0) + itemIdx}"><a href="${escapeHtml(p.url)}" class="block py-3 px-1 text-slate-700 hover:text-indigo-600 hover:bg-slate-50 rounded transition font-medium">${escapeHtml(p.title)}</a>${summaryHtml}${labelHtml}</li>`;
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
    .map((s, idx) => `<a href="#sec-${idx}" class="text-sm text-indigo-600 hover:underline">${escapeHtml(s)}</a>`)
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

  const pillarHtml =
    pillarBlocks.length > 0
      ? `
    <section class="mb-8 p-4 bg-slate-50 rounded-lg border border-slate-200" aria-label="まず読むべき">
      <h2 class="text-lg font-semibold text-slate-800 mb-3">まず読むべき</h2>
      <div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        ${pillarBlocks.join("\n        ")}
      </div>
    </section>`
      : "";

  const headerHtml = renderHeaderStatic("ja", "main_lp", BASE_URL);
  const footerHtml = renderFooter("ja", BASE_URL, { showPracticeGuide: true });

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
  writeFileSync(OUT_PATH, html, "utf-8");
  console.log(`Wrote ${OUT_PATH} (${mecePages.length} indexable, ${pillars.length} pillars, ${sections.length} sections)`);

  // 管理者用: 全件（noindex 含む）の _all ページを生成
  const allSectionOrder = [...CLUSTER_ORDER, "その他"];
  const allBySection = new Map<string, SsotPage[]>();
  for (const p of allPages) {
    const section = CLUSTER_TO_SECTION[p.cluster_id] ?? "その他";
    if (!allBySection.has(section)) allBySection.set(section, []);
    allBySection.get(section)!.push(p);
  }
  for (const arr of allBySection.values()) {
    arr.sort((a, b) => {
      if (a.page_priority !== b.page_priority) return a.page_priority - b.page_priority;
      return a.title.localeCompare(b.title, "ja");
    });
  }
  const allSections = allSectionOrder.filter((s) => allBySection.has(s));
  const allSectionBlocks = allSections.map((sectionName, idx) => {
    const items = allBySection.get(sectionName) || [];
    const lis = items.map((p) => {
      const audience = (p.audience_tags || []).join(" / ");
      const indexLabel = p.robots === "index,follow" ? "index" : "noindex";
      return `        <li class="border-b border-slate-100 last:border-0"><a href="${escapeHtml(p.url)}" class="block py-2 px-1 text-slate-700 hover:text-indigo-600">${escapeHtml(p.title)}</a><div class="flex gap-2 text-xs text-slate-500"><span>${escapeHtml(p.intent_id)}</span><span>${escapeHtml(audience)}</span><span>${indexLabel}</span></div></li>`;
    });
    return `      <section class="mb-8"><h2 class="text-lg font-semibold text-slate-800 mb-2">${escapeHtml(sectionName)}</h2><ul class="divide-y divide-slate-100">${lis.join("\n")}</ul></section>`;
  });

  const allHtml = `<!doctype html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="robots" content="noindex,follow" />
  <title>監査・証跡（実務）全件一覧（管理者用） | AIMOaaS™</title>
  <link rel="canonical" href="${BASE_URL}/ja/resources/pseo/_all/" />
</head>
<body class="bg-slate-50 text-slate-900 p-8 font-sans">
  <h1 class="text-xl font-bold mb-4">監査・証跡（実務）全件一覧（管理者用）</h1>
  <p class="text-sm text-slate-600 mb-6">index / noindex を問わず全ページ。公開一覧は <a href="${BASE_URL}/ja/resources/pseo/" class="text-indigo-600 underline">/ja/resources/pseo/</a>。</p>
${allSectionBlocks.join("\n")}
</body>
</html>
`;

  mkdirSync(dirname(OUT_ALL_PATH), { recursive: true });
  writeFileSync(OUT_ALL_PATH, allHtml, "utf-8");
  console.log(`Wrote ${OUT_ALL_PATH} (${allPages.length} pages, admin only)`);
}

main();

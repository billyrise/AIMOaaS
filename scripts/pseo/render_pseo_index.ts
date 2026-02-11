/**
 * PSEO ディレクトリトップ（/ja/resources/pseo/index.html）を生成する。
 * pseo_pages.json を読み、トピック別にグループ化して一覧ページを出力。
 * 専門家向け・実務的なデザインで、既存 PSEO 記事と違和感の少ない UI。
 */

import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { renderHeaderStatic, renderFooter } from "./layout.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..", "..");
const DATA_PSEO = join(ROOT, "data", "pseo");
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
  const pages = data.pages || [];

  const bySection = new Map<string, PseoPage[]>();
  for (const p of pages) {
    const section = sectionForPage(p);
    if (!bySection.has(section)) bySection.set(section, []);
    bySection.get(section)!.push(p);
  }

  for (const arr of bySection.values()) {
    arr.sort((a, b) => a.title.localeCompare(b.title, "ja"));
  }

  const sections = SECTION_ORDER.filter((s) => bySection.has(s));
  const sectionBlocks = sections.map((sectionName, idx) => {
    const secId = `sec-${idx}`;
    const items = bySection.get(sectionName) || [];
    const lis = items
      .map(
        (p) =>
          `        <li class="border-b border-slate-100 last:border-0"><a href="${BASE_URL}${p.final_url}" class="block py-3 px-1 text-slate-700 hover:text-indigo-600 hover:bg-slate-50 rounded transition">${escapeHtml(p.title)}</a></li>`
      )
      .join("\n");
    return `      <section class="mb-10" aria-labelledby="${secId}">
        <h2 id="${secId}" class="text-lg font-semibold text-slate-800 mb-3 pb-2 border-b border-slate-200">${escapeHtml(sectionName)}</h2>
        <ul class="divide-y divide-slate-100">
${lis}
        </ul>
      </section>`;
  });

  const navLinks = sections
    .map(
      (s, idx) =>
        `<a href="#sec-${idx}" class="text-sm text-indigo-600 hover:underline">${escapeHtml(s)}</a>`
    )
    .join(' <span class="text-slate-300" aria-hidden="true">|</span> ');

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

    <main class="space-y-2">
${sectionBlocks.join("\n\n")}
    </main>

    ${footerHtml}
  </div>
  <script src="https://unpkg.com/lucide@latest"></script>
  <script>try { lucide.createIcons(); } catch (e) {}</script>
</body>
</html>
`;

  mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, html, "utf8");
  console.log(`Wrote ${OUT_PATH} (${pages.length} pages, ${sections.length} sections)`);
}

main();

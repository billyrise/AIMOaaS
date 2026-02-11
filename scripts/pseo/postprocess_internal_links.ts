/**
 * PSEO の「次に読む」セクションを実在 URL のみに差し替える。
 * 原因: generate が Gemini の internal_links をそのまま出力しており、
 * /ja/resources/ai-governance/ 等の存在しないパスが含まれるため 404 が発生。
 * 再発防止: generate では link_map または実在チェック済みリストのみを使用すること。
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from "fs";
import { join, resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..", "..");
const PSEO_ROOT = join(ROOT, "ja", "resources", "pseo");
const BASE = "https://aimoaas.com";

/** 実在する /ja/resources/ パス（PSEO 除く）。git ls-files または静的リスト。 */
const VALID_NON_PSEO = [
  { text: "AIMO Standard", href: "/ja/aimo-standard/" },
  { text: "お問い合わせ", href: "/ja/#contact" },
  { text: "AIMOaaS トップ", href: "/ja/" },
  { text: "シャドーAIのリスクと対策", href: "/ja/resources/shadow-ai/" },
  { text: "Human-in-the-Loop", href: "/ja/resources/human-in-the-loop/" },
  { text: "AIMOaaS 用語集", href: "/ja/resources/glossary/" },
  { text: "AIガバナンスガイド", href: "/ja/resources/ai-governance-guide/" },
  { text: "EU AI Act", href: "/ja/resources/eu-ai-act/" },
  { text: "ガバナンス as Code", href: "/ja/resources/governance-as-code/" },
  { text: "成熟度チェックリスト", href: "/ja/resources/maturity-checklist/" },
  { text: "シャドーAIガバナンス", href: "/ja/resources/shadow-ai-governance-guide/" },
  { text: "ケーススタディ", href: "/ja/resources/case-studies/" },
];

/** 差し込む PSEO リンク（final_slug が実在するものから）。 */
const PSEO_LINKS = [
  { text: "証跡の最小要件", href: "/ja/resources/pseo/proof-assurance-boundary-controls-minimum-evidence-requirements/" },
  { text: "Evidence Bundle 構造", href: "/ja/resources/pseo/proof-assurance-boundary-ai-audit-evidence-bundle-structure/" },
  { text: "Proof と Assurance", href: "/ja/resources/pseo/proof-assurance-boundary-responsibility-boundary-ai-proof-vs-assurance/" },
  { text: "棚卸・継続監査", href: "/ja/resources/pseo/ai-audit-monitoring-inventory-inventory-review-cycle/" },
  { text: "申請・審査・例外", href: "/ja/resources/pseo/intake-review-approve-ai-audit-controls-request-review-exception/" },
];

function buildSafeInternalLinksHtml(): string {
  const all = [...VALID_NON_PSEO, ...PSEO_LINKS];
  const sep = ' <span class="text-slate-300" aria-hidden="true">/</span> ';
  const links = all
    .map((l) => `<a href="${BASE}${l.href}" class="text-indigo-600 hover:underline">${escapeHtml(l.text)}</a>`)
    .join(sep);
  return `

      <!-- internal-links: 次に読む（実在URLのみ） -->
      <section class="internal-links mb-10" aria-label="次に読む">
        <h2 class="text-2xl font-bold text-slate-900 mb-4">次に読む</h2>
        <div class="text-slate-700">
          ${links}
        </div>
      </section>`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** 次に読むセクション（コメントまたは h2 から直後の </section> まで）。インデント差に対応。 */
const INTERNAL_LINKS_SECTION_REG = /\s*<!-- internal-links: 次に読む[\s\S]*?<\/section>/;

function main(): void {
  if (!existsSync(PSEO_ROOT)) {
    console.error("PSEO root not found:", PSEO_ROOT);
    process.exit(1);
  }
  const safeBlock = buildSafeInternalLinksHtml();
  const dirs = readdirSync(PSEO_ROOT, { withFileTypes: true }).filter((d) => d.isDirectory());
  let updated = 0;
  for (const d of dirs) {
    const indexPath = join(PSEO_ROOT, d.name, "index.html");
    if (!existsSync(indexPath)) continue;
    let html = readFileSync(indexPath, "utf-8");
    if (!INTERNAL_LINKS_SECTION_REG.test(html)) continue;
    const newHtml = html.replace(INTERNAL_LINKS_SECTION_REG, safeBlock);
    if (newHtml !== html) {
      writeFileSync(indexPath, newHtml, "utf-8");
      updated++;
    }
  }
  console.log(`postprocess_internal_links: ${dirs.length} dirs, ${updated} updated`);
}

main();

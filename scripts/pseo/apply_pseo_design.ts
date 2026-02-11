/**
 * 既存 PSEO HTML をデザインガイドラインに沿って一括更新する。
 * - 固定ヘッダーあり: ヘッダーを新 partial に差し替え、landing.css 追加、body text-slate-800、Lucide を local defer に。
 * - 旧レイアウト（パンくずのみ）: ヘッダー・フッター注入、main.css+landing.css、pt-24、body text-slate-800、Lucide local defer。
 * パフォーマンス計画に従い CDN は使わず main.css / landing.css / lucide.min.js を参照する。
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from "fs";
import { join, resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { renderHeaderPseo, renderFooter } from "./layout.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..", "..");
const PSEO_ARTICLES_DIR = join(ROOT, "ja", "resources", "pseo");
const BASE_URL = process.env.BASE_URL || "https://aimoaas.com";

const LUCIDE_SCRIPT =
  '\n  <script src="/assets/js/lucide.min.js" defer></script>\n  <script>try { lucide.createIcons(); } catch (e) {}</script>\n</body>';

/** 新レイアウト用: 固定ヘッダー〜モバイルメニュー直後の </script> までを一括置換 */
const HEADER_BLOCK_REGEX =
  /\s*<!-- 共通ヘッダー[\s\S]*?<header class="fixed w-full z-50[\s\S]*?<\/header>\s*<div id="mobile-menu"[\s\S]*?<\/div>\s*<script>[\s\S]*?<\/script>/;

/** 旧レイアウト用: body 開始〜<main> の直前まで（パンくずのみのヘッダー） */
const OLD_BODY_START_REGEX =
  /<body class="bg-slate-50 text-slate-900 antialiased">\s*<div class="max-w-4xl mx-auto px-4 py-8">\s*<header class="mb-6 text-sm">[\s\S]*?<\/header>\s*<main>/;

const NEW_BODY_START = (headerHtml: string) =>
  `<body class="bg-slate-50 text-slate-800 antialiased">\n  ${headerHtml.replace(/\n/g, "\n  ")}\n  <div class="max-w-4xl mx-auto px-4 pt-24 pb-8">\n    <nav class="mb-6 text-sm text-slate-500" aria-label="パンくず">\n      <a href="${BASE_URL}/ja/" class="text-indigo-600 hover:underline">AIMOaaS™</a>\n      <span class="text-slate-400 mx-1">/</span>\n      <a href="${BASE_URL}/ja/resources/pseo/" class="text-indigo-600 hover:underline">監査・証跡（実務）</a>\n    </nav>\n\n    <main>`;

/** 旧レイアウト用: </main> 〜 ライトフッター 〜 JSON-LD 直前 */
const OLD_FOOTER_REGEX =
  /<\/main>\s*<footer class="mt-12 pt-6 border-t border-slate-200[\s\S]*?<\/footer>\s*<\/div>\s*(\n\s*<!-- JSON-LD)/s;

const MAIN_CSS_LINKS = [
  '<link rel="preload" href="/assets/css/main.css" as="style" />',
  '<link rel="stylesheet" href="/assets/css/main.css" />',
].join("\n  ");

const LANDING_CSS_LINKS = [
  '<link rel="preload" href="/assets/css/landing.css" as="style" />',
  '<link rel="stylesheet" href="/assets/css/landing.css" />',
].join("\n  ");

function hasFixedHeader(html: string): boolean {
  return /fixed w-full z-50/.test(html.slice(0, 4000));
}

function hasOldLayout(html: string): boolean {
  return /<header class="mb-6 text-sm">/.test(html) && /py-8/.test(html) && !hasFixedHeader(html);
}

function patchHeadForOldLayout(html: string): string {
  let out = html;
  // Tailwind CDN を main.css + landing.css に置換
  if (out.includes("cdn.tailwindcss.com")) {
    out = out.replace(
      /<script src="https:\/\/cdn\.tailwindcss\.com"><\/script>\s*/,
      ""
    );
  }
  // main.css が無ければ head 末尾に main + landing を追加
  if (!out.includes("/assets/css/main.css")) {
    out = out.replace(
      /(<\/head>)/,
      `  ${MAIN_CSS_LINKS}\n  ${LANDING_CSS_LINKS}\n  $1`
    );
  } else if (!out.includes("/assets/css/landing.css")) {
    out = out.replace(
      /(<link rel="stylesheet" href="\/assets\/css\/main\.css" \/>)/,
      `$1\n  ${LANDING_CSS_LINKS}`
    );
  }
  return out;
}

function patchBodyClass(html: string): string {
  return html.replace(
    /<body class="bg-slate-50 text-slate-900 antialiased">/,
    '<body class="bg-slate-50 text-slate-800 antialiased">'
  );
}

function patchLucide(html: string): string {
  let out = html;
  if (out.includes("lucide.createIcons")) {
    out = out.replace(
      /\s*<script src="[^"]*lucide[^"]*"><\/script>\s*<script>try \{ lucide\.createIcons\(\); \} catch \(e\) \{\}<\/script>\s*<\/body>/s,
      LUCIDE_SCRIPT
    );
  }
  if (!out.includes("lucide.createIcons")) {
    out = out.replace("</body>", LUCIDE_SCRIPT);
  }
  return out;
}

function main(): void {
  const headerHtml = renderHeaderPseo("ja", BASE_URL);
  const footerHtml = renderFooter("ja", BASE_URL, { showPracticeGuide: true });
  const newFooterBlock = `</main>\n\n    ${footerHtml.replace(/\n/g, "\n    ")}\n  </div>\n\n  $1`;

  const dirs = readdirSync(PSEO_ARTICLES_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  let updatedNew = 0;
  let updatedOld = 0;
  let skipped = 0;

  for (const dir of dirs) {
    const indexPath = join(PSEO_ARTICLES_DIR, dir, "index.html");
    if (!existsSync(indexPath)) continue;
    let html = readFileSync(indexPath, "utf8");

    if (hasFixedHeader(html)) {
      // 新レイアウト: ヘッダーブロック差し替え
      if (!HEADER_BLOCK_REGEX.test(html)) {
        skipped++;
        continue;
      }
      html = html.replace(HEADER_BLOCK_REGEX, "\n  " + headerHtml.replace(/\n/g, "\n  "));
      if (!html.includes("/assets/css/landing.css")) {
        html = html.replace(
          /(<link rel="stylesheet" href="\/assets\/css\/main\.css" \/>)/,
          `$1\n  ${LANDING_CSS_LINKS}`
        );
      }
      html = patchBodyClass(html);
      html = patchLucide(html);
      writeFileSync(indexPath, html, "utf8");
      updatedNew++;
    } else if (hasOldLayout(html)) {
      // 旧レイアウト: ヘッダー・フッター注入 + head パッチ
      if (!OLD_BODY_START_REGEX.test(html) || !OLD_FOOTER_REGEX.test(html)) {
        skipped++;
        continue;
      }
      html = html.replace(OLD_BODY_START_REGEX, NEW_BODY_START(headerHtml));
      html = html.replace(OLD_FOOTER_REGEX, newFooterBlock);
      html = patchHeadForOldLayout(html);
      html = patchLucide(html);
      writeFileSync(indexPath, html, "utf8");
      updatedOld++;
    } else {
      skipped++;
    }
  }

  // 一覧ページ ja/resources/pseo/index.html
  const indexPath = join(PSEO_ARTICLES_DIR, "index.html");
  if (existsSync(indexPath)) {
    let html = readFileSync(indexPath, "utf8");
    if (hasFixedHeader(html) && HEADER_BLOCK_REGEX.test(html)) {
      html = html.replace(HEADER_BLOCK_REGEX, "\n  " + headerHtml.replace(/\n/g, "\n  "));
      if (!html.includes("/assets/css/landing.css")) {
        html = html.replace(
          /(<link rel="stylesheet" href="\/assets\/css\/main\.css" \/>)/,
          `$1\n  ${LANDING_CSS_LINKS}`
        );
      }
      html = patchBodyClass(html);
      html = patchLucide(html);
      writeFileSync(indexPath, html, "utf8");
      updatedNew++;
    }
  }

  console.log(
    `PSEO design applied: ${updatedNew} with fixed header updated, ${updatedOld} old layout migrated, ${skipped} skipped.`
  );
}

main();

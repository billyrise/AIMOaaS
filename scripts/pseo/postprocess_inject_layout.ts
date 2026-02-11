// Inject shared header/footer into existing PSEO article HTML (ja/resources/pseo/*/index.html)
import { readFileSync, writeFileSync, readdirSync, existsSync } from "fs";
import { join, resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { renderHeaderPseo, renderFooter } from "./layout.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..", "..");
const PSEO_ARTICLES_DIR = join(ROOT, "ja", "resources", "pseo");
const BASE_URL = process.env.BASE_URL || "https://aimoaas.com";

const OLD_BODY_START =
  /<body class="bg-slate-50 text-slate-900 antialiased">\s*<div class="max-w-4xl mx-auto px-4 py-8">\s*<header class="mb-6 text-sm">\s*<a href="[^"]*" class="text-indigo-600 hover:underline">AIMOaaS™<\/a>\s*<span class="text-slate-400 mx-1">\/<\/span>\s*<a href="[^"]*" class="text-indigo-600 hover:underline">監査・証跡（実務）<\/a>\s*<\/header>\s*<main>/s;

const NEW_BODY_START = (headerHtml: string) =>
  `<body class="bg-slate-50 text-slate-900 antialiased">\n  ${headerHtml.replace(/\n/g, "\n  ")}\n  <div class="max-w-4xl mx-auto px-4 pt-24 pb-8">\n    <nav class="mb-6 text-sm text-slate-500" aria-label="パンくず">\n      <a href="${BASE_URL}/ja/" class="text-indigo-600 hover:underline">AIMOaaS™</a>\n      <span class="text-slate-400 mx-1">/</span>\n      <a href="${BASE_URL}/ja/resources/pseo/" class="text-indigo-600 hover:underline">監査・証跡（実務）</a>\n    </nav>\n\n    <main>`;

const OLD_FOOTER_END =
  /<\/main>\s*<footer class="mt-12 pt-6 border-t border-slate-200 text-sm text-slate-500">[\s\S]*?<\/footer>\s*<\/div>\s*(\n\s*<!-- JSON-LD)/s;

function main(): void {
  const headerHtml = renderHeaderPseo("ja", BASE_URL);
  const footerHtml = renderFooter("ja", BASE_URL, { showPracticeGuide: true });
  const newStart = NEW_BODY_START(headerHtml);
  const newFooterBlock = `</main>\n\n    ${footerHtml.replace(/\n/g, "\n    ")}\n  </div>\n\n  $1`;
  const lucideScript =
    '\n  <script src="https://unpkg.com/lucide@latest"></script>\n  <script>try { lucide.createIcons(); } catch (e) {}</script>\n</body>';

  const dirs = readdirSync(PSEO_ARTICLES_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  let updated = 0;
  let skipped = 0;
  for (const dir of dirs) {
    const indexPath = join(PSEO_ARTICLES_DIR, dir, "index.html");
    if (!existsSync(indexPath)) continue;
    const html = readFileSync(indexPath, "utf8");

    if (!OLD_BODY_START.test(html)) {
      skipped++;
      continue;
    }

    let out = html
      .replace(OLD_BODY_START, newStart)
      .replace(OLD_FOOTER_END, newFooterBlock);

    if (!out.includes("lucide.createIcons")) {
      out = out.replace("</body>", lucideScript);
    }

    writeFileSync(indexPath, out, "utf8");
    updated++;
  }

  console.log(`Updated ${updated} PSEO article(s), skipped ${skipped} (already have new layout or no match).`);
}

main();

#!/usr/bin/env node
/**
 * Tailwind CDN + インライン style を main.css + landing.css + 1行 style に置換する。
 * フォントは元の link のまま（Noto Sans JP / Inter 等）を維持。
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");

// 置換後の共通先頭（preload + main + landing + preconnect、font link と style は後で挿入）
const HEAD_PREFIX = `        <link rel="preload" href="/assets/css/main.css" as="style" />
        <link rel="stylesheet" href="/assets/css/main.css" />
        <link rel="preload" href="/assets/css/landing.css" as="style" />
        <link rel="stylesheet" href="/assets/css/landing.css" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
`;

function patchFile(filePath) {
  let s = fs.readFileSync(filePath, "utf8");
  if (!s.includes("cdn.tailwindcss.com")) return false;

  // 既に main.css を参照している場合はスキップ
  if (s.includes('href="/assets/css/main.css"')) return false;

  // パターン: preconnect (3つ) + script tailwind + (optional comment) + link font + style... </style>
  const preconnectBlock = /<link rel="preconnect" href="https:\/\/fonts\.googleapis\.com"[^>]*>\s*<link rel="preconnect" href="https:\/\/fonts\.gstatic\.com" crossorigin[^>]*>\s*<link rel="preconnect" href="https:\/\/cdn\.tailwindcss\.com"[^>]*>\s*(\s*<!--[^>]*-->)?\s*<script src="https:\/\/cdn\.tailwindcss\.com"><\/script>\s*(\s*<!--[^>]*-->)?\s*<link[^>]*href="https:\/\/fonts\.googleapis\.com[^"]*"[^>]*>\s*<style>[\s\S]*?<\/style>/;
  const m = s.match(preconnectBlock);
  if (!m) return false;

  const fullMatch = m[0];
  const fontLinkMatch = fullMatch.match(/<link[^>]*href="(https:\/\/fonts\.googleapis\.com[^"]*)"[^>]*>/);
  const fontHref = fontLinkMatch ? fontLinkMatch[1] : "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap";
  const isNoto = fontHref.includes("Noto+Sans+JP");
  const bodyFont = isNoto
    ? 'body{font-family:"Noto Sans JP",sans-serif}'
    : 'body{font-family:"Inter",system-ui,sans-serif}';

  const indent = fullMatch.match(/^(\s*)/)?.[1] ?? "        ";
  const newBlock =
    HEAD_PREFIX +
    indent +
    `<link href="${fontHref}" rel="stylesheet" />\n` +
    indent +
    `<style>${bodyFont}</style>`;

  s = s.replace(preconnectBlock, newBlock);
  fs.writeFileSync(filePath, s);
  return true;
}

const dirs = [
  path.join(ROOT, "de"),
  path.join(ROOT, "es"),
  path.join(ROOT, "fr"),
  path.join(ROOT, "it"),
  path.join(ROOT, "ko"),
  path.join(ROOT, "pt"),
  path.join(ROOT, "zh-CN"),
  path.join(ROOT, "zh-TW"),
  path.join(ROOT, "ja", "audit-firms"),
  path.join(ROOT, "audit-firms"),
  path.join(ROOT, "partners"),
  path.join(ROOT, "ja", "partners"),
  path.join(ROOT, "ja", "aimo-standard"),
  path.join(ROOT, "aimo-standard"),
  path.join(ROOT, "de", "aimo-standard"),
  path.join(ROOT, "es", "aimo-standard"),
  path.join(ROOT, "fr", "aimo-standard"),
  path.join(ROOT, "it", "aimo-standard"),
  path.join(ROOT, "ko", "aimo-standard"),
  path.join(ROOT, "pt", "aimo-standard"),
  path.join(ROOT, "zh-CN", "aimo-standard"),
  path.join(ROOT, "zh-TW", "aimo-standard"),
  path.join(ROOT, "resources"),
  path.join(ROOT, "ja", "resources"),
];

let count = 0;
for (const dir of dirs) {
  if (!fs.existsSync(dir)) continue;
  const indexHtml = path.join(dir, "index.html");
  if (fs.existsSync(indexHtml) && patchFile(indexHtml)) count++;
  // resources 配下は index.html が各サブディレクトリにある
  if (dir.endsWith("resources")) {
    const subs = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of subs) {
      if (!e.isDirectory()) continue;
      const subIndex = path.join(dir, e.name, "index.html");
      if (fs.existsSync(subIndex) && patchFile(subIndex)) count++;
    }
  }
}
console.log("Patched", count, "landing/resource files.");
process.exit(0);

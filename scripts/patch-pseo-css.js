#!/usr/bin/env node
/**
 * PSEO 全ページの head を CDN Tailwind + インライン style から
 * preload + main.css + フォント + 1行 style に置換する。
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const PSEO_OLD = `  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&display=swap" rel="stylesheet" />
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { font-family: 'Noto Sans JP', sans-serif; }
    /* PSEO 本文: 表の可読性・行間・見出し余白（Tailwind Typography に依存しない最小CSS） */
    .pseo-prose table { width: 100%; border-collapse: collapse; }
    .pseo-prose th, .pseo-prose td { border: 1px solid #e2e8f0; padding: 8px; vertical-align: top; }
    .pseo-prose thead th { background: #f8fafc; }
    .pseo-prose .table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; margin: 1rem 0; }
    .pseo-prose h2 { margin-top: 2rem; margin-bottom: 0.75rem; }
    .pseo-prose p, .pseo-prose li { line-height: 1.8; }
    .pseo-prose code, .pseo-prose pre { overflow-wrap: break-word; }
    .pseo-prose pre { overflow-x: auto; }
  </style>`;

const PSEO_NEW = `  <link rel="preload" href="/assets/css/main.css" as="style" />
  <link rel="stylesheet" href="/assets/css/main.css" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&display=swap" rel="stylesheet" />
  <style>body{font-family:'Noto Sans JP',sans-serif}</style>`;

function walk(dir, list = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, list);
    else if (e.name === "index.html" && dir.includes("resources" + path.sep + "pseo")) list.push(full);
  }
  return list;
}

const pseoDir = path.join(ROOT, "ja", "resources", "pseo");
if (!fs.existsSync(pseoDir)) {
  console.log("No ja/resources/pseo, skip.");
  process.exit(0);
}
const files = walk(pseoDir);
let n = 0;
for (const f of files) {
  let s = fs.readFileSync(f, "utf8");
  if (!s.includes("cdn.tailwindcss.com")) continue;
  if (!s.includes(PSEO_OLD)) {
    console.warn("Pattern not found:", f);
    continue;
  }
  s = s.replace(PSEO_OLD, PSEO_NEW);
  fs.writeFileSync(f, s);
  n++;
}
console.log("Patched", n, "PSEO files.");
process.exit(0);

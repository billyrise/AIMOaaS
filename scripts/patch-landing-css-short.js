#!/usr/bin/env node
/**
 * preconnect が1つだけのページ用: Tailwind CDN + style を main.css + landing.css に置換。
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");

// パターン: preconnect tailwind のみ + script + link font + style任意
const PAT = /<link rel="preconnect" href="https:\/\/cdn\.tailwindcss\.com" \/>\s*<script src="https:\/\/cdn\.tailwindcss\.com"><\/script>\s*<link href="(https:\/\/fonts\.googleapis\.com[^"]*)"[^>]*\/>\s*<style>[\s\S]*?<\/style>/;

const FILES = [
  "resources/shadow-ai/index.html",
  "resources/aimo-analysis-engine/index.html",
  "resources/glossary/index.html",
  "resources/eu-ai-act/index.html",
  "resources/governance-as-code/index.html",
  "resources/human-in-the-loop/index.html",
  "resources/shadow-ai-governance-guide/index.html",
  "resources/maturity-checklist/index.html",
  "resources/case-studies/index.html",
  "ja/resources/ai-governance-guide/index.html",
  "ja/resources/shadow-ai/index.html",
  "ja/resources/aimo-analysis-engine/index.html",
  "ja/resources/glossary/index.html",
  "ja/resources/eu-ai-act/index.html",
  "ja/resources/governance-as-code/index.html",
  "ja/resources/human-in-the-loop/index.html",
  "ja/resources/shadow-ai-governance-guide/index.html",
  "ja/resources/maturity-checklist/index.html",
  "ja/resources/case-studies/index.html",
  "ja/partners/audit-firms/index.html",
];

let n = 0;
for (const rel of FILES) {
  const f = path.join(ROOT, rel);
  if (!fs.existsSync(f)) continue;
  let s = fs.readFileSync(f, "utf8");
  if (!s.includes("cdn.tailwindcss.com")) continue;
  const m = s.match(PAT);
  if (!m) {
    console.warn("No match:", rel);
    continue;
  }
  const fontHref = m[1];
  const isNoto = fontHref.includes("Noto+Sans+JP");
  const bodyFont = isNoto ? 'body{font-family:"Noto Sans JP",sans-serif}' : 'body{font-family:"Inter",system-ui,sans-serif}';
  const newBlock =
    `<link rel="preload" href="/assets/css/main.css" as="style" />
        <link rel="stylesheet" href="/assets/css/main.css" />
        <link rel="preload" href="/assets/css/landing.css" as="style" />
        <link rel="stylesheet" href="/assets/css/landing.css" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
        <link href="${fontHref}" rel="stylesheet" />
        <style>${bodyFont}</style>`;
  s = s.replace(PAT, newBlock);
  fs.writeFileSync(f, s);
  n++;
}
console.log("Patched", n, "short-pattern files.");
process.exit(0);

/**
 * Phase 1: pseo_pages.json に従い、旧URL配下の index.html を新URL（final_slug）へ移動し、
 * canonical / og:url を final_url（末尾スラッシュ）に書き換える。旧ディレクトリは削除する。
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "..");
const PSEO_ROOT = path.join(ROOT, "ja", "resources", "pseo");
const PSEO_PAGES_PATH = path.join(ROOT, "data", "pseo", "pseo_pages.json");
const BASE_URL = process.env.BASE_URL || "https://aimoaas.com";

interface PseoPageRecord {
  id: string;
  final_slug: string;
  final_url: string;
  legacy_url: string;
}

function run(): void {
  if (!fs.existsSync(PSEO_PAGES_PATH)) {
    console.error("Run pages:ssot first: npm run pages:ssot");
    process.exit(1);
  }

  const { pages } = JSON.parse(fs.readFileSync(PSEO_PAGES_PATH, "utf-8")) as {
    pages: PseoPageRecord[];
  };

  const fullFinalUrl = (p: PseoPageRecord) => BASE_URL + p.final_url.replace(/\/$/, "") + "/";
  const legacyPathPattern = (p: PseoPageRecord) =>
    new RegExp(
      (BASE_URL + p.legacy_url.replace(/\/$/, "")).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      "g"
    );

  for (const p of pages) {
    const oldDir = path.join(PSEO_ROOT, p.id);
    const newDir = path.join(PSEO_ROOT, p.final_slug);
    const oldIndex = path.join(oldDir, "index.html");

    if (!fs.existsSync(oldIndex)) {
      console.warn("Skip (no index):", p.id);
      continue;
    }
    if (oldDir === newDir) {
      console.warn("Skip (same path):", p.id);
      continue;
    }

    let html = fs.readFileSync(oldIndex, "utf-8");
    const fullUrl = fullFinalUrl(p);
    const legacyNoSlash = BASE_URL + p.legacy_url.replace(/\/$/, "");
    html = html.replace(new RegExp(legacyNoSlash.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"), fullUrl);
    html = html.replace(
      new RegExp(legacyNoSlash + "/".replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"),
      fullUrl
    );

    if (!fs.existsSync(newDir)) fs.mkdirSync(newDir, { recursive: true });
    fs.writeFileSync(path.join(newDir, "index.html"), html, "utf-8");
    fs.rmSync(oldDir, { recursive: true });
    console.log(`${p.id} -> ${p.final_slug}`);
  }

  console.log("Migration done.");
}

run();

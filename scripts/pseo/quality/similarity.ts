/**
 * Phase 2: ボイラープレート除外後の content_similarity を計測し、
 * raw_similarity とともに similarity_report.json を出力する。
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";
import yaml from "js-yaml";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..", "..", "..");
const DATA_PSEO = join(ROOT, "data", "pseo");
const REPORT_DIR = join(ROOT, "data", "pseo", "artifacts", "report");
const PSEO_ROOT = join(ROOT, "ja", "resources", "pseo");

interface CatalogPage {
  id: string;
  lang: string;
  slug: string;
}
interface Catalog {
  pages: CatalogPage[];
}

function loadCatalog(): Catalog {
  const raw = readFileSync(join(DATA_PSEO, "catalog.yaml"), "utf8");
  return yaml.load(raw) as Catalog;
}

function loadPseoPagesMap(): Map<string, { final_slug: string }> {
  const fp = join(DATA_PSEO, "pseo_pages.json");
  if (!existsSync(fp)) return new Map();
  const { pages } = JSON.parse(readFileSync(fp, "utf-8")) as { pages: Array<{ id: string; final_slug: string }> };
  const m = new Map<string, { final_slug: string }>();
  for (const p of pages) m.set(p.id, { final_slug: p.final_slug });
  return m;
}

function getFilePath(page: CatalogPage, pseoMap: Map<string, { final_slug: string }>): string {
  const segment = page.slug.replace(/^\//, "").replace(/\/$/, "").split("/").pop() ?? page.id;
  const record = pseoMap.get(segment);
  if (record) return join(ROOT, "ja", "resources", "pseo", record.final_slug, "index.html");
  return join(ROOT, page.slug.replace(/^\//, ""), "index.html");
}

/** テンプレ共通のボイラープレートを除去した本文テキストを返す */
function stripBoilerplate(html: string): string {
  let h = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<meta[^>]*>/gi, " ")
    .replace(/<link[^>]*>/gi, " ");
  // ヘッダー（〜above-the-fold の CTA まで）
  h = h.replace(/<header[\s\S]*?<\/header>/gi, " ");
  h = h.replace(/<section[^>]*class="[^"]*above-the-fold[^"]*"[\s\S]*?<section[^>]*class="[^"]*pseo-cta[^"]*"[\s\S]*?<\/section>[\s\S]*?<\/section>/gi, " ");
  // pseo-cta 単体
  h = h.replace(/<section[^>]*class="[^"]*pseo-cta[^"]*"[\s\S]*?<\/section>/gi, " ");
  // trust-block
  h = h.replace(/<section[^>]*class="[^"]*pseo-trust-block[^"]*"[\s\S]*?<\/section>/gi, " ");
  h = h.replace(/<[^>]*class="[^"]*trust-block[^"]*"[^>]*>[\s\S]*?<\/div>\s*<\/section>/gi, " ");
  // 次に読む・internal-links
  h = h.replace(/次に読む[\s\S]*?<section[\s\S]*?internal-links[\s\S]*?<\/section>/gi, " ");
  h = h.replace(/<section[^>]*internal-links[^>]*>[\s\S]*?<\/section>/gi, " ");
  // References セクション（共通化されがち）
  h = h.replace(/<h2[^>]*>参考文献|References[\s\S]*?<\/section>/gi, " ");
  h = h.replace(/<[^>]+>/g, " ");
  return h.replace(/\s+/g, " ").trim();
}

function getRawBodyText(html: string): string {
  const m = html.match(/<section[^>]*class="[^"]*pseo-main[^"]*"[\s\S]*?<div[^>]*prose[\s\S]*?>([\s\S]*?)<\/div>\s*<\/section>/i);
  const body = m ? m[1] : html;
  return body.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function shingle(str: string, k: number): Set<string> {
  const n = str.replace(/\s+/g, " ").trim();
  const set = new Set<string>();
  for (let i = 0; i <= n.length - k; i++) set.add(n.slice(i, i + k));
  return set;
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter) || 0;
}

export interface SimilarityPair {
  id_a: string;
  id_b: string;
  raw_similarity: number;
  content_similarity: number;
}

export interface SimilarityReport {
  generated_at: string;
  by_page: Record<
    string,
    {
      raw_max: number;
      raw_with?: string;
      content_max: number;
      content_with?: string;
    }
  >;
  pairs_over_threshold: SimilarityPair[];
  /** 同一（content_similarity >= 0.99）のクラスタ */
  same_content_clusters: string[][];
}

const CONTENT_SIMILARITY_THRESHOLD = 0.99;
const PAIR_REPORT_THRESHOLD = 0.85;

function main(): void {
  const catalog = loadCatalog();
  const pseoMap = loadPseoPagesMap();
  const jaPages = catalog.pages.filter((p) => p.lang === "ja");

  const rawTexts = new Map<string, string>();
  const contentTexts = new Map<string, string>();

  for (const page of jaPages) {
    const fp = getFilePath(page, pseoMap);
    if (!existsSync(fp)) continue;
    const html = readFileSync(fp, "utf8");
    const segment = page.slug.replace(/^\//, "").replace(/\/$/, "").split("/").pop() ?? page.id;
    rawTexts.set(segment, getRawBodyText(html));
    contentTexts.set(segment, stripBoilerplate(html));
  }

  const ids = [...contentTexts.keys()];
  const byPage: SimilarityReport["by_page"] = {};
  const pairsOverThreshold: SimilarityPair[] = [];
  const sameClusters = new Map<string, Set<string>>();

  for (const idA of ids) {
    let rawMax = 0;
    let rawWith = "";
    let contentMax = 0;
    let contentWith = "";
    const rawA = rawTexts.get(idA)!;
    const contentA = contentTexts.get(idA)!;
    const rawShingleA = shingle(rawA, 15);
    const contentShingleA = shingle(contentA, 15);

    for (const idB of ids) {
      if (idA === idB) continue;
      const rawB = rawTexts.get(idB)!;
      const contentB = contentTexts.get(idB)!;
      const rawSim = jaccard(rawShingleA, shingle(rawB, 15));
      const contentSim = jaccard(contentShingleA, shingle(contentB, 15));
      if (rawSim > rawMax) {
        rawMax = rawSim;
        rawWith = idB;
      }
      if (contentSim > contentMax) {
        contentMax = contentSim;
        contentWith = idB;
      }
      if (contentSim >= PAIR_REPORT_THRESHOLD || rawSim >= PAIR_REPORT_THRESHOLD) {
        pairsOverThreshold.push({
          id_a: idA,
          id_b: idB,
          raw_similarity: rawSim,
          content_similarity: contentSim,
        });
      }
      if (contentSim >= CONTENT_SIMILARITY_THRESHOLD) {
        const key = [idA, idB].sort().join("|");
        if (!sameClusters.has(key)) sameClusters.set(key, new Set([idA, idB]));
      }
    }

    byPage[idA] = {
      raw_max: rawMax,
      raw_with: rawWith || undefined,
      content_max: contentMax,
      content_with: contentWith || undefined,
    };
  }

  // クラスタを連結（同一グループにまとめる）
  const clusters: string[][] = [];
  const used = new Set<string>();
  for (const [, set] of sameClusters) {
    const arr = [...set];
    if (arr.some((id) => used.has(id))) continue;
    arr.forEach((id) => used.add(id));
    clusters.push(arr);
  }

  const report: SimilarityReport = {
    generated_at: new Date().toISOString(),
    by_page: byPage,
    pairs_over_threshold: pairsOverThreshold.slice(0, 200),
    same_content_clusters: clusters,
  };

  if (!existsSync(REPORT_DIR)) mkdirSync(REPORT_DIR, { recursive: true });
  writeFileSync(join(REPORT_DIR, "similarity_report.json"), JSON.stringify(report, null, 2), "utf8");
  console.log(`Wrote ${join(REPORT_DIR, "similarity_report.json")} (${ids.length} pages, ${clusters.length} same-content clusters)`);
}

main();

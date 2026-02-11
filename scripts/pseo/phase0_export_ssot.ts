/**
 * Phase 0-2: PSEO URL full export (SSOT)
 * From build output ja/resources/pseo/<slug>/index.html and pseo_pages.json
 * url, slug, title, h1, meta_title, meta_description, canonical, robots, lang, ...
 * Output: pseo_url_ssot.json and pseo_url_ssot.csv. No external crawl.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "..");
const PSEO_ROOT = path.join(ROOT, "ja", "resources", "pseo");
const PSEO_PAGES_PATH = path.join(ROOT, "data", "pseo", "pseo_pages.json");
const REPORT_DIR = path.join(ROOT, "data", "pseo", "artifacts", "report");
const BASE_URL = "https://aimoaas.com";

interface PseoPageRecord {
  id: string;
  title?: string;
  topic?: string[];
  slug_base?: string;
  final_slug: string;
  final_url: string;
  legacy_url?: string;
}

export interface SsotRow {
  url: string;
  slug: string;
  title: string;
  h1: string;
  meta_title: string;
  meta_description: string;
  canonical: string;
  robots: string;
  lang: string;
  hreflang_targets: string;
  word_count: number;
  template_id: string;
  cluster_guess: string;
  last_modified: string;
  has_author: boolean;
  has_datePublished: boolean;
  has_dateModified: boolean;
  outbound_citations_count: number;
  has_unique_diagram: boolean;
  has_downloadable_asset: boolean;
  internal_links_out: number;
  internal_links_in: number;
  id: string;
  legacy_url: string;
}

function loadPseoPages(): Map<string, PseoPageRecord> {
  if (!fs.existsSync(PSEO_PAGES_PATH)) return new Map();
  const raw = JSON.parse(fs.readFileSync(PSEO_PAGES_PATH, "utf-8")) as {
    pages: PseoPageRecord[];
  };
  const m = new Map<string, PseoPageRecord>();
  for (const p of raw.pages) m.set(p.final_slug, p);
  return m;
}

function extract(html: string, pattern: RegExp, group = 1): string {
  const m = html.match(pattern);
  return m ? m[group].trim() : "";
}

function extractMetaDescription(html: string): string {
  const m = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i);
  return m ? m[1].trim() : "";
}

function getProseBody(html: string): string {
  const m = html.match(
    /<section[^>]*class="[^"]*pseo-main[^"]*"[\s\S]*?<div[^>]*prose[\s\S]*?>([\s\S]*?)<\/div>\s*<\/section>/i
  );
  const body = m ? m[1] : html;
  return body.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function wordCountJapanese(text: string): number {
  if (!text) return 0;
  const normalized = text.replace(/\s+/g, "");
  let n = 0;
  for (const c of normalized) {
    if (/[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf\uff00-\uffef]/.test(c)) n++;
    else if (/[a-zA-Z0-9]/.test(c)) n++;
  }
  return n;
}

function countInternalPseoLinks(html: string): number {
  const fullUrlRe = /href=["']https?:\/\/[^"']*\/ja\/resources\/pseo\/[^"']+["']/gi;
  const pathRe = /href=["']\/ja\/resources\/pseo\/[^"']+["']/gi;
  const full = html.match(fullUrlRe) || [];
  const path = html.match(pathRe) || [];
  const seen = new Set<string>();
  for (const u of full) seen.add(u.replace(/^href=["']|["']$/g, "").replace(/\/$/, ""));
  for (const u of path) seen.add(u.replace(/^href=["']|["']$/g, "").replace(/\/$/, ""));
  return seen.size;
}

function hasUniqueDiagram(html: string): boolean {
  return /data-unique=["'](?:case-study|checklist|findings-fixes|artifact-block|audit-q|diagram|mermaid)/i.test(html) || /class="[^"]*mermaid/i.test(html);
}

function hasDownloadableAsset(html: string): boolean {
  return /\.(pdf|xlsx?|docx?|csv)(?:\s|"|'|>)/i.test(html) || /download|ダウンロード|雛形|テンプレ/i.test(html);
}

function extractJsonLdFlags(html: string): { hasAuthor: boolean; hasDatePublished: boolean; hasDateModified: boolean } {
  const scripts = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || [];
  let hasAuthor = false;
  let hasDatePublished = false;
  let hasDateModified = false;
  for (const block of scripts) {
    const content = block.replace(/<script[^>]*>|<\/script>/gi, "").trim();
    try {
      const parsed = JSON.parse(content);
      const check = (obj: unknown): void => {
        if (!obj || typeof obj !== "object") return;
        const o = obj as Record<string, unknown>;
        if ("author" in o && o.author) hasAuthor = true;
        if ("datePublished" in o && o.datePublished) hasDatePublished = true;
        if ("dateModified" in o && o.dateModified) hasDateModified = true;
        if (Array.isArray(o["@graph"])) o["@graph"].forEach(check);
      };
      check(parsed);
    } catch {
      // ignore invalid JSON
    }
  }
  return { hasAuthor, hasDatePublished, hasDateModified };
}

function countOutboundCitations(html: string): number {
  const hrefs = html.match(/<a[^>]+href=["'](https?:\/\/[^"']+)["']/gi) || [];
  let count = 0;
  for (const h of hrefs) {
    const m = h.match(/href=["'](https?:\/\/[^"']+)["']/i);
    if (m && !/aimoaas\.com/i.test(m[1])) count++;
  }
  return count;
}

function clusterGuessFromSlug(slug: string, topic?: string[]): string {
  if (slug.includes("evidence-pack") && !slug.includes("proof-assurance")) return "evidence-pack";
  if (slug.includes("proof-assurance") || slug.includes("responsibility-boundary")) return "proof-vs-assurance";
  if (slug.includes("intake") || slug.includes("request-review") || slug.includes("operating-workflow") || slug.includes("raci") || slug.includes("renewal")) return "intake-review-approve";
  if (slug.includes("inventory") || slug.includes("continuous-audit") || slug.includes("review-cycle")) return "inventory-review";
  if (slug.includes("coverage-map") || slug.includes("iso42001") || slug.includes("nist") || slug.includes("eu-ai")) return "coverage-map";
  if (slug.includes("minimum-evidence") || slug.includes("shadow-ai")) return "minimum-evidence";
  if (topic && topic.length > 0) return topic[0];
  return "other";
}

function run(): void {
  if (!fs.existsSync(PSEO_ROOT)) {
    console.error("PSEO root not found:", PSEO_ROOT);
    process.exit(1);
  }

  const bySlug = loadPseoPages();
  const dirs = fs.readdirSync(PSEO_ROOT).filter((d) => {
    const full = path.join(PSEO_ROOT, d);
    return fs.statSync(full).isDirectory() && fs.existsSync(path.join(full, "index.html"));
  });

  const pseoBaseUrl = `${BASE_URL}/ja/resources/pseo/`;
  const allHtml: { slug: string; html: string }[] = [];
  const rows: SsotRow[] = [];

  for (const dir of dirs.sort()) {
    const indexPath = path.join(PSEO_ROOT, dir, "index.html");
    const html = fs.readFileSync(indexPath, "utf-8");
    allHtml.push({ slug: dir, html });
  }

  for (const { slug, html } of allHtml) {
    const record = bySlug.get(slug);
    const url = `${pseoBaseUrl}${slug}/`;
    const title = extract(html, /<title[^>]*>([^<]+)<\/title>/i);
    const metaTitle = title.replace(/\s*\|\s*AIMOaaS.*$/i, "").trim();
    const h1 = extract(html, /<h1[^>]*>([^<]+)<\/h1>/i);
    const metaDescription = extractMetaDescription(html);
    const canonical = extract(html, /<link\s+rel="canonical"\s+href=["']([^"']+)["']/i);
    const robots = extract(html, /<meta\s+name=["']robots["']\s+content=["']([^"']+)["']/i);
    const lang = extract(html, /<html[^>]*\slang=["']([^"']+)["']/i) || "ja";
    const prose = getProseBody(html);
    const wc = wordCountJapanese(prose);
    const jsonLd = extractJsonLdFlags(html);
    const outbound = countOutboundCitations(html);
    const internalOut = countInternalPseoLinks(html);
    const topic = record?.topic;
    const clusterGuess = clusterGuessFromSlug(slug, topic);

    rows.push({
      url,
      slug,
      title: metaTitle || h1 || slug,
      h1: h1 || metaTitle || slug,
      meta_title: metaTitle || title,
      meta_description: metaDescription,
      canonical: canonical || url,
      robots: robots || "noindex,follow",
      lang,
      hreflang_targets: "",
      word_count: wc,
      template_id: "pseo-article",
      cluster_guess: clusterGuess,
      last_modified: "",
      has_author: jsonLd.hasAuthor,
      has_datePublished: jsonLd.hasDatePublished,
      has_dateModified: jsonLd.hasDateModified,
      outbound_citations_count: outbound,
      has_unique_diagram: hasUniqueDiagram(html),
      has_downloadable_asset: hasDownloadableAsset(html),
      internal_links_out: internalOut,
      internal_links_in: 0,
      id: record?.id ?? slug,
      legacy_url: record?.legacy_url ?? "",
    });
  }

  const inboundMap = new Map<string, number>();
  for (const row of rows) {
    const base = row.url.replace(/\/$/, "");
    let count = 0;
    for (const other of allHtml) {
      if (other.slug === row.slug) continue;
      if (other.html.includes(base) || other.html.includes(row.url)) count++;
    }
    inboundMap.set(row.slug, count);
  }
  for (const row of rows) {
    row.internal_links_in = inboundMap.get(row.slug) ?? 0;
  }

  const out = {
    generated_at: new Date().toISOString(),
    source: "filesystem + pseo_pages.json",
    total: rows.length,
    base_url: BASE_URL,
    rows,
  };

  if (!fs.existsSync(REPORT_DIR)) fs.mkdirSync(REPORT_DIR, { recursive: true });

  fs.writeFileSync(
    path.join(REPORT_DIR, "pseo_url_ssot.json"),
    JSON.stringify(out, null, 2),
    "utf-8"
  );

  const header =
    "url,slug,title,h1,meta_title,meta_description,canonical,robots,lang,hreflang_targets,word_count,template_id,cluster_guess,last_modified,has_author,has_datePublished,has_dateModified,outbound_citations_count,has_unique_diagram,has_downloadable_asset,internal_links_out,internal_links_in,id,legacy_url";
  const escapeCsv = (s: string): string => {
    const t = String(s ?? "");
    if (/[,"\n\r]/.test(t)) return `"${t.replace(/"/g, '""')}"`;
    return t;
  };
  const csvRows = [
    header,
    ...rows.map((r) =>
      [
        r.url,
        r.slug,
        r.title,
        r.h1,
        r.meta_title,
        r.meta_description,
        r.canonical,
        r.robots,
        r.lang,
        r.hreflang_targets,
        r.word_count,
        r.template_id,
        r.cluster_guess,
        r.last_modified,
        r.has_author,
        r.has_datePublished,
        r.has_dateModified,
        r.outbound_citations_count,
        r.has_unique_diagram,
        r.has_downloadable_asset,
        r.internal_links_out,
        r.internal_links_in,
        r.id,
        r.legacy_url,
      ].map(escapeCsv).join(",")
    ),
  ];
  fs.writeFileSync(path.join(REPORT_DIR, "pseo_url_ssot.csv"), csvRows.join("\n"), "utf-8");

  console.log(
    `Wrote ${path.join(REPORT_DIR, "pseo_url_ssot.json")} and pseo_url_ssot.csv (${rows.length} pages)`
  );
}

run();

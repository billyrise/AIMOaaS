/**
 * PSEO 品質ゲート。必須ルール（fail）と参考（warn）に分離。
 * fail: H1/H2・canonical・og:url・robots・CTA・禁止主張・redirect・content_similarity 同一。
 * warn: 表/FAQ/リンク数等（数合わせ誘発を避ける）。
 * 出力: generation-report.json, data/pseo/artifacts/report/pseo_quality_report.json
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";
import yaml from "js-yaml";
import type { Catalog, CatalogPage, GenerationReport, ValidationPageResult } from "./types.js";
import { lintClaims } from "./claims_lint.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..", "..");
const DATA_PSEO = join(ROOT, "data", "pseo");
const REDIRECTS_PATH = join(ROOT, "_redirects");

/** content_similarity がこれ以上なら同一扱いで fail */
const CONTENT_SIMILARITY_SAME = 0.99;
/** 参考: 極端に近い場合は warn */
const CONTENT_SIMILARITY_WARN = 0.9;

/** 参考値（warn のみ。fail にしない） */
const MIN_TABLE_ROWS = 10;
const MIN_FAQ = 8;
const MIN_INTERNAL_LINKS = 8;
const MIN_PAGE_TYPES_IN_LINKS = 3;
const MIN_CHECKLIST_ITEMS = 3;
const MIN_TABLE_CELLS = 15;
const MIN_INTENT_KEYWORDS_MATCHED = 2;
const REQUIRED_ARTIFACTS = ["最小要件表", "監査質問集（抜粋）", "RACI（簡易）"];
const MIN_REQUIRED_ARTIFACTS = 2;
const AIMO_STANDARD_URL_PATTERN = /aimo-standard|aimoaas\.com\/ja\/aimo-standard/i;
const CTA_HREF_PATTERN = /aimoaas\.com\/ja\/#contact|#contact|\/ja\/#contact/i;

function loadCatalog(): Catalog {
  const raw = readFileSync(join(DATA_PSEO, "catalog.yaml"), "utf8");
  return yaml.load(raw) as Catalog;
}

/** URL 移行後: pseo_pages.json があれば final_slug / final_url / legacy_url / topic を返す。id と final_slug の両方で引けるようにする。 */
function loadPseoPagesMap(): Map<string, { final_slug: string; final_url: string; legacy_url?: string; topic?: string[] }> {
  const fp = join(DATA_PSEO, "pseo_pages.json");
  if (!existsSync(fp)) return new Map();
  const { pages } = JSON.parse(readFileSync(fp, "utf-8")) as {
    pages: Array<{ id: string; final_slug: string; final_url: string; legacy_url?: string; topic?: string[] }>;
  };
  const m = new Map<string, { final_slug: string; final_url: string; legacy_url?: string; topic?: string[] }>();
  for (const p of pages) {
    const rec = { final_slug: p.final_slug, final_url: p.final_url, legacy_url: p.legacy_url, topic: p.topic };
    m.set(p.id, rec);
    m.set(p.final_slug, rec);
  }
  return m;
}

function getFilePathForPage(
  page: CatalogPage,
  pseoMap: Map<string, { final_slug: string; final_url: string; legacy_url?: string; topic?: string[] }>
): string {
  const segment = page.slug.replace(/^\//, "").replace(/\/$/, "").split("/").pop() ?? page.id;
  const record = pseoMap.get(segment);
  if (record)
    return join(ROOT, "ja", "resources", "pseo", record.final_slug, "index.html");
  return join(ROOT, page.slug.replace(/^\//, ""), "index.html");
}

function getReportUrlForPage(
  page: CatalogPage,
  baseUrl: string,
  pseoMap: Map<string, { final_slug: string; final_url: string; legacy_url?: string; topic?: string[] }>
): string {
  const segment = page.slug.replace(/^\//, "").replace(/\/$/, "").split("/").pop() ?? page.id;
  const record = pseoMap.get(segment);
  if (record) return baseUrl + record.final_url.replace(/\/?$/, "/");
  return `${baseUrl}${page.slug.replace(/\/$/, "")}`;
}

function loadIndexAllowlist(): Set<string> {
  const fp = join(DATA_PSEO, "index_allowlist.json");
  if (!existsSync(fp)) return new Set();
  const { allow } = JSON.parse(readFileSync(fp, "utf-8")) as { allow?: string[] };
  return new Set(allow || []);
}

function loadRedirects(): Set<string> {
  if (!existsSync(REDIRECTS_PATH)) return new Set();
  const lines = readFileSync(REDIRECTS_PATH, "utf8").split("\n");
  const pairs = new Set<string>();
  for (const line of lines) {
    const t = line.trim().split(/\s+/);
    if (t.length >= 2) {
      const from = t[0].replace(/\/?$/, "");
      const to = t[1].trim().replace(/\/?$/, "") + "/";
      pairs.add(`${from} -> ${to}`);
      pairs.add(`${from}/ -> ${to}`);
    }
  }
  return pairs;
}

function loadSimilarityReport(): Map<string, { content_max: number; content_with?: string }> | null {
  const fp = join(DATA_PSEO, "artifacts", "report", "similarity_report.json");
  if (!existsSync(fp)) return null;
  const data = JSON.parse(readFileSync(fp, "utf-8")) as { by_page?: Record<string, { content_max?: number; content_with?: string }> };
  if (!data.by_page) return null;
  const m = new Map<string, { content_max: number; content_with?: string }>();
  for (const [id, v] of Object.entries(data.by_page)) {
    m.set(id, { content_max: v.content_max ?? 0, content_with: v.content_with });
  }
  return m;
}

/** PR-C: duplicate_report の near_duplicate 件数。0 超で fail */
function loadDuplicateReportFail(): string | null {
  const fp = join(DATA_PSEO, "artifacts", "report", "duplicate_report.json");
  if (!existsSync(fp)) return null;
  const data = JSON.parse(readFileSync(fp, "utf-8")) as { summary?: { near_duplicate_pairs?: number } };
  const n = data.summary?.near_duplicate_pairs ?? 0;
  if (n > 0) return `duplicate_report: near_duplicate_pairs=${n} (must be 0). Run phase0:duplicate-report and fix or noindex duplicates.`;
  return null;
}

/** PR-C: MECE — 同一 intent_id で index 可能なのは1本まで */
function loadMeceFail(indexAllowlist: Set<string>): string | null {
  const fp = join(DATA_PSEO, "artifacts", "report", "search_intent_taxonomy.json");
  if (!existsSync(fp)) return null;
  const data = JSON.parse(readFileSync(fp, "utf-8")) as { pages?: Array<{ slug: string; intent_id: string }> };
  if (!data.pages) return null;
  const slugToIntent = new Map<string, string>();
  for (const p of data.pages) slugToIntent.set(p.slug, p.intent_id);
  const byIntent = new Map<string, string[]>();
  for (const slug of indexAllowlist) {
    const intent = slugToIntent.get(slug);
    if (!intent) continue;
    if (!byIntent.has(intent)) byIntent.set(intent, []);
    byIntent.get(intent)!.push(slug);
  }
  for (const [intent, slugs] of byIntent) {
    if (slugs.length > 1)
      return `MECE: intent_id=${intent} has ${slugs.length} indexable pages (max 1). Slugs: ${slugs.join(", ")}. Run phase0:search-intent and adjust index_allowlist.`;
  }
  return null;
}

function extractCanonical(html: string): string {
  const m = html.match(/<link\s+rel="canonical"\s+href=["']([^"']+)["']/i);
  return m ? m[1].trim().replace(/\/*$/, "") + "/" : "";
}

function extractOgUrl(html: string): string {
  const m = html.match(/<meta\s+property=["']og:url["']\s+content=["']([^"']+)["']/i);
  return m ? m[1].trim().replace(/\/*$/, "") + "/" : "";
}

function extractRobots(html: string): string {
  const m = html.match(/<meta\s+name=["']robots["']\s+content=["']([^"']+)["']/i);
  return m ? m[1].trim() : "";
}

function extractH2Texts(html: string): string[] {
  const h2Reg = /<h2[^>]*>([\s\S]*?)<\/h2>/gi;
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = h2Reg.exec(html)) !== null) out.push(m[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim());
  return out;
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTables(html: string): { rowCount: number; cellCount: number }[] {
  const tables: { rowCount: number; cellCount: number }[] = [];
  const tableReg = /<table[\s\S]*?<\/table>/gi;
  let m: RegExpExecArray | null;
  while ((m = tableReg.exec(html)) !== null) {
    const frag = m[0];
    const rows = (frag.match(/<tr[\s>]/gi) || []).length;
    const cells = (frag.match(/<t[dh][\s>]/gi) || []).length;
    tables.push({ rowCount: rows, cellCount: cells });
  }
  return tables;
}

function extractLinks(html: string): { href: string; text: string }[] {
  const links: { href: string; text: string }[] = [];
  const reg = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = reg.exec(html)) !== null) {
    links.push({ href: m[1].trim(), text: stripHtml(m[2]).trim() });
  }
  return links;
}

function extractFaqQuestions(html: string): string[] {
  const questions: string[] = [];
  const faqSection = html.match(/よくある質問[\s\S]*?<section[\s\S]*?<\/section>/gi);
  if (faqSection) {
    const sectionHtml = faqSection.join(" ");
    const h3Reg = /<h3[^>]*>([\s\S]*?)<\/h3>/gi;
    let h: RegExpExecArray | null;
    while ((h = h3Reg.exec(sectionHtml)) !== null) questions.push(stripHtml(h[1]).trim());
  }
  const h3InFaq = html.split("次に読む")[0].match(/<h3[^>]*>([\s\S]*?)<\/h3>/gi);
  if (h3InFaq && questions.length === 0) {
    for (const tag of h3InFaq) questions.push(stripHtml(tag.replace(/<[^>]+>/, "").replace(/<\/h3>/, "")).trim());
  }
  return questions.filter(Boolean);
}

function getBodyHtml(html: string): string {
  const openMatch = html.match(/<section[^>]*class="[^"]*pseo-main[^"]*"[\s\S]*?<div[^>]*prose[^>]*>/i);
  if (!openMatch || openMatch.index == null) return html;
  const start = openMatch.index + openMatch[0].length;
  let depth = 1;
  let i = start;
  while (depth > 0 && i < html.length) {
    const nextOpen = html.indexOf("<div", i);
    const nextClose = html.indexOf("</div>", i);
    if (nextClose === -1) break;
    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth++;
      i = nextOpen + 4;
    } else {
      depth--;
      i = nextClose + 6;
      if (depth === 0) return html.slice(start, nextClose);
    }
  }
  return html.slice(start);
}

function shingle(str: string, k: number): Set<string> {
  const normalized = str.replace(/\s+/g, " ").trim();
  const set = new Set<string>();
  for (let i = 0; i <= normalized.length - k; i++) set.add(normalized.slice(i, i + k));
  return set;
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter) || 0;
}

function wordShingle(str: string, k: number = 3): Set<string> {
  const words = str.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  const set = new Set<string>();
  for (let i = 0; i <= words.length - k; i++) set.add(words.slice(i, i + k).join(" "));
  return set;
}

function normalizePath(href: string): string {
  const u = href.replace(/^https?:\/\/[^/]+/i, "").replace(/#.*$/, "").replace(/\/$/, "").replace(/^\//, "");
  return u;
}

function validatePage(
  page: CatalogPage,
  html: string,
  catalog: Catalog,
  baseUrl: string,
  pseoMap: Map<string, { final_slug: string; final_url: string; legacy_url?: string; topic?: string[] }>,
  indexAllowlist: Set<string>,
  redirectsSet: Set<string>,
  similarityByPage: Map<string, { content_max: number; content_with?: string }> | null
): ValidationPageResult {
  const reasons: string[] = [];
  const warns: string[] = [];
  const segment = page.slug.replace(/^\//, "").replace(/\/$/, "").split("/").pop() ?? page.id;
  const record = pseoMap.get(segment);
  const expectedFinalUrl = record ? (baseUrl + record.final_url.replace(/\/?$/, "/")) : "";
  const bodyHtml = getBodyHtml(html);
  const fullText = stripHtml(html);
  const bodyText = stripHtml(bodyHtml);

  const tables = extractTables(bodyHtml);
  const tableCount = tables.length;
  const maxTableRows = tables.length ? Math.max(...tables.map((t) => t.rowCount)) : 0;
  const tableCellsCount = tables.reduce((s, t) => s + t.cellCount, 0);
  const links = extractLinks(html);
  const refLinks = links.filter((l) => /^https?:\/\//i.test(l.href) || l.href.includes("aimoaas.com"));
  const uniqueRefUrls = new Set(refLinks.map((l) => l.href.replace(/#.*$/, "")));
  const hasAimoStandard = [...uniqueRefUrls].some((u) => AIMO_STANDARD_URL_PATTERN.test(u));
  const faqQuestions = extractFaqQuestions(html);
  const internalLinks = links.filter((l) => l.href.includes("pseo") || l.href.includes("/ja/resources/"));
  const internalHrefs = [...new Set(internalLinks.map((l) => normalizePath(l.href)))];
  const linkedPageTypes = new Set<string>();
  for (const pathPart of internalHrefs) {
    for (const p of catalog.pages) {
      const slugPath = p.slug.replace(/^\//, "").replace(/\/$/, "");
      if (pathPart === slugPath || pathPart.endsWith(slugPath) || slugPath.endsWith(pathPart)) {
        linkedPageTypes.add(p.page_type);
        break;
      }
    }
  }
  const checklistItems = (bodyHtml.match(/<li[^>]*>[\s\S]*?<\/li>/gi) || []).length;
  let intentKeywordsMatched = 0;
  const combinedText = (fullText + " " + bodyText).toLowerCase();
  for (const kw of page.intent_keywords) {
    if (combinedText.includes(kw.toLowerCase().replace(/\s+/g, " "))) intentKeywordsMatched++;
  }
  const artifactCount = REQUIRED_ARTIFACTS.filter((label) => bodyHtml.includes(label)).length;
  const artifactTypesCount = (bodyHtml.match(/data-artifact=["'][^"']+["']/g) || []).length;
  const dataUniqueMatches = bodyHtml.match(/data-unique=["']([^"']+)["']/g) || [];
  const dataUniqueTypes = new Set(dataUniqueMatches.map((m) => (m.match(/=["']([^"']+)["']/) ?? [])[1]).filter(Boolean));

  // --- 必須 (fail) ---
  const h1Count = (html.match(/<h1[^>]*>/gi) || []).length;
  if (h1Count !== 1) reasons.push(`H1 must appear exactly once (got ${h1Count})`);
  const h2Texts = extractH2Texts(html);
  const h2Set = new Set(h2Texts);
  if (h2Texts.length !== h2Set.size) reasons.push("H2 duplicate: same heading text appears more than once");
  const canonical = extractCanonical(html);
  if (record) {
    if (!canonical) reasons.push("canonical is required (must match final_url)");
    else if (canonical.replace(/\/*$/, "") + "/" !== expectedFinalUrl.replace(/\/*$/, "") + "/")
      reasons.push(`canonical must match final_url (got ${canonical})`);
  }
  const ogUrl = extractOgUrl(html);
  if (record) {
    if (!ogUrl) reasons.push("og:url is required (must match final_url)");
    else if (ogUrl.replace(/\/*$/, "") + "/" !== expectedFinalUrl.replace(/\/*$/, "") + "/")
      reasons.push(`og:url must match final_url (got ${ogUrl})`);
  }
  const robots = extractRobots(html);
  const allowed = record ? indexAllowlist.has(record.final_slug) : false;
  const expectedRobots = allowed ? "index,follow" : "noindex,follow";
  if (record) {
    if (!robots) reasons.push("robots meta is required in head");
    else if (robots !== expectedRobots) reasons.push(`robots must be ${expectedRobots} (got ${robots})`);
  }
  const ctaLinks = links.filter((l) => CTA_HREF_PATTERN.test(l.href));
  if (ctaLinks.length < 1) reasons.push("CTA: at least one link to aimoaas.com/ja/#contact (or #contact) required");
  const claimsResult = lintClaims(html);
  if (!claimsResult.pass) reasons.push(...claimsResult.violations);
  if (record?.legacy_url) {
    const from = record.legacy_url.replace(/\/?$/, "");
    const to = (record.final_url.replace(/\/?$/, "") + "/").replace(/\/+/g, "/");
    const pair = `${from} -> ${to}`;
    const pairAlt = `${from}/ -> ${to}`;
    if (!redirectsSet.has(pair) && !redirectsSet.has(pairAlt)) reasons.push(`legacy_url exists but _redirects has no 301: ${from} -> ${to}`);
  }
  const simInfo = similarityByPage?.get(segment);
  const contentMax = simInfo?.content_max ?? 0;
  if (contentMax >= CONTENT_SIMILARITY_SAME)
    reasons.push(`content_similarity to "${simInfo?.content_with ?? "?"}": ${(contentMax * 100).toFixed(1)}% (same content = fail)`);
  if (dataUniqueTypes.size < 2)
    reasons.push("unique_elements: at least 2 distinct data-unique types required (e.g. case-study, checklist from topic_assets)");

  // --- 参考 (warn) ---
  if (tableCount < 1 || maxTableRows < MIN_TABLE_ROWS) warns.push(`table: ${tableCount} tables, max ${maxTableRows} rows (warn: >= ${MIN_TABLE_ROWS})`);
  if (faqQuestions.length < MIN_FAQ) warns.push(`faq_count ${faqQuestions.length} < ${MIN_FAQ}`);
  if (internalHrefs.length < MIN_INTERNAL_LINKS) warns.push(`internal_links_count ${internalHrefs.length} < ${MIN_INTERNAL_LINKS}`);
  if (linkedPageTypes.size < MIN_PAGE_TYPES_IN_LINKS) warns.push(`page_types_in_links ${linkedPageTypes.size} < ${MIN_PAGE_TYPES_IN_LINKS}`);
  if (checklistItems < MIN_CHECKLIST_ITEMS) warns.push(`checklist_items_count ${checklistItems} < ${MIN_CHECKLIST_ITEMS}`);
  if (tableCellsCount < MIN_TABLE_CELLS) warns.push(`table_cells_count ${tableCellsCount} < ${MIN_TABLE_CELLS}`);
  if (intentKeywordsMatched < MIN_INTENT_KEYWORDS_MATCHED) warns.push(`intent_keywords_matched ${intentKeywordsMatched} < ${MIN_INTENT_KEYWORDS_MATCHED}`);
  if (artifactCount < MIN_REQUIRED_ARTIFACTS) warns.push(`required_artifacts: ${artifactCount} of [${REQUIRED_ARTIFACTS.join(", ")}]`);
  if (!hasAimoStandard) warns.push("references: include AIMO Standard link");
  if (contentMax >= CONTENT_SIMILARITY_WARN && contentMax < CONTENT_SIMILARITY_SAME)
    warns.push(`content_similarity high: ${(contentMax * 100).toFixed(1)}% with "${simInfo?.content_with ?? "?"}"`);

  const pass = reasons.length === 0;
  const uniqueElementScore =
    (Math.min(1, checklistItems / 10) + Math.min(1, tableCellsCount / 50) + Math.min(1, uniqueRefUrls.size / 5) + Math.min(1, intentKeywordsMatched / (page.intent_keywords.length || 1))) / 4;

  return {
    page_id: page.id,
    url: getReportUrlForPage(page, baseUrl, pseoMap),
    pass,
    fail: !pass,
    reasons,
    warns: warns.length ? warns : undefined,
    fail_reasons: reasons.length ? reasons : undefined,
    warn_reasons: warns.length ? warns : undefined,
    unique_sections: [...dataUniqueTypes],
    cta_present: ctaLinks.length >= 1,
    claims_lint: { pass: claimsResult.pass, violations: claimsResult.violations },
    topic: record?.topic,
    content_similarity: contentMax > 0 ? contentMax : undefined,
    content_similarity_with: simInfo?.content_with,
    references_count: uniqueRefUrls.size,
    faq_count: faqQuestions.length,
    internal_links_count: internalHrefs.length,
    page_types_in_links: linkedPageTypes.size,
    table_count: tableCount,
    max_table_rows: maxTableRows,
    checklist_items_count: checklistItems,
    table_cells_count: tableCellsCount,
    intent_keywords_matched: intentKeywordsMatched,
    unique_element_score: uniqueElementScore,
    artifact_types_count: artifactTypesCount || undefined,
  };
}

async function main(): Promise<void> {
  const catalog = loadCatalog();
  const baseUrl = process.env.BASE_URL || "https://aimoaas.com";
  const reportPath = join(ROOT, "generation-report.json");
  const qualityReportPath = join(DATA_PSEO, "artifacts", "report", "pseo_quality_report.json");

  const pseoMap = loadPseoPagesMap();
  const indexAllowlist = loadIndexAllowlist();
  const globalReasons: string[] = [];
  const dupFail = loadDuplicateReportFail();
  if (dupFail) globalReasons.push(dupFail);
  const meceFail = loadMeceFail(indexAllowlist);
  if (meceFail) globalReasons.push(meceFail);

  const results: ValidationPageResult[] = [];
  const pagesToValidate = catalog.pages.filter((p) => p.lang === "ja");
  const redirectsSet = loadRedirects();
  const similarityByPage = loadSimilarityReport();

  for (const page of pagesToValidate) {
    const filePath = getFilePathForPage(page, pseoMap);
    if (!existsSync(filePath)) {
      results.push({
        page_id: page.id,
        url: getReportUrlForPage(page, baseUrl, pseoMap),
        pass: false,
        fail: true,
        reasons: ["Generated HTML not found: " + filePath],
        references_count: 0,
        faq_count: 0,
        internal_links_count: 0,
        page_types_in_links: 0,
        table_count: 0,
        max_table_rows: 0,
        checklist_items_count: 0,
        table_cells_count: 0,
        intent_keywords_matched: 0,
      });
      continue;
    }
    const html = readFileSync(filePath, "utf8");
    const result = validatePage(page, html, catalog, baseUrl, pseoMap, indexAllowlist, redirectsSet, similarityByPage);
    results.push(result);
  }

  const passed = results.filter((r) => r.pass).length;
  const failed = results.filter((r) => r.fail).length;

  const report: GenerationReport = {
    generated_at: new Date().toISOString(),
    pages: results,
    summary: { total: results.length, passed, failed },
  };

  writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");
  console.log(`Validation report: ${reportPath}`);
  console.log(`Summary: ${passed} passed, ${failed} failed (total ${results.length})`);

  const h2FixupsPath = join(DATA_PSEO, "artifacts", "report", "h2_dedup_fixups.json");
  let h2Fixups: Record<string, string[]> = {};
  if (existsSync(h2FixupsPath)) {
    try {
      h2Fixups = JSON.parse(readFileSync(h2FixupsPath, "utf8"));
    } catch (_) {}
  }
  const qualityReport = {
    generated_at: new Date().toISOString(),
    summary: { total: results.length, passed, failed },
    pages: results.map((r) => ({
      page_id: r.page_id,
      url: r.url,
      pass: r.pass,
      fail: r.fail,
      reasons: r.reasons,
      warns: r.warns,
      fail_reasons: r.fail_reasons,
      warn_reasons: r.warn_reasons,
      content_similarity: r.content_similarity,
      content_similarity_with: r.content_similarity_with,
      unique_sections: r.unique_sections,
      cta_present: r.cta_present,
      claims_lint: r.claims_lint,
      topic: r.topic,
      artifact_types_count: r.artifact_types_count,
      references_count: r.references_count,
      faq_count: r.faq_count,
      internal_links_count: r.internal_links_count,
      fixups: h2Fixups[r.page_id],
    })),
  };
  const qualityDir = dirname(qualityReportPath);
  if (!existsSync(qualityDir)) {
    const { mkdirSync } = await import("fs");
    mkdirSync(qualityDir, { recursive: true });
  }
  writeFileSync(qualityReportPath, JSON.stringify(qualityReport, null, 2), "utf8");
  console.log(`Quality report: ${qualityReportPath}`);

  if (globalReasons.length > 0) {
    console.error("Validation FAIL (PR-C gates):");
    globalReasons.forEach((r) => console.error("  " + r));
    process.exit(1);
  }
  if (failed > 0) {
    for (const r of results.filter((x) => x.fail)) {
      console.error(`FAIL ${r.page_id}: ${r.reasons.join("; ")}`);
    }
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

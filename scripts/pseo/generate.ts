/**
 * PSEO ページ生成: catalog + SSOT モジュールで本文を組み立て、Gemini で編集成果物（TL;DR/FAQ/JSON-LD 等）を取得し、静的 HTML を出力する。
 * 出力先: catalog.slug に従う（例: /ja/resources/pseo/evidence-pack/ → ja/resources/pseo/evidence-pack/index.html）
 * Phase 1–4: lang=ja のみ生成（_policy/i18n-policy.md）
 */

import dotenv from "dotenv";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";
import yaml from "js-yaml";
import { marked } from "marked";
import type { CatalogPage, Catalog, GeminiOutput, ModuleOutline } from "./types.js";
import { generateEditingArtifacts } from "./gemini.js";
import { renderArtifactsMinTwo } from "./render_artifacts.js";
import { deduplicateH2Sections } from "./quality/dedup_headings.js";
import { renderHeaderStatic, renderFooter } from "./layout.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..", "..");
dotenv.config({ path: join(ROOT, ".env") });
const DATA_PSEO = join(ROOT, "data", "pseo");
const MODULES_DIR = join(DATA_PSEO, "modules");
const TEMPLATES_DIR = join(ROOT, "templates", "pseo");
const PARTIALS_DIR = join(TEMPLATES_DIR, "partials");

/** CTA 3種: 文言は押し付けない、謙虚に伴走姿勢 */
const CTA_CONFIG: Record<
  CatalogPage["primary_cta"],
  { label: string; href: string; mid_note: string }
> = {
  tier1_free_log_analysis: {
    label: "無料ログ分析のご案内を申し込む",
    href: "/ja/#contact",
    mid_note: "お問い合わせ後に、専門家が簡易ログ診断のご案内をします。",
  },
  tier2_bpr_sprint: {
    label: "1か月 BPR・証跡最小要件整備の相談を申し込む",
    href: "/ja/#contact",
    mid_note: "短期で証跡の棚卸と最小要件の整理を、伴走して支援します。",
  },
  exec_onepager_request: {
    label: "監査法人・法務向け説明資料（1枚 PDF）を請求する",
    href: "/ja/#contact",
    mid_note: "説明用の1枚サマリを用意しています。",
  },
};

function loadCatalog(): Catalog {
  const path = join(DATA_PSEO, "catalog.yaml");
  const raw = readFileSync(path, "utf8");
  return yaml.load(raw) as Catalog;
}

const FRONTMATTER_REG = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/;
const HEADING_REG = /^##+\s+(.+)$/gm;

/** モジュール本文から ## References セクションを除去（末尾に1回だけ追加するため） */
function stripReferencesSection(body: string): string {
  return body
    .replace(/\n##\s+References\s*\n[\s\S]*?(?=\n##\s+|$)/gi, "\n")
    .replace(/\n##\s*参考文献\s*\n[\s\S]*?(?=\n##\s+|$)/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** module_id: ファイル名ベース（frontmatter の module_id があればそれ）。先勝ちで重複を除外。 */
function getModuleId(ref: string, frontmatter: Record<string, string>): string {
  return frontmatter.module_id ?? ref.replace(/\.md$/i, "");
}

function parseModule(path: string): { frontmatter: Record<string, string>; body: string } {
  const raw = readFileSync(path, "utf8");
  const m = raw.match(FRONTMATTER_REG);
  if (!m) return { frontmatter: {}, body: stripReferencesSection(raw) };
  const [, fm, body] = m;
  const frontmatter: Record<string, string> = {};
  fm.split("\n").forEach((line) => {
    const colon = line.indexOf(":");
    if (colon > 0) frontmatter[line.slice(0, colon).trim()] = line.slice(colon + 1).trim().replace(/^["']|["']$/g, "");
  });
  return { frontmatter, body: stripReferencesSection(body ?? "") };
}

function extractHeadings(body: string): string[] {
  const headings: string[] = [];
  let match: RegExpExecArray | null;
  HEADING_REG.lastIndex = 0;
  while ((match = HEADING_REG.exec(body)) !== null) headings.push(match[1].trim());
  return headings;
}

function extractKeyPoints(body: string, maxPoints = 15): string[] {
  const points: string[] = [];
  const lines = body.split(/\r?\n/);
  for (const line of lines) {
    const t = line.trim();
    if (!t || t.startsWith("#") || (t.startsWith("|") && t.endsWith("|"))) continue;
    if (t.startsWith("- ") || t.startsWith("* ")) points.push(t.slice(2).slice(0, 200));
    else if (/^\d+\.\s/.test(t)) points.push(t.replace(/^\d+\.\s*/, "").slice(0, 200));
    if (points.length >= maxPoints) break;
  }
  if (points.length === 0) {
    lines.forEach((line) => {
      const t = line.trim();
      if (t.length > 20 && t.length < 300 && !t.startsWith("#") && !t.startsWith("|")) points.push(t.slice(0, 200));
      if (points.length >= maxPoints) return;
    });
  }
  return points.slice(0, maxPoints);
}

/** References は末尾に1回だけ。module_id 重複は先勝ちで1つだけ残す。 */
function loadModuleOutlines(
  page: CatalogPage
): { outline: ModuleOutline[]; bodyMarkdown: string } {
  const outline: ModuleOutline[] = [];
  const bodyParts: string[] = [];
  const seenModuleIds = new Set<string>();
  const refs = page.module_refs ?? [];
  for (const ref of refs) {
    const path = join(MODULES_DIR, ref);
    if (!existsSync(path)) {
      bodyParts.push(`\n\n<!-- module not found: ${ref} -->\n`);
      continue;
    }
    const { frontmatter, body } = parseModule(path);
    const moduleId = getModuleId(ref, frontmatter);
    if (seenModuleIds.has(moduleId)) continue;
    seenModuleIds.add(moduleId);
    const title = frontmatter.title ?? ref;
    const purpose = frontmatter.purpose ?? "";
    const headings = extractHeadings(body);
    const keyPoints = extractKeyPoints(body);
    outline.push({ file: ref, title, purpose, headings, keyPoints });
    bodyParts.push(`\n\n## ${title}\n\n${body}`);
  }
  const referencesLinks =
    (page.references ?? [])
      .map((url) => (url.startsWith("http") ? `- [${url}](${url})` : `- ${url}`))
      .join("\n") || "- [AIMO Standard](https://aimoaas.com/ja/aimo-standard/)";
  bodyParts.push(`\n\n## References\n\n${referencesLinks}`);
  return { outline, bodyMarkdown: bodyParts.join("\n") };
}

function buildBodyOutline(outline: ModuleOutline[]): { headings: string[]; keyPoints: string[] } {
  const headings: string[] = [];
  const keyPoints: string[] = [];
  for (const m of outline) {
    headings.push(m.title);
    headings.push(...m.headings);
    keyPoints.push(m.purpose);
    keyPoints.push(...m.keyPoints);
  }
  return { headings: [...new Set(headings)].filter(Boolean), keyPoints: [...new Set(keyPoints)].slice(0, 30) };
}

function markdownToHtml(md: string): string {
  const out = marked.parse(md);
  return typeof out === "string" ? out : "";
}

function loadTemplate(name: string): string {
  return readFileSync(join(TEMPLATES_DIR, name), "utf8");
}

function renderCtaPartial(primary_cta: CatalogPage["primary_cta"], baseUrl: string, note: string): string {
  const tpl = readFileSync(join(PARTIALS_DIR, "cta.html"), "utf8");
  const c = CTA_CONFIG[primary_cta];
  const href = c.href.startsWith("http") ? c.href : baseUrl + c.href;
  const noteHtml = note ? `<p class="text-sm text-slate-600 mt-2">${escapeHtml(note)}</p>` : "";
  return tpl
    .replace(/\{\{cta_label\}\}/g, escapeHtml(c.label))
    .replace(/\{\{cta_href\}\}/g, href)
    .replace(/\{\{cta_note\}\}/g, noteHtml);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** page_type に応じた OGP 画像（現状は同一。トピック別画像追加時に差し替え可能） */
function getOgImageForPageType(pageType: string | undefined, baseUrl: string): string {
  const defaultImg = `${baseUrl}/assets/aimo-standard-unifying-regulations.png`;
  // 将来: E=Coverage, A=Evidence Pack, B=統制, C=ワークフロー, D=責任分界 で別画像を返す
  return defaultImg;
}

function renderPageHtml(
  page: CatalogPage,
  bodyHtml: string,
  gemini: GeminiOutput,
  baseUrl: string,
  options?: { canonicalUrl?: string; pseoRobots?: string; emitFaqSchema?: boolean; internalLinksHtml?: string }
): string {
  const canonical = (options?.canonicalUrl ?? `${baseUrl}${page.slug.replace(/\/$/, "")}`).replace(/\/?$/, "/");
  const ogImage = getOgImageForPageType(page.page_type, baseUrl);
  const pseoRobots = options?.pseoRobots ?? "noindex,follow";
  const emitFaqSchema = options?.emitFaqSchema ?? false;

  const faqSchema = emitFaqSchema && gemini.jsonld.faqPage
    ? `<script type="application/ld+json">${JSON.stringify(gemini.jsonld.faqPage)}</script>`
    : "";
  // E-E-A-T: Article に datePublished/dateModified/author/publisher を付与（AI低価値シグナル軽減）
  const buildDate = new Date().toISOString().slice(0, 10);
  const articleEnriched = gemini.jsonld.article
    ? {
        ...gemini.jsonld.article,
        datePublished: buildDate,
        dateModified: buildDate,
        author: { "@type": "Organization" as const, name: "RISEby inc.", url: "https://riseby.net" },
        publisher: { "@id": `${baseUrl}/#organization` },
      }
    : null;
  const articleSchema = articleEnriched
    ? `<script type="application/ld+json">${JSON.stringify(articleEnriched)}</script>`
    : "";

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "ホーム", item: `${baseUrl}/ja/` },
      { "@type": "ListItem", position: 2, name: "監査・証跡（実務）", item: `${baseUrl}/ja/resources/pseo/` },
      { "@type": "ListItem", position: 3, name: gemini.title, item: canonical },
    ],
  };
  const jsonLdBreadcrumb = `<script type="application/ld+json">${JSON.stringify(breadcrumbSchema)}</script>`;

  const [y, m, d] = buildDate.split("-").map(Number);
  const dateModifiedDisplay = `${y}年${m}月${d}日`;

  const faqHtml = gemini.faqs
    .map(
      (f) =>
        `<section class="py-4 px-4 first:pt-4 last:pb-4"><h3 class="text-lg font-semibold text-slate-900">${escapeHtml(f.question)}</h3><p class="mt-2 text-slate-700">${escapeHtml(f.answer)}</p></section>`
    )
    .join("\n");

  const internalLinksHtml =
    options?.internalLinksHtml ??
    gemini.internal_links
      .map((l) => {
        const url = l.href.startsWith("http") ? l.href : baseUrl + l.href;
        return `<a href="${escapeHtml(url)}" class="text-indigo-600 hover:underline">${escapeHtml(l.text)}</a>`;
      })
      .join(' <span class="text-slate-300" aria-hidden="true">/</span> ');

  const ctaAbove = renderCtaPartial(page.primary_cta, baseUrl, "");
  const ctaMid = renderCtaPartial(page.primary_cta, baseUrl, CTA_CONFIG[page.primary_cta].mid_note);
  const ctaBottom = renderCtaPartial(page.primary_cta, baseUrl, "");
  const trustBlock = readFileSync(join(PARTIALS_DIR, "trust.html"), "utf8");

  const headerHtml = renderHeaderStatic("ja", "main_lp", baseUrl);
  const footerHtml = renderFooter("ja", baseUrl, { showPracticeGuide: true });

  const pageTpl = loadTemplate("page.html");
  return pageTpl
    .replace(/\{\{title\}\}/g, escapeHtml(gemini.title))
    .replace(/\{\{description\}\}/g, escapeHtml(gemini.description))
    .replace(/\{\{pseo_robots\}\}/g, pseoRobots)
    .replace(/\{\{canonical\}\}/g, canonical)
    .replace(/\{\{og_title\}\}/g, escapeHtml(gemini.title))
    .replace(/\{\{og_description\}\}/g, escapeHtml(gemini.description))
    .replace(/\{\{og_image\}\}/g, ogImage)
    .replace(/\{\{twitter_card\}\}/g, "summary_large_image")
    .replace(/\{\{twitter_title\}\}/g, escapeHtml(gemini.title))
    .replace(/\{\{twitter_description\}\}/g, escapeHtml(gemini.description))
    .replace(/\{\{twitter_image\}\}/g, ogImage)
    .replace(/\{\{base_url\}\}/g, baseUrl)
    .replace(/\{\{h1\}\}/g, escapeHtml(gemini.title))
    .replace(/\{\{tldr\}\}/g, escapeHtml(gemini.tldr))
    .replace(/\{\{cta_above_fold\}\}/g, ctaAbove)
    .replace(/\{\{body_html\}\}/g, bodyHtml)
    .replace(/\{\{cta_mid\}\}/g, ctaMid)
    .replace(/\{\{trust_block\}\}/g, trustBlock)
    .replace(/\{\{faq_html\}\}/g, faqHtml)
    .replace(/\{\{cta_bottom\}\}/g, ctaBottom)
    .replace(/\{\{internal_links_html\}\}/g, internalLinksHtml)
    .replace(/\{\{json_ld_faq\}\}/g, faqSchema)
    .replace(/\{\{json_ld_article\}\}/g, articleSchema)
    .replace(/\{\{json_ld_breadcrumb\}\}/g, jsonLdBreadcrumb)
    .replace(/\{\{date_modified_display\}\}/g, dateModifiedDisplay)
    .replace(/\{\{header_html\}\}/g, headerHtml)
    .replace(/\{\{footer_html\}\}/g, footerHtml);
}

function loadPseoPagesMap(): Map<string, { final_url: string; final_slug: string }> {
  const fp = join(DATA_PSEO, "pseo_pages.json");
  if (!existsSync(fp)) return new Map();
  const { pages } = JSON.parse(readFileSync(fp, "utf-8")) as { pages: Array<{ id: string; final_url: string; final_slug: string }> };
  const m = new Map<string, { final_url: string; final_slug: string }>();
  for (const p of pages) m.set(p.id, { final_url: p.final_url, final_slug: p.final_slug });
  return m;
}

function loadIndexAllowlist(): Set<string> {
  const fp = join(DATA_PSEO, "index_allowlist.json");
  if (!existsSync(fp)) return new Set();
  const { allow } = JSON.parse(readFileSync(fp, "utf-8")) as { allow: string[] };
  return new Set(allow || []);
}

function loadFaqSchemaAllowlist(): Set<string> {
  const fp = join(DATA_PSEO, "faq_schema_allowlist.json");
  if (!existsSync(fp)) return new Set();
  const { allow } = JSON.parse(readFileSync(fp, "utf-8")) as { allow: string[] };
  return new Set(allow || []);
}

type LinkItem = { text: string; href: string };
function loadLinkMap(): { common: LinkItem[]; [topic: string]: LinkItem[] | undefined } | null {
  const fp = join(DATA_PSEO, "link_map.json");
  if (!existsSync(fp)) return null;
  const data = JSON.parse(readFileSync(fp, "utf-8")) as { common?: LinkItem[]; [k: string]: LinkItem[] | undefined };
  return data;
}

function loadSlugToTopic(): Map<string, string> {
  const fp = join(DATA_PSEO, "pseo_pages.json");
  if (!existsSync(fp)) return new Map();
  const { pages } = JSON.parse(readFileSync(fp, "utf-8")) as {
    pages: Array<{ final_slug: string; topic?: string[] }>;
  };
  const m = new Map<string, string>();
  for (const p of pages) {
    const t = p.topic?.[0] ?? "misc";
    m.set(p.final_slug, t);
    m.set(p.final_slug.replace(/^.*\//, ""), t);
  }
  return m;
}

/** 内部リンクのトピック多様性確保: common + 自トピック + 他トピックから2種を追加（page_types_in_links >= 3 に寄与） */
function buildInternalLinksHtmlFromLinkMap(
  baseUrl: string,
  finalSlug: string,
  linkMap: { common: LinkItem[]; [topic: string]: LinkItem[] | undefined },
  slugToTopic: Map<string, string>
): string {
  const currentTopic = slugToTopic.get(finalSlug) ?? "misc";
  const topicLinks = linkMap[currentTopic] ?? linkMap.misc ?? [];
  const common = linkMap.common ?? [];
  const topicKeys = Object.keys(linkMap).filter((k) => k !== "common" && k !== "description" && Array.isArray(linkMap[k]) && (linkMap[k]?.length ?? 0) > 0);
  const otherTopics = topicKeys.filter((k) => k !== currentTopic);
  const added = new Set<string>();
  const fromOthers: LinkItem[] = [];
  for (const t of otherTopics) {
    const arr = linkMap[t];
    if (!Array.isArray(arr) || arr.length === 0) continue;
    const first = arr[0];
    if (first && !added.has(first.href)) {
      added.add(first.href);
      fromOthers.push(first);
      if (fromOthers.length >= 2) break;
    }
  }
  const links = [...common, ...(Array.isArray(topicLinks) ? topicLinks : []), ...fromOthers];
  const sep = ' <span class="text-slate-300" aria-hidden="true">/</span> ';
  return links
    .map((l) => {
      const url = l.href.startsWith("http") ? l.href : baseUrl + l.href;
      return `<a href="${escapeHtml(url)}" class="text-indigo-600 hover:underline">${escapeHtml(l.text)}</a>`;
    })
    .join(sep);
}

async function main(): Promise<void> {
  const baseUrl = process.env.BASE_URL || "https://aimoaas.com";
  const catalog = loadCatalog();
  const onlyId = process.argv[2]; // optional: npm run generate -- pseo-evidence-pack

  const pseoPagesMap = loadPseoPagesMap();
  const indexAllowlist = loadIndexAllowlist();
  const faqSchemaAllowlist = loadFaqSchemaAllowlist();
  const linkMap = loadLinkMap();
  const slugToTopic = loadSlugToTopic();
  const h2FixupsByPage = new Map<string, string[]>();

  /** Phase 1–4: ja のみ生成（i18n-policy.md） */
  const pagesToGenerate = catalog.pages.filter((p) => p.lang === "ja");

  for (const page of pagesToGenerate) {
    if (onlyId && page.id !== onlyId) continue;

    const slugSegment = page.slug.replace(/^\//, "").replace(/\/$/, "").split("/").pop() ?? page.id;
    const pseoRecord = pseoPagesMap.get(slugSegment);
    const canonicalUrl = pseoRecord ? baseUrl + pseoRecord.final_url.replace(/\/?$/, "/") : undefined;
    const outDirSlug = pseoRecord?.final_slug ?? slugSegment;
    const finalSlugForAllowlist = pseoRecord?.final_slug ?? slugSegment;
    const pseoRobots = indexAllowlist.has(finalSlugForAllowlist) ? "index,follow" : "noindex,follow";
    const emitFaqSchema = faqSchemaAllowlist.has(finalSlugForAllowlist);

    console.log(`Generating: ${page.id} (${page.slug})`);

    const { outline, bodyMarkdown } = loadModuleOutlines(page);
    const bodyOutline = buildBodyOutline(outline);
    let bodyHtml = markdownToHtml(bodyMarkdown);
    const artifactsHtml = renderArtifactsMinTwo(page);
    if (artifactsHtml) bodyHtml = bodyHtml + artifactsHtml;
    const { html: dedupedHtml, fixups } = deduplicateH2Sections(bodyHtml);
    bodyHtml = dedupedHtml;
    if (!bodyHtml.includes("table-wrap"))
      bodyHtml = bodyHtml.replace(/<table([^>]*)>([\s\S]*?)<\/table>/gi, '<div class="table-wrap"><table$1>$2</table></div>');
    if (fixups.length > 0) h2FixupsByPage.set(page.id, fixups);

    const geminiInput = {
      intent_keywords: page.intent_keywords,
      references: page.references,
      body_outline: bodyOutline,
    };

    let geminiOutput: GeminiOutput;
    try {
      geminiOutput = await generateEditingArtifacts(geminiInput);
    } catch (e) {
      console.error(`Gemini failed for ${page.id}:`, e);
      throw e;
    }

    const internalLinksHtml =
      linkMap != null
        ? buildInternalLinksHtmlFromLinkMap(baseUrl, outDirSlug, linkMap, slugToTopic)
        : undefined;
    let html = renderPageHtml(page, bodyHtml, geminiOutput, baseUrl, {
      canonicalUrl,
      pseoRobots,
      emitFaqSchema,
      internalLinksHtml,
    });
    html = html
      .replace(/本ページでは/g, "ここでは")
      .replace(/当ページでは/g, "この内容では");
    const outPath = join(ROOT, "ja", "resources", "pseo", outDirSlug, "index.html");
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, html, "utf8");
    console.log(`  -> ${outPath}`);
  }

  const fixupsPath = join(DATA_PSEO, "artifacts", "report", "h2_dedup_fixups.json");
  if (h2FixupsByPage.size > 0) {
    const { mkdirSync } = await import("fs");
    mkdirSync(dirname(fixupsPath), { recursive: true });
    const obj: Record<string, string[]> = {};
    h2FixupsByPage.forEach((v, k) => (obj[k] = v));
    writeFileSync(fixupsPath, JSON.stringify(obj, null, 2), "utf8");
    console.log(`H2 fixups: ${fixupsPath}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

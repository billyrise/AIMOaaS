/**
 * 生成された PSEO ページ一覧から sitemap.xml を更新（重複排除）。
 * 乱造臭を抑えるため: priority は抑制、changefreq は weekly（daily 禁止）。
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";
import yaml from "js-yaml";
import type { Catalog, CatalogPage } from "./types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..", "..");
const SSOT_PATH = join(ROOT, "ssot", "pseo_pages.json");
const SITEMAP_PATH = join(ROOT, "sitemap.xml");
const SITEMAP_PREVIEW_PATH = join(ROOT, "data", "pseo", "artifacts", "report", "sitemap_preview.xml");
const ROBOTS_PATH = join(ROOT, "robots.txt");
const DATA_PSEO = join(ROOT, "data", "pseo");

const BASE_URL = process.env.BASE_URL || "https://aimoaas.com";
const CHANGEFREQ = "weekly";

interface SsotPage {
  url: string;
  robots: string;
  is_pillar: boolean;
  page_priority: number;
}

/** SSOT から indexable の URL と priority を返す。無ければ null。 */
function loadIndexableFromSsot(): { urls: string[]; priorityByUrl: Map<string, string> } | null {
  if (!existsSync(SSOT_PATH)) return null;
  const raw = JSON.parse(readFileSync(SSOT_PATH, "utf-8")) as { pages: SsotPage[] };
  const indexable = (raw.pages || []).filter((p) => p.robots === "index,follow");
  const urls = indexable.map((p) => p.url.replace(/\/?$/, "/"));
  const priorityByUrl = new Map<string, string>();
  for (const p of indexable) {
    const url = p.url.replace(/\/?$/, "/");
    priorityByUrl.set(url, p.is_pillar ? "0.75" : "0.65");
  }
  return { urls, priorityByUrl };
}

/** Evidence/Workflow 系: 0.7, Coverage 系: 0.6, その他: 0.5 */
function priorityForPage(page: CatalogPage): string {
  const t = page.page_type;
  if (t === "E") return "0.6"; // Coverage Map
  if (t === "A" || t === "B" || t === "C" || t === "D") return "0.7"; // Evidence Pack, Min Evidence, Workflow, Responsibility
  return "0.5";
}

function loadCatalog(): Catalog {
  const raw = readFileSync(join(DATA_PSEO, "catalog.yaml"), "utf8");
  return yaml.load(raw) as Catalog;
}

function loadPseoPagesMap(): Map<string, { final_slug: string; final_url: string }> {
  const fp = join(DATA_PSEO, "pseo_pages.json");
  if (!existsSync(fp)) return new Map();
  const { pages } = JSON.parse(readFileSync(fp, "utf-8")) as {
    pages: Array<{ id: string; final_slug: string; final_url: string }>;
  };
  const m = new Map<string, { final_slug: string; final_url: string }>();
  for (const p of pages) m.set(p.id, { final_slug: p.final_slug, final_url: p.final_url });
  return m;
}

function loadIndexAllowlist(): Set<string> {
  const fp = join(DATA_PSEO, "index_allowlist.json");
  if (!existsSync(fp)) return new Set();
  const { allow } = JSON.parse(readFileSync(fp, "utf-8")) as { allow: string[] };
  return new Set(allow || []);
}

function pseoLoc(page: CatalogPage, pseoMap: Map<string, { final_slug: string; final_url: string }>): string {
  const segment = page.slug.replace(/^\//, "").replace(/\/$/, "").split("/").pop() ?? page.id;
  const record = pseoMap.get(segment);
  if (record) return `${BASE_URL}${record.final_url.replace(/\/?$/, "/")}`;
  return `${BASE_URL}${page.slug.replace(/\/$/, "")}/`;
}

function main(): void {
  const catalog = loadCatalog();
  if (!existsSync(SITEMAP_PATH)) {
    console.warn("sitemap.xml not found, skip");
    return;
  }

  const today = new Date().toISOString().slice(0, 10);
  let pseoLocs: Set<string>;
  let pseoBlocks: string[];

  const ssotIndexable = loadIndexableFromSsot();
  if (ssotIndexable) {
    /** Phase B/C: SSOT 駆動 — indexable（robots=index,follow）のみ sitemap に含める */
    pseoLocs = new Set(ssotIndexable.urls);
    const pseoIndexLoc = `${BASE_URL}/ja/resources/pseo/`;
    const pseoIndexBlock = `    <url>
        <loc>${pseoIndexLoc}</loc>
        <lastmod>${today}</lastmod>
        <changefreq>${CHANGEFREQ}</changefreq>
        <priority>0.75</priority>
    </url>`;
    const pseoArticleBlocks = ssotIndexable.urls.map((loc) => {
      const pri = ssotIndexable.priorityByUrl.get(loc) ?? "0.65";
      return `    <url>
        <loc>${loc}</loc>
        <lastmod>${today}</lastmod>
        <changefreq>${CHANGEFREQ}</changefreq>
        <priority>${pri}</priority>
    </url>`;
    });
    pseoBlocks = [pseoIndexBlock, ...pseoArticleBlocks];
  } else {
    /** フォールバック: allowlist + catalog */
    const pseoMap = loadPseoPagesMap();
    const indexAllowlist = loadIndexAllowlist();
    const pseoPages = catalog.pages.filter((p) => p.lang === "ja");
    const pseoPagesInSitemap = pseoPages.filter((p) => {
      const segment = p.slug.replace(/^\//, "").replace(/\/$/, "").split("/").pop() ?? p.id;
      const record = pseoMap.get(segment);
      if (!record) return false;
      if (indexAllowlist.size === 0 || !indexAllowlist.has(record.final_slug)) return false;
      const indexPath = join(ROOT, "ja", "resources", "pseo", record.final_slug, "index.html");
      return existsSync(indexPath);
    });
    pseoLocs = new Set(pseoPagesInSitemap.map((p) => pseoLoc(p, pseoMap)));
    const pseoEntries = new Map(
      pseoPagesInSitemap.map((p) => {
        const loc = pseoLoc(p, pseoMap);
        return [loc, { loc, priority: priorityForPage(p) }];
      })
    );
    const pseoIndexLoc = `${BASE_URL}/ja/resources/pseo/`;
    const pseoIndexBlock = `    <url>
        <loc>${pseoIndexLoc}</loc>
        <lastmod>${today}</lastmod>
        <changefreq>${CHANGEFREQ}</changefreq>
        <priority>0.75</priority>
    </url>`;
    const pseoArticleBlocks = pseoPagesInSitemap.map((p) => {
      const loc = pseoLoc(p, pseoMap);
      const pri = pseoEntries.get(loc)!.priority;
      return `    <url>
        <loc>${loc}</loc>
        <lastmod>${today}</lastmod>
        <changefreq>${CHANGEFREQ}</changefreq>
        <priority>${pri}</priority>
    </url>`;
    });
    pseoBlocks = [pseoIndexBlock, ...pseoArticleBlocks];
  }

  let sitemap = readFileSync(SITEMAP_PATH, "utf8");
  const pseoPathPattern = /\/ja\/resources\/pseo\//;
  const urlBlockReg = /<url>[\s\S]*?<\/url>/g;
  const nonPseoBlocks: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = urlBlockReg.exec(sitemap)) !== null) {
    const block = m[0];
    const locMatch = block.match(/<loc>([^<]+)<\/loc>/);
    const raw = locMatch ? locMatch[1].trim() : "";
    const loc = raw ? raw.replace(/\/*$/, "") + "/" : "";
    if (loc && (pseoLocs.has(loc) || pseoPathPattern.test(loc))) continue;
    nonPseoBlocks.push(block);
  }

  const urlsetOpen = sitemap.match(/<urlset[^>]*>/)?.[0] ?? "<urlset>";
  const newBody = nonPseoBlocks.join("\n") + (nonPseoBlocks.length ? "\n" : "") + pseoBlocks.join("\n");
  const newSitemap = sitemap.replace(/<urlset[\s\S]*<\/urlset>/, `${urlsetOpen}\n${newBody}\n</urlset>`);
  writeFileSync(SITEMAP_PATH, newSitemap, "utf8");
  const reportDir = dirname(SITEMAP_PREVIEW_PATH);
  if (!existsSync(reportDir)) mkdirSync(reportDir, { recursive: true });
  writeFileSync(SITEMAP_PREVIEW_PATH, newSitemap, "utf8");
  const source = ssotIndexable ? "SSOT indexable" : "allowlist";
  console.log(`sitemap: updated ${pseoBlocks.length} PSEO URL(s) (${source}; changefreq=${CHANGEFREQ})`);
  console.log(`sitemap preview: ${SITEMAP_PREVIEW_PATH}`);

  if (existsSync(ROBOTS_PATH)) {
    let robots = readFileSync(ROBOTS_PATH, "utf8");
    const sitemapLine = `Sitemap: ${BASE_URL}/sitemap.xml`;
    if (!/Sitemap:\s*/i.test(robots)) {
      robots = robots.trimEnd() + "\n" + sitemapLine + "\n";
      writeFileSync(ROBOTS_PATH, robots, "utf8");
      console.log("robots.txt: added Sitemap reference");
    }
  }
}

main();

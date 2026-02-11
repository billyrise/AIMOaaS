/**
 * PSEO 全ページから aimoaas.com/ja/ の内部リンクを抽出し、
 * 実在するパスか検証する。404 になる URL を報告。
 */

import { readFileSync, existsSync, readdirSync } from "fs";
import { join, resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..", "..");
const PSEO_ROOT = join(ROOT, "ja", "resources", "pseo");
const JA_ROOT = join(ROOT, "ja");

const HREF_REG = /href="(https:\/\/aimoaas\.com)(\/ja[^"]*)"/g;

/** /ja 以降のパスを正規化（末尾スラッシュなしでディレクトリ判定） */
function pathToDir(pathSegment: string): string {
  const p = pathSegment.replace(/^\/ja\/?/, "").replace(/#.*$/, "").replace(/\/$/, "") || "index";
  if (p === "index" || p === "") return join(JA_ROOT, "index.html");
  if (p === "aimo-standard") return join(JA_ROOT, "aimo-standard", "index.html");
  if (p.startsWith("resources/")) {
    const rest = p.slice("resources/".length);
    if (rest === "") return join(JA_ROOT, "resources", "index.html");
    const [first, ...parts] = rest.split("/");
    if (first === "pseo") {
      const slug = parts[0];
      return slug ? join(JA_ROOT, "resources", "pseo", slug, "index.html") : "";
    }
    return join(JA_ROOT, "resources", first, "index.html");
  }
  if (p === "audit-firms") return join(JA_ROOT, "audit-firms", "index.html");
  return join(JA_ROOT, p, "index.html");
}

function existsPath(pathSegment: string): boolean {
  const full = pathToDir(pathSegment);
  if (!full) return false;
  if (full.endsWith("index.html")) return existsSync(full);
  return existsSync(join(full, "index.html"));
}

function main(): void {
  if (!existsSync(PSEO_ROOT)) {
    console.error("PSEO root not found:", PSEO_ROOT);
    process.exit(1);
  }
  const validDirs = new Set<string>();
  const pseoSlugs = readdirSync(join(ROOT, "ja", "resources", "pseo"), { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
  const dirs = readdirSync(PSEO_ROOT, { withFileTypes: true }).filter((d) => d.isDirectory());
  const broken: { file: string; url: string; path: string }[] = [];
  const seen = new Set<string>();
  for (const d of dirs) {
    const indexPath = join(PSEO_ROOT, d.name, "index.html");
    if (!existsSync(indexPath)) continue;
    const html = readFileSync(indexPath, "utf-8");
    let m: RegExpExecArray | null;
    HREF_REG.lastIndex = 0;
    while ((m = HREF_REG.exec(html)) !== null) {
      const fullUrl = m[1] + m[2];
      const pathSeg = m[2];
      if (seen.has(fullUrl)) continue;
      seen.add(fullUrl);
      if (pathSeg === "/ja" || pathSeg === "/ja/" || pathSeg.startsWith("/ja/#")) continue;
      const normalized = pathSeg.replace(/\/$/, "") || "/ja";
      const filePath = pathToDir(pathSeg);
      let ok = false;
      if (pathSeg.startsWith("/ja/resources/pseo/")) {
        const slug = pathSeg.replace(/^\/ja\/resources\/pseo\/?/, "").replace(/\/$/, "");
        ok = pseoSlugs.includes(slug);
      } else {
        ok = existsPath(pathSeg);
      }
      if (!ok) {
        broken.push({ file: d.name, url: fullUrl, path: pathSeg });
      }
    }
  }
  if (broken.length === 0) {
    console.log("OK: No broken internal links found in PSEO pages.");
    return;
  }
  console.error("Broken links:");
  for (const b of broken) {
    console.error(`  ${b.file} => ${b.url}`);
  }
  process.exit(1);
}

main();

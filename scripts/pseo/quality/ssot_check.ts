/**
 * Phase 0-2: pseo_pages.json（SSOT）の整合性検証。
 * 100件であること、必須要素・final_slug/final_url 形式をチェックし、不合格なら exit(1)。
 */

import { readFileSync, existsSync } from "fs";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..", "..", "..");
const DATA_PSEO = join(ROOT, "data", "pseo");
const PSEO_PAGES_PATH = join(DATA_PSEO, "pseo_pages.json");

const EXPECTED_COUNT = 100;
const FINAL_URL_PREFIX = "/ja/resources/pseo/";
const FINAL_URL_SUFFIX = "/";

interface PseoPageRecord {
  id: string;
  title: string;
  topic: string | string[];
  slug_base: string;
  final_slug: string;
  final_url: string;
  legacy_url: string;
}

const REQUIRED_KEYS: (keyof PseoPageRecord)[] = [
  "id",
  "title",
  "topic",
  "slug_base",
  "final_slug",
  "final_url",
  "legacy_url",
];

function main(): void {
  if (!existsSync(PSEO_PAGES_PATH)) {
    console.error("SSOT not found:", PSEO_PAGES_PATH);
    process.exit(1);
  }

  const raw = JSON.parse(readFileSync(PSEO_PAGES_PATH, "utf-8")) as {
    pages?: unknown[];
  };
  const pages = Array.isArray(raw.pages) ? raw.pages : [];

  if (pages.length !== EXPECTED_COUNT) {
    console.error(`SSOT count mismatch: expected ${EXPECTED_COUNT}, got ${pages.length}`);
    process.exit(1);
  }

  const errors: string[] = [];
  for (let i = 0; i < pages.length; i++) {
    const p = pages[i] as Record<string, unknown>;
    const id = String(p.id ?? "");

    for (const key of REQUIRED_KEYS) {
      const v = p[key];
      if (v === undefined || v === null) {
        errors.push(`[${id}] missing: ${key}`);
      } else if (typeof v === "string" && v.trim() === "") {
        errors.push(`[${id}] empty: ${key}`);
      } else if (key === "topic" && Array.isArray(v) && v.length === 0) {
        errors.push(`[${id}] topic must be non-empty array or string`);
      }
    }

    const slugBase = String(p.slug_base ?? "").trim();
    const finalSlug = String(p.final_slug ?? "").trim();
    const expectedSlug = `${slugBase}-${id}`;
    if (finalSlug !== expectedSlug) {
      errors.push(`[${id}] final_slug must be "{slug_base}-{id}", got "${finalSlug}", expected "${expectedSlug}"`);
    }

    const finalUrl = String(p.final_url ?? "").trim();
    const expectedUrl = `${FINAL_URL_PREFIX}${finalSlug}${FINAL_URL_SUFFIX}`;
    const normalizedFinal = finalUrl.replace(/\/?$/, "") + "/";
    const normalizedExpected = expectedUrl.replace(/\/?$/, "") + "/";
    if (normalizedFinal !== normalizedExpected) {
      errors.push(`[${id}] final_url must be "/ja/resources/pseo/<final_slug>/", got "${finalUrl}"`);
    }
  }

  if (errors.length > 0) {
    for (const e of errors) console.error(e);
    process.exit(1);
  }

  console.log(`SSOT check OK: ${pages.length} pages, all required fields and format valid.`);
}

main();

/**
 * Verify static pages: html lang matches locale, header/footer show correct language, hamburger script present.
 */
import { readFileSync, existsSync } from "fs";
import { join, resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { getStaticPagesConfig } from "./layout.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..", "..");

// Expected nav_home (or first nav) per locale - to detect wrong language in header
const EXPECTED_NAV_HOME: Record<string, string> = {
  ja: "ホーム",
  en: "Home",
  de: "Startseite",
  es: "Inicio",
  fr: "Accueil",
  it: "Home",
  ko: "홈",
  pt: "Início",
  "zh-CN": "首页",
  "zh-TW": "首頁",
};

// Expected footer operator (or distinctive footer text) per locale
const EXPECTED_FOOTER: Record<string, string> = {
  ja: "運営会社",
  en: "Operator",
  de: "Betreiber",
  es: "Operador",
  fr: "Opérateur",
  it: "Operatore",
  ko: "운영사",
  pt: "Operador",
  "zh-CN": "运营方",
  "zh-TW": "營運方",
};

// html lang attribute expected (some locales use different form e.g. zh-Hans)
const EXPECTED_LANG: Record<string, string[]> = {
  ja: ["ja"],
  en: ["en"],
  de: ["de"],
  es: ["es"],
  fr: ["fr"],
  it: ["it"],
  ko: ["ko"],
  pt: ["pt"],
  "zh-CN": ["zh-CN", "zh-Hans", "zh-cn"],
  "zh-TW": ["zh-TW", "zh-Hant", "zh-tw"],
};

function main(): void {
  const pages = getStaticPagesConfig();
  let ok = 0;
  const errors: string[] = [];

  for (const { path: filePath, locale } of pages) {
    const fullPath = join(ROOT, filePath);
    if (!existsSync(fullPath)) {
      errors.push(`${filePath}: file missing`);
      continue;
    }

    const html = readFileSync(fullPath, "utf8");

    // 1) html lang vs locale
    const langMatch = html.match(/<html[^>]*\slang=["']([^"']+)["']/i);
    const lang = langMatch ? langMatch[1] : "";
    const allowed = EXPECTED_LANG[locale];
    if (!allowed) {
      errors.push(`${filePath}: unknown locale ${locale}`);
      continue;
    }
    if (!lang || !allowed.some((a) => lang.toLowerCase() === a.toLowerCase())) {
      errors.push(`${filePath}: locale=${locale} but lang="${lang}" (expected one of ${allowed.join(", ")})`);
    }

    // 2) Header should contain this locale's nav_home (not another language)
    const expectedNav = EXPECTED_NAV_HOME[locale];
    if (expectedNav && !html.includes(expectedNav)) {
      errors.push(`${filePath}: header missing expected "${expectedNav}" for locale ${locale}`);
    }
    // Cross-check: Japanese nav should not appear on non-ja pages
    if (locale !== "ja" && html.includes("ホーム") && html.includes('id="mobile-menu"')) {
      const headerBlock = html.substring(html.indexOf("<header"), html.indexOf("</header>") + 9);
      if (headerBlock.includes("ホーム")) {
        errors.push(`${filePath}: locale=${locale} but header contains Japanese "ホーム"`);
      }
    }

    // 3) Footer should contain this locale's footer text
    const expectedFoot = EXPECTED_FOOTER[locale];
    if (expectedFoot && !html.includes(expectedFoot)) {
      errors.push(`${filePath}: footer missing expected "${expectedFoot}" for locale ${locale}`);
    }

    // 4) Hamburger script (setProperty) present
    if (!html.includes("setProperty") || !html.includes("mobile-menu") || !html.includes("hamburger-btn")) {
      errors.push(`${filePath}: missing hamburger menu script (setProperty / mobile-menu / hamburger-btn)`);
    }

    ok++;
  }

  if (errors.length > 0) {
    console.error("Static layout verification FAILED:\n");
    errors.forEach((e) => console.error("  " + e));
    process.exit(1);
  }

  console.log(`OK: All ${ok} static pages verified (lang, header, footer, hamburger script).`);
}

main();

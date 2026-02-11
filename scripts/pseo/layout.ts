/**
 * 共通ヘッダー・フッターのレンダリング（data/layout/locales.yaml + templates/partials/）
 * PSEO は locale=ja 固定。他セクション用は path_config と組み合わせて利用する。
 */

import { readFileSync, existsSync } from "fs";
import { join, resolve, dirname } from "path";
import { fileURLToPath } from "url";
import yaml from "js-yaml";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..", "..");
const DATA_LAYOUT = join(ROOT, "data", "layout");
const TEMPLATES_PARTIALS = join(ROOT, "templates", "partials");

type Locale = string;
type LocalesMap = Record<Locale, Record<string, string>>;
type Section = "main_lp" | "aimo_standard" | "audit_firms" | "resources";

const ALL_LOCALES: Locale[] = ["en", "ja", "es", "fr", "de", "pt", "it", "zh-CN", "zh-TW", "ko"];

let cachedLocales: LocalesMap | null = null;
let cachedPathConfig: { path_prefix_by_locale: Record<string, string> } | null = null;

function loadLocales(): LocalesMap {
  if (cachedLocales) return cachedLocales;
  const path = join(DATA_LAYOUT, "locales.yaml");
  if (!existsSync(path)) throw new Error(`locales.yaml not found: ${path}`);
  const raw = readFileSync(path, "utf8");
  cachedLocales = (yaml.load(raw) as LocalesMap) ?? {};
  return cachedLocales;
}

function loadPathConfig(): { path_prefix_by_locale: Record<string, string> } {
  if (cachedPathConfig) return cachedPathConfig;
  const path = join(DATA_LAYOUT, "path_config.json");
  if (!existsSync(path)) throw new Error(`path_config.json not found: ${path}`);
  const raw = readFileSync(path, "utf8");
  const data = JSON.parse(raw) as { path_prefix_by_locale: Record<string, string> };
  cachedPathConfig = { path_prefix_by_locale: data.path_prefix_by_locale ?? {} };
  return cachedPathConfig;
}

function getLocaleIndexUrl(locale: Locale, baseUrl: string): string {
  const cfg = loadPathConfig();
  const p = cfg.path_prefix_by_locale[locale];
  const seg = p === "" ? "" : p + "/";
  return baseUrl.replace(/\/$/, "") + "/" + seg;
}

function getPathPrefix(locale: Locale): string {
  if (locale === "en") return "";
  return locale + "/";
}

/** プレースホルダー {{key}} を一括置換 */
function replacePlaceholders(template: string, vars: Record<string, string>): string {
  let out = template;
  for (const [k, v] of Object.entries(vars)) {
    out = out.replace(new RegExp(`\\{\\{${k}\\}\\}`, "g"), v);
  }
  return out;
}

/**
 * PSEO 用ヘッダー HTML を生成（ja 固定想定。他 locale でも可）
 */
export function renderHeaderPseo(locale: Locale, baseUrl: string): string {
  const locales = loadLocales();
  const L = locales[locale];
  if (!L) throw new Error(`Unknown locale: ${locale}`);

  const prefix = getPathPrefix(locale);
  const homeUrl = baseUrl + "/" + (prefix || "") + (prefix ? "" : "");
  const aimoStandardPath = prefix ? prefix + "aimo-standard/" : "aimo-standard/";
  const practiceGuideUrl = baseUrl + "/ja/resources/pseo/"; // 実務ガイドは現状 ja のみ
  const contactPath = prefix ? prefix + "#contact" : "#contact";

  const vars: Record<string, string> = {
    home_url: homeUrl.endsWith("/") ? homeUrl : homeUrl + "/",
    aimo_standard_url: baseUrl + "/" + aimoStandardPath,
    practice_guide_url: practiceGuideUrl,
    contact_url: baseUrl + "/" + contactPath,
    nav_home: L.nav_home ?? "Home",
    nav_aimo_standard: L.nav_aimo_standard ?? "AIMO Standard",
    nav_practice_guide: L.nav_practice_guide ?? "Practice Guide",
    nav_contact: L.nav_contact ?? "Contact",
    aria_menu: L.aria_menu ?? "Open menu",
  };

  const tplPath = join(TEMPLATES_PARTIALS, "header-pseo.html");
  if (!existsSync(tplPath)) throw new Error(`Header template not found: ${tplPath}`);
  const tpl = readFileSync(tplPath, "utf8");
  return replacePlaceholders(tpl, vars);
}

/**
 * 共通フッター HTML を生成
 * showPracticeGuide: ja のとき true（実務ガイドリンクを表示）
 */
export function renderFooter(locale: Locale, baseUrl: string, options?: { showPracticeGuide?: boolean }): string {
  const locales = loadLocales();
  const L = locales[locale];
  if (!L) throw new Error(`Unknown locale: ${locale}`);

  const prefix = getPathPrefix(locale);
  const homeUrl = baseUrl + (prefix ? "/" + prefix : "/");
  const aimoStandardPath = prefix ? prefix + "aimo-standard/" : "aimo-standard/";
  const practiceGuideUrl = baseUrl + "/ja/resources/pseo/";
  const contactPath = prefix ? prefix + "#contact" : "#contact";

  const practiceGuideLink =
    options?.showPracticeGuide !== false && locale === "ja"
      ? `<a href="${practiceGuideUrl}" class="hover:text-white transition">${L.nav_practice_guide}</a>`
      : "";

  const vars: Record<string, string> = {
    home_url: homeUrl,
    aimo_standard_url: baseUrl + "/" + aimoStandardPath,
    practice_guide_url: practiceGuideUrl,
    contact_url: baseUrl + "/" + contactPath,
    nav_home: L.nav_home ?? "Home",
    nav_aimo_standard: L.nav_aimo_standard ?? "AIMO Standard",
    nav_practice_guide: L.nav_practice_guide ?? "Practice Guide",
    nav_contact: L.nav_contact ?? "Contact",
    footer_operator: L.footer_operator ?? "Operator",
    footer_copyright: L.footer_copyright ?? "© 2025 AIMOaaS™. All rights reserved.",
    footer_provider_phrase: L.footer_provider_phrase ?? "AIMO = AI Management Office. AIMOaaS™ is offered by",
    footer_provider_phrase_after: L.footer_provider_phrase_after ?? ".",
    footer_provider_link: L.footer_provider_link ?? "RISEby inc.",
    practice_guide_link: practiceGuideLink,
  };

  const tplPath = join(TEMPLATES_PARTIALS, "footer.html");
  if (!existsSync(tplPath)) throw new Error(`Footer template not found: ${tplPath}`);
  const tpl = readFileSync(tplPath, "utf8");
  return replacePlaceholders(tpl, vars);
}

/**
 * Build nav link HTML (desktop: hover class; mobile: mobile-nav-link).
 */
function linkItem(href: string, text: string, current: boolean, desktop: boolean): string {
  const cls = desktop
    ? (current ? "text-indigo-600 font-semibold whitespace-nowrap" : "hover:text-indigo-600 transition whitespace-nowrap")
    : "mobile-nav-link";
  return `<a href="${href}" class="${cls}">${text}</a>`;
}

/**
 * Static pages header (main_lp, aimo_standard, audit_firms, resources).
 * Uses path_config and locales; outputs nav, lang switcher, CTA per section.
 */
export function renderHeaderStatic(locale: Locale, section: Section, baseUrl: string): string {
  const locales = loadLocales();
  const L = locales[locale];
  if (!L) throw new Error(`Unknown locale: ${locale}`);

  const prefix = getPathPrefix(locale);
  const base = baseUrl.replace(/\/$/, "");
  const pathSeg = prefix ? prefix.replace(/\/$/, "") + "/" : "";
  const homeUrl = getLocaleIndexUrl(locale, baseUrl);
  const homeUrlSlash = homeUrl.endsWith("/") ? homeUrl : homeUrl + "/";
  const aimoStandardUrl = base + "/" + pathSeg + "aimo-standard/";
  const resourcesUrl = base + "/" + pathSeg + "resources/ai-governance-guide/";
  const practiceGuideUrl = base + "/ja/resources/pseo/";
  const auditFirmsUrl = base + "/" + pathSeg + "audit-firms/";
  const shadowAiUrl = base + "/" + pathSeg + "resources/shadow-ai/";
  const glossaryUrl = base + "/" + pathSeg + "resources/glossary/";
  const contactAnchor = homeUrlSlash + "#contact";
  const mailto = "mailto:contact@aimoaas.com";
  const mailtoPartner = "mailto:contact@aimoaas.com?subject=Partner%20briefing";

  const links: { href: string; text: string; current?: boolean }[] = [];
  if (section === "main_lp") {
    links.push({ href: homeUrlSlash + "#problem", text: L.nav_risk_cost });
    links.push({ href: homeUrlSlash + "#solution", text: L.nav_solution });
    links.push({ href: aimoStandardUrl, text: L.nav_aimo_standard });
    links.push({ href: resourcesUrl, text: L.nav_resources });
    if (locale === "ja") links.push({ href: practiceGuideUrl, text: L.nav_practice_guide });
    links.push({ href: auditFirmsUrl, text: L.nav_audit_firms });
    links.push({ href: homeUrlSlash + "#features", text: L.nav_features });
    links.push({ href: homeUrlSlash + "#plans", text: L.nav_plans });
    links.push({ href: homeUrlSlash + "#faq", text: L.nav_faq });
  } else if (section === "aimo_standard") {
    links.push({ href: homeUrlSlash + "#problem", text: L.nav_risk_cost });
    links.push({ href: homeUrlSlash + "#solution", text: L.nav_solution });
    links.push({ href: aimoStandardUrl, text: L.nav_aimo_standard, current: true });
    links.push({ href: homeUrlSlash + "#features", text: L.nav_features });
    links.push({ href: homeUrlSlash + "#plans", text: L.nav_plans });
  } else if (section === "audit_firms") {
    links.push({ href: homeUrlSlash, text: L.nav_home });
    links.push({ href: homeUrlSlash + "#solution", text: L.nav_solution });
    links.push({ href: aimoStandardUrl, text: L.nav_aimo_standard });
    links.push({ href: auditFirmsUrl, text: L.nav_audit_firms, current: true });
    links.push({ href: auditFirmsUrl, text: L.nav_partner_kit });
  } else {
    // resources
    links.push({ href: homeUrlSlash + "#solution", text: L.nav_solution });
    links.push({ href: aimoStandardUrl, text: L.nav_aimo_standard });
    links.push({ href: homeUrlSlash + "#faq", text: L.nav_faq });
    links.push({ href: shadowAiUrl, text: L.nav_shadow_ai ?? "Shadow AI" });
    links.push({ href: glossaryUrl, text: L.nav_glossary ?? "Glossary" });
  }

  const navLinksDesktop = links.map((l) => linkItem(l.href, l.text, !!l.current, true)).join("\n                        ");
  const navLinksMobile = links.map((l) => linkItem(l.href, l.text, !!l.current, false)).join("\n                    ");

  let langSwitcherHtml: string;
  let mobileLangSwitcherHtml: string;
  if (section === "resources") {
    const otherLocale = locale === "ja" ? "en" : "ja";
    const otherUrl = getLocaleIndexUrl(otherLocale, baseUrl);
    const otherName = (locales[otherLocale]?.lang_name ?? (otherLocale === "ja" ? "日本語" : "English"));
    langSwitcherHtml = `<span class="text-slate-400 flex-shrink-0">|</span><a href="${otherUrl}" class="hover:text-indigo-600 transition whitespace-nowrap text-sm font-medium">${otherName}</a>`;
    mobileLangSwitcherHtml = `<div><p class="mobile-lang-label" style="font-size: 0.6875rem; font-weight: 600; letter-spacing: 0.12em; color: #64748b; margin-bottom: 0.75rem;">Language</p><div class="mobile-lang-grid" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.5rem;"><a href="${otherUrl}" style="padding: 0.625rem 0.875rem; border-radius: 0.5rem; font-size: 0.875rem; font-weight: 500;" class="bg-slate-100 text-slate-700 hover:bg-slate-200">${otherName}</a></div></div>`;
  } else {
    const langOptions = ALL_LOCALES.map(
      (loc) =>
        `<a href="${getLocaleIndexUrl(loc, baseUrl)}" role="menuitem" class="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 lang-option" data-lang="${loc}">${locales[loc]?.lang_name ?? loc}</a>`
    ).join("\n                            ");
    const currentLangName = L.lang_name ?? "English";
    langSwitcherHtml = `<span class="text-slate-400 flex-shrink-0">|</span>
                    <div class="relative flex-shrink-0" id="lang-dropdown-wrap">
                        <button type="button" id="lang-dropdown-btn" class="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-slate-600 hover:bg-slate-100 text-sm font-medium" aria-expanded="false" aria-haspopup="true" aria-label="Select language">
                            <span id="lang-dropdown-label">${currentLangName}</span>
                            <i data-lucide="chevron-down" class="w-4 h-4 text-slate-500"></i>
                        </button>
                        <div id="lang-dropdown-panel" class="absolute right-0 top-full mt-1 w-48 rounded-lg border border-slate-200 bg-white py-1 shadow-lg z-50 hidden" role="menu">
                            ${langOptions}
                        </div>
                    </div>`;
    const mobileLangGrid = ALL_LOCALES.map(
      (loc) =>
        `<a href="${getLocaleIndexUrl(loc, baseUrl)}" class="${loc === locale ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}" style="padding: 0.625rem 0.875rem; border-radius: 0.5rem; font-size: 0.875rem; font-weight: 500;">${locales[loc]?.lang_name ?? loc}</a>`
    ).join("\n                        ");
    mobileLangSwitcherHtml = `<div><p class="mobile-lang-label" style="font-size: 0.6875rem; font-weight: 600; letter-spacing: 0.12em; color: #64748b; margin-bottom: 0.75rem;">Language</p><div class="mobile-lang-grid" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.5rem;">${mobileLangGrid}</div></div>`;
  }

  let ctaHtml: string;
  let mobileCtaHtml: string;
  if (section === "audit_firms") {
    ctaHtml = `<a href="${mailtoPartner}" class="hidden sm:inline-flex bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-full text-sm font-bold transition shadow-lg hover:shadow-indigo-500/30 flex-shrink-0 whitespace-nowrap">${L.nav_partner_briefing}</a>`;
    mobileCtaHtml = `<div class="mobile-cta-wrap" style="padding-top: 0.5rem; border-top: 1px solid #e2e8f0;"><a href="${mailtoPartner}" class="mobile-cta" style="display: block; width: 100%; text-align: center; padding: 1rem 1.25rem; font-size: 1rem; font-weight: 700; color: #fff; background: linear-gradient(135deg, #4f46e5 0%, #4338ca 100%); border-radius: 0.75rem;">${L.nav_partner_briefing}</a></div>`;
  } else if (section === "main_lp" || section === "resources") {
    ctaHtml = `<a href="${section === "main_lp" ? contactAnchor : mailto}" class="hidden sm:inline-flex bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-full text-sm font-bold transition shadow-lg hover:shadow-indigo-500/30 flex-shrink-0 whitespace-nowrap">${section === "main_lp" ? (L.nav_contact_free ?? L.nav_contact) : L.nav_contact}</a>`;
    mobileCtaHtml = `<div class="mobile-cta-wrap" style="padding-top: 0.5rem; border-top: 1px solid #e2e8f0;"><a href="${section === "main_lp" ? contactAnchor : mailto}" class="mobile-cta" style="display: block; width: 100%; text-align: center; padding: 1rem 1.25rem; font-size: 1rem; font-weight: 700; color: #fff; background: linear-gradient(135deg, #4f46e5 0%, #4338ca 100%); border-radius: 0.75rem;">${section === "main_lp" ? (L.nav_contact_free ?? L.nav_contact) : L.nav_contact}</a></div>`;
  } else {
    ctaHtml = "";
    mobileCtaHtml = "";
  }

  const vars: Record<string, string> = {
    home_url: homeUrlSlash,
    nav_links_desktop: navLinksDesktop,
    nav_links_mobile: navLinksMobile,
    lang_switcher_html: langSwitcherHtml,
    mobile_lang_switcher_html: mobileLangSwitcherHtml,
    cta_html: ctaHtml,
    aria_menu: L.aria_menu ?? "Open menu",
    mobile_cta_html: mobileCtaHtml,
  };

  const tplPath = join(TEMPLATES_PARTIALS, "header-static.html");
  if (!existsSync(tplPath)) throw new Error(`Header template not found: ${tplPath}`);
  const tpl = readFileSync(tplPath, "utf8");
  return replacePlaceholders(tpl, vars);
}

/** Path config for static layout injection (path -> locale, section). */
export function getStaticPagesConfig(): { path: string; locale: string; section: string }[] {
  const path = join(DATA_LAYOUT, "path_config.json");
  if (!existsSync(path)) return [];
  const raw = readFileSync(path, "utf8");
  const data = JSON.parse(raw) as { pages: { path: string; locale: string; section: string }[] };
  return data.pages ?? [];
}

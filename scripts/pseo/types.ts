/**
 * Gemini が生成する編集成果物（JSON）の型定義。
 * 本文の主要パーツは SSOT モジュール結合で組み立て、Gemini は以下に限定する：
 * TL;DR / FAQ / Objections & Responses / 内部リンク案 / JSON-LD / メタ
 */

export interface GeminiFaqItem {
  question: string;
  answer: string;
}

export interface GeminiObjectionItem {
  objection: string;
  response: string;
}

export interface GeminiInternalLink {
  text: string;
  href: string;
  page_id?: string;
}

/** FAQPage + Article の JSON-LD。script タグ用に文字列化する想定 */
export interface GeminiJsonLd {
  faqPage?: {
    "@context": "https://schema.org";
    "@type": "FAQPage";
    mainEntity: Array<{
      "@type": "Question";
      name: string;
      acceptedAnswer: {
        "@type": "Answer";
        text: string;
      };
    }>;
  };
  article?: {
    "@context": "https://schema.org";
    "@type": "Article";
    headline?: string;
    description?: string;
    datePublished?: string;
    dateModified?: string;
  };
}

export interface GeminiOutput {
  title: string;
  description: string;
  tldr: string;
  faqs: GeminiFaqItem[];
  objections: GeminiObjectionItem[];
  internal_links: GeminiInternalLink[];
  jsonld: GeminiJsonLd;
}

/** 成果物テンプレの差し込み用（業界/規格/成熟度など） */
export interface ArtifactContext {
  industry?: string;
  standard?: string;
  maturity?: string;
}

/** catalog.yaml の 1 ページ定義 */
export interface CatalogPage {
  id: string;
  lang: string;
  page_type: string;
  slug: string;
  intent_keywords: string[];
  primary_cta: "tier1_free_log_analysis" | "tier2_bpr_sprint" | "exec_onepager_request";
  module_refs: string[];
  references: string[];
  related_pages: string[];
  /** 成果物テンプレ内の {{industry}} {{standard}} {{maturity}} を差し替え */
  artifact_context?: ArtifactContext;
}

export interface Catalog {
  pages: CatalogPage[];
}

/** SSOT モジュールの frontmatter + 本文要約（骨子用） */
export interface ModuleOutline {
  file: string;
  title: string;
  purpose: string;
  headings: string[];
  keyPoints: string[];
}

/** validate.ts の generation-report.json 用 */
export interface ValidationPageResult {
  page_id: string;
  url: string;
  pass: boolean;
  fail: boolean;
  reasons: string[];
  warns?: string[];
  similarity_score?: number;
  similarity_with?: string;
  content_similarity?: number;
  content_similarity_with?: string;
  references_count: number;
  faq_count: number;
  internal_links_count: number;
  page_types_in_links: number;
  table_count: number;
  max_table_rows: number;
  checklist_items_count: number;
  table_cells_count: number;
  intent_keywords_matched: number;
  unique_element_score?: number;
  artifact_types_count?: number;
  /** H2 重複除去で削除した見出し（generate の h2_dedup_fixups.json から） */
  fixups?: string[];
  /** allowlist 選定用: 必須 fail 理由 */
  fail_reasons?: string[];
  /** 警告理由 */
  warn_reasons?: string[];
  /** 検出した data-unique セクション種別 */
  unique_sections?: string[];
  /** CTA リンクが1本以上あるか */
  cta_present?: boolean;
  /** 禁止主張チェック結果 */
  claims_lint?: { pass: boolean; violations: string[] };
  /** ページの topic（pseo_pages から） */
  topic?: string[];
}

export interface GenerationReport {
  generated_at: string;
  pages: ValidationPageResult[];
  summary: { total: number; passed: number; failed: number };
}

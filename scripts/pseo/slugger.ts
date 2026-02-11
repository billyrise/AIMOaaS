/**
 * 日本語タイトル/H1 から「辞書優先」で topic と slug_base を決める。
 * 英語要約禁止・final_slug は必ず "{slug_base}-{id}"。
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "..");
const DEFAULT_DICT_PATH = path.join(ROOT, "data", "pseo", "slug_dictionary.json");

type SlugPolicy = {
  forbid_english_summary: boolean;
  prefer_dictionary: boolean;
  require_id_suffix: boolean;
  final_slug_pattern: string;
  id_format: string;
  lowercase: boolean;
  separator: string;
  max_length: number;
  min_tokens: number;
  max_tokens: number;
  stopwords: string[];
  banned_terms: string[];
  fallback_order: Array<"dictionary" | "safe_generic" | "romaji_short">;
};

type Topic = {
  key: string;
  slug: string;
  priority: number;
  ja_keywords: string[];
  en_keywords: string[];
};

type SlugDictionary = {
  version: string;
  slug_policy: SlugPolicy;
  topics: Topic[];
  safe_generic_tokens: string[];
};

export type SlugResult = {
  id: string;
  title: string;
  topic_keys: string[];
  slug_base: string;
  final_slug: string;
  reason: {
    matched_topics: Array<{ key: string; slug: string; score: number }>;
    fallback_used?: "dictionary" | "safe_generic" | "romaji_short";
    notes: string[];
  };
};

function loadDictionary(dictPath = DEFAULT_DICT_PATH): SlugDictionary {
  const raw = fs.readFileSync(dictPath, "utf-8");
  return JSON.parse(raw) as SlugDictionary;
}

function normalizeText(s: string): string {
  return (s || "")
    .replace(/\s+/g, " ")
    .replace(/['']/g, "'")
    .trim();
}

function containsAny(text: string, needles: string[]): number {
  let c = 0;
  for (const n of needles) {
    if (!n) continue;
    if (text.includes(n)) c += 1;
  }
  return c;
}

function scoreTopic(text: string, topic: Topic): number {
  const jaHits = containsAny(text, topic.ja_keywords);
  const enHits = containsAny(text.toLowerCase(), topic.en_keywords.map((k) => k.toLowerCase()));
  const hits = jaHits + enHits;
  if (hits === 0) return 0;
  return hits * 10 + Math.min(topic.priority, 100);
}

function tokenizeSlugParts(parts: string[], policy: SlugPolicy): string[] {
  const stop = new Set(policy.stopwords.map((s) => s.toLowerCase()));
  const banned = new Set(policy.banned_terms.map((s) => s.toLowerCase()));

  const out: string[] = [];
  for (const p of parts) {
    if (!p) continue;
    const tokens = p.split(policy.separator).filter(Boolean);
    for (let t of tokens) {
      t = t.toLowerCase().trim();
      if (!t) continue;
      if (stop.has(t)) continue;
      if (banned.has(t)) continue;
      out.push(t);
    }
  }

  const trimmed = out.slice(0, policy.max_tokens);
  return trimmed;
}

function joinAndClamp(tokens: string[], policy: SlugPolicy): string {
  let s = tokens.join(policy.separator);
  while (s.length > policy.max_length && tokens.length > policy.min_tokens) {
    tokens.pop();
    s = tokens.join(policy.separator);
  }
  if (s.length > policy.max_length) {
    s = s.slice(0, policy.max_length);
    s = s.replace(new RegExp(`${policy.separator}+$`), "");
  }
  return s;
}

function validateId(id: string, policy: SlugPolicy): void {
  const re = new RegExp(`^${policy.id_format}$`);
  if (!re.test(id)) {
    throw new Error(`Invalid id format: ${id} expected ${policy.id_format}`);
  }
}

function romajiShortFallback(_text: string, policy: SlugPolicy): string {
  const base = tokenizeSlugParts(["ai-governance", "documentation"], policy);
  return joinAndClamp(base, policy);
}

export function buildSlugBaseFromText(
  titleOrH1: string,
  dictPath = DEFAULT_DICT_PATH
): {
  slug_base: string;
  matched: Array<{ key: string; slug: string; score: number }>;
  fallback?: "dictionary" | "safe_generic" | "romaji_short";
  notes: string[];
} {
  const dict = loadDictionary(dictPath);
  const policy = dict.slug_policy;

  const text = normalizeText(titleOrH1);
  const notes: string[] = [];

  const scored = dict.topics
    .map((t) => ({ key: t.key, slug: t.slug, score: scoreTopic(text, t) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length > 0) {
    const picked = scored.slice(0, 3);
    const tokens = tokenizeSlugParts(picked.map((p) => p.slug), policy);

    let finalTokens = tokens;
    if (finalTokens.length < policy.min_tokens) {
      finalTokens = tokenizeSlugParts([...finalTokens, ...dict.safe_generic_tokens], policy);
    }

    const slug_base = joinAndClamp(finalTokens, policy);
    if (!slug_base) {
      notes.push("dictionary matched but slug_base empty after filtering; using safe_generic fallback");
    } else {
      return { slug_base, matched: picked, fallback: "dictionary", notes };
    }
  } else {
    notes.push("no dictionary topic matched; using safe_generic fallback");
  }

  const dict2 = loadDictionary(dictPath);
  const policy2 = dict2.slug_policy;
  const tokens2 = tokenizeSlugParts(dict2.safe_generic_tokens.slice(0, policy2.max_tokens), policy2);
  const slug_base2 = joinAndClamp(tokens2, policy2);
  if (slug_base2) {
    return { slug_base: slug_base2, matched: [], fallback: "safe_generic", notes };
  }

  const slug_base3 = romajiShortFallback(text, policy2);
  return { slug_base: slug_base3, matched: [], fallback: "romaji_short", notes };
}

export function buildFinalSlug(
  id: string,
  titleOrH1: string,
  dictPath = DEFAULT_DICT_PATH
): SlugResult {
  const dict = loadDictionary(dictPath);
  const policy = dict.slug_policy;

  validateId(id, policy);

  const { slug_base, matched, fallback, notes } = buildSlugBaseFromText(titleOrH1, dictPath);

  const final_slug = `${slug_base}${policy.separator}${id}`;
  const cleaned = final_slug.replace(new RegExp(`${policy.separator}{2,}`, "g"), policy.separator);

  return {
    id,
    title: titleOrH1,
    topic_keys: matched.map((m) => m.key),
    slug_base,
    final_slug: cleaned,
    reason: {
      matched_topics: matched,
      fallback_used: fallback,
      notes,
    },
  };
}

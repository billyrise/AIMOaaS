/**
 * Gemini API: 編集成果物（JSON）の生成のみ。
 * モデル・リトライ・バックオフは config から読み込み（モデル固定による運用事故を避ける）。
 */

import { GoogleGenAI } from "@google/genai";
import {
  GEMINI_MODEL,
  MAX_TOKENS,
  RETRY_MAX,
  BACKOFF_INITIAL_MS,
  BACKOFF_MULTIPLIER,
} from "./config.js";
import type { GeminiOutput } from "./types.js";

function isRetryableStatus(status: number): boolean {
  return status === 429 || (status >= 500 && status < 600);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 指数バックオフで待機する時間（ミリ秒）を返す。
 */
function backoffMs(attempt: number): number {
  return BACKOFF_INITIAL_MS * Math.pow(BACKOFF_MULTIPLIER, attempt);
}

/**
 * レスポンステキストから JSON のみを抽出（```json ... ``` を除去）
 */
function extractJson(text: string): string {
  const trimmed = text.trim();
  const codeBlock = /^```(?:json)?\s*([\s\S]*?)```$/m.exec(trimmed);
  if (codeBlock) return codeBlock[1].trim();
  return trimmed;
}

/**
 * 編集成果物用のプロンプトを組み立て、Gemini に送り、GeminiOutput を返す。
 */
export interface GeminiInput {
  intent_keywords: string[];
  references: string[];
  body_outline: { headings: string[]; keyPoints: string[] };
}

export async function generateEditingArtifacts(input: GeminiInput): Promise<GeminiOutput> {
  const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_API_KEY or GEMINI_API_KEY is not set");
  }

  const ai = new GoogleGenAI({ apiKey });
  const prompt = buildPrompt(input);
  let lastError: Error | null = null;

  const config: { responseMimeType: string; maxOutputTokens?: number } = {
    responseMimeType: "application/json",
  };
  if (typeof MAX_TOKENS === "number" && MAX_TOKENS > 0) config.maxOutputTokens = MAX_TOKENS;

  for (let attempt = 0; attempt < RETRY_MAX; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
        config,
      });

      const rawText = (response as { text?: string }).text ?? "";
      if (!rawText) {
        throw new Error("Empty response from Gemini");
      }

      const jsonStr = extractJson(rawText);
      const parsed = JSON.parse(jsonStr) as GeminiOutput;
      validateGeminiOutput(parsed);
      return parsed;
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));

      const errStatus = (lastError as Error & { status?: number }).status;
      const isRetryable =
        (typeof errStatus === "number" && isRetryableStatus(errStatus)) ||
        lastError.message.includes("429") ||
        lastError.message.includes("503") ||
        lastError.message.includes("500") ||
        lastError.name === "SyntaxError" ||
        lastError.message.includes("JSON");

      if (!isRetryable || attempt === RETRY_MAX - 1) {
        throw lastError;
      }

      const wait = backoffMs(attempt);
      await sleep(wait);
    }
  }

  throw lastError ?? new Error("generateEditingArtifacts failed after retries");
}

function buildPrompt(input: GeminiInput): string {
  const { intent_keywords, references, body_outline } = input;
  return `あなたは AIMOaaS の監査・統制の実務ページ用に、編集成果物の JSON のみを出力する担当です。
本文の主要パーツは既に SSOT で組み立て済みです。あなたが生成するのは次の JSON のみです。

## 入力
- 意図キーワード: ${intent_keywords.join(", ")}
- 根拠 URL: ${references.join(", ")}
- 本文骨子（セクション見出し）: ${body_outline.headings.join(" / ")}
- 本文要点: ${body_outline.keyPoints.join(" | ")}

## 出力ルール
- 出力は必ず単一の JSON オブジェクトのみとする。説明文やマークダウンは一切付けない。
- 禁止表現: 「完全準拠」「監査保証」「必ず合格」「100%カバー」等。観点整理・整備支援の表現に留める。
- title: 60 字以内のページタイトル（キーワードを自然に含む）
- description: 120〜160 字の meta description
- tldr: 200〜300 字の TL;DR 導入文
- faqs: 8〜12 件。各 { "question": "質問文", "answer": "回答文" }。重複禁止。意思決定の不安を潰す質問に限定。
- objections: 3 件。各 { "objection": "懸念・反論", "response": "応答" }
- internal_links: 8 本以上。各 { "text": "リンクテキスト", "href": "/ja/resources/pseo/... のパス" }。page_type を横断して関連ページへ。
- jsonld: FAQPage と Article の schema.org 構造。faqPage.mainEntity は faqs と対応。article は headline, description を入れる。

次の JSON スキーマに厳密に従うこと。
{
  "title": "string",
  "description": "string",
  "tldr": "string",
  "faqs": [{"question": "string", "answer": "string"}],
  "objections": [{"objection": "string", "response": "string"}],
  "internal_links": [{"text": "string", "href": "string"}],
  "jsonld": {
    "faqPage": {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": "string", "acceptedAnswer": {"@type": "Answer", "text": "string"}}]},
    "article": {"@context": "https://schema.org", "@type": "Article", "headline": "string", "description": "string"}
  }
}`;
}

function validateGeminiOutput(o: unknown): asserts o is GeminiOutput {
  if (!o || typeof o !== "object") throw new Error("Invalid Gemini output: not an object");
  const r = o as Record<string, unknown>;
  if (typeof r.title !== "string") throw new Error("Invalid Gemini output: missing or invalid title");
  if (typeof r.description !== "string") throw new Error("Invalid Gemini output: missing or invalid description");
  if (typeof r.tldr !== "string") throw new Error("Invalid Gemini output: missing or invalid tldr");
  if (!Array.isArray(r.faqs)) throw new Error("Invalid Gemini output: faqs must be an array");
  if (!Array.isArray(r.objections)) throw new Error("Invalid Gemini output: objections must be an array");
  if (!Array.isArray(r.internal_links)) throw new Error("Invalid Gemini output: internal_links must be an array");
  if (!r.jsonld || typeof r.jsonld !== "object") throw new Error("Invalid Gemini output: jsonld must be an object");
}

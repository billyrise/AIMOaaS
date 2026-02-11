/**
 * PSEO 用の Gemini / 実行設定。モデル固定による運用事故を避けるため、
 * 既定値は安定版を想定し、環境変数で差し替える。
 * モデル停止・非推奨は _policy/model-lifecycle.md に従って対応する。
 */

const env = process.env;

/** 使用する Gemini モデル。未設定時は安定版を想定した既定値（環境で差し替え推奨） */
export const GEMINI_MODEL = env.GEMINI_MODEL || "gemini-2.5-flash";

/** 生成トークン上限（未指定時は API 既定に委ねる） */
export const MAX_TOKENS = env.GEMINI_MAX_TOKENS ? parseInt(env.GEMINI_MAX_TOKENS, 10) : undefined;

/** リトライ最大回数（429/5xx/JSON パース失敗時） */
export const RETRY_MAX = env.GEMINI_RETRY_MAX ? parseInt(env.GEMINI_RETRY_MAX, 10) : 5;

/** 指数バックオフの初期待機時間（ミリ秒） */
export const BACKOFF_INITIAL_MS = env.GEMINI_BACKOFF_INITIAL_MS
  ? parseInt(env.GEMINI_BACKOFF_INITIAL_MS, 10)
  : 1000;

/** バックオフ倍率（attempt ごとに BACKOFF_INITIAL_MS * BACKOFF_MULTIPLIER^attempt） */
export const BACKOFF_MULTIPLIER = env.GEMINI_BACKOFF_MULTIPLIER
  ? parseFloat(env.GEMINI_BACKOFF_MULTIPLIER)
  : 2;

export const pseoConfig = {
  GEMINI_MODEL,
  MAX_TOKENS,
  RETRY_MAX,
  BACKOFF_INITIAL_MS,
  BACKOFF_MULTIPLIER,
} as const;

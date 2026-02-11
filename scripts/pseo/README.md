# PSEO ページ生成スクリプト

- **本文**: SSOT モジュール（`data/pseo/modules/*.md`）を結合して HTML 化。Gemini は「作文」ではなく**編集成果物（JSON）**のみ生成する。
- **Gemini が生成するもの**: TL;DR（200〜300字）、FAQ（8〜12問）、Objections & Responses（3つ）、内部リンク案（8本以上）、JSON-LD（FAQPage + Article）、メタ（title / description / og）。

## 環境変数

**Gemini API キー（generate で必須）**: リポジトリルートに `.env` を置き、`GOOGLE_API_KEY` を設定してください。`.env.example` をコピーして編集できます。キーは [Google AI Studio](https://aistudio.google.com/apikey) で発行できます。

| 変数 | 必須 | 説明 |
|------|------|------|
| `GOOGLE_API_KEY` | はい（generate 時） | Gemini API キー |
| `GEMINI_MODEL` | いいえ | モデル名（未設定時は `config.ts` の既定値。モデル固定による運用事故回避のため環境で差し替え推奨） |
| `GEMINI_MAX_TOKENS` | いいえ | 生成トークン上限 |
| `GEMINI_RETRY_MAX` | いいえ | リトライ最大回数（既定 5） |
| `GEMINI_BACKOFF_INITIAL_MS` | いいえ | バックオフ初期待機 ms（既定 1000） |
| `BASE_URL` | いいえ | 正規 URL のベース（未設定時は `https://aimoaas.com`） |

## 実行

```bash
cd scripts/pseo
npm install
npm run generate
```

単一ページのみ生成する場合:

```bash
npm run generate -- pseo-evidence-pack
```

## 出力先

`data/pseo/catalog.yaml` の `slug` に従う。

- 例: `slug: /ja/resources/pseo/evidence-pack/` → `ja/resources/pseo/evidence-pack/index.html`（リポジトリルート基準）

## 検証（CI）

**推奨フロー**: Phase0 → Validate。CI では `phase0` の後に `validate` を実行する。

```bash
npm run phase0            # SSOT・重複レポート・Search Intent タクソノミー生成
npm run validate
```

（従来）`npm run pseo:similarity` を先に実行すると content_similarity を参照。

**必須ルール (fail)**: H1 が 1 回・H2 同名重複 0・canonical/og:url が final_url・robots が allowlist に基づく・CTA 1 本以上（#contact）・禁止主張パターンのみ（保証/合格/準拠断言）・legacy_url 時は _redirects に 301・content_similarity 同一=fail。

**PR-C ゲート**: (1) **MECE**: 同一 intent_id で index するページは1本まで。`index_allowlist.json` の allow が複数 intent にまたがる場合は、意図ごとに1本だけ残すよう調整する（段階解放時は Pillar のみ index にすると CI が通りやすい）。(2) **重複**: `duplicate_report.json` の near_duplicate_pairs が 0 であること。

**参考 (warn)**: 表行数・FAQ 数・内部リンク数・成果物数など（レポートに記載、fail にはしない）。

レポート: リポジトリルートの `generation-report.json`、`data/pseo/artifacts/report/pseo_quality_report.json`。

## KPI: CTA ベースの優先度（analytics-pull / prioritize）

PV ではなく **CTA（クリック／フォーム送信）** を KPI にし、CVR の高い page_type・産業・規格の「型」を増やす。

1. **analytics_pull**: 直近 N 日（既定 28 日）の pageviews / CTA click / form submit を集計し `data/pseo/metrics.json` に保存。
   - **Cloudflare**: `CF_ZONE_ID` と `CF_API_TOKEN` を設定すると GraphQL で path 別 pageviews を取得。
   - **CTA・フォーム**: 既存計測のエクスポートを `data/pseo/events_export.json` で取り込む。形式は次のいずれか:
     - `{ "by_path": { "/ja/resources/pseo/evidence-pack/": { "cta_clicks": 5, "form_submits": 1 } } }`
     - `{ "events": [ { "path": "/ja/resources/pseo/evidence-pack/", "event_type": "cta_click", "count": 1 } ] }`
2. **prioritize**: `metrics.json` と `catalog.yaml` から CVR を算出し、page_type / 産業 / 規格別にランク。追加候補レポートを `data/pseo/prioritize-report.json` と `prioritize-report.md` に出力（catalog は自動では変更しない）。
3. **CI**: PSEO 生成 PR 作成時に prioritize を実行し、**作るべきページ候補**を PR 本文に含める（人間が採択）。

環境変数（任意）: `PSEO_ANALYTICS_DAYS`（日数）, `EVENTS_EXPORT_PATH`（イベント JSON のパス）, `CF_ZONE_ID` / `CF_API_TOKEN`（Cloudflare）。

## URL 移行（可読スラッグ + 安定 ID・301・noindex 段階解放）

- **ポリシー**: 英語要約禁止。辞書優先で slug_base を組み立て、final_slug は必ず `{slug_base}-{id}`（例: `evidence-pack-evidence-readiness-proof-assurance-a-101`）。canonical/og:url は末尾スラッシュで統一。
- **実行順**（初回または inventory 更新時）:
  1. `npm run inventory`（または `pseo:inventory`）— 在庫を `pseo_inventory.json` に出力（id, final_slug, path, title, h1, canonical, robots）。
  2. `npm run pages:ssot` — slugger で `pseo_pages.json` を生成。
  3. `npm run pseo:ssot-check` — SSOT が 100 件・必須要素・final_slug/final_url 形式を満たすか検証。
  4. （任意）`npm run migrate-urls` — 旧 URL → 新 URL へ移動。**実行前にバックアップ推奨。**
  5. `npm run redirects` — 301 を `_redirects` と `pseo_redirects_preview.txt` に出力。
  6. `npm run pseo:similarity` — ボイラープレート除外後の類似度を `similarity_report.json` に出力。
  7. `npm run validate` — 品質ゲート。`pseo_quality_report.json` を report に出力。
  8. `npm run sitemap`（または `pseo:sitemap`）— sitemap 更新。allowlist 空なら PSEO URL 0 件。`sitemap_preview.xml` を report に保存。
  9. `npx tsx release_candidates.ts` — 解放候補を `index_candidates.md` に出力（人間承認後に allowlist 更新）。
- **既存 HTML のみ修正する場合**（generate を走らせない）: `npm run postprocess:h2-dedup` → `npm run inject:assets` → `npm run postprocess:claims` の順。H2 重複除去を先に行わないと inject した data-unique ブロックが消える。
- **noindex 段階解放**: `data/pseo/index_allowlist.json` の `allow` に final_slug を追加すると、そのページのみ `index,follow`。初期は空（全 PSEO `noindex,follow`）。FAQPage JSON-LD は `faq_schema_allowlist.json` で制御。**allowlist 更新は人間承認のみ。**
- **canonical / Article / 日付・著者（PR-B）**:
  - **robots**: 上記 allowlist で制御。`postprocess:robots` で既存 HTML に一括反映可能。
  - **canonical**: 原則 self。統合時のみ `catalog.yaml` の `canonical_target` または `data/pseo/pseo_meta.json` の `canonical_target` で代表 URL（path または final_slug）を指定可能。
  - **Article 構造化データ**: `datePublished` / `dateModified` / `author` は、catalog の `date_published` / `date_modified` / `author`、または `pseo_meta.json` の同キーで上書き可能。未指定時はビルド日・Organization RISEby。
  - **pseo_meta.json**: 任意。`data/pseo/pseo_meta.example.json` をコピーして `pseo_meta.json` を作成し、catalog の page id をキーに `date_published`, `date_modified`, `author`, `canonical_target` を指定可能。
- **Cloudflare Pages `_redirects` 上限**: 静的リダイレクトは **2,100 ルール**（[Cloudflare Docs](https://developers.cloudflare.com/pages/configuration/redirects/)）。PSEO 100 件では問題ないが、件数が増えた場合は Bulk Redirects や動的ルールの検討を推奨。`redirects.ts` は PSEO ブロックを重複追加せず、既存ブロックを1つ置換する。
- **slugger 自己テスト**: `npm run slugger:smoke`

## 参照

- `scripts/pseo/config.ts`（モデル・リトライ・バックオフの既定値）
- `_policy/model-lifecycle.md`（Gemini モデル停止・非推奨時の移行手順）
- `_policy/page-types.md`（ページ型 A〜E）
- `_policy/content-claims.md`（禁止ワード）
- `data/pseo/catalog.yaml`（SSOT 索引）

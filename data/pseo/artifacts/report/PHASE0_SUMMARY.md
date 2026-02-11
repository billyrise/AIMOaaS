# PSEO Phase 0 現状把握 — 要約レポート

**生成日**: 2026-02-11  
**対象**: /ja/resources/pseo/ 配下 100 ページ

---

## 0-1 ルーティング・フレームワーク特定

| 項目 | 結果 |
|------|------|
| **サイト種別** | 静的サイト（SSG）。Next.js / Nuxt / Astro 等は未使用 |
| **ビルド** | `npm run build` は Tailwind CSS のみ。HTML は事前生成 |
| **PSEO 生成** | Node.js + TypeScript（`scripts/pseo/`）。catalog.yaml + modules/*.md を結合し Gemini で編集成果物を取得 → 静的 HTML を `ja/resources/pseo/<final_slug>/index.html` に出力 |
| **一覧ページ** | `render_pseo_index.ts` が `/ja/resources/pseo/index.html` を生成（現状はリンク集） |

詳細: `docs/PSEO-Phase0-routing-framework.md`

---

## 0-2 PSEO URL 全件エクスポート（SSOT）

- **出力**: `data/pseo/artifacts/report/pseo_url_ssot.json`, `pseo_url_ssot.csv`
- **件数**: 100 ページ（一覧ページ除く）
- **取得元**: ビルド成果物（ファイルシステム） + `data/pseo/pseo_pages.json`。外部クロールなし。

### 列（CSV/JSON）

- url, slug, title, h1, meta_title, meta_description, canonical, robots, lang, hreflang_targets  
- word_count, template_id, cluster_guess, last_modified  
- has_author, has_datePublished, has_dateModified  
- outbound_citations_count, has_unique_diagram, has_downloadable_asset  
- internal_links_out, internal_links_in  
- id, legacy_url  

### 所見（抜粋）

- **robots**: 20 件が `index,follow`（index_allowlist 準拠）、80 件が `noindex,follow`
- **canonical**: 全ページ self-canonical（末尾スラッシュ統一）
- **hreflang_targets**: 現状は空（ja のみのため）
- **has_author / datePublished / dateModified**: 大半が false（構造化データの Article 拡張余地あり）
- **cluster_guess**: evidence-pack, proof-vs-assurance, intake-review-approve, coverage-map, minimum-evidence, other 等に分類済み

---

## 0-3 重複・近似の定量診断

- **出力**: `data/pseo/artifacts/report/duplicate_report.json`
- **方法**: 各ページ本文から共通ボイラープレート（ヘッダー・CTA・内部リンク・References 等）を除去した「差分テキスト」を抽出し、15 文字 shingle の Jaccard 類似度を全ペアで算出。
- **閾値**: 類似度 ≥ 0.85 → ほぼ重複、0.70–0.85 → 近似、< 0.70 → 独立。

### 結果サマリ

| 指標 | 値 |
|------|-----|
| 総ページ数 | 100 |
| **ほぼ重複ペア（≥ 0.85）** | **0** |
| **近似ペア（0.70–0.85）** | **0** |
| 独立と判定されたページ | 100 |

- 最も高い類似度でも約 0.49（例: ai-audit-controls-evidence-pack-minimum と ai-audit-evidence-pack-a-102）で、**現状は「同一意図の言い換え量産」と判定されるほどのテキスト重複は検出されていない**。
- 一方で、**意図の重複（MECE 違反）**は別軸で検証が必要。0-4 の Search Intent タクソノミーで同一 intent_id が複数ページに割り当てられているクラスタは、Pillar 統合・差別化の候補となる。

---

## 0-4 Search Intent タクソノミー（MECE）

- **出力**: `data/pseo/artifacts/report/search_intent_taxonomy.json`
- **意図**: 各ページを次のいずれか **1 つ**に分類（重複禁止）。
  - **A** 成果物が欲しい（テンプレ/チェックリスト/目次/フォーム）
  - **B** 判断基準が欲しい（OK/NG、例外、RACI、責任分界）
  - **C** 実装手順が欲しい（手順/ワークフロー/運用/KPI）
  - **D** マッピングが欲しい（ISO/EU AI Act/NIST 対応表）
  - **E** 設計思想が知りたい（概念・用語・全体像）
  - **F** 事例が知りたい（失敗/監査指摘/是正/業界別）
- **付与**: 対象者タグ（audience_tags）、スコープタグ（scope_tags）を付与済み。

### 意図別ページ数（抜粋）

- **by_intent** により、同一 intent_id に複数ページが属するクラスタが可視化されている。
- Pillar 化時は「同一 intent_id で index するのは 1 本」とする MECE ゲートの入力として利用可能。

---

## 次のアクション（Phase 1 以降）

1. **Phase 1**: noindex/canonical/サイトマップ分離の徹底、robots をデータ駆動で制御。
2. **Phase 2**: クラスタ（Pillar）を 8〜12 に確定し、一覧を「ナビ＋ハブ」に改修。
3. **Phase 3**: intent_id の一意性ゲート（CI）、unique_value_score、E-E-A-T 要素のテンプレ化。
4. **Phase 0 再実行**: `cd scripts/pseo && npm run phase0` で SSOT・重複レポート・タクソノミーを一括更新。

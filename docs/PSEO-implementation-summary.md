# PSEO Phase 0〜6 実装サマリ

## 実施済み

### Phase 0: 現状把握（棚卸し）
- **0-1** ルーティング/フレームワーク: 静的サイト・PSEO は `scripts/pseo` で catalog + modules から生成。→ `docs/PSEO-Phase0-routing-framework.md`
- **0-2** URL 全件 SSOT: `npm run phase0:export-ssot` → `data/pseo/artifacts/report/pseo_url_ssot.json` / `.csv`
- **0-3** 重複・近似診断: `npm run phase0:duplicate-report` → `duplicate_report.json`（閾値 0.85 / 0.70）
- **0-4** Search Intent タクソノミー: `npm run phase0:search-intent` → `search_intent_taxonomy.json`（意図 A–F・対象者・スコープ）
- 一括: `npm run phase0`

### PR-A: Phase0 スクリプト・SSOT
- 上記 Phase0 スクリプトとレポート出力をリポジトリに追加済み。

### PR-B: noindex / canonical / 構造化データ / author / date
- robots: `index_allowlist.json` で制御（既存）。
- canonical: catalog または `pseo_meta.json` の `canonical_target` で代表 URL 指定可能。
- Article: `date_published` / `date_modified` / `author` を catalog または `pseo_meta.json` で指定可能。
- → `docs/PSEO-PR-B-meta-canonical-eeat.md`

### PR-C: MECE ゲート + 重複検知の CI 化
- **MECE**: 同一 intent_id で index 可能なのは1本まで。`validate` 内で `search_intent_taxonomy.json` + `index_allowlist.json` を参照し、違反で exit(1)。
- **重複**: `duplicate_report.json` の `near_duplicate_pairs > 0` で exit(1)。
- 単体: `npm run mece-gate`。CI では `phase0` → `validate` の順で実行。

### PR-D: /ja/resources/pseo/ 一覧のハブ化
- **hub_config.json**: セクション要約・`pillar_slugs`（まず読むべき3本）・`items_per_page`。
- **render_pseo_index.ts**: セクション要約・まず読むべき3本・意図/対象者ラベル・ページネーション（20件/ページ）を出力。
- 生成: `npm run pseo:index`。

### PR-E: Pillar 候補と改稿テンプレ
- **Pillar 3本候補**: P1 Evidence Pack 決定版、P2 Proof/Assurance 責任分界、P3 Evidence readiness 運用KPI。→ `docs/PSEO-Pillar-candidates-and-template.md`
- **改稿テンプレ**: 全ページ共通の骨格（TL;DR・対象者・成果物・手順・判断基準・よくある失敗・参考・CTA）と、P1 用アウトラインを記載。

---

## CI での注意

- **MECE 通過**: 現状の `index_allowlist.json` は同一 intent_id に複数含まれるため、`validate` で MECE に引っかかります。段階解放時は「意図ごとに1本だけ index」にするか、Pillar 3本のみ allow にするなどして調整してください。
- ワークフロー: `Phase0` → `Validate` → `sitemap` → （任意）analytics / prioritize → PR 作成。

---

## 次の運用

1. **段階解放**: Pillar 候補を改稿テンプレに沿って整備 → allowlist に1本ずつ追加 → 2週間評価。
2. **GSC・ログ**: Indexing / Canonical / 検索パフォーマンスを週次確認。
3. **再発防止**: 新規 PSEO 追加時は intent_id の一意性と `phase0` → `validate` を必ず実行。

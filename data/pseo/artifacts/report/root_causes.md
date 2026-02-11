# PSEO 失敗原因の整理（根拠）と対策マッピング

生成日: 2026-02-10  
代表6ページ（topic 分散）で H1/H2・References・ボイラープレート・可読性・robots・canonical・sitemap を点検し、「テンプレ起因」「生成物起因」「validateルール起因」に分類する。

---

## 代表6ページの選定

| # | final_slug | topic 分類 | 用途 |
|---|------------|------------|------|
| 1 | evidence-pack-ai-audit-a-112 | 監査/証跡系 (evidence-pack, ai-audit) | 証拠パック・形式 |
| 2 | responsibility-boundary-proof-assurance-boundary-evidence-d-150 | 監査/証跡系 (proof-assurance, responsibility-boundary) | 役割分界・証跡 |
| 3 | evidence-readiness-proof-assurance-boundary-ai-minimum-evidence-shadow-ai | shadow-ai 系 | 最小証拠・シャドーAI |
| 4 | ai-audit-controls-evidence-pack-minimum | 監査/統制 (ai-audit, controls) | 証拠提出最小要件 |
| 5 | intake-review-approve-ai-audit-controls-request-review-exception | 申請審査/例外系 | 申請・審査・例外 |
| 6 | intake-review-approve-ai-audit-controls-c-131 | 申請審査/監査系 | 申請・監査フロー |

---

## 点検項目と結果（現状＝postprocess_h2_dedup / inject_assets / postprocess_claims 適用後）

### 1. H1/H2 構造（同名重複）

| ページ | 現状 | 分類 | 備考 |
|--------|------|------|------|
| 全6 | H1 は1回。H2 同名重複は postprocess_h2_dedup で除去済み。 | **テンプレ起因（解消済み）** | 従来はモジュール結合で「References」「注意」が複数回挿入されていた。dedup 後処理で解消。 |

**根拠**: h2_dedup_fixups.json に削除した見出しが記録されている。validate 必須「H2 duplicate 0」で全件 PASS。

### 2. References 重複

| ページ | 現状 | 分類 | 備考 |
|--------|------|------|------|
| 全6 | References は末尾1回のみ。 | **テンプレ起因（解消済み）** | generate で各モジュールの ## References を strip し、末尾に page.references で1回追加。既存 HTML は postprocess_h2_dedup で重複章を削除済み。 |

### 3. main 本文のボイラープレート比率

| ページ | 現状 | 分類 | 備考 |
|--------|------|------|------|
| 全6 | topic_assets 注入で data-unique セクションが2種以上。similarity はボイラープレート除外後の content_similarity で評価。 | **生成物起因（緩和済み）** | quality/similarity.ts で CTA・固定ブロック・内部リンク等を除外して本文類似度を算出。allowlist 候補は閾値以下を要求。 |

### 4. 表の可読性（横スクロール・セル折返し・見出し）

| ページ | 現状 | 分類 | 備考 |
|--------|------|------|------|
| 全6 | 表は Tailwind prose のみ。.table-wrap 未適用で狭幅で崩れうる。 | **テンプレ起因** | Phase 3 で .pseo-prose に table 用 CSS と .table-wrap でラップする後処理を追加予定。 |

### 5. robots meta の有無

| ページ | 現状 | 分類 | 備考 |
|--------|------|------|------|
| 全6 | **現行の実 HTML には robots meta が無い。** テンプレには {{pseo_robots}} あり。 | **テンプレ/生成起因** | 既存100件は過去生成で meta が出力されていない可能性。generate 再実行で注入される。未再生成の場合は postprocess で head に追加する必要あり。 |

### 6. canonical / og:url 一致

| ページ | 現状 | 分類 | 備考 |
|--------|------|------|------|
| 全6 | canonical と og:url は final_url（末尾スラッシュ）で一致。 | **validate で必須** | generate は SSOT の final_url を注入。validate で canonical/og:url == final_url を必須 fail にしている。 |

### 7. sitemap 掲載可否（allowlist 連動）

| ページ | 現状 | 分類 | 備考 |
|--------|------|------|------|
| 全6 | sitemap.ts は index_allowlist の final_slug のみ掲載。実在チェックあり。allowlist 空なら PSEO 0件。 | **実装済み** | Phase 1 で実在チェックを明示的に維持。 |

---

## 失敗原因の分類まとめ

| 分類 | 内容 | 対策（実施済み or Phase） |
|------|------|---------------------------|
| **テンプレ起因** | モジュール結合で同名 H2・References が複数回挿入される。表の可読性（overflow）未対応。 | H2/References: postprocess_h2_dedup + generate 側 strip。表: Phase 3 で CSS と table-wrap。 |
| **生成物起因** | ボイラープレートが多く similarity が高い。固有セクション不足。 | topic_assets 注入（inject_assets）、similarity はボイラープレート除外で content_similarity 評価。 |
| **validate ルール起因** | 必須で canonical/og:url/robots/H2重複/禁止主張/固有セクション2以上をチェック。数合わせは warn のみ。 | 必須は事故・品質のみ。warn で数合わせを誘発しない設計。 |

---

## Phase 0 完了条件

- [x] 現状の失敗原因が具体的にレポート化された
- [x] テンプレ／生成／検証のどこで直すべきか明確
- [x] current_inventory.json（id, final_slug, path, title, h1, canonical, robots, og_url）を生成

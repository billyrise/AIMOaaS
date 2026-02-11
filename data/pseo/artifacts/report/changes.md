# PSEO 変更一覧と理由

## テンプレ・パイプライン

| 変更 | 理由 |
|------|------|
| templates/pseo/page.html に .pseo-prose CSS（表・行間・見出し・code） | 可読性の最低ライン確保。Tailwind Typography に依存しない。 |
| 全 <table> を <div class="table-wrap"> でラップ（postprocess_table_wrap + generate） | 狭幅・モバイルで横スクロール可能にし、表崩れを防止。 |
| robots meta を head に必ず出力（{{pseo_robots}} + postprocess_inject_robots） | allowlist 連動で index/noindex を切り替え。既存 HTML にも一括注入。 |
| canonical / og:url を SSOT の final_url に統一 | 重複コンテンツ・URL ずれを防止。validate で必須 fail。 |

## スクリプト・品質

| 変更 | 理由 |
|------|------|
| quality/dedup_headings.ts 新設（H2 重複・References 最後1回のみ） | テンプレ量産に見える同名 H2・複数 References を根絶。generate と postprocess で共通利用。 |
| postprocess_inject_robots.ts | 既存 100 ページに robots を注入（generate 再実行なし）。 |
| postprocess_table_wrap.ts | 既存 HTML の表を .table-wrap でラップ。 |
| validate: canonical/og:url/robots を必須（欠如時 fail） | 事故防止。allowlist と一致しない robots も fail。 |
| validate: pseo_quality_report に topic, fail_reasons, warn_reasons, unique_sections, cta_present, claims_lint | allowlist 選定に使える形に。 |
| release_candidates: index_allowlist.suggested.json / faq_schema_allowlist.suggested.json 出力 | 上書きせず提案のみ。人間が index_allowlist.json に反映。 |
| pseoMap を id と final_slug の両方で引く + topic 付与 | パス解決と topic 分散・レポート用。 |

## データ

| 変更 | 理由 |
|------|------|
| topic_assets: shadow-ai.json, approval-exception.json 追加 | タスクで要求された topic を揃え、inject_assets で選択可能に。 |
| link_map: shadow-ai, approval-exception 追加 | 内部リンクを topic で可変にする基盤。 |
| index_allowlist.json 初期 20 件 | release_candidates の suggested から確定。段階的 index 解放の開始。 |
| faq_schema_allowlist.json 8 件 | FAQ schema を全面展開せず、品質の高い少数に限定。 |

## ドキュメント

| 変更 | 理由 |
|------|------|
| README: _redirects 2,100 ルール・重複追加しない旨 | Cloudflare 制約と運用注意。 |
| FINAL_REPORT.md: 実行順・成果物・週次運用 | デプロイ可能な状態の手順を一元化。 |

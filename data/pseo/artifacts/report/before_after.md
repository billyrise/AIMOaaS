# Before / After（代表4ページ）

代表4ページについて、URL・canonical・robots・見出し・内部リンク・固有セクションの状態を記載する。

## 1. evidence-pack-ai-audit-evidence-pack

| 項目 | Before | After |
|------|--------|-------|
| URL | https://aimoaas.com/ja/resources/pseo/evidence-pack-ai-audit-evidence-pack/ | 同一（final_url） |
| canonical | final_url と一致 | final_url と一致（必須チェック） |
| og:url | canonical と同一 | 同一（必須チェック） |
| robots | なし | noindex,follow → allowlist 投入で index,follow |
| 見出し | H2 重複の可能性 | dedup_headings で同名 H2・References 1 回のみ |
| 表 | ラップなし | .table-wrap で横スクロール対応 |
| 固有セクション | inject_assets で data-unique 2 種以上 | case-study, checklist, findings-fixes 等 |

## 2. evidence-readiness-proof-assurance-boundary-ai-minimum-evidence-shadow-ai

| 項目 | Before | After |
|------|--------|-------|
| URL | final_url で統一 | 同一 |
| canonical / og:url | 一致 | 必須で検証 |
| robots | なし | allowlist により index,follow |
| 見出し | 重複あり得る | dedup 後 1 回のみ |
| 固有セクション | topic_assets shadow-ai を選択 | data-unique 2 種以上 |

## 3. intake-review-approve-ai-audit-controls-request-review-exception

| 項目 | Before | After |
|------|--------|-------|
| URL | final_url | 同一 |
| robots | なし | allowlist で index,follow |
| 固有セクション | approval-exception / governance 等 | data-unique 2 種以上 |
| 内部リンク | 固定に近い | link_map に approval-exception を追加済み（今後の generate で利用可能） |

## 4. ai-audit-monitoring-inventory-inventory-review-cycle

| 項目 | Before | After |
|------|--------|-------|
| URL | final_url | 同一 |
| robots | なし | allowlist で index,follow |
| 表 | 崩れうる | .table-wrap + .pseo-prose で可読性確保 |
| 固有セクション | 2 種以上 | 維持 |

---

共通の After: 全 PSEO で robots meta 必須、canonical/og:url は final_url で一致、H2 同名重複 0、References 1 回、表は .table-wrap、固有セクション 2 種以上。allowlist 20 件のみ index,follow かつ sitemap 掲載。

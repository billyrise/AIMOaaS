# PSEO Phase D: 段階的 index 解放（運用）

Google Search Central に準拠しつつ、scaled content abuse 疑義を避けるための運用方針。

## 原則

- **評価の集約**: 各クラスタで Pillar 1 本（必要なら最大 2 本）に評価を集約する。
- **近似ページ**: noindex,follow + canonical（代表 Pillar）で意図的に Search から除外。
- **言い換え追加禁止**: 同一意図の言い換えページを増やさない（scaled content abuse 回避）。

## 現在の index 対象（Phase A/B 時点）

| クラスタ | Pillar（index） | 備考 |
|----------|-----------------|------|
| Evidence Pack | EP1, EP2 | 決定版ガイド + 証跡バンドル構成 |
| 最小要件 | MIN1 | 統制・証跡・頻度の実践ガイド |
| 最小要件（差別化） | Shadow AI | シャドーAI専用チェックリスト |
| ワークフロー | WORKFLOW1 | 申請・審査・例外ワークフロー |
| 責任分界 | RACI1 | RACI 責任分担ガイド |
| 棚卸・継続監査 | INV1 | 継続監査フローと棚卸サイクル |

**合計**: 一覧に表示される indexable は 7 本（Pillar 6 + Shadow AI 1）。sitemap にはこれら + ハブの 8 URL のみ。

## 段階解放の手順

1. **まず Pillar のみ index**  
   - 現状どおり EP1 / EP2 / MIN1 / WORKFLOW1 / RACI1 / INV1 + Shadow AI の 7 本。
2. **2 週間モニタ**  
   - Search Console（インデックス数・クリック・インプレッション・手動ペナルティ）を確認。
3. **問題なければ**  
   - 各クラスタの Cluster（page_priority=2）を **1 本ずつ** 解放するか検討。  
   - 解放時は `ssot/pseo_pages.json` を更新するのではなく、**SSOT 生成元**（`data/pseo/pseo_pages.json` + `scripts/pseo/build_ssot_phase_a.ts`）のロジックを変更し、`npm run ssot:build` で再生成してから `postprocess:ssot-robots-canonical` と `pseo:index`・`sitemap` を実行。
4. **言い換えページの新規追加は禁止**  
   - 同一 intent_id の新規記事は CI ゲートで FAIL。

## 運用コマンド

| 目的 | コマンド |
|------|----------|
| SSOT 再生成 | `cd scripts/pseo && npm run ssot:build` |
| robots/canonical を全記事に反映 | `npm run postprocess:ssot-robots-canonical` |
| 一覧ページ再生成 | `npm run pseo:index` |
| sitemap 更新 | `npm run sitemap` |
| CI ゲート（MECE/参照/unique_value/タイトル） | `npm run ci-gate` |
| Phase A 一式 | `npm run phase-a` |

## 参照

- [Google 検索セントラル: 役立つコンテンツを作成する](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)
- [スパムポリシー（scaled content abuse）](https://developers.google.com/search/docs/essentials/spam-policies)
- [正規 URL の指定](https://developers.google.com/search/docs/crawling-indexing/canonicalization)
- [インデックス登録のブロック](https://developers.google.com/search/docs/crawling-indexing/block-indexing)

# PSEO 段階的 index 解放 — 総合レポート

## 実施サマリ（Phase 0〜6）

- **Phase 0**: current_inventory.json（id, final_slug, path, title, h1, canonical, robots, og_url）を生成。代表6ページで root_causes.md を整理（テンプレ／生成／validate 起因の分類）。
- **Phase 1**: robots meta を全ページに注入（allowlist のみ index,follow）。canonical/og:url を final_url で必須化。sitemap は allowlist＋実在チェックのみ。_redirects 2,100 ルールを README に明記。
- **Phase 2**: quality/dedup_headings.ts で H2 同名重複・References 最後1回のみを共通化。generate と postprocess_h2_dedup で利用。
- **Phase 3**: templates/pseo に .pseo-prose の表・行間・見出しの可読性 CSS を追加。全 <table> を .table-wrap でラップする後処理と generate 出力時適用。
- **Phase 4**: topic_assets に shadow-ai.json / approval-exception.json を追加。link_map に shadow-ai / approval-exception を追加。inject_assets の topicToAssetKey を拡張。
- **Phase 5**: pseo_quality_report.json に topic, fail_reasons, warn_reasons, unique_sections, cta_present, claims_lint を追加。pseoMap を final_slug でも引けるようにし topic を付与。
- **Phase 6**: release_candidates で index_allowlist.suggested.json / faq_schema_allowlist.suggested.json を出力。初期 allowlist 20 件・FAQ schema 8 件を確定。npm scripts を揃え、運用順を文書化。

## 実行順（推奨）

```bash
cd scripts/pseo
npm run pseo:inventory
npm run pseo:pages:ssot
npm run pseo:ssot-check
npm run pseo:redirects
# 必要に応じて: npm run generate
npm run pseo:dedup
npm run pseo:inject-assets
npm run postprocess:robots
npm run postprocess:table-wrap
npm run pseo:similarity
npm run pseo:validate
npm run pseo:sitemap
npm run pseo:release-candidates
```

## 成果物一覧

| パス | 説明 |
|------|------|
| `data/pseo/artifacts/report/current_inventory.json` | id, final_slug, path, title, h1, canonical, robots, og_url |
| `data/pseo/artifacts/report/root_causes.md` | 失敗原因の分類（テンプレ／生成／validate） |
| `data/pseo/artifacts/report/pseo_quality_report.json` | pass/fail, fail_reasons, warn_reasons, content_similarity, unique_sections, cta_present, claims_lint, topic |
| `data/pseo/artifacts/report/similarity_report.json` | content_similarity、クラスタ |
| `data/pseo/artifacts/report/index_candidates.md` | 解放候補の根拠一覧 |
| `data/pseo/artifacts/report/sitemap_preview.xml` | sitemap プレビュー（allowlist 件数のみ） |
| `data/pseo/index_allowlist.json` | index 解放する final_slug（初期 20 件） |
| `data/pseo/faq_schema_allowlist.json` | FAQ schema を出す final_slug（8 件） |
| `data/pseo/index_allowlist.suggested.json` | release-candidates の提案（上書きしない） |

## 運用（週次）

1. `npm run pseo:validate` で必須 fail 0 を確認。
2. `npm run pseo:release-candidates` で index_candidates.md と suggested を更新。
3. 人間が index_allowlist.suggested.json を確認し、問題なければ index_allowlist.json に反映（PR）。
4. `npm run postprocess:robots` → `npm run pseo:sitemap` で robots と sitemap を更新。
5. 「量産っぽさ」が戻ったら index 解放を止め、topic_assets / dedup / similarity ルールを優先修正。

## デプロイ・制約

- **Cloudflare Pages**: _redirects は 2,100 ルールまで（[Cloudflare Docs](https://developers.cloudflare.com/pages/configuration/redirects/)）。PSEO 増加時は Bulk Redirects 検討。
- **index 解放**: allowlist の final_slug のみ index,follow かつ sitemap 掲載。それ以外は noindex,follow。
- **断定禁止**: 保証・合格・準拠の断言は禁止。AIMOaaS は Proof（証跡整備支援）。Assurance は監査側/企業側。

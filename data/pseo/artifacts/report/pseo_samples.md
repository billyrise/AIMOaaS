# PSEO 代表ページ構造サンプル（Phase 0）

代表4件: a-101, c-131, d-150, e-175 の H 構造・JSON-LD・canonical・内部リンク・FAQ・重複を整理。

## 共通テンプレ由来

- **生成**: `scripts/pseo/generate.ts` → `templates/pseo/page.html` + `partials/cta.html`, `partials/trust.html`
- **本文**: catalog `module_refs` の Markdown を `marked` で HTML 化 + `render_artifacts.ts` で成果物セクション追加
- **Gemini**: TL;DR, FAQ, internal_links, jsonld (FAQPage + Article)

## a-101（Evidence Pack 系）

- **H1**: 1回
- **H2**: Evidence Bundle 構造の要約 / Evidence Bundle の位置づけ / 最小構成の観点（表）/ **References** / Evidence Pack 表テンプレート / 表テンプレート（観点）/ **注意** / **References** / Evidence Pack 目次と最小要件の観点 / 目次に含める観点（例）/ 最小要件（形式・保持）/ **References** / Evidence Pack のよくある形式 / 形式の例（観点）/ **注意** / **References** / よくある欠落と是正の観点 / 欠落と是正の観点（例）/ **注意** / **References** / 証跡・Evidence 関連用語の対応表 / 用語の観点（表）/ **References** / 最小要件表 / 監査質問集（抜粋）/ RACI（簡易）/ 役割分担の整理 / よくある質問 / 次に読む
- **重複**: H2「References」複数回、「注意」複数回。同一モジュール由来の章が並列で References を繰り返している。
- **canonical**: `https://aimoaas.com/ja/resources/pseo/a-101`（末尾スラッシュなし）
- **og:url**: 同上
- **JSON-LD**: FAQPage + Article（author/publisher/mainEntityOfPage 等は未確認）
- **内部リンク**: 「次に読む」で固定リンクセット
- **FAQ**: H3 で 10 問、FAQPage schema あり

## c-131, d-150, e-175

- いずれも同様に H2 の「References」「注意」が複数回出現。モジュール単位で References セクションが挿入されているため。
- canonical/og:url は各ページで `.../c-131`, `.../d-150`, `.../e-175`（末尾スラッシュなし）。
- JSON-LD: FAQPage + Article の 2 本 script。
- 内部リンク: テンプレ/生成で固定の「次に読む」リンク。

## テンプレ修正箇所（Phase 3 で対応）

1. **見出し重複**: モジュール結合で「References」を章ごとに出さず、本文末尾に 1 回のみ。または脚注形式に統合。
2. **H2 同名禁止**: 同一 H2 文字列の重複を検出し、番号付きまたは統合する。
3. **canonical/og:url**: テンプレで変数化し、final_url（末尾スラッシュあり）を注入。
4. **FAQ schema**: 全ページ一律ではなく allowlist で限定（Phase 2–3）。
5. **内部リンク**: 固定 8 本ではなく topic クラスタ別 link_map で可変に（Phase 3）。

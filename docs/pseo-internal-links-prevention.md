# PSEO「次に読む」リンク切れの原因と再発防止

## 事象

- 実サイトで PSEO ページ下部の「次に読む」リンクが多数 404 になっていた。
- 例: `/ja/resources/ai-governance/`, `/ja/resources/risk-management/`, `/ja/resources/compliance/`, `/ja/resources/data-governance/`, `/ja/resources/audit-logs/` などはリポジトリに存在しない。

## 原因

1. **generate が Gemini の `internal_links` をそのまま出力していた**
   - Gemini は「推奨リンク」を生成するが、実在する URL のみに制限されていない。
   - そのため存在しない `/ja/resources/...` が出力され、デプロイ後に 404 が発生した。

2. **実在 URL の SSOT がなかった**
   - どのパスがデプロイされているかの一元管理がなく、生成結果の検証も行われていなかった。

## 実施した修正

### 1. 既存 100 ページの一括修正（postprocess）

- **スクリプト**: `scripts/pseo/postprocess_internal_links.ts`
- **処理**: 全 PSEO の「次に読む」セクションを、**実在 URL のみ**の固定ブロックに差し替え。
- **実在として扱った URL**:
  - `/ja/`, `/ja/aimo-standard/`, `/ja/#contact`
  - `/ja/resources/shadow-ai/`, `human-in-the-loop/`, `glossary/`, `ai-governance-guide/`, `eu-ai-act/`, `governance-as-code/`, `maturity-checklist/`, `shadow-ai-governance-guide/`, `case-studies/`
  - `/ja/resources/pseo/` 配下の PSEO ページ（link_map で参照している final_slug のみ）

### 2. 今後の generate でリンク切れを出さない（再発防止）

- **generate.ts の変更**:
  - `data/pseo/link_map.json` を読み込み、**link_map の common + ページ topic に紐づくリンクのみ**で「次に読む」を組み立てる。
  - `options.internalLinksHtml` で render に渡すため、Gemini の `internal_links` は使わない（link_map がある場合）。
  - link_map の href はすべて実在パス（PSEO は final_slug、その他はコミット済みリソース）に限定する運用とする。

- **運用ルール**:
  - **link_map.json** に追加する href は、必ず `git ls-files ja/resources/` または `ja/aimo-standard` 等に存在するパスのみにする。
  - 新規リソースを追加したら、必要に応じて link_map の common または topic 用リンクに追加してよい。
  - Gemini の internal_links は「参考」とし、出力には link_map 由来の HTML のみを使う。

### 3. 実行順での組み込み

- 既存 HTML を触る場合:  
  `npm run postprocess:internal-links` で「次に読む」を実在 URL のみに揃えられる。  
  `npm run postprocess:fix-broken-urls` で本文・References 含む不正 URL（audit-logs, data-governance, compliance, ai-governance）を一括置換できる。
- リンク検証:  
  `npm run pseo:check-links` で PSEO 全ページの内部リンクを検証し、404 になる URL を報告する。
- 新規 generate 時:  
  `link_map.json` と `pseo_pages.json`（topic 付き）があれば、generate 時点で実在 URL のみのリンクが入る。

## 次回以降、同様の事象を防ぐために

1. **link_map を SSOT にする**  
   「次に読む」に出す URL はすべて link_map（common + 各 topic）で定義し、そこにないパスは出力しない。

2. **新規パスを link_map に足すとき**  
   必ず `ja/resources/...` または PSEO の final_slug がリポジトリに存在することを確認してから追加する。

3. **CI / 手動チェック（任意）**  
   - デプロイ前や PR 時に、PSEO 本文中の `href="https://aimoaas.com/ja/resources/` を抽出し、  
     `git ls-files` または静的リストと照合するスクリプトを回すと、リンク切れを検知しやすい。

4. **postprocess の実行**  
   既存 100 ページを再生成せずに直す場合は、  
   `npm run postprocess:fix-broken-urls` と `npm run postprocess:internal-links` を実行してからデプロイする。

5. **本番でまだ 404 が出る場合**  
   リポジトリ上ではリンク修正済みでも、本番が古いビルドを配信していると 404 が残る。  
   Cloudflare Pages 等で **該当ブランチ（または main）の最新コミットから再デプロイ** し、ビルド出力に修正済み HTML が含まれることを確認する。
以上を守れば、同様のリンク切れの再発を防げる。

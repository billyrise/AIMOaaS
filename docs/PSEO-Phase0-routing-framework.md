# PSEO Phase 0-1: ルーティング・フレームワーク特定

## サイトの技術スタック

| 項目 | 判定結果 |
|------|----------|
| **フレームワーク** | **SSG（静的サイト）** — Next.js / Nuxt / Astro 等の SPA/SSR フレームワークは未使用 |
| **ビルド** | `package.json` の `build` は `tailwindcss` の CSS ビルドのみ。HTML は事前生成 |
| **ホスティング** | Cloudflare Pages（`_redirects`・docs 参照） |
| **PSEO ページ生成** | Node.js + TypeScript（`scripts/pseo/`）で静的 HTML を生成し、`ja/resources/pseo/{final_slug}/index.html` に配置 |

## /ja/resources/pseo/ のページ生成方式

1. **データソース（SSOT）**
   - **catalog.yaml**（`data/pseo/catalog.yaml`）: ページ定義（id, lang, page_type, slug, intent_keywords, module_refs, references, related_pages）。slug は従来の短いパス（例: `/ja/resources/pseo/evidence-pack/`）。
   - **pseo_pages.json**（`data/pseo/pseo_pages.json`）: 現在の公開用 SSOT。`id`, `topic`, `slug_base`, `final_slug`, `final_url`, `legacy_url`。URL は **final_slug**（`{slug_base}-{id}`）で一意。
   - **モジュール**（`data/pseo/modules/*.md`）: Markdown の SSOT 本文。frontmatter + body。複数モジュールを catalog の `module_refs` で結合。

2. **生成フロー**
   - `npm run generate`（`scripts/pseo/generate.ts`）: catalog を読み、module_refs でモジュールを結合 → Gemini で TL;DR / FAQ / メタ等の編集成果物を取得 → 静的 HTML を **catalog.slug のパス**に出力。
   - **URL 移行後**: 実際のファイルは **final_slug** 配下に存在。`scripts/pseo/inventory.ts` は `ja/resources/pseo/` をスキャンし、`pseo_pages.json` の `final_slug` と突き合わせて id を解決。`scripts/pseo/migrate-urls.ts` で短い slug → 長い final_slug へ移動済み。

3. **一覧ページ**
   - **生成**: `scripts/pseo/render_pseo_index.ts` が `/ja/resources/pseo/index.html` を生成。
   - **内容**: PSEO 全ページへのリンク一覧（カード形式）。現状は「リンク集」であり、PHASE 2 で「ナビ＋ハブ」（要約・フィルタ・ページネーション）へ改修予定。

## まとめ

- **ルーティング**: 静的ファイルベース。`/ja/resources/pseo/{final_slug}/` → `ja/resources/pseo/{final_slug}/index.html`。
- **テンプレ**: `templates/pseo/` および generate.ts 内の HTML 組み立て。layout は `layout.ts`（renderHeaderStatic, renderFooter）で共通注入。
- **ページ数**: 100 件（pseo_pages.json / 実ディレクトリと一致）。

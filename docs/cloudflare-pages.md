# Cloudflare Pages での公開設定

## 既存記事を正常に公開する（推奨設定）

**既に作った PSEO 記事（100本）を本番で確実に表示する**ための設定です。

Cloudflare Dashboard → **Workers & Pages** → プロジェクト → **Settings** → **Builds & deployments** で次にしてください。

| 項目 | 設定値 |
|------|--------|
| **Framework preset** | None |
| **Build command** | `exit 0`（または未入力のまま） |
| **Build output directory** | `/` または `.`（リポジトリルート） |
| **Root directory** | （空欄のまま） |

- **Production branch**: `main` のままにすると、`main` へ push するたびに本番（aimoaas.com）が更新されます。
- この設定ならビルドが失敗しにくく、`ja/resources/pseo/` 以下がそのまま本番に含まれ、既存記事が正常に公開されます。

## プロジェクトの作成手順（Git 連携）

1. [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Workers & Pages** → **Create** → **Connect to Git**
2. **GitHub** を選び、リポジトリ `billyrise/AIMOaaS` を選択
3. **Build settings** で上記のとおり設定
4. **Save and Deploy** で初回デプロイ
5. カスタムドメイン（例: aimoaas.com）は **Custom domains** から追加

## 既存記事が公開されているか確認する

本番デプロイ後、次の URL が開けば既存記事は正常に公開されています。

- トップ: `https://aimoaas.com/ja/`
- 記事の例: `https://aimoaas.com/ja/resources/pseo/evidence-pack-evidence-readiness-proof-assurance-a-101/`

**Settings** → **Builds & deployments** で **Production branch** が `main` になっていること、および **Build output directory** が上記のとおり **ルート**（`/` または `.`）になっていることを確認してください。別の設定（例: `dist`）のままでも、ビルドコマンドで `prepare-deploy.sh` を実行していれば `ja/` は配信されますが、**既存記事を確実に出すだけなら「exit 0 + ルート」が一番簡単**です。

## デプロイ後のURL

- プレビュー: `https://<project-name>.pages.dev`
- 本番: カスタムドメインを設定した場合は `https://aimoaas.com`

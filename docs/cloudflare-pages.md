# Cloudflare Pages での公開設定

## 外部に公開しないパス

リポジトリには PSEO 生成用の `data/`, `scripts/`, `_policy/`, `templates/` 等を含めますが、**本番では配信しません**。  
ビルド時に `scripts/prepare-deploy.sh` で公開用ファイルだけを `dist/` にコピーし、その `dist/` をデプロイします。

- **配信しない（外部から参照不可）**: `data/`, `scripts/`, `_policy/`, `.github/`, `docs/`, `templates/`, `.env.example`

## ビルド設定（ダッシュボード）

Cloudflare Dashboard → **Workers & Pages** → プロジェクト → **Settings** → **Builds & deployments** で次を設定してください。

| 項目 | 設定値 |
|------|--------|
| **Framework preset** | None |
| **Build command** | `bash scripts/prepare-deploy.sh` |
| **Build output directory** | `dist` |
| **Root directory** | （空欄のまま＝リポジトリルート） |

### 補足

- **Build command**: `prepare-deploy.sh` が公開用ファイルのみを `dist/` にコピーします。
- **Build output directory**: `dist` を指定すると、`data/` や `scripts/` はアップロードされず、URL で参照できません。

## プロジェクトの作成手順（Git 連携）

1. [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Workers & Pages** → **Create** → **Connect to Git**
2. **GitHub** を選び、リポジトリ `billyrise/AIMOaaS` を選択
3. **Build settings** で上記のとおり設定
4. **Save and Deploy** で初回デプロイ
5. カスタムドメイン（例: aimoaas.com）は **Custom domains** から追加

## デプロイ後のURL

- プレビュー: `https://<project-name>.pages.dev`
- 本番: カスタムドメインを設定した場合は `https://aimoaas.com`

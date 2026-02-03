# Cloudflare Pages での公開設定

このサイトは静的 HTML のため、ビルド処理は不要です。

## ビルド設定（ダッシュボード）

Cloudflare Dashboard → **Workers & Pages** → プロジェクト → **Settings** → **Builds & deployments** で次を設定してください。

| 項目 | 設定値 |
|------|--------|
| **Framework preset** | None |
| **Build command** | `exit 0`（または未入力のまま） |
| **Build output directory** | `/` または `.`（リポジトリルート） |
| **Root directory** | （空欄のまま＝リポジトリルート） |

### 補足

- **Build command**: 静的サイトのためビルドは行いません。プリセット未使用時は `exit 0` を指定すると「成功」と判定され、そのままアップロードされます（[公式](https://developers.cloudflare.com/pages/configuration/build-configuration/)）。
- **Build output directory**: 配信するファイルがリポジトリのルート（`index.html`, `ja/`, `aimo-standard/`, `assets/` など）にあるため、出力ディレクトリは **ルート** にします。

## プロジェクトの作成手順（Git 連携）

1. [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Workers & Pages** → **Create** → **Connect to Git**
2. **GitHub** を選び、リポジトリ `billyrise/AIMOaaS` を選択
3. **Build settings** で上記のとおり設定
4. **Save and Deploy** で初回デプロイ
5. カスタムドメイン（例: aimoaas.com）は **Custom domains** から追加

## デプロイ後のURL

- プレビュー: `https://<project-name>.pages.dev`
- 本番: カスタムドメインを設定した場合は `https://aimoaas.com`

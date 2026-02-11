# GitHub Actions で使う Secrets（API キー等）の登録場所

PSEO 自動生成ワークフロー（`.github/workflows/pseo-generate-pr.yml`）をオンラインで動かすには、次の Secrets をリポジトリに登録してください。

## 登録手順

1. GitHub で **billyrise/AIMOaaS** を開く
2. **Settings** → **Secrets and variables** → **Actions**
3. **New repository secret** で以下を追加

## 必須

| Secret 名 | 説明 | 取得方法 |
|-----------|------|----------|
| **GOOGLE_API_KEY** | Gemini API キー（PSEO 記事生成に使用） | [Google AI Studio](https://aistudio.google.com/apikey) で「Create API key」→ 値をコピー |
| **GH_TOKEN** | ブランチ push と PR 作成用。未設定だと Checkout で `Input required and not supplied: token` になる | GitHub → 右上アイコン → **Settings** → **Developer settings** → **Personal access tokens** → **Tokens (classic)** で「Generate new token」→ `repo` と `workflow` にチェック → トークンをコピー |

- **GH_TOKEN** を登録しない場合、ワークフローは `GITHUB_TOKEN`（デフォルト）で Checkout を試みます。多くの場合は PR 作成まで動きますが、組織のポリシーで制限されている場合は **GH_TOKEN**（PAT）の登録が必要です。

## 任意（Analytics 連携）

| Secret 名 | 説明 |
|-----------|------|
| **CF_ZONE_ID** | Cloudflare ゾーン ID（analytics-pull 用） |
| **CF_API_TOKEN** | Cloudflare API トークン（analytics-pull 用） |

未設定でもワークフローは実行され、analytics-pull だけスキップされます。

## まとめ

- **API キー・トークンの格納場所**: リポジトリの **Settings** → **Secrets and variables** → **Actions** で「New repository secret」から追加。
- 値は画面に再表示されないため、発行時に必ずコピーしてから登録すること。

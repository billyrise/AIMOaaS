# PSEO PR-B: noindex / canonical / 構造化データ / author / date

## 概要

- **robots**: 既存どおり `data/pseo/index_allowlist.json` の `allow`（final_slug の配列）で制御。generate 時に反映され、`npm run postprocess:robots` で既存 HTML に一括反映可能。
- **canonical**: 原則として自ページ URL（final_url・末尾スラッシュ）。統合時のみ、代表ページへ向けるために **canonical_target** を指定可能。
- **構造化データ（Article）**: `datePublished` / `dateModified` / `author` を catalog または `pseo_meta.json` で指定可能。未指定時はビルド日・Organization RISEby。

## データで制御する項目

### 1. catalog.yaml（1 ページあたり）

任意で以下を追加可能。

```yaml
- id: pseo-evidence-pack
  # ... 既存フィールド ...
  date_published: "2025-01-15"
  date_modified: "2026-02-01"
  author: { name: "RISEby inc.", url: "https://riseby.net" }
  # 統合時のみ: 代表ページの path または final_slug
  # canonical_target: "/ja/resources/pseo/evidence-pack-minimum/"
  # canonical_target: "evidence-pack-minimum"
```

- **date_published** / **date_modified**: `YYYY-MM-DD`。未指定時はビルド日。
- **author**: `{ name: string, url?: string }` または文字列。未指定時は `Organization "RISEby inc."`。
- **canonical_target**: 指定時、その URL を canonical に使用。先頭が `/` なら path、そうでなければ final_slug として解釈し、`/ja/resources/pseo/<final_slug>/` に解決。

### 2. pseo_meta.json（任意）

catalog を触らずに日付・著者・canonical だけ上書きしたい場合は、`data/pseo/pseo_meta.example.json` をコピーして `data/pseo/pseo_meta.json` を作成し、**catalog の page id** をキーに指定する。

```json
{
  "pages": {
    "pseo-evidence-pack": {
      "date_published": "2025-01-15",
      "date_modified": "2026-02-01",
      "author": { "name": "RISEby inc.", "url": "https://riseby.net" }
    },
    "a-101": {
      "canonical_target": "evidence-pack-evidence-readiness-proof-assurance-a-101"
    }
  }
}
```

- **pseo_meta** の値は catalog の同キーを上書きする。
- **canonical_target** に final_slug を指定した場合、`pseo_pages.json` から final_url を解決する。

## テンプレ・出力

- **templates/pseo/page.html**: 既存の `{{pseo_robots}}` / `{{canonical}}` / `{{date_modified_display}}` / `{{json_ld_article}}` をそのまま利用。
- **generate.ts**: 上記の catalog / pseo_meta を読み、Article の `datePublished` / `dateModified` / `author` と、canonical URL を組み立ててテンプレに渡す。

## ロールバック

- catalog の `date_published` / `date_modified` / `author` / `canonical_target` を削除すれば、従来どおりビルド日・RISEby・self-canonical に戻る。
- `pseo_meta.json` を削除またはリネームすれば、catalog のみの設定になる。

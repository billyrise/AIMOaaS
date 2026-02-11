# 一次情報モジュール（SSOT）

ページの核となる本文はここで SSOT 化する。AI は編集・FAQ 化・構造化データ化・差分更新のみ担当し、主要パーツは本モジュールから組み立てる（AI 大量生成と見なされない設計）。

## 書式ルール（全ファイル共通）

- **YAML frontmatter（必須）**
  - `title`: モジュールのタイトル
  - `purpose`: 目的（1 文）
  - `audience`: 想定読者
  - `last_reviewed`: 最終確認日（YYYY-MM-DD）

- **本文**
  - 表・チェックリスト・フローを中心とし、文章は最小限にする。
  - 断定・誇張禁止。`_policy/content-claims.md` に従う。

- **References（必須）**
  - 根拠リンク（AIMO Standard、規制・標準の公式等）を必ず含める。

## 参照

- `_policy/page-types.md`（ページ型 A〜E）
- `_policy/content-claims.md`（禁止ワード・許容表現）
- `data/pseo/catalog.yaml`（ページ定義と module_refs）

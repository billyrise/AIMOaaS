# PSEO 成果物テンプレート（一次情報）

AIMOaaS の運用で使う成果物テンプレを YAML で管理する。生成ページに埋め込み、「人が作った実務コンテンツ」に見えるようにする。

## ファイル

| ファイル | 内容 |
|----------|------|
| evidence_pack_outline.yaml | Evidence Pack 目次（セクション・項目） |
| audit_questions.yaml | 監査で聞かれる質問 → 必要証跡 |
| control_catalog.yaml | 統制項目 → 証跡 → ログ/運用記録 → 頻度（最小要件表） |
| raci_templates.yaml | 申請・承認・例外の RACI（簡易） |

## ページ固有の差し込み

catalog の各ページに `artifact_context` を追加すると、テンプレ内の `{{industry}}` `{{standard}}` `{{maturity}}` が置換される。

```yaml
# catalog.yaml の page 例
- id: pseo-evidence-pack
  artifact_context:
    industry: 製造業
    standard: AIMO Standard
    maturity: レベル2
```

## 参照

- `scripts/pseo/render_artifacts.ts`（HTML 表・出力）
- `_policy/content-claims.md`（断定禁止）

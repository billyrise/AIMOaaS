# AIMOaaS 編集・公開ワークフロー（責任主体の明確化）

コンテンツの公開責任は人間が負う。CI は「PR 作成・検証」までとし、main への自動 push は行わない。

---

## 原則

- **GitHub Actions（CI）の役割**：PR の作成、validate（NG フレーズ・出典・ポリシー整合等）の実行まで。
- **main への反映**：**人間が最終承認し、マージして公開する。** 自動 push はしない。
- **責任主体**：公開コンテンツの責任は、PR を承認・マージした者（および組織）が負う。

---

## ワークフロー概要

1. **コンテンツ作成・更新**  
   ブランチで編集。`_policy/seo-policy.md`・`_policy/content-claims.md` に従う。

2. **PR の作成**  
   必要に応じて CI が PR を自動作成することは可。その PR に対して validate を実行する。

3. **Validate**  
   - NG フレーズ・禁止ワードの検出  
   - References（根拠リンク）の有無  
   - 責任分界（Proof/Assurance）の明示有無  
   - 1 ページ 1 CTA 等、seo-policy で定める必須要件  
   → **PASS でない場合は main にマージしない。**

4. **Human approval**  
   - レビュアーが内容を確認し、**PR を Approve** する。  
   - 承認後、main へマージする（手動または merge ボタン）。  
   - 自動 merge は、ポリシー上使用しない（責任の所在を曖昧にしないため）。

5. **公開**  
   - main へのマージをもって、本番反映（デプロイ）の対象とする。  
   - デプロイ方法（Cloudflare Pages 等）は別途設定に従う。

---

## CI で行わないこと

- **main への直接 push**：しない。
- **validate 未完了・未承認のマージ**：しない。
- **人間の承認をバイパスする自動マージ**：しない（オプトインの例外は組織で明示的に定める場合のみ）。

---

## 参照

- `_policy/seo-policy.md`（公開条件：validate PASS + human approval）
- `_policy/content-claims.md`（禁止ワード・許容表現）

# PSEO Pillar 候補と改稿テンプレ（PR-E）

## 段階 index で最初に解放する Pillar 3本（候補）

| # | タイトル（案） | 対応 slug / 既存ページ | 意図 | 備考 |
|---|----------------|------------------------|------|------|
| P1 | Evidence Pack 決定版：監査添付できる最小要件（目次テンプレ付） | `evidence-pack-ai-audit-evidence-pack` を改稿して Pillar 化 | A（成果物が欲しい） | 目次テンプレDL・チェックリスト10項目以上・一次ソース3本以上 |
| P2 | Proof（証跡生成）と Assurance（保証判断）の責任分界：監査法人との協業モデル | `proof-assurance-boundary-responsibility-boundary-ai-proof-vs-assurance` または新規 | B（判断基準が欲しい） | RACI雛形への導線・責任分界のOK/NG |
| P3 | Evidence readiness を回す運用KPI：遅延・例外率・再現性・監査工数 | `ai-audit-controls-inventory-continuous-audit-workflow` を改稿 | C（実装手順が欲しい） | KPI一覧・四半期レビューチェックリスト |

- **解放手順**: 上記のいずれかを「Pillar 改稿テンプレ」に沿って改稿 → `index_allowlist.json` に該当 final_slug を追加 → `hub_config.json` の `pillar_slugs` の先頭に配置 → 2週間評価後に次の Pillar を追加。
- **MECE**: 同一 intent_id で index するのは1本まで（validate の MECE ゲートで検知）。

---

## Pillar 改稿テンプレ（全ページ共通の“骨格”)

以下を満たすと「Pillar 候補」として段階 index しやすい。

1. **冒頭**
   - **TL;DR**: このページで得られるものを3点（箇条書き）。
   - **誰向け / いつ使うか**: 対象者タグ（CISO・監査法人・法務等）を1行で明示。

2. **成果物**
   - ダウンロード可能なテンプレ or チェックリスト10項目以上 or 目次雛形のいずれか。
   - 本文中に「成果物あり（DL）」などラベルを付与可能に。

3. **手順**
   - ステップ or ワークフロー（番号付き）。KPI がある場合は一覧。

4. **判断基準**
   - OK/NG 基準、例外条件、RACI の観点のいずれかを整理。

5. **よくある失敗（監査指摘の形）**
   - 指摘例 → 是正観点を1〜2例。断定は避ける。

6. **参考**
   - 外部一次ソース3本以上（規格・公的機関・公式ガイダンス）。AIMO Standard へのリンク。

7. **CTA**
   - 低温：DL → 中温：比較表 → 高温：相談。既存 CTA ブロックを流用可。

---

## P1 用 改稿アウトライン（実例）

**対象 slug**: `evidence-pack-ai-audit-evidence-pack`（既存を拡張して Pillar 化）

- **H2 構成案**
  1. このページで得られること（TL;DR 3点）
  2. 誰向け・いつ使うか
  3. Evidence Pack とは（最小要件の定義・AIMO Standard の位置づけ）
  4. 監査添付の最小要件（表：項目・形式・保持期間の観点）
  5. 目次テンプレ（ダウンロード or 本文に埋め込み）
  6. チェックリスト（10項目以上：棚卸・変更履歴・方針・ログ・レビュー・申請・例外・保持期間・RACI紐づけ・更新頻度）
  7. よくある監査指摘と是正の観点（2例）
  8. 参考（AIMO Standard、規制・監査要請へのリンク 3本以上）
  9. 次に読む / CTA

- **差別化ポイント**
  - 固有の「目次テンプレ」を1本用意（モジュール or 別アセット）。
  - 表・チェックリストはこのページ専用の内容にし、他ページと文言のコピーを避ける。
  - `date_published` / `date_modified` を `pseo_meta.json` または catalog で設定。

改稿後は `npm run validate` で MECE・重複・品質ゲートを通し、`index_allowlist.json` に追加してから段階解放する。

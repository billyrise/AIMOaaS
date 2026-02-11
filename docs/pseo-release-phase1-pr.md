# PSEO 第1段公開範囲 — PR 手順

## 状態

- ブランチ `feat/pseo-release-phase1` をローカルで作成済み（main から 8 コミット進んだ状態）
- リモート push は権限の都合で未実行のため、**手元で push と PR 作成が必要です**

## 手順（マージはしない）

### 1. ブランチを push

```bash
cd /Users/bill/Library/CloudStorage/OneDrive-ライズバイ株式会社/AIMO/AIMOaaS
git checkout feat/pseo-release-phase1
git push -u origin feat/pseo-release-phase1
```

### 2. PR を作成（GitHub CLI）

```bash
gh pr create --base main --head feat/pseo-release-phase1 \
  --title "PSEO 第1段公開範囲: allowlist 20件 index 解放・品質ゲート整備" \
  --body "## 概要
- PSEO Phase 0〜6 の成果を第1段の公開範囲としてまとめました。
- **index 解放**: allowlist 20件のみ index,follow・sitemap 掲載。それ以外は noindex,follow。
- マージはレビュー後に手動でお願いします。

## 含まれる主な変更
- Phase 0: current_inventory / root_causes
- Phase 1: robots meta 注入、canonical/og:url 必須化
- Phase 2: dedup_headings（H2・References 重複除去）
- Phase 3: 表の可読性 CSS・table-wrap
- Phase 4: topic_assets（shadow-ai, approval-exception）・link_map
- Phase 5: 品質レポート形式（topic, fail_reasons, unique_sections 等）
- Phase 6: allowlist 20件・FAQ schema 8件・FINAL_REPORT・npm scripts
- 第1段: sitemap allowlist 20件掲載・current_inventory 更新"
```

### 3. マージはしない

- PR は作成のみ。マージはレビュー・承認後に手動で行ってください。

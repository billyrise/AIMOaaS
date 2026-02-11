# Gemini モデルライフサイクル運用

Gemini API ではモデルの停止・非推奨告知がある。**モデル固定による運用事故を避ける**ため、以下を運用とする。

---

## 1. 定期確認

- **対象**: [Gemini API Release notes / Changelog](https://ai.google.dev/gemini-api/docs/changelog) を定期確認する。
- **頻度**: 四半期または月 1 回を目安。告知前に「モデル deprecation」「shutdown」「sunset」等のキーワードで検索する。
- **確認内容**:
  - 現在 `scripts/pseo/config.ts` の既定モデル（または CI で利用している `GEMINI_MODEL`）の停止・非推奨告知の有無
  - 推奨代替モデル（replacement）の案内

---

## 2. モデル停止が告知された場合の移行手順

1. **告知の確認**
   - Changelog / Release notes で停止予定日と代替モデル名を確認する。
   - 例: Gemini 2.0 Flash 系の shutdown 告知（例: 2026 年 3 月 31 日等）と、代替として Gemini 3 Flash Preview 等の案内。

2. **既定値の更新**
   - `scripts/pseo/config.ts` の `GEMINI_MODEL` の既定値を、**告知で推奨された代替モデル**に変更する。
   - 例: `gemini-2.0-flash` → `gemini-2.5-flash` または `gemini-3-flash-preview`（公式案内に従う）。

3. **環境変数での上書き**
   - CI（GitHub Actions）やローカルで `GEMINI_MODEL` を設定している場合は、**停止日前に**同じ代替モデルに更新する。
   - Secrets: `GOOGLE_API_KEY` はそのままでよい。`GEMINI_MODEL` のみ差し替え。

4. **動作確認**
   - `scripts/pseo` で `npm run generate -- <1ページid>` を実行し、編集成果物 JSON が問題なく取得できることを確認する。
   - 必要に応じて `npm run validate` で既存品質基準を満たすことを確認する。

5. **ドキュメントの更新**
   - 本ファイル（`_policy/model-lifecycle.md`）の「参考リンク」や「過去の移行」に、実施した移行内容（旧モデル → 新モデル、日付）を追記する。

---

## 3. 参考リンク

- [Gemini API – Release notes / Changelog](https://ai.google.dev/gemini-api/docs/changelog)
- [Gemini API – Models](https://ai.google.dev/gemini-api/docs/models)
- リポジトリ: `scripts/pseo/config.ts`（既定モデル・リトライ・バックオフ）

---

## 4. 過去の移行メモ（テンプレ）

| 実施日       | 旧モデル              | 新モデル               | 理由           |
|--------------|------------------------|------------------------|----------------|
| （例）YYYY-MM-DD | gemini-2.0-flash       | gemini-2.5-flash       | 2.0 Flash 停止告知 |

---

## 5. 運用の原則

- **モデル名はコードに直書きしない**。`config.ts` の既定値または環境変数 `GEMINI_MODEL` で指定する。
- **停止告知を見逃さない**。定期確認をカレンダーまたはタスクに組み込む。
- **停止日前に移行を完了する**。告知から停止日までに余裕がない場合でも、可能な限り早く既定値と CI の環境変数を更新する。

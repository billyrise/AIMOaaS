# AIMOaaS Programmatic SEO 運用ポリシー

Google の [Spam policies](https://support.google.com/webmasters/answer/9047305)（scaled content abuse）および [Helpful content / People-first](https://developers.google.com/search/docs/fundamentals/creating-helpful-content) に準拠し、ランキング操作目的のスケール生成に該当しない設計・運用を強制する。

---

## 目的

- **PV 最大化ではない。** AIMOaaS の「監査に耐える Evidence Pack 整備」「申請／審査／例外／更新の運用統制」を必要とする企業からの **CTA（相談／無料ログ分析／資料請求）の最大化** を目的とする。
- 検索意図に合致した、一次情報と成果物中心のコンテンツで、責任主体の明確な導線を提供する。

---

## 禁止事項（scaled content abuse に該当しないための制約）

- **一般論 SEO 記事の量産**：汎用キーワード向けの薄い解説の大量作成は行わない。
- **AI モデル最適化・プロンプト講座**：AIMOaaS の提供範囲（ログベース検知・Evidence Pack・運用代行）と無関係な「AI 活用講座」系コンテンツの量産は行わない。
- **外部記事の言い換え**：他サイト・メディアの記事をそのまま言い換えただけのコンテンツは掲載しない。
- **根拠のない統計・数値**：出典のない「〇〇％」「年間〇〇円」等の断定は禁止。条件付き・例示・公式リンク付きに限定する。
- **準拠保証・監査保証の断定**：「完全準拠」「監査保証」「必ず合格」等の保証表現は使用しない（詳細は `content-claims.md` を参照）。
- **実在しない連携・機能**：未リリースの API・クラウド完結サービス・連携先を「提供中」として記載しない。
- **同型テンプレ長文の大量公開**：同一構造・同じ言い回しの長文を URL だけ変えて大量に公開しない。

---

## 必須要件（Helpful / People-first の実装）

- **一次情報の含意**
  - AIMO Standard 参照、AIMOaaS 実務テンプレ、監査実務の観点を織り込む。
  - 自社の提供範囲（Evidence Pack、24/365 運用、責任分界）に基づく記述とする。
- **成果物中心**
  - チェックリスト・表・フロー・RACI 等、読者がそのまま使える成果物形式を優先する。
  - 抽象論より「何を整備するか」「何が成果物か」を明示する。
- **References（根拠リンク）必須**
  - 規制・標準・統計を引用する場合は、公式または信頼できる出典へのリンクを必ず付与する。
- **責任分界（Proof / Assurance）の明示**
  - AIMOaaS が提供するのは「証憑（Proof）」であり、監査結論・保証は監査法人等の責任（Assurance）であることを、必要なページで明示する。
- **CTA は 1 ページ 1 目的**
  - 相談・無料ログ分析・資料請求など、1 ページにつき主たる CTA を 1 つに絞り、混在・過多にしない。
- **ページ型の限定**
  - Programmatic で生成するページは、`_policy/page-types.md` で定義する 5 種類（A〜E）のみとする。それ以外の型は生成しない。

---

## 公開条件

- **validate に PASS**：リポジトリで定義するコンテンツ検証（NG フレーズ・出典・責任分界等）をパスすること。
- **Human approval（PR approve）を必須**：main へのマージは、人間による PR 承認の後にのみ行う。自動 push は行わない（`editorial-workflow.md` を参照）。

---

## 参照

- [Google Search Central – Spam policies](https://support.google.com/webmasters/answer/9047305)
- [Google Search – Creating helpful, reliable, people-first content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)
- リポジトリ内：`_policy/page-types.md`（ページ型 5 種限定）、`_policy/content-claims.md`、`_policy/editorial-workflow.md`、`_policy/i18n-policy.md`（Phase 1–4 は ja のみ）、`docs/SEOサイト更新計画.md`、`docs/改稿-ページ一覧とNGフレーズ.md`

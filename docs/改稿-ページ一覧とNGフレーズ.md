# aimoaas.com 全ページ改稿：ページ一覧・ファイルパス・NGフレーズ

**日本語ブログ・記事の追加ルール**（`.cursor/rules/ja-blog-writing.mdc`）  
- タイトルのテーマについて非常に知識と経験の深い専門家として執筆する。  
- ファクトベースで推測は禁止。  
- 日本語は英語混在を禁止（固有名詞・商標・規格名は初出のみ「日本語（英語）」でよい。以降は日本語のみ）。

## 1. ページ一覧（URL / ファイルパス / 言語 / ページタイプ）

| URL | ファイルパス | 言語 | ページタイプ |
|-----|--------------|------|--------------|
| / | index.html | EN | Type A: トップ/ランディング |
| /ja/ | ja/index.html | JA | Type A: トップ/ランディング |
| /audit-firms/ | audit-firms/index.html | EN | Type B: 監査法人向け |
| /ja/audit-firms/ | ja/audit-firms/index.html | JA | Type B: 監査法人向け |
| /partners/audit-firms/ | partners/audit-firms/index.html | EN | Type B 関連 |
| /ja/partners/audit-firms/ | ja/partners/audit-firms/index.html | JA | Type B 関連 |
| /aimo-standard/ | aimo-standard/index.html | EN | Type D: 仕様/標準 |
| /ja/aimo-standard/ | ja/aimo-standard/index.html | JA | Type D |
| /resources/case-studies/ | resources/case-studies/index.html | EN | Type E: ケーススタディ |
| /ja/resources/case-studies/ | ja/resources/case-studies/index.html | JA | Type E |
| /resources/shadow-ai/ | resources/shadow-ai/index.html | EN | Type C: リスク説明 |
| /ja/resources/shadow-ai/ | ja/resources/shadow-ai/index.html | JA | Type C |
| /resources/ai-governance-guide/ | resources/ai-governance-guide/index.html | EN | Type C/リソース |
| /ja/resources/ai-governance-guide/ | ja/resources/ai-governance-guide/index.html | JA | Type C |
| /resources/shadow-ai-governance-guide/ | resources/shadow-ai-governance-guide/index.html | EN | Type C |
| /ja/resources/shadow-ai-governance-guide/ | ja/resources/shadow-ai-governance-guide/index.html | JA | Type C |
| /resources/eu-ai-act/ | resources/eu-ai-act/index.html | EN | Type C/D |
| /ja/resources/eu-ai-act/ | ja/resources/eu-ai-act/index.html | JA | Type C/D |
| /resources/aimo-analysis-engine/ | resources/aimo-analysis-engine/index.html | EN | リソース |
| /ja/resources/aimo-analysis-engine/ | ja/resources/aimo-analysis-engine/index.html | JA | リソース |
| /resources/glossary/ | resources/glossary/index.html | EN | リソース |
| /ja/resources/glossary/ | ja/resources/glossary/index.html | JA | リソース |
| /resources/governance-as-code/ | resources/governance-as-code/index.html | EN | リソース |
| /ja/resources/governance-as-code/ | ja/resources/governance-as-code/index.html | JA | リソース |
| /resources/human-in-the-loop/ | resources/human-in-the-loop/index.html | EN | リソース |
| /ja/resources/human-in-the-loop/ | ja/resources/human-in-the-loop/index.html | JA | リソース |
| /resources/maturity-checklist/ | resources/maturity-checklist/index.html | EN | リソース |
| /ja/resources/maturity-checklist/ | ja/resources/maturity-checklist/index.html | JA | リソース |
| /de/, /es/, /fr/, /it/, /ko/, /pt/, /zh-CN/, /zh-TW/ | 各 index.html, aimo-standard/index.html | 各言語 | Type A / Type D |

※ 404.html は本文改稿対象外。

### 他言語版 index.html 改稿状況（EN/JA 方針に準拠）

- **実施済み**：de, es, fr, it, ko, pt, zh-CN, zh-TW の各 `index.html`
  - メタ（description / og / twitter）、JSON-LD、ヒーロー（Alarm/Alert 削除→観測＋「検証可能・監査に添付可能な証拠」の各言語訳＋Evidence Pack・2–4週間＋CTA）、問題（68%等の定性化・EU AI Act 公式リンク）、ソリューション（ツールは検知／監査は再構成＋Evidence Pack・24/365）、AIMO Standard（Evidence Bundle と最小証拠要件—一つの証拠基盤で複数規制＋Coverage Map 説明）を統一。
- **未実施**：各言語の `aimo-standard/index.html`（必要に応じて EN `aimo-standard/index.html` を参照して「Unifying / aligned / compliant」連打を避け、Coverage Map の範囲・限界を説明する文言に揃える）。

---

## 2. EN/JA 対応表（同一ページのペア）

| EN | JA |
|----|-----|
| index.html | ja/index.html |
| audit-firms/index.html | ja/audit-firms/index.html |
| partners/audit-firms/index.html | ja/partners/audit-firms/index.html |
| aimo-standard/index.html | ja/aimo-standard/index.html |
| resources/case-studies/index.html | ja/resources/case-studies/index.html |
| resources/shadow-ai/index.html | ja/resources/shadow-ai/index.html |
| resources/ai-governance-guide/index.html | ja/resources/ai-governance-guide/index.html |
| resources/shadow-ai-governance-guide/index.html | ja/resources/shadow-ai-governance-guide/index.html |
| resources/eu-ai-act/index.html | ja/resources/eu-ai-act/index.html |
| resources/aimo-analysis-engine/index.html | ja/resources/aimo-analysis-engine/index.html |
| resources/glossary/index.html | ja/resources/glossary/index.html |
| resources/governance-as-code/index.html | ja/resources/governance-as-code/index.html |
| resources/human-in-the-loop/index.html | ja/resources/human-in-the-loop/index.html |
| resources/maturity-checklist/index.html | ja/resources/maturity-checklist/index.html |

---

## 3. NGフレーズ検出一覧（該当箇所と修正方針）

| ファイル | 該当箇所（要約） | 修正方針 |
|----------|------------------|----------|
| index.html | "Emergency Alert: Shadow AI" | 削除。観測1文＋定義＋成果物に置換 |
| index.html | "turn risk into a strategic asset" | OK(EN)に置換：証跡・差し戻し削減の一文 |
| index.html | "EU AI Act ready" / "NIST AI RMF aligned" / "AIMO Standard compliant" | Coverage Map 説明＋脚注リンクへ |
| index.html | "Free Shadow AI Assessment" | 「2–4週間でEvidence Pack（棚卸・変更履歴・草案）を提示」に |
| index.html | "68% reality gap" | 出典付きにするか削除し定性的表現へ |
| index.html | "annual waste in the millions" | 条件付き／例示注記または削除 |
| index.html | "7% of global revenue" | EU AI Act 公式出典URLを脚注で明記 |
| index.html | "Tools alone are not enough. Consulting alone does not operate." | OK(EN)に置換（監査で求められる再構成） |
| index.html | "Three Hidden Costs" 3点連打 | 2つ具体＋観測の詰まりに再構成 |
| index.html | "end-to-end governance" | 具体（Evidence Pack の中身）に置換 |
| index.html | Cost Saving "Avg 20%" | 出典 or 例示注記 or 削除 |
| ja/index.html | "Emergency Alert: Shadow AI" | 削除。観測＋定義＋成果物（日本語） |
| ja/index.html | "リスクを経営資源に" | OK(JA)に置換 |
| ja/index.html | "Shadow AI Discovery (可視化)" | 見出しは日本語のみ「シャドーAIの可視化」 |
| ja/index.html | "Our Solution" | 「サービス概要」など日本語に |
| ja/index.html | 68%・7%・数百万円 | 出典 or 条件付き or 削除 |
| audit-firms/index.html | "Turn AI governance evidence into a repeatable, margin-positive offering" | 監査の詰まり＋責任分界＋成果物の順に |
| audit-firms/index.html | "Ready to partner?" | 「何がもらえるか」を明記したCTAに |
| resources/case-studies/index.html | "Replace with real metrics as engagements complete" | 削除。プロトタイプ/サンプルと明記しBefore/Afterで差を示す |
| resources/case-studies/index.html | "target: e.g. 30–50%" | 条件付き or 削除。KPI捏造禁止 |
| partners/audit-firms/index.html | "Shadow AI and agentic AI are expanding..." | 証跡の欠落・差し戻しの観点で具体化 |

---

## 4. 数値・出典の扱い（方針）

- **68%**（個人AI利用）：出典を付与するか、定性的に「多くの組織でポリシーがあっても個人利用が残る」に変更。
- **7% EU AI Act**：規制公式サイトへのリンクを脚注で追加。
- **年間数百万円 / millions**：自社ログ集計なら「集計条件」を一言、否則「例示」「一般的にあり得る例」と注記。
- **Cost Saving Avg 20%**：同様に条件付き or 削除。
- **30–50% audit prep time**（Case Studies）：目標値として条件付きで記載するか削除。

以上を前提に、Home → Audit Firms → Case Studies の順で改稿を実施する。

---

## 5. 改稿実施サマリ（Before / After）

### Home（EN）index.html

| ブロック | Before | After |
|----------|--------|--------|
| ヒーロー見出し | Emergency Alert: Shadow AI / Your employees are using "Shadow AI" right now. | 観測1文：「In many audits, the bottleneck isn’t policy. It’s reconstructing “who used what, when, and with which data” from scattered logs.」＋見出し「Verifiable evidence from logs—auditor-attachable.» |
| ヒーロー本文 | Policy alone cannot prevent… turn risk into a strategic asset. | AIMOaaS reduces re-work in audits by producing verifiable, auditor-attachable evidence from logs—continuously. Evidence Pack: inventory, change ledger, validated evidence bundle draft. First outputs in 2–4 weeks. |
| CTA | Free Shadow AI Assessment | Get Evidence Pack scope & sample outline |
| バッジ | NIST aligned / EU AI Act ready / AIMO Standard compliant | 1行：Mapped to EU AI Act, ISO/IEC 42001, NIST AI RMF (Coverage Map) |
| 問題セクション | Three Hidden Costs / 68% reality gap / millions / 7% | Where audits get stuck—Policy vs. actual use / Cost and sprawl / Regulatory expectations（定性的＋EU AI Act公式リンク） |
| ソリューション | Tools alone are not enough. Consulting alone does not operate. | Tools detect. Audits require reconstruction: who used what, when, with which data, and with what approvals. AIMOaaS combines log-based discovery, Evidence Pack generation, optional 24/365 operations. |
| ダッシュボード | Cost Saving Avg 20% | Cost visibility / By tier |

### Home（JA）ja/index.html

| ブロック | Before | After |
|----------|--------|--------|
| ヒーロー | Emergency Alert: Shadow AI / 御社の社員は…「シャドーAI」を使っています / リスクを「最強の経営資源」に | 観測1文：「現場で詰まるのは『方針』ではなく…」＋見出し「ログから、監査調書に添付できる証跡を。」＋本文は差し戻し削減・Evidence Pack・2〜4週間 |
| CTA | 無料相談・診断のご案内を申し込む | Evidence Pack のスコープ・サンプル目次をもらう |
| 問題 | 3つの隠れた損失 / 68%の実態乖離 / 数百万円 / 最大7% | 監査で詰まる理由とその解消 / ポリシーと実態のギャップ / コストとスプロール / 規制・ガイドラインの要請（定性的＋EU AI Act公式リンク） |
| ソリューション | Our Solution / ツールだけでは守れません | 提供内容 / 検知だけでは足りません。監査で求められるのは再構成。 |
| 見出し英語削除 | Shadow AI Discovery (可視化) | ログに基づく可視化。Evidence readiness → 証拠の準備。Cost Saving Avg 20% → コスト可視化・ティア別。 |

### Audit Firms（EN）audit-firms/index.html

| ブロック | Before | After |
|----------|--------|--------|
| タイトル下 | Turn AI governance evidence into a repeatable, margin-positive offering. | Evidence chaos and re-requests erode margins. Evidence Packs attachable to working papers; AIMO = Proof, your firm = Assurance. |
| 構成 | The Problem → What we provide… | **Responsibility boundary（先に）** → Where it hurts → What we provide… |
| CTA | Ready to partner? | What you get: partner briefing, sample Evidence Pack outline, delivery playbook. |

### Audit Firms（JA）ja/audit-firms/index.html

| ブロック | Before | After |
|----------|--------|--------|
| H1 | AIMOaaS for Audit Firms | 監査法人の皆さまへ |
| タイトル下 | 証憑を繰り返し提供可能でマージンの出るオファリングに | 証拠の乱立と差し戻しがマージンを削る。監査調書に貼れるEvidence Pack。責任分界：AIMO＝証憑、貴法人＝保証結論。 |
| 構成 | 課題 → 提供するもの… | **責任分界（先に）** → 課題になっている点 → 提供するもの… |
| CTA | パートナーになりませんか？ | 提供内容：パートナーブリーフィング、サンプル目次、デリバリープレイブック。 |

### Case Studies（EN）resources/case-studies/index.html

| ブロック | Before | After |
|----------|--------|--------|
| 導入 | Replace with real metrics as engagements complete. | プロトタイプ／サンプル成果物。調書に貼れる状態の「前・後」の差を示す例。特定クライアントKPI主張ではない。 |
| Outcome | target KPIs (30–50%, re-request rate…) | 削除。代わりに Before vs. After（attachability）と Action（how we get there）を明記。 |

### Case Studies（JA）ja/resources/case-studies/index.html

| ブロック | Before | After |
|----------|--------|--------|
| 導入 | 実績確定後に数値を差し替え可能です | プロトタイプ／サンプル成果物。調書に貼れる状態の前後の差。特定クライアントのKPI主張ではありません。 |
| Outcome | 目標KPI（30〜50%等） | 削除。前後の差・実施内容・監査人が重視する点に再構成。 |

---

## 6. 出典を追加した箇所（リンク）

| ページ | 箇所 | 追加した出典 |
|--------|------|----------------|
| index.html (EN) | 規制リスクのカード内 | <a href="https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R1689">EU AI Act (official)</a> |
| ja/index.html (JA) | 規制・ガイドラインの要請 | <a href="https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R1689">EU AI Act（公式）</a> |

---

## 7. 削除・条件付きにした数値一覧（理由）

| 数値 | 元のページ | 対応 | 理由 |
|------|------------|------|------|
| 68%（個人AI利用） | Home EN/JA | 削除し定性的に「In many organizations…」「多くの組織で…」に変更 | 出典未記載のため断定を避けた |
| 年間数百万円 / millions | Home EN/JA | 削除。「consolidation opportunities」「集約の余地」「環境次第」に | 条件付き・例示でないと主張できないため |
| 7% of global revenue / 最大7% | Home EN/JA | 残すが「certain violations」「適用範囲は規制と御社の役割によります」と条件付き＋公式リンク追加 | 根拠は公式で確認可能のためリンク付きで記載 |
| Cost Saving Avg 20% | Home EN/JA ダッシュボード | 削除。「Cost visibility / By tier」「コスト可視化・ティア別」に | 出典・条件なしのため |
| 30–50% audit prep (Case Studies) | case-studies EN/JA | 削除。KPI目標は「Outcome」から外し、Before/Afterの定性差に変更 | テンプレ注記・捏造防止のため |

---

## 8. 変更したファイル一覧

- `docs/改稿-ページ一覧とNGフレーズ.md`（新規＋本サマリ追記）
- `index.html`（Home EN）
- `ja/index.html`（Home JA）
- `audit-firms/index.html`（Audit Firms EN）
- `ja/audit-firms/index.html`（Audit Firms JA）
- `partners/audit-firms/index.html`（Why now 1文）
- `resources/case-studies/index.html`（Case Studies EN）
- `ja/resources/case-studies/index.html`（Case Studies JA）

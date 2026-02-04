# ファビコン・OGP 用画像 作成プロンプト（Claude 用）

以下のプロンプトを **Claude（画像生成機能）** に貼り付けて、AIMOaaS™ サイト用のアイコン・画像を一式作成してください。生成したファイルはプロジェクトの **ルート** または **`assets/`** に配置します。

---

## 1. ファビコン（メイン・SVG）

**ファイル名:** `favicon.svg`  
**配置:** サイトルート（`/favicon.svg` で参照）

**プロンプト（英語で依頼する場合）:**

```
Create a favicon in SVG format for "AIMOaaS" — an AI governance and managed operations brand. The icon should:
- Be a single, recognizable symbol that works at 16×16 to 32×32 pixels (simple, bold shapes; avoid fine detail).
- Evoke "shield" or "governance" and "AI": e.g. a shield with a subtle tech/AI element (circuit line, checkmark, or abstract "A").
- Use the brand colors: indigo (#4f46e5) as primary and optionally a small accent of pink/magenta (#ec4899).
- Have a transparent or very light background; the symbol should be clearly visible on both white and dark (e.g. slate) backgrounds.
- Output as a single SVG file, square aspect ratio, optimized for web (no unnecessary metadata).
- The design must be minimal and professional, suitable for a B2B SaaS product.
```

**プロンプト（日本語で依頼する場合）:**

```
AIMOaaS（AIガバナンス・運用代行のサービス）用のファビコンを SVG で作成してください。
- 16×16〜32×32 で認識しやすい、シンプルで太めの図形にしてください。
- 「盾」や「ガバナンス」「AI」を連想させるデザイン（盾＋チェックマークや抽象的な「A」など）。
- ブランドカラー: インディゴ #4f46e5 を主に、必要に応じてピンク/マゼンタ #ec4899 をアクセントに。
- 背景は透明またはごく薄く、白・ダーク（スレート）両方で視認できるように。
- 1つの SVG、正方形、Web 用に最適化。B2B SaaS 向けのミニマルでプロフェッショナルな仕上がりにしてください。
```

---

## 2. ファビコン PNG（32×32）

**ファイル名:** `favicon-32x32.png`  
**配置:** サイトルート

**プロンプト:**

```
Export the same AIMOaaS favicon design (shield + governance/AI motif, indigo #4f46e5, optional pink accent) as a 32×32 pixel PNG. Transparent background. Simple, bold, readable at small size.
```

---

## 3. ファビコン PNG（16×16）

**ファイル名:** `favicon-16x16.png`  
**配置:** サイトルート

**プロンプト:**

```
Same AIMOaaS favicon (shield/governance style, indigo brand color) as a 16×16 pixel PNG. Maximum simplicity so it stays recognizable in browser tabs. Transparent background.
```

---

## 4. Apple Touch Icon（180×180）

**ファイル名:** `apple-touch-icon.png`  
**配置:** サイトルート

**プロンプト:**

```
Create an Apple Touch Icon for "AIMOaaS" at 180×180 pixels. Design: the same shield/governance + AI motif in indigo (#4f46e5) with optional pink (#ec4899) accent. Slightly rounded corners (about 22% radius) to match iOS. Can include a thin border or glow so it stands out on home screen. Professional, B2B SaaS style. PNG with transparent or solid light background.
```

---

## 5. OGP 用画像（任意・既存画像で代用可）

サイトでは既に `assets/aimo-standard-unifying-regulations.png` を OGP 画像として使用しています。専用の「ロゴ＋キャッチコピー」OGP 画像が必要な場合のみ、以下を使用してください。

**ファイル名（例）:** `assets/ogp-default.png`  
**推奨サイズ:** 1200×630 px（OGP 推奨）

**プロンプト:**

```
Create an Open Graph image 1200×630 pixels for "AIMOaaS™ — AI Governance & Managed Operations". Include:
- The AIMOaaS wordmark or logo (shield + "AIMO" in bold, "aaS" in indigo).
- Short tagline: "Shadow AI discovery to 24/7 monitoring. AIMO Standard aligned."
- Brand colors: indigo (#4f46e5) and pink (#ec4899) gradient or blocks; dark slate background (#0f172a) optional.
- Clean, professional, suitable for LinkedIn/Twitter link previews. No small text that becomes unreadable when scaled down.
```

---

## 配置後の確認

1. **ファビコン**  
   - ルートに `favicon.svg`, `favicon-32x32.png`, `favicon-16x16.png`, `apple-touch-icon.png` を配置。
   - 全 HTML では既に次のように参照しています（ルート相対パス）:
     - `<link rel="icon" type="image/svg+xml" href="/favicon.svg" />`
     - `<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />`
     - `<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />`
     - `<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />`

2. **Cloudflare Pages**  
   - ルートに置いたファイルはそのまま `https://aimoaas.com/favicon.svg` などで配信されます。

3. **OGP 画像**  
   - 新規作成する場合は `assets/ogp-default.png` に保存し、各ページの `og:image` を `https://aimoaas.com/assets/ogp-default.png` に変更すれば反映されます（現状のままでも可）。

---

以上で、ファビコンと必要に応じた OGP 用画像を Claude で一通り作成できます。

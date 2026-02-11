#!/usr/bin/env bash
# Cloudflare Pages 用: 公開してよいファイルだけを dist/ にコピーする。
# data/, scripts/, _policy/, .github/, docs/, templates/ は含めず、外部から参照不可にする。
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIST="${ROOT}/dist"
rm -rf "$DIST"
mkdir -p "$DIST"

# ルートの単体ファイル
for f in index.html 404.html robots.txt sitemap.xml _redirects; do
  [ -f "$ROOT/$f" ] && cp "$ROOT/$f" "$DIST/"
done
# ファビコン・OGP等
for f in favicon.svg favicon-16x16.png favicon-32x32.png apple-touch-icon.png; do
  [ -f "$ROOT/$f" ] && cp "$ROOT/$f" "$DIST/"
done

# 公開ディレクトリのみコピー（data, scripts, _policy, .github, docs, templates は含めない）
for dir in assets aimo-standard audit-firms partners resources ja de es fr it ko pt zh-CN zh-TW; do
  [ -d "$ROOT/$dir" ] && cp -r "$ROOT/$dir" "$DIST/"
done

echo "Deploy-ready files copied to dist/ (data, scripts, _policy, docs, templates are excluded)."

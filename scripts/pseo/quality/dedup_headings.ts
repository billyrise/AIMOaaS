/**
 * H2 同名重複除去 + References セクションは最後の1回だけ残す。
 * 入力: 生成済み HTML（本文部分または full page）
 * 出力: 修正済み HTML, fixups
 * generate 出力直前および postprocess で利用する。
 */

const H2_OPEN = /<h2[^>]*>/i;

/** 見出しテキストを正規化（空白・全角半角・大小は区別しないでキー化） */
function normalizeHeadingKey(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .replace(/\u3000/g, " ")
    .trim()
    .toLowerCase();
}

function isReferencesSection(h2Text: string): boolean {
  const k = normalizeHeadingKey(h2Text);
  return k === "references" || k === "参考文献" || k === "references ";
}

export function deduplicateH2Sections(html: string): { html: string; fixups: string[] } {
  const fixups: string[] = [];
  const seen = new Set<string>();
  const parts: string[] = [];
  let rest = html;
  let lastIndex = 0;
  let referencesBuffer: string[] = [];

  function flushReferences(): void {
    if (referencesBuffer.length > 1) {
      fixups.push(`References: kept last of ${referencesBuffer.length}`);
      parts.push(referencesBuffer[referencesBuffer.length - 1]);
    } else if (referencesBuffer.length === 1) {
      parts.push(referencesBuffer[0]);
    }
    referencesBuffer = [];
  }

  for (;;) {
    const m = rest.match(H2_OPEN);
    if (!m || m.index == null) {
      const tail = rest.trim();
      if (tail) parts.push(tail);
      break;
    }
    const sectionStart = m.index;
    const afterTag = rest.slice(sectionStart + m[0].length);
    const close = afterTag.search(/<\/h2>/i);
    const h2Text = close >= 0 ? afterTag.slice(0, close).replace(/<[^>]+>/g, "").trim() : "";
    const nextH2 = afterTag.slice(close >= 0 ? close + 5 : 0).search(/<h2[^>]*>/i);
    const sectionEnd =
      nextH2 >= 0 ? sectionStart + m[0].length + close + 5 + nextH2 : rest.length;
    const section = rest.slice(0, sectionEnd).trim();

    if (isReferencesSection(h2Text)) {
      if (lastIndex < sectionStart) {
        const before = rest.slice(lastIndex, sectionStart).trim();
        if (before) parts.push(before);
      }
      referencesBuffer.push(section);
      rest = rest.slice(sectionEnd);
      lastIndex = 0;
      continue;
    }

    flushReferences();

    const normalized = normalizeHeadingKey(h2Text);
    if (seen.has(normalized)) {
      fixups.push(h2Text || "(無題)");
      rest = rest.slice(sectionEnd);
      lastIndex = 0;
      continue;
    }
    seen.add(normalized);

    if (lastIndex < sectionStart) {
      const before = rest.slice(lastIndex, sectionStart).trim();
      if (before) parts.push(before);
    }
    parts.push(section);
    lastIndex = sectionEnd;
    rest = rest.slice(sectionEnd);
  }

  flushReferences();

  return { html: parts.join("\n\n"), fixups };
}

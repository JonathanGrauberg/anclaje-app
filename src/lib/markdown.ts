// Markdown mínimo para el diario: títulos (#, ##, ###), listas (-, *, 1.), **negrita** y *cursiva*.
// Devuelve un árbol simple que se renderiza con React (nunca HTML crudo → sin XSS).

export type Inline = { type: "text" | "bold" | "italic"; text: string };
export type Block =
  | { type: "heading"; level: 1 | 2 | 3; content: Inline[] }
  | { type: "paragraph"; lines: Inline[][] }
  | { type: "list"; ordered: boolean; items: Inline[][] };

export function parseInline(text: string): Inline[] {
  const out: Inline[] = [];
  const re = /\*\*(.+?)\*\*|(?<![*\w])[*_](?![*\s])(.+?)(?<![\s*])[*_](?![*\w])/g;
  let last = 0;
  for (const m of text.matchAll(re)) {
    if (m.index > last) out.push({ type: "text", text: text.slice(last, m.index) });
    if (m[1] !== undefined) out.push({ type: "bold", text: m[1] });
    else out.push({ type: "italic", text: m[2] });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ type: "text", text: text.slice(last) });
  return out;
}

export function parseMarkdown(source: string): Block[] {
  const blocks: Block[] = [];
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  let para: Inline[][] | null = null;
  let list: { ordered: boolean; items: Inline[][] } | null = null;

  const flush = () => {
    if (para) blocks.push({ type: "paragraph", lines: para });
    if (list) blocks.push({ type: "list", ...list });
    para = null;
    list = null;
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      flush();
      continue;
    }
    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    if (heading) {
      flush();
      blocks.push({
        type: "heading",
        level: heading[1].length as 1 | 2 | 3,
        content: parseInline(heading[2]),
      });
      continue;
    }
    const bullet = /^\s*[-*•]\s+(.*)$/.exec(line);
    const numbered = /^\s*\d+[.)]\s+(.*)$/.exec(line);
    if (bullet || numbered) {
      const ordered = !!numbered;
      if (para) flush();
      if (list && list.ordered !== ordered) flush();
      list ??= { ordered, items: [] };
      list.items.push(parseInline((bullet ?? numbered)![1]));
      continue;
    }
    if (list) flush();
    para ??= [];
    para.push(parseInline(line));
  }
  flush();
  return blocks;
}

/** Texto plano para extractos (sin marcas de formato). */
export function toPlainText(source: string) {
  return source
    .replace(/^#{1,3}\s+/gm, "")
    .replace(/^\s*([-*•]|\d+[.)])\s+/gm, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/[*_](.+?)[*_]/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

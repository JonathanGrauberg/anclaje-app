import { describe, expect, it } from "vitest";
import { parseInline, parseMarkdown, toPlainText } from "./markdown";

describe("markdown del diario", () => {
  it("negrita y cursiva", () => {
    expect(parseInline("hoy **muy** mal y *algo* cansada")).toEqual([
      { type: "text", text: "hoy " },
      { type: "bold", text: "muy" },
      { type: "text", text: " mal y " },
      { type: "italic", text: "algo" },
      { type: "text", text: " cansada" },
    ]);
  });

  it("no confunde asteriscos sueltos", () => {
    expect(parseInline("2 * 3 = 6")).toEqual([{ type: "text", text: "2 * 3 = 6" }]);
  });

  it("títulos, párrafos y listas", () => {
    const blocks = parseMarkdown("## Hoy\nme levanté\ntarde\n\n- uno\n- dos\n1. a\n2. b");
    expect(blocks.map((b) => b.type)).toEqual(["heading", "paragraph", "list", "list"]);
    expect(blocks[1]).toMatchObject({
      type: "paragraph",
      lines: [[{ text: "me levanté" }], [{ text: "tarde" }]],
    });
    expect(blocks[2]).toMatchObject({ ordered: false });
    expect(blocks[3]).toMatchObject({ ordered: true });
  });

  it("el HTML se trata como texto", () => {
    const blocks = parseMarkdown("<script>alert(1)</script>");
    expect(blocks[0]).toMatchObject({
      type: "paragraph",
      lines: [[{ type: "text", text: "<script>alert(1)</script>" }]],
    });
  });

  it("texto plano para extractos", () => {
    expect(toPlainText("# Título\n- **uno**\n- dos")).toBe("Título uno dos");
  });
});

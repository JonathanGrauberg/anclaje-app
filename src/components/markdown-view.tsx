import { Fragment } from "react";
import { parseMarkdown, type Inline } from "@/lib/markdown";
import { cn } from "@/lib/utils";

function Inlines({ items }: { items: Inline[] }) {
  return items.map((it, i) =>
    it.type === "bold" ? (
      <strong key={i}>{it.text}</strong>
    ) : it.type === "italic" ? (
      <em key={i}>{it.text}</em>
    ) : (
      <Fragment key={i}>{it.text}</Fragment>
    ),
  );
}

/** Renderiza el markdown del diario sin HTML crudo. */
export function MarkdownView({ source, className }: { source: string; className?: string }) {
  const blocks = parseMarkdown(source);
  return (
    <div className={cn("flex flex-col gap-3 leading-relaxed", className)}>
      {blocks.map((b, i) => {
        if (b.type === "heading") {
          const Tag = (["h2", "h3", "h4"] as const)[b.level - 1];
          const size = ["text-2xl", "text-xl", "text-lg"][b.level - 1];
          return (
            <Tag key={i} className={cn("font-semibold tracking-tight", size)}>
              <Inlines items={b.content} />
            </Tag>
          );
        }
        if (b.type === "list") {
          const Tag = b.ordered ? "ol" : "ul";
          return (
            <Tag
              key={i}
              className={cn("flex flex-col gap-1 pl-6", b.ordered ? "list-decimal" : "list-disc")}
            >
              {b.items.map((item, j) => (
                <li key={j}>
                  <Inlines items={item} />
                </li>
              ))}
            </Tag>
          );
        }
        return (
          <p key={i}>
            {b.lines.map((line, j) => (
              <Fragment key={j}>
                {j > 0 && <br />}
                <Inlines items={line} />
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}

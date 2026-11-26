import { z } from "zod";

// Aporte a la biblioteca colaborativa (Comunidad). Se valida igual en cliente y servidor.

export const COMMUNITY_KINDS = ["PDF", "IMAGE", "LINK", "TEXT"] as const;

export const communityItemSchema = z
  .object({
    kind: z.enum(COMMUNITY_KINDS),
    title: z.string().trim().min(3, "Poné un título").max(200),
    summary: z.string().trim().max(1000).optional(),
    url: z.string().trim().max(2000).optional(),
    storageKey: z.string().max(200).optional(),
    bodyText: z.string().max(50_000).optional(),
    source: z.string().trim().max(500).optional(),
    category: z.string().trim().max(60).optional(),
    tags: z.array(z.string().trim().min(1).max(30)).max(10).default([]),
    rights: z.literal(true, { message: "Confirmá que lo podés compartir" }),
  })
  .superRefine((v, ctx) => {
    if (v.kind === "LINK" && !/^https:\/\/[^\s]+$/i.test(v.url ?? ""))
      ctx.addIssue({
        code: "custom",
        path: ["url"],
        message: "Pegá un link que empiece con https://",
      });
    if ((v.kind === "PDF" || v.kind === "IMAGE") && !v.storageKey)
      ctx.addIssue({ code: "custom", path: ["storageKey"], message: "Subí el archivo" });
    if (v.kind === "TEXT" && !(v.bodyText ?? "").trim())
      ctx.addIssue({ code: "custom", path: ["bodyText"], message: "Escribí el contenido" });
  });
export type CommunityItemInput = z.input<typeof communityItemSchema>;

export const reviewSchema = z.object({
  id: z.string().min(1).max(40),
  decision: z.enum(["APPROVED", "REJECTED"]),
  note: z.string().trim().max(1000).optional(),
});

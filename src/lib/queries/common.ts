import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/db";
import type { EmotionTreeNode } from "@/components/emotion-wheel/types";

export const getCrisisLines = cache(() =>
  prisma.crisisLine.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true, phone: true, whatsapp: true, description: true, region: true },
  }),
);

export type CrisisLineDTO = Awaited<ReturnType<typeof getCrisisLines>>[number];

/** Árbol de la rueda (nodos activos), listo para pasar a componentes cliente. */
export const getEmotionTree = cache(async (): Promise<EmotionTreeNode[]> => {
  const nodes = await prisma.emotionNode.findMany({
    where: { active: true },
    orderBy: [{ level: "asc" }, { sortOrder: "asc" }],
    select: { id: true, parentId: true, level: true, label: true, color: true },
  });
  const byId = new Map<string, EmotionTreeNode>();
  const roots: EmotionTreeNode[] = [];
  for (const n of nodes) {
    const node: EmotionTreeNode = { ...n, children: [] };
    byId.set(n.id, node);
    if (!n.parentId) roots.push(node);
    else byId.get(n.parentId)?.children.push(node);
  }
  return roots;
});

export const getDistortions = cache(() =>
  prisma.cognitiveDistortion.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true, description: true, example: true },
  }),
);

export type DistortionDTO = Awaited<ReturnType<typeof getDistortions>>[number];

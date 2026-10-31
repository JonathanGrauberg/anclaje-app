import type { EmotionTreeNode } from "@/components/emotion-wheel/types";

// Utilidades puras de la rueda (sirven en servidor y cliente).

export type EmotionIndexEntry = {
  node: EmotionTreeNode;
  path: EmotionTreeNode[];
  family: EmotionTreeNode;
};
export type EmotionIndex = Map<string, EmotionIndexEntry>;

export function buildEmotionIndex(tree: EmotionTreeNode[]): EmotionIndex {
  const index: EmotionIndex = new Map();
  const walk = (node: EmotionTreeNode, path: EmotionTreeNode[]) => {
    const full = [...path, node];
    index.set(node.id, { node, path: full, family: full[0] });
    node.children.forEach((c) => walk(c, full));
  };
  tree.forEach((n) => walk(n, []));
  return index;
}

export function pathLabel(index: EmotionIndex, id: string) {
  return (
    index
      .get(id)
      ?.path.map((n) => n.label)
      .join(" › ") ?? ""
  );
}

export function intensityWord(n: number) {
  if (n <= 3) return "suave";
  if (n <= 6) return "moderada";
  if (n <= 8) return "fuerte";
  return "muy fuerte";
}

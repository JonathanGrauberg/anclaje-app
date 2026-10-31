import { useMemo } from "react";
import { buildEmotionIndex } from "@/lib/emotions/tree";
import type { EmotionTreeNode } from "./types";

export type { EmotionIndex, EmotionIndexEntry } from "@/lib/emotions/tree";
export { pathLabel } from "@/lib/emotions/tree";

export function useEmotionIndex(tree: EmotionTreeNode[]) {
  return useMemo(() => buildEmotionIndex(tree), [tree]);
}

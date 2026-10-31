export type EmotionTreeNode = {
  id: string;
  parentId: string | null;
  level: number;
  label: string;
  color: string;
  children: EmotionTreeNode[];
};

/** Una emoción elegida con su intensidad (1–10). */
export type EmotionPick = { nodeId: string; intensity: number };

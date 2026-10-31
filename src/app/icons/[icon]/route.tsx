import { brandIcon } from "@/lib/brand-icon";

const ICONS = {
  "icon-192.png": { size: 192, safe: 0.78 },
  "icon-512.png": { size: 512, safe: 0.78 },
  "maskable-512.png": { size: 512, safe: 0.6 },
} as const;

export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(ICONS).map((icon) => ({ icon }));
}

export async function GET(_req: Request, ctx: RouteContext<"/icons/[icon]">) {
  const { icon } = await ctx.params;
  const cfg = ICONS[icon as keyof typeof ICONS];
  if (!cfg) return new Response("No encontrado", { status: 404 });
  return brandIcon(cfg.size, cfg.safe);
}

import { NextResponse, type NextRequest } from "next/server";
import { getVersion, versionToDoc } from "@/lib/assessments/repo";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";

// Exporta una plantilla del sistema en el formato JSON de Sentir. Solo admins.
export async function GET(_req: NextRequest, ctx: RouteContext<"/admin/plantillas/[id]/exportar">) {
  const { id } = await ctx.params;
  const session = await getSession();
  if (!session || session.user.role !== "ADMIN")
    return new NextResponse("No autorizado", { status: 401 });
  const template = await prisma.assessment.findFirst({
    where: { id, ownerId: null, isTemplate: true },
    include: { versions: { orderBy: { version: "desc" }, take: 1, select: { id: true } } },
  });
  const versionId = template?.versions[0]?.id;
  if (!versionId) return new NextResponse("No encontrado", { status: 404 });
  const doc = versionToDoc((await getVersion(versionId))!);
  const slug = doc.title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return new NextResponse(JSON.stringify(doc, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${slug || "plantilla"}.sentir.json"`,
    },
  });
}

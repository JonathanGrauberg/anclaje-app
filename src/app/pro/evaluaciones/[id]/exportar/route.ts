import { NextResponse, type NextRequest } from "next/server";
import { getVersion, versionToDoc } from "@/lib/assessments/repo";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";

// Exporta la última versión de una evaluación propia en el formato JSON de Sentir.
export async function GET(_req: NextRequest, ctx: RouteContext<"/pro/evaluaciones/[id]/exportar">) {
  const { id } = await ctx.params;
  const session = await getSession();
  if (!session || (session.user.role ?? "PATIENT") === "PATIENT")
    return new NextResponse("No autorizado", { status: 401 });
  const assessment = await prisma.assessment.findFirst({
    where: { id, owner: { userId: session.user.id } },
    include: { versions: { orderBy: { version: "desc" }, take: 1, select: { id: true } } },
  });
  const versionId = assessment?.versions[0]?.id;
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
      "Content-Disposition": `attachment; filename="${slug || "evaluacion"}.sentir.json"`,
    },
  });
}

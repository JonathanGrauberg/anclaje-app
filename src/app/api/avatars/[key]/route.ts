import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { isValidKey, storage } from "@/lib/storage";

// Foto de perfil: pública si la profesional activó su perfil público; si no, solo la ve ella.
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/avatars/[key]">) {
  const key = `avatars/${(await ctx.params).key}`;
  const notFound = () => new NextResponse("No encontrado", { status: 404 });
  if (!isValidKey(key)) return notFound();
  const owner = await prisma.professionalProfile.findFirst({
    where: { photoKey: key },
    select: { publicProfile: true, userId: true },
  });
  if (!owner) return notFound();
  const isPublic = owner.publicProfile;
  if (!isPublic) {
    const session = await getSession();
    if (session?.user.id !== owner.userId) return notFound();
  }
  const file = await storage().get(key);
  if (!file) return notFound();
  return new NextResponse(new Uint8Array(file.data), {
    headers: {
      "Content-Type": file.contentType,
      // La clave cambia con cada foto nueva: se puede cachear mucho (si es pública).
      "Cache-Control": isPublic ? "public, max-age=86400, s-maxage=604800" : "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

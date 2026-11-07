import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { DEMO_VIEW_COOKIE, ensureDemoPatient, findDemoPatient } from "@/lib/demo";

// "Ver como paciente": la profesional entra a la app del paciente como su Sofía (DEMO), sin
// cambiar de sesión. Cada vez que se lee la cookie se vuelve a verificar que la demo sea suya.
export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  const role = session?.user.role ?? "PATIENT";
  if (!session || role === "PATIENT") {
    return NextResponse.redirect(new URL("/ingresar", request.url));
  }
  const professional = await prisma.professionalProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!professional) return NextResponse.redirect(new URL("/pro", request.url));
  await ensureDemoPatient(professional.id);
  const demo = await findDemoPatient(professional.id);
  if (!demo) return NextResponse.redirect(new URL("/pro?demo=sin", request.url));

  const response = NextResponse.redirect(new URL("/app", request.url));
  response.cookies.set(DEMO_VIEW_COOKIE, demo.id, {
    path: "/",
    maxAge: 60 * 60 * 8,
    sameSite: "lax",
    httpOnly: true,
    secure: request.nextUrl.protocol === "https:",
  });
  return response;
}

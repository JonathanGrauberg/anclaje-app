import { NextResponse, type NextRequest } from "next/server";
import { UI_THEME_COOKIE } from "@/lib/ui-theme";

// Cambia el diseño de la app en este navegador y vuelve al inicio del paciente.
// El nuevo es el predeterminado: solo guardamos la cookie para quien elige el clásico.
export function GET(request: NextRequest) {
  const wantsClassic = request.nextUrl.searchParams.get("v") === "clasico";
  const response = NextResponse.redirect(new URL("/app", request.url));
  if (wantsClassic) {
    response.cookies.set(UI_THEME_COOKIE, "clasico", {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
      httpOnly: true,
      secure: request.nextUrl.protocol === "https:",
    });
  } else {
    response.cookies.delete(UI_THEME_COOKIE);
  }
  return response;
}

import { NextResponse, type NextRequest } from "next/server";
import { UI_THEME_COOKIE } from "@/lib/ui-theme";

// Prende o apaga el diseño en prueba en este navegador y vuelve al inicio del paciente.
export function GET(request: NextRequest) {
  const value = request.nextUrl.searchParams.get("v") === "nuevo" ? "nuevo" : "clasico";
  const response = NextResponse.redirect(new URL("/app", request.url));
  if (value === "nuevo") {
    response.cookies.set(UI_THEME_COOKIE, value, {
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

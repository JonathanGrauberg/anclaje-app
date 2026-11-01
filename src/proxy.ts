import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

// Chequeo optimista: si no hay cookie de sesión, mandamos a ingresar.
// La verificación real (sesión válida + rol) se hace en el servidor, en cada layout y acción.
export function proxy(request: NextRequest) {
  if (!getSessionCookie(request)) {
    const url = new URL("/ingresar", request.url);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*", "/pro/:path*", "/admin/:path*"],
};

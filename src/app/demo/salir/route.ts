import { NextResponse, type NextRequest } from "next/server";
import { DEMO_VIEW_COOKIE } from "@/lib/demo";

// Sale de "Ver como paciente" y vuelve al panel.
export function GET(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/pro", request.url));
  response.cookies.delete(DEMO_VIEW_COOKIE);
  return response;
}

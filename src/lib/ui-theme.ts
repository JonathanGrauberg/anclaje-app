import "server-only";
import { cookies } from "next/headers";

// Diseño de la app del paciente. El "nuevo" es el predeterminado; quien quiera el anterior puede
// volver con /diseno?v=clasico (y regresar con /diseno?v=nuevo). Ver DECISIONES.md.
export const UI_THEME_COOKIE = "anclaje-diseno";
export type UiTheme = "clasico" | "nuevo";

export async function getUiTheme(): Promise<UiTheme> {
  const value = (await cookies()).get(UI_THEME_COOKIE)?.value;
  return value === "clasico" ? "clasico" : "nuevo";
}

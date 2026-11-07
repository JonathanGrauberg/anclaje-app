import "server-only";
import { cookies } from "next/headers";

// Diseño de la app en prueba. Se prende con /diseno?v=nuevo y se apaga con /diseno?v=clasico
// (queda en una cookie de ese navegador; no cambia nada para el resto).
export const UI_THEME_COOKIE = "anclaje-diseno";
export type UiTheme = "clasico" | "nuevo";

export async function getUiTheme(): Promise<UiTheme> {
  const value = (await cookies()).get(UI_THEME_COOKIE)?.value;
  return value === "nuevo" ? "nuevo" : "clasico";
}

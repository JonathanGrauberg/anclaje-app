// Modo claro/oscuro elegido por la persona. Se guarda en este navegador (localStorage); por
// defecto, claro. Ver DECISIONES.md.
export const COLOR_MODE_KEY = "anclaje-modo";
export type ColorMode = "light" | "dark";

export const COLOR_MODE_SCRIPT = `try{if(localStorage.getItem("${COLOR_MODE_KEY}")==="dark")document.documentElement.dataset.mode="dark"}catch(e){}`;

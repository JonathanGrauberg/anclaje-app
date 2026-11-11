// URL pública del sitio (la misma que usa metadataBase). Si se cambia de dominio, alcanza con
// cambiar NEXT_PUBLIC_APP_URL en Vercel: el sitemap, el robots.txt y los datos para Google la toman.
export const SITE_URL = (
  process.env.NEXT_PUBLIC_APP_URL ?? "https://anclaje.webistudio.net"
).replace(/\/+$/, "");

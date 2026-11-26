import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible, Inter } from "next/font/google";
import { A11yMotion } from "@/components/a11y-motion";
import { ServiceWorkerRegister } from "@/components/service-worker";
import { A11Y_SCRIPT } from "@/lib/a11y";
import { COLOR_MODE_SCRIPT } from "@/lib/color-mode";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
// Letra "más fácil de leer" de /accesibilidad: solo se descarga si alguien la elige.
const readable = Atkinson_Hyperlegible({
  variable: "--font-readable",
  subsets: ["latin"],
  weight: ["400", "700"],
  preload: false,
});

export const metadata: Metadata = {
  // Para que las imágenes al compartir (WhatsApp, redes) salgan con URL absoluta
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://anclaje.webistudio.net"),
  title: { default: "Anclaje", template: "%s · Anclaje" },
  description: "Un lugar para registrar lo que sentís y compartirlo con tu psicóloga.",
  applicationName: "Anclaje",
  // Google Search Console (propiedad https://anclaje.webistudio.net). No es secreto.
  verification: { google: "uncQp5acTGHPwkvzaev-cE9qD2F_INbbzjjfrXqvtuc" },
  robots: { index: false, follow: false },
  appleWebApp: { capable: true, title: "Anclaje", statusBarStyle: "default" },
  openGraph: { type: "website", locale: "es_AR", siteName: "Anclaje" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#faf7f2",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: el script de abajo pone data-mode antes de que cargue React.
    <html
      lang="es-AR"
      className={`${inter.variable} ${readable.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* Modo oscuro elegido con el botón: se aplica antes de pintar, así no hay parpadeo. */}
        <script dangerouslySetInnerHTML={{ __html: COLOR_MODE_SCRIPT }} />
        {/* Lo mismo con lo elegido en /accesibilidad (letra, contraste, animaciones). */}
        <script dangerouslySetInnerHTML={{ __html: A11Y_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col font-sans">
        <A11yMotion>{children}</A11yMotion>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}

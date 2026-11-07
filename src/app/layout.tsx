import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { ServiceWorkerRegister } from "@/components/service-worker";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

export const metadata: Metadata = {
  // Para que las imágenes al compartir (WhatsApp, redes) salgan con URL absoluta
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://anclaje.webistudio.net"),
  title: { default: "Anclaje", template: "%s · Anclaje" },
  description: "Un lugar para registrar lo que sentís y compartirlo con tu psicóloga.",
  applicationName: "Anclaje",
  robots: { index: false, follow: false },
  appleWebApp: { capable: true, title: "Anclaje", statusBarStyle: "default" },
  openGraph: { type: "website", locale: "es_AR", siteName: "Anclaje" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf7f2" },
    { media: "(prefers-color-scheme: dark)", color: "#16151b" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-AR" className={`${inter.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}

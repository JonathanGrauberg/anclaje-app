import type { Metadata } from "next";
import { Logo } from "@/components/logo";

export const metadata: Metadata = { title: "Sin conexión" };

// La única página que guarda el service worker: no tiene datos de nadie.
export default function OfflinePage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <Logo className="size-14" />
      <h1 className="text-2xl font-semibold">Ahora no hay conexión</h1>
      <p className="text-muted-foreground">
        Anclaje necesita internet para guardar lo que escribís de forma segura. Cuando vuelva la
        conexión, probá de nuevo.
      </p>
      <p className="bg-danger-soft rounded-2xl p-4 text-sm">
        Si estás en peligro o en una urgencia, llamá al <strong>911</strong>. Para hablar con
        alguien sobre lo que te pasa: <strong>135</strong> (Asistencia al Suicida, gratis).
      </p>
    </main>
  );
}

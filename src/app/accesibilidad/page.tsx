import type { Metadata } from "next";
import { Logo } from "@/components/logo";
import { A11ySettings, BackButton } from "./a11y-settings";

export const metadata: Metadata = { title: "Accesibilidad" };

/**
 * Opciones de accesibilidad. Pública (también sirve antes de ingresar) y opcional: si no se toca
 * nada, la app se ve igual que siempre. Se guarda en este navegador. Ver src/lib/a11y.ts.
 */
export default function AccesibilidadPage() {
  return (
    <main className="flex flex-1 flex-col items-center px-5 py-8">
      <div className="flex w-full max-w-xl flex-col gap-6">
        <div className="flex items-center justify-between">
          <Logo withText />
          <BackButton />
        </div>
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight">Accesibilidad</h1>
          <p className="text-muted-foreground">
            Ajustá Anclaje a como te queda más cómodo. Los cambios se ven al instante y quedan
            guardados en este dispositivo. Si no tocás nada, todo sigue como está.
          </p>
        </div>
        <A11ySettings />
        <section
          aria-labelledby="mas-title"
          className="text-muted-foreground flex flex-col gap-2 text-sm"
        >
          <h2 id="mas-title" className="text-foreground font-semibold">
            Además
          </h2>
          <ul className="flex list-disc flex-col gap-1 pl-5">
            <li>Adentro de la app, con el botón de la luna (arriba) pasás a modo oscuro.</li>
            <li>Todo se puede usar con el teclado (Tab para moverte, Enter para elegir).</li>
            <li>
              Está pensada para usarse con lectores de pantalla (TalkBack en Android, VoiceOver en
              iPhone). En la rueda de las emociones también podés buscar la emoción escribiendo su
              nombre.
            </li>
            <li>Podés agrandar la pantalla con dos dedos: no está bloqueado.</li>
          </ul>
        </section>
      </div>
    </main>
  );
}

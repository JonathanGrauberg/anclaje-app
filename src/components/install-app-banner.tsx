"use client";

import { Download, Share, SquarePlus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { LighthouseMark } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent } from "@/components/ui/sheet";

// Cartel para instalar la app (idea de .budgets). En Android y en la compu el navegador deja
// instalar con un botón (`beforeinstallprompt`); en iPhone no hay botón posible, así que en
// Safari explicamos los 2 pasos. Si la persona lo cierra, no insistimos por 30 días.

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "anclaje:install-dismissed-at";
const QUIET_DAYS = 30;

function recentlyDismissed() {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY));
    return !!at && Date.now() - at < QUIET_DAYS * 86_400_000;
  } catch {
    return false;
  }
}

function rememberDismiss() {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {
    // sin almacenamiento (modo privado): solo se oculta por ahora
  }
}

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/** iPhone o iPad con Safari: el único navegador de Apple que puede instalar. */
function isIosSafari() {
  const ua = navigator.userAgent;
  const ios = /iPad|iPhone|iPod/.test(ua) || (ua.includes("Mac") && navigator.maxTouchPoints > 1);
  return ios && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
}

export function InstallAppBanner() {
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [hidden, setHidden] = useState(true); // oculto hasta saber en qué dispositivo estamos
  const [iosHelp, setIosHelp] = useState(false);

  useEffect(() => {
    if (isStandalone() || recentlyDismissed()) return;
    // El dispositivo se conoce recién en el cliente (no existe durante el render del servidor).
    if (isIosSafari()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIos(true);
      setHidden(false);
    }
    const onPrompt = (e: Event) => {
      e.preventDefault(); // el cartel lo mostramos nosotros, no el mini-banner de Chrome
      setPrompt(e as InstallPromptEvent);
      setHidden(false);
    };
    const onInstalled = () => setHidden(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (hidden || (!ios && !prompt)) return null;

  const dismiss = () => {
    rememberDismiss();
    setHidden(true);
  };

  const install = async () => {
    if (ios) return setIosHelp(true);
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    setPrompt(null); // el evento sirve una sola vez
    if (outcome === "accepted") setHidden(true);
    else dismiss();
  };

  return (
    <>
      <div
        role="region"
        aria-label="Instalar Anclaje"
        className="bg-card fixed inset-x-4 bottom-[calc(var(--nav-h,0px)+4.5rem+env(safe-area-inset-bottom))] z-40 mx-auto flex max-w-md items-center gap-3 rounded-2xl border p-3 shadow-xl sm:right-6 sm:bottom-[calc(var(--nav-h,0px)+1.5rem)] sm:left-auto sm:mx-0 sm:w-96"
      >
        <span className="bg-primary-soft flex size-11 shrink-0 items-center justify-center rounded-xl">
          <LighthouseMark className="size-8" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Instalá Anclaje</p>
          <p className="text-muted-foreground text-xs">
            Abrila desde tu pantalla, como cualquier app.
          </p>
        </div>
        <Button size="sm" onClick={install} className="shrink-0">
          <Download aria-hidden /> Instalar
        </Button>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Ahora no"
          className="text-muted-foreground hover:text-foreground hover:bg-muted flex size-8 shrink-0 items-center justify-center rounded-full"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>

      <Sheet open={iosHelp} onOpenChange={setIosHelp}>
        <SheetContent
          title="Instalar en iPhone"
          description="Apple no deja instalar con un botón: son dos pasos en Safari."
        >
          <ol className="flex flex-col gap-3">
            <li className="bg-muted flex items-center gap-3 rounded-2xl p-4">
              <span className="bg-primary text-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold">
                1
              </span>
              <span className="text-sm">
                Tocá <Share className="mx-0.5 inline size-4 align-[-3px]" aria-label="Compartir" />{" "}
                <strong>Compartir</strong>, en la barra de abajo de Safari.
              </span>
            </li>
            <li className="bg-muted flex items-center gap-3 rounded-2xl p-4">
              <span className="bg-primary text-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold">
                2
              </span>
              <span className="text-sm">
                Elegí <SquarePlus className="mx-0.5 inline size-4 align-[-3px]" aria-hidden />{" "}
                <strong>Agregar a inicio</strong> y después <strong>Agregar</strong>.
              </span>
            </li>
          </ol>
          <SheetClose asChild>
            <Button size="lg" className="mt-4 w-full" onClick={dismiss}>
              Entendido
            </Button>
          </SheetClose>
        </SheetContent>
      </Sheet>
    </>
  );
}

"use client";

import { BellOff, BellRing } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/input";
import {
  removePushSubscription,
  savePushSubscription,
  sendTestNotification,
} from "@/lib/actions/notifications";

// Activar o desactivar los avisos en ESTE dispositivo (cada celular o compu se suscribe aparte).
// Lo usan los Ajustes del paciente y los de la profesional.

type Support = "checking" | "ok" | "unsupported" | "ios-install";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

export function PushDevice({
  vapidKey,
  onEnabled,
}: {
  vapidKey: string | null;
  /** Se llama cuando este dispositivo queda suscripto. */
  onEnabled?: () => void;
}) {
  const [support, setSupport] = useState<Support>("checking");
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [subscribed, setSubscribed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const standalone = window.matchMedia("(display-mode: standalone)").matches;
    const ok = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    // Estado del navegador: solo se puede leer acá, en el cliente.
    /* eslint-disable react-hooks/set-state-in-effect */
    if (!ok) return setSupport(ios && !standalone ? "ios-install" : "unsupported");
    setSupport("ok");
    setPermission(Notification.permission);
    /* eslint-enable react-hooks/set-state-in-effect */
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setSubscribed(Boolean(sub)))
      .catch(() => {});
  }, []);

  function enable() {
    setError(null);
    start(async () => {
      try {
        if (!vapidKey) return setError("Los avisos no están configurados en el servidor.");
        const perm = await Notification.requestPermission();
        setPermission(perm);
        if (perm !== "granted") return;
        const reg = await navigator.serviceWorker.ready;
        const sub =
          (await reg.pushManager.getSubscription()) ??
          (await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidKey),
          }));
        const json = sub.toJSON();
        const res = await savePushSubscription({
          endpoint: json.endpoint ?? "",
          keys: { p256dh: json.keys?.p256dh ?? "", auth: json.keys?.auth ?? "" },
        });
        if (!res.ok) return setError(res.error);
        setSubscribed(true);
        onEnabled?.();
      } catch {
        setError("No pudimos activar los avisos en este dispositivo.");
      }
    });
  }

  function disable() {
    start(async () => {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await removePushSubscription(sub.endpoint);
        await sub.unsubscribe().catch(() => {});
      }
      setSubscribed(false);
    });
  }

  function test() {
    setStatus(null);
    start(async () => {
      const res = await sendTestNotification();
      if (!res.ok) return setError(res.error);
      setError(null);
      setStatus("Listo, te mandamos un aviso de prueba.");
    });
  }

  return (
    <div className="flex flex-col gap-2">
      {support === "ios-install" && (
        <p className="text-muted-foreground text-sm">
          En iPhone, para recibir avisos primero agregá Anclaje a la pantalla de inicio: tocá{" "}
          <strong>Compartir</strong> y después <strong>Agregar a inicio</strong>. Abrila desde ahí y
          volvé a esta pantalla.
        </p>
      )}
      {support === "unsupported" && (
        <p className="text-muted-foreground text-sm">
          Este navegador no permite avisos. Probá desde Chrome, Edge, Firefox o Safari actualizados.
        </p>
      )}
      {support === "ok" && permission === "denied" && (
        <p className="text-muted-foreground text-sm">
          Bloqueaste los avisos para Anclaje. Si los querés, habilitalos desde la configuración del
          navegador o del celular.
        </p>
      )}
      {support === "ok" && permission !== "denied" && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-sm">
            {subscribed ? (
              <>
                <BellRing className="text-primary size-4" aria-hidden /> Este dispositivo recibe
                avisos.
              </>
            ) : (
              <>
                <BellOff className="text-muted-foreground size-4" aria-hidden /> Este dispositivo
                todavía no recibe avisos.
              </>
            )}
          </p>
          {subscribed ? (
            <div className="flex gap-2">
              <Button size="sm" variant="soft" onClick={test} disabled={pending}>
                Probar
              </Button>
              <Button size="sm" variant="ghost" onClick={disable} disabled={pending}>
                Desactivar acá
              </Button>
            </div>
          ) : (
            <Button size="sm" onClick={enable} disabled={pending}>
              Activar avisos
            </Button>
          )}
        </div>
      )}
      <FieldError>{error}</FieldError>
      {status && (
        <p role="status" className="text-muted-foreground text-sm">
          {status}
        </p>
      )}
    </div>
  );
}

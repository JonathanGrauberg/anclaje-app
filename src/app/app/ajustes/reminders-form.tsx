"use client";

import { BellOff, BellRing } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  removePushSubscription,
  saveReminderSettings,
  savePushSubscription,
  sendTestNotification,
} from "@/lib/actions/notifications";
import { cn } from "@/lib/utils";

const DAYS = [
  { n: 1, short: "L", label: "lunes" },
  { n: 2, short: "M", label: "martes" },
  { n: 3, short: "M", label: "miércoles" },
  { n: 4, short: "J", label: "jueves" },
  { n: 5, short: "V", label: "viernes" },
  { n: 6, short: "S", label: "sábado" },
  { n: 0, short: "D", label: "domingo" },
];

type Support = "checking" | "ok" | "unsupported" | "ios-install";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

export function RemindersForm({
  vapidKey,
  initial,
}: {
  vapidKey: string | null;
  initial: { enabled: boolean; time: string; days: number[] };
}) {
  const [support, setSupport] = useState<Support>("checking");
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [subscribed, setSubscribed] = useState(false);
  const [settings, setSettings] = useState(initial);
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

  function save(next: typeof settings) {
    setSettings(next);
    setStatus(null);
    start(async () => {
      const res = await saveReminderSettings(next);
      if (!res.ok) return setError(res.error);
      setError(null);
      setStatus("Guardado.");
    });
  }

  function enableDevice() {
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
        if (!settings.enabled) save({ ...settings, enabled: true });
      } catch {
        setError("No pudimos activar los avisos en este dispositivo.");
      }
    });
  }

  function disableDevice() {
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

  const toggleDay = (n: number) =>
    save({
      ...settings,
      days: settings.days.includes(n)
        ? settings.days.filter((d) => d !== n)
        : [...settings.days, n],
    });

  return (
    <div className="bg-card flex flex-col gap-4 rounded-2xl border p-4">
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
          navegador (el candado al lado de la dirección).
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
              <Button size="sm" variant="ghost" onClick={disableDevice} disabled={pending}>
                Desactivar acá
              </Button>
            </div>
          ) : (
            <Button size="sm" onClick={enableDevice} disabled={pending}>
              Activar avisos
            </Button>
          )}
        </div>
      )}

      <div className="flex items-center justify-between gap-4 border-t pt-4">
        <label htmlFor="rem-enabled">
          <span className="block font-medium">Recordarme registrar cómo estoy</span>
          <span className="text-muted-foreground text-sm">
            Un aviso amable, como mucho uno por día. Nunca dice qué registraste.
          </span>
        </label>
        <Switch
          id="rem-enabled"
          checked={settings.enabled}
          onCheckedChange={(enabled) => save({ ...settings, enabled })}
          disabled={pending}
        />
      </div>

      {settings.enabled && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rem-time">Hora</Label>
            <Input
              id="rem-time"
              type="time"
              className="w-36"
              value={settings.time}
              onChange={(e) => setSettings({ ...settings, time: e.target.value })}
              onBlur={(e) =>
                /^\d{2}:\d{2}$/.test(e.target.value) && save({ ...settings, time: e.target.value })
              }
            />
          </div>
          <fieldset className="flex flex-col gap-1.5">
            <legend className="mb-1.5 text-sm font-medium">Días</legend>
            <div className="flex flex-wrap gap-1.5">
              {DAYS.map((d) => {
                const on = settings.days.includes(d.n);
                return (
                  <button
                    key={d.n}
                    type="button"
                    aria-pressed={on}
                    aria-label={d.label}
                    onClick={() => toggleDay(d.n)}
                    className={cn(
                      "focus-visible:ring-ring size-10 rounded-full border text-sm font-medium focus-visible:ring-2 focus-visible:outline-none",
                      on ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted",
                    )}
                  >
                    {d.short}
                  </button>
                );
              })}
            </div>
          </fieldset>
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

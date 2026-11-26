"use client";

import { ArrowDown, ArrowUp, Camera, ExternalLink, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useRef, useState, useTransition } from "react";
import { Avatar } from "@/components/avatar";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label, Textarea } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { savePublicProfile, setProfilePhoto } from "@/lib/actions/public-profile";
import { JURISDICTIONS } from "@/lib/licenses";
import {
  AUDIENCES,
  type EducationItem,
  type PublicProfileInput,
} from "@/lib/validation/public-profile";

const selectClass = "border-input bg-card h-11 rounded-xl border px-3 text-sm";

/** Achica la foto en el navegador: cuadrada, 480 px, WEBP. Así pesa poco y carga rápido. */
async function squareWebp(file: File, size = 480): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(
    bitmap,
    (bitmap.width - side) / 2,
    (bitmap.height - side) / 2,
    side,
    side,
    0,
    0,
    size,
    size,
  );
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob"))), "image/webp", 0.85),
  );
}

export function PhotoPicker({ name, photoUrl }: { name: string; photoUrl: string | null }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  async function upload(file: File) {
    setError(null);
    try {
      const blob = await squareWebp(file);
      const body = new FormData();
      body.set("file", new File([blob], "foto.webp", { type: "image/webp" }));
      body.set("scope", "avatars");
      const res = await fetch("/api/files", { method: "POST", body });
      const json = (await res.json()) as { key?: string; error?: string };
      if (!res.ok || !json.key) return setError(json.error ?? "No pudimos subir la foto");
      const saved = await setProfilePhoto(json.key);
      if (!saved.ok) return setError(saved.error);
      router.refresh();
    } catch {
      setError("No pudimos leer esa imagen. Probá con un JPG o PNG.");
    }
  }

  return (
    <div className="flex items-center gap-4">
      <Avatar name={name} url={photoUrl} size={88} />
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => input.current?.click()}
          >
            <Camera aria-hidden />{" "}
            {pending ? "Subiendo…" : photoUrl ? "Cambiar foto" : "Subir foto"}
          </Button>
          {photoUrl && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const res = await setProfilePhoto(null);
                  if (!res.ok) setError(res.error);
                  router.refresh();
                })
              }
            >
              <Trash2 aria-hidden /> Sacar
            </Button>
          )}
        </div>
        <p className="text-muted-foreground text-xs">
          Opcional. Se recorta cuadrada. Sin foto se ven tus iniciales.
        </p>
        <FieldError>{error}</FieldError>
      </div>
      <input
        ref={input}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) start(() => upload(f));
        }}
      />
    </div>
  );
}

type Initial = Omit<PublicProfileInput, "approaches" | "audiences" | "languages" | "education"> & {
  approaches: string[];
  audiences: (typeof AUDIENCES)[number][];
  languages: string[];
  education: EducationItem[];
};

const csv = (s: string) =>
  s
    .split(",")
    .map((a) => a.trim())
    .filter(Boolean);

export function PublicProfileForm({
  initial,
  siteUrl,
  verified,
}: {
  initial: Initial;
  siteUrl: string;
  verified: boolean;
}) {
  const uid = useId();
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [approaches, setApproaches] = useState(initial.approaches.join(", "));
  const [languages, setLanguages] = useState(initial.languages.join(", "));
  const editEducation = (fn: (list: EducationItem[]) => EducationItem[]) =>
    set("education", fn(v.education));
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();
  const set = <K extends keyof Initial>(k: K, value: Initial[K]) => {
    setSaved(false);
    setV((x) => ({ ...x, [k]: value }));
  };
  const text = (k: keyof Initial) => ({
    id: `${uid}-${String(k)}`,
    value: (v[k] as string | undefined) ?? "",
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      set(k, e.target.value as never),
  });
  const url = `${siteUrl}/profesionales/${v.slug}`;

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        start(async () => {
          const res = await savePublicProfile({
            ...v,
            approaches: csv(approaches),
            languages: csv(languages),
            education: v.education.filter((e) => e.title.trim()),
          });
          if (!res.ok) return setError(res.error);
          setSaved(true);
          router.refresh();
        });
      }}
    >
      <div className="bg-card flex items-start justify-between gap-4 rounded-2xl border p-4">
        <div className="flex flex-col gap-1">
          <Label htmlFor={`${uid}-on`} className="text-base">
            Mostrar mi perfil público
          </Label>
          <p className="text-muted-foreground text-sm">
            {verified
              ? "Cualquiera con el link (o que te busque en Google) ve lo que cargues acá."
              : "Se va a ver cuando verifiquemos tu matrícula. Podés dejarlo listo."}
          </p>
        </div>
        <Switch
          id={`${uid}-on`}
          checked={v.publicProfile}
          onCheckedChange={(c) => set("publicProfile", c)}
        />
      </div>

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-2 text-lg font-semibold">Cómo te presentás</legend>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${uid}-slug`}>Dirección de tu perfil</Label>
          <div className="border-input bg-card focus-within:ring-ring flex items-center overflow-hidden rounded-xl border focus-within:ring-2">
            <span className="text-muted-foreground hidden pl-3 text-sm sm:inline">
              {siteUrl.replace(/^https?:\/\//, "")}/profesionales/
            </span>
            <input
              id={`${uid}-slug`}
              value={v.slug}
              maxLength={60}
              onChange={(e) =>
                set("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))
              }
              className="h-11 min-w-0 flex-1 bg-transparent px-3 text-sm outline-none sm:px-0.5"
            />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${uid}-headline`}>Título (una línea)</Label>
          <Input
            {...text("headline")}
            maxLength={120}
            placeholder="Psicóloga clínica · Adultos y adolescentes"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${uid}-bio`}>Sobre vos</Label>
          <Textarea
            {...text("bio")}
            maxLength={1500}
            className="min-h-32"
            placeholder="Cómo trabajás, con quiénes, qué puede esperar alguien de la primera consulta."
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${uid}-approaches`}>Enfoques y temas (separados por coma)</Label>
          <Input
            id={`${uid}-approaches`}
            value={approaches}
            onChange={(e) => {
              setSaved(false);
              setApproaches(e.target.value);
            }}
            placeholder="TCC, psicoanálisis, ansiedad, duelo"
          />
        </div>
        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-1.5 text-sm font-medium">A quiénes atendés</legend>
          <div className="flex flex-wrap gap-2">
            {AUDIENCES.map((a) => {
              const on = v.audiences.includes(a);
              return (
                <button
                  key={a}
                  type="button"
                  aria-pressed={on}
                  onClick={() =>
                    set("audiences", on ? v.audiences.filter((x) => x !== a) : [...v.audiences, a])
                  }
                  className={
                    on
                      ? "bg-primary text-primary-foreground border-primary rounded-full border px-3 py-1.5 text-sm"
                      : "bg-card hover:bg-muted rounded-full border px-3 py-1.5 text-sm"
                  }
                >
                  {a}
                </button>
              );
            })}
          </div>
        </fieldset>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${uid}-languages`}>Idiomas (opcional, separados por coma)</Label>
          <Input
            id={`${uid}-languages`}
            value={languages}
            onChange={(e) => {
              setSaved(false);
              setLanguages(e.target.value);
            }}
            placeholder="Español, inglés"
          />
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 text-lg font-semibold">Formación</legend>
        <p className="text-muted-foreground -mt-1 text-sm">
          Título de grado, posgrados, cursos. Se muestran en este orden.
        </p>
        {v.education.map((ed, i) => (
          <div
            key={i}
            className="bg-card grid gap-2 rounded-2xl border p-3 sm:grid-cols-[1fr_auto]"
          >
            <div className="grid gap-2 sm:grid-cols-[2fr_2fr_1fr]">
              <Input
                aria-label={`Título ${i + 1}`}
                value={ed.title}
                maxLength={150}
                placeholder="Licenciatura en Psicología"
                onChange={(e) =>
                  editEducation((l) =>
                    l.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)),
                  )
                }
              />
              <Input
                aria-label={`Institución ${i + 1}`}
                value={ed.institution ?? ""}
                maxLength={150}
                placeholder="Institución"
                onChange={(e) =>
                  editEducation((l) =>
                    l.map((x, j) => (j === i ? { ...x, institution: e.target.value } : x)),
                  )
                }
              />
              <Input
                aria-label={`Año ${i + 1}`}
                value={ed.year ?? ""}
                maxLength={20}
                placeholder="Año"
                onChange={(e) =>
                  editEducation((l) =>
                    l.map((x, j) => (j === i ? { ...x, year: e.target.value } : x)),
                  )
                }
              />
            </div>
            <div className="flex gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Subir"
                disabled={i === 0}
                onClick={() =>
                  editEducation((l) => {
                    const c = [...l];
                    [c[i - 1], c[i]] = [c[i]!, c[i - 1]!];
                    return c;
                  })
                }
              >
                <ArrowUp />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Bajar"
                disabled={i === v.education.length - 1}
                onClick={() =>
                  editEducation((l) => {
                    const c = [...l];
                    [c[i + 1], c[i]] = [c[i]!, c[i + 1]!];
                    return c;
                  })
                }
              >
                <ArrowDown />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Borrar ${ed.title || "este ítem"}`}
                onClick={() => editEducation((l) => l.filter((_, j) => j !== i))}
              >
                <Trash2 />
              </Button>
            </div>
          </div>
        ))}
        {v.education.length < 20 && (
          <div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => editEducation((l) => [...l, { title: "", institution: "", year: "" }])}
            >
              <Plus aria-hidden /> Agregar formación
            </Button>
          </div>
        )}
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-2 text-lg font-semibold">Dónde y cómo atendés</legend>
        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={v.inPerson} onCheckedChange={(c) => set("inPerson", c)} />
            Presencial
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={v.online} onCheckedChange={(c) => set("online", c)} />
            Online
          </label>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${uid}-city`}>Ciudad</Label>
            <Input {...text("city")} maxLength={80} placeholder="Paraná" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${uid}-province`}>Provincia</Label>
            <select
              id={`${uid}-province`}
              className={selectClass}
              value={v.province ?? ""}
              onChange={(e) =>
                set("province", (e.target.value || undefined) as Initial["province"])
              }
            >
              <option value="">—</option>
              {JURISDICTIONS.filter(([c]) => c !== "MN").map(([code, label]) => (
                <option key={code} value={code}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${uid}-address`}>Dirección del consultorio (opcional)</Label>
          <Input {...text("address")} maxLength={200} placeholder="Calle 123, piso 2" />
          <p className="text-muted-foreground text-xs">
            Si no la querés publicar, dejala vacía: se ve solo la ciudad.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${uid}-publicPhone`}>Teléfono público (opcional)</Label>
            <Input
              {...text("publicPhone")}
              maxLength={40}
              inputMode="tel"
              placeholder="+54 9 343 …"
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={v.whatsapp}
                onChange={(e) => set("whatsapp", e.target.checked)}
                className="accent-primary size-4"
              />
              Es WhatsApp
            </label>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${uid}-coverage`}>Obras sociales o particular (opcional)</Label>
            <Input {...text("coverage")} maxLength={300} placeholder="Particular · OSDE · IOSPER" />
          </div>
        </div>
      </fieldset>

      <div className="bg-card flex items-start justify-between gap-4 rounded-2xl border p-4">
        <div className="flex flex-col gap-1">
          <Label htmlFor={`${uid}-req`} className="text-base">
            Botón “Pedir turno”
          </Label>
          <p className="text-muted-foreground text-sm">
            Te llega una solicitud con nombre y contacto (y un mensaje si lo dejan). No reserva
            nada: vos decidís si la contactás.
          </p>
        </div>
        <Switch
          id={`${uid}-req`}
          checked={v.acceptsRequests}
          onCheckedChange={(c) => set("acceptsRequests", c)}
        />
      </div>

      <FieldError>{error}</FieldError>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : "Guardar"}
        </Button>
        {saved && (
          <p role="status" className="text-primary text-sm font-medium">
            Guardado.
          </p>
        )}
        {initial.publicProfile && verified && (
          <Button asChild variant="ghost" size="sm">
            <a href={`/profesionales/${initial.slug}`} target="_blank" rel="noopener noreferrer">
              <ExternalLink aria-hidden /> Ver mi perfil
            </a>
          </Button>
        )}
      </div>
      {v.publicProfile && (
        <p className="text-muted-foreground text-xs break-all">
          Tu link para compartir: <span className="text-foreground">{url}</span>
        </p>
      )}
    </form>
  );
}

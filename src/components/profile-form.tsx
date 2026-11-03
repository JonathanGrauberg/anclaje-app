"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/input";
import { updatePatientProfile, updateProfessionalProfile } from "@/lib/actions/profile";
import { PhoneInput } from "@/components/phone-input";
import { JURISDICTIONS, type Jurisdiction } from "@/lib/licenses";
import { formatNational, splitPhone } from "@/lib/phone";

const selectClass = "border-input bg-card h-11 rounded-xl border px-3 text-sm";

type Props =
  | { side: "patient"; email: string; phone: string | null; name: string }
  | {
      side: "pro";
      email: string;
      phone: string | null;
      displayName: string;
      licenseJurisdiction: string | null;
      licenseNumber: string | null;
      verified: boolean;
    };

/** Datos personales (Ajustes). Al guardar, avisamos por mail y al celular por seguridad. */
export function ProfileForm(props: Props) {
  const [name, setName] = useState(props.side === "patient" ? props.name : props.displayName);
  const [jurisdiction, setJurisdiction] = useState<Jurisdiction | "">(
    props.side === "pro" ? ((props.licenseJurisdiction as Jurisdiction | null) ?? "") : "",
  );
  const [license, setLicense] = useState(props.side === "pro" ? (props.licenseNumber ?? "") : "");
  const [phone, setPhone] = useState(() => {
    const p = splitPhone(props.phone);
    return { country: p.code, value: formatNational(p.code, p.national) };
  });
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();

  return (
    <form
      className="bg-card flex flex-col gap-4 rounded-2xl border p-4"
      onSubmit={(e) => {
        e.preventDefault();
        setDone(false);
        start(async () => {
          const res =
            props.side === "patient"
              ? await updatePatientProfile({
                  name,
                  phoneCountry: phone.country,
                  phone: phone.value,
                })
              : await updateProfessionalProfile({
                  displayName: name,
                  licenseJurisdiction: jurisdiction as Jurisdiction,
                  licenseNumber: license,
                  phoneCountry: phone.country,
                  phone: phone.value,
                });
          if (!res.ok) return setError(res.error);
          setError(null);
          setDone(true);
        });
      }}
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="profile-name">
          {props.side === "patient" ? "Tu nombre" : "Cómo te ven tus pacientes"}
        </Label>
        <Input
          id="profile-name"
          value={name}
          maxLength={120}
          autoComplete="name"
          placeholder={props.side === "pro" ? "Lic. Nombre Apellido" : undefined}
          aria-describedby="profile-name-hint"
          onChange={(e) => setName(e.target.value)}
          required
        />
        <p id="profile-name-hint" className="text-muted-foreground text-xs">
          {props.side === "patient"
            ? "Es el nombre que ve tu psicóloga o psicólogo."
            : "Aparece en la app de tus pacientes y en los mails que les llegan."}
        </p>
      </div>

      {props.side === "pro" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="profile-jurisdiction">Dónde estás matriculada</Label>
            <select
              id="profile-jurisdiction"
              className={selectClass}
              value={jurisdiction}
              onChange={(e) => setJurisdiction(e.target.value as Jurisdiction)}
              required
            >
              <option value="">Elegí…</option>
              {JURISDICTIONS.map(([code, label]) => (
                <option key={code} value={code}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="profile-license">Número de matrícula</Label>
            <Input
              id="profile-license"
              value={license}
              maxLength={30}
              inputMode="numeric"
              onChange={(e) => setLicense(e.target.value)}
              required
            />
          </div>
          <p className="text-muted-foreground text-xs sm:col-span-2">
            {props.verified
              ? "Tu matrícula está verificada. Si la cambiás, la volvemos a revisar."
              : "La revisamos nosotros; mientras tanto podés usar la app igual."}
          </p>
        </div>
      )}

      <PhoneInput
        id="profile-phone"
        label="Celular (opcional)"
        country={phone.country}
        value={phone.value}
        onChange={(v) => setPhone({ country: v.country, value: v.value })}
        description={
          props.side === "patient"
            ? "Lo ve tu psicóloga o psicólogo, para escribirte por WhatsApp."
            : "Para que podamos contactarte. Tus pacientes no lo ven."
        }
      />

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="profile-email">Email</Label>
        <Input
          id="profile-email"
          value={props.email}
          readOnly
          disabled
          aria-describedby="profile-email-hint"
        />
        <p id="profile-email-hint" className="text-muted-foreground text-xs">
          Es con el que entrás. Si lo necesitás cambiar, escribinos.
        </p>
      </div>

      <FieldError>{error}</FieldError>
      {done && (
        <p role="status" className="text-primary text-sm">
          Listo, guardamos tus datos. Te mandamos un aviso por seguridad.
        </p>
      )}
      <Button type="submit" className="self-start" disabled={pending}>
        {pending ? "Guardando…" : "Guardar datos"}
      </Button>
    </form>
  );
}

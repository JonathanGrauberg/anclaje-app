"use client";

import { CalendarPlus } from "lucide-react";
import { NewAppointmentForm } from "@/app/pro/agenda/agenda-client";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

/** "Dar turno" desde la ficha: abre el formulario con este paciente ya elegido. */
export function GiveAppointment({
  patient,
}: {
  patient: { id: string; name: string; withoutApp: boolean };
}) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button>
          <CalendarPlus aria-hidden /> Dar turno
        </Button>
      </SheetTrigger>
      <SheetContent
        title={`Turno para ${patient.name}`}
        description={
          patient.withoutApp ? "Queda en tu agenda." : "Queda en tu agenda y le aparece en la app."
        }
        className="sm:max-w-2xl"
      >
        <NewAppointmentForm patients={[patient]} defaultPatientId={patient.id} fixedPatient />
      </SheetContent>
    </Sheet>
  );
}

import { z } from "zod";
import { managedPatientSchema } from "./patients";

const localDateTime = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Elegí día y hora");

const base = {
  startsAt: localDateTime,
  durationMin: z.number().int().min(10, "Mínimo 10 minutos").max(240, "Máximo 4 horas"),
  modality: z.enum(["IN_PERSON", "ONLINE"]),
  place: z.string().trim().max(300).optional(),
};

export const createAppointmentSchema = z
  .object({
    /** Un paciente vinculado, o `newPatient` para cargar uno nuevo sin la app. */
    patientId: z.string().max(40).optional(),
    newPatient: managedPatientSchema.optional(),
    ...base,
    /** 1 = solo este turno; más = el mismo día y hora, todas las semanas. */
    repeatWeeks: z.number().int().min(1).max(26),
  })
  .refine((d) => !!d.patientId || !!d.newPatient, {
    message: "Elegí un paciente",
    path: ["patientId"],
  });
export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;

export const updateAppointmentSchema = z.object({ id: z.string().max(40), ...base });
export type UpdateAppointmentInput = z.infer<typeof updateAppointmentSchema>;

export const MODALITY_LABEL = { IN_PERSON: "Presencial", ONLINE: "Online" } as const;

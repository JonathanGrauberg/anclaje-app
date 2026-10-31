import { z } from "zod";

export const pushSubscriptionSchema = z.object({
  endpoint: z
    .url({ message: "Suscripción inválida" })
    .max(1000)
    .refine((u) => u.startsWith("https://"), "Suscripción inválida"),
  keys: z.object({
    p256dh: z.string().min(1).max(200),
    auth: z.string().min(1).max(100),
  }),
});
export type PushSubscriptionInput = z.infer<typeof pushSubscriptionSchema>;

export const reminderSettingsSchema = z.object({
  enabled: z.boolean(),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Elegí una hora válida"),
  days: z.array(z.number().int().min(0).max(6)).max(7),
});
export type ReminderSettingsInput = z.infer<typeof reminderSettingsSchema>;

export const digestSchema = z.object({ frequency: z.enum(["DAILY", "WEEKLY", "NEVER"]) });

import { z } from "zod";
import { JURISDICTIONS } from "@/lib/licenses";

const PROVINCES = JURISDICTIONS.filter(([c]) => c !== "MN").map(([, name]) => name) as [
  string,
  ...string[],
];

/** Profesional interesada que deja sus datos en la landing. */
export const leadSchema = z.object({
  name: z.string().trim().min(2, "Escribí tu nombre").max(120),
  email: z.email({ message: "Revisá el mail" }).max(254),
  phone: z.string().trim().max(40).optional(),
  province: z
    .enum(PROVINCES)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  message: z.string().trim().max(1000).optional(),
  consent: z.literal(true, { error: "Necesitamos tu OK para escribirte" }),
  website: z.string().max(0).optional(), // trampa para bots: un humano no la ve
});
export type LeadInput = z.input<typeof leadSchema>;
export { PROVINCES };

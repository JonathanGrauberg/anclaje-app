import { z } from "zod";

export const signInSchema = z.object({
  email: z.email("Revisá el email"),
  password: z.string().min(1, "Escribí tu contraseña"),
});

export const signUpSchema = z
  .object({
    name: z.string().trim().min(1, "¿Cómo te llamás?").max(80),
    email: z.email("Revisá el email"),
    password: z.string().min(8, "Usá al menos 8 caracteres").max(128, "Es demasiado larga"),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    path: ["confirm"],
    message: "Las contraseñas no coinciden",
  });

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;

export const forgotPasswordSchema = z.object({ email: z.email("Revisá el email") });
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    password: z.string().min(8, "Usá al menos 8 caracteres").max(128, "Es demasiado larga"),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    path: ["confirm"],
    message: "Las contraseñas no coinciden",
  });
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

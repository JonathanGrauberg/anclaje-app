import "server-only";
import nodemailer, { type Transporter } from "nodemailer";

// Envío de emails por SMTP (sirve con cualquier proveedor: Postmark, SES, Resend, Brevo…).
// Sin SMTP_URL, en desarrollo se imprime en la consola; en producción es un error.
// Los emails NUNCA llevan contenido clínico: solo avisos y links a la app.

let transporter: Transporter | null = null;

export type Email = { to: string; subject: string; text: string; html?: string };

export async function sendEmail(email: Email) {
  const url = process.env.SMTP_URL;
  if (!url) {
    if (process.env.NODE_ENV === "production") throw new Error("Falta configurar SMTP_URL");
    console.info(`\n✉️  Email para ${email.to} — ${email.subject}\n${email.text}\n`);
    return;
  }
  transporter ??= nodemailer.createTransport(url);
  await transporter.sendMail({
    from: process.env.EMAIL_FROM ?? "Anclaje <no-responder@anclaje.test>",
    ...email,
  });
}

/** Para avisos que no deben frenar la acción que los dispara (bienvenida, vinculación…). */
export async function sendEmailQuietly(email: Email, context: string) {
  try {
    await sendEmail(email);
  } catch (e) {
    console.error(`[email] no se pudo mandar: ${context}`, (e as Error).message);
  }
}

export function appUrl(path = "/") {
  return new URL(path, process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").toString();
}

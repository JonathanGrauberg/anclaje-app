import "server-only";
import { prisma } from "@/lib/db";
import { appUrl, sendEmailQuietly } from "@/lib/email";
import { accountChangedEmail } from "@/lib/emails";
import { pushConfigured, sendPushToUser } from "@/lib/push";
import { pushMessages } from "@/lib/push-messages";

// Avisos de seguridad: si cambian los datos o la contraseña de una cuenta, le avisamos por mail y
// al celular por si no fue la persona. No se pueden apagar en Ajustes y nunca frenan la acción.

export type AccountChange = "profile" | "password";

/** A dónde lleva el "si no fuiste vos": a cambiar la contraseña, o a recuperarla. */
// (No usa homeForRole de session.ts: auth.ts importa este archivo y session.ts importa auth.ts.)
function recoveryPath(change: AccountChange, role: string) {
  if (change === "password") return "/recuperar";
  const home = role === "PATIENT" ? "/app" : role === "ADMIN" ? "/admin" : "/pro";
  return `${home}/ajustes#contrasena`;
}

export async function sendAccountChangedNotice(userId: string, change: AccountChange) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true, role: true },
    });
    if (!user) return;
    const path = recoveryPath(change, user.role);
    await Promise.all([
      pushConfigured()
        ? sendPushToUser(userId, pushMessages.accountChanged(change, path))
        : Promise.resolve(0),
      sendEmailQuietly(
        { to: user.email, ...accountChangedEmail({ name: user.name, change, url: appUrl(path) }) },
        `aviso de seguridad (${change})`,
      ),
    ]);
  } catch (e) {
    console.error("[seguridad] no se pudo avisar el cambio", (e as Error).message);
  }
}

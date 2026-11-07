// Las pacientes demo ("Sofía (DEMO)") tienen un mail inventado en un dominio que no existe
// (.invalid, reservado): nunca les mandamos nada.
export const DEMO_EMAIL_DOMAIN = "demo.anclaje.invalid";

export function isDemoEmail(email: string) {
  return email.trim().toLowerCase().endsWith(`@${DEMO_EMAIL_DOMAIN}`);
}

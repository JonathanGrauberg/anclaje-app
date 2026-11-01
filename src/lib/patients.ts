// Nombre visible de un paciente: el que eligió (o le puso la profesional) o el de su cuenta.
// Los pacientes sin la app no tienen cuenta (`user` null).
export function patientName(p: { displayName: string | null; user: { name: string } | null }) {
  return p.displayName ?? p.user?.name ?? "Paciente";
}

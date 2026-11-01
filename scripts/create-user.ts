// Crea una cuenta del equipo desde la consola (para el primer admin, sobre todo).
//   npm run crear:usuario -- --rol admin --email vos@dominio --nombre "Tu Nombre"
//   npm run crear:usuario -- --rol profesional --email lic@dominio --nombre "Lic. X" --matricula "MN 123"
// Imprime una contraseña temporal UNA vez: cambiala al entrar (Ajustes → Contraseña).
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { parseArgs } from "node:util";
import { PrismaClient } from "../src/generated/prisma/client";
import { AccountError, createStaffUser } from "../src/lib/accounts";

const { values } = parseArgs({
  options: {
    rol: { type: "string" },
    email: { type: "string" },
    nombre: { type: "string" },
    matricula: { type: "string" },
    "con-perfil-profesional": { type: "boolean", default: false },
  },
});

const role = { admin: "ADMIN", profesional: "PROFESSIONAL" }[values.rol ?? ""] as
  "ADMIN" | "PROFESSIONAL" | undefined;
if (!role || !values.email?.includes("@") || !values.nombre) {
  console.error(
    'Uso: npm run crear:usuario -- --rol admin|profesional --email x@y --nombre "Nombre" [--matricula "MN 1"] [--con-perfil-profesional]',
  );
  process.exit(1);
}

const url = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL!;
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

async function main() {
  try {
    const { user, tempPassword } = await createStaffUser(prisma, {
      email: values.email!,
      name: values.nombre!,
      role: role!,
      licenseNumber: values.matricula,
      withProfessionalProfile: values["con-perfil-profesional"],
    });
    console.log(`\n✓ Cuenta creada: ${user.email} (${role === "ADMIN" ? "admin" : "profesional"})`);
    console.log(`  Contraseña temporal: ${tempPassword}`);
    console.log("  Se muestra una sola vez. Cambiala al entrar: Ajustes → Contraseña.\n");
  } catch (e) {
    console.error(e instanceof AccountError ? e.message : e);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

void main();

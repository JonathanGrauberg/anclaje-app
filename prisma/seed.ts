// Seed idempotente: rueda, distorsiones, líneas de ayuda y usuarios demo.
//   npm run db:seed
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "better-auth/crypto";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "../src/generated/prisma/client";
import { encrypt } from "../src/lib/crypto";
import { buildEmotionRows } from "../src/lib/emotions/build";
import crisisLines from "./data/crisis-lines.json";
import distortions from "./data/distortions.json";
import emotions from "./data/emotions.json";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const DEMO_PASSWORD = "sentir-demo-2026";
const CONSENT_VERSION = "2026-10-v1";

async function seedEmotions() {
  const rows = buildEmotionRows(emotions);
  // Por nivel, para que el padre exista antes que el hijo.
  for (const level of [1, 2, 3]) {
    for (const row of rows.filter((r) => r.level === level)) {
      await prisma.emotionNode.upsert({
        where: { id: row.id },
        update: {
          label: row.label,
          color: row.color,
          sortOrder: row.sortOrder,
          parentId: row.parentId,
        },
        create: row,
      });
    }
  }
  console.log(`✓ Rueda: ${rows.length} nodos`);
}

async function seedDistortions() {
  for (const [i, d] of distortions.entries()) {
    await prisma.cognitiveDistortion.upsert({
      where: { id: d.id },
      update: { name: d.name, description: d.description, example: d.example, sortOrder: i },
      create: { ...d, sortOrder: i },
    });
  }
  console.log(`✓ Distorsiones: ${distortions.length}`);
}

async function seedCrisisLines() {
  if ((await prisma.crisisLine.count()) > 0) return console.log("· Líneas de ayuda ya cargadas");
  await prisma.crisisLine.createMany({
    data: crisisLines.lines.map((l, i) => ({ ...l, sortOrder: i })),
  });
  console.log(`✓ Líneas de ayuda: ${crisisLines.lines.length}`);
}

async function upsertUser(email: string, name: string, role: "PATIENT" | "PROFESSIONAL" | "ADMIN") {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return existing;
  const id = randomUUID();
  return prisma.user.create({
    data: {
      id,
      email,
      name,
      role,
      emailVerified: true,
      accounts: {
        create: {
          id: randomUUID(),
          accountId: id,
          providerId: "credential",
          password: await hashPassword(DEMO_PASSWORD),
        },
      },
    },
  });
}

async function seedDemoUsers() {
  const proUser = await upsertUser(
    "psicologa@demo.sentir.test",
    "Lic. Laura Méndez",
    "PROFESSIONAL",
  );
  const professional = await prisma.professionalProfile.upsert({
    where: { userId: proUser.id },
    update: {},
    create: { userId: proUser.id, displayName: "Lic. Laura Méndez", licenseNumber: "MN 00000" },
  });

  await upsertUser("admin@demo.sentir.test", "Admin Sentir", "ADMIN").then((admin) =>
    prisma.professionalProfile.upsert({
      where: { userId: admin.id },
      update: {},
      create: { userId: admin.id, displayName: "Admin Sentir" },
    }),
  );

  const patientUser = await upsertUser("paciente@demo.sentir.test", "Sofía", "PATIENT");
  const patient = await prisma.patientProfile.upsert({
    where: { userId: patientUser.id },
    update: {},
    create: { userId: patientUser.id, displayName: "Sofía", sharingDefaults: { create: {} } },
  });

  await prisma.careLink.upsert({
    where: { patientId_professionalId: { patientId: patient.id, professionalId: professional.id } },
    update: {},
    create: {
      patientId: patient.id,
      professionalId: professional.id,
      consentVersion: CONSENT_VERSION,
      consentAcceptedAt: new Date(),
    },
  });

  // Plan de calma de ejemplo (en la fase 2 lo arma la profesional desde su panel).
  const plan = await prisma.copingPlan.upsert({
    where: { patientId: patient.id },
    update: {},
    create: { patientId: patient.id },
    include: { cards: true },
  });
  if (plan.cards.length === 0) {
    await prisma.copingCard.createMany({
      data: [
        {
          planId: plan.id,
          type: "TECHNIQUE",
          technique: "BREATHING",
          title: "Respiración 4-6",
          body: "Inhalá en 4 tiempos, exhalá en 6. Repetilo unas cuantas veces.",
          sortOrder: 0,
        },
        {
          planId: plan.id,
          type: "TECHNIQUE",
          technique: "GROUNDING",
          title: "Grounding 5-4-3-2-1",
          body: "Nombrá 5 cosas que ves, 4 que tocás, 3 que escuchás, 2 que olés y 1 que saboreás.",
          sortOrder: 1,
        },
        {
          planId: plan.id,
          type: "PHRASE",
          title: "Esto que siento es intenso, pero pasa.",
          sortOrder: 2,
        },
        {
          planId: plan.id,
          type: "ACTIVITY",
          title: "Salir a caminar 10 minutos",
          body: "Aunque sea a la vuelta de la manzana.",
          sortOrder: 3,
        },
      ],
    });
  }

  // Un tema de ejemplo para "Para la próxima sesión".
  if ((await prisma.sessionTopic.count({ where: { patientId: patient.id } })) === 0) {
    await prisma.sessionTopic.create({
      data: { patientId: patient.id, textEnc: encrypt("Cómo me fue con la charla con mi hermana") },
    });
  }

  console.log("✓ Usuarios demo (contraseña: " + DEMO_PASSWORD + ")");
  console.log(
    "    paciente@demo.sentir.test · psicologa@demo.sentir.test · admin@demo.sentir.test",
  );
}

async function main() {
  await seedEmotions();
  await seedDistortions();
  await seedCrisisLines();
  await seedDemoUsers();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

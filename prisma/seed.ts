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
import { TEMPLATES } from "./data/templates";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const DEMO_PASSWORD = "sentir-demo-2026";
const CONSENT_VERSION = "2026-10-v1"; // igual que src/lib/consent.ts
const DEMO_INVITE_CODE = "PRUEBA26"; // se muestra como PRUE-BA26

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

  // Plan de calma de ejemplo (la profesional lo edita desde la ficha del paciente).
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

  // Respuestas rápidas de ejemplo para las devoluciones.
  if ((await prisma.quickReply.count({ where: { professionalId: professional.id } })) === 0) {
    await prisma.quickReply.createMany({
      data: [
        {
          professionalId: professional.id,
          title: "Gracias por compartir",
          body: "Gracias por compartirlo. Me ayuda mucho a entender cómo venís.",
        },
        {
          professionalId: professional.id,
          title: "Lo vemos en sesión",
          body: "Me parece importante lo que contás. Lo charlamos con calma en la próxima sesión.",
        },
        {
          professionalId: professional.id,
          title: "Buen registro",
          body: "Muy bien que hayas podido frenar y registrarlo. Ese es justamente el ejercicio.",
        },
      ],
    });
  }

  // Una tarea de ejemplo.
  if ((await prisma.task.count({ where: { patientId: patient.id } })) === 0) {
    await prisma.task.create({
      data: {
        professionalId: professional.id,
        patientId: patient.id,
        title: "Registrar en la rueda una vez por día",
        description: "Cuando notes un cambio de ánimo. No hace falta escribir mucho.",
        dueAt: new Date(Date.now() + 6 * 86_400_000),
      },
    });
  }

  // Segundo paciente SIN vínculo, para probar la invitación + consentimiento.
  const otherUser = await upsertUser("paciente2@demo.sentir.test", "Tomás", "PATIENT");
  await prisma.patientProfile.upsert({
    where: { userId: otherUser.id },
    update: {},
    create: { userId: otherUser.id, displayName: "Tomás", sharingDefaults: { create: {} } },
  });
  // Invitación demo renovable: cada seed la deja sin usar y con 7 días por delante.
  const expiresAt = new Date(Date.now() + 7 * 86_400_000);
  await prisma.invitation.upsert({
    where: { code: DEMO_INVITE_CODE },
    update: { usedAt: null, usedById: null, expiresAt },
    create: { code: DEMO_INVITE_CODE, professionalId: professional.id, expiresAt },
  });

  console.log("✓ Usuarios demo (contraseña: " + DEMO_PASSWORD + ")");
  console.log(
    "    paciente@demo.sentir.test · paciente2@demo.sentir.test (sin vínculo) · psicologa@demo.sentir.test · admin@demo.sentir.test",
  );
  console.log("✓ Invitación demo: /vincular/" + DEMO_INVITE_CODE);
}

// Plantillas del sistema (PHQ-9, GAD-7): estructura y puntaje, ítems como TODO.
async function seedTemplates() {
  for (const t of TEMPLATES) {
    const exists = await prisma.assessment.findFirst({ where: { ownerId: null, title: t.title } });
    if (exists) continue;
    const a = await prisma.assessment.create({
      data: {
        title: t.title,
        description: t.description,
        sourceNote: t.sourceNote,
        isTemplate: true,
      },
    });
    const v = await prisma.assessmentVersion.create({
      data: {
        assessmentId: a.id,
        version: 1,
        status: "PUBLISHED",
        publishedAt: new Date(),
        referencePeriod: t.referencePeriod,
        instructions: "TODO: copiar las instrucciones de la versión validada.",
        scoringMethod: "SUM",
      },
    });
    for (let i = 1; i <= t.items; i++) {
      const qid = `tpl-${t.slug}-q${i}`;
      const critical = t.criticalItem?.index === i;
      await prisma.question.create({
        data: {
          id: qid,
          versionId: v.id,
          sortOrder: i - 1,
          type: "LIKERT",
          text: `TODO: ítem ${i} — copiar la redacción de la versión validada`,
          criticalOperator: critical ? "GTE" : null,
          criticalValue: critical ? t.criticalItem!.minValue : null,
          options: {
            create: [0, 1, 2, 3].map((value) => ({
              id: `${qid}-o${value}`,
              label: `TODO: opción ${value}`,
              value,
              sortOrder: value,
            })),
          },
        },
      });
    }
    if (t.extraUnscoredItem) {
      const qid = `tpl-${t.slug}-dif`;
      await prisma.question.create({
        data: {
          id: qid,
          versionId: v.id,
          sortOrder: t.items,
          type: "SINGLE_CHOICE",
          text: "TODO: pregunta de dificultad funcional (no suma al puntaje)",
          scored: false,
          required: false,
          options: {
            create: [0, 1, 2, 3].map((value) => ({
              id: `${qid}-o${value}`,
              label: `TODO: opción ${value}`,
              value,
              sortOrder: value,
            })),
          },
        },
      });
    }
    await prisma.scoreRange.createMany({
      data: t.ranges.map((r) => ({ versionId: v.id, ...r })),
    });
  }
  console.log(`✓ Plantillas: ${TEMPLATES.map((t) => t.title).join(", ")}`);
}

/** Historial de la rueda para la demo (para ver "Mis patrones"). Solo si Sofía casi no tiene. */
async function seedDemoHistory() {
  const patient = await prisma.patientProfile.findFirst({
    where: { user: { email: "paciente@demo.sentir.test" } },
    select: { id: true, _count: { select: { emotionEntries: true } } },
  });
  if (!patient || patient._count.emotionEntries >= 10) return;
  const nodes = await prisma.emotionNode.findMany({
    where: { active: true, level: { gte: 2 } },
    select: { id: true },
    orderBy: { id: "asc" },
  });
  // Pseudoaleatorio con semilla fija: el seed da siempre lo mismo.
  let x = 42;
  const rnd = () => (x = (x * 1103515245 + 12345) % 2 ** 31) / 2 ** 31;
  const preferred = nodes.filter((_, i) => i % 7 === 0); // unas pocas emociones que se repiten
  const now = Date.now();
  let created = 0;
  for (let day = 60; day >= 1; day--) {
    if (rnd() < 0.35) continue; // no todos los días hay registro
    const hour = [8, 13, 19, 22, 23][Math.floor(rnd() * 5)];
    const occurredAt = new Date(now - day * 86_400_000);
    occurredAt.setUTCHours(hour + 3, Math.floor(rnd() * 60), 0, 0); // hora de Buenos Aires
    const pool = rnd() < 0.7 ? preferred : nodes;
    const count = rnd() < 0.3 ? 2 : 1;
    const picked = new Set<string>();
    while (picked.size < count) picked.add(pool[Math.floor(rnd() * pool.length)].id);
    const visibility = rnd() < 0.8 ? "SHARED" : "PRIVATE";
    await prisma.emotionEntry.create({
      data: {
        patientId: patient.id,
        occurredAt,
        bodyZones: [],
        visibility,
        sharedAt: visibility === "SHARED" ? occurredAt : null,
        items: {
          create: [...picked].map((nodeId) => ({
            nodeId,
            intensity: Math.max(1, Math.min(10, Math.round(3 + rnd() * 5 + (day < 20 ? 0 : 1)))),
          })),
        },
      },
    });
    created++;
  }
  console.log(`✓ Historial demo de la rueda: ${created} registros`);
}

async function main() {
  await seedEmotions();
  await seedDistortions();
  await seedCrisisLines();
  await seedTemplates();
  await seedDemoUsers();
  await seedDemoHistory();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

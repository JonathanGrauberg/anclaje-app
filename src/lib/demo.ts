import "server-only";
import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { CONSENT_VERSION } from "@/lib/consent";
import { encrypt } from "@/lib/crypto";
import { prisma } from "@/lib/db";
import { DEMO_EMAIL_DOMAIN } from "@/lib/demo-email";

// Paciente de ejemplo "Sofía (DEMO)": cada profesional la tiene en su lista para ver cómo se ve lo
// que comparte un paciente, y puede entrar a la app "como ella" (cookie DEMO_VIEW_COOKIE). La
// usuaria no tiene contraseña ni un mail real: no se puede ingresar con ella. Ver DECISIONES.md.

export const DEMO_NAME = "Sofía (DEMO)";
export const DEMO_VIEW_COOKIE = "anclaje-ver-como";

const DAY = 86_400_000;
/** Fecha de hace `days` días a una hora de Buenos Aires (UTC-3). */
function ago(days: number, hour = 20, minute = 0) {
  const d = new Date(Date.now() - days * DAY);
  d.setUTCHours(hour + 3, minute, 0, 0);
  return d;
}

/** Crea la paciente de ejemplo de esta profesional, una sola vez (si la borra, no vuelve). */
export async function ensureDemoPatient(professionalId: string) {
  // Marcamos primero (con condición) para que dos pestañas a la vez no creen dos demos.
  const claimed = await prisma.professionalProfile.updateMany({
    where: { id: professionalId, demoCreatedAt: null },
    data: { demoCreatedAt: new Date() },
  });
  if (claimed.count === 0) return;
  try {
    await createDemoPatient(professionalId);
  } catch (e) {
    // Si falla, se vuelve a intentar en la próxima visita.
    await prisma.professionalProfile.update({
      where: { id: professionalId },
      data: { demoCreatedAt: null },
    });
    console.error("[demo] no se pudo crear la paciente de ejemplo", (e as Error).message);
  }
}

async function createDemoPatient(professionalId: string) {
  const nodes = await prisma.emotionNode.findMany({
    where: {
      active: true,
      label: {
        in: [
          "Ansioso",
          "Preocupado",
          "Agobiado",
          "Frustrado",
          "Esperanzado",
          "Satisfecho",
          "Melancólico",
          "Inseguro",
          "Pacífico",
        ],
      },
    },
    select: { id: true, label: true },
  });
  const node = (label: string) => {
    const n = nodes.find((x) => x.label === label);
    if (!n) throw new Error(`Falta la emoción ${label}`);
    return n.id;
  };

  const userId = randomUUID();
  await prisma.$transaction(async (tx) => {
    await tx.user.create({
      data: {
        id: userId,
        name: DEMO_NAME,
        email: `demo-${professionalId}@${DEMO_EMAIL_DOMAIN}`,
        emailVerified: true,
        role: "PATIENT",
      },
    });
    const patient = await tx.patientProfile.create({
      data: {
        userId,
        displayName: DEMO_NAME,
        isDemo: true,
        appointmentEmails: false,
        sharingDefaults: { create: {} },
      },
    });
    const patientId = patient.id;
    await tx.careLink.create({
      data: {
        patientId,
        professionalId,
        consentVersion: CONSENT_VERSION,
        consentAcceptedAt: ago(20, 18),
        createdAt: ago(20, 18),
      },
    });

    // Rueda: un par de semanas de registros, casi todos compartidos.
    const emotions: {
      days: number;
      hour: number;
      items: [string, number][];
      note?: string;
      shared?: boolean;
      intention?: "DISCUSS_IN_SESSION" | "WANT_FEEDBACK" | "JUST_FYI";
    }[] = [
      { days: 13, hour: 9, items: [["Ansioso", 6]] },
      {
        days: 11,
        hour: 19,
        items: [["Frustrado", 5]],
        note: "Discusión en el trabajo por un informe.",
      },
      { days: 9, hour: 22, items: [["Pacífico", 4]], shared: false },
      {
        days: 8,
        hour: 23,
        items: [
          ["Preocupado", 7],
          ["Inseguro", 5],
        ],
        note: "Mañana tengo la entrevista y no puedo dormir.",
        intention: "DISCUSS_IN_SESSION",
      },
      {
        days: 6,
        hour: 18,
        items: [["Satisfecho", 6]],
        note: "Me fue mejor de lo que pensaba.",
      },
      { days: 4, hour: 21, items: [["Melancólico", 5]] },
      {
        days: 2,
        hour: 13,
        items: [["Agobiado", 7]],
        note: "Mucho para hacer y poco tiempo. No sé por dónde empezar.",
        intention: "WANT_FEEDBACK",
      },
      { days: 1, hour: 20, items: [["Esperanzado", 6]] },
    ];
    let satisfiedEntryId = "";
    for (const e of emotions) {
      const occurredAt = ago(e.days, e.hour, 15);
      const shared = e.shared !== false;
      const entry = await tx.emotionEntry.create({
        data: {
          patientId,
          occurredAt,
          createdAt: occurredAt,
          bodyZones: [],
          noteEnc: e.note ? encrypt(e.note) : null,
          visibility: shared ? "SHARED" : "PRIVATE",
          sharedAt: shared ? occurredAt : null,
          intention: e.intention ?? null,
          items: {
            create: e.items.map(([label, intensity]) => ({ nodeId: node(label), intensity })),
          },
        },
      });
      if (e.items[0][0] === "Satisfecho") satisfiedEntryId = entry.id;
    }

    // Una devolución de la profesional sobre un registro.
    await tx.feedback.create({
      data: {
        professionalId,
        patientId,
        targetType: "EMOTION",
        targetId: satisfiedEntryId,
        bodyEnc: encrypt(
          "¡Qué bueno! Fijate qué hiciste distinto esta vez, así lo charlamos en la sesión.",
        ),
        createdAt: ago(5, 10),
      },
    });

    // Autorregistro terminado y compartido.
    await tx.cbtRecord.create({
      data: {
        patientId,
        status: "COMPLETE",
        currentStep: 7,
        occurredAt: ago(7, 17),
        createdAt: ago(7, 17),
        updatedAt: ago(7, 18),
        situationEnc: encrypt("Mi jefe me pidió hablar a solas el lunes."),
        thoughtEnc: encrypt("Seguro hice algo mal y me van a echar."),
        beliefBefore: 85,
        bodyZones: [],
        behaviorEnc: encrypt("Me quedé callada todo el día y dormí mal."),
        alternativeEnc: encrypt(
          "Puede ser por muchas cosas. La última evaluación fue buena y nadie me dijo nada.",
        ),
        beliefAfter: 40,
        visibility: "SHARED",
        sharedAt: ago(7, 18),
        intention: "DISCUSS_IN_SESSION",
        distortions: {
          create: [
            { distortionId: "catastrofizacion" },
            { distortionId: "adivinacion-del-futuro" },
          ],
        },
        emotions: { create: [{ nodeId: node("Ansioso"), intensityBefore: 8, intensityAfter: 4 }] },
      },
    });

    // Diario: una entrada privada (no la ve la profesional) y una compartida.
    await tx.journalEntry.create({
      data: {
        patientId,
        isDraft: false,
        visibility: "PRIVATE",
        titleEnc: encrypt("Caminata"),
        bodyEnc: encrypt("Hoy salí a caminar sin el celular. Hacía mucho que no lo hacía."),
        createdAt: ago(3, 19),
      },
    });
    await tx.journalEntry.create({
      data: {
        patientId,
        isDraft: false,
        visibility: "SHARED",
        sharedAt: ago(10, 21),
        intention: "JUST_FYI",
        titleEnc: encrypt("Lo que me quedó de la sesión"),
        bodyEnc: encrypt(
          "Me quedé pensando en eso de que no tengo que resolver todo hoy. Lo anoté para acordarme.",
        ),
        createdAt: ago(10, 21),
      },
    });

    // Para la próxima sesión.
    await tx.sessionTopic.createMany({
      data: [
        {
          patientId,
          textEnc: encrypt("Cómo manejar los nervios antes de una entrevista"),
          createdAt: ago(3, 22),
        },
        {
          patientId,
          textEnc: encrypt("Lo que me pasa cuando hablo con mi mamá"),
          createdAt: ago(1, 21),
        },
        {
          patientId,
          textEnc: encrypt("Cómo me fue con la charla con mi hermana"),
          createdAt: ago(12, 20),
          discussedAt: ago(9, 18),
        },
      ],
    });

    // Tareas: una pendiente y una hecha con comentario.
    await tx.task.createMany({
      data: [
        {
          professionalId,
          patientId,
          title: "Registrar en la rueda una vez por día",
          description: "Cuando notes un cambio de ánimo. No hace falta escribir mucho.",
          dueAt: new Date(Date.now() + 5 * DAY),
          createdAt: ago(9, 18),
        },
        {
          professionalId,
          patientId,
          title: "Probar la respiración 4-6 antes de dormir",
          dueAt: ago(2, 23),
          completedAt: ago(3, 23),
          patientCommentEnc: encrypt("Me ayudó a dormirme más rápido."),
          createdAt: ago(9, 18),
        },
      ],
    });

    // Plan de calma.
    const plan = await tx.copingPlan.create({ data: { patientId } });
    await tx.copingCard.createMany({
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
  });
}

/**
 * Si la profesional está "viendo como paciente", devuelve la paciente demo, verificando que sea
 * de ella (demo + vínculo activo). Si la cookie no corresponde, devuelve null.
 */
export async function getDemoViewPatient(professionalUserId: string) {
  const patientId = (await cookies()).get(DEMO_VIEW_COOKIE)?.value;
  if (!patientId) return null;
  return prisma.patientProfile.findFirst({
    where: {
      id: patientId,
      isDemo: true,
      userId: { not: null },
      links: {
        some: { status: "ACTIVE", professional: { userId: professionalUserId } },
      },
    },
    include: { sharingDefaults: true, user: true },
  });
}

/** La paciente demo de esta profesional (para el botón "Ver como paciente"). */
export function findDemoPatient(professionalId: string) {
  return prisma.patientProfile.findFirst({
    where: { isDemo: true, links: { some: { professionalId, status: "ACTIVE" } } },
    select: { id: true },
  });
}

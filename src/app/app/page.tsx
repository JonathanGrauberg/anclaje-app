import {
  BookHeart,
  ChartLine,
  ClipboardCheck,
  HeartHandshake,
  ListChecks,
  MessageCircleHeart,
  NotebookPen,
  Sparkles,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { greeting } from "@/lib/dates";
import { countUnreadFeedback } from "@/lib/queries/feedback";
import { dueAssignmentsWhere } from "@/lib/queries/patient";
import { prisma } from "@/lib/db";
import { requirePatient } from "@/lib/session";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Inicio" };

export default async function PatientHome() {
  const { user, patient } = await requirePatient();
  const [pendingTopics, cbtDraft, unreadFeedback, openTasks, dueAssessments] = await Promise.all([
    prisma.sessionTopic.count({ where: { patientId: patient.id, discussedAt: null } }),
    prisma.cbtRecord.findFirst({
      where: { patientId: patient.id, status: "DRAFT" },
      orderBy: { updatedAt: "desc" },
      select: { id: true },
    }),
    countUnreadFeedback(patient.id),
    prisma.task.count({ where: { patientId: patient.id, completedAt: null } }),
    prisma.assessmentAssignment.count({ where: dueAssignmentsWhere(patient.id) }),
  ]);
  const name = patient.displayName ?? user.name;
  const pendingTasks = openTasks + dueAssessments;

  const tiles = [
    {
      href: "/app/diario",
      title: "Mi diario íntimo",
      text: "Escribí lo que quieras. Es privado.",
      icon: BookHeart,
      tone: "bg-[#F6E7DC] text-[#7A4630] dark:bg-[#3A2C27] dark:text-[#F2C9B4]",
    },
    {
      href: cbtDraft ? `/app/autorregistro/${cbtDraft.id}` : "/app/autorregistro",
      title: "Autorregistro",
      text: cbtDraft
        ? "Tenés uno a medio hacer. Seguilo cuando quieras."
        : "Paso a paso, para mirar un pensamiento.",
      icon: NotebookPen,
      tone: "bg-[#E7E1F4] text-[#4E3D7A] dark:bg-[#2D2840] dark:text-[#D4C8F2]",
    },
    {
      href: "/app/proxima-sesion",
      title: "Para la próxima sesión",
      text: pendingTopics
        ? `${pendingTopics} ${pendingTopics === 1 ? "tema anotado" : "temas anotados"}`
        : "Anotá lo que querés hablar.",
      icon: MessageCircleHeart,
      tone: "bg-[#E3EFEA] text-[#2F5D52] dark:bg-[#23332F] dark:text-[#A9D9C9]",
    },
    {
      href: "/app/tareas",
      title: "Mis tareas y evaluaciones",
      text: pendingTasks
        ? `${pendingTasks} ${pendingTasks === 1 ? "pendiente" : "pendientes"}, a tu ritmo`
        : "Lo que te propuso tu psicóloga.",
      icon: ListChecks,
      tone: "bg-[#FBF0CF] text-[#6B5414] dark:bg-[#3A331F] dark:text-[#F2DD9C]",
    },
    {
      href: "/app/plan-de-calma",
      title: "Mi plan de calma",
      text: "Para cuando todo se pone intenso.",
      icon: HeartHandshake,
      tone: "bg-[#FBE3E8] text-[#7D2E43] dark:bg-[#3A2229] dark:text-[#F5B9C8]",
    },
    {
      href: "/app/patrones",
      title: "Mis patrones",
      text: "Cómo vienen tus emociones.",
      icon: ChartLine,
      tone: "bg-[#E4ECF3] text-[#2E4A63] dark:bg-[#222C36] dark:text-[#B9D0E5]",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <section>
        <p className="text-muted-foreground">{greeting()},</p>
        <h1 className="text-3xl font-semibold tracking-tight">{name}. ¿Cómo venís hoy?</h1>
      </section>

      {unreadFeedback > 0 && (
        <Link
          href="/app/devoluciones"
          className="bg-primary-soft text-primary flex items-center gap-3 rounded-3xl p-4 font-medium"
        >
          <Sparkles className="size-6 shrink-0" aria-hidden />
          {unreadFeedback === 1
            ? "Tu psicóloga te dejó una devolución"
            : `Tu psicóloga te dejó ${unreadFeedback} devoluciones`}
        </Link>
      )}

      <Link
        href="/app/rueda"
        className="group bg-card relative flex items-center gap-5 overflow-hidden rounded-3xl border p-5 shadow-sm transition-transform active:scale-[0.99]"
      >
        <WheelPreview />
        <span className="flex flex-col gap-1">
          <span className="text-xl font-semibold">Rueda de las emociones</span>
          <span className="text-muted-foreground">Registrá lo que sentís en unos segundos.</span>
        </span>
      </Link>

      <ul className="grid grid-cols-2 gap-3 sm:gap-4">
        {tiles.map(({ href, title, text, icon: Icon, tone }) => (
          <li key={title}>
            <Link
              href={href}
              className={cn(
                "flex h-full min-h-36 flex-col gap-2 rounded-3xl p-4 transition-transform active:scale-[0.98] sm:p-5",
                tone,
              )}
            >
              <Icon className="size-7" aria-hidden />
              <span className="text-base leading-tight font-semibold sm:text-lg">{title}</span>
              <span className="text-sm opacity-85">{text}</span>
            </Link>
          </li>
        ))}
      </ul>

      <Link
        href="/app/rueda/historial"
        className="text-muted-foreground flex items-center justify-center gap-2 text-sm underline-offset-4 hover:underline"
      >
        <ClipboardCheck className="size-4" aria-hidden /> Ver lo que registré
      </Link>
      <Link
        href="/app/devoluciones"
        className="text-muted-foreground -mt-4 flex items-center justify-center gap-2 text-sm underline-offset-4 hover:underline"
      >
        <MessageCircleHeart className="size-4" aria-hidden /> Devoluciones de mi psicóloga
      </Link>
    </div>
  );
}

function WheelPreview() {
  const colors = ["#F5A9BC", "#A9D9B4", "#C6B5E6", "#FFC690", "#F9E08A", "#C8CED8"];
  return (
    <svg
      viewBox="-50 -50 100 100"
      className="size-20 shrink-0 transition-transform duration-700 group-hover:rotate-60"
      aria-hidden
    >
      {colors.map((c, i) => {
        const a0 = (i * 60 - 90) * (Math.PI / 180);
        const a1 = ((i + 1) * 60 - 90) * (Math.PI / 180);
        const p = (r: number, a: number) =>
          `${(r * Math.cos(a)).toFixed(2)} ${(r * Math.sin(a)).toFixed(2)}`;
        return (
          <path
            key={c}
            d={`M ${p(18, a0)} L ${p(48, a0)} A 48 48 0 0 1 ${p(48, a1)} L ${p(18, a1)} A 18 18 0 0 0 ${p(18, a0)} Z`}
            fill={c}
            stroke="var(--card)"
            strokeWidth="2"
          />
        );
      })}
    </svg>
  );
}

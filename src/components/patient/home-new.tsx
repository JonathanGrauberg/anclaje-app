import {
  ArrowRight,
  ChartLine,
  ClipboardCheck,
  HeartHandshake,
  ListChecks,
  MessageCircleHeart,
  NotebookPen,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import {
  ArmchairScene,
  LighthouseScene,
  NotebookScene,
  PlantScene,
} from "@/components/illustrations";
import { formatLongDay, formatTime, greeting, LOCALE, TIME_ZONE } from "@/lib/dates";
import { cn } from "@/lib/utils";

export type HomeData = {
  name: string;
  nextAppointment: Date | null;
  unreadFeedback: number;
  pendingTopics: number;
  pendingTasks: number;
  cbtDraftId: string | null;
  wheel: React.ReactNode;
};

const todayFmt = new Intl.DateTimeFormat(LOCALE, {
  timeZone: TIME_ZONE,
  weekday: "long",
  day: "numeric",
  month: "short",
});

/** Inicio del paciente con el diseño "nuevo" (bloques de color y dibujos 2D). */
export function HomeNew({
  name,
  nextAppointment,
  unreadFeedback,
  pendingTopics,
  pendingTasks,
  cbtDraftId,
  wheel,
}: HomeData) {
  const parts = todayFmt.formatToParts(new Date());
  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "";
  const rest = parts
    .filter((p) => p.type === "day" || p.type === "month")
    .map((p) => p.value.replace(".", ""));

  return (
    <div className="flex flex-col gap-5">
      <section className="pt-2">
        <h1 className="text-[2rem] leading-[1.05] font-bold tracking-tight">
          {greeting()},
          <br />
          <span className="text-primary">{name}</span>
        </h1>
      </section>

      {/* Bloque principal: hoy, el próximo turno y el registro rápido */}
      <section className="bg-block-sun text-block-sun-foreground relative isolate overflow-hidden rounded-[2rem] p-6 pb-0">
        <div
          className="bg-block-sun-deep absolute -top-10 -right-10 -z-10 size-44 rounded-full"
          aria-hidden
        />
        <p className="text-lg font-semibold first-letter:uppercase">
          {weekday} <span className="font-normal opacity-80">{rest.join(" ")}</span>
        </p>
        <p className="mt-6 max-w-[15rem] text-xl leading-snug font-semibold">
          {nextAppointment ? (
            <>
              Tu próxima sesión es el{" "}
              <span className="whitespace-nowrap">{formatLongDay(nextAppointment)}</span>, a las{" "}
              {formatTime(nextAppointment)}.
            </>
          ) : (
            "¿Cómo venís hoy?"
          )}
        </p>
        <div className="flex items-end justify-between gap-2">
          <Link
            href="/app/rueda"
            className="bg-block-night mb-6 inline-flex shrink-0 items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold text-white transition-transform active:scale-[0.97]"
          >
            Contá cómo estás <ArrowRight className="size-4" aria-hidden />
          </Link>
          <ArmchairScene className="-mr-4 w-44 shrink sm:w-56" />
        </div>
      </section>

      {unreadFeedback > 0 && (
        <Link
          href="/app/devoluciones"
          className="bg-block-night flex items-center gap-3 rounded-3xl p-4 font-medium text-white"
        >
          <Sparkles className="text-block-sun size-6 shrink-0" aria-hidden />
          {unreadFeedback === 1
            ? "Tu psicóloga te dejó una devolución"
            : `Tu psicóloga te dejó ${unreadFeedback} devoluciones`}
        </Link>
      )}

      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <Tile
          href="/app/rueda"
          title="Rueda de las emociones"
          text="Lo que sentís, en segundos."
          className="bg-block-sage text-block-sage-foreground col-span-2 flex-row items-center gap-4"
          art={<span className="shrink-0">{wheel}</span>}
        />
        <Tile
          href="/app/diario"
          title="Mi diario íntimo"
          text="Es privado."
          className="bg-block-forest text-block-forest-foreground row-span-2 min-h-64"
          art={<NotebookScene className="mt-auto w-full max-w-40 self-center" />}
        />
        <Tile
          href="/app/proxima-sesion"
          title="Para la próxima sesión"
          text={
            pendingTopics
              ? `${pendingTopics} ${pendingTopics === 1 ? "tema anotado" : "temas anotados"}`
              : "Anotá lo que querés hablar."
          }
          icon={MessageCircleHeart}
          className="bg-card border"
        />
        <Tile
          href={cbtDraftId ? `/app/autorregistro/${cbtDraftId}` : "/app/autorregistro"}
          title="Autorregistro"
          text={cbtDraftId ? "Tenés uno a medio hacer." : "Para mirar un pensamiento."}
          icon={NotebookPen}
          className="bg-block-sun-soft"
        />
        <Tile
          href="/app/tareas"
          title="Tareas y evaluaciones"
          text={
            pendingTasks
              ? `${pendingTasks} ${pendingTasks === 1 ? "pendiente" : "pendientes"}, a tu ritmo`
              : "Lo que te propuso tu psicóloga."
          }
          icon={ListChecks}
          className="bg-block-sage-soft"
        />
        <Tile
          href="/app/plan-de-calma"
          title="Mi plan de calma"
          text="Para cuando todo se pone intenso."
          icon={HeartHandshake}
          className="bg-block-night relative overflow-hidden pb-14 text-white"
          art={<LighthouseScene className="absolute right-2 bottom-1 w-14" />}
        />
        <Tile
          href="/app/patrones"
          title="Mis patrones"
          text="Cómo vienen tus emociones."
          icon={ChartLine}
          className="bg-card relative col-span-2 min-h-28 overflow-hidden border"
          art={<PlantScene className="absolute right-4 -bottom-3 w-16" />}
        />
      </div>

      <div className="flex flex-col items-center gap-3 pt-1">
        <Link
          href="/app/rueda/historial"
          className="text-muted-foreground flex items-center gap-2 text-sm underline-offset-4 hover:underline"
        >
          <ClipboardCheck className="size-4" aria-hidden /> Ver lo que registré
        </Link>
        <Link
          href="/app/devoluciones"
          className="text-muted-foreground flex items-center gap-2 text-sm underline-offset-4 hover:underline"
        >
          <MessageCircleHeart className="size-4" aria-hidden /> Devoluciones de mi psicóloga
        </Link>
      </div>
    </div>
  );
}

function Tile({
  href,
  title,
  text,
  icon: Icon,
  art,
  className,
}: {
  href: string;
  title: string;
  text: string;
  icon?: React.ComponentType<{ className?: string }>;
  art?: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex h-full min-h-36 flex-col gap-2 rounded-[1.75rem] p-4 transition-transform active:scale-[0.98] sm:p-5",
        className,
      )}
    >
      {Icon && <Icon className="size-6 opacity-90" aria-hidden />}
      <span className="flex flex-col gap-1">
        <span className="text-base leading-tight font-semibold sm:text-lg">{title}</span>
        <span className="text-sm opacity-80">{text}</span>
      </span>
      {art}
    </Link>
  );
}

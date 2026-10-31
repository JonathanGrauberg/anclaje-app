import { CalendarCheck, Paperclip } from "lucide-react";
import Link from "next/link";
import { formatRelative } from "@/lib/dates";
import type { PatientFeedback } from "@/lib/queries/feedback";
import { cn } from "@/lib/utils";

const TARGET_LINK: Record<string, (id: string) => string> = {
  JOURNAL: (id) => `/app/diario/${id}`,
  CBT: (id) => `/app/autorregistro/${id}`,
  EMOTION: () => "/app/rueda/historial",
};
const TARGET_LABEL: Record<string, string> = {
  JOURNAL: "tu diario",
  CBT: "tu autorregistro",
  EMOTION: "tu registro de la rueda",
};

/** Devoluciones de la psicóloga, con tono cálido. `showTarget` agrega el link a la entrada. */
export function FeedbackList({
  feedbacks,
  showTarget = false,
}: {
  feedbacks: PatientFeedback[];
  showTarget?: boolean;
}) {
  return (
    <ul className="flex flex-col gap-3">
      {feedbacks.map((f) => (
        <li
          key={f.id}
          className={cn(
            "bg-primary-soft/60 flex flex-col gap-2 rounded-3xl p-4",
            f.unread && "ring-primary/40 ring-2",
          )}
        >
          <p className="text-muted-foreground text-sm">
            <span className="text-foreground font-medium">{f.from}</span> ·{" "}
            {formatRelative(f.createdAt)}
            {f.unread && <span className="text-primary ml-2 font-medium">Nueva</span>}
          </p>
          <p className="leading-relaxed whitespace-pre-wrap">{f.body}</p>
          {(f.discussInSession || f.resource) && (
            <div className="flex flex-wrap gap-3 text-sm">
              {f.discussInSession && (
                <span className="flex items-center gap-1.5">
                  <CalendarCheck className="text-primary size-4" aria-hidden /> Lo vemos en sesión
                </span>
              )}
              {f.resource && (
                <span className="flex items-center gap-1.5">
                  <Paperclip className="text-primary size-4" aria-hidden />
                  {f.resource.url ? (
                    <a
                      href={f.resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      {f.resource.title}
                    </a>
                  ) : (
                    f.resource.title
                  )}
                </span>
              )}
            </div>
          )}
          {showTarget && TARGET_LINK[f.targetType] && (
            <Link
              href={TARGET_LINK[f.targetType](f.targetId)}
              className="text-primary self-start text-sm underline-offset-4 hover:underline"
            >
              Sobre {TARGET_LABEL[f.targetType]}
            </Link>
          )}
        </li>
      ))}
    </ul>
  );
}

import {
  BellRing,
  BookOpenText,
  CalendarCheck,
  ClipboardList,
  Eye,
  FileLock2,
  HeartHandshake,
  LifeBuoy,
  LockKeyhole,
  MessageSquareHeart,
  NotebookPen,
  ScrollText,
  ShieldCheck,
  Sparkles,
  UserRoundCheck,
  Wallet,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { HeroLighthouse } from "@/components/landing/hero-lighthouse";
import { LeadForm } from "@/components/landing/lead-form";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { getSession, homeForRole, type Role } from "@/lib/session";

export const metadata: Metadata = {
  title: { absolute: "Anclaje · Un ancla entre sesión y sesión" },
  description:
    "La app para psicólogas y psicólogos y sus pacientes: registro emocional, diario, autorregistros, agenda, historia clínica y honorarios. Todo cifrado.",
  robots: { index: true, follow: true },
};

const forPatients = [
  {
    icon: Sparkles,
    title: "Rueda de las emociones",
    text: "Ponerle nombre a lo que sienten, en segundos y desde el celular.",
  },
  {
    icon: NotebookPen,
    title: "Diario y autorregistros",
    text: "El diario es privado por defecto. Los autorregistros siguen el modelo cognitivo.",
  },
  {
    icon: HeartHandshake,
    title: "Plan de calma",
    text: "Lo que les sirve cuando la cosa se pone difícil, siempre a mano.",
  },
  {
    icon: LifeBuoy,
    title: "Ayuda urgente",
    text: "Un botón con las líneas de su zona, incluido el Hospital Escuela de Salud Mental de Paraná.",
  },
];

const forYou = [
  {
    icon: MessageSquareHeart,
    title: "Lo que eligen compartir",
    text: "Llegás a la sesión sabiendo cómo vino la semana, y podés dejarles una devolución.",
  },
  {
    icon: CalendarCheck,
    title: "Agenda con recordatorios",
    text: "Turnos únicos o semanales. El día anterior les llega un mail para que no se olviden.",
  },
  {
    icon: ScrollText,
    title: "Historia clínica",
    text: "Ficha, notas y evaluaciones en un solo lugar, también de pacientes que no usan la app.",
  },
  {
    icon: ClipboardList,
    title: "Evaluaciones y tareas",
    text: "Armá tus cuestionarios, asigná tareas y recursos de tu biblioteca.",
  },
  {
    icon: Wallet,
    title: "Honorarios y cobros",
    text: "Tu lista de precios a mano, precios por paciente y lo cobrado en el mes, sin planillas aparte.",
  },
  {
    icon: BellRing,
    title: "Avisos al celular",
    text: "Te enterás cuando un paciente avisa que no puede venir o se suma a la app. Sin nombres en el aviso.",
  },
];

const security = [
  {
    icon: LockKeyhole,
    title: "Cifrado",
    text: "Todo lo que escriben tus pacientes y tus notas clínicas se guarda cifrado con AES-256.",
  },
  {
    icon: Eye,
    title: "Deciden ellos",
    text: "Cada paciente elige qué compartir con vos, entrada por entrada. Nadie más lo ve.",
  },
  {
    icon: FileLock2,
    title: "Tus notas son tuyas",
    text: "Las notas clínicas solo las ve quien las escribe. El panel de administración no muestra nada clínico.",
  },
  {
    icon: ShieldCheck,
    title: "Cada acceso queda registrado",
    text: "Pensada bajo la Ley 25.326 de datos personales y la 26.529 de historia clínica.",
  },
];

const steps = [
  { title: "Dejanos tus datos", text: "Te escribimos y te damos tu acceso profesional." },
  {
    title: "Sumá a tus pacientes",
    text: "Les pasás un código por WhatsApp. Quien no quiera la app, lo cargás igual para la agenda.",
  },
  {
    title: "Empezá a usarla",
    text: "Entre sesión y sesión, ellos registran. Vos llegás con contexto.",
  },
];

export default async function Home() {
  // Con sesión abierta la landing se ve igual (para mostrarla), pero con el acceso al panel.
  const session = await getSession();
  const panel = session ? homeForRole((session.user.role ?? "PATIENT") as Role) : null;

  return (
    <div className="flex flex-1 flex-col">
      <header className="bg-background/85 sticky top-0 z-30 border-b backdrop-blur">
        <nav
          aria-label="Principal"
          className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6"
        >
          <Link href="/" aria-label="Anclaje, inicio">
            <Logo withText />
          </Link>
          <div className="flex items-center gap-1 sm:gap-2">
            <a
              href="#como-funciona"
              className="text-muted-foreground hover:text-foreground hidden rounded-lg px-3 py-2 text-sm md:block"
            >
              Cómo funciona
            </a>
            <a
              href="#seguridad"
              className="text-muted-foreground hover:text-foreground hidden rounded-lg px-3 py-2 text-sm md:block"
            >
              Seguridad
            </a>
            <Button asChild variant="ghost" size="sm">
              <Link href={panel ?? "/ingresar"}>{panel ? "Ir a mi panel" : "Ingresar"}</Link>
            </Button>
            <Button asChild size="sm">
              <a href="#probar">Quiero probarla</a>
            </Button>
          </div>
        </nav>
      </header>

      <main className="flex flex-col">
        {/* Portada */}
        <section className="from-sky-soft via-background to-background bg-gradient-to-b">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.15fr_1fr] md:py-24">
            <div className="flex flex-col gap-6">
              <p className="bg-sun-soft text-foreground w-fit rounded-full px-3 py-1 text-sm font-medium">
                Para psicólogas, psicólogos y sus pacientes
              </p>
              <h1 className="text-4xl leading-[1.08] font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">
                Un ancla entre sesión y sesión.
              </h1>
              <p className="text-muted-foreground max-w-xl text-lg leading-relaxed">
                Tus pacientes registran cómo se sienten durante la semana, a su ritmo y sin culpa.
                Vos llegás a cada sesión con contexto, y con tu agenda, historia clínica y
                honorarios en el mismo lugar.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button asChild size="lg">
                  <a href="#probar">Quiero probarla</a>
                </Button>
                <Button asChild size="lg" variant="soft">
                  <a href="#como-funciona">Ver cómo funciona</a>
                </Button>
              </div>
              <p className="text-muted-foreground flex items-center gap-2 text-sm">
                <LockKeyhole className="text-primary size-4" aria-hidden />
                Todo lo sensible se guarda cifrado.
              </p>
            </div>
            <HeroLighthouse />
          </div>
        </section>

        {/* Cómo funciona */}
        <section id="como-funciona" className="scroll-mt-20">
          <div className="mx-auto flex max-w-6xl flex-col gap-12 px-4 py-16 sm:px-6 md:py-24">
            <div className="flex max-w-2xl flex-col gap-3">
              <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
                Dos lados de la misma terapia
              </h2>
              <p className="text-muted-foreground text-lg">
                Una app tranquila para tus pacientes, sin rachas ni notificaciones que presionen. Y
                un panel claro para vos.
              </p>
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              <FeatureGroup
                tone="bg-lilac-soft"
                label="Para tus pacientes"
                hint="Desde el celular, se instala como una app"
                items={forPatients}
              />
              <FeatureGroup
                tone="bg-primary-soft"
                label="Para vos"
                hint="Desde la compu o el celular"
                items={forYou}
              />
            </div>
          </div>
        </section>

        {/* Seguridad */}
        <section id="seguridad" className="bg-muted/60 scroll-mt-20">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 md:grid-cols-[1fr_1.4fr] md:py-24">
            <div className="flex flex-col gap-4">
              <span className="bg-primary text-primary-foreground flex size-12 items-center justify-center rounded-2xl">
                <ShieldCheck className="size-6" aria-hidden />
              </span>
              <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
                Lo que se dice en terapia, queda en terapia
              </h2>
              <p className="text-muted-foreground text-lg">
                Son datos sensibles y los tratamos así: ante la duda, privado. Cada paciente puede
                descargar o borrar todo lo suyo cuando quiera.
              </p>
            </div>
            <ul className="grid gap-4 sm:grid-cols-2">
              {security.map(({ icon: Icon, title, text }) => (
                <li key={title} className="bg-card flex flex-col gap-2 rounded-2xl border p-5">
                  <Icon className="text-primary size-5" aria-hidden />
                  <h3 className="font-semibold">{title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{text}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Cómo empezar + formulario */}
        <section id="probar" className="scroll-mt-20">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 md:py-24 lg:grid-cols-[1fr_1.3fr]">
            <div className="flex flex-col gap-8">
              <div className="flex flex-col gap-3">
                <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
                  Probala con tus pacientes
                </h2>
                <p className="text-muted-foreground text-lg">
                  Estamos sumando a los primeros profesionales. Mientras tanto, es sin costo.
                </p>
              </div>
              <ol className="flex flex-col gap-5">
                {steps.map((s, i) => (
                  <li key={s.title} className="flex gap-4">
                    <span className="bg-sun-soft flex size-9 shrink-0 items-center justify-center rounded-full font-semibold tabular-nums">
                      {i + 1}
                    </span>
                    <div>
                      <h3 className="font-semibold">{s.title}</h3>
                      <p className="text-muted-foreground text-sm leading-relaxed">{s.text}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <p className="text-muted-foreground flex items-center gap-2 text-sm">
                <UserRoundCheck className="text-primary size-4" aria-hidden />
                ¿Sos paciente? Pedile a tu psicóloga o psicólogo que te invite.
              </p>
            </div>
            <LeadForm />
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="text-muted-foreground mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 text-sm sm:px-6 md:flex-row md:items-start md:justify-between">
          <div className="flex flex-col gap-2">
            <Logo withText />
            <p>Hecho en Paraná, Entre Ríos.</p>
          </div>
          <p className="max-w-md leading-relaxed">
            <BookOpenText className="mr-1.5 inline size-4 align-[-3px]" aria-hidden />
            Anclaje acompaña la terapia, no la reemplaza, y no es un servicio de urgencias. Si estás
            en peligro, llamá al 911. Para hablar con alguien: 135 (CABA y GBA) o 0800-345-1435
            (todo el país), gratis las 24 h.
          </p>
          <Link href={panel ?? "/ingresar"} className="text-primary font-medium hover:underline">
            {panel ? "Ir a mi panel" : "Ingresar"}
          </Link>
        </div>
      </footer>
    </div>
  );
}

function FeatureGroup({
  tone,
  label,
  hint,
  items,
}: {
  tone: string;
  label: string;
  hint: string;
  items: { icon: React.ComponentType<{ className?: string }>; title: string; text: string }[];
}) {
  return (
    <div className={`${tone} flex flex-col gap-6 rounded-3xl p-6 sm:p-8`}>
      <div>
        <h3 className="text-xl font-semibold">{label}</h3>
        <p className="text-muted-foreground text-sm">{hint}</p>
      </div>
      <ul className="grid gap-4 sm:grid-cols-2">
        {items.map(({ icon: Icon, title, text }) => (
          <li key={title} className="bg-card/80 flex flex-col gap-2 rounded-2xl p-4">
            <Icon className="text-primary size-5" aria-hidden />
            <p className="font-semibold">{title}</p>
            <p className="text-muted-foreground text-sm leading-relaxed">{text}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

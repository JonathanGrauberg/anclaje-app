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
import Image from "next/image";
import Link from "next/link";
import { LeadForm } from "@/components/landing/lead-form";
import { Logo } from "@/components/logo";
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

const highlights = [
  { icon: LockKeyhole, title: "Todo cifrado", text: "Lo sensible se guarda con AES-256" },
  { icon: HeartHandshake, title: "Sin culpa", text: "Sin rachas ni avisos que presionen" },
  { icon: UserRoundCheck, title: "Con o sin la app", text: "Todos tus pacientes en tu agenda" },
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
      <main id="contenido" className="flex-1">
        {/* Hero: el consultorio verde, el faro y el lema */}
        <section className="relative isolate flex min-h-[100svh] flex-col overflow-hidden bg-[#2d4d47] text-white lg:min-h-[min(100svh,920px)]">
          <Image
            src="/landing/fondo-hero.webp"
            alt=""
            fill
            priority
            sizes="100vw"
            className="-z-20 object-cover object-[70%_50%]"
          />
          {/* La forma oscura redondeada de la izquierda (alineada con el fondo) */}
          <Image
            src="/landing/forma-redondeada.webp"
            alt=""
            fill
            priority
            sizes="100vw"
            className="-z-10 hidden object-cover object-[70%_50%] lg:block"
          />
          {/* En celular, un velo para que el texto se lea sobre la pared */}
          <div
            aria-hidden
            className="absolute inset-0 -z-10 bg-gradient-to-b from-[#1e3331]/85 via-[#1e3331]/40 to-transparent lg:hidden"
          />

          <header className="relative z-20">
            <nav
              aria-label="Principal"
              className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-8"
            >
              <Link href="/" aria-label="Anclaje, inicio" className="text-white">
                <Logo withText className="text-white" />
              </Link>
              <div className="flex items-center gap-1 sm:gap-2">
                {NAV.map(([href, label]) => (
                  <a
                    key={href}
                    href={href}
                    className="hidden rounded-lg px-3 py-2 text-sm font-medium tracking-wide text-white/85 uppercase hover:text-white md:block"
                  >
                    {label}
                  </a>
                ))}
                <Link
                  href={panel ?? "/ingresar"}
                  className="ml-2 rounded-md border border-white/70 px-4 py-2 text-sm font-medium tracking-wide uppercase transition-colors hover:bg-white/10"
                >
                  {panel ? "Mi panel" : "Ingresar"}
                </Link>
                <a
                  href="#probar"
                  className="hidden rounded-md bg-white px-4 py-2 text-sm font-semibold tracking-wide text-[#1e3331] uppercase transition-colors hover:bg-[#faf7f2] sm:block"
                >
                  Quiero probarla
                </a>
              </div>
            </nav>
          </header>

          <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 pt-8 sm:px-8 lg:justify-center lg:pt-0 lg:pb-24">
            <div className="flex max-w-xl flex-col gap-5 lg:ml-auto lg:max-w-[62%] lg:items-center lg:text-center">
              <h1 className="text-[2.75rem] leading-[0.95] font-extrabold tracking-[-0.045em] text-balance drop-shadow-[0_6px_24px_rgba(0,0,0,0.35)] sm:text-6xl lg:text-7xl xl:text-[5.25rem]">
                Un ancla entre sesión y sesión.
              </h1>
              <p className="max-w-lg text-lg leading-relaxed text-white/85 drop-shadow-[0_2px_10px_rgba(0,0,0,0.4)]">
                Tus pacientes registran cómo se sienten durante la semana, a su ritmo y sin culpa.
                Vos llegás a cada sesión con contexto, y con tu agenda, historia clínica y
                honorarios en el mismo lugar.
              </p>
              <div className="flex flex-wrap gap-3">
                <a
                  href="#probar"
                  className="rounded-md bg-white px-6 py-3 font-semibold text-[#1e3331] shadow-lg transition-transform hover:-translate-y-0.5"
                >
                  Quiero probarla
                </a>
                <a
                  href="#como-funciona"
                  className="rounded-md border border-white/70 px-6 py-3 font-medium transition-colors hover:bg-white/10"
                >
                  Ver cómo funciona
                </a>
              </div>
            </div>
          </div>

          <Image
            src="/landing/faro.webp"
            alt=""
            width={900}
            height={1229}
            priority
            sizes="(min-width: 1024px) 34vw, 55vw"
            className="pointer-events-none absolute bottom-0 left-[-6%] z-0 h-[42%] w-auto drop-shadow-2xl sm:left-[-2%] sm:h-[48%] lg:left-[2%] lg:h-[82%]"
          />
        </section>

        {/* Tres datos, montados sobre el borde del hero */}
        <div className="relative z-20 mx-auto -mt-10 w-full max-w-5xl px-4 sm:px-8">
          <ul className="bg-card grid divide-y overflow-hidden rounded-2xl border shadow-xl sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {highlights.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex items-center gap-4 p-5">
                <span className="bg-primary-soft text-primary flex size-11 shrink-0 items-center justify-center rounded-xl">
                  <Icon className="size-5" aria-hidden />
                </span>
                <div>
                  <p className="font-semibold">{title}</p>
                  <p className="text-muted-foreground text-sm">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Cómo funciona: los dos lados */}
        <section id="como-funciona" className="scroll-mt-8">
          <div className="mx-auto flex max-w-7xl flex-col gap-12 px-4 py-20 sm:px-8 md:py-28">
            <div className="flex max-w-2xl flex-col gap-3">
              <p className="text-primary text-sm font-semibold tracking-widest uppercase">
                Cómo funciona
              </p>
              <h2 className="text-4xl font-extrabold tracking-[-0.035em] text-balance sm:text-5xl">
                Dos lados de la misma terapia
              </h2>
              <p className="text-muted-foreground text-lg">
                Una app tranquila para tus pacientes, sin rachas ni notificaciones que presionen. Y
                un panel claro para vos.
              </p>
            </div>
            <div className="grid gap-16 lg:grid-cols-2 lg:gap-10">
              <SideCard
                title="Para vos"
                hint="Desde la compu, la tablet o el celular"
                image={{ src: "/landing/living-para-vos.webp", w: 1000, h: 711 }}
                cta={{ href: "#probar", label: "Quiero probarla" }}
                items={forYou}
              />
              <SideCard
                title="Para tus pacientes"
                hint="Desde el celular, se instala como una app"
                image={{ src: "/landing/living-para-paciente.webp", w: 1000, h: 873 }}
                cta={{ href: "#probar", label: "Sumalos" }}
                items={forPatients}
              />
            </div>
          </div>
        </section>

        {/* Seguridad */}
        <section
          id="seguridad"
          className="relative isolate scroll-mt-8 overflow-hidden bg-[#4f786e] text-white"
        >
          <div className="absolute inset-y-0 right-0 -z-10 hidden w-[58%] lg:block">
            <Image
              src="/landing/sillon.webp"
              alt=""
              fill
              sizes="58vw"
              className="object-cover object-left"
            />
            {/* Funde el borde de la foto con el color de la sección */}
            <div className="absolute inset-y-0 left-0 w-48 bg-gradient-to-r from-[#4f786e] to-transparent" />
          </div>
          <div className="mx-auto grid max-w-7xl gap-10 px-4 py-20 sm:px-8 md:py-28 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)]">
            <div className="flex flex-col gap-8">
              <h2 className="text-5xl leading-[0.95] font-extrabold tracking-[-0.045em] sm:text-6xl xl:text-7xl">
                Lo que <span className="text-[#1d2f2c]">se dice</span> en terapia{" "}
                <span className="text-[#1d2f2c]">queda</span> en terapia
              </h2>
              <p className="max-w-md text-lg text-white/85">
                Son datos sensibles y los tratamos así: ante la duda, privado. Cada paciente puede
                descargar o borrar todo lo suyo cuando quiera.
              </p>
              <ul className="grid gap-3 sm:grid-cols-2">
                {security.map(({ icon: Icon, title, text }) => (
                  <li
                    key={title}
                    className="flex flex-col gap-2 rounded-2xl bg-[#1d2f2c]/35 p-5 ring-1 ring-white/10 backdrop-blur-sm"
                  >
                    <Icon className="size-5 text-[#fcc107]" aria-hidden />
                    <h3 className="font-semibold">{title}</h3>
                    <p className="text-sm leading-relaxed text-white/80">{text}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="relative h-72 sm:h-96 lg:hidden">
            <Image
              src="/landing/sillon.webp"
              alt=""
              fill
              sizes="100vw"
              className="object-cover object-[30%_70%]"
            />
          </div>
        </section>

        {/* Cómo empezar + formulario */}
        <section id="probar" className="scroll-mt-8">
          <div className="mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-8 md:py-28 lg:grid-cols-[1fr_1.2fr]">
            <div className="flex flex-col gap-8">
              <div className="flex flex-col gap-3">
                <p className="text-primary text-sm font-semibold tracking-widest uppercase">
                  Empezá hoy
                </p>
                <h2 className="text-4xl font-extrabold tracking-[-0.035em] text-balance sm:text-5xl">
                  Probala con tus pacientes
                </h2>
                <p className="text-muted-foreground text-lg">
                  Estamos sumando a los primeros profesionales. Mientras tanto, es sin costo.
                </p>
              </div>
              <ol className="flex flex-col gap-5">
                {steps.map((s, i) => (
                  <li key={s.title} className="flex gap-4">
                    <span className="bg-primary text-primary-foreground flex size-10 shrink-0 items-center justify-center rounded-full font-bold tabular-nums">
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

      <footer className="bg-[#1e3331] text-white/75">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-12 text-sm sm:px-8 md:flex-row md:items-start md:justify-between">
          <div className="flex flex-col gap-2 text-white">
            <Logo withText className="text-white" />
            <p className="text-white/70">Hecho en Paraná, Entre Ríos.</p>
          </div>
          <p className="max-w-md leading-relaxed">
            <BookOpenText className="mr-1.5 inline size-4 align-[-3px]" aria-hidden />
            Anclaje acompaña la terapia, no la reemplaza, y no es un servicio de urgencias. Si estás
            en peligro, llamá al 911. Para hablar con alguien: 135 (CABA y GBA) o 0800-345-1435
            (todo el país), gratis las 24 h.
          </p>
          <Link href={panel ?? "/ingresar"} className="font-medium text-white hover:underline">
            {panel ? "Ir a mi panel" : "Ingresar"}
          </Link>
        </div>
      </footer>
    </div>
  );
}

const NAV = [
  ["#como-funciona", "Cómo funciona"],
  ["#seguridad", "Seguridad"],
  ["#probar", "Contacto"],
] as const;

/** Tarjeta grande verde de cada lado (con su living) y debajo lo que incluye. */
function SideCard({
  title,
  hint,
  image,
  cta,
  items,
}: {
  title: string;
  hint: string;
  image: { src: string; w: number; h: number };
  cta: { href: string; label: string };
  items: { icon: React.ComponentType<{ className?: string }>; title: string; text: string }[];
}) {
  return (
    <div className="flex flex-col gap-14">
      <div className="relative flex min-h-[22rem] flex-col gap-4 rounded-[2rem] bg-gradient-to-b from-[#0f6a61] to-[#1f2f2e] p-7 text-white shadow-xl sm:min-h-[26rem] sm:p-10">
        <h3 className="text-4xl font-extrabold tracking-[-0.045em] drop-shadow-[0_4px_16px_rgba(0,0,0,0.3)] sm:text-6xl">
          {title}
        </h3>
        <p className="text-lg text-white/70 sm:text-2xl sm:tracking-tight">{hint}</p>
        <a
          href={cta.href}
          className="relative z-10 w-fit rounded-md bg-white px-5 py-2.5 text-sm font-semibold tracking-wide text-[#1e3331] uppercase transition-transform hover:-translate-y-0.5"
        >
          {cta.label}
        </a>
        <Image
          src={image.src}
          alt=""
          width={image.w}
          height={image.h}
          sizes="(min-width: 1024px) 30vw, 70vw"
          className="pointer-events-none absolute right-4 -bottom-8 h-auto w-[62%] drop-shadow-2xl sm:right-8 sm:w-[56%]"
        />
      </div>
      <ul className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
        {items.map(({ icon: Icon, title, text }) => (
          <li key={title} className="flex gap-3">
            <span className="bg-primary-soft text-primary flex size-10 shrink-0 items-center justify-center rounded-xl">
              <Icon className="size-5" aria-hidden />
            </span>
            <div>
              <p className="font-semibold">{title}</p>
              <p className="text-muted-foreground text-sm leading-relaxed">{text}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

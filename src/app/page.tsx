import {
  BellRing,
  BookOpenText,
  CalendarCheck,
  ClipboardList,
  Eye,
  FileLock2,
  HeartHandshake,
  LifeBuoy,
  ListChecks,
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
import {
  BASE_MONTHLY,
  formatFreeUntil,
  formatPesos,
  freeDaysLeft,
  PLANS,
  planDiscount,
} from "@/lib/launch";
import { getSession, homeForRole, type Role } from "@/lib/session";

export const metadata: Metadata = {
  title: { absolute: "Anclaje · Un ancla entre sesión y sesión" },
  description:
    "La app para psicólogas y psicólogos y sus pacientes: registro emocional, diario, autorregistros, agenda, historia clínica y honorarios. Todo cifrado.",
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    locale: "es_AR",
    siteName: "Anclaje",
    url: "/",
    title: "Anclaje · Un ancla entre sesión y sesión",
    description:
      "Lo que tus pacientes sienten en la semana, ordenado para la próxima sesión. Para psicólogas y psicólogos.",
  },
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
    text: "Un botón en todas las pantallas con el 911, el SAME y la línea de Asistencia al Suicida, más líneas locales.",
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
  // Si la base no responde, la landing se muestra igual (como sin sesión).
  const session = await getSession().catch(() => null);
  const panel = session ? homeForRole((session.user.role ?? "PATIENT") as Role) : null;
  // Lanzamiento: gratis hasta FREE_UNTIL (src/lib/launch.ts). Pasada la fecha, no se muestra.
  const daysLeft = freeDaysLeft();
  const freeUntil = formatFreeUntil();

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
              {daysLeft > 0 && (
                <a
                  href="#planes"
                  className="flex w-fit flex-col rounded-3xl bg-[#fcc107] px-4 py-2 text-sm text-[#1e3331] shadow-lg transition-transform hover:-translate-y-0.5 lg:items-center"
                >
                  <span className="font-bold">
                    Obtené la app gratis hasta el {freeUntil} ·{" "}
                    {daysLeft === 1 ? "último día" : `quedan ${daysLeft} días`}
                  </span>
                  <span className="text-xs font-medium opacity-80">
                    Desde diciembre, {formatPesos(BASE_MONTHLY)} por mes. Ver planes
                  </span>
                </a>
              )}
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

        {/* Lo que ve el paciente: capturas reales de la app (cuenta de ejemplo) */}
        <section id="app-paciente" className="scroll-mt-8 bg-[#fdf0c4] text-[#2a2416]">
          <div className="mx-auto flex max-w-7xl flex-col gap-12 px-4 py-20 sm:px-8 md:py-28">
            <div className="flex max-w-2xl flex-col gap-3">
              <p className="text-sm font-semibold tracking-widest text-[#8a5a00] uppercase">
                Lo que ve tu paciente
              </p>
              <h2 className="text-4xl font-extrabold tracking-[-0.035em] text-balance sm:text-5xl">
                Así es la app en su celular
              </h2>
              <p className="text-lg text-[#2a2416]/80">
                Simple, cálida y sin presión. Registra lo que siente cuando le pasa, y vos lo ves
                ordenado en tu panel antes de la sesión. Solo lo que elige compartir.
              </p>
            </div>
            <ul className="-mx-4 flex snap-x snap-mandatory gap-6 overflow-x-auto px-4 pb-4 sm:mx-0 sm:px-0 md:grid md:grid-cols-3 md:gap-x-8 md:gap-y-14 md:overflow-visible">
              {PATIENT_SCREENS.map((s) => (
                <li
                  key={s.src}
                  className="flex w-[72vw] max-w-[300px] shrink-0 snap-center flex-col gap-4 md:w-auto md:max-w-none"
                >
                  <div className="mx-auto w-full max-w-[300px] rounded-[2.6rem] bg-[#1e3331] p-2.5 shadow-[0_30px_60px_-25px_rgba(30,51,49,0.55)]">
                    <Image
                      src={s.src}
                      alt={s.alt}
                      width={780}
                      height={1688}
                      sizes="(min-width: 768px) 300px, 72vw"
                      className="w-full rounded-[2.1rem]"
                    />
                  </div>
                  <div className="mx-auto flex max-w-[300px] flex-col gap-1">
                    <p className="text-lg font-bold">{s.title}</p>
                    <p className="text-[#2a2416]/80">{s.text}</p>
                  </div>
                </li>
              ))}
            </ul>
            <p className="text-sm text-[#2a2416]/70">
              Capturas reales de la app, con una paciente de ejemplo. Se instala desde el navegador,
              sin pasar por las tiendas. En el celular, deslizá para ver más.
            </p>

            {/* Botón de ayuda urgente */}
            <div className="grid items-center gap-10 rounded-[2rem] bg-[#1e3331] p-6 text-white sm:p-10 lg:grid-cols-[1.1fr_1fr]">
              <div className="flex flex-col gap-5">
                <span className="flex size-12 items-center justify-center rounded-2xl bg-[#f08b80]/20 text-[#f8b4ab]">
                  <LifeBuoy className="size-6" aria-hidden />
                </span>
                <h3 className="text-3xl font-extrabold tracking-[-0.03em] text-balance sm:text-4xl">
                  Un botón de Ayuda, siempre a mano
                </h3>
                <p className="text-lg text-white/85">
                  En todas las pantallas de la app hay un botón de Ayuda. Con un toque, tu paciente
                  llama al 911, al SAME (107) o a la línea de Asistencia al Suicida: 135 en CABA y
                  Gran Buenos Aires, <span className="whitespace-nowrap">0800-345-1435</span> en
                  todo el país. Gratis y las 24 horas.
                </p>
                <ul className="flex flex-col gap-3 text-white/85">
                  <li className="flex gap-3">
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-[#fcc107]" />
                    Sumamos líneas locales de cada zona, como el Hospital Escuela de Salud Mental de
                    Paraná, siempre con la aclaración de dónde atienden.
                  </li>
                  <li className="flex gap-3">
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-[#fcc107]" />
                    Si en una evaluación marca una respuesta de riesgo, la app le muestra en el
                    momento su plan de calma y las líneas de ayuda, y a vos te queda el aviso en el
                    panel.
                  </li>
                </ul>
                <p className="text-sm text-white/60">
                  Anclaje no es un servicio de urgencias: es un puente para que pida ayuda rápido.
                </p>
              </div>
              <div className="mx-auto w-full max-w-[300px] rounded-[2.6rem] bg-black/30 p-2.5 shadow-[0_30px_60px_-25px_rgba(0,0,0,0.6)]">
                <Image
                  src="/landing/app-ayuda.webp"
                  alt="El botón de Ayuda abierto: 911, SAME 107, Asistencia al Suicida 135 y 0800, y el Hospital Escuela de Paraná."
                  width={780}
                  height={1688}
                  sizes="300px"
                  className="w-full rounded-[2.1rem]"
                />
              </div>
            </div>

            {/* Lo que hace la profesional con todo eso */}
            <div className="grid items-center gap-10 rounded-[2rem] bg-white/70 p-6 sm:p-10 lg:grid-cols-[1fr_1.1fr]">
              <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-2">
                  <p className="text-sm font-semibold tracking-widest text-[#8a5a00] uppercase">
                    Y vos, desde tu panel
                  </p>
                  <h3 className="text-3xl font-extrabold tracking-[-0.03em] text-balance sm:text-4xl">
                    Vos decidís qué le proponés. Tu paciente, qué te comparte.
                  </h3>
                </div>
                <ul className="flex flex-col gap-5">
                  {PRO_CONTROLS.map(({ icon: Icon, title, text }) => (
                    <li key={title} className="flex gap-4">
                      <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[#fcc107] text-[#2a2416]">
                        <Icon className="size-5" aria-hidden />
                      </span>
                      <span className="flex flex-col gap-0.5">
                        <span className="font-bold">{title}</span>
                        <span className="text-[#2a2416]/80">{text}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <figure className="flex flex-col gap-3">
                <div className="overflow-hidden rounded-2xl bg-[#1e3331] shadow-[0_30px_60px_-25px_rgba(30,51,49,0.55)]">
                  <div className="flex gap-1.5 px-4 py-3" aria-hidden>
                    <span className="size-2.5 rounded-full bg-white/30" />
                    <span className="size-2.5 rounded-full bg-white/30" />
                    <span className="size-2.5 rounded-full bg-white/30" />
                  </div>
                  <Image
                    src="/landing/pro-evaluacion.webp"
                    alt="Resultado de una evaluación en el panel: puntaje total, respuestas con sus puntos y aviso de ítem crítico."
                    width={1215}
                    height={930}
                    sizes="(min-width: 1024px) 560px, 92vw"
                    className="w-full"
                  />
                </div>
                <figcaption className="text-sm text-[#2a2416]/70">
                  Así te llega una evaluación respondida: el puntaje ya calculado, cada respuesta
                  con sus puntos y un aviso si se marcó un ítem crítico.
                </figcaption>
              </figure>
            </div>
            <p className="text-sm text-[#2a2416]/70">
              * El PHQ-9 y el GAD-7 vienen con la puntuación y los rangos ya cargados; el texto de
              las preguntas lo copiás de la versión validada en español que uses, por sus
              condiciones de uso.
            </p>
          </div>
        </section>

        {/* Seguridad: arriba el lema y el sillón, abajo las cuatro garantías en una fila */}
        <section id="seguridad" className="scroll-mt-8 bg-[#4f786e] text-white">
          <div className="relative isolate overflow-hidden">
            <div className="absolute inset-y-0 right-0 -z-10 hidden w-1/2 lg:block">
              <Image
                src="/landing/sillon.webp"
                alt=""
                fill
                sizes="50vw"
                className="object-cover object-[40%_88%]"
              />
              {/* Funde el borde de la foto con el color de la sección */}
              <div className="absolute inset-y-0 left-0 w-40 bg-gradient-to-r from-[#4f786e] to-transparent" />
            </div>
            <div className="mx-auto grid max-w-7xl px-4 sm:px-8 lg:min-h-[26rem] lg:grid-cols-2">
              <div className="flex flex-col justify-center gap-6 py-14 lg:py-16 lg:pr-10">
                <h2 className="text-5xl leading-[0.95] font-extrabold tracking-[-0.045em] text-balance sm:text-6xl">
                  Lo que <span className="text-[#1d2f2c]">se dice</span> en terapia{" "}
                  <span className="text-[#1d2f2c]">queda</span> en terapia
                </h2>
                <p className="max-w-md text-lg text-white/85">
                  Son datos sensibles y los tratamos así: ante la duda, privado. Cada paciente puede
                  descargar o borrar todo lo suyo cuando quiera.
                </p>
              </div>
            </div>
            <div className="relative h-64 sm:h-80 lg:hidden">
              <Image
                src="/landing/sillon.webp"
                alt=""
                fill
                sizes="100vw"
                className="object-cover object-[45%_85%]"
              />
            </div>
          </div>
          <div className="bg-[#1d2f2c]/30">
            <ul className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-2 sm:px-8 lg:grid-cols-4">
              {security.map(({ icon: Icon, title, text }) => (
                <li key={title} className="flex flex-col gap-2">
                  <Icon className="size-5 text-[#fcc107]" aria-hidden />
                  <h3 className="font-semibold">{title}</h3>
                  <p className="text-sm leading-relaxed text-white/80">{text}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Planes: precios desde diciembre, tachados mientras dure el período gratis */}
        <section id="planes" className="scroll-mt-8 bg-[#f1ece4]">
          <div className="mx-auto flex max-w-7xl flex-col gap-12 px-4 py-20 sm:px-8 md:py-28">
            <div className="flex max-w-2xl flex-col gap-3">
              <p className="text-primary text-sm font-semibold tracking-widest uppercase">Planes</p>
              <h2 className="text-4xl font-extrabold tracking-[-0.035em] text-balance sm:text-5xl">
                {daysLeft > 0 ? `Obtenela gratis hasta el ${freeUntil}` : "Elegí cómo querés pagar"}
              </h2>
              <p className="text-muted-foreground text-lg">
                {daysLeft > 0
                  ? "Sumate ahora y usala sin pagar nada. Desde diciembre, elegís el plan que más te sirva."
                  : "Todo incluido, en los tres planes. Cuanto más largo, menos pagás por mes."}{" "}
                Tus pacientes usan la app sin pagar.
              </p>
            </div>
            <ul className="grid gap-6 md:grid-cols-3">
              {PLANS.map((plan) => {
                const discount = planDiscount(plan.monthly);
                const total = plan.monthly * plan.months;
                const best = plan.id === "anual";
                return (
                  <li
                    key={plan.id}
                    className={
                      best
                        ? "relative flex flex-col gap-6 rounded-[2rem] bg-[#1e3331] p-7 text-white shadow-[0_30px_60px_-25px_rgba(30,51,49,0.6)]"
                        : "bg-card relative flex flex-col gap-6 rounded-[2rem] p-7 shadow-[0_10px_30px_-14px_rgba(30,51,49,0.28)]"
                    }
                  >
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-xl font-bold">{plan.label}</h3>
                      {discount > 0 && (
                        <span className="rounded-full bg-[#fcc107] px-3 py-1 text-xs font-bold text-[#1e3331]">
                          Ahorrás {discount} %
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col gap-1">
                      <p className="flex items-baseline gap-2">
                        <span
                          className={
                            daysLeft > 0
                              ? "text-3xl font-extrabold tabular-nums line-through decoration-[#f08b80] decoration-[3px] opacity-60"
                              : "text-4xl font-extrabold tabular-nums"
                          }
                        >
                          {daysLeft > 0 && <span className="sr-only">Antes </span>}
                          {formatPesos(plan.monthly)}
                        </span>
                        <span className={best ? "text-white/70" : "text-muted-foreground"}>
                          por mes
                        </span>
                      </p>
                      <p
                        className={best ? "text-sm text-white/70" : "text-muted-foreground text-sm"}
                      >
                        {plan.months === 1
                          ? "Pagás mes a mes."
                          : `${formatPesos(total)} cada ${plan.months === 12 ? "año" : "6 meses"}.`}
                      </p>
                    </div>
                    {daysLeft > 0 && (
                      <p className="flex flex-col border-t border-current/15 pt-5">
                        <span
                          className={
                            best
                              ? "text-4xl font-extrabold tracking-tight text-[#fcc107]"
                              : "text-primary text-4xl font-extrabold tracking-tight"
                          }
                        >
                          Gratis
                        </span>
                        <span className="font-semibold">hasta el {freeUntil}</span>
                      </p>
                    )}
                    <a
                      href="#probar"
                      className={
                        best
                          ? "mt-auto rounded-full bg-white px-5 py-3 text-center font-semibold text-[#1e3331] transition-transform active:scale-[0.98]"
                          : "bg-primary text-primary-foreground mt-auto rounded-full px-5 py-3 text-center font-semibold transition-transform active:scale-[0.98]"
                      }
                    >
                      {daysLeft > 0 ? "Quiero probarla gratis" : "Quiero este plan"}
                    </a>
                  </li>
                );
              })}
            </ul>
            <div className="flex flex-col gap-4">
              <p className="font-semibold">Los tres planes incluyen todo:</p>
              <ul className="grid gap-x-8 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
                {PLAN_FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <span className="bg-primary mt-2 size-1.5 shrink-0 rounded-full" aria-hidden />
                    {f}
                  </li>
                ))}
              </ul>
              <p className="text-muted-foreground text-sm">
                Precios en pesos argentinos. No te pedimos tarjeta para probarla: no se cobra nada
                automáticamente.
              </p>
            </div>
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
                  Estamos sumando a los primeros profesionales.
                  {daysLeft > 0 && (
                    <>
                      {" "}
                      Aprovechá: es gratis hasta el {freeUntil}. Desde diciembre,{" "}
                      {formatPesos(BASE_MONTHLY)} por mes.
                    </>
                  )}
                </p>
              </div>
              {daysLeft > 0 && (
                <div
                  className="flex items-center gap-5 rounded-3xl bg-[#1e3331] p-5 text-white shadow-lg sm:p-6"
                  role="note"
                >
                  <div className="flex size-20 shrink-0 flex-col items-center justify-center rounded-2xl bg-[#fcc107] text-[#1e3331]">
                    <span className="text-3xl leading-none font-extrabold tabular-nums">
                      {daysLeft}
                    </span>
                    <span className="text-xs font-semibold">{daysLeft === 1 ? "día" : "días"}</span>
                  </div>
                  <div>
                    <p className="text-lg font-semibold">
                      {daysLeft === 1
                        ? "¡Hoy es el último día para sumarte gratis!"
                        : `Quedan ${daysLeft} días para sumarte gratis.`}
                    </p>
                    <p className="text-sm text-white/75">
                      Gratis hasta el {freeUntil}. ¡No te la pierdas!
                    </p>
                  </div>
                </div>
              )}
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

const PATIENT_SCREENS = [
  {
    src: "/landing/app-inicio-v2.webp",
    alt: "Inicio de la app del paciente: saludo, su próxima sesión y accesos a la rueda, el diario y más.",
    title: "Su inicio",
    text: "Ve su próxima sesión y tiene a mano todo lo que le propusiste.",
  },
  {
    src: "/landing/app-rueda-v2.webp",
    alt: "La rueda de las emociones con seis familias: miedo, ira, asco, tristeza, felicidad y sorpresa.",
    title: "La rueda de las emociones",
    text: "Pone en palabras lo que siente en segundos, con la intensidad.",
  },
  {
    src: "/landing/app-proxima-sesion-v2.webp",
    alt: "Lista de temas que la paciente quiere hablar en la próxima sesión.",
    title: "Para la próxima sesión",
    text: "Anota lo que quiere hablar, y vos lo ves antes de arrancar.",
  },
  {
    src: "/landing/app-autorregistro.webp",
    alt: "Lista de autorregistros: el pensamiento y cuánto lo creía antes y después.",
    title: "Autorregistros",
    text: "Paso a paso, para mirar un pensamiento: situación, emoción, evidencia y alternativa.",
  },
  {
    src: "/landing/app-plan-de-calma.webp",
    alt: "Plan de calma con un ejercicio de respiración guiada.",
    title: "Su plan de calma",
    text: "Respiración guiada y lo que arman juntos, para los momentos difíciles.",
  },
  {
    src: "/landing/app-tareas.webp",
    alt: "Tareas y evaluaciones que propuso la psicóloga, con comentarios del paciente.",
    title: "Tareas y evaluaciones",
    text: "Lo que le propusiste, a su ritmo y sin rachas. Responde los cuestionarios desde el celular.",
  },
];

const PRO_CONTROLS = [
  {
    icon: Eye,
    title: "Ves solo lo que comparte",
    text: "La rueda y los autorregistros se comparten por defecto; el diario es privado. Tu paciente lo puede cambiar en cada registro.",
  },
  {
    icon: ListChecks,
    title: "Le asignás tareas",
    text: "Con fecha y recursos de tu biblioteca. Ves cuáles hizo y lo que te comentó.",
  },
  {
    icon: HeartHandshake,
    title: "Arman juntos su plan de calma",
    text: "Le cargás técnicas, frases, actividades y contactos de confianza. Lo tiene a mano cuando la cosa se pone difícil.",
  },
  {
    icon: ClipboardList,
    title: "Evaluaciones con puntaje automático",
    text: "Armás tus cuestionarios o partís de las plantillas del PHQ-9 y GAD-7*. El puntaje, el rango y los ítems críticos se calculan solos. Incluido, sin pagar por cada test.",
  },
  {
    icon: MessageSquareHeart,
    title: "Le dejás devoluciones",
    text: "Sobre lo que compartió, para que sepa que lo leíste.",
  },
];

const PLAN_FEATURES = [
  "La app para tus pacientes: rueda, diario, autorregistros, plan de calma y botón de Ayuda",
  "Lo que comparten, ordenado antes de cada sesión",
  "Devoluciones, tareas y biblioteca de recursos",
  "Evaluaciones con puntaje automático",
  "Agenda con recordatorios por mail",
  "Historia clínica y notas privadas",
  "Honorarios y cobros",
  "Todo cifrado y con acceso solo tuyo",
];

const NAV = [
  ["#como-funciona", "Cómo funciona"],
  ["#app-paciente", "Lo que ve tu paciente"],
  ["#planes", "Precios"],
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

import {
  BadgeCheck,
  Building2,
  GraduationCap,
  Languages,
  MapPin,
  MessageCircle,
  Phone,
  ShieldCheck,
  Video,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/avatar";
import { Logo } from "@/components/logo";
import { prisma } from "@/lib/db";
import { jurisdictionName } from "@/lib/licenses";
import { avatarUrl, getPublicProfile, type PublicProfile } from "@/lib/public-profile";
import { SITE_URL } from "@/lib/site";
import { parseEducation } from "@/lib/validation/public-profile";
import { RequestForm } from "./request-form";

// Perfil público de una profesional: lo que ella eligió mostrar, y el botón para pedir turno.
// Nunca se muestra nada de sus pacientes.

export const revalidate = 3600;

const place = (p: PublicProfile) =>
  [p.city, jurisdictionName(p.province)].filter(Boolean).join(", ") || null;

function modalities(p: PublicProfile) {
  return [p.inPerson && "Presencial", p.online && "Online"].filter(Boolean).join(" y ");
}

export async function generateMetadata({
  params,
}: PageProps<"/profesionales/[slug]">): Promise<Metadata> {
  const p = await getPublicProfile((await params).slug);
  if (!p) return { title: "Perfil no encontrado", robots: { index: false } };
  const where = place(p);
  const title = `${p.displayName}${p.headline ? ` · ${p.headline}` : " · Psicología"}${where ? ` en ${where}` : ""}`;
  const description =
    p.bio?.slice(0, 155).trim() ||
    `${p.displayName}, ${p.headline ?? "psicología"}. ${modalities(p)}${where ? ` en ${where}` : ""}. Pedí turno por Anclaje.`;
  const image = avatarUrl(p.photoKey);
  return {
    title: { absolute: title },
    description,
    robots: { index: true, follow: true },
    alternates: { canonical: `/profesionales/${p.slug}` },
    openGraph: {
      type: "profile",
      locale: "es_AR",
      siteName: "Anclaje",
      url: `/profesionales/${p.slug}`,
      title,
      description,
      ...(image && { images: [{ url: image, width: 480, height: 480 }] }),
    },
  };
}

function jsonLd(p: PublicProfile) {
  const url = `${SITE_URL}/profesionales/${p.slug}`;
  const image = avatarUrl(p.photoKey);
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": url,
    name: p.displayName,
    url,
    ...(p.headline && { jobTitle: p.headline }),
    ...(p.bio && { description: p.bio }),
    ...(image && { image: `${SITE_URL}${image}` }),
    knowsAbout: p.approaches.length ? p.approaches : undefined,
    alumniOf: parseEducation(p.education)
      .filter((e) => e.institution)
      .map((e) => ({ "@type": "EducationalOrganization", name: e.institution })),
    ...(p.city && {
      address: {
        "@type": "PostalAddress",
        addressLocality: p.city,
        ...(p.province && { addressRegion: jurisdictionName(p.province) }),
        ...(p.address && { streetAddress: p.address }),
        addressCountry: "AR",
      },
    }),
    ...(p.publicPhone && { telephone: p.publicPhone }),
  };
}

export default async function PublicProfilePage({ params }: PageProps<"/profesionales/[slug]">) {
  const p = await getPublicProfile((await params).slug);
  if (!p) notFound();
  const lines = await prisma.crisisLine.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
    take: 2,
    select: { id: true, name: true, phone: true },
  });
  const where = place(p);
  const education = parseEducation(p.education);
  const phoneDigits = p.publicPhone?.replace(/\D/g, "") ?? "";
  const license = p.licenseNumber
    ? `Matrícula ${p.licenseJurisdiction === "MN" ? "nacional" : (jurisdictionName(p.licenseJurisdiction) ?? "")} ${p.licenseNumber}`.replace(
        /\s+/g,
        " ",
      )
    : null;

  return (
    <div className="flex flex-1 flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd(p)).replace(/</g, "\\u003c") }}
      />
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-4">
        <Link href="/" aria-label="Anclaje, inicio">
          <Logo withText />
        </Link>
      </header>

      <main className="mx-auto grid w-full max-w-5xl flex-1 gap-6 px-5 pb-16 lg:grid-cols-[1fr_22rem] lg:items-start">
        <article className="flex flex-col gap-6">
          <section className="from-primary-soft via-card to-sun-soft/60 relative overflow-hidden rounded-3xl border bg-gradient-to-br p-6 sm:p-8">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
              <Avatar
                name={p.displayName}
                url={avatarUrl(p.photoKey)}
                size={136}
                className="ring-card shadow-md ring-4"
              />
              <div className="flex min-w-0 flex-col gap-3">
                <div>
                  <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                    {p.displayName}
                  </h1>
                  {p.headline && <p className="text-muted-foreground mt-1 text-lg">{p.headline}</p>}
                </div>
                <ul className="flex flex-col gap-1.5 text-sm">
                  {license && (
                    <li className="flex items-center gap-2">
                      <BadgeCheck className="text-primary size-4 shrink-0" aria-hidden />
                      <span>
                        {license}{" "}
                        <span className="text-muted-foreground">· verificada por Anclaje</span>
                      </span>
                    </li>
                  )}
                  {where && (
                    <li className="flex items-center gap-2">
                      <MapPin className="text-primary size-4 shrink-0" aria-hidden /> {where}
                    </li>
                  )}
                  <li className="flex items-center gap-2">
                    <Video className="text-primary size-4 shrink-0" aria-hidden /> {modalities(p)}
                  </li>
                  {p.languages.length > 0 && (
                    <li className="flex items-center gap-2">
                      <Languages className="text-primary size-4 shrink-0" aria-hidden />{" "}
                      {p.languages.join(", ")}
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </section>

          {p.bio && (
            <section
              aria-labelledby="bio-title"
              className="bg-card flex flex-col gap-2 rounded-3xl border p-6"
            >
              <h2 id="bio-title" className="text-lg font-semibold">
                Sobre mí
              </h2>
              <p className="leading-relaxed whitespace-pre-line">{p.bio}</p>
            </section>
          )}

          {(p.approaches.length > 0 || p.audiences.length > 0) && (
            <section
              aria-labelledby="ap-title"
              className="bg-card flex flex-col gap-4 rounded-3xl border p-6"
            >
              <h2 id="ap-title" className="text-lg font-semibold">
                Cómo trabajo
              </h2>
              {p.approaches.length > 0 && (
                <div className="flex flex-col gap-2">
                  <h3 className="text-muted-foreground text-sm">Enfoques y temas</h3>
                  <ul className="flex flex-wrap gap-2">
                    {p.approaches.map((a) => (
                      <li
                        key={a}
                        className="bg-primary-soft text-primary rounded-full px-3 py-1 text-sm"
                      >
                        {a}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {p.audiences.length > 0 && (
                <div className="flex flex-col gap-2">
                  <h3 className="text-muted-foreground text-sm">Atiendo a</h3>
                  <ul className="flex flex-wrap gap-2">
                    {p.audiences.map((a) => (
                      <li key={a} className="bg-sun-soft rounded-full px-3 py-1 text-sm">
                        {a}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          )}

          {education.length > 0 && (
            <section
              aria-labelledby="ed-title"
              className="bg-card flex flex-col gap-4 rounded-3xl border p-6"
            >
              <h2 id="ed-title" className="text-lg font-semibold">
                Formación
              </h2>
              <ol className="relative flex flex-col gap-4 pl-7">
                <span
                  aria-hidden
                  className="bg-primary/25 absolute top-2 bottom-2 left-[7px] w-0.5 rounded-full"
                />
                {education.map((ed, i) => (
                  <li key={i} className="relative">
                    <span
                      aria-hidden
                      className="border-primary bg-card absolute top-3.5 -left-7 size-4 rounded-full border-[3px]"
                    />
                    <div className="bg-muted/50 flex flex-col gap-0.5 rounded-2xl px-4 py-3">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                        <p className="font-medium">{ed.title}</p>
                        {ed.year && (
                          <span className="text-muted-foreground text-xs tabular-nums">
                            {ed.year}
                          </span>
                        )}
                      </div>
                      {ed.institution && (
                        <p className="text-muted-foreground flex items-center gap-1.5 text-sm">
                          <GraduationCap className="size-4 shrink-0" aria-hidden /> {ed.institution}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          )}

          <section
            aria-labelledby="info-title"
            className="bg-card flex flex-col gap-3 rounded-3xl border p-6"
          >
            <h2 id="info-title" className="text-lg font-semibold">
              Consultas
            </h2>
            <dl className="divide-y text-sm">
              <div className="flex gap-3 py-3">
                <dt className="text-muted-foreground w-28 shrink-0">Modalidad</dt>
                <dd>{modalities(p)}</dd>
              </div>
              {p.inPerson && (p.address || where) && (
                <div className="flex gap-3 py-3">
                  <dt className="text-muted-foreground w-28 shrink-0">Consultorio</dt>
                  <dd className="flex items-start gap-1.5">
                    <Building2 className="mt-0.5 size-4 shrink-0" aria-hidden />
                    {[p.address, where].filter(Boolean).join(", ")}
                  </dd>
                </div>
              )}
              {p.coverage && (
                <div className="flex gap-3 py-3">
                  <dt className="text-muted-foreground w-28 shrink-0">Cobertura</dt>
                  <dd>{p.coverage}</dd>
                </div>
              )}
              {p.publicPhone && (
                <div className="flex gap-3 py-3">
                  <dt className="text-muted-foreground w-28 shrink-0">Teléfono</dt>
                  <dd className="flex flex-wrap gap-3">
                    <a
                      href={`tel:+${phoneDigits}`}
                      className="text-primary flex items-center gap-1.5 underline-offset-4 hover:underline"
                    >
                      <Phone className="size-4" aria-hidden /> {p.publicPhone}
                    </a>
                    {p.whatsapp && (
                      <a
                        href={`https://wa.me/${phoneDigits}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary flex items-center gap-1.5 underline-offset-4 hover:underline"
                      >
                        <MessageCircle className="size-4" aria-hidden /> WhatsApp
                      </a>
                    )}
                  </dd>
                </div>
              )}
            </dl>
          </section>
        </article>

        <aside id="pedir-turno" className="scroll-mt-6 lg:sticky lg:top-6">
          {p.acceptsRequests ? (
            <section
              aria-labelledby="req-title"
              className="bg-card flex flex-col gap-4 rounded-3xl border p-6 shadow-sm"
            >
              <div>
                <h2 id="req-title" className="text-xl font-semibold">
                  Pedir turno
                </h2>
                <p className="text-muted-foreground text-sm">
                  Le mandamos tus datos a {p.displayName} para que te contacte. No reserva un
                  horario.
                </p>
              </div>
              <RequestForm
                slug={p.slug!}
                inPerson={p.inPerson}
                online={p.online}
                name={p.displayName}
              />
            </section>
          ) : (
            <p className="bg-muted/60 rounded-2xl p-4 text-sm">
              Por ahora {p.displayName} no recibe solicitudes por acá.
              {p.publicPhone && " Podés escribirle al teléfono de arriba."}
            </p>
          )}
          <p className="text-muted-foreground mt-4 flex items-start gap-2 px-2 text-xs">
            <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
            Tus datos se guardan cifrados y solo los ve esta profesional.
          </p>
          {lines.length > 0 && (
            <p className="text-muted-foreground mt-2 px-2 text-xs">
              Si estás en una crisis, no esperes el turno:{" "}
              {lines.map((l, i) => (
                <span key={l.id}>
                  {i > 0 && " · "}
                  {l.name}{" "}
                  <a
                    className="text-primary underline"
                    href={`tel:${l.phone.replace(/[^\d+]/g, "")}`}
                  >
                    {l.phone}
                  </a>
                </span>
              ))}
              , o andá a la guardia más cercana.
            </p>
          )}
        </aside>
      </main>

      {p.acceptsRequests && (
        // En el celular el formulario queda abajo de todo: un botón fijo lleva directo.
        <div className="bg-background/90 fixed inset-x-0 bottom-0 z-20 border-t p-3 backdrop-blur lg:hidden">
          <a
            href="#pedir-turno"
            className="bg-primary text-primary-foreground flex h-12 items-center justify-center rounded-full font-semibold"
          >
            Pedir turno
          </a>
        </div>
      )}

      <footer className="text-muted-foreground border-t py-6 pb-24 text-center text-xs lg:pb-6">
        Perfil en{" "}
        <Link href="/" className="text-primary underline-offset-4 hover:underline">
          Anclaje
        </Link>
        , la app para psicólogas, psicólogos y sus pacientes.
      </footer>
    </div>
  );
}

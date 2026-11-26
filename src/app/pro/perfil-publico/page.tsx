import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/misc";
import { prisma } from "@/lib/db";
import { avatarUrl, freeSlug } from "@/lib/public-profile";
import { requireProfessional } from "@/lib/session";
import { SITE_URL } from "@/lib/site";
import { parseEducation, type PublicProfileInput } from "@/lib/validation/public-profile";
import { PhotoPicker, PublicProfileForm } from "./public-profile-form";

export const metadata: Metadata = { title: "Mi perfil" };

export default async function PublicProfileSettingsPage() {
  const { professional } = await requireProfessional();
  const p = await prisma.professionalProfile.findUniqueOrThrow({
    where: { id: professional.id },
    select: {
      displayName: true,
      verifiedAt: true,
      licenseJurisdiction: true,
      publicProfile: true,
      slug: true,
      photoKey: true,
      headline: true,
      bio: true,
      approaches: true,
      audiences: true,
      languages: true,
      education: true,
      city: true,
      province: true,
      address: true,
      publicPhone: true,
      whatsapp: true,
      inPerson: true,
      online: true,
      coverage: true,
      acceptsRequests: true,
    },
  });
  const province =
    p.province ?? (p.licenseJurisdiction !== "MN" ? p.licenseJurisdiction : null) ?? undefined;
  const initial = {
    publicProfile: p.publicProfile,
    slug: p.slug ?? (await freeSlug(p.displayName, professional.id)),
    headline: p.headline ?? "",
    bio: p.bio ?? "",
    approaches: p.approaches,
    audiences: p.audiences as NonNullable<PublicProfileInput["audiences"]>,
    languages: p.languages,
    education: parseEducation(p.education),
    city: p.city ?? "",
    province: province as PublicProfileInput["province"],
    address: p.address ?? "",
    publicPhone: p.publicPhone ?? "",
    whatsapp: p.whatsapp,
    inPerson: p.inPerson,
    online: p.online,
    coverage: p.coverage ?? "",
    acceptsRequests: p.acceptsRequests,
  };

  return (
    <div className="flex max-w-2xl flex-col gap-8">
      <PageHeader
        tone="sage"
        title="Mi perfil"
        description="Tu página pública para que te encuentren y te pidan turno. Vos elegís qué se ve: nada de tus pacientes, tests ni registros aparece nunca."
      />
      <section aria-labelledby="photo-title" className="flex flex-col gap-3">
        <h2 id="photo-title" className="text-lg font-semibold">
          Foto
        </h2>
        <PhotoPicker name={p.displayName} photoUrl={avatarUrl(p.photoKey)} />
      </section>
      <PublicProfileForm initial={initial} siteUrl={SITE_URL} verified={!!p.verifiedAt} />
    </div>
  );
}

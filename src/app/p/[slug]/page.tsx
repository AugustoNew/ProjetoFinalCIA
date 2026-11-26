import { UserRole } from "@prisma/client";
import { notFound } from "next/navigation";
import { PublicBookingFlow } from "@/components/booking/public-booking-flow";
import { SiteHeader } from "@/components/navigation/site-header";
import { prisma } from "@/lib/prisma";
import { formatDateTimeLocal } from "@/lib/time-zone";

export const instant = false;

export default async function PublicProviderPage(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;
  const provider = await prisma.user.findFirst({
    where: { slug, role: UserRole.PROVIDER },
    select: {
      id: true,
      name: true,
      slug: true,
      timeZone: true,
      services: {
        where: { active: true },
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          description: true,
          durationMinutes: true,
          priceCents: true,
        },
      },
    },
  });

  if (!provider?.slug) {
    notFound();
  }

  return (
    <>
      <SiteHeader professionalAreaLink />
      <PublicBookingFlow
        minimumDate={formatDateTimeLocal(new Date(), provider.timeZone).slice(
          0,
          10,
        )}
        provider={{
          name: provider.name,
          slug: provider.slug,
          timeZone: provider.timeZone,
        }}
        services={provider.services}
      />
    </>
  );
}

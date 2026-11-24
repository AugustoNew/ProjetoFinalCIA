import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ServiceManager } from "@/components/services/service-manager";

export const instant = false;

export default async function ServicesPage() {
  const session = await auth();
  const providerId = session?.user?.id;

  if (!providerId) {
    redirect("/login");
  }

  const services = await prisma.service.findMany({
    where: { providerId },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      description: true,
      durationMinutes: true,
      priceCents: true,
      active: true,
    },
  });

  return <ServiceManager services={services} />;
}

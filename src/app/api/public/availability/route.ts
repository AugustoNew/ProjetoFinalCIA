import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { providerSlugSchema } from "@/lib/slug-validation";
import { getAvailableSlots } from "@/server/scheduling";

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const parsedSlug = providerSlugSchema.safeParse(searchParams.get("slug"));
  const serviceId = searchParams.get("serviceId");
  const date = searchParams.get("date");

  if (!parsedSlug.success || !serviceId || !date) {
    return NextResponse.json(
      { error: "Informe prestador, serviço e data." },
      { status: 400 },
    );
  }

  const provider = await prisma.user.findFirst({
    where: { slug: parsedSlug.data, role: UserRole.PROVIDER },
    select: { id: true },
  });
  if (!provider) {
    return NextResponse.json(
      { error: "Prestador não encontrado." },
      { status: 404 },
    );
  }

  const slots = await getAvailableSlots({
    providerId: provider.id,
    serviceId,
    date,
  });

  return NextResponse.json(
    { slots: slots.map((slot) => slot.toISOString()) },
    { headers: { "Cache-Control": "no-store" } },
  );
}

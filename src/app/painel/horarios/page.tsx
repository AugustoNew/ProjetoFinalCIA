import { UserRole } from "@prisma/client";
import { redirect } from "next/navigation";
import { ScheduleManager } from "@/components/schedule/schedule-manager";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const instant = false;

export default async function SchedulePage() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    redirect("/login");
  }

  const provider = await prisma.user.findFirst({
    where: { id: userId, role: UserRole.PROVIDER },
    select: { id: true, timeZone: true },
  });

  if (!provider) {
    redirect("/login");
  }

  const [availability, timeOffs] = await Promise.all([
    prisma.availability.findMany({
      where: { providerId: provider.id },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
      select: {
        id: true,
        dayOfWeek: true,
        startTime: true,
        endTime: true,
      },
    }),
    prisma.timeOff.findMany({
      where: { providerId: provider.id },
      orderBy: { startsAt: "asc" },
      select: { id: true, startsAt: true, endsAt: true, reason: true },
    }),
  ]);

  return (
    <ScheduleManager
      availability={availability}
      timeOffs={timeOffs.map((timeOff) => ({
        ...timeOff,
        startsAt: timeOff.startsAt.toISOString(),
        endsAt: timeOff.endsAt.toISOString(),
      }))}
      timeZone={provider.timeZone}
    />
  );
}

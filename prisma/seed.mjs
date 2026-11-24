import { PrismaClient, UserRole, AppointmentStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const services = [
  {
    id: "agendaki-seed-consultation",
    name: "Consultoria",
    description: "Atendimento individual de consultoria.",
    durationMinutes: 60,
    price: "120.00",
  },
  {
    id: "agendaki-seed-follow-up",
    name: "Retorno",
    description: "Sessão de acompanhamento.",
    durationMinutes: 45,
    price: "80.00",
  },
  {
    id: "agendaki-seed-assessment",
    name: "Avaliação inicial",
    description: "Conversa inicial para entender suas necessidades.",
    durationMinutes: 30,
    price: "60.00",
  },
];

function nextWeekday(weekdaysAhead) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + 1);
  while (date.getUTCDay() === 0 || date.getUTCDay() === 6) {
    date.setUTCDate(date.getUTCDate() + 1);
  }

  let weekdaysCounted = 1;
  while (weekdaysCounted < weekdaysAhead) {
    date.setUTCDate(date.getUTCDate() + 1);
    if (date.getUTCDay() !== 0 && date.getUTCDay() !== 6) {
      weekdaysCounted += 1;
    }
  }

  date.setUTCHours(13, 0, 0, 0);
  return date;
}

async function main() {
  const passwordHash = bcrypt.hashSync("agendaki-demo", 12);

  const provider = await prisma.user.upsert({
    where: { email: "prestador@agendaki.dev" },
    update: {
      name: "Prestador de Exemplo",
      passwordHash,
      role: UserRole.PROVIDER,
    },
    create: {
      id: "agendaki-seed-provider",
      name: "Prestador de Exemplo",
      email: "prestador@agendaki.dev",
      passwordHash,
      role: UserRole.PROVIDER,
    },
  });
  const providerId = provider.id;

  for (const service of services) {
    await prisma.service.upsert({
      where: { id: service.id },
      update: { ...service, providerId, active: true },
      create: { ...service, providerId },
    });
  }

  for (let dayOfWeek = 1; dayOfWeek <= 5; dayOfWeek += 1) {
    await prisma.availability.upsert({
      where: {
        providerId_dayOfWeek_startTime_endTime: {
          providerId,
          dayOfWeek,
          startTime: "09:00",
          endTime: "18:00",
        },
      },
      update: {},
      create: { providerId, dayOfWeek, startTime: "09:00", endTime: "18:00" },
    });
  }

  const appointmentExamples = [
    {
      id: "agendaki-seed-appointment-1",
      serviceId: services[0].id,
      clientName: "Ana Souza",
      clientEmail: "ana@example.com",
      clientPhone: "(11) 99999-1111",
      status: AppointmentStatus.CONFIRMED,
      cancelToken: "agendaki-seed-cancel-token-1",
      weekdaysAhead: 1,
    },
    {
      id: "agendaki-seed-appointment-2",
      serviceId: services[1].id,
      clientName: "Bruno Lima",
      clientEmail: "bruno@example.com",
      clientPhone: "(11) 99999-2222",
      status: AppointmentStatus.PENDING,
      cancelToken: "agendaki-seed-cancel-token-2",
      weekdaysAhead: 2,
    },
  ];

  for (const example of appointmentExamples) {
    const startsAt = nextWeekday(example.weekdaysAhead);
    const service = services.find((item) => item.id === example.serviceId);
    const endsAt = new Date(
      startsAt.getTime() + service.durationMinutes * 60 * 1000,
    );
    const appointment = { ...example };
    delete appointment.weekdaysAhead;

    await prisma.appointment.upsert({
      where: { id: appointment.id },
      update: {
        ...appointment,
        providerId,
        startsAt,
        endsAt,
      },
      create: {
        ...appointment,
        providerId,
        startsAt,
        endsAt,
      },
    });
  }
}

main()
  .catch((error) => {
    console.error("Failed to seed the database:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

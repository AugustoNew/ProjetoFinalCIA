import type { ReactNode } from "react";
import Link from "next/link";
import { SignOutButton } from "@/components/auth/sign-out-button";

const navigationLinks = [
  { href: "/painel/servicos", label: "Serviços" },
  { href: "/painel/horarios", label: "Horários" },
  { href: "/painel/agenda", label: "Agenda" },
];

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-zinc-50">
      <aside className="flex w-64 shrink-0 flex-col border-r border-zinc-200 bg-white p-5">
        <Link className="text-xl font-bold text-teal-800" href="/painel">
          Agendaki
        </Link>
        <nav aria-label="Navegação do painel" className="mt-8 flex-1 space-y-1">
          {navigationLinks.map((item) => (
            <Link
              className="block rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-teal-50 hover:text-teal-900"
              href={item.href}
              key={item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <SignOutButton />
      </aside>
      <main className="min-w-0 flex-1 p-8">{children}</main>
    </div>
  );
}

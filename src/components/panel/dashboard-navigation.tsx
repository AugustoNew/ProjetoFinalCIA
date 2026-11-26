"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { SignOutButton } from "@/components/auth/sign-out-button";

const navigationLinks = [
  { href: "/painel", label: "Início" },
  { href: "/painel/servicos", label: "Serviços" },
  { href: "/painel/horarios", label: "Horários" },
  { href: "/painel/agenda", label: "Agenda" },
  { href: "/painel/perfil", label: "Perfil" },
];

function NavigationLinks({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav aria-label="Navegação do painel" className="space-y-1">
      {navigationLinks.map((item) => {
        const isActive =
          pathname === item.href ||
          (item.href !== "/painel" && pathname.startsWith(`${item.href}/`));

        return (
          <Link
            aria-current={isActive ? "page" : undefined}
            className={`block rounded-lg px-3 py-2 text-sm font-medium ${
              isActive
                ? "bg-teal-100 text-teal-950"
                : "text-zinc-700 hover:bg-teal-50 hover:text-teal-900"
            }`}
            href={item.href}
            key={item.href}
            onClick={onNavigate}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function DashboardNavigation() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <aside className="hidden w-64 shrink-0 flex-col border-r border-zinc-200 bg-white p-5 md:flex">
        <Link className="text-xl font-bold text-teal-800" href="/painel">
          Agendaki
        </Link>
        <div className="mt-8 flex-1">
          <NavigationLinks pathname={pathname} />
        </div>
        <SignOutButton />
      </aside>

      <header className="border-b border-zinc-200 bg-white p-4 md:hidden">
        <div className="flex items-center justify-between gap-4">
          <Link className="text-xl font-bold text-teal-800" href="/painel">
            Agendaki
          </Link>
          <button
            aria-expanded={isOpen}
            aria-label={isOpen ? "Fechar menu" : "Abrir menu"}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-800"
            onClick={() => setIsOpen((open) => !open)}
            type="button"
          >
            {isOpen ? "Fechar" : "☰ Menu"}
          </button>
        </div>
        {isOpen && (
          <div className="mt-4 space-y-3">
            <NavigationLinks
              onNavigate={() => setIsOpen(false)}
              pathname={pathname}
            />
            <SignOutButton />
          </div>
        )}
      </header>
    </>
  );
}

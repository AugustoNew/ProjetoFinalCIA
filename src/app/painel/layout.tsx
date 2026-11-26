import type { ReactNode } from "react";
import { DashboardNavigation } from "@/components/panel/dashboard-navigation";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-zinc-50 md:flex">
      <DashboardNavigation />
      <main className="min-w-0 flex-1 p-4 sm:p-8">{children}</main>
    </div>
  );
}

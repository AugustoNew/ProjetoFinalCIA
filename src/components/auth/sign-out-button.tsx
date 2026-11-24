"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-left text-sm font-medium text-zinc-700 hover:bg-zinc-100"
      onClick={() => signOut({ redirectTo: "/login" })}
      type="button"
    >
      Sair
    </button>
  );
}

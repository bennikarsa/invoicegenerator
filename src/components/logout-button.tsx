"use client";

import { useRouter } from "next/navigation";

import { AUTH_SESSION_KEY } from "@/lib/auth";

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", {
      method: "POST"
    }).catch(() => null);
    window.sessionStorage.removeItem(AUTH_SESSION_KEY);
    router.replace("/login");
  }

  return (
    <button
      className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
      onClick={handleLogout}
      type="button"
    >
      Logout
    </button>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { AUTH_SESSION_KEY, parseAuthSession, type AuthSession } from "@/lib/auth";
import { DashboardShell } from "@/components/dashboard-shell";

export function DashboardClientShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const storedSession =
      parseAuthSession(window.localStorage.getItem(AUTH_SESSION_KEY)) ??
      parseAuthSession(window.sessionStorage.getItem(AUTH_SESSION_KEY));

    if (!storedSession) {
      router.replace("/login");
      return;
    }

    window.localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(storedSession));
    setSession(storedSession);
    setIsChecking(false);
  }, [router]);

  if (isChecking || !session) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-paper px-4">
        <p className="text-sm font-medium text-slate-600">Memeriksa session...</p>
      </main>
    );
  }

  return <DashboardShell session={session}>{children}</DashboardShell>;
}

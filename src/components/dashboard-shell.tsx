"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import type { AuthSession } from "@/lib/auth";
import { APP_CONFIG } from "@/lib/app-config";
import { LogoutButton } from "@/components/logout-button";

const navigation = [
  { href: "/generate", label: "Generate" },
  { href: "/draft", label: "Draft" },
  { href: "/history", label: "History" },
  { href: "/laporan", label: "Laporan" },
  { href: "/database/buku", label: "Buku" },
  { href: "/database/pembeli", label: "Pembeli" },
  { href: "/database/ongkir", label: "Ongkir" },
  { href: "/setting", label: "Setting" }
];

export function DashboardShell({
  children,
  session
}: {
  children: React.ReactNode;
  session: AuthSession;
}) {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const closeMenu = () => setIsMenuOpen(false);

  const sidebarContent = (
    <>
      <div className="flex h-16 items-center justify-between px-5">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-brand">{APP_CONFIG.brandName}</p>
          <h1 className="text-lg font-bold">{APP_CONFIG.appName}</h1>
        </div>
        <button
          aria-label="Tutup menu"
          className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 text-slate-700 lg:hidden"
          onClick={closeMenu}
          type="button"
        >
          <span className="text-xl leading-none">X</span>
        </button>
      </div>
      <nav className="space-y-1 px-3 pb-3">
        {navigation.map((item) => {
          const isActive = pathname === item.href;

          return (
            <Link
              className={`block rounded-md px-3 py-2 text-sm font-medium ${
                isActive ? "bg-slate-100 text-ink ring-1 ring-slate-300" : "text-slate-700 hover:bg-slate-100 hover:text-ink"
              }`}
              href={item.href}
              key={item.href}
              onClick={closeMenu}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto border-t border-slate-200 px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{session.role}</p>
        <p className="mt-1 truncate text-sm text-slate-700">{session.username}</p>
        <div className="mt-3">
          <LogoutButton />
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white lg:hidden">
        <div className="flex h-16 items-center justify-between px-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand">{APP_CONFIG.brandName}</p>
            <h1 className="text-base font-bold">{APP_CONFIG.appName}</h1>
          </div>
          <button
            aria-expanded={isMenuOpen}
            aria-label="Buka menu"
            className="flex h-10 w-10 flex-col items-center justify-center gap-1.5 rounded-md border border-slate-300"
            onClick={() => setIsMenuOpen(true)}
            type="button"
          >
            <span className="h-0.5 w-5 rounded bg-slate-700" />
            <span className="h-0.5 w-5 rounded bg-slate-700" />
            <span className="h-0.5 w-5 rounded bg-slate-700" />
          </button>
        </div>
      </header>
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-slate-200 bg-white lg:flex">
        {sidebarContent}
      </aside>
      {isMenuOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            aria-label="Tutup menu"
            className="absolute inset-0 bg-slate-900/40"
            onClick={closeMenu}
            type="button"
          />
          <aside className="relative flex h-full w-[min(82vw,320px)] flex-col border-r border-slate-200 bg-white shadow-xl">
            {sidebarContent}
          </aside>
        </div>
      ) : null}
      <main className="min-w-0 lg:pl-64">
        <div className="mx-auto max-w-6xl px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-6 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}

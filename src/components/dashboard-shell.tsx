import Link from "next/link";

import type { AuthSession } from "@/lib/auth";
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
  return (
    <div className="min-h-screen bg-paper text-ink">
      <aside className="border-b border-slate-200 bg-white lg:fixed lg:inset-y-0 lg:left-0 lg:w-64 lg:border-b-0 lg:border-r">
        <div className="flex h-16 items-center px-5">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-brand">Gerai FLP</p>
            <h1 className="text-lg font-bold">Invoice App</h1>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:block lg:space-y-1 lg:overflow-visible">
          {navigation.map((item) => (
            <Link
              className="block rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-ink"
              href={item.href}
              key={item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-slate-200 px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{session.role}</p>
          <p className="mt-1 truncate text-sm text-slate-700">{session.username}</p>
          <div className="mt-3">
            <LogoutButton />
          </div>
        </div>
      </aside>
      <main className="lg:pl-64">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">{children}</div>
      </main>
    </div>
  );
}

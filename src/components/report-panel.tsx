"use client";

import { FormEvent, useState } from "react";

import type { InvoiceDetailForRole, UserRole } from "@/types";
import { calculateSafeReportTotals } from "@/lib/invoices";
import { formatRupiah } from "@/lib/invoice";

type ReportResponse =
  | {
      ok: true;
      role: UserRole;
      invoices: InvoiceDetailForRole[];
    }
  | {
      ok: false;
      message: string;
    };

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

export function ReportPanel() {
  const [dateFrom, setDateFrom] = useState(todayInputValue());
  const [dateTo, setDateTo] = useState(todayInputValue());
  const [role, setRole] = useState<UserRole | null>(null);
  const [invoices, setInvoices] = useState<InvoiceDetailForRole[]>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const totals = calculateSafeReportTotals(invoices, role ?? "komunitas");

  async function loadReport(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setIsLoading(true);
    setError("");

    const params = new URLSearchParams({
      status: "sent",
      date_from: dateFrom,
      date_to: dateTo
    });
    const response = await fetch(`/api/invoices?${params.toString()}`);
    const result = (await response.json()) as ReportResponse;

    if (result.ok) {
      setRole(result.role);
      setInvoices(result.invoices);
    } else {
      setError(result.message);
    }

    setIsLoading(false);
  }

  return (
    <section className="space-y-5">
      <form className="flex flex-wrap items-end gap-3 rounded-md border border-slate-200 bg-white p-4 shadow-sm" onSubmit={loadReport}>
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Dari</span>
          <input
            className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
            onChange={(event) => setDateFrom(event.target.value)}
            type="date"
            value={dateFrom}
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Sampai</span>
          <input
            className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
            onChange={(event) => setDateTo(event.target.value)}
            type="date"
            value={dateTo}
          />
        </label>
        <button className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white" type="submit">
          Tampilkan
        </button>
        <button
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
          onClick={() => window.print()}
          type="button"
        >
          Export PDF
        </button>
      </form>
      {error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      {isLoading ? <p className="text-sm text-slate-600">Memuat laporan...</p> : null}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Total Penjualan</p>
          <p className="mt-2 text-xl font-bold text-ink">{formatRupiah(totals.totalSales)}</p>
        </div>
        <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Ongkir Pass-through</p>
          <p className="mt-2 text-xl font-bold text-ink">{formatRupiah(totals.shippingPassThrough)}</p>
        </div>
        <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Total Diskon</p>
          <p className="mt-2 text-xl font-bold text-ink">{formatRupiah(totals.discountTotal)}</p>
        </div>
        <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Invoice Sent</p>
          <p className="mt-2 text-xl font-bold text-ink">{invoices.length}</p>
        </div>
      </div>
      <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
        Profit komunitas dan profit teman di bawah ini belum mengurangi diskon, karena aturan alokasi diskon ke profit
        perlu diputuskan dulu agar laporan tidak salah.
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Profit Komunitas Sebelum Diskon</p>
          <p className="mt-2 text-xl font-bold text-ink">{formatRupiah(totals.communityProfitBeforeDiscount)}</p>
        </div>
        {role === "admin" ? (
          <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">Profit Teman Sebelum Diskon</p>
            <p className="mt-2 text-xl font-bold text-ink">{formatRupiah(totals.adminProfit)}</p>
          </div>
        ) : null}
      </div>
    </section>
  );
}

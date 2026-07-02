"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

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

function padDatePart(value: number) {
  return String(value).padStart(2, "0");
}

function todayDisplayValue() {
  const now = new Date();

  return `${padDatePart(now.getDate())}/${padDatePart(now.getMonth() + 1)}/${now.getFullYear()}`;
}

function normalizeDateDisplay(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  const day = digits.slice(0, 2);
  const month = digits.slice(2, 4);
  const year = digits.slice(4, 8);

  return [day, month, year].filter(Boolean).join("/");
}

function displayDateToIso(value: string) {
  const [day, month, year] = value.split("/");

  if (!day || !month || !year || day.length !== 2 || month.length !== 2 || year.length !== 4) {
    return null;
  }

  const date = new Date(Number(year), Number(month) - 1, Number(day));
  const isValid =
    date.getFullYear() === Number(year) &&
    date.getMonth() === Number(month) - 1 &&
    date.getDate() === Number(day);

  if (!isValid) {
    return null;
  }

  return `${year}-${month}-${day}`;
}

export function ReportPanel() {
  const [dateFrom, setDateFrom] = useState(todayDisplayValue());
  const [dateTo, setDateTo] = useState(todayDisplayValue());
  const [role, setRole] = useState<UserRole | null>(null);
  const [invoices, setInvoices] = useState<InvoiceDetailForRole[]>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const totals = calculateSafeReportTotals(invoices, role ?? "komunitas");

  const loadReport = useCallback(async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    const dateFromIso = displayDateToIso(dateFrom);
    const dateToIso = displayDateToIso(dateTo);

    if (!dateFromIso || !dateToIso) {
      setInvoices([]);
      setError("Format tanggal harus DD/MM/YYYY.");
      return;
    }

    setIsLoading(true);
    setError("");

    const params = new URLSearchParams({
      status: "done",
      date_from: dateFromIso,
      date_to: dateToIso
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
  }, [dateFrom, dateTo]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      loadReport();
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [loadReport]);

  return (
    <section className="space-y-5">
      <form
        className="grid gap-3 rounded-md border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-[180px_180px_auto_auto]"
        onSubmit={loadReport}
      >
        <label className="block min-w-0">
          <span className="text-sm font-medium text-slate-700">Dari</span>
          <input
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            inputMode="numeric"
            maxLength={10}
            onChange={(event) => setDateFrom(normalizeDateDisplay(event.target.value))}
            placeholder="DD/MM/YYYY"
            type="text"
            value={dateFrom}
          />
        </label>
        <label className="block min-w-0">
          <span className="text-sm font-medium text-slate-700">Sampai</span>
          <input
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            inputMode="numeric"
            maxLength={10}
            onChange={(event) => setDateTo(normalizeDateDisplay(event.target.value))}
            placeholder="DD/MM/YYYY"
            type="text"
            value={dateTo}
          />
        </label>
        <button
          className="h-10 rounded-md bg-brand px-4 text-sm font-semibold text-white hover:bg-teal-800 sm:self-end"
          type="submit"
        >
          Refresh
        </button>
        <button
          className="h-10 rounded-md border border-slate-300 px-4 text-sm font-medium text-slate-700 hover:bg-slate-100 sm:self-end"
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
          <p className="text-sm text-slate-500">Invoice Done</p>
          <p className="mt-2 text-xl font-bold text-ink">{invoices.length}</p>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Profit Awal Sebelum Diskon</p>
          <p className="mt-2 text-xl font-bold text-ink">{formatRupiah(totals.communityProfitBeforeDiscount)}</p>
        </div>
        {role === "admin" ? (
          <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">Profit Akhir Sebelum Diskon</p>
            <p className="mt-2 text-xl font-bold text-ink">{formatRupiah(totals.adminProfit)}</p>
          </div>
        ) : null}
      </div>
    </section>
  );
}

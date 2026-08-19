"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

import type { InvoiceDetailForRole, UserRole } from "@/types";
import { calculateSafeReportTotals } from "@/lib/invoices";
import { formatRupiah } from "@/lib/invoice";
import { exportDoneInvoicesToExcel } from "@/lib/report-excel";

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
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function ReportPanel() {
  const [dateFrom, setDateFrom] = useState(todayInputValue());
  const [dateTo, setDateTo] = useState(todayInputValue());
  const [role, setRole] = useState<UserRole | null>(null);
  const [invoices, setInvoices] = useState<InvoiceDetailForRole[]>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const totals = calculateSafeReportTotals(invoices, role ?? "komunitas");

  const loadReport = useCallback(async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();

    if (!dateFrom || !dateTo) {
      setInvoices([]);
      setError("Tanggal awal dan akhir wajib dipilih.");
      return;
    }

    if (dateFrom > dateTo) {
      setInvoices([]);
      setError("Tanggal awal tidak boleh melewati tanggal akhir.");
      return;
    }

    setIsLoading(true);
    setError("");

    const params = new URLSearchParams({
      status: "done",
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
  }, [dateFrom, dateTo]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      loadReport();
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [loadReport]);

  async function exportExcel() {
    if (!dateFrom || !dateTo || !role) {
      setError("Muat laporan dengan rentang tanggal yang valid sebelum export Excel.");
      return;
    }

    setIsExporting(true);
    setError("");

    try {
      await exportDoneInvoicesToExcel({
        invoices,
        role,
        dateFrom,
        dateTo
      });
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : "Gagal membuat file Excel.");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <section className="space-y-5">
      <form
        className="grid gap-3 rounded-md border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-[180px_180px_auto_auto_auto]"
        onSubmit={loadReport}
      >
        <label className="block min-w-0">
          <span className="text-sm font-medium text-slate-700">Dari</span>
          <input
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            max={dateTo || undefined}
            onChange={(event) => setDateFrom(event.target.value)}
            required
            type="date"
            value={dateFrom}
          />
        </label>
        <label className="block min-w-0">
          <span className="text-sm font-medium text-slate-700">Sampai</span>
          <input
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            min={dateFrom || undefined}
            onChange={(event) => setDateTo(event.target.value)}
            required
            type="date"
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
        <button
          className="h-10 rounded-md border border-emerald-300 bg-emerald-50 px-4 text-sm font-semibold text-emerald-800 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60 sm:self-end"
          disabled={isExporting || invoices.length === 0}
          onClick={exportExcel}
          type="button"
        >
          {isExporting ? "Membuat Excel..." : "Export Excel"}
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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Profit Komunitas Sebelum Diskon</p>
          <p className="mt-2 text-xl font-bold text-ink">{formatRupiah(totals.communityProfitBeforeDiscount)}</p>
        </div>
        <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Profit Komunitas Setelah Diskon</p>
          <p className="mt-2 text-xl font-bold text-ink">{formatRupiah(totals.communityProfitAfterDiscount)}</p>
        </div>
        {role === "admin" ? (
          <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">Profit Admin (Tidak Terpengaruh Diskon)</p>
            <p className="mt-2 text-xl font-bold text-ink">{formatRupiah(totals.adminProfit)}</p>
          </div>
        ) : null}
      </div>
    </section>
  );
}

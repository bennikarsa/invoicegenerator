"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import Link from "next/link";

import type { InvoiceDetailForRole, InvoiceSettings, InvoiceStatus, UserRole } from "@/types";
import { buildInvoiceText, calculateInvoiceTotal, formatRupiah } from "@/lib/invoice";
import { DEFAULT_SETTINGS } from "@/lib/settings";
import { ShareInvoiceDialog } from "@/components/share-invoice-dialog";

type InvoicesResponse =
  | {
      ok: true;
      role: UserRole;
      invoices: InvoiceDetailForRole[];
    }
  | {
      ok: false;
      message: string;
    };

type InvoiceDetailResponse =
  | {
      ok: true;
      invoice: InvoiceDetailForRole;
      settings: InvoiceSettings;
    }
  | {
      ok: false;
      message: string;
    };

type InvoiceStatusUpdateResponse =
  | {
      ok: true;
      invoice: InvoiceDetailForRole;
    }
  | {
      ok: false;
      message: string;
    };

type InvoicesListProps = {
  status: InvoiceStatus | "history";
};

type SharePayload = {
  invoiceNumber: string;
  phone: string;
  text: string;
};

function isOldDraft(invoice: InvoiceDetailForRole) {
  const createdAt = new Date(invoice.created_at).getTime();
  const threeDays = 3 * 24 * 60 * 60 * 1000;

  return Date.now() - createdAt > threeDays;
}

function getStatusLabel(status: InvoiceStatus) {
  if (status === "done") {
    return "Done";
  }

  if (status === "void") {
    return "Void";
  }

  return status === "sent" ? "Sent" : "Draft";
}

function getStatusBadgeClass(status: InvoiceStatus) {
  if (status === "done") {
    return "bg-teal-50 text-teal-800 ring-teal-200";
  }

  if (status === "void") {
    return "bg-red-50 text-red-700 ring-red-200";
  }

  return status === "sent"
    ? "bg-blue-50 text-blue-700 ring-blue-200"
    : "bg-slate-100 text-slate-700 ring-slate-200";
}

export function InvoicesList({ status }: InvoicesListProps) {
  const [invoices, setInvoices] = useState<InvoiceDetailForRole[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [expandedInvoiceId, setExpandedInvoiceId] = useState("");
  const [sharePayload, setSharePayload] = useState<SharePayload | null>(null);

  const fetchInvoices = useCallback(
    async (searchValue: string) => {
      setIsLoading(true);
      setError("");

      const params = new URLSearchParams({ status });

      if (searchValue) {
        params.set("search", searchValue);
      }

      const response = await fetch(`/api/invoices?${params.toString()}`);
      const result = (await response.json()) as InvoicesResponse;

      if (result.ok) {
        setInvoices(result.invoices);
      } else {
        setError(result.message);
      }

      setIsLoading(false);
    },
    [status]
  );

  useEffect(() => {
    fetchInvoices("");
  }, [fetchInvoices]);

  async function deleteDraft(invoice: InvoiceDetailForRole) {
    const confirmed = window.confirm(`Hapus draft ${invoice.invoice_number}?`);

    if (!confirmed) {
      return;
    }

    const response = await fetch(`/api/invoices/${invoice.id}`, { method: "DELETE" });
    const result = (await response.json()) as { ok: true } | { ok: false; message: string };

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setMessage("Draft berhasil dihapus.");
    await fetchInvoices(search);
  }

  function buildTextFromDetail(result: Extract<InvoiceDetailResponse, { ok: true }>) {
    return buildInvoiceText({
      invoiceNumber: result.invoice.invoice_number,
      customer: result.invoice.customer,
      settings: result.settings ?? DEFAULT_SETTINGS,
      items: result.invoice.items,
      shipping: result.invoice.shipping,
      discountType: result.invoice.diskon_type,
      discountValue: result.invoice.diskon_value,
      discountLabel: result.invoice.diskon_label,
      discount2Type: result.invoice.diskon_2_type,
      discount2Value: result.invoice.diskon_2_value,
      discount2Label: result.invoice.diskon_2_label
    });
  }

  async function openShareOptions(invoiceId: string) {
    const response = await fetch(`/api/invoices/${invoiceId}`);
    const result = (await response.json()) as InvoiceDetailResponse;

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setSharePayload({
      invoiceNumber: result.invoice.invoice_number,
      phone: result.invoice.customer.phone,
      text: buildTextFromDetail(result)
    });
  }

  async function copyText(invoiceId: string) {
    const response = await fetch(`/api/invoices/${invoiceId}`);
    const result = (await response.json()) as InvoiceDetailResponse;

    if (!result.ok) {
      setError(result.message);
      return;
    }

    await navigator.clipboard.writeText(buildTextFromDetail(result));
    setMessage("Teks invoice berhasil disalin.");
  }

  async function updateInvoiceStatus(invoice: InvoiceDetailForRole, nextStatus: "done" | "void") {
    const confirmed = window.confirm(
      nextStatus === "done"
        ? `Tandai invoice ${invoice.invoice_number} sebagai done?`
        : `Void invoice ${invoice.invoice_number}? Invoice void tidak masuk laporan.`
    );

    if (!confirmed) {
      return;
    }

    setError("");
    setMessage("");

    const response = await fetch(`/api/invoices/${invoice.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ status: nextStatus })
    });
    const result = (await response.json()) as InvoiceStatusUpdateResponse;

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setMessage(
      nextStatus === "done"
        ? `Invoice ${invoice.invoice_number} ditandai done.`
        : `Invoice ${invoice.invoice_number} ditandai void.`
    );
    await fetchInvoices(search);
  }

  return (
    <section className="rounded-md border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-4">
        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            fetchInvoices(search);
          }}
        >
          <input
            className="min-w-0 flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari nomor invoice atau nama pembeli"
            type="search"
            value={search}
          />
          <button className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-100" type="submit">
            Cari
          </button>
        </form>
      </div>
      <div className="p-4">
        {error ? <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
        {message ? <p className="mb-3 rounded-md bg-teal-50 px-3 py-2 text-sm text-teal-800">{message}</p> : null}
        {isLoading ? <p className="text-sm text-slate-600">Memuat invoice...</p> : null}
        {!isLoading && invoices.length === 0 ? (
          <p className="rounded-md border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-600">
            Belum ada invoice {status}.
          </p>
        ) : null}
        {invoices.length > 0 ? (
          <>
          <div className="space-y-3 md:hidden">
            {invoices.map((invoice) => {
              const totals = calculateInvoiceTotal({
                items: invoice.items,
                shipping: invoice.shipping,
                discountType: invoice.diskon_type,
                discountValue: invoice.diskon_value,
                discountLabel: invoice.diskon_label,
                discount2Type: invoice.diskon_2_type,
                discount2Value: invoice.diskon_2_value,
                discount2Label: invoice.diskon_2_label
              });

              return (
                <article className="rounded-md border border-slate-200 bg-white p-3 shadow-sm" key={invoice.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="break-words font-semibold text-ink">{invoice.invoice_number}</div>
                      <div className="mt-1 text-sm text-slate-600">{invoice.customer.name}</div>
                      <span
                        className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${getStatusBadgeClass(invoice.status)}`}
                      >
                        {getStatusLabel(invoice.status)}
                      </span>
                      {status === "draft" && isOldDraft(invoice) ? (
                        <div className="mt-1 text-xs font-medium text-amber-700">Draft lama</div>
                      ) : null}
                    </div>
                    <div className="shrink-0 rounded-md bg-teal-50 px-2.5 py-1 text-right text-sm font-semibold text-brand">
                      {formatRupiah(totals.total)}
                    </div>
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-2 rounded-md bg-slate-50 px-3 py-2 text-sm">
                    <dt className="text-slate-500">Tanggal</dt>
                    <dd className="text-right text-slate-800">{invoice.tanggal}</dd>
                    <dt className="text-slate-500">Diskon</dt>
                    <dd className="text-right text-slate-800">- {formatRupiah(totals.discount)}</dd>
                  </dl>
                  {expandedInvoiceId === invoice.id ? (
                    <div className="mt-3 rounded-md bg-slate-50 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Rincian Buku</p>
                      <div className="mt-2 space-y-2">
                        {invoice.items.map((item) => (
                          <div className="grid grid-cols-[minmax(0,1fr)_44px_96px] gap-2 text-sm" key={item.id}>
                            <span className="min-w-0 break-words font-medium text-ink">{item.title}</span>
                            <span className="text-right text-slate-600">x{item.qty}</span>
                            <span className="text-right text-slate-700">
                              {formatRupiah(item.harga_jual_snapshot * item.qty)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <button
                      className="rounded-md border border-slate-300 px-2 py-2 text-xs font-medium hover:bg-slate-100"
                      onClick={() => copyText(invoice.id)}
                      type="button"
                    >
                      Salin
                    </button>
                    <button
                      className="rounded-md border border-slate-300 px-2 py-2 text-xs font-medium hover:bg-slate-100"
                      onClick={() => setExpandedInvoiceId((current) => (current === invoice.id ? "" : invoice.id))}
                      type="button"
                    >
                      Detail
                    </button>
                    <button
                      className="rounded-md border border-slate-300 px-2 py-2 text-xs font-medium hover:bg-slate-100"
                      onClick={() => openShareOptions(invoice.id)}
                      type="button"
                    >
                      Kirim
                    </button>
                    {status === "history" && invoice.status === "sent" ? (
                      <button
                        className="rounded-md border border-teal-200 px-2 py-2 text-xs font-medium text-teal-700 hover:bg-teal-50"
                        onClick={() => updateInvoiceStatus(invoice, "done")}
                        type="button"
                      >
                        Done
                      </button>
                    ) : null}
                    {status === "history" && (invoice.status === "sent" || invoice.status === "done") ? (
                      <button
                        className="rounded-md border border-red-200 px-2 py-2 text-xs font-medium text-red-700 hover:bg-red-50"
                        onClick={() => updateInvoiceStatus(invoice, "void")}
                        type="button"
                      >
                        Void
                      </button>
                    ) : null}
                  </div>
                  {status === "draft" ? (
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <Link
                        className="rounded-md border border-slate-300 px-2 py-2 text-center text-xs font-medium hover:bg-slate-100"
                        href={`/generate?draftId=${invoice.id}`}
                      >
                        Edit
                      </Link>
                      <button
                        className="rounded-md border border-red-200 px-2 py-2 text-xs font-medium text-red-700 hover:bg-red-50"
                        onClick={() => deleteDraft(invoice)}
                        type="button"
                      >
                        Hapus
                      </button>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
          <div className="hidden md:block">
            <table className="w-full table-fixed text-left text-sm">
              <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="py-3 pr-4 font-semibold">Invoice</th>
                  <th className="py-3 pr-4 font-semibold">Pembeli</th>
                  <th className="py-3 pr-4 font-semibold">Tanggal</th>
                  <th className="py-3 pr-4 font-semibold">Total</th>
                  <th className="py-3 text-right font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.map((invoice) => {
                  const totals = calculateInvoiceTotal({
                    items: invoice.items,
                    shipping: invoice.shipping,
                    discountType: invoice.diskon_type,
                    discountValue: invoice.diskon_value,
                    discountLabel: invoice.diskon_label,
                    discount2Type: invoice.diskon_2_type,
                    discount2Value: invoice.diskon_2_value,
                    discount2Label: invoice.diskon_2_label
                  });

                  return (
                    <Fragment key={invoice.id}>
                    <tr>
                      <td className="py-3 pr-4">
                        <div className="font-medium text-ink">{invoice.invoice_number}</div>
                        <span
                          className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${getStatusBadgeClass(invoice.status)}`}
                        >
                          {getStatusLabel(invoice.status)}
                        </span>
                        {status === "draft" && isOldDraft(invoice) ? (
                          <div className="mt-1 text-xs font-medium text-amber-700">Draft lama</div>
                        ) : null}
                      </td>
                      <td className="py-3 pr-4 text-slate-700">{invoice.customer.name}</td>
                      <td className="py-3 pr-4 text-slate-700">{invoice.tanggal}</td>
                      <td className="py-3 pr-4 font-medium text-slate-800">{formatRupiah(totals.total)}</td>
                      <td className="py-3">
                        <div className="flex flex-wrap justify-end gap-2">
                          <button
                            className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium hover:bg-slate-100"
                            onClick={() => copyText(invoice.id)}
                            type="button"
                          >
                            Salin
                          </button>
                          <button
                            className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium hover:bg-slate-100"
                            onClick={() =>
                              setExpandedInvoiceId((current) => (current === invoice.id ? "" : invoice.id))
                            }
                            type="button"
                          >
                            Detail
                          </button>
                          <button
                            className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium hover:bg-slate-100"
                            onClick={() => openShareOptions(invoice.id)}
                            type="button"
                          >
                            Kirim
                          </button>
                          {status === "history" && invoice.status === "sent" ? (
                            <button
                              className="rounded-md border border-teal-200 px-3 py-1.5 text-xs font-medium text-teal-700 hover:bg-teal-50"
                              onClick={() => updateInvoiceStatus(invoice, "done")}
                              type="button"
                            >
                              Done
                            </button>
                          ) : null}
                          {status === "history" && (invoice.status === "sent" || invoice.status === "done") ? (
                            <button
                              className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
                              onClick={() => updateInvoiceStatus(invoice, "void")}
                              type="button"
                            >
                              Void
                            </button>
                          ) : null}
                          {status === "draft" ? (
                            <>
                              <Link
                                className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium hover:bg-slate-100"
                                href={`/generate?draftId=${invoice.id}`}
                              >
                                Edit
                              </Link>
                              <button
                                className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
                                onClick={() => deleteDraft(invoice)}
                                type="button"
                              >
                                Hapus
                              </button>
                            </>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                    {expandedInvoiceId === invoice.id ? (
                      <tr>
                        <td className="bg-slate-50 px-4 py-4" colSpan={5}>
                          <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                Rincian Buku
                              </p>
                              <div className="mt-2 space-y-2">
                                {invoice.items.map((item) => (
                                  <div
                                    className="grid grid-cols-[1fr_56px_120px] gap-2 rounded-md bg-white px-3 py-2 text-sm"
                                    key={item.id}
                                  >
                                    <span className="font-medium text-ink">{item.title}</span>
                                    <span className="text-right text-slate-600">x{item.qty}</span>
                                    <span className="text-right text-slate-700">
                                      {formatRupiah(item.harga_jual_snapshot * item.qty)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div className="rounded-md bg-white p-3 text-sm">
                              <div className="grid grid-cols-2 gap-2">
                                <span className="text-slate-500">Penerima</span>
                                <span className="text-right font-medium">{invoice.customer.name}</span>
                                <span className="text-slate-500">Ongkir</span>
                                <span className="text-right font-medium">
                                  {invoice.shipping
                                    ? `${invoice.shipping.ekspedisi} ${formatRupiah(invoice.shipping.tarif)}`
                                    : "-"}
                                </span>
                                <span className="text-slate-500">Diskon</span>
                                <span className="text-right font-medium">- {formatRupiah(totals.discount)}</span>
                                <span className="text-slate-500">Total</span>
                                <span className="text-right font-bold">{formatRupiah(totals.total)}</span>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          </>
        ) : null}
      </div>
      {sharePayload ? (
        <ShareInvoiceDialog
          invoiceNumber={sharePayload.invoiceNumber}
          onClose={() => setSharePayload(null)}
          phone={sharePayload.phone}
          text={sharePayload.text}
        />
      ) : null}
    </section>
  );
}

"use client";

import { useMemo, useState } from "react";

import { buildWhatsAppUrl } from "@/lib/invoice";

type ShareInvoiceDialogProps = {
  invoiceNumber: string;
  phone: string;
  text: string;
  onComplete?: () => void;
  onClose: () => void;
};

export function ShareInvoiceDialog({ invoiceNumber, phone, text, onComplete, onClose }: ShareInvoiceDialogProps) {
  const [message, setMessage] = useState("");
  const canNativeShare = typeof navigator !== "undefined" && "share" in navigator;
  const whatsAppUrl = useMemo(() => buildWhatsAppUrl(phone, text), [phone, text]);
  const emailUrl = useMemo(() => {
    const subject = encodeURIComponent(`Invoice ${invoiceNumber}`);
    const body = encodeURIComponent(text);

    return `mailto:?subject=${subject}&body=${body}`;
  }, [invoiceNumber, text]);

  async function copyText() {
    try {
      await navigator.clipboard.writeText(text);
      onComplete?.();
      onClose();
    } catch {
      setMessage("Gagal menyalin otomatis. Pilih teks preview lalu salin manual.");
    }
  }

  async function shareToApps() {
    if (!canNativeShare) {
      return;
    }

    try {
      await navigator.share({
        title: `Invoice ${invoiceNumber}`,
        text
      });
      onComplete?.();
      onClose();
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      setMessage("Pilihan aplikasi tidak bisa dibuka dari browser ini.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-slate-950/40 p-3 sm:items-center sm:justify-center">
      <div className="w-full rounded-md bg-white p-4 shadow-xl sm:max-w-md">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-ink">Kirim Invoice</h2>
            <p className="mt-1 break-words text-sm text-slate-600">{invoiceNumber}</p>
          </div>
          <button
            aria-label="Tutup pilihan kirim"
            className="rounded-md border border-slate-300 px-3 py-1 text-sm font-medium hover:bg-slate-100"
            onClick={onClose}
            type="button"
          >
            X
          </button>
        </div>

        {message ? <p className="mt-3 rounded-md bg-teal-50 px-3 py-2 text-sm text-teal-800">{message}</p> : null}

        <div className="mt-4 grid gap-2">
          <button
            className="rounded-md border border-slate-300 px-4 py-3 text-left text-sm font-semibold hover:bg-slate-100"
            onClick={copyText}
            type="button"
          >
            Salin teks invoice
          </button>
          {canNativeShare ? (
            <button
              className="rounded-md border border-slate-300 px-4 py-3 text-left text-sm font-semibold hover:bg-slate-100"
              onClick={shareToApps}
              type="button"
            >
              Bagikan ke aplikasi...
            </button>
          ) : null}
          <a
            className="rounded-md bg-brand px-4 py-3 text-sm font-semibold text-white"
            href={whatsAppUrl}
            onClick={() => {
              onComplete?.();
              onClose();
            }}
            rel="noreferrer"
            target="_blank"
          >
            Kirim lewat WhatsApp
          </a>
          <a
            className="rounded-md border border-slate-300 px-4 py-3 text-sm font-semibold hover:bg-slate-100"
            href={emailUrl}
            onClick={() => {
              onComplete?.();
              onClose();
            }}
          >
            Kirim lewat Email
          </a>
        </div>
      </div>
    </div>
  );
}

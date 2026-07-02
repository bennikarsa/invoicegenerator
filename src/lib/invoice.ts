import type { Customer, DiscountType, InvoiceSettings, Shipping } from "@/types";

export type InvoiceLineItem = {
  title: string;
  qty: number;
  harga_jual_snapshot: number;
  harga_komunitas_snapshot: number;
};

export type InvoiceDraftInput = {
  invoiceNumber: string;
  customer: Pick<Customer, "name" | "phone" | "address">;
  settings: InvoiceSettings;
  items: InvoiceLineItem[];
  shipping?: Pick<Shipping, "ekspedisi" | "tarif"> | null;
  discountType?: DiscountType;
  discountValue?: number;
};

export function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(value);
}

export function calculateSubtotal(items: InvoiceLineItem[]) {
  return items.reduce((total, item) => total + item.harga_jual_snapshot * item.qty, 0);
}

export function calculateDiscount(subtotal: number, type: DiscountType | undefined, value: number | undefined) {
  if (!type || !value) {
    return 0;
  }

  if (type === "persen") {
    return Math.floor((subtotal * value) / 100);
  }

  return value;
}

export function calculateInvoiceTotal(input: Pick<InvoiceDraftInput, "items" | "shipping" | "discountType" | "discountValue">) {
  const subtotal = calculateSubtotal(input.items);
  const discount = calculateDiscount(subtotal, input.discountType, input.discountValue);
  const shippingCost = input.shipping?.tarif ?? 0;

  return {
    subtotal,
    discount,
    shippingCost,
    total: subtotal + shippingCost - discount
  };
}

export function normalizeIndonesianPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");

  if (digits.startsWith("62")) {
    return digits;
  }

  if (digits.startsWith("0")) {
    return `62${digits.slice(1)}`;
  }

  return digits;
}

export function buildWhatsAppUrl(phone: string, text: string) {
  const normalizedPhone = normalizeIndonesianPhone(phone);
  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(text)}`;
}

export function buildInvoiceText(input: InvoiceDraftInput) {
  const totals = calculateInvoiceTotal(input);
  const itemLines = input.items
    .map((item) => `${item.title}${item.qty > 1 ? ` x${item.qty}` : ""}    ${formatRupiah(item.harga_jual_snapshot * item.qty)}`)
    .join("\n");
  const shippingLine = input.shipping
    ? `Ongkir ${input.shipping.ekspedisi}    ${formatRupiah(input.shipping.tarif)}\n`
    : "";
  const discountLine = totals.discount > 0 ? `Diskon               : - ${formatRupiah(totals.discount)}\n` : "";

  return `${input.settings.header_text}
No. Invoice: ${input.invoiceNumber}

Pengirim: ${input.settings.nama_pengirim}
No HP: ${input.settings.hp_pengirim}

Penerima: ${input.customer.name}
Alamat: ${input.customer.address}
No HP: ${input.customer.phone}

Rincian Pesanan:
${itemLines}
${shippingLine}----------------------------------
Subtotal             : ${formatRupiah(totals.subtotal + totals.shippingCost)}
${discountLine}Total Tagihan        : ${formatRupiah(totals.total)}

${input.settings.footer_text}
${input.settings.rekening}
Terima kasih sudah membeli buku di FLP`;
}

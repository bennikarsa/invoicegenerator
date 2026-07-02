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

function formatInvoiceAmount(value: number) {
  return new Intl.NumberFormat("id-ID", {
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
    .map((item) => `- ${item.title}${item.qty > 1 ? ` x${item.qty}` : ""} ${formatInvoiceAmount(item.harga_jual_snapshot * item.qty)}`)
    .join("\n");
  const shippingLine = input.shipping
    ? `- Ongkir ${input.shipping.ekspedisi} ${formatInvoiceAmount(input.shipping.tarif)}\n`
    : "";
  const discountLine = totals.discount > 0 ? `Diskon: - ${formatInvoiceAmount(totals.discount)}\n` : "";
  const footerLine = [input.settings.footer_text, input.settings.rekening].filter(Boolean).join(" ");
  const paymentInstruction = footerLine
    ? `${footerLine} Mohon sertakan bukti transfernya`
    : "Mohon sertakan bukti transfernya";

  return `*${input.settings.header_text}*
No. Invoice: ${input.invoiceNumber}

> Pengirim: ${input.settings.nama_pengirim} ${input.settings.hp_pengirim}

> Penerima: ${input.customer.name} ${input.customer.phone}
> Alamat: ${input.customer.address}

Rincian Pesanan:
${itemLines}
${shippingLine}----------------------------------
Subtotal: ${formatInvoiceAmount(totals.subtotal + totals.shippingCost)}
${discountLine}\`Total Tagihan: Rp${formatInvoiceAmount(totals.total)}\`

${paymentInstruction}`;
}

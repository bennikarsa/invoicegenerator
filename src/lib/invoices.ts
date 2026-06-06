import type {
  AdminBook,
  Customer,
  DiscountType,
  InvoiceDetailForRole,
  InvoiceSettings,
  Shipping,
  UserRole
} from "@/types";
import { buildInvoiceText, buildWhatsAppUrl, calculateDiscount, calculateSubtotal } from "@/lib/invoice";
import { rowsToSettings } from "@/lib/settings";

export type InvoiceItemInput = {
  book_id: string;
  qty: number;
};

export type InvoiceSaveInput = {
  customer_id: string;
  shipping_id: string | null;
  tanggal: string;
  diskon_type: DiscountType;
  diskon_value: number;
  status: "draft" | "sent";
  items: InvoiceItemInput[];
};

export type InvoicePayload = {
  id: string;
  invoice_number: string;
  customer_id: string;
  shipping_id: string | null;
  tanggal: string;
  diskon_type: DiscountType;
  diskon_value: number;
  status: "draft" | "sent";
  created_at: string;
  customers: Customer;
  shippings: Shipping | null;
  invoice_items: Array<{
    id: string;
    invoice_id: string;
    book_id: string;
    qty: number;
    harga_jual_snapshot: number;
    harga_komunitas_snapshot: number;
    harga_modal_snapshot?: number;
    books: Pick<AdminBook, "title"> | null;
  }>;
};

export function sanitizeInvoiceSaveInput(input: Partial<Record<keyof InvoiceSaveInput, unknown>>) {
  const items = Array.isArray(input.items)
    ? input.items.map((item) => {
        const candidate = item as Partial<Record<keyof InvoiceItemInput, unknown>>;
        const parsedQty =
          typeof candidate.qty === "number"
            ? candidate.qty
            : typeof candidate.qty === "string"
              ? Number(candidate.qty)
              : Number.NaN;

        return {
          book_id: typeof candidate.book_id === "string" ? candidate.book_id : "",
          qty: Number.isFinite(parsedQty) ? Math.floor(parsedQty) : Number.NaN
        };
      })
    : [];
  const parsedDiscount =
    typeof input.diskon_value === "number"
      ? input.diskon_value
      : typeof input.diskon_value === "string"
        ? Number(input.diskon_value)
        : 0;

  return {
    customer_id: typeof input.customer_id === "string" ? input.customer_id : "",
    shipping_id: typeof input.shipping_id === "string" && input.shipping_id ? input.shipping_id : null,
    tanggal: typeof input.tanggal === "string" ? input.tanggal : "",
    diskon_type: input.diskon_type === "persen" ? "persen" : "nominal",
    diskon_value: Number.isFinite(parsedDiscount) ? Math.floor(parsedDiscount) : Number.NaN,
    status: input.status === "sent" ? "sent" : "draft",
    items
  } satisfies InvoiceSaveInput;
}

export function validateInvoiceSaveInput(input: InvoiceSaveInput) {
  if (!input.customer_id) {
    return { ok: false, message: "Pembeli wajib dipilih." };
  }

  if (!input.tanggal) {
    return { ok: false, message: "Tanggal invoice wajib diisi." };
  }

  if (input.items.length === 0) {
    return { ok: false, message: "Invoice wajib berisi minimal 1 buku." };
  }

  if (input.items.some((item) => !item.book_id || !Number.isInteger(item.qty) || item.qty <= 0)) {
    return { ok: false, message: "Setiap item buku wajib punya qty positif." };
  }

  if (!Number.isInteger(input.diskon_value) || input.diskon_value < 0) {
    return { ok: false, message: "Diskon harus berupa angka non-negatif." };
  }

  if (input.diskon_type === "persen" && input.diskon_value > 100) {
    return { ok: false, message: "Diskon persen tidak boleh lebih dari 100%." };
  }

  return { ok: true, message: "" };
}

export function mapInvoicePayload<Row extends InvoicePayload>(
  row: Row,
  role: UserRole
): InvoiceDetailForRole {
  return {
    id: row.id,
    invoice_number: row.invoice_number,
    customer_id: row.customer_id,
    shipping_id: row.shipping_id,
    tanggal: row.tanggal,
    diskon_type: row.diskon_type,
    diskon_value: row.diskon_value,
    status: row.status,
    created_at: row.created_at,
    customer: row.customers,
    shipping: row.shippings,
    items: row.invoice_items.map((item) => ({
      id: item.id,
      invoice_id: item.invoice_id,
      book_id: item.book_id,
      title: item.books?.title ?? "Buku",
      qty: item.qty,
      harga_jual_snapshot: item.harga_jual_snapshot,
      harga_komunitas_snapshot: item.harga_komunitas_snapshot,
      ...(role === "admin" && typeof item.harga_modal_snapshot === "number"
        ? { harga_modal_snapshot: item.harga_modal_snapshot }
        : {})
    }))
  };
}

export function getInvoiceMonthCode(date: Date) {
  const year = String(date.getFullYear()).slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}${month}`;
}

export function formatInvoiceNumber(monthCode: string, sequence: number) {
  return `FLP/${monthCode}/${String(sequence).padStart(3, "0")}`;
}

export function createInvoiceMessage(
  invoice: InvoiceDetailForRole,
  settings: InvoiceSettings
) {
  const invoiceText = buildInvoiceText({
    invoiceNumber: invoice.invoice_number,
    customer: invoice.customer,
    settings,
    items: invoice.items,
    shipping: invoice.shipping,
    discountType: invoice.diskon_type,
    discountValue: invoice.diskon_value
  });

  return {
    text: invoiceText,
    whatsappUrl: buildWhatsAppUrl(invoice.customer.phone, invoiceText)
  };
}

export function calculateSafeReportTotals(invoices: InvoiceDetailForRole[], role: UserRole) {
  return invoices.reduce(
    (totals, invoice) => {
      const subtotal = calculateSubtotal(invoice.items);
      const discount = calculateDiscount(subtotal, invoice.diskon_type, invoice.diskon_value);
      const shipping = invoice.shipping?.tarif ?? 0;
      const communityProfitBeforeDiscount = invoice.items.reduce(
        (sum, item) => sum + (item.harga_jual_snapshot - item.harga_komunitas_snapshot) * item.qty,
        0
      );
      const adminProfit =
        role === "admin"
          ? invoice.items.reduce((sum, item) => {
              if (!("harga_modal_snapshot" in item)) {
                return sum;
              }

              return sum + (item.harga_komunitas_snapshot - item.harga_modal_snapshot) * item.qty;
            }, 0)
          : 0;

      return {
        totalSales: totals.totalSales + subtotal + shipping - discount,
        shippingPassThrough: totals.shippingPassThrough + shipping,
        discountTotal: totals.discountTotal + discount,
        communityProfitBeforeDiscount: totals.communityProfitBeforeDiscount + communityProfitBeforeDiscount,
        adminProfit: totals.adminProfit + adminProfit
      };
    },
    {
      totalSales: 0,
      shippingPassThrough: 0,
      discountTotal: 0,
      communityProfitBeforeDiscount: 0,
      adminProfit: 0
    }
  );
}

export { rowsToSettings };

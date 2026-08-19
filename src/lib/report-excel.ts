import type { InvoiceDetailForRole, UserRole } from "@/types";
import { calculateInvoiceTotal } from "@/lib/invoice";

const currencyFormat = '"Rp" #,##0;[Red]-"Rp" #,##0';

function calculateInvoiceProfits(invoice: InvoiceDetailForRole, role: UserRole) {
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
  const communityBeforeDiscount = invoice.items.reduce(
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
    totals,
    communityBeforeDiscount,
    communityAfterDiscount: communityBeforeDiscount - totals.discount,
    adminProfit
  };
}

function styleWorksheet(
  worksheet: import("exceljs").Worksheet,
  currencyColumns: number[],
  wrapColumns: number[] = []
) {
  const header = worksheet.getRow(1);

  header.height = 28;
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F766E" } };
  header.alignment = { vertical: "middle", horizontal: "center" };
  worksheet.views = [{ state: "frozen", ySplit: 1 }];
  worksheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: worksheet.columnCount }
  };

  currencyColumns.forEach((columnNumber) => {
    worksheet.getColumn(columnNumber).numFmt = currencyFormat;
  });
  wrapColumns.forEach((columnNumber) => {
    worksheet.getColumn(columnNumber).alignment = { vertical: "top", wrapText: true };
  });

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) {
      return;
    }

    row.alignment = { ...row.alignment, vertical: "top" };

    if (rowNumber % 2 === 0) {
      row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF0FDFA" } };
    }
  });
}

export async function exportDoneInvoicesToExcel({
  invoices,
  role,
  dateFrom,
  dateTo
}: {
  invoices: InvoiceDetailForRole[];
  role: UserRole;
  dateFrom: string;
  dateTo: string;
}) {
  const doneInvoices = invoices.filter((invoice) => invoice.status === "done");

  if (doneInvoices.length === 0) {
    throw new Error("Tidak ada invoice done untuk diekspor pada periode ini.");
  }

  const ExcelJS = await import("exceljs");
  const workbook = new ExcelJS.Workbook();

  workbook.creator = "Gerai FLP Invoice App";
  workbook.created = new Date();

  const summary = workbook.addWorksheet("Ringkasan Invoice");
  const summaryColumns: Partial<import("exceljs").Column>[] = [
    { header: "No. Invoice", key: "invoiceNumber", width: 18 },
    { header: "Tanggal", key: "date", width: 13 },
    { header: "Nama Pembeli", key: "customer", width: 24 },
    { header: "No. WhatsApp", key: "phone", width: 18 },
    { header: "Alamat", key: "address", width: 36 },
    { header: "Produk", key: "products", width: 48 },
    { header: "Subtotal Produk", key: "subtotal", width: 18 },
    { header: "Ekspedisi", key: "shippingName", width: 18 },
    { header: "Ongkir", key: "shipping", width: 15 },
    { header: "Diskon", key: "discount", width: 15 },
    { header: "Total Harga Beli", key: "total", width: 18 },
    { header: "Profit Komunitas Sebelum Diskon", key: "communityBefore", width: 25 },
    { header: "Profit Komunitas Setelah Diskon", key: "communityAfter", width: 25 },
    ...(role === "admin"
      ? [{ header: "Profit Admin", key: "adminProfit", width: 18 }]
      : []),
    { header: "Status", key: "status", width: 12 }
  ];

  summary.columns = summaryColumns;

  doneInvoices.forEach((invoice) => {
    const profits = calculateInvoiceProfits(invoice, role);
    const products = invoice.items
      .map(
        (item) =>
          `${item.title} x${item.qty} — Rp${new Intl.NumberFormat("id-ID").format(
            item.harga_jual_snapshot * item.qty
          )}`
      )
      .join("\n");

    summary.addRow({
      invoiceNumber: invoice.invoice_number,
      date: invoice.tanggal,
      customer: invoice.customer.name,
      phone: invoice.customer.phone,
      address: invoice.customer.address,
      products,
      subtotal: profits.totals.subtotal,
      shippingName: invoice.shipping?.ekspedisi ?? "-",
      shipping: profits.totals.shippingCost,
      discount: profits.totals.discount,
      total: profits.totals.total,
      communityBefore: profits.communityBeforeDiscount,
      communityAfter: profits.communityAfterDiscount,
      ...(role === "admin" ? { adminProfit: profits.adminProfit } : {}),
      status: "Lunas"
    });
  });

  const summaryCurrencyStart = 7;
  const summaryCurrencyEnd = role === "admin" ? 14 : 13;
  styleWorksheet(
    summary,
    Array.from(
      { length: summaryCurrencyEnd - summaryCurrencyStart + 1 },
      (_, index) => summaryCurrencyStart + index
    ).filter((column) => column !== 8),
    [5, 6]
  );

  const details = workbook.addWorksheet("Detail Produk");
  details.columns = [
    { header: "No. Invoice", key: "invoiceNumber", width: 18 },
    { header: "Tanggal", key: "date", width: 13 },
    { header: "Nama Pembeli", key: "customer", width: 24 },
    { header: "Produk", key: "product", width: 36 },
    { header: "Jumlah", key: "quantity", width: 12 },
    { header: "Harga Satuan", key: "unitPrice", width: 18 },
    { header: "Total Produk", key: "itemTotal", width: 18 },
    { header: "Status", key: "status", width: 12 }
  ];

  doneInvoices.forEach((invoice) => {
    invoice.items.forEach((item) => {
      details.addRow({
        invoiceNumber: invoice.invoice_number,
        date: invoice.tanggal,
        customer: invoice.customer.name,
        product: item.title,
        quantity: item.qty,
        unitPrice: item.harga_jual_snapshot,
        itemTotal: item.harga_jual_snapshot * item.qty,
        status: "Lunas"
      });
    });
  });

  styleWorksheet(details, [6, 7], [4]);

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `laporan-done-${dateFrom}-${dateTo}.xlsx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => window.URL.revokeObjectURL(url), 0);
}

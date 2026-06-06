import { InvoicesList } from "@/components/invoices-list";
import { PageHeader } from "@/components/page-header";

export default function HistoryPage() {
  return (
    <>
      <PageHeader
        title="History Invoice"
        description="Invoice berstatus sent akan tersimpan di sini untuk detail dan salin ulang teks WhatsApp."
      />
      <InvoicesList status="sent" />
    </>
  );
}

import { InvoicesList } from "@/components/invoices-list";
import { PageHeader } from "@/components/page-header";

export default function HistoryPage() {
  return (
    <>
      <PageHeader
        title="History Invoice"
        description="Invoice sent, done, dan void tersimpan di sini untuk ditandai, dilihat detailnya, dan disalin ulang."
      />
      <InvoicesList status="history" />
    </>
  );
}

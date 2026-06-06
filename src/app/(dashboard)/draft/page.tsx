import { InvoicesList } from "@/components/invoices-list";
import { PageHeader } from "@/components/page-header";

export default function DraftPage() {
  return (
    <>
      <PageHeader
        title="Draft Invoice"
        description="Daftar invoice berstatus draft, bisa dicari dan dibuka kembali untuk diedit."
      />
      <InvoicesList status="draft" />
    </>
  );
}

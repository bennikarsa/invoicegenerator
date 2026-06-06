import { GenerateInvoice } from "@/components/generate-invoice";
import { PageHeader } from "@/components/page-header";

export default function GeneratePage() {
  return (
    <>
      <PageHeader
        title="Generate Invoice"
        description="Pilih pembeli, buku, ongkir, dan diskon untuk membuat preview invoice WhatsApp."
      />
      <GenerateInvoice />
    </>
  );
}

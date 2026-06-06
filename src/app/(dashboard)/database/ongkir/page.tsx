import { PageHeader } from "@/components/page-header";
import { ShippingsManager } from "@/components/shippings-manager";

export default function OngkirPage() {
  return (
    <>
      <PageHeader title="Database Ongkir" description="Kelola ekspedisi dan tarif ongkir untuk invoice." />
      <ShippingsManager />
    </>
  );
}

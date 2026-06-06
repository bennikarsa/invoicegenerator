import { CustomersManager } from "@/components/customers-manager";
import { PageHeader } from "@/components/page-header";

export default function PembeliPage() {
  return (
    <>
      <PageHeader title="Database Pembeli" description="Kelola nama, nomor WhatsApp, dan alamat pembeli." />
      <CustomersManager />
    </>
  );
}

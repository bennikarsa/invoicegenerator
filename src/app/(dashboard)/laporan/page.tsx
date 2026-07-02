import { PageHeader } from "@/components/page-header";
import { ReportPanel } from "@/components/report-panel";

export default function LaporanPage() {
  return (
    <>
      <PageHeader
        title="Laporan"
        description="Laporan penjualan dan keuntungan berdasarkan invoice done dalam rentang tanggal."
      />
      <ReportPanel />
    </>
  );
}

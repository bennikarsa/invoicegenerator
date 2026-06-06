import { PageHeader } from "@/components/page-header";
import { SettingsForm } from "@/components/settings-form";

export default function SettingPage() {
  return (
    <>
      <PageHeader
        title="Setting"
        description="Atur header invoice, footer, pengirim, nomor HP, dan info rekening pembayaran."
      />
      <SettingsForm />
    </>
  );
}

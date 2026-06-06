import { DashboardClientShell } from "@/components/dashboard-client-shell";

export default function DashboardLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <DashboardClientShell>{children}</DashboardClientShell>;
}

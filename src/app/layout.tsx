import type { Metadata } from "next";
import { ServiceWorkerRegister } from "@/components/service-worker-register";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gerai FLP Invoice",
  description: "Aplikasi invoice internal Gerai FLP",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icons/icon.svg",
    apple: "/icons/icon.svg"
  },
  appleWebApp: {
    capable: true,
    title: "Gerai FLP Invoice",
    statusBarStyle: "default"
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body>
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}

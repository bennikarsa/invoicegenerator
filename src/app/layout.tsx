import type { Metadata } from "next";
import { ServiceWorkerRegister } from "@/components/service-worker-register";
import { APP_CONFIG, APP_TITLE } from "@/lib/app-config";
import "./globals.css";

export const metadata: Metadata = {
  title: APP_TITLE,
  description: APP_CONFIG.description,
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icons/icon.svg",
    apple: "/icons/icon.svg"
  },
  appleWebApp: {
    capable: true,
    title: APP_TITLE,
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

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gerai FLP Invoice",
  description: "Aplikasi invoice internal Gerai FLP"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}

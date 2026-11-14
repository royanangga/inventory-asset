import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "Inventory Asset", description: "Daftar inventory asset dan rekonsiliasi dengan Trial Balance" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}

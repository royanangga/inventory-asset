import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans } from "next/font/google";
import "./globals.css";

const plex = IBM_Plex_Sans({ subsets: ["latin"], weight: ["300", "400", "500", "600"], variable: "--font-plex", display: "swap" });

export const metadata: Metadata = { title: "Inventory Asset", description: "Daftar inventory asset dan rekonsiliasi dengan Trial Balance" };
export const viewport: Viewport = { themeColor: [{ media: "(prefers-color-scheme: dark)", color: "#0b101b" }, { media: "(prefers-color-scheme: light)", color: "#eceef4" }] };

// Terapkan tema & mode privasi sebelum halaman tampil (tanpa kedipan)
const INIT = `try{var d=document.documentElement,t=localStorage.getItem("theme");if(!t)t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";d.dataset.theme=t;d.dataset.privacy=localStorage.getItem("privacy")==="on"?"on":"off"}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={plex.variable} suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: INIT }} /></head>
      <body>{children}</body>
    </html>
  );
}

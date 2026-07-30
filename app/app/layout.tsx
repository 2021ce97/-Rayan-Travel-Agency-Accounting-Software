import type { Metadata } from "next";
import "./globals.css";
import { LanguageSelector } from "@/components/language/language-selector";

export const metadata: Metadata = {
  title: "Rayan Solutions — Travel Agency Management System",
  description: "Vouchers, accounting, and reporting for travel agencies.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">
        {children}
        <LanguageSelector />
      </body>
    </html>
  );
}

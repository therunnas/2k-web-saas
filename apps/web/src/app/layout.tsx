import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "2K STUDIOS",
  description: "Painel administrativo privado da 2K Studios",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
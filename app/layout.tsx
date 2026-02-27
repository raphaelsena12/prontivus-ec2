import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Prontivus - Sistema de Gestão Médica",
  description: "Sistema completo de gestão para clínicas médicas",
  icons: {
    icon: "/LogotipoemFundoTransparente.webp",
    shortcut: "/LogotipoemFundoTransparente.webp",
    apple: "/LogotipoemFundoTransparente.webp",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.variable} antialiased font-sans`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

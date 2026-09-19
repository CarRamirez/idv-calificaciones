import type { Metadata } from "next";
import "./globals.css";
import ImpersonationBanner from "@/components/ImpersonationBanner";

export const metadata: Metadata = {
  title: "IDV Calificaciones",
  description: "Sistema de registro de calificaciones - Instituto Don Vasco",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="font-sans">
        <ImpersonationBanner />
        {children}
      </body>
    </html>
  );
}

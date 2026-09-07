import type { Metadata } from "next";
import "./globals.css";

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
      <body className="font-sans">{children}</body>
    </html>
  );
}

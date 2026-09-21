import type { Metadata, Viewport } from "next";
import "./globals.css";
import ImpersonationBanner from "@/components/ImpersonationBanner";
import PWARegister from "@/components/PWARegister";

export const metadata: Metadata = {
  title: "Mnemósine — IDV",
  description: "Sistema de registro de calificaciones — Instituto Don Vasco",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Mnemósine",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#4f46e5",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="font-sans antialiased">
        <ImpersonationBanner />
        {children}
        <PWARegister />
      </body>
    </html>
  );
}

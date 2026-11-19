import type { Metadata, Viewport } from "next";
import "@fontsource-variable/plus-jakarta-sans";
import "./globals.css";
import ImpersonationBanner from "@/components/ImpersonationBanner";
import PWARegister from "@/components/PWARegister";
import ThemeProvider, { SCRIPT_TEMA } from "@/components/ThemeProvider";

export const metadata: Metadata = {
  title: { default: "Mnemósine — IDV", template: "%s · Mnemósine" },
  applicationName: "Mnemósine",
  description: "Mnemósine · Sistema de calificaciones · Instituto Don Vasco",
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
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#020617" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA }} />
      </head>
      <body className="font-sans antialiased">
        <ThemeProvider>
          <ImpersonationBanner />
          {children}
          <PWARegister />
        </ThemeProvider>
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import "./globals.css";
import ImpersonationBanner from "@/components/ImpersonationBanner";
import PWARegister from "@/components/PWARegister";
import ThemeProvider from "@/components/ThemeProvider";

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
    <html lang="es" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var mode = localStorage.getItem('theme-mode') || 'light';
                  var resolved = mode;
                  if (mode === 'auto') {
                    resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                  }
                  document.documentElement.setAttribute('data-theme', resolved);
                  var color = localStorage.getItem('theme-color') || 'indigo';
                  var skins = {
                    indigo: { p: '#5c7cfa', s: '#7c3aed', g: 'linear-gradient(135deg, #5c7cfa 0%, #7c3aed 100%)', r: 'rgba(92,124,250,0.5)', sh: 'rgba(92,124,250,0.35)', bar: 'linear-gradient(90deg, #5c7cfa, #7c3aed, #ff9800, #2ba672, #22d3ee)' },
                    blue: { p: '#2563eb', s: '#3b82f6', g: 'linear-gradient(135deg, #2563eb 0%, #0ea5e9 100%)', r: 'rgba(37,99,235,0.5)', sh: 'rgba(37,99,235,0.35)', bar: 'linear-gradient(90deg, #2563eb, #0ea5e9, #06b6d4, #3b82f6, #60a5fa)' },
                    emerald: { p: '#059669', s: '#10b981', g: 'linear-gradient(135deg, #059669 0%, #34d399 100%)', r: 'rgba(5,150,105,0.5)', sh: 'rgba(5,150,105,0.35)', bar: 'linear-gradient(90deg, #059669, #10b981, #34d399, #6ee7b7, #a7f3d0)' },
                    rose: { p: '#e11d48', s: '#f43f5e', g: 'linear-gradient(135deg, #e11d48 0%, #fb7185 100%)', r: 'rgba(225,29,72,0.5)', sh: 'rgba(225,29,72,0.35)', bar: 'linear-gradient(90deg, #e11d48, #f43f5e, #fb7185, #fda4af, #fecdd3)' },
                    amber: { p: '#d97706', s: '#f59e0b', g: 'linear-gradient(135deg, #d97706 0%, #fbbf24 100%)', r: 'rgba(217,119,6,0.5)', sh: 'rgba(217,119,6,0.35)', bar: 'linear-gradient(90deg, #d97706, #f59e0b, #fbbf24, #fde68a, #fef3c7)' },
                    cyan: { p: '#0891b2', s: '#06b6d4', g: 'linear-gradient(135deg, #0891b2 0%, #22d3ee 100%)', r: 'rgba(8,145,178,0.5)', sh: 'rgba(8,145,178,0.35)', bar: 'linear-gradient(90deg, #0891b2, #06b6d4, #22d3ee, #67e8f9, #a5f3fc)' }
                  };
                  var s = skins[color] || skins.indigo;
                  var d = document.documentElement.style;
                  d.setProperty('--skin-primary', s.p);
                  d.setProperty('--skin-secondary', s.s);
                  d.setProperty('--skin-gradient', s.g);
                  d.setProperty('--skin-ring', s.r);
                  d.setProperty('--skin-shadow', s.sh);
                  d.setProperty('--skin-accent-bar', s.bar);
                } catch(e) {}
              })();
            `,
          }}
        />
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

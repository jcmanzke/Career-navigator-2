import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Career Navigator – MVP",
  description: "Seven Stories guided MVP (local only)",
  viewport: {
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
  },
  themeColor: "#ffffff",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Career Navigator",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased font-body">{children}</body>
    </html>
  );
}

import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Career Navigator – MVP",
  description: "Seven Stories guided MVP (local only)",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body className="antialiased">{children}</body>
    </html>
  );
}

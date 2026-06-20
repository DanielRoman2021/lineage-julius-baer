import "./globals.css";
import "@xyflow/react/dist/style.css";
import type { Metadata } from "next";

// Cloudflare Pages (next-on-pages) serves dynamic routes on the edge runtime.
export const runtime = "edge";

export const metadata: Metadata = {
  title: "Lineage, Wealth Relationship OS",
  description:
    "Lineage turns KYC intake into a living wealth story the client co-owns. AI does the bureaucracy, the human RM owns every decision.",
  icons: { icon: "/icon.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Spectral:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&family=Archivo:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}

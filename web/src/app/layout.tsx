import React from "react";
import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DepMi — Buy Here. Build Here. Grow Here.",
  description:
    "The social commerce platform for African entrepreneurs. Discover products, request what you need, and transact with trust.",
  openGraph: {
    title: "DepMi — Social Commerce for Africa",
    description:
      "Buy, sell, and discover products with trust. Earn Deps, bid on demand requests, and grow your business.",
    siteName: "DepMi",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#00C853",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

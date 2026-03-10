import React from "react";
import type { Metadata, Viewport } from "next";
import { Providers } from "@/components/Providers";
import NavigationWrapper from "@/components/NavigationWrapper";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL('https://depmi.com'),
  title: "DepMi — Buy Here. Build Here. Grow Here.",
  description:
    "Buy Here. Build Here. Grow Here. DepMi is the social commerce platform for African entrepreneurs.",
  icons: {
    icon: '/depmi-logo.svg',
  },
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: "DepMi — Social Commerce for Africa",
    description:
      "Buy, sell, and discover products with trust. Earn Deps, bid on demand requests, and grow your business.",
    siteName: "DepMi",
    type: "website",
    url: 'https://depmi.com',
    images: [{ url: '/depmi-logo-text-dark.png', width: 1200, height: 630, alt: 'DepMi logo' }],
  },
  twitter: {
    card: "summary_large_image",
    title: "DepMi — Social Commerce for Africa",
    description: "The social commerce platform for African entrepreneurs.",
    images: ['/depmi-logo-text-dark.png'],
  }
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
      <body>
        <Providers>
          <NavigationWrapper>
            {children}
          </NavigationWrapper>
        </Providers>
      </body>
    </html>
  );
}

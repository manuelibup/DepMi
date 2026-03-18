import React from "react";
import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import { Providers } from "@/components/Providers";
import NavigationWrapper from "@/components/NavigationWrapper";
import ActivityPing from "@/components/ActivityPing";
import ServiceWorkerRegistrar from "@/components/ServiceWorkerRegistrar";
import PushPrompt from "@/components/PushPrompt";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL('https://depmi.com'),
  title: "DepMi — Buy Here. Build Here. Grow Here.",
  description:
    "Buy Here. Build Here. Grow Here. DepMi is the social commerce platform for African entrepreneurs.",
  icons: {
    icon: '/depmi-logo.svg',
  },
  manifest: '/manifest.json',
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
  },
  verification: {
    google: 'OMgUtc-qD_n_okTc01Tjs-i-5swsdYK0qif7NH7H-jU',
  },
};

export const viewport: Viewport = {
  themeColor: "#059669",
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
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "Organization",
                  "@id": "https://depmi.com/#organization",
                  "name": "DepMi",
                  "alternateName": "DepMi Nigeria",
                  "url": "https://depmi.com",
                  "logo": "https://depmi.com/depmi-logo.svg",
                  "description": "DepMi (\"Buy Here\" in Ibibio) is a social commerce platform for African entrepreneurs. Buy, sell, and discover products with trust-based escrow, demand-driven marketplace, and credibility scores.",
                  "foundingDate": "2025",
                  "founder": { "@type": "Person", "name": "Manuel" },
                  "areaServed": { "@type": "Place", "name": "Africa" },
                  "sameAs": [
                    "https://x.com/web5manuel",
                    "https://instagram.com/depmilimited"
                  ]
                },
                {
                  "@type": "WebSite",
                  "@id": "https://depmi.com/#website",
                  "url": "https://depmi.com",
                  "name": "DepMi",
                  "publisher": { "@id": "https://depmi.com/#organization" },
                  "potentialAction": {
                    "@type": "SearchAction",
                    "target": "https://depmi.com/search?q={search_term_string}",
                    "query-input": "required name=search_term_string"
                  }
                },
                {
                  "@type": "WebApplication",
                  "name": "DepMi",
                  "url": "https://depmi.com",
                  "applicationCategory": "ShoppingApplication",
                  "operatingSystem": "Any",
                  "offers": {
                    "@type": "Offer",
                    "price": "0",
                    "priceCurrency": "NGN"
                  },
                  "description": "The social commerce platform for African entrepreneurs. Buy, sell, and discover products with trust."
                }
              ]
            })
          }}
        />
      </head>
      <body>
        <Providers>
          <Toaster theme="dark" position="bottom-center" richColors />
          <ServiceWorkerRegistrar />
          <ActivityPing />
          <PushPrompt />
          <NavigationWrapper>
            {children}
          </NavigationWrapper>
        </Providers>
      </body>
    </html>
  );
}

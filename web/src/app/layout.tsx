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
                  "alternateName": ["DepMi Nigeria", "DepMi Limited"],
                  "url": "https://depmi.com",
                  "logo": {
                    "@type": "ImageObject",
                    "url": "https://depmi.com/depmi-logo.png",
                    "width": 512,
                    "height": 512
                  },
                  "image": "https://depmi.com/depmi-logo-text-dark.png",
                  "description": "DepMi is Nigeria's social commerce marketplace. Buy, sell and discover products with built-in escrow, demand-driven bidding, and trust scores for buyers and sellers.",
                  "slogan": "Buy Here. Build Here. Grow Here.",
                  "foundingDate": "2025",
                  "foundingLocation": {
                    "@type": "Place",
                    "addressCountry": "NG",
                    "name": "Nigeria"
                  },
                  "founder": {
                    "@type": "Person",
                    "name": "Manuel",
                    "jobTitle": "Founder & CEO"
                  },
                  "areaServed": [
                    { "@type": "Country", "name": "Nigeria" },
                    { "@type": "Place", "name": "Africa" }
                  ],
                  "contactPoint": [
                    {
                      "@type": "ContactPoint",
                      "email": "support@depmi.com",
                      "contactType": "customer support",
                      "availableLanguage": "English"
                    },
                    {
                      "@type": "ContactPoint",
                      "email": "privacy@depmi.com",
                      "contactType": "privacy inquiries",
                      "availableLanguage": "English"
                    }
                  ],
                  "sameAs": [
                    "https://instagram.com/depmidotcom",
                    "https://twitter.com/depmidotcom",
                    "https://x.com/depmidotcom",
                    "https://linkedin.com/company/depmidotcom",
                    "https://facebook.com/depmidotcom",
                    "https://tiktok.com/@depmidotcom"
                  ],
                  "keywords": "social commerce Nigeria, buy and sell Nigeria, online marketplace Nigeria, escrow Nigeria, African entrepreneurs, depmi"
                },
                {
                  "@type": "WebSite",
                  "@id": "https://depmi.com/#website",
                  "url": "https://depmi.com",
                  "name": "DepMi",
                  "description": "Nigeria's social commerce marketplace — buy, sell, and grow with escrow-protected transactions.",
                  "publisher": { "@id": "https://depmi.com/#organization" },
                  "inLanguage": "en-NG",
                  "potentialAction": {
                    "@type": "SearchAction",
                    "target": {
                      "@type": "EntryPoint",
                      "urlTemplate": "https://depmi.com/search?q={search_term_string}"
                    },
                    "query-input": "required name=search_term_string"
                  }
                },
                {
                  "@type": "WebApplication",
                  "@id": "https://depmi.com/#webapp",
                  "name": "DepMi",
                  "url": "https://depmi.com",
                  "applicationCategory": "ShoppingApplication",
                  "operatingSystem": "Any",
                  "browserRequirements": "Requires JavaScript",
                  "offers": {
                    "@type": "Offer",
                    "price": "0",
                    "priceCurrency": "NGN",
                    "description": "Free to join. Sellers pay a small platform fee per transaction."
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

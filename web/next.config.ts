import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
    // Static redirects have been removed; handle normalization is now performed securely via middleware.ts
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'res.cloudinary.com',
            },
            {
                protocol: 'https',
                hostname: 'lh3.googleusercontent.com',
            },
            {
                protocol: 'https',
                hostname: 'covers.openlibrary.org',
            },
            {
                protocol: 'https',
                hostname: 'books.google.com',
            },
        ],
    },
};

export default withSentryConfig(nextConfig, {
    org: "depmi",
    project: "javascript-nextjs",
    silent: !process.env.CI,
    widenClientFileUpload: true,
    sourcemaps: { disable: true },
});

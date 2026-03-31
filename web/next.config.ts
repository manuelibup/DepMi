import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
    async redirects() {
        return [
            // Canonical URLs: /store/[slug] and /u/[username] redirect to /[handle]
            {
                // Exclude /store/create (reserved page) from the handle redirect
                source: '/store/:slug((?!create)[^/]+)',
                destination: '/:slug',
                permanent: true,
            },
            {
                source: '/u/:username',
                destination: '/:username',
                permanent: true,
            },
            // /home is not a valid route — redirect to homepage
            {
                source: '/home',
                destination: '/',
                permanent: true,
            },
        ];
    },
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

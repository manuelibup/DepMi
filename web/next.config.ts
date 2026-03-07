import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
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

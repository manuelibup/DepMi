import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
    return {
        rules: [
            {
                userAgent: '*',
                allow: '/',
                disallow: [
                    '/admin/',
                    '/secure-admin/',
                    '/api/',
                    '/onboarding/',
                    '/checkout/',
                    '/settings/',
                    '/messages/',
                    '/notifications/',
                    '/bookmarks/',
                    '/orders/',
                    '/profile/',
                    '/store/create',
                    '/store/*/settings',
                    '/store/*/products/new',
                    '/store/*/products/*/edit',
                    '/store/*/import',
                    '/store/*/ai-import',
                    '/demand/new',
                    '/requests/*/edit',
                    '/support/',
                ],
            },
        ],
        sitemap: 'https://depmi.com/sitemap.xml',
    };
}

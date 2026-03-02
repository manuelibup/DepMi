import middleware from "next-auth/middleware";

export { middleware };

export const config = {
    // Only protect routes that require authentication to view at all.
    // Browse-first: store pages, requests, search, and public profiles are open to guests.
    // Actions inside those pages (buy, bid, post) gate via the AuthGate modal client-side.
    matcher: [
        "/orders",
        "/orders/(.*)",
        "/profile",
        "/profile/(.*)",
        "/demand/new",
        "/store/create",
        "/store/(.+)/products/new",
        "/store/(.+)/products/(.+)/edit",
        "/admin",
        "/admin/(.*)",
    ],
};

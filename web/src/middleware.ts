export { default } from "next-auth/middleware";

export const config = {
    // Protect all routes by default, EXCEPT:
    // - public routes: /login, /register, /
    // - public static files: images (*.png), favicon.ico
    // - next internals: _next/static, _next/image
    // - api routes (they have their own protection logic)
    matcher: ["/((?!api|_next/static|_next/image|favicon.ico|login|register|.*\\.png$|$).*)"],
};

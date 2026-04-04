import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { AuthProvider, Account as PrismaAccount } from "@prisma/client";
import { prisma } from "./prisma";
import bcrypt from "bcrypt";
import { authenticator } from 'otplib';
import { seedDefaultFollows } from "./autoFollow";
import { sendWelcomeEmail } from "./email";

// Extend NextAuth Session to expose the DB user id on session.user.id
declare module "next-auth" {
    interface Session {
        user: {
            id: string;
            username?: string | null;
            name?: string | null;
            email?: string | null;
            image?: string | null;
            adminRole?: string | null;
            totpEnabled?: boolean;
            twoFaVerified?: boolean;
            adminPinVerified?: boolean;
            onboardingComplete?: boolean;
        };
    }
}

export const authOptions: NextAuthOptions = {
    // NOTE: No PrismaAdapter — our custom Account schema doesn't match the
    // NextAuth standard adapter schema (type, providerAccountId, token fields).
    // Google OAuth is handled manually in the signIn callback below.
    session: {
        strategy: "jwt",
    },

    pages: {
        signIn: "/login",
    },
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID || "",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
        }),
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
                otp: { label: "OTP", type: "text" },
            },
            async authorize(credentials) {
                if (!credentials?.email) {
                    throw new Error("Invalid credentials");
                }

                const user = await prisma.user.findUnique({
                    where: { email: credentials.email },
                    include: { accounts: true },
                });

                if (!user) {
                    throw new Error("Invalid credentials");
                }

                // If OTP is provided, verify via OTP flow
                if (credentials.otp) {
                    const { verifyOtp } = await import("@/lib/otp");
                    const isOtpValid = await verifyOtp(user.id, "EMAIL_VERIFICATION", credentials.otp);
                    
                    if (!isOtpValid) {
                        throw new Error("Invalid or expired code");
                    }
                    
                    // Mark email as verified if it wasn't
                    if (!user.emailVerified) {
                        await prisma.user.update({
                            where: { id: user.id },
                            data: { emailVerified: true }
                        });
                    }

                    return {
                        id: user.id,
                        email: user.email,
                        name: user.displayName,
                        image: user.avatarUrl,
                    };
                }

                // Otherwise, proceed with Standard Password flow
                if (!credentials.password) {
                    throw new Error("Password is required");
                }

                const emailAccount = user.accounts.find(
                    (acc: PrismaAccount) => acc.provider === AuthProvider.EMAIL
                );

                if (!emailAccount || !emailAccount.passwordHash) {
                    throw new Error(
                        "Please sign in with the provider you used to register (e.g., Google)."
                    );
                }

                const isPasswordValid = await bcrypt.compare(
                    credentials.password,
                    emailAccount.passwordHash
                );

                if (!isPasswordValid) {
                    throw new Error("Invalid credentials");
                }

                return {
                    id: user.id,
                    email: user.email,
                    name: user.displayName,
                    image: user.avatarUrl,
                };
            },
        }),
    ],
    callbacks: {
        // Handles Google OAuth account creation / linking using our custom schema.
        async signIn({ user, account }) {
            if (account?.provider === "google") {
                if (!user.email) return false;

                try {
                    const existingUser = await prisma.user.findUnique({
                        where: { email: user.email },
                        include: { accounts: true },
                    });

                    if (existingUser) {
                        // Link Google account if not already linked
                        const alreadyLinked = existingUser.accounts.some(
                            (acc: PrismaAccount) =>
                                acc.provider === AuthProvider.GOOGLE &&
                                acc.providerId === account.providerAccountId
                        );
                        if (!alreadyLinked) {
                            await prisma.account.create({
                                data: {
                                    userId: existingUser.id,
                                    provider: AuthProvider.GOOGLE,
                                    providerId: account.providerAccountId,
                                },
                            });
                        }
                    } else {
                        // Create a new user from Google profile
                        const baseUsername = (user.name || user.email.split("@")[0])
                            .toLowerCase()
                            .replace(/\s+/g, '')
                            .replace(/[^a-z0-9_]/g, '');

                        // Add a small random suffix to ensure uniqueness on first try
                        const randomSuffix = Math.random().toString(36).substring(2, 6);
                        const finalUsername = `${baseUsername}${randomSuffix}`;

                        const createdUser = await prisma.user.create({
                            data: {
                                email: user.email,
                                username: finalUsername,
                                displayName: user.name ?? user.email.split("@")[0],
                                avatarUrl: user.image,
                                accounts: {
                                    create: {
                                        provider: AuthProvider.GOOGLE,
                                        providerId: account.providerAccountId,
                                    },
                                },
                            },
                        });
                        // Seed default follows + welcome email (non-blocking)
                        void seedDefaultFollows(createdUser.id);
                        void sendWelcomeEmail(user.email!, user.name ?? 'there');
                    }
                    return true;
                } catch (error) {
                    console.error("Google sign-in error:", error);
                    return false;
                }
            }
            // Credentials flow — authorize() already validated, allow through
            return true;
        },

        async session({ session, token }) {
            if (token && session.user) {
                session.user.id = token.id as string;
                session.user.username = token.username as string | undefined;
                session.user.image = (token.picture as string | null) ?? null;
                session.user.adminRole = (token.adminRole as string | null) ?? null;
                session.user.totpEnabled = token.totpEnabled as boolean | undefined;
                session.user.twoFaVerified = token.twoFaVerified as boolean | undefined;
                session.user.adminPinVerified = token.adminPinVerified as boolean | undefined;
                session.user.onboardingComplete = token.onboardingComplete as boolean | undefined;
            }
            return session;
        },

        async jwt({ token, user, trigger, session }) {
            // Credentials sign-in: user.id is the DB id returned by authorize()
            if (user) {
                token.id = user.id;
            }

            // Handle manual session update (from Client update() call)
            if (trigger === "update" && session) {
                if (session.username) token.username = session.username;
                if (session.name) token.name = session.name;
                if (session.picture) token.picture = session.picture;
                if (session.onboardingComplete) token.onboardingComplete = true;

                if (session.twoFaCode) {
                    const dbUser = await prisma.user.findUnique({ where: { id: token.id as string } });
                    if (dbUser && (dbUser as any).totpSecret) {
                        const isValid = authenticator.verify({ token: session.twoFaCode, secret: (dbUser as any).totpSecret });
                        if (isValid) {
                            token.twoFaVerified = true;
                        }
                    }
                }

                if (session.adminPin) {
                    const dbUser = await prisma.user.findUnique({ where: { id: token.id as string } });
                    if (dbUser && (dbUser as any).adminPinHash) {
                        const isPinValid = await bcrypt.compare(session.adminPin, (dbUser as any).adminPinHash);
                        if (isPinValid) {
                            token.adminPinVerified = true;
                        }
                    }
                }
            }

            // Always fetch the latest from DB if we don't have a username or on sign-in
            // This ensures server-side redirects work after onboarding
            if (token.email && (!token.username || !token.onboardingComplete || trigger === "signIn")) {
                try {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const dbUser = await (prisma.user as any).findUnique({
                        where: { email: token.email },
                        select: { id: true, username: true, avatarUrl: true, adminRole: true, totpEnabled: true, onboardingComplete: true },
                    });
                    if (dbUser) {
                        token.id = dbUser.id;
                        token.username = dbUser.username;
                        token.picture = dbUser.avatarUrl ?? null;
                        token.adminRole = dbUser.adminRole ?? null;
                        token.totpEnabled = dbUser.totpEnabled;
                        token.onboardingComplete = dbUser.onboardingComplete;
                    }
                } catch (err) {
                    // DB temporarily unreachable — return the token as-is so the
                    // session survives without crashing the entire page request.
                    console.error('[JWT] DB lookup failed, using cached token:', err);
                }
            }
            return token;
        },
    },
    secret: process.env.NEXTAUTH_SECRET,
};

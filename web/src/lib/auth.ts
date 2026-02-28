import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { AuthProvider, Account as PrismaAccount } from "@prisma/client";
import { prisma } from "./prisma";
import bcrypt from "bcrypt";

// Extend NextAuth Session to expose the DB user id on session.user.id
declare module "next-auth" {
    interface Session {
        user: {
            id: string;
            username?: string | null;
            name?: string | null;
            email?: string | null;
            image?: string | null;
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
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials.password) {
                    throw new Error("Invalid credentials");
                }

                const user = await prisma.user.findUnique({
                    where: { email: credentials.email },
                    include: { accounts: true },
                });

                if (!user) {
                    throw new Error("Invalid credentials");
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
                        await prisma.user.create({
                            data: {
                                email: user.email,
                                displayName:
                                    user.name ?? user.email.split("@")[0],
                                avatarUrl: user.image,
                                accounts: {
                                    create: {
                                        provider: AuthProvider.GOOGLE,
                                        providerId: account.providerAccountId,
                                    },
                                },
                            },
                        });
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
            }
            return session;
        },

        async jwt({ token, user, account }) {
            // Credentials sign-in: user.id is the DB id returned by authorize()
            if (user) {
                token.id = user.id;
                // For credentials, username might already be in the user object
                // but let's ensure it's fetched or passed.
                // Actually, authorize() returns what we define.
            }

            // Always fetch the latest from DB to be sure (username, id, etc.)
            if (token.email) {
                const dbUser = await prisma.user.findUnique({
                    where: { email: token.email },
                    select: { id: true, username: true },
                });
                if (dbUser) {
                    token.id = dbUser.id;
                    token.username = dbUser.username;
                }
            }
            return token;
        },
    },
    secret: process.env.NEXTAUTH_SECRET,
};

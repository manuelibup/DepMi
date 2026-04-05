'use client';

import React from 'react';
import { SessionProvider } from "next-auth/react";
import { AuthGateProvider } from "@/context/AuthGate";
import PostHogProvider from "@/components/PostHogProvider";
import { Suspense } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <SessionProvider>
            <PostHogProvider>
                <Suspense>
                    <AuthGateProvider>
                        {children}
                    </AuthGateProvider>
                </Suspense>
            </PostHogProvider>
        </SessionProvider>
    );
}

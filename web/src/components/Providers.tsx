'use client';

import React from 'react';
import { SessionProvider } from "next-auth/react";
import { AuthGateProvider } from "@/context/AuthGate";

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <SessionProvider>
            <AuthGateProvider>
                {children}
            </AuthGateProvider>
        </SessionProvider>
    );
}

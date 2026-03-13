import React from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { requireAdmin } from '@/lib/admin';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import SecureAdminClient from './SecureAdminClient';

export default async function SecureAdminPage() {
    const session = await getServerSession(authOptions);
    const check = requireAdmin(session, 'MODERATOR');
    if (!check.ok) redirect('/');

    const user = await prisma.user.findUnique({
        where: { id: session!.user.id },
        select: { totpEnabled: true, adminPinHash: true }
    });

    if (!user) redirect('/');

    // @ts-ignore
    const needsSetup = !user.totpEnabled || !user.adminPinHash;
    // @ts-ignore
    const needsVerification = !session!.user.twoFaVerified || !session!.user.adminPinVerified;

    if (!needsSetup && !needsVerification) {
        redirect('/admin/dashboard');
    }

    return (
        <SecureAdminClient
            needsSetup={needsSetup}
            // @ts-ignore
            hasTotp={user.totpEnabled}
            // @ts-ignore
            hasPin={!!user.adminPinHash}
        />
    );
}

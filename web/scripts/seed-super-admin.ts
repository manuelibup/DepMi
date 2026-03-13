/**
 * One-time script to grant SUPER_ADMIN role to a user by email.
 *
 * Usage:
 *   SEED_ADMIN_EMAIL=your@email.com npx ts-node --project tsconfig.json scripts/seed-super-admin.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const email = process.env.SEED_ADMIN_EMAIL;
    if (!email) {
        throw new Error('Set SEED_ADMIN_EMAIL env var before running this script.');
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
        throw new Error(`No user found with email: ${email}`);
    }

    await prisma.user.update({
        where: { id: user.id },
        data: { adminRole: 'SUPER_ADMIN' },
    });

    console.log(`✅  Granted SUPER_ADMIN to ${user.displayName} (${email}) — id: ${user.id}`);
}

main()
    .catch(err => { console.error(err); process.exit(1); })
    .finally(() => prisma.$disconnect());

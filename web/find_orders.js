const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const shortId1 = '99FCA2';
    const shortId2 = 'Z720E2';

    const orders = await prisma.order.findMany({
        where: {
            OR: [
                { id: { contains: shortId1, mode: 'insensitive' } },
                { id: { contains: shortId2, mode: 'insensitive' } }
            ]
        },
        include: {
            buyer: { select: { id: true, displayName: true } }
        }
    });

    console.log(JSON.stringify(orders, null, 2));
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());

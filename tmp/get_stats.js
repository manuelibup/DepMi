const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const usersCount = await prisma.user.count();
    const storesCount = await prisma.store.count();
    const productsCount = await prisma.product.count();
    const demandsCount = await prisma.demand.count();
    const ordersCount = await prisma.order.count();
    const deliveredOrders = await prisma.order.count({ where: { status: 'DELIVERED' } });
    const completedOrders = await prisma.order.count({ where: { status: 'COMPLETED' } });

    console.log('--- STATS ---');
    console.log(`Users: ${usersCount}`);
    console.log(`Stores: ${storesCount}`);
    console.log(`Products: ${productsCount}`);
    console.log(`Demands: ${demandsCount}`);
    console.log(`Orders (Total): ${ordersCount}`);
    console.log(`Orders (Completed/Delivered): ${deliveredOrders + completedOrders}`);
    console.log('--------------');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

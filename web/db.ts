import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({ where: { displayName: 'Manuel Ibup' } });
  console.log('User ID:', user?.id);
  console.log('User DISPLAY:', user?.displayName);
  console.log('User AVATAR:', user?.avatarUrl);

  const store = await prisma.store.findFirst();
  console.log('Store ID:', store?.id);
  console.log('Store LOGO:', store?.logoUrl);
  console.log('Store BANNER:', store?.bannerUrl);
}

main().catch(console.error).finally(() => prisma.$disconnect());

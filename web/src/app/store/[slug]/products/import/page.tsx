import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect, notFound } from 'next/navigation';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import BookImporter from './BookImporter';

export default async function ImportProductsPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) redirect(`/login?callbackUrl=/store/${slug}/products/import`);

    const store = await prisma.store.findUnique({
        where: { slug },
        select: { id: true, name: true, slug: true, ownerId: true },
    });

    if (!store) notFound();
    if (store.ownerId !== session.user.id) redirect(`/store/${slug}`);

    return (
        <main>
            <Header />
            <BookImporter storeId={store.id} storeName={store.name} storeSlug={store.slug} />
            <BottomNav />
        </main>
    );
}

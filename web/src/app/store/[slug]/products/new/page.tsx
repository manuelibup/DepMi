import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { notFound, redirect } from 'next/navigation';
import CreateProductForm from './CreateProductForm';

interface NewProductPageProps {
    params: Promise<{
        slug: string;
    }>;
}

export default async function NewProductPage({ params }: NewProductPageProps) {
    const { slug } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        redirect('/login');
    }

    // Fetch the store and verify ownership
    const store = await prisma.store.findUnique({
        where: { slug },
        select: { id: true, ownerId: true, slug: true }
    });

    if (!store) {
        notFound();
    }

    if (store.ownerId !== session.user.id) {
        redirect('/'); // Redirect non-owners away
    }

    return (
        <div style={{ maxWidth: '480px', margin: '0 auto', minHeight: '100vh', backgroundColor: 'var(--bg-color)', paddingBottom: '80px' }}>
            <CreateProductForm storeId={store.id} storeSlug={store.slug} />
        </div>
    );
}

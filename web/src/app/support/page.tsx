import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';

export default async function SupportRedirectPage() {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        // Redirect to login so they can get help after they log in
        redirect('/login?callbackUrl=/support');
    }

    // Attempt to find the admin user 'manuel'
    const admin = await prisma.user.findUnique({
        where: { username: 'manuel' }
    });

    if (!admin) {
        // Fallback if 'manuel' changes their username - usually better handled by an env ADMIN_ID, but this is fine
        redirect('/');
    }

    // Try finding an existing conversation between the user and Manuel
    let conversation = await prisma.conversation.findFirst({
        where: {
            AND: [
                { participants: { some: { id: session.user.id } } },
                { participants: { some: { id: admin.id } } }
            ]
        }
    });

    // If none exists, create a new conversation channel instantly
    if (!conversation) {
        conversation = await prisma.conversation.create({
            data: {
                participants: {
                    connect: [{ id: session.user.id }, { id: admin.id }]
                }
            }
        });
    }

    // The text to prepopulate the chat input with
    const placeholder = encodeURIComponent("Hi Manuel, my problem on the app is...");

    // Send them immediately into the chat screen with the placeholder ready
    redirect(`/messages/${conversation.id}?text=${placeholder}`);
}

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getPresignedUploadUrl } from '@/lib/r2';
import { randomBytes } from 'crypto';
import path from 'path';

const ALLOWED_TYPES: Record<string, string> = {
    'application/pdf': 'pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/msword': 'doc',
    'application/epub+zip': 'epub',
    'application/vnd.ms-powerpoint': 'ppt',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
    'application/zip': 'zip',
};

const MAX_SIZE_BYTES = 100 * 1024 * 1024; // 100MB

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const contentType = searchParams.get('contentType') || 'application/pdf';
    const fileSize = Number(searchParams.get('fileSize') || 0);
    const originalName = searchParams.get('fileName') || 'file';

    if (!ALLOWED_TYPES[contentType]) {
        return NextResponse.json({ error: 'File type not allowed' }, { status: 400 });
    }

    if (fileSize > MAX_SIZE_BYTES) {
        return NextResponse.json({ error: 'File exceeds 100MB limit' }, { status: 400 });
    }

    const ext = ALLOWED_TYPES[contentType] || path.extname(originalName).slice(1) || 'bin';
    const key = `digital/${session.user.id}/${randomBytes(12).toString('hex')}.${ext}`;

    try {
        const { uploadUrl, publicUrl } = await getPresignedUploadUrl(key, contentType);
        return NextResponse.json({ uploadUrl, publicUrl, key });
    } catch (err) {
        console.error('[r2-sign] error:', err);
        return NextResponse.json({ error: 'Failed to generate upload URL' }, { status: 500 });
    }
}

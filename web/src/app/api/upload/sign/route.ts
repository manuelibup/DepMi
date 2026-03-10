import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { v2 as cloudinary } from 'cloudinary';

// Rate limiting configuration
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_REQUESTS_PER_WINDOW = 20;

// In-memory store: userId -> { count, resetAt }
// Note: This works per-instance on Vercel. For global distribution, Redis is required,
// but this sufficiently prevents basic runaway script abuse from a single session.
const rateLimitCache = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(userId: string): boolean {
  const now = Date.now();
  const userRateLimit = rateLimitCache.get(userId);

  if (!userRateLimit) {
    rateLimitCache.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  if (now > userRateLimit.resetAt) {
    rateLimitCache.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  if (userRateLimit.count >= MAX_REQUESTS_PER_WINDOW) {
    return true;
  }

  userRateLimit.count += 1;
  return false;
}

// Note: Ensure CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET are in .env.local
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const resourceType = searchParams.get('resourceType') || 'image';

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    if (isRateLimited(session.user.id)) {
      return NextResponse.json({ message: 'Too many requests. Please try again later.' }, { status: 429 });
    }

    const timestamp = Math.round(new Date().getTime() / 1000);
    // Sub-folder per user
    const folder = `depmi_uploads/${session.user.id}`;
    // Signed preset enforces allowed_formats + max_file_size server-side at Cloudinary
    const upload_preset = 'depmi_strict';

    const signature = cloudinary.utils.api_sign_request(
      { timestamp, folder, upload_preset },
      process.env.CLOUDINARY_API_SECRET as string
    );

    return NextResponse.json({
      timestamp,
      folder,
      upload_preset,
      signature,
      apiKey: process.env.CLOUDINARY_API_KEY,
      cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME,
      resourceType,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error('Cloudinary Sign Error:', error);
    return NextResponse.json({ message: 'Internal server error signing upload request' }, { status: 500 });
  }
}

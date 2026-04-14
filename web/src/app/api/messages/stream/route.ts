import { NextRequest } from 'next/server';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const conversationId = searchParams.get('conversationId');
    
    if (!conversationId) {
        return new Response('Missing conversationId parameter', { status: 400 });
    }

    const encoder = new TextEncoder();
    
    // We start polling from the current time to only get *new* messages in the stream.
    // The initial load of historical messages is done client-side.
    let lastCheck = new Date().toISOString();

    const stream = new ReadableStream({
        async start(controller) {
            // Declare interval IDs first so they can reference each other in catch blocks
            let keepAliveId: ReturnType<typeof setInterval>;
            let pollId: ReturnType<typeof setInterval>;

            // Keep-alive heartbeat every 15 seconds to prevent connection drops
            keepAliveId = setInterval(() => {
                try {
                    controller.enqueue(encoder.encode(': keepalive\n\n'));
                } catch (e) {
                    clearInterval(keepAliveId);
                    clearInterval(pollId);
                }
            }, 15000);

            // Poll the internal Node.js API route every 3 seconds
            // This bypasses Edge Runtime Prisma limitations by proxying to our standard route
            pollId = setInterval(async () => {
                try {
                    const host = req.headers.get('host') || 'localhost:3000';
                    const protocol = host.includes('localhost') ? 'http' : 'https';
                    const cookie = req.headers.get('cookie') || '';
                    
                    const res = await fetch(`${protocol}://${host}/api/messages/${conversationId}?since=${lastCheck}`, {
                        headers: { cookie }
                    });

                    if (res.ok) {
                        const newMessages = await res.json();
                        if (Array.isArray(newMessages) && newMessages.length > 0) {
                            // Update lastCheck to the latest message's createdAt to avoid duplicates
                            const latestDate = new Date(Math.max(...newMessages.map((m: any) => new Date(m.createdAt).getTime())));
                            lastCheck = latestDate.toISOString();
                            
                            // Send data to client
                            controller.enqueue(encoder.encode(`data: ${JSON.stringify(newMessages)}\n\n`));
                        }
                    } else if (res.status === 401 || res.status === 403) {
                        // Unauthorized or Forbidden, terminate stream
                        controller.enqueue(encoder.encode(`event: error\ndata: ${JSON.stringify({ message: 'Unauthorized / Forbidden' })}\n\n`));
                        clearInterval(keepAliveId);
                        clearInterval(pollId);
                        controller.close();
                    }
                } catch (e) {
                    // Ignore transient fetch errors during polling
                    console.error('[SSE] Polling error:', e);
                }
            }, 30000); // Poll every 30s (was 15s) — halves Neon queries from active chat users

            // Clean up intervals when the client disconnects
            req.signal.addEventListener('abort', () => {
                clearInterval(keepAliveId);
                clearInterval(pollId);
            });
        }
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
        },
    });
}

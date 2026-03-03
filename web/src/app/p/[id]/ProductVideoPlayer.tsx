'use client';

import VideoPlayer from '@/components/VideoPlayer';

export default function ProductVideoPlayer({ src, poster }: { src: string; poster?: string }) {
    return <VideoPlayer src={src} poster={poster} />;
}

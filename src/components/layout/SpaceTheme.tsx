
'use client';

import { useEffect, useRef } from 'react';

export function SpaceTheme() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = 0.7;
    }
  }, []);

  return (
    <div className="fixed top-0 left-0 w-full h-full -z-10 overflow-hidden">
      <video
        ref={videoRef}
        autoPlay
        loop
        muted
        playsInline
        className="w-full h-full object-cover"
        src="/deep_space/background.mp4"
        data-ai-hint="space animation"
      />
      <div className="absolute top-0 left-0 w-full h-full bg-black/50"></div>
    </div>
  );
}

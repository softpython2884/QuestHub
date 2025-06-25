
'use client';

import { useState, useEffect } from 'react';

export function InteractiveBackground() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[-1] overflow-hidden bg-[#151618]">
      <iframe
        src="/themes/triangles and light/triangle.html"
        className="h-full w-full border-0"
        title="Interactive Background"
      />
    </div>
  );
}

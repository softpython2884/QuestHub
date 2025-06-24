
'use client';

export function InteractiveBackground() {
  return (
    <div className="fixed inset-0 z-[-1] overflow-hidden bg-[#151618]">
      <iframe
        src="/api/theme/triangles and light/triangle.html"
        className="h-full w-full border-0"
        title="Interactive Background"
      />
    </div>
  );
}

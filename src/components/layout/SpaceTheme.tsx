
'use client';

export function SpaceTheme() {
  return (
    <div className="fixed inset-0 -z-10 h-full w-full">
      <iframe
        src="/deep_space/index.html"
        className="absolute inset-0 h-full w-full border-none"
        title="Interactive Background"
        data-ai-hint="space animation"
      />
      <div className="absolute inset-0 h-full w-full bg-black/50" />
    </div>
  );
}

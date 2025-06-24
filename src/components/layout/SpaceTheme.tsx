
'use client';

export function SpaceTheme() {
  return (
    <div className="fixed inset-0 -z-10 h-full w-full overflow-hidden">
      <div className="space-bg" data-ai-hint="space background"></div>
      <div className="absolute inset-0 h-full w-full bg-black/50" />
    </div>
  );
}

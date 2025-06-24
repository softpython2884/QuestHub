
'use client';

import { Logo } from '@/components/Logo';
import { UserNav } from '@/components/layout/UserNav';
import { SidebarTrigger, useSidebar } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

export function AppHeader({ className }: { className?: string }) {
  const { isMobile } = useSidebar();

  return (
    <header className={cn("w-full sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-card/30 px-4 shadow-sm backdrop-blur-lg sm:px-6", className)}>
      <div className="flex items-center gap-2">
        {isMobile && <SidebarTrigger />}
        <Logo className="hidden sm:flex" />
      </div>
      <div className="flex items-center gap-4">
        <UserNav />
      </div>
    </header>
  );
}

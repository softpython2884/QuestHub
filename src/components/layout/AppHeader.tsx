
'use client';

import { Logo } from '@/components/Logo';
import { UserNav } from '@/components/layout/UserNav';
import { SidebarTrigger, useSidebar } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';

export function AppHeader() {
  const { isMobile } = useSidebar();
  const { theme, setTheme } = useTheme();

  return (
    <header className="w-full sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/95 px-4 shadow-sm backdrop-blur-md sm:px-6">
      <div className="flex items-center gap-2">
        {isMobile && <SidebarTrigger />}
        <Logo className="hidden sm:flex" />
      </div>
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
        >
          <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
        <UserNav />
      </div>
    </header>
  );
}

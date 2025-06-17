
'use client';

import { Logo } from '@/components/Logo';
import { UserNav } from '@/components/layout/UserNav';
import { SidebarTrigger, useSidebar } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes'; // Assuming next-themes is or will be installed for theme toggling

export function AppHeader() {
  const { isMobile } = useSidebar(); // Assuming useSidebar provides isMobile
  // const { theme, setTheme } = useTheme(); // Placeholder for theme toggle

  return (
    <header className="w-full sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/95 px-4 shadow-sm backdrop-blur-md sm:px-6">
      <div className="flex items-center gap-2">
        {isMobile && <SidebarTrigger />}
        <Logo className="hidden sm:flex" />
      </div>
      <div className="flex items-center gap-4">
        {/* Placeholder for Theme Toggle
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
        >
          {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          <span className="sr-only">Toggle theme</span>
        </Button>
        */}
        <UserNav />
      </div>
    </header>
  );
}

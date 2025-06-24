
'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { AppHeader } from '@/components/layout/AppHeader';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { Toaster } from '@/components/ui/toaster';
import { Chatbot } from '@/components/layout/Chatbot';
import { SpaceTheme } from '@/components/layout/SpaceTheme';

export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(registration => {
          console.log('SW registered: ', registration);
        }).catch(registrationError => {
          console.log('SW registration failed: ', registrationError);
        });
      });
    }
  }, []);

  if (isLoading) {
    return (
      <div className="flex min-h-screen animate-pulse">
        <div className="w-16 md:w-64 bg-muted/50"></div>
        <div className="flex-1 flex flex-col">
          <div className="h-16 bg-muted/50 border-b"></div>
          <div className="flex-1 p-6 bg-muted/30">
            <div className="h-full w-full bg-muted/50 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; 
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen bg-background theme-space">
        <SpaceTheme />
        <AppSidebar />
        <SidebarInset>
          <AppHeader />
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 animate-fade-in">
            {children}
          </main>
          <Chatbot />
          <Toaster />
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

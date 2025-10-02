
'use client';

import { type ReactNode, Suspense, useEffect } from 'react';
import { AppHeader } from '@/components/layout/AppHeader';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { Toaster } from '@/components/ui/toaster';
import { Chatbot } from '@/components/layout/Chatbot';
import { CommandPalette } from '@/components/layout/CommandPalette';
import { PageProvider } from '@/contexts/PageContext';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function AppLayout({ children }: { children: ReactNode }) {
  const { toast } = useToast();

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      // Small delay to not overwhelm the user on first load
      setTimeout(() => {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            toast({
              title: "Notifications Enabled",
              description: "You will now receive reminders and updates from FlowUp.",
            });
          }
        });
      }, 15000); // 15 seconds delay
    }
  }, [toast]);


  return (
    <SidebarProvider defaultOpen={true}>
      <PageProvider>
        <div className="flex min-h-screen bg-transparent">
          <AppSidebar />
          <SidebarInset className="pointer-events-none">
            <AppHeader className="pointer-events-auto" />
            <main className="flex-1 overflow-y-auto pointer-events-auto">
              <div className="p-4 sm:p-6 lg:p-8 animate-fade-in pointer-events-none">
                <div className="pointer-events-auto">
                   <Suspense fallback={
                    <div className="flex w-full justify-center items-center h-[calc(100vh-10rem)]">
                        <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    </div>
                  }>
                    {children}
                  </Suspense>
                </div>
              </div>
            </main>
            <div className="pointer-events-auto">
              <CommandPalette />
              <Chatbot />
            </div>
            <Toaster />
          </SidebarInset>
        </div>
      </PageProvider>
    </SidebarProvider>
  );
}

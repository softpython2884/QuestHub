
'use client';

import { type ReactNode } from 'react';
import { AppHeader } from '@/components/layout/AppHeader';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { Toaster } from '@/components/ui/toaster';
import { Chatbot } from '@/components/layout/Chatbot';

export default function AppLayout({ children }: { children: ReactNode }) {

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen bg-transparent">
        <AppSidebar />
        <SidebarInset className="pointer-events-none">
          <AppHeader className="pointer-events-auto" />
          {/* The main content area needs to allow scrolling, but the padded container inside should not block mouse events in its empty space. */}
          <main className="flex-1 overflow-y-auto pointer-events-auto">
            {/* This div handles padding but lets the mouse pass through to the background. */}
            <div className="p-4 sm:p-6 lg:p-8 animate-fade-in pointer-events-none">
              {/* This div re-enables mouse events for the actual content rendered by children. */}
              <div className="pointer-events-auto">
                {children}
              </div>
            </div>
          </main>
          <div className="pointer-events-auto">
            <Chatbot />
          </div>
          <Toaster />
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

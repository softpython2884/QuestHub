
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
          
          {/* The main content area inherits pointer-events-none, letting mouse events pass through. */}
          <main className="flex-1 overflow-y-auto">
            {/* The padding container also inherits pointer-events-none. */}
            <div className="p-4 sm:p-6 lg:p-8 animate-fade-in">
              {/* This div re-enables pointer events ONLY for the content itself and its children. */}
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

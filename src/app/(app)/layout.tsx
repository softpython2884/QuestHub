
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
        <SidebarInset>
          {/* Header is clickable */}
          <AppHeader className="pointer-events-auto" />
          
          {/* Main area lets mouse events pass through */}
          <main className="flex-1 overflow-y-auto pointer-events-none">
            {/* The content wrapper (with padding) re-enables mouse events for itself and children */}
            <div className="p-4 sm:p-6 lg:p-8 animate-fade-in pointer-events-auto">
              {children}
            </div>
          </main>
          
          {/* Chatbot is clickable */}
          <div className="pointer-events-auto">
            <Chatbot />
          </div>
          <Toaster />
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

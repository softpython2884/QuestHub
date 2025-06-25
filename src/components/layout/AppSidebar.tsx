'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Sidebar,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarHeader,
  SidebarFooter,
  SidebarContent,
  SidebarMenuSkeleton,
} from '@/components/ui/sidebar';
import { Logo } from '@/components/Logo';
import { LayoutDashboard, FolderKanban, Megaphone, Settings, Users, ShieldCheck, BookText, Compass, Lightbulb, MessageSquare, Sparkles } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '../ui/button';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/projects', label: 'Projects', icon: FolderKanban },
  { href: '/studio', label: 'AI Studio', icon: Sparkles },
  { href: '/discover', label: 'Discover', icon: Compass },
  { href: '/team', label: 'Team', icon: Users },
  { href: '/chat', label: 'Chat', icon: MessageSquare },
  { href: '/announcements', label: 'Announcements', icon: Megaphone },
  { href: '/documentation', label: 'Docs', icon: BookText, adminOnly: false },
  { href: '/suggestions', label: 'Suggestions', icon: Lightbulb, adminOnly: false },
  { href: '/secure-vault', label: 'Secure Vault', icon: ShieldCheck, adminOnly: false },
];

const adminNavItems: any[] = [
    // The "Team" link was here and has been removed as it's replaced by "Discover".
];

const bottomNavItems = [
    { href: '/settings', label: 'Settings', icon: Settings },
];

export function AppSidebar({ className }: { className?: string }) {
  const pathname = usePathname();
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
       <Sidebar collapsible="icon" className={className}>
        <SidebarHeader className="p-4 justify-center">
           <div className="h-8 w-32 bg-muted rounded animate-pulse" />
        </SidebarHeader>
        <SidebarContent className="p-2">
          <SidebarMenu>
            {[...Array(navItems.length)].map((_, i) => ( 
              <SidebarMenuSkeleton key={i} showIcon />
            ))}
          </SidebarMenu>
        </SidebarContent>
      </Sidebar>
    );
  }

  const renderNavItems = (items: typeof navItems) => {
    return items.map((item) => {
        if (item.adminOnly && user?.role !== 'admin') {
            return null;
        }
        const Icon = item.icon;
        return (
            <SidebarMenuItem key={item.href}>
            <SidebarMenuButton
                asChild
                isActive={pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))}
                tooltip={{ children: item.label, side: 'right', className: "font-body" }}
            >
                <Link href={item.href}>
                <Icon />
                <span>{item.label}</span>
                </Link>
            </SidebarMenuButton>
            </SidebarMenuItem>
        );
    });
  }

  return (
    <Sidebar collapsible="icon" className={className}>
      <SidebarHeader className="p-4 justify-center">
        <Logo iconSize={28} textSize="text-xl" />
      </SidebarHeader>
      <SidebarContent className="p-2 flex flex-col justify-between">
        <SidebarMenu>
          {renderNavItems(navItems)}
          {user?.role === 'admin' && adminNavItems.length > 0 && <hr className="my-2 border-sidebar-border" />}
          {renderNavItems(adminNavItems.filter(item => item.adminOnly))}
        </SidebarMenu>
      </SidebarContent>
       <SidebarFooter className="p-2 border-t">
         <SidebarMenu>
            {renderNavItems(bottomNavItems)}
         </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

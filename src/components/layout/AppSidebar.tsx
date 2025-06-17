
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
import { LayoutDashboard, FolderKanban, Megaphone, Settings, Users, ShieldCheck, BookText } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '../ui/button';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/projects', label: 'Projects', icon: FolderKanban },
  { href: '/announcements', label: 'Announcements', icon: Megaphone },
  { href: '/documentation', label: 'Docs', icon: BookText, adminOnly: false },
  { href: '/team', label: 'Team Management', icon: Users, adminOnly: true },
  { href: '/secure-vault', label: 'Secure Vault', icon: ShieldCheck, adminOnly: false },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
       <Sidebar collapsible="icon">
        <SidebarHeader className="p-4 justify-center">
           <div className="h-8 w-32 bg-muted rounded animate-pulse" />
        </SidebarHeader>
        <SidebarContent className="p-2">
          <SidebarMenu>
            {[...Array(5)].map((_, i) => (
              <SidebarMenuSkeleton key={i} showIcon />
            ))}
          </SidebarMenu>
        </SidebarContent>
      </Sidebar>
    );
  }


  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4 justify-center">
        <Logo iconSize={28} textSize="text-xl" />
      </SidebarHeader>
      <SidebarContent className="p-2">
        <SidebarMenu>
          {navItems.map((item) => {
            if (item.adminOnly && user?.role !== 'admin') {
              return null;
            }
            const Icon = item.icon;
            return (
              <SidebarMenuItem key={item.href}>
                <Link href={item.href} asChild>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))}
                    tooltip={{ children: item.label, side: 'right', className: "font-body" }}
                  >
                    <a>
                      <Icon />
                      <span>{item.label}</span>
                    </a>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>
       <SidebarFooter className="p-2 border-t">
         <Button variant="outline" size="sm" className="w-full justify-start group-data-[collapsible=icon]:justify-center">
          <Settings className="mr-2 group-data-[collapsible=icon]:mr-0" />
          <span className="group-data-[collapsible=icon]:hidden">Help & Support</span>
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}

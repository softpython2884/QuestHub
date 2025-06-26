
'use server';

import { getProjectsForUser } from '@/lib/db';
import { getCurrentUserUuid } from '@/lib/authEdge';
import { FolderKanban, Settings, User } from 'lucide-react';

export interface SearchResult {
  type: 'project' | 'page' | 'user';
  id: string;
  name: string;
  description?: string;
  href: string;
}

export async function searchGlobalAction(query: string): Promise<SearchResult[]> {
  const userUuid = await getCurrentUserUuid();
  if (!userUuid) return [];
  
  if (!query.trim()) return [];

  const lowerCaseQuery = query.toLowerCase();

  const allPages: SearchResult[] = [
    { type: 'page', id: 'dashboard', name: 'Dashboard', description: 'Go to your main dashboard', href: '/dashboard' },
    { type: 'page', id: 'projects', name: 'Projects', description: 'View all your projects', href: '/projects' },
    { type: 'page', id: 'studio', name: 'AI Studio', description: 'Access AI-powered tools', href: '/studio' },
    { type: 'page', id: 'discover', name: 'Discover', description: 'Explore public projects and users', href: '/discover' },
    { type: 'page', id: 'team', name: 'Team', description: 'See your collaborators and groups', href: '/team' },
    { type: 'page', id: 'chat', name: 'Chat', description: 'Open your conversations', href: '/chat' },
    { type: 'page', id: 'announcements', name: 'Announcements', description: 'View global and project announcements', href: '/announcements' },
    { type: 'page', id: 'documentation', name: 'Documentation', description: 'Browse community documents', href: '/documentation' },
    { type: 'page', id: 'suggestions', name: 'Suggestions', description: 'Vote on new features', href: '/suggestions' },
    { type: 'page', id: 'secure-vault', name: 'Secure Vault', description: 'Access your private credential store', href: '/secure-vault' },
    { type: 'page', id: 'profile', name: 'Profile', description: 'View and edit your profile', href: '/profile' },
    { type: 'page', id: 'settings', name: 'Settings', description: 'Manage your account settings', href: '/settings' },
  ];
  
  const projects = await getProjectsForUser(userUuid);

  const projectResults: SearchResult[] = projects
    .filter(p => p.name.toLowerCase().includes(lowerCaseQuery))
    .map(p => ({
        type: 'project',
        id: p.uuid,
        name: p.name,
        description: p.description,
        href: `/projects/${p.uuid}`,
    }));

  const pageResults: SearchResult[] = allPages
    .filter(p => p.name.toLowerCase().includes(lowerCaseQuery));

  // Combine and return. We can add user search here in the future.
  return [...projectResults, ...pageResults].slice(0, 10);
}

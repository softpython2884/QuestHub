
'use server';

import {
    getProjectsForUserWithMemberCount,
    getUsersFromUserProjects,
    getOrCreateDmConversation,
    getOrCreateProjectConversation,
} from '@/lib/db';
import { auth } from '@/lib/authEdge';
import type { Project, User } from '@/types';
import { redirect } from 'next/navigation';


interface TeamData {
    projects: Array<Project & { memberCount: number }>;
    users: User[];
}

export async function getTeamData(): Promise<TeamData> {
    const session = await auth();
    const userId = session?.user?.uuid;
    if (!userId) return { projects: [], users: [] };

    const allProjects = await getProjectsForUserWithMemberCount(userId);
    const groupProjects = allProjects.filter(p => p.memberCount >= 2);
    const allUsers = await getUsersFromUserProjects(userId);
    
    // filter out the current user from the list of team members
    const teamMembers = allUsers.filter(u => u.uuid !== userId);

    return { projects: groupProjects, users: teamMembers };
}

export async function searchTeam(query: string): Promise<TeamData> {
    const session = await auth();
    const userId = session?.user?.uuid;
    if (!userId) return { projects: [], users: [] };

    const allProjects = await getProjectsForUserWithMemberCount(userId);
    const groupProjects = allProjects.filter(p => p.memberCount >= 2);
    
    const allUsers = await getUsersFromUserProjects(userId);
    const teamMembers = allUsers.filter(u => u.uuid !== userId);

    const filteredProjects = groupProjects.filter(p => p.name.toLowerCase().includes(query.toLowerCase()));
    const filteredUsers = teamMembers.filter(u => u.name.toLowerCase().includes(query.toLowerCase()));

    return {
        projects: filteredProjects,
        users: filteredUsers,
    };
}

export async function startConversationAction(
  { projectUuid, otherUserUuid }: { projectUuid?: string, otherUserUuid?: string }
): Promise<{ error?: string; conversationId?: string }> {
    const session = await auth();
    const currentUserUuid = session?.user?.uuid;
    if (!currentUserUuid) {
        return { error: 'Authentication required' };
    }

    try {
        let conversationId: string;
        if (projectUuid) {
            conversationId = await getOrCreateProjectConversation(projectUuid);
        } else if (otherUserUuid) {
            conversationId = await getOrCreateDmConversation(currentUserUuid, otherUserUuid);
        } else {
            return { error: 'A project or user must be specified.' };
        }
        return { conversationId };
    } catch (e: any) {
        return { error: e.message || "Failed to start conversation." };
    }
}

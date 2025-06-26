
'use server';

import { 
    getProjectsForUserWithMemberCount,
    getUsersFromUserProjects,
    getOrCreateDmConversation,
    getOrCreateProjectConversation,
} from '@/lib/db';
import { getCurrentUserUuid } from '@/lib/authEdge';
import type { Project, User } from '@/types';

interface TeamData {
    groups: Array<Project & { memberCount: number }>;
    teamMembers: User[];
}

export async function getTeamData(): Promise<TeamData | { error: string }> {
    const userUuid = await getCurrentUserUuid();
    if (!userUuid) return { error: "Authentication required." };
    try {
        const allProjects = await getProjectsForUserWithMemberCount(userUuid);
        const allTeamMembers = await getUsersFromUserProjects(userUuid);

        const groups = allProjects.filter(p => p.memberCount > 1);
        const teamMembers = allTeamMembers.filter(member => member.uuid !== userUuid);
        
        return { groups, teamMembers };
    } catch (e: any) {
        return { error: e.message || "Failed to fetch team data." };
    }
}

export async function startConversationAction(
    payload: { projectUuid?: string, otherUserUuid?: string }
): Promise<{ conversationUuid?: string; error?: string }> {
    const userUuid = await getCurrentUserUuid();
    if (!userUuid) return { error: "Authentication required." };
    
    try {
        let conversationUuid: string;
        if (payload.projectUuid) {
            conversationUuid = await getOrCreateProjectConversation(payload.projectUuid);
        } else if (payload.otherUserUuid) {
            conversationUuid = await getOrCreateDmConversation(userUuid, payload.otherUserUuid);
        } else {
            return { error: "Either a project or another user must be specified." };
        }
        return { conversationUuid };
    } catch (e: any) {
        return { error: e.message || "Could not start conversation." };
    }
}

export async function searchTeam(query: string): Promise<TeamData | { error: string }> {
    const userUuid = await getCurrentUserUuid();
    if (!userUuid) return { error: "Authentication required." };

    try {
        const { groups, teamMembers } = await getTeamData();
        if ('error' in groups || 'error' in teamMembers) {
            return { error: "Failed to fetch initial team data for search."}
        }

        const lowerCaseQuery = query.toLowerCase();

        const filteredGroups = groups.filter(p => p.name.toLowerCase().includes(lowerCaseQuery));
        const filteredMembers = teamMembers.filter(u => u.name.toLowerCase().includes(lowerCaseQuery) || u.email.toLowerCase().includes(lowerCaseQuery));

        return { groups: filteredGroups, teamMembers: filteredMembers };
    } catch(e: any) {
        return { error: e.message || "Failed to search team data."};
    }
}

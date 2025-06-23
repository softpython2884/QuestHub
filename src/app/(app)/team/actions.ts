
'use server';

import {
    getProjectsForUserWithMemberCount,
    getUsersFromUserProjects,
} from '@/lib/db';
import { auth } from '@/lib/authEdge';
import type { Project, User } from '@/types';


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

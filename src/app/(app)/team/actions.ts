'use server';

import { getPublicProjectsWithStars, searchPublicUsers, toggleStar } from '@/lib/db';
import { auth } from '@/lib/authEdge';
import { revalidatePath } from 'next/cache';

export async function getPublicProjects() {
    const session = await auth();
    const userId = session?.user?.uuid;
    return getPublicProjectsWithStars(userId);
}

export async function searchPublic(query: string) {
    const session = await auth();
    const userId = session?.user?.uuid;

    const projects = await getPublicProjectsWithStars(userId);
    const users = await searchPublicUsers(query);

    const filteredProjects = projects.filter(p => p.name.toLowerCase().includes(query.toLowerCase()));

    return {
        projects: filteredProjects,
        users: users
    };
}


export async function toggleStarProject(projectUuid: string): Promise<{ success: boolean, error?: string, starred?: boolean }> {
    const session = await auth();
    if (!session?.user?.uuid) {
        return { success: false, error: "You must be logged in to star projects." };
    }

    try {
        const result = await toggleStar(projectUuid, session.user.uuid);
        revalidatePath('/discover');
        return { success: true, starred: result.starred };
    } catch (error: any) {
        return { success: false, error: error.message || "Failed to toggle star." };
    }
}

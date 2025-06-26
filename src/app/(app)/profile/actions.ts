
'use server';

import { getPublicProfile, togglePinProject as dbTogglePinProject, getTasksForUserProjects, getDocumentsForUser } from "@/lib/db";
import { auth } from "@/lib/authEdge";
import type { User, Project } from "@/types";
import { revalidatePath } from "next/cache";


export async function getPublicProfileAction(
    userUuid: string
): Promise<(User & { projects: Project[]; pinnedProjects: Project[]; contributionData: Record<string, number> }) | null> {
    try {
        const profile = await getPublicProfile(userUuid);
        if (!profile) return null;

        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

        const tasks = await getTasksForUserProjects(userUuid);
        const docs = await getDocumentsForUser(userUuid);
        
        const contributions: Record<string, number> = {};

        tasks.forEach(task => {
            if (task.status === 'Done' && new Date(task.updatedAt) > oneYearAgo) {
                const date = new Date(task.updatedAt).toISOString().split('T')[0];
                contributions[date] = (contributions[date] || 0) + 1;
            }
        });

        docs.forEach(doc => {
            if (new Date(doc.createdAt) > oneYearAgo) {
                 const date = new Date(doc.createdAt).toISOString().split('T')[0];
                 contributions[date] = (contributions[date] || 0) + 1;
            }
        });

        return { ...profile, contributionData: contributions };
    } catch (error) {
        console.error(`Failed to fetch public profile for ${userUuid}:`, error);
        return null;
    }
}

export async function togglePinProjectAction(projectUuid: string): Promise<{ success: boolean; error?: string; pinned?: boolean }> {
    const session = await auth();
    if (!session?.user?.uuid) {
        return { success: false, error: "Authentication required." };
    }

    try {
        const result = await dbTogglePinProject(session.user.uuid, projectUuid);
        revalidatePath(`/profile/${session.user.uuid}`);
        return { success: true, pinned: result.pinned };
    } catch (error: any) {
        return { success: false, error: error.message || "Failed to pin/unpin project." };
    }
}

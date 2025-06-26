'use server';

import { getPublicProfile, togglePinProject as dbTogglePinProject } from "@/lib/db";
import { auth } from "@/lib/authEdge";
import type { User, Project } from "@/types";
import { revalidatePath } from "next/cache";


export async function getPublicProfileAction(
    userUuid: string
): Promise<(User & { projects: Project[]; pinnedProjects: Project[] }) | null> {
    try {
        const profile = await getPublicProfile(userUuid);
        return profile;
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

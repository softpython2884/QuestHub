'use server';

import { getPublicProfile } from "@/lib/db";
import { auth } from "@/lib/authEdge";
import type { User, Project } from "@/types";


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


'use server';

import {
    getProjectsForUser,
    getTasksForUserProjects,
    getAnnouncementsForUserProjects,
    getTaskActivityForUserProjects,
} from '@/lib/db';
import { auth } from '@/lib/authEdge';
import type { Project, Task, ProjectAnnouncement } from '@/types';

export interface DashboardData {
    projects: Project[];
    tasks: Array<Task & { projectName: string }>;
    announcements: Array<ProjectAnnouncement & { projectName: string }>;
    activity: { date: string; count: number }[];
}

export async function getDashboardDataAction(): Promise<{ data?: DashboardData, error?: string }> {
    const session = await auth();
    if (!session?.user?.uuid) {
        return { error: 'Authentication required.' };
    }

    try {
        const [projects, tasks, announcements, activity] = await Promise.all([
            getProjectsForUser(session.user.uuid),
            getTasksForUserProjects(session.user.uuid),
            getAnnouncementsForUserProjects(session.user.uuid, 7),
            getTaskActivityForUserProjects(session.user.uuid, 7),
        ]);

        return {
            data: { projects, tasks, announcements, activity }
        };

    } catch (error: any) {
        console.error("Failed to fetch dashboard data:", error);
        return { error: 'Failed to load dashboard data.' };
    }
}

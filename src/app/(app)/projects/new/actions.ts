
'use server';

import type { Project } from '@/types';
import { createProject as dbCreateProject } from '@/lib/db';
import { auth } from '@/lib/authEdge';

export async function createProjectAction(
  name: string,
  description: string | undefined,
  ownerUuid: string
): Promise<Project | { error: string }> {
  if (!name.trim() || !ownerUuid) {
    return { error: 'Project name and owner are required.' };
  }
  try {
    const newProject = await dbCreateProject(name.trim(), description?.trim(), ownerUuid);
    return newProject;
  } catch (error: any) {
    console.error('Failed to create project (server action):', error);
    return { error: error.message || 'Failed to create project. Please try again.' };
  }
}

export async function createProjectFromAIPlan(
  name: string,
  description: string,
  readmeContent: string,
): Promise<Project | { error: string }> {
  const session = await auth();
  if (!session?.user?.uuid) {
    return { error: 'Authentication required.' };
  }
  try {
    const newProject = await dbCreateProject(name, description, session.user.uuid, readmeContent);
    return newProject;
  } catch (error: any) {
    console.error('Failed to create AI project (server action):', error);
    return { error: error.message || 'Failed to create project from AI plan.' };
  }
}

    

'use server';

import type { Project } from '@/types';
import { createProject as createProjectDb } from '@/lib/db';

export async function createProjectAction(
  name: string,
  description: string | undefined,
  ownerUuid: string
): Promise<Project | { error: string }> {
  if (!name.trim() || !ownerUuid) {
    return { error: 'Project name and owner are required.' };
  }
  try {
    const newProject = await createProjectDb(name.trim(), description?.trim(), ownerUuid);
    return newProject;
  } catch (error: any) {
    console.error('Failed to create project (server action):', error);
    return { error: error.message || 'Failed to create project. Please try again.' };
  }
}

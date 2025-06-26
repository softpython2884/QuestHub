
'use server';

import { generateProjectIdeas, type GenerateProjectIdeasOutput } from '@/ai/flows/generate-project-ideas';
import { generateProjectScaffold, type GenerateProjectScaffoldOutput } from '@/ai/flows/generate-project-scaffold';
import { generateDocumentContent, type GenerateDocumentContentOutput } from '@/ai/flows/generate-document-content';
import { generateProjectKickstart, type GenerateProjectKickstartOutput } from '@/ai/flows/generate-project-kickstart';
import { createProjectFromAIPlan } from '@/app/(app)/projects/new/actions';
import { z } from 'zod';
import { createGithubFileAction } from '@/app/(app)/projects/[id]/actions';
import { revalidatePath } from 'next/cache';
import type { Project } from '@/types';

const PromptSchema = z.object({
  prompt: z.string().min(10, 'Prompt must be at least 10 characters long.'),
});

export async function generateProjectIdeasAction(
  prompt: string
): Promise<{ data?: GenerateProjectIdeasOutput; error?: string }> {
  const validatedFields = PromptSchema.safeParse({ prompt });
  if (!validatedFields.success) {
    return { error: validatedFields.error.flatten().fieldErrors.prompt?.join(', ') };
  }
  try {
    const output = await generateProjectIdeas({ prompt: validatedFields.data.prompt });
    return { data: output };
  } catch (e: any) {
    return { error: e.message || 'Failed to generate project ideas.' };
  }
}

export async function generateProjectScaffoldAction(
  prompt: string
): Promise<{ data?: GenerateProjectScaffoldOutput; error?: string }> {
  const validatedFields = PromptSchema.safeParse({ prompt });
  if (!validatedFields.success) {
    return { error: validatedFields.error.flatten().fieldErrors.prompt?.join(', ') };
  }
  try {
    const output = await generateProjectScaffold({ prompt: validatedFields.data.prompt });
    return { data: output };
  } catch (e: any) {
    return { error: e.message || 'Failed to generate project scaffold.' };
  }
}

export async function generateDocumentContentAction(
  prompt: string
): Promise<{ data?: GenerateDocumentContentOutput; error?: string }> {
  const validatedFields = PromptSchema.safeParse({ prompt });
  if (!validatedFields.success) {
    return { error: validatedFields.error.flatten().fieldErrors.prompt?.join(', ') };
  }
  try {
    const output = await generateDocumentContent({ prompt: validatedFields.data.prompt });
    return { data: output };
  } catch (e: any) {
    return { error: e.message || 'Failed to generate document content.' };
  }
}

export async function addScaffoldToProjectAction(
  projectUuid: string,
  files: { filePath: string; content: string }[]
): Promise<{ successCount: number; errorCount: number; errors: string[] }> {
  let successCount = 0;
  let errorCount = 0;
  const errors: string[] = [];

  for (const file of files) {
    const result = await createGithubFileAction(
      projectUuid,
      file.filePath,
      file.content,
      `AI Scaffold: ${file.filePath}`
    );

    if (result.success) {
      successCount++;
    } else {
      errorCount++;
      errors.push(`Failed to create '${file.filePath}': ${result.error}`);
    }
  }

  if (successCount > 0) {
    revalidatePath(`/projects/${projectUuid}`);
  }

  return { successCount, errorCount, errors };
}

export async function createProjectFromAIAction(
  prompt: string
): Promise<{ data?: Project; error?: string }> {
  const validatedFields = PromptSchema.safeParse({ prompt });
  if (!validatedFields.success) {
    return { error: validatedFields.error.flatten().fieldErrors.prompt?.join(', ') };
  }
  try {
    // 1. Generate the project plan from the AI
    const plan = await generateProjectKickstart({ prompt: validatedFields.data.prompt });

    // 2. Create the project in the database using the plan
    const newProject = await createProjectFromAIPlan(plan.name, plan.description, plan.readmeContent);
    
    if ('error' in newProject) {
        return { error: newProject.error };
    }

    return { data: newProject };
  } catch (e: any) {
    return { error: e.message || 'Failed to create project using AI.' };
  }
}

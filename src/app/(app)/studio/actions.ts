
'use server';

import { generateProjectIdeas, type GenerateProjectIdeasOutput } from '@/ai/flows/generate-project-ideas';
import { generateProjectScaffold, type GenerateProjectScaffoldOutput } from '@/ai/flows/generate-project-scaffold';
import { generateDocumentContent, type GenerateDocumentContentOutput } from '@/ai/flows/generate-document-content';
import { z } from 'zod';

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

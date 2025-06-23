
'use server';

import {
    createSuggestion as dbCreateSuggestion,
    getSuggestions as dbGetSuggestions,
    voteOnSuggestion as dbVoteOnSuggestion,
} from '@/lib/db';
import { getCurrentUserUuid } from '@/lib/authEdge';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import type { Suggestion, SuggestionVote } from '@/types';

export async function getSuggestionsAction(): Promise<Array<Suggestion & { userVote: SuggestionVote['voteType'] | null }> | { error: string }> {
    const userUuid = await getCurrentUserUuid();
    if (!userUuid) {
        return { error: 'Authentication required.' };
    }
    try {
        const suggestions = await dbGetSuggestions(userUuid);
        return suggestions;
    } catch (error: any) {
        return { error: error.message || 'Failed to load suggestions.' };
    }
}

const CreateSuggestionSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters.").max(150),
  description: z.string().min(10, "Description must be at least 10 characters.").max(2000),
});

export async function createSuggestionAction(
  prevState: { success: boolean; error: string | null; fieldErrors?: any },
  formData: FormData
) {
  const userUuid = await getCurrentUserUuid();
  if (!userUuid) {
    return { success: false, error: 'You must be logged in to create a suggestion.' };
  }

  const validatedFields = CreateSuggestionSchema.safeParse({
    title: formData.get('title'),
    description: formData.get('description'),
  });

  if (!validatedFields.success) {
    return {
      success: false,
      error: 'Invalid input.',
      fieldErrors: validatedFields.error.flatten().fieldErrors,
    };
  }

  try {
    await dbCreateSuggestion({
      authorUuid: userUuid,
      title: validatedFields.data.title,
      description: validatedFields.data.description,
    });
    revalidatePath('/suggestions');
    return { success: true, error: null };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to create suggestion.' };
  }
}

export async function voteOnSuggestionAction(suggestionUuid: string, voteType: SuggestionVote['voteType']): Promise<{ success: boolean; error?: string }> {
    const userUuid = await getCurrentUserUuid();
    if (!userUuid) {
        return { success: false, error: 'You must be logged in to vote.' };
    }

    try {
        await dbVoteOnSuggestion(suggestionUuid, userUuid, voteType);
        revalidatePath('/suggestions'); // Revalidate to update vote counts for all users
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message || 'Failed to cast vote.' };
    }
}

'use server';

import { 
    createOAuthApp,
    getOAuthAppsForUser,
    deleteOAuthApp,
} from '@/lib/db';
import { getCurrentUserUuid } from '@/lib/authEdge';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import type { CreateOAuthAppFormState } from '@/types';


export async function getOAuthAppsAction() {
    const userUuid = await getCurrentUserUuid();
    if (!userUuid) {
        throw new Error('Authentication required.');
    }
    return getOAuthAppsForUser(userUuid);
}

const CreateOAuthAppSchema = z.object({
  name: z.string().min(3, "App name must be at least 3 characters.").max(50),
  description: z.string().max(200, "Description cannot exceed 200 characters.").optional(),
  redirectUris: z.string().min(1, "At least one Redirect URI is required."),
  website: z.string().url("Please enter a valid website URL.").optional().or(z.literal('')),
});

export async function createOAuthAppAction(
  prevState: CreateOAuthAppFormState,
  formData: FormData
): Promise<CreateOAuthAppFormState> {
  const userUuid = await getCurrentUserUuid();
  if (!userUuid) {
    return { error: 'Authentication required.' };
  }
  
  const validatedFields = CreateOAuthAppSchema.safeParse({
    name: formData.get('name'),
    description: formData.get('description'),
    redirectUris: formData.get('redirectUris'),
    website: formData.get('website'),
  });

  if (!validatedFields.success) {
    return {
      error: "Invalid input.",
      fieldErrors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { name, description, redirectUris, website } = validatedFields.data;
  
  // Validate Redirect URIs
  const uris = redirectUris.split('\n').map(uri => uri.trim()).filter(Boolean);
  if (uris.length === 0) {
      return { error: 'Invalid input.', fieldErrors: { redirectUris: ["At least one Redirect URI is required."] }};
  }
  for (const uri of uris) {
      try {
          new URL(uri);
      } catch (_) {
           return { error: 'Invalid input.', fieldErrors: { redirectUris: [`Invalid URL format: ${uri}`] }};
      }
  }

  try {
    const newApp = await createOAuthApp({
        name,
        description: description || null,
        ownerUuid: userUuid,
        redirectUris: uris,
        website: website || null,
    });
    
    revalidatePath('/settings/developer');
    
    return { 
        message: 'Application created successfully!',
        createdApp: {
            name: newApp.name,
            clientId: newApp.clientId,
            clientSecret: newApp.clientSecret!,
        }
    };
  } catch (error: any) {
    return { error: error.message || 'Failed to create application.' };
  }
}

export async function deleteOAuthAppAction(appUuid: string) {
    const userUuid = await getCurrentUserUuid();
    if (!userUuid) {
        return { error: 'Authentication required.' };
    }
    
    try {
        const success = await deleteOAuthApp(appUuid, userUuid);
        if (success) {
            revalidatePath('/settings/developer');
            return { success: true };
        }
        return { error: 'Failed to delete application, or you are not the owner.' };
    } catch (error: any) {
        return { error: error.message || 'An error occurred while deleting the application.' };
    }
}

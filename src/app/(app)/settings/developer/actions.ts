
'use server';

import { 
    createOAuthApp,
    getOAuthAppsForUser,
    deleteOAuthApp,
    createFlowApp as dbCreateFlowApp,
    getFlowAppsForUser as dbGetFlowAppsForUser,
    deleteFlowApp as dbDeleteFlowApp,
    updateOAuthApp,
    updateFlowApp as dbUpdateFlowApp, // Added
} from '@/lib/db';
import { getCurrentUserUuid } from '@/lib/authEdge';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import type { CreateOAuthAppFormState, CreateFlowAppFormState, UpdateOAuthAppFormState, FlowAppScope, UpdateFlowAppFormState, FlowApp } from '@/types';


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


const UpdateOAuthAppSchema = CreateOAuthAppSchema.extend({
  uuid: z.string().uuid("Invalid App ID."),
});

export async function updateOAuthAppAction(
  prevState: UpdateOAuthAppFormState,
  formData: FormData
): Promise<UpdateOAuthAppFormState> {
  const userUuid = await getCurrentUserUuid();
  if (!userUuid) {
    return { error: 'Authentication required.' };
  }
  
  const validatedFields = UpdateOAuthAppSchema.safeParse({
    uuid: formData.get('uuid'),
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

  const { uuid, name, description, redirectUris, website } = validatedFields.data;
  
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
    const updatedApp = await updateOAuthApp({
        uuid,
        ownerUuid: userUuid,
        name,
        description: description || null,
        redirectUris: uris,
        website: website || null,
    });
    
    if (!updatedApp) {
        return { error: "Failed to update application. It may have been deleted or you don't have permission." };
    }
    
    revalidatePath('/settings/developer');
    
    return { 
        message: 'Application updated successfully!',
        updatedApp,
    };
  } catch (error: any) {
    return { error: error.message || 'Failed to update application.' };
  }
}


// --- FlowApp Actions ---

export async function getFlowAppsAction() {
    const userUuid = await getCurrentUserUuid();
    if (!userUuid) {
        throw new Error('Authentication required.');
    }
    return dbGetFlowAppsForUser(userUuid);
}

const CreateFlowAppSchema = z.object({
  name: z.string().min(3, "App name must be at least 3 characters.").max(50),
  description: z.string().max(200, "Description cannot exceed 200 characters.").optional(),
  scopes: z.array(z.string()).refine(value => value.length > 0, {
    message: "You have to select at least one scope.",
  }),
});

export async function createFlowAppAction(
  prevState: CreateFlowAppFormState,
  formData: FormData
): Promise<CreateFlowAppFormState> {
  const userUuid = await getCurrentUserUuid();
  if (!userUuid) {
    return { error: 'Authentication required.' };
  }
  
  const validatedFields = CreateFlowAppSchema.safeParse({
    name: formData.get('name'),
    description: formData.get('description'),
    scopes: formData.getAll('scopes'),
  });

  if (!validatedFields.success) {
    return {
      error: "Invalid input.",
      fieldErrors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { name, description, scopes } = validatedFields.data;

  try {
    const newApp = await dbCreateFlowApp({
        name,
        description: description || null,
        ownerUuid: userUuid,
        scopes: scopes as FlowAppScope[],
    });
    
    revalidatePath('/settings/developer');
    
    return { 
        message: 'FlowApp created successfully!',
        createdApp: {
            name: newApp.name,
            token: newApp.token!,
        }
    };
  } catch (error: any) {
    return { error: error.message || 'Failed to create application.' };
  }
}

export async function deleteFlowAppAction(appUuid: string) {
    const userUuid = await getCurrentUserUuid();
    if (!userUuid) {
        return { error: 'Authentication required.' };
    }
    
    try {
        const success = await dbDeleteFlowApp(appUuid, userUuid);
        if (success) {
            revalidatePath('/settings/developer');
            return { success: true };
        }
        return { error: 'Failed to delete application, or you are not the owner.' };
    } catch (error: any) {
        return { error: error.message || 'An error occurred while deleting the application.' };
    }
}


const UpdateFlowAppSchema = CreateFlowAppSchema.extend({
  uuid: z.string().uuid("Invalid App ID."),
});

export async function updateFlowAppAction(
  prevState: UpdateFlowAppFormState,
  formData: FormData
): Promise<UpdateFlowAppFormState> {
  const userUuid = await getCurrentUserUuid();
  if (!userUuid) {
    return { error: 'Authentication required.' };
  }
  
  const validatedFields = UpdateFlowAppSchema.safeParse({
    uuid: formData.get('uuid'),
    name: formData.get('name'),
    description: formData.get('description'),
    scopes: formData.getAll('scopes'),
  });

  if (!validatedFields.success) {
    return {
      error: "Invalid input.",
      fieldErrors: validatedFields.error.flatten().fieldErrors,
    };
  }
  
  const { uuid, name, description, scopes } = validatedFields.data;

  try {
    const updatedApp = await dbUpdateFlowApp({
      uuid,
      ownerUuid: userUuid,
      name,
      description: description || null,
      scopes: scopes as FlowAppScope[],
    });
    
    if (!updatedApp) {
      return { error: "Failed to update FlowApp. It may have been deleted or you don't have permission." };
    }
    
    revalidatePath('/settings/developer');
    
    return { 
        message: 'FlowApp updated successfully!',
        updatedApp,
    };
  } catch (error: any) {
    return { error: error.message || 'Failed to update FlowApp.' };
  }
}

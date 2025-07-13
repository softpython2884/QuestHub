
'use server';

import { 
    createFlowApp as dbCreateFlowApp,
    getFlowAppsForUser as dbGetFlowAppsForUser,
    deleteFlowApp as dbDeleteFlowApp,
    updateFlowApp as dbUpdateFlowApp,
    getFlowAppByUuid,
} from '@/lib/db';
import { getCurrentUserUuid } from '@/lib/authEdge';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import type { CreateFlowAppFormState, FlowAppScope, UpdateFlowAppFormState, FlowApp } from '@/types';


// --- FlowApp Actions ---

export async function getFlowAppsAction() {
    const userUuid = await getCurrentUserUuid();
    if (!userUuid) {
        throw new Error('Authentication required.');
    }
    return dbGetFlowAppsForUser(userUuid);
}

export async function getFlowAppAction(uuid: string): Promise<FlowApp | { error: string }> {
    const userUuid = await getCurrentUserUuid();
    
    // For the public authorization page, we don't need to check ownership, just that the app exists.
    // The authorization logic itself will handle the currently logged-in user.
    if (!userUuid) {
        const app = await getFlowAppByUuid(uuid);
        if (!app) return { error: 'Application not found.' };
        return app;
    }

    const app = await getFlowAppByUuid(uuid);
     if (!app) {
        return { error: 'App not found.' };
    }

    // If the user is the owner, they can see it. Otherwise, it's fine for the auth page.
    if (app.ownerUuid === userUuid) {
        return app;
    }
    
    // If not the owner, still return the app details for the consent screen.
    // The consent screen logic will handle the "who is authorizing" part.
    return app;
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

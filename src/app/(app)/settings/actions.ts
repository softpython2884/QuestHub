
'use server';

import { getAppSetting, setAppSetting, createInvitation } from '@/lib/db';
import { auth } from '@/lib/authEdge';
import { revalidatePath } from 'next/cache';
import type { UserRole } from '@/types';

export async function getRegistrationModeAction(): Promise<'public' | 'private'> {
    const mode = await getAppSetting('registration_mode');
    return (mode === 'private') ? 'private' : 'public';
}

export async function updateRegistrationModeAction(mode: 'public' | 'private'): Promise<{ success: boolean; error?: string }> {
    const session = await auth();
    if (session?.user?.role !== 'admin') {
        return { success: false, error: 'Permission denied.' };
    }
    try {
        await setAppSetting('registration_mode', mode);
        revalidatePath('/settings');
        revalidatePath('/signup');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message || 'Failed to update setting.' };
    }
}

export async function generateInviteLinkAction(email: string, role: UserRole): Promise<{ link?: string; error?: string }> {
    const session = await auth();
    if (session?.user?.role !== 'admin') {
        return { error: 'Permission denied.' };
    }

    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
        return { error: 'Invalid email address provided.' };
    }
    
    try {
        const { link } = await createInvitation(email, role, session.user.uuid);
        return { link };
    } catch (e: any) {
        return { error: e.message || "Failed to create invitation." };
    }
}


export async function getStorageBackendSettingAction(): Promise<'github' | 'local'> {
    const mode = await getAppSetting('storage_backend_default');
    return (mode === 'local') ? 'local' : 'github';
}

export async function updateStorageBackendSettingAction(mode: 'github' | 'local'): Promise<{ success: boolean; error?: string }> {
    const session = await auth();
    if (session?.user?.role !== 'admin') {
        return { success: false, error: 'Permission denied.' };
    }
    try {
        await setAppSetting('storage_backend_default', mode);
        revalidatePath('/settings');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message || 'Failed to update setting.' };
    }
}

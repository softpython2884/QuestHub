
'use server';

import { getAppSetting, setAppSetting, createInvitation, getDbConnection } from '@/lib/db';
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

export async function runDatabaseMigrationsAction(prevState: any, formData: FormData): Promise<{ success: boolean; message: string; error?: string }> {
    const session = await auth();
    if (session?.user?.role !== 'admin') {
        return { success: false, message: '', error: 'Permission denied.' };
    }

    try {
        const db = await getDbConnection();
        let messages = [];

        // --- Migration: Add columns to users table ---
        const userCols = await db.all(`PRAGMA table_info(users);`);
        if (!userCols.some(col => col.name === 'bio')) {
            await db.run('ALTER TABLE users ADD COLUMN bio TEXT;');
            messages.push('Added bio column to users table.');
        }
        if (!userCols.some(col => col.name === 'websiteUrl')) {
            await db.run('ALTER TABLE users ADD COLUMN websiteUrl TEXT;');
            messages.push('Added websiteUrl column to users table.');
        }
        if (!userCols.some(col => col.name === 'showDiscordOnProfile')) {
            await db.run('ALTER TABLE users ADD COLUMN showDiscordOnProfile BOOLEAN DEFAULT FALSE;');
            messages.push('Added showDiscordOnProfile column to users table.');
        }
        if (!userCols.some(col => col.name === 'showGithubOnProfile')) {
            await db.run('ALTER TABLE users ADD COLUMN showGithubOnProfile BOOLEAN DEFAULT FALSE;');
            messages.push('Added showGithubOnProfile column to users table.');
        }
        
        // --- Migration: Add columns to projects table ---
        const projectCols = await db.all(`PRAGMA table_info(projects);`);
        if (!projectCols.some(col => col.name === 'vanityId')) {
            await db.run('ALTER TABLE projects ADD COLUMN vanityId TEXT UNIQUE;');
            messages.push('Added vanityId column to projects table.');
        }
        if (!projectCols.some(col => col.name === 'storageBackend')) {
            await db.run("ALTER TABLE projects ADD COLUMN storageBackend TEXT NOT NULL DEFAULT 'github';");
            messages.push('Added storageBackend column to projects table.');
        }
        if (!projectCols.some(col => col.name === 'githubWebhookId')) {
            await db.run('ALTER TABLE projects ADD COLUMN githubWebhookId INTEGER;');
            await db.run('ALTER TABLE projects ADD COLUMN githubWebhookSecret TEXT;');
            messages.push('Added githubWebhookId and githubWebhookSecret columns to projects table.');
        }
        
        // --- Migration: Add columns to messages table ---
        const messageCols = await db.all(`PRAGMA table_info(messages);`);
        if (!messageCols.some(col => col.name === 'updatedAt')) {
            await db.run('ALTER TABLE messages ADD COLUMN updatedAt TEXT;');
            messages.push('Added updatedAt column to messages table.');
        }
        if (!messageCols.some(col => col.name === 'isEdited')) {
            await db.run('ALTER TABLE messages ADD COLUMN isEdited BOOLEAN NOT NULL DEFAULT FALSE;');
            messages.push('Added isEdited column to messages table.');
        }
        if (!messageCols.some(col => col.name === 'isDeleted')) {
            await db.run('ALTER TABLE messages ADD COLUMN isDeleted BOOLEAN NOT NULL DEFAULT FALSE;');
            messages.push('Added isDeleted column to messages table.');
        }

        if (messages.length === 0) {
            return { success: true, message: 'Database schema is already up to date.' };
        }

        return { success: true, message: `Migrations applied successfully: ${messages.join(' ')}` };
    } catch (e: any) {
        console.error("Database migration failed:", e);
        return { success: false, message: '', error: e.message || 'An unknown error occurred during migration.' };
    }
}

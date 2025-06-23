'use server';
import { getAppSetting, getInvitationByToken } from '@/lib/db';

export interface SignupPageData {
    mode: 'public' | 'private';
    error?: string;
    email?: string;
    token?: string;
}

export async function getSignupPageData(token: string | null): Promise<SignupPageData> {
    const registrationMode = await getAppSetting('registration_mode') as 'public' | 'private' || 'public';

    if (registrationMode === 'public') {
        return { mode: 'public' };
    }

    // Private mode logic
    if (!token) {
        return { mode: 'private', error: 'Registration is by invitation only. Please use the link provided in your invitation.' };
    }

    const invitation = await getInvitationByToken(token);

    if (!invitation || invitation.usedAt || new Date(invitation.expiresAt) < new Date()) {
        return { mode: 'private', error: 'This invitation is invalid, has expired, or has already been used.' };
    }

    return { mode: 'private', email: invitation.email, token: invitation.token };
}

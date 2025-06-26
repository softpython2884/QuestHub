
'use server';

import type { User, UserRole } from '@/types';
import * as bcrypt from 'bcryptjs';
import { createUser as dbCreateUser, getUserByEmail as dbGetUserByEmail, updateUserProfile as dbUpdateUserProfile, getUserByUuid as dbGetUserByUuid, getAppSetting, getInvitationByToken, markInvitationAsUsed } from './db';
import { cookies } from 'next/headers';
import { auth } from '@/lib/authEdge';
import jwt from 'jsonwebtoken';

const AUTH_COOKIE_NAME = 'flowup_auth_token';

const getJwtSecretOrThrow = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured on the server.');
  }
  return secret;
};

export const createSessionForUser = async (user: Omit<User, 'hashedPassword'>) => {
  const jwtSecret = getJwtSecretOrThrow();
  const token = jwt.sign({ uuid: user.uuid }, jwtSecret, {
    expiresIn: '7d', // 7-day session
  });

  try {
    cookies().set(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', 
      path: '/',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days in seconds
    });
    console.log(`[authService.createSessionForUser] Session cookie set for user UUID: ${user.uuid}.`);
  } catch (error) {
    console.error(`[authService.createSessionForUser] Failed to set cookie for user ${user.uuid}:`, error);
    throw new Error("Could not set session cookie.");
  }
};

export const login = async (email: string, password?: string): Promise<User | null> => {
  console.log('[authService.login] Attempting login for email:', email);
  if (!password) {
    console.error('[authService.login] Password is required.');
    throw new Error('Password is required for login.');
  }
  
  await new Promise(resolve => setTimeout(resolve, 500)); 
  
  const userFromDb = await dbGetUserByEmail(email);

  if (userFromDb && userFromDb.hashedPassword) {
    const isValidPassword = await bcrypt.compare(password, userFromDb.hashedPassword);
    if (isValidPassword) {
      const { hashedPassword, ...userToReturn } = userFromDb;
      await createSessionForUser(userToReturn);
      console.log('[authService.login] Login SUCCESSFUL for email:', email);
      return userToReturn;
    }
  }
  console.log('[authService.login] Login FAILED for email:', email);
  throw new Error('Invalid email or password.');
};

export const signup = async (
  name: string,
  email: string,
  password?: string,
  role: UserRole = 'member',
  invitationToken?: string
): Promise<User | null> => {
  console.log('[authService.signup] Attempting signup for email:', email);
  if (!password) {
    console.error('[authService.signup] Password is required.');
    throw new Error('Password is required for signup.');
  }
  
  const registrationMode = await getAppSetting('registration_mode');

  if (registrationMode === 'private') {
    if (!invitationToken) {
      throw new Error('Registration is by invitation only.');
    }
    const invitation = await getInvitationByToken(invitationToken);
    if (!invitation || invitation.usedAt || new Date(invitation.expiresAt) < new Date()) {
      throw new Error('This invitation is invalid or has expired.');
    }
    if (invitation.email.toLowerCase() !== email.toLowerCase()) {
      throw new Error('This invitation is for a different email address.');
    }
    // If invitation is valid, the role from the invite should be used.
    role = invitation.role;
  }
  
  await new Promise(resolve => setTimeout(resolve, 500));

  try {
    const userFromDb = await dbGetUserByEmail(email);
    if (userFromDb) {
      console.warn('[authService.signup] User with this email already exists:', email);
      throw new Error('User with this email already exists.');
    }

    const newUser = await dbCreateUser(name, email, password, role);
    if (newUser) {
        if (registrationMode === 'private' && invitationToken) {
          await markInvitationAsUsed(invitationToken);
        }
        const { hashedPassword, ...userToReturn } = newUser;
        await createSessionForUser(userToReturn);
        console.log('[authService.signup] Signup SUCCESSFUL for email:', email, 'UUID:', userToReturn.uuid);
        return userToReturn;
    }
    console.error('[authService.signup] dbCreateUser returned null.');
    return null;
  } catch (error: any) {
    if (error.message.includes('UNIQUE constraint failed: users.email')) {
        console.warn('[authService.signup] UNIQUE constraint failed for email:', email);
        throw new Error('User with this email already exists.');
    }
    console.error('[authService.signup] Error during signup:', error);
    throw error;
  }
};

export const logout = async (): Promise<void> => {
  console.log('[authService.logout] Logging out user.');
  try {
    cookies().delete('flowup_auth_token');
    console.log('[authService.logout] Auth cookie deleted.');
  } catch (error) {
    console.error("[authService.logout] Error deleting cookie:", error);
  }
};

export const updateUserProfile = async (data: {
    uuid: string;
    name: string;
    email: string;
    avatar?: string;
    bio: string | null;
    websiteUrl: string | null;
    showGithubOnProfile: boolean;
    showDiscordOnProfile: boolean;
}): Promise<User | null> => {
  try {
    const updatedUserFromDb = await dbUpdateUserProfile(data);
    if (updatedUserFromDb) {
        const { hashedPassword, ...userToReturn } = updatedUserFromDb;
        
        const session = await auth(); 
        if (session?.user?.uuid === userToReturn.uuid) {
            console.log('[authService.updateUserProfile] User data changed, re-issuing token for UUID:', userToReturn.uuid);
            await createSessionForUser(userToReturn);
        }
        return userToReturn;
    }
    return null;
  } catch (error: any) {
    console.error("[authService.updateUserProfile] Error updating profile in authService:", error);
    throw error; 
  }
};

export const getCurrentUserSession = async (): Promise<User | null> => {
  console.log('[authService.getCurrentUserSession] Attempting to get current user session from cookie.');
  try {
    const session = await auth(); 
    if (session?.user?.uuid) {
      console.log('[authService.getCurrentUserSession] Session found via auth() for user UUID:', session.user.uuid);
      return session.user;
    }
  } catch (error) {
    console.error("[authService.getCurrentUserSession] Error getting session:", error);
  }
  console.log('[authService.getCurrentUserSession] No active session found.');
  return null;
};

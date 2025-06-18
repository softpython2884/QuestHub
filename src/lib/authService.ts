
'use server';

import type { User, UserRole } from '@/types';
import * as bcrypt from 'bcryptjs';
import { createUser as dbCreateUser, getUserByEmail as dbGetUserByEmail, updateUserProfile as dbUpdateUserProfile, getUserByUuid as dbGetUserByUuid } from './db';

// This global variable is part of a MOCK authentication system for development.
// It is NOT secure or suitable for production.
// It's intended to be set by login/signup/refresh and read by authEdge.ts.

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
      if (typeof global !== 'undefined') {
        (global as any).MOCK_CURRENT_USER_UUID = userToReturn.uuid;
        console.log('[authService.login] Login SUCCESSFUL. Set global.MOCK_CURRENT_USER_UUID to:', userToReturn.uuid);
      } else {
        console.warn('[authService.login] global object not available. Cannot set MOCK_CURRENT_USER_UUID.');
      }
      return userToReturn;
    }
  }
  console.log('[authService.login] Login FAILED for email:', email);
   if (typeof global !== 'undefined') {
        (global as any).MOCK_CURRENT_USER_UUID = null; // Ensure global is cleared on failed login
        console.log('[authService.login] Login FAILED. Cleared global.MOCK_CURRENT_USER_UUID.');
    }
  return null;
};

export const signup = async (name: string, email: string, password?: string, role: UserRole = 'member'): Promise<User | null> => {
  console.log('[authService.signup] Attempting signup for email:', email);
  if (!password) {
     console.error('[authService.signup] Password is required.');
    throw new Error('Password is required for signup.');
  }
  await new Promise(resolve => setTimeout(resolve, 500));

  try {
    const userFromDb = await dbGetUserByEmail(email);
    if (userFromDb) {
      console.warn('[authService.signup] User with this email already exists:', email);
      throw new Error('User with this email already exists.');
    }

    const newUser = await dbCreateUser(name, email, password, role);
    if (typeof global !== 'undefined' && newUser) {
      (global as any).MOCK_CURRENT_USER_UUID = newUser.uuid;
      console.log('[authService.signup] Signup SUCCESSFUL. Set global.MOCK_CURRENT_USER_UUID to:', newUser.uuid);
    } else if (!newUser) {
      console.error('[authService.signup] dbCreateUser returned null.');
       if (typeof global !== 'undefined') {
        (global as any).MOCK_CURRENT_USER_UUID = null; // Ensure global is cleared on failed signup
        console.log('[authService.signup] Signup FAILED (dbCreateUser null). Cleared global.MOCK_CURRENT_USER_UUID.');
      }
    } else {
       console.warn('[authService.signup] global object not available. Cannot set MOCK_CURRENT_USER_UUID.');
    }
    return newUser;
  } catch (error: any) {
    if (error.message.includes('UNIQUE constraint failed: users.email')) {
        console.warn('[authService.signup] UNIQUE constraint failed for email:', email);
        throw new Error('User with this email already exists.');
    }
    console.error('[authService.signup] Error during signup:', error);
    if (typeof global !== 'undefined') {
        (global as any).MOCK_CURRENT_USER_UUID = null; // Ensure global is cleared on error
        console.log('[authService.signup] Signup ERRORED. Cleared global.MOCK_CURRENT_USER_UUID.');
    }
    throw error;
  }
};

export const logout = async (): Promise<void> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  if (typeof global !== 'undefined') {
    (global as any).MOCK_CURRENT_USER_UUID = null;
    console.log('[authService.logout] Cleared global.MOCK_CURRENT_USER_UUID.');
  } else {
     console.warn('[authService.logout] global object not available. Cannot clear MOCK_CURRENT_USER_UUID.');
  }
};

export const updateUserProfile = async (uuid: string, name: string, email: string, avatar?: string): Promise<User | null> => {
  try {
    const updatedUserFromDb = await dbUpdateUserProfile(uuid, name, email, avatar);
    if (updatedUserFromDb) {
      // Optionally, re-set the global mock UUID if the current user is updating their own profile
      // This might be useful if the UUID itself could change, though it's unlikely.
      // For now, we assume the UUID remains constant for a user.
      return updatedUserFromDb;
    }
    return null;
  } catch (error: any) {
    console.error("[authService.updateUserProfile] Error updating profile in authService:", error);
    throw error; 
  }
};

export const refreshCurrentUserStateFromDb = async (uuid: string): Promise<User | null> => {
  console.log('[authService.refreshCurrentUserStateFromDb] Attempting to refresh user from DB for UUID:', uuid);
  const userFromDb = await dbGetUserByUuid(uuid);
  if (userFromDb) {
    const { hashedPassword, ...userToReturn } = userFromDb as User & { hashedPassword?: string };
    if (typeof global !== 'undefined') {
        (global as any).MOCK_CURRENT_USER_UUID = userToReturn.uuid;
        console.log('[authService.refreshCurrentUserStateFromDb] User found in DB. Refreshed and SET global.MOCK_CURRENT_USER_UUID to:', userToReturn.uuid);
    } else {
        console.warn('[authService.refreshCurrentUserStateFromDb] global object not available. Cannot set MOCK_CURRENT_USER_UUID.');
    }
    return userToReturn;
  }
  
  // If user not found in DB, ensure the global mock UUID is cleared
  if (typeof global !== 'undefined') {
    (global as any).MOCK_CURRENT_USER_UUID = null;
     console.log('[authService.refreshCurrentUserStateFromDb] User NOT found in DB for UUID:', uuid, '. CLEARED global.MOCK_CURRENT_USER_UUID.');
  } else {
     console.warn('[authService.refreshCurrentUserStateFromDb] User NOT found and global object not available.');
  }
  return null;
};

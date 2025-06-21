
'use server';

import type { User, UserRole } from '@/types';
import * as bcrypt from 'bcryptjs';
import { createUser as dbCreateUser, getUserByEmail as dbGetUserByEmail, updateUserProfile as dbUpdateUserProfile, getUserByUuid as dbGetUserByUuid } from './db';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { auth } from '@/lib/authEdge';


const AUTH_COOKIE_NAME = 'flowup_auth_token'; 

const getJwtSecretOrThrow = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error("CRITICAL: JWT_SECRET is not defined. Authentication will fail.");
    throw new Error('JWT_SECRET is not configured on the server.');
  }
  return secret;
};

export const createSessionForUser = async (user: Omit<User, 'hashedPassword'>) => {
  const JWT_SECRET = getJwtSecretOrThrow();
  const tokenPayload = {
    uuid: user.uuid,
  };
  const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '7d' });

  try {
    cookies().set(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', 
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      sameSite: 'lax',
    });
    console.log(`[authService.createSessionForUser] Session created for user UUID: ${user.uuid}.`);
  } catch (error) {
     console.error("[authService.createSessionForUser] Error setting cookie:", error);
     throw new Error("Could not create user session.");
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
    if (newUser) {
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
    cookies().delete(AUTH_COOKIE_NAME);
    console.log('[authService.logout] Auth cookie deleted.');
  } catch (error) {
    console.error("[authService.logout] Error deleting cookie:", error);
  }
};

export const updateUserProfile = async (uuid: string, name: string, email: string, avatar?: string): Promise<User | null> => {
  try {
    const updatedUserFromDb = await dbUpdateUserProfile(uuid, name, email, avatar);
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
  const session = await auth(); 
  
  if (session?.user?.uuid) {
    console.log('[authService.getCurrentUserSession] Session found via auth() for user UUID:', session.user.uuid);
    return session.user;
  }
  console.log('[authService.getCurrentUserSession] No active session found via auth().');
  return null;
};

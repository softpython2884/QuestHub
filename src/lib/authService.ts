
'use server';

import type { User, UserRole } from '@/types';
import * as bcrypt from 'bcryptjs';
import { createUser as dbCreateUser, getUserByEmail as dbGetUserByEmail, updateUserProfile as dbUpdateUserProfile, getUserByUuid as dbGetUserByUuid } from './db';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { ZodError } from 'zod';

const JWT_SECRET = process.env.JWT_SECRET;
const AUTH_COOKIE_NAME = 'nqh_auth_token';

if (!JWT_SECRET) {
  console.error("FATAL ERROR: JWT_SECRET is not defined in .env. Authentication will not work.");
  // throw new Error("JWT_SECRET is not defined. Please set it in your .env file.");
}

const generateTokenAndSetCookie = (user: Omit<User, 'hashedPassword'>) => {
  if (!JWT_SECRET) {
    console.error('[authService.generateTokenAndSetCookie] JWT_SECRET is not defined. Cannot generate token.');
    throw new Error('Server configuration error for JWT.');
  }
  const tokenPayload = {
    uuid: user.uuid,
    role: user.role,
    email: user.email,
    name: user.name
  };
  const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '7d' });

  cookies().set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // Use Secure in production
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    sameSite: 'lax', // Or 'strict' if appropriate
  });
  console.log(`[authService.generateTokenAndSetCookie] Token generated and cookie set for user UUID: ${user.uuid}`);
};

export const login = async (email: string, password?: string): Promise<User | null> => {
  console.log('[authService.login] Attempting login for email:', email);
  if (!password) {
    console.error('[authService.login] Password is required.');
    throw new Error('Password is required for login.');
  }
  if (!JWT_SECRET) {
    throw new Error('Authentication service is not configured (JWT_SECRET missing).');
  }

  await new Promise(resolve => setTimeout(resolve, 500)); 
  
  const userFromDb = await dbGetUserByEmail(email);

  if (userFromDb && userFromDb.hashedPassword) {
    const isValidPassword = await bcrypt.compare(password, userFromDb.hashedPassword);
    if (isValidPassword) {
      const { hashedPassword, ...userToReturn } = userFromDb;
      generateTokenAndSetCookie(userToReturn);
      return userToReturn;
    }
  }
  console.log('[authService.login] Login FAILED for email:', email);
  return null;
};

export const signup = async (name: string, email: string, password?: string, role: UserRole = 'member'): Promise<User | null> => {
  console.log('[authService.signup] Attempting signup for email:', email);
  if (!password) {
     console.error('[authService.signup] Password is required.');
    throw new Error('Password is required for signup.');
  }
   if (!JWT_SECRET) {
    throw new Error('Authentication service is not configured (JWT_SECRET missing).');
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
        generateTokenAndSetCookie(userToReturn);
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
  cookies().delete(AUTH_COOKIE_NAME);
  console.log('[authService.logout] Auth cookie deleted.');
};

export const updateUserProfile = async (uuid: string, name: string, email: string, avatar?: string): Promise<User | null> => {
  try {
    const updatedUserFromDb = await dbUpdateUserProfile(uuid, name, email, avatar);
    // Note: If email/role changes, the JWT should ideally be re-issued.
    // For simplicity, we are not re-issuing the token here on profile update.
    // A full solution might require re-login or a token refresh mechanism if sensitive JWT payload data changes.
    return updatedUserFromDb;
  } catch (error: any) {
    console.error("[authService.updateUserProfile] Error updating profile in authService:", error);
    throw error; 
  }
};

// This function will be called by AuthContext to get current user state
// It relies on authEdge.ts (which reads the cookie) to provide the session
export const getCurrentUserSession = async (): Promise<User | null> => {
  console.log('[authService.getCurrentUserSession] Attempting to get current user session from cookie.');
  const { auth } = await import('@/lib/authEdge'); // Dynamically import to avoid circular dependency issues at build time
  const session = await auth();
  if (session?.user?.uuid) {
    console.log('[authService.getCurrentUserSession] Session found for user UUID:', session.user.uuid);
    // Fetch fresh user data from DB to ensure it's up-to-date
    const userFromDb = await dbGetUserByUuid(session.user.uuid);
    if (userFromDb) {
      const { hashedPassword, ...userToReturn } = userFromDb;
      return userToReturn;
    }
    console.warn('[authService.getCurrentUserSession] User from JWT not found in DB, UUID:', session.user.uuid);
    return null;
  }
  console.log('[authService.getCurrentUserSession] No active session found.');
  return null;
};

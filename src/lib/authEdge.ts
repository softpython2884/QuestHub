
'use server';

import type { User } from '@/types';
import { getUserByUuid as dbGetUserByUuid } from './db';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

const AUTH_COOKIE_NAME = 'nqh_auth_token';

interface Session {
  user?: Omit<User, 'hashedPassword'>; 
}

interface DecodedToken {
  uuid: string;
  iat: number;
  exp: number;
}

const getJwtSecretOrThrow = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error("CRITICAL: JWT_SECRET is not defined. This will cause authentication failures.");
    throw new Error('JWT_SECRET is not configured on the server.');
  }
  return secret;
};

export async function auth(): Promise<Session | null> {
  console.log('[authEdge.auth] Attempting to get session.');
  const cookieStore = cookies();
  const jwtSecret = getJwtSecretOrThrow(); // Will throw if secret is missing

  const tokenCookieValue = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!tokenCookieValue) {
    console.log('[authEdge.auth] No auth token cookie found.');
    return null;
  }
  console.log('[authEdge.auth] Auth token cookie found.');

  try {
    const decoded = jwt.verify(tokenCookieValue, jwtSecret) as DecodedToken;
    console.log('[authEdge.auth] Token decoded successfully for UUID:', decoded.uuid);
    
    const userFromDb = await dbGetUserByUuid(decoded.uuid);
    
    if (!userFromDb) {
      console.warn(`[authEdge.auth] User ${decoded.uuid} from JWT not found in DB. Invalidating session.`);
      cookieStore.delete(AUTH_COOKIE_NAME);
      return null;
    }

    // Return only non-sensitive parts necessary for session identification.
    // The full user object can be fetched by services that need it, using this UUID.
    const { hashedPassword, ...userToReturn } = userFromDb; 
    
    console.log('[authEdge.auth] User found in DB, returning session for:', userToReturn.name);
    return {
      user: userToReturn, // Contains uuid, name, email, role, avatar
    };

  } catch (error: any) {
    console.warn('[authEdge.auth] JWT verification failed:', error.message ? error.message : error);
    // If verification fails (e.g. invalid signature, expired), delete the bad cookie
    cookieStore.delete(AUTH_COOKIE_NAME);
    return null;
  }
}

export async function getCurrentUserUuid(): Promise<string | null> {
  const session = await auth();
  return session?.user?.uuid || null;
}

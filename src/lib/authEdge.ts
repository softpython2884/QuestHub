
'use server';

import type { User } from '@/types';
import { getUserByUuid as dbGetUserByUuid } from './db';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

const AUTH_COOKIE_NAME = 'flowup_auth_token'; 

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

// Wrapper to ensure cookies() is accessed in a way Next.js might prefer for dynamic functions
async function getCookieValue(name: string): Promise<string | undefined> {
  // This await might help Next.js correctly sequence operations for dynamic functions.
  await Promise.resolve(); 
  const cookieStore = cookies();
  return cookieStore.get(name)?.value;
}

export async function auth(): Promise<Session | null> {
  const jwtSecret = getJwtSecretOrThrow(); 
  const tokenCookieValue = await getCookieValue(AUTH_COOKIE_NAME);

  if (!tokenCookieValue) {
    return null;
  }

  try {
    const decoded = jwt.verify(tokenCookieValue, jwtSecret) as DecodedToken;
    const userFromDb = await dbGetUserByUuid(decoded.uuid);
    
    if (!userFromDb) {
      console.warn(`[authEdge.auth] User ${decoded.uuid} from JWT not found in DB. Invalidating session.`);
      const cookieStore = cookies();
      cookieStore.delete(AUTH_COOKIE_NAME);
      return null;
    }
    
    const { hashedPassword, ...userToReturn } = userFromDb; 
    return {
      user: userToReturn,
    };

  } catch (error: any) {
    console.warn('[authEdge.auth] JWT verification failed:', error.message ? error.message : error);
    const cookieStore = cookies();
    cookieStore.delete(AUTH_COOKIE_NAME);
    return null;
  }
}

export async function getCurrentUserUuid(): Promise<string | null> {
  const session = await auth();
  return session?.user?.uuid || null;
}

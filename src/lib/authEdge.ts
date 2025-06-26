
import type { User } from '@/types';
import { getUserByUuid as dbGetUserByUuid } from './db';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

const AUTH_COOKIE_NAME = 'flowup_auth_token'; 

export interface Session {
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
  try {
    const cookieStore = cookies();
    const tokenCookie = cookieStore.get(AUTH_COOKIE_NAME);

    if (!tokenCookie || !tokenCookie.value) {
      return null;
    }

    const jwtSecret = getJwtSecretOrThrow();
    const decoded = jwt.verify(tokenCookie.value, jwtSecret) as DecodedToken;
    const userFromDb = await dbGetUserByUuid(decoded.uuid);
    
    if (!userFromDb) {
      console.warn(`[authEdge.auth] User ${decoded.uuid} from JWT not found in DB. Invalidating session.`);
      // The cookie is invalid, attempt to delete it
      try {
        cookieStore.delete(AUTH_COOKIE_NAME);
      } catch (e) {
        // Can happen in contexts where cookies can't be modified (e.g., during static generation).
        console.error('[authEdge.auth] Failed to delete invalid auth cookie:', e);
      }
      return null;
    }
    
    const { hashedPassword, ...userToReturn } = userFromDb; 
    return {
      user: userToReturn,
    };

  } catch (error: any) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      console.warn('[authEdge.auth] JWT verification failed:', error.message);
      // The cookie is invalid, attempt to delete it
      try {
        cookies().delete(AUTH_COOKIE_NAME);
      } catch (e) {
        // Can happen in contexts where cookies can't be modified.
        console.error('[authEdge.auth] Failed to delete invalid auth cookie during error handling:', e);
      }
    } else {
        console.error('[authEdge.auth] An unexpected error occurred during authentication:', error);
    }
    return null;
  }
}

export async function getCurrentUserUuid(): Promise<string | null> {
  const session = await auth();
  return session?.user?.uuid || null;
}

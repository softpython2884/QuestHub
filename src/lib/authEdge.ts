
import type { User } from '@/types';
import { getUserByUuid as dbGetUserByUuid } from './db';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
const AUTH_COOKIE_NAME = 'nqh_auth_token';

interface Session {
  user?: Omit<User, 'hashedPassword'>; // User object without hashedPassword
}

interface DecodedToken {
  uuid: string;
  // Other fields from JWT payload like role, email, name are still present
  // but we prioritize fresh data from DB.
  iat: number;
  exp: number;
}

export async function auth(): Promise<Session | null> {
  console.log('[authEdge.auth] Attempting to get session.');
  if (!JWT_SECRET) {
    console.error("[authEdge.auth] JWT_SECRET is not defined. Authentication check will fail.");
    return null;
  }

  const cookieStore = cookies();
  const tokenCookie = cookieStore.get(AUTH_COOKIE_NAME);

  if (!tokenCookie?.value) {
    console.log('[authEdge.auth] No auth token cookie found.');
    return null;
  }
  console.log('[authEdge.auth] Auth token cookie found.');

  try {
    const decoded = jwt.verify(tokenCookie.value, JWT_SECRET) as DecodedToken;
    console.log('[authEdge.auth] Token decoded successfully for UUID:', decoded.uuid);
    
    // Fetch fresh user data from DB using the UUID from the token
    const userFromDb = await dbGetUserByUuid(decoded.uuid);
    
    if (!userFromDb) {
      console.warn(`[authEdge.auth] User ${decoded.uuid} from JWT not found in DB. Invalidating session.`);
      cookies().delete(AUTH_COOKIE_NAME); // Clear invalid cookie
      return null;
    }

    // Exclude hashedPassword before returning
    const { hashedPassword, ...userToReturn } = userFromDb;
    
    console.log('[authEdge.auth] User found in DB, returning session for:', userToReturn.name);
    return {
      user: userToReturn,
    };

  } catch (error: any) {
    console.warn('[authEdge.auth] JWT verification failed:', error.message ? error.message : error);
    // Clear invalid or expired cookie
    cookies().delete(AUTH_COOKIE_NAME);
    return null;
  }
}

// Helper to get the current user's UUID from the session
export async function getCurrentUserUuid(): Promise<string | null> {
  const session = await auth();
  return session?.user?.uuid || null;
}

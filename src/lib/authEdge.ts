
import type { User } from '@/types';
import { getUserByUuid } from './db';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
const AUTH_COOKIE_NAME = 'nqh_auth_token';

interface Session {
  user?: {
    uuid: string;
    name: string;
    email: string;
    role: User['role'];
  };
}

interface DecodedToken {
  uuid: string;
  role: User['role'];
  email: string;
  name: string;
  iat: number;
  exp: number;
}

export async function auth(): Promise<Session | null> {
  if (!JWT_SECRET) {
    console.error("[authEdge.auth] JWT_SECRET is not defined. Authentication check will fail.");
    return null;
  }

  const cookieStore = cookies();
  const tokenCookie = cookieStore.get(AUTH_COOKIE_NAME);

  if (!tokenCookie?.value) {
    // console.log('[authEdge.auth] No auth token cookie found.');
    return null;
  }

  try {
    const decoded = jwt.verify(tokenCookie.value, JWT_SECRET) as DecodedToken;
    // console.log('[authEdge.auth] Token decoded successfully for UUID:', decoded.uuid);
    
    // Optionally, re-fetch user from DB to ensure data is fresh and user still exists/is active.
    // For higher security or if roles can change frequently, this is recommended.
    // For this example, we'll trust the JWT payload for basic info after verification.
    // However, for permission checks based on role, it's good to have the fresh role from DB if it can change.
    // For now, let's directly use JWT payload and only fetch from DB if more details are needed
    // or if we want to ensure the user wasn't deleted/disabled since token issuance.
    // const userFromDb = await getUserByUuid(decoded.uuid);
    // if (!userFromDb) {
    //   console.warn(`[authEdge.auth] User ${decoded.uuid} from JWT not found in DB.`);
    //   cookies().delete(AUTH_COOKIE_NAME); // Clear invalid cookie
    //   return null;
    // }
    // const { hashedPassword, ...userToReturn } = userFromDb;


    // Returning data directly from JWT payload for simplicity in this step
    // In a real app, consider fetching from DB for up-to-date info, especially roles.
    return {
      user: {
        uuid: decoded.uuid,
        name: decoded.name,
        email: decoded.email,
        role: decoded.role,
      },
    };

  } catch (error) {
    console.warn('[authEdge.auth] JWT verification failed:', error instanceof Error ? error.message : error);
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

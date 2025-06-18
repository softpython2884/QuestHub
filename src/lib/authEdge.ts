
// IMPORTANT: This file is intended for usage in Edge Functions or Server Components
// where direct session management (e.g., from cookies) might occur.
// For this mock setup, it will simulate getting a user.
// In a real app, this would involve actual session validation.

import type { User } from '@/types';
import { getUserByUuid } from './db';

// (global as any).MOCK_CURRENT_USER_UUID is now expected to be set by authService.ts
// and read here. We no longer initialize it in this file.

interface Session {
  user?: {
    uuid?: string;
    name?: string;
    email?: string;
    // Add other relevant user fields from your User type
  };
  // other session data like expires, accessToken etc.
}

export async function auth(): Promise<Session | null> {
  // Explicitly check if global is defined before trying to access its properties.
  const mockUserUuidFromGlobal = typeof global !== 'undefined' ? (global as any).MOCK_CURRENT_USER_UUID : undefined;
  
  console.log('[authEdge.auth] Attempting to get session. Value of global.MOCK_CURRENT_USER_UUID is:', mockUserUuidFromGlobal);

  if (mockUserUuidFromGlobal) {
    try {
      // console.log(`[authEdge.auth] Fetching user from DB for UUID: ${mockUserUuidFromGlobal}`);
      const user = await getUserByUuid(mockUserUuidFromGlobal);
      if (user) {
        // console.log(`[authEdge.auth] User found in DB: ${user.name} (UUID: ${user.uuid}). Creating mock session.`);
        return {
          user: {
            uuid: user.uuid,
            name: user.name,
            email: user.email,
          },
        };
      } else {
        console.warn(`[authEdge.auth] No user found in DB for UUID: ${mockUserUuidFromGlobal}. MOCK_CURRENT_USER_UUID might be stale or incorrect.`);
      }
    } catch (e) {
      console.error("[authEdge.auth] Error during mock auth (getUserByUuid failed):", e);
      return null;
    }
  } else {
    console.log('[authEdge.auth] No MOCK_CURRENT_USER_UUID value found in global. User is not "logged in" for this server action.');
  }
  
  // console.log('[authEdge.auth] Returning null session.');
  return null; 
}

// Helper to get the current user's UUID from the session
export async function getCurrentUserUuid(): Promise<string | null> {
  const session = await auth();
  return session?.user?.uuid || null;
}

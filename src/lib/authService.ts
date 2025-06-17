import type { User, UserRole } from '@/types';
import * from 'bcryptjs';
import { createUser as dbCreateUser, getUserByEmail as dbGetUserByEmail } from './db';

// This variable will hold the current user state in memory for the client-side session.
// It's a simplified approach. In a real app, this would be managed by secure HTTP-only cookies and server-side sessions.
let clientSideUser: User | null = null;

export const login = async (email: string, password?: string): Promise<User | null> => {
  if (!password) {
    throw new Error('Password is required for login.');
  }

  await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
  
  const userFromDb = await dbGetUserByEmail(email);

  if (userFromDb && userFromDb.hashedPassword) {
    const isValidPassword = await bcrypt.compare(password, userFromDb.hashedPassword);
    if (isValidPassword) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { hashedPassword, ...userToReturn } = userFromDb;
      clientSideUser = userToReturn; // Store user in client-side "session"
      return userToReturn;
    }
  }
  clientSideUser = null;
  return null;
};

export const signup = async (name: string, email: string, password?: string, role: UserRole = 'member'): Promise<User | null> => {
  if (!password) {
    throw new Error('Password is required for signup.');
  }
  await new Promise(resolve => setTimeout(resolve, 500));

  try {
    const userFromDb = await dbGetUserByEmail(email);
    if (userFromDb) {
      throw new Error('User with this email already exists.');
    }

    const newUser = await dbCreateUser(name, email, password, role);
    clientSideUser = newUser; // Store user in client-side "session"
    return newUser;
  } catch (error: any) {
    clientSideUser = null;
    if (error.message.includes('UNIQUE constraint failed: users.email')) {
        throw new Error('User with this email already exists.');
    }
    throw error;
  }
};

export const logout = async (): Promise<void> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  clientSideUser = null; // Clear client-side "session"
};

// This function now primarily serves to retrieve the user stored after login/signup
// for the current client-side session. It doesn't fetch from a persistent store on its own.
export const getCurrentUser = (): User | null => {
  return clientSideUser;
};

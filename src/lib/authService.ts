
'use server';

import type { User, UserRole } from '@/types';
import * as bcrypt from 'bcryptjs';
import { createUser as dbCreateUser, getUserByEmail as dbGetUserByEmail, updateUserProfile as dbUpdateUserProfile, getUserByUuid as dbGetUserByUuid } from './db';

export const login = async (email: string, password?: string): Promise<User | null> => {
  if (!password) {
    throw new Error('Password is required for login.');
  }

  await new Promise(resolve => setTimeout(resolve, 500)); 
  
  const userFromDb = await dbGetUserByEmail(email);

  if (userFromDb && userFromDb.hashedPassword) {
    const isValidPassword = await bcrypt.compare(password, userFromDb.hashedPassword);
    if (isValidPassword) {
      const { hashedPassword, ...userToReturn } = userFromDb;
      return userToReturn;
    }
  }
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
    return newUser;
  } catch (error: any) {
    if (error.message.includes('UNIQUE constraint failed: users.email')) {
        throw new Error('User with this email already exists.');
    }
    throw error;
  }
};

export const logout = async (): Promise<void> => {
  await new Promise(resolve => setTimeout(resolve, 300));
};

export const updateUserProfile = async (uuid: string, name: string, email: string, avatar?: string): Promise<User | null> => {
  try {
    const updatedUserFromDb = await dbUpdateUserProfile(uuid, name, email, avatar);
    if (updatedUserFromDb) {
      return updatedUserFromDb;
    }
    return null;
  } catch (error: any) {
    console.error("Error updating profile in authService:", error);
    throw error; 
  }
};

export const refreshCurrentUserStateFromDb = async (uuid: string): Promise<User | null> => {
  const userFromDb = await dbGetUserByUuid(uuid);
  if (userFromDb) {
    const { hashedPassword, ...userToReturn } = userFromDb as User & { hashedPassword?: string };
    return userToReturn;
  }
  return null;
};

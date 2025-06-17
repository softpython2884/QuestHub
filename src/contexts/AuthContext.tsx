
'use client';

import type { ReactNode } from 'react';
import React, { createContext, useState, useEffect, useCallback } from 'react';
import type { User, UserRole } from '@/types';
import * as authService from '@/lib/authService';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password?: string) => Promise<void>;
  signup: (name: string, email: string, password?: string, role?: UserRole) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  refreshUser: () => void; 
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    // In a real app with sessions, you might verify a session token here.
    // For now, we start with no user and set loading to false.
    setIsLoading(false);
  }, []);

  const login = async (email: string, password?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const loggedInUser = await authService.login(email, password);
      if (loggedInUser) {
        setUser(loggedInUser);
        router.push('/dashboard');
      } else {
        setError('Invalid email or password.');
      }
    } catch (e: any) {
      setError(e.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (name: string, email: string, password?: string, role: UserRole = 'member') => {
    setIsLoading(true);
    setError(null);
    try {
      const newUser = await authService.signup(name, email, password, role);
      if (newUser) {
        setUser(newUser);
        router.push('/dashboard');
      } else {
         setError('Signup failed. Please try again.');
      }
    } catch (e: any) {
      setError(e.message || 'Signup failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await authService.logout();
      setUser(null);
      router.push('/login');
    } catch (e: any) {
      setError(e.message || 'Logout failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const clearError = () => {
    setError(null);
  };
  
  const refreshUser = useCallback(async () => {
    if (user?.uuid) {
      setIsLoading(true);
      try {
        const updatedUser = await authService.refreshCurrentUserStateFromDb(user.uuid);
        if (updatedUser) {
          setUser(updatedUser);
        } else {
          // User might have been deleted or session invalidated, log them out
          setUser(null); 
          router.push('/login');
        }
      } catch (e) {
        console.error("Failed to refresh user:", e);
        // Optionally handle error, e.g. logout user
        setUser(null);
        router.push('/login');
      } finally {
        setIsLoading(false);
      }
    }
  }, [user?.uuid, router]);


  return (
    <AuthContext.Provider value={{ user, isLoading, error, login, signup, logout, clearError, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

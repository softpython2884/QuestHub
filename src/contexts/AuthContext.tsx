
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
  refreshUser: () => void; // Added for profile updates
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // On initial load, there's no persistent client session to check other than what authService might hold.
  // The primary role of this effect is to set isLoading to false.
  useEffect(() => {
    const initialUser = authService.getCurrentUser(); // Check if authService has a user from a previous action in this session
    if (initialUser) {
      setUser(initialUser);
    }
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
  
  const refreshUser = useCallback(() => {
    const updatedUser = authService.getCurrentUser(); // Get potentially updated user from authService's memory
    if (updatedUser) {
      setUser(updatedUser);
    }
  }, []);


  return (
    <AuthContext.Provider value={{ user, isLoading, error, login, signup, logout, clearError, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

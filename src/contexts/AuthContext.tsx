
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
  refreshUser: () => Promise<void>; 
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter(); 

  const fetchAndSetCurrentUser = useCallback(async () => {
    console.log('[AuthContext] fetchAndSetCurrentUser called.');
    setIsLoading(true);
    try {
      const currentUser = await authService.getCurrentUserSession();
      if (currentUser) {
        setUser(currentUser);
        console.log('[AuthContext] Session RE-ESTABLISHED for:', currentUser.name, '(UUID:', currentUser.uuid, ') from cookie.');
      } else {
        setUser(null);
        console.log('[AuthContext] No active session found from cookie.');
      }
    } catch (e) {
      console.error('[AuthContext] Error during session refresh attempt:', e);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAndSetCurrentUser();
  }, [fetchAndSetCurrentUser]);


  const login = async (email: string, password?: string) => {
    setIsLoading(true);
    setError(null);
    console.log('[AuthContext] login called for email:', email);
    try {
      const loggedInUser = await authService.login(email, password); 
      if (loggedInUser) {
        setUser(loggedInUser);
        console.log('[AuthContext] Login successful. User set in context. Cookie should be set by server action.');
        router.push('/dashboard');
      } else {
        setError('Invalid email or password.');
        console.log('[AuthContext] Login failed (user not returned from authService).');
      }
    } catch (e: any) {
      setError(e.message || 'Login failed. Please try again.');
      console.error('[AuthContext] Login error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (name: string, email: string, password?: string, role: UserRole = 'member') => {
    setIsLoading(true);
    setError(null);
    console.log('[AuthContext] signup called for email:', email);
    try {
      const newUser = await authService.signup(name, email, password, role); 
      if (newUser) {
        setUser(newUser);
        console.log('[AuthContext] Signup successful. User set in context. Cookie should be set by server action.');
        router.push('/dashboard');
      } else {
         setError('Signup failed. Please try again.');
        console.log('[AuthContext] Signup failed (user not returned from authService).');
      }
    } catch (e: any) {
      setError(e.message || 'Signup failed. Please try again.');
      console.error('[AuthContext] Signup error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    setError(null);
    console.log('[AuthContext] logout called.');
    try {
      await authService.logout(); 
      setUser(null);
      console.log('[AuthContext] Logout successful. User context cleared. Cookie should be cleared by server action.');
      router.push('/login');
    } catch (e: any) {
      setError(e.message || 'Logout failed. Please try again.');
      console.error('[AuthContext] Logout error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const clearError = () => {
    setError(null);
  };
  
  const refreshUser = async () => {
    console.log('[AuthContext] refreshUser called.');
    await fetchAndSetCurrentUser();
  };


  return (
    <AuthContext.Provider value={{ user, isLoading, error, login, signup, logout, clearError, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};


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

const MOCK_STORAGE_KEY = 'MOCK_USER_UUID';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const attemptAutoLogin = async () => {
      setIsLoading(true);
      try {
        const storedUserUuid = localStorage.getItem(MOCK_STORAGE_KEY);
        if (storedUserUuid) {
          console.log('[AuthContext] Found stored UUID:', storedUserUuid, "Attempting to refresh session.");
          const refreshedUser = await authService.refreshCurrentUserStateFromDb(storedUserUuid);
          if (refreshedUser) {
            setUser(refreshedUser);
            console.log('[AuthContext] Mock session re-established for:', refreshedUser.name);
          } else {
            console.log('[AuthContext] Failed to re-establish mock session, clearing stored UUID.');
            localStorage.removeItem(MOCK_STORAGE_KEY);
            // Optionally redirect to login if auto-login fails and no user is set
            // router.push('/login'); 
          }
        } else {
           console.log('[AuthContext] No stored UUID found for mock session.');
        }
      } catch (e) {
        console.error('[AuthContext] Error during mock auto-login:', e);
        localStorage.removeItem(MOCK_STORAGE_KEY);
      } finally {
        setIsLoading(false);
      }
    };
    attemptAutoLogin();
  }, []); // Run only once on mount

  const login = async (email: string, password?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const loggedInUser = await authService.login(email, password);
      if (loggedInUser) {
        setUser(loggedInUser);
        localStorage.setItem(MOCK_STORAGE_KEY, loggedInUser.uuid);
        console.log('[AuthContext] Login successful, MOCK_USER_UUID set in localStorage and global:', loggedInUser.uuid);
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
        localStorage.setItem(MOCK_STORAGE_KEY, newUser.uuid);
        console.log('[AuthContext] Signup successful, MOCK_USER_UUID set in localStorage and global:', newUser.uuid);
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
      await authService.logout(); // This will clear the global MOCK_CURRENT_USER_UUID
      setUser(null);
      localStorage.removeItem(MOCK_STORAGE_KEY);
      console.log('[AuthContext] Logout successful, MOCK_USER_UUID cleared from localStorage and global.');
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
    const currentUserUuid = user?.uuid || localStorage.getItem(MOCK_STORAGE_KEY);
    if (currentUserUuid) {
      setIsLoading(true);
      console.log('[AuthContext] Refreshing user state for UUID:', currentUserUuid);
      try {
        const updatedUser = await authService.refreshCurrentUserStateFromDb(currentUserUuid);
        if (updatedUser) {
          setUser(updatedUser);
           console.log('[AuthContext] User state refreshed for:', updatedUser.name);
        } else {
          setUser(null); 
          localStorage.removeItem(MOCK_STORAGE_KEY);
          console.log('[AuthContext] Failed to refresh user, user removed or session invalid. Clearing mock session.');
          // router.push('/login'); // Consider if this redirect is too aggressive here
        }
      } catch (e) {
        console.error("[AuthContext] Failed to refresh user:", e);
        setUser(null);
        localStorage.removeItem(MOCK_STORAGE_KEY);
        // router.push('/login');
      } finally {
        setIsLoading(false);
      }
    } else {
        console.log("[AuthContext] refreshUser called but no user UUID available in state or localStorage.");
    }
  }, [user?.uuid, router]);


  return (
    <AuthContext.Provider value={{ user, isLoading, error, login, signup, logout, clearError, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

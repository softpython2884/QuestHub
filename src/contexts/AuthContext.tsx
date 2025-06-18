
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
  const router = useRouter(); // router can be used for navigation if needed

  // Attempt to re-establish session on initial load or page refresh
  useEffect(() => {
    const attemptAutoLogin = async () => {
      console.log('[AuthContext] Attempting auto-login / session refresh...');
      setIsLoading(true);
      try {
        const storedUserUuid = localStorage.getItem(MOCK_STORAGE_KEY);
        if (storedUserUuid) {
          console.log('[AuthContext] Found stored UUID in localStorage:', storedUserUuid, ". Attempting to refresh session from DB.");
          const refreshedUser = await authService.refreshCurrentUserStateFromDb(storedUserUuid); // This should also set global.MOCK_CURRENT_USER_UUID
          if (refreshedUser) {
            setUser(refreshedUser);
            console.log('[AuthContext] Mock session RE-ESTABLISHED for:', refreshedUser.name, '(UUID:', refreshedUser.uuid, ')');
          } else {
            console.log('[AuthContext] Failed to re-establish mock session via refreshCurrentUserStateFromDb. Clearing stored UUID and global mock.');
            localStorage.removeItem(MOCK_STORAGE_KEY);
            if (typeof global !== 'undefined') {
                (global as any).MOCK_CURRENT_USER_UUID = null;
            }
            setUser(null); // Ensure user state is also cleared
          }
        } else {
           console.log('[AuthContext] No stored UUID found in localStorage for mock session. Ensuring global mock is null.');
            if (typeof global !== 'undefined') {
                (global as any).MOCK_CURRENT_USER_UUID = null;
            }
        }
      } catch (e) {
        console.error('[AuthContext] Error during mock auto-login/refresh attempt:', e);
        localStorage.removeItem(MOCK_STORAGE_KEY);
        if (typeof global !== 'undefined') {
            (global as any).MOCK_CURRENT_USER_UUID = null;
        }
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    attemptAutoLogin();
  }, []); // Empty dependency array: run only once on mount


  const login = async (email: string, password?: string) => {
    setIsLoading(true);
    setError(null);
    console.log('[AuthContext] login called for email:', email);
    try {
      const loggedInUser = await authService.login(email, password); 
      if (loggedInUser) {
        setUser(loggedInUser);
        localStorage.setItem(MOCK_STORAGE_KEY, loggedInUser.uuid);
        console.log('[AuthContext] Login successful. User set in context. MOCK_USER_UUID set in localStorage and global:', loggedInUser.uuid);
        router.push('/dashboard');
      } else {
        setError('Invalid email or password.');
        if (typeof global !== 'undefined') {
            (global as any).MOCK_CURRENT_USER_UUID = null; 
        }
        console.log('[AuthContext] Login failed (user not returned from authService).');
      }
    } catch (e: any) {
      setError(e.message || 'Login failed. Please try again.');
      if (typeof global !== 'undefined') {
            (global as any).MOCK_CURRENT_USER_UUID = null; 
      }
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
        localStorage.setItem(MOCK_STORAGE_KEY, newUser.uuid);
        console.log('[AuthContext] Signup successful. User set in context. MOCK_USER_UUID set in localStorage and global:', newUser.uuid);
        router.push('/dashboard');
      } else {
         setError('Signup failed. Please try again.');
         if (typeof global !== 'undefined') {
            (global as any).MOCK_CURRENT_USER_UUID = null; 
        }
        console.log('[AuthContext] Signup failed (user not returned from authService).');
      }
    } catch (e: any) {
      setError(e.message || 'Signup failed. Please try again.');
      if (typeof global !== 'undefined') {
            (global as any).MOCK_CURRENT_USER_UUID = null; 
      }
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
      localStorage.removeItem(MOCK_STORAGE_KEY);
      console.log('[AuthContext] Logout successful. User context cleared. MOCK_USER_UUID cleared from localStorage and global.');
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
  
  const refreshUser = useCallback(async () => {
    const currentUserUuid = user?.uuid || localStorage.getItem(MOCK_STORAGE_KEY);
    console.log('[AuthContext] refreshUser called. Current/Stored UUID:', currentUserUuid);
    if (currentUserUuid) {
      setIsLoading(true);
      try {
        const updatedUser = await authService.refreshCurrentUserStateFromDb(currentUserUuid);
        if (updatedUser) {
          setUser(updatedUser);
           console.log('[AuthContext] User state refreshed for:', updatedUser.name, '(UUID:', updatedUser.uuid, ') global.MOCK_CURRENT_USER_UUID should be set.');
        } else {
          setUser(null); 
          localStorage.removeItem(MOCK_STORAGE_KEY);
          if (typeof global !== 'undefined') {
                (global as any).MOCK_CURRENT_USER_UUID = null;
          }
          console.log('[AuthContext] Failed to refresh user from DB, user removed from context and localStorage. Global mock cleared.');
        }
      } catch (e) {
        console.error("[AuthContext] Failed to refresh user state:", e);
        setUser(null);
        localStorage.removeItem(MOCK_STORAGE_KEY);
         if (typeof global !== 'undefined') {
            (global as any).MOCK_CURRENT_USER_UUID = null;
        }
      } finally {
        setIsLoading(false);
      }
    } else {
        console.log("[AuthContext] refreshUser called but no user UUID available in state or localStorage. Ensuring global mock is null.");
         if (typeof global !== 'undefined') {
            (global as any).MOCK_CURRENT_USER_UUID = null;
        }
    }
  }, [user?.uuid]);


  return (
    <AuthContext.Provider value={{ user, isLoading, error, login, signup, logout, clearError, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

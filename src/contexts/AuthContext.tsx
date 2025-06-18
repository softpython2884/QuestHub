
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
      console.log('[AuthContext] Attempting auto-login...');
      setIsLoading(true);
      try {
        const storedUserUuid = localStorage.getItem(MOCK_STORAGE_KEY);
        if (storedUserUuid) {
          console.log('[AuthContext] Found stored UUID in localStorage:', storedUserUuid, "Attempting to refresh session from DB.");
          // This call will also attempt to set the global mock UUID
          const refreshedUser = await authService.refreshCurrentUserStateFromDb(storedUserUuid);
          if (refreshedUser) {
            setUser(refreshedUser);
            console.log('[AuthContext] Mock session re-established for:', refreshedUser.name, '(UUID:', refreshedUser.uuid, ')');
          } else {
            console.log('[AuthContext] Failed to re-establish mock session via refreshCurrentUserStateFromDb, clearing stored UUID.');
            localStorage.removeItem(MOCK_STORAGE_KEY);
             if (typeof global !== 'undefined') { // Also ensure global is cleared if DB refresh fails
                (global as any).MOCK_CURRENT_USER_UUID = null;
                console.log('[AuthContext] Cleared global.MOCK_CURRENT_USER_UUID due to failed DB refresh.');
            }
          }
        } else {
           console.log('[AuthContext] No stored UUID found in localStorage for mock session.');
           if (typeof global !== 'undefined') { // Ensure global is null if nothing in local storage
                (global as any).MOCK_CURRENT_USER_UUID = null;
                console.log('[AuthContext] Initializing: No user in localStorage, global.MOCK_CURRENT_USER_UUID ensured to be null.');
            }
        }
      } catch (e) {
        console.error('[AuthContext] Error during mock auto-login attempt:', e);
        localStorage.removeItem(MOCK_STORAGE_KEY);
        if (typeof global !== 'undefined') {
            (global as any).MOCK_CURRENT_USER_UUID = null;
            console.log('[AuthContext] Cleared global.MOCK_CURRENT_USER_UUID due to error during auto-login.');
        }
      } finally {
        setIsLoading(false);
      }
    };
    attemptAutoLogin();
  }, []); 

  const login = async (email: string, password?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const loggedInUser = await authService.login(email, password); // This sets the global mock UUID
      if (loggedInUser) {
        setUser(loggedInUser);
        localStorage.setItem(MOCK_STORAGE_KEY, loggedInUser.uuid);
        console.log('[AuthContext] Login successful. User set in context. MOCK_USER_UUID set in localStorage:', loggedInUser.uuid);
        router.push('/dashboard');
      } else {
        setError('Invalid email or password.');
         if (typeof global !== 'undefined') {
            (global as any).MOCK_CURRENT_USER_UUID = null; // Clear global if login fails
            console.log('[AuthContext] Login failed, cleared global.MOCK_CURRENT_USER_UUID.');
        }
      }
    } catch (e: any) {
      setError(e.message || 'Login failed. Please try again.');
       if (typeof global !== 'undefined') {
            (global as any).MOCK_CURRENT_USER_UUID = null; // Clear global on error
            console.log('[AuthContext] Login error, cleared global.MOCK_CURRENT_USER_UUID.');
        }
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (name: string, email: string, password?: string, role: UserRole = 'member') => {
    setIsLoading(true);
    setError(null);
    try {
      const newUser = await authService.signup(name, email, password, role); // This sets the global mock UUID
      if (newUser) {
        setUser(newUser);
        localStorage.setItem(MOCK_STORAGE_KEY, newUser.uuid);
        console.log('[AuthContext] Signup successful. User set in context. MOCK_USER_UUID set in localStorage:', newUser.uuid);
        router.push('/dashboard');
      } else {
         setError('Signup failed. Please try again.');
         if (typeof global !== 'undefined') {
            (global as any).MOCK_CURRENT_USER_UUID = null; // Clear global if signup fails
             console.log('[AuthContext] Signup failed, cleared global.MOCK_CURRENT_USER_UUID.');
        }
      }
    } catch (e: any) {
      setError(e.message || 'Signup failed. Please try again.');
      if (typeof global !== 'undefined') {
            (global as any).MOCK_CURRENT_USER_UUID = null; // Clear global on error
            console.log('[AuthContext] Signup error, cleared global.MOCK_CURRENT_USER_UUID.');
        }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await authService.logout(); // This clears the global MOCK_CURRENT_USER_UUID
      setUser(null);
      localStorage.removeItem(MOCK_STORAGE_KEY);
      console.log('[AuthContext] Logout successful. User context cleared. MOCK_USER_UUID cleared from localStorage.');
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
      console.log('[AuthContext] Refreshing user state for UUID (from user state or localStorage):', currentUserUuid);
      try {
        // This call will also attempt to set the global mock UUID
        const updatedUser = await authService.refreshCurrentUserStateFromDb(currentUserUuid);
        if (updatedUser) {
          setUser(updatedUser);
           console.log('[AuthContext] User state refreshed for:', updatedUser.name, '(UUID:', updatedUser.uuid, ')');
        } else {
          setUser(null); 
          localStorage.removeItem(MOCK_STORAGE_KEY);
          console.log('[AuthContext] Failed to refresh user from DB, user removed from context and localStorage.');
           if (typeof global !== 'undefined') {
                (global as any).MOCK_CURRENT_USER_UUID = null;
                console.log('[AuthContext] Cleared global.MOCK_CURRENT_USER_UUID during failed refreshUser.');
            }
        }
      } catch (e) {
        console.error("[AuthContext] Failed to refresh user state:", e);
        setUser(null);
        localStorage.removeItem(MOCK_STORAGE_KEY);
         if (typeof global !== 'undefined') {
            (global as any).MOCK_CURRENT_USER_UUID = null;
            console.log('[AuthContext] Cleared global.MOCK_CURRENT_USER_UUID due to error in refreshUser.');
        }
      } finally {
        setIsLoading(false);
      }
    } else {
        console.log("[AuthContext] refreshUser called but no user UUID available in state or localStorage. Ensuring global is null.");
         if (typeof global !== 'undefined') {
            (global as any).MOCK_CURRENT_USER_UUID = null;
        }
    }
  }, [user?.uuid, router]); // router removed from dependencies as it's stable, user?.uuid is the key reactive part


  return (
    <AuthContext.Provider value={{ user, isLoading, error, login, signup, logout, clearError, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

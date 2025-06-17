import type { User, UserRole } from '@/types';

const MOCK_USERS_STORAGE_KEY = 'nqh_mock_users';
const CURRENT_USER_STORAGE_KEY = 'nqh_current_user';

// Helper to get users from localStorage
const getMockUsers = (): User[] => {
  if (typeof window === 'undefined') return [];
  const usersJson = localStorage.getItem(MOCK_USERS_STORAGE_KEY);
  return usersJson ? JSON.parse(usersJson) : [];
};

// Helper to save users to localStorage
const saveMockUsers = (users: User[]) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(MOCK_USERS_STORAGE_KEY, JSON.stringify(users));
};

// Initialize with a default admin user if none exist
if (typeof window !== 'undefined' && getMockUsers().length === 0) {
  const defaultAdmin: User = {
    id: 'admin-user-01',
    email: 'admin@nationquest.com',
    name: 'Admin User',
    role: 'admin',
    avatar: 'https://placehold.co/100x100.png?text=AU'
  };
  const defaultMember: User = {
    id: 'member-user-01',
    email: 'member@nationquest.com',
    name: 'Member User',
    role: 'member',
    avatar: 'https://placehold.co/100x100.png?text=MU'
  };
  saveMockUsers([defaultAdmin, defaultMember]);
}


export const login = async (email: string, password?: string): Promise<User | null> => {
  // In a real app, password would be used and sent to a backend.
  // Here, we just find the user by email for mock purposes.
  await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
  const users = getMockUsers();
  const user = users.find(u => u.email === email);

  if (user) {
    if (typeof window !== 'undefined') {
      localStorage.setItem(CURRENT_USER_STORAGE_KEY, JSON.stringify(user));
    }
    return user;
  }
  return null;
};

export const signup = async (name: string, email: string, role: UserRole = 'member'): Promise<User | null> => {
  await new Promise(resolve => setTimeout(resolve, 500));
  const users = getMockUsers();
  if (users.some(u => u.email === email)) {
    throw new Error('User with this email already exists.');
  }

  const newUser: User = {
    id: `user-${Date.now()}`,
    name,
    email,
    role,
    avatar: `https://placehold.co/100x100.png?text=${name.substring(0,2).toUpperCase()}`
  };
  
  users.push(newUser);
  saveMockUsers(users);
  
  if (typeof window !== 'undefined') {
    localStorage.setItem(CURRENT_USER_STORAGE_KEY, JSON.stringify(newUser));
  }
  return newUser;
};

export const logout = async (): Promise<void> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  if (typeof window !== 'undefined') {
    localStorage.removeItem(CURRENT_USER_STORAGE_KEY);
  }
};

export const getCurrentUser = (): User | null => {
  if (typeof window === 'undefined') return null;
  const userJson = localStorage.getItem(CURRENT_USER_STORAGE_KEY);
  return userJson ? JSON.parse(userJson) : null;
};

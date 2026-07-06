import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { UserRole } from '@fixr/shared';

interface AuthUser {
  id: string;
  name: string;
  phone: string;
  role: UserRole;
  avatarUrl?: string;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  isLoading: boolean;
  profileRefreshKey: number;
  initialize: () => Promise<void>;
  setAuth: (user: AuthUser, accessToken: string, refreshToken: string) => Promise<void>;
  updateUser: (updates: Partial<AuthUser>) => Promise<void>;
  clearAuth: () => Promise<void>;
  bumpProfileRefresh: () => void;
}

const ACCESS_TOKEN_KEY = 'fixr_access_token';
const REFRESH_TOKEN_KEY = 'fixr_refresh_token';
const USER_KEY = 'fixr_user';

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isLoading: true,
  profileRefreshKey: 0,

  initialize: async () => {
    try {
      const [token, userJson] = await Promise.all([
        SecureStore.getItemAsync(ACCESS_TOKEN_KEY),
        SecureStore.getItemAsync(USER_KEY),
      ]);
      if (token && userJson) {
        set({ user: JSON.parse(userJson), accessToken: token });
      }
    } catch {
      // corrupted storage — clear it
    } finally {
      set({ isLoading: false });
    }
  },

  setAuth: async (user, accessToken, refreshToken) => {
    await Promise.all([
      SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken),
      SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken),
      SecureStore.setItemAsync(USER_KEY, JSON.stringify(user)),
    ]);
    set({ user, accessToken });
  },

  updateUser: async (updates) => {
    set((state) => {
      if (!state.user) return {};
      const updated = { ...state.user, ...updates };
      SecureStore.setItemAsync(USER_KEY, JSON.stringify(updated));
      return { user: updated };
    });
  },

  clearAuth: async () => {
    await Promise.all([
      SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
      SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
      SecureStore.deleteItemAsync(USER_KEY),
    ]);
    set({ user: null, accessToken: null });
  },

  bumpProfileRefresh: () => set((s) => ({ profileRefreshKey: s.profileRefreshKey + 1 })),
}));

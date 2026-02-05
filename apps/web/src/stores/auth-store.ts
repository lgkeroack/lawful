import { create } from 'zustand';
import type { User } from '@lexvault/shared';
import { api, setAccessToken } from '../services/api';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthActions {
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState & AuthActions>()((set) => ({
  // ── State ──────────────────────────────────────────────────────────
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isLoading: false,

  // ── Actions ────────────────────────────────────────────────────────

  login: async (email: string, password: string) => {
    set({ isLoading: true });
    try {
      const response = await api.login(email, password);
      setAccessToken(response.accessToken);
      set({
        user: response.user,
        accessToken: response.accessToken,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  register: async (email: string, password: string, displayName: string) => {
    set({ isLoading: true });
    try {
      const response = await api.register(email, password, displayName);
      setAccessToken(response.accessToken);
      set({
        user: response.user,
        accessToken: response.accessToken,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: () => {
    setAccessToken(null);
    set({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,
    });
  },

  refreshToken: async () => {
    set({ isLoading: true });
    try {
      const response = await api.refreshToken();
      setAccessToken(response.accessToken);
      set({
        accessToken: response.accessToken,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch {
      setAccessToken(null);
      set({
        user: null,
        accessToken: null,
        isAuthenticated: false,
        isLoading: false,
      });
      throw new Error('Session expired');
    }
  },

  setUser: (user: User) => {
    set({ user });
  },
}));

import { create } from 'zustand';
import type { User, LoginRequest, RegisterRequest, AuthResponse } from '@lexterrae/shared';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  login: (credentials: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => void;
  setAuth: (response: AuthResponse) => void;
  clearError: () => void;
  refreshToken: () => Promise<void>;
}

const API_BASE = '/api';

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: localStorage.getItem('accessToken'),
  isAuthenticated: !!localStorage.getItem('accessToken'),
  isLoading: false,
  error: null,

  login: async (credentials: LoginRequest) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Login failed' }));
        throw new Error(err.detail || 'Login failed');
      }
      const data: AuthResponse = await res.json();
      get().setAuth(data);
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Login failed', isLoading: false });
      throw err;
    }
  },

  register: async (data: RegisterRequest) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Registration failed' }));
        throw new Error(err.detail || 'Registration failed');
      }
      const authData: AuthResponse = await res.json();
      get().setAuth(authData);
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Registration failed', isLoading: false });
      throw err;
    }
  },

  logout: () => {
    localStorage.removeItem('accessToken');
    set({ user: null, accessToken: null, isAuthenticated: false, error: null });
  },

  setAuth: (response: AuthResponse) => {
    localStorage.setItem('accessToken', response.accessToken);
    set({
      user: response.user,
      accessToken: response.accessToken,
      isAuthenticated: true,
      isLoading: false,
      error: null,
    });
  },

  clearError: () => set({ error: null }),

  refreshToken: async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) {
        get().logout();
        return;
      }
      const data = await res.json();
      localStorage.setItem('accessToken', data.accessToken);
      set({ accessToken: data.accessToken });
    } catch {
      get().logout();
    }
  },
}));

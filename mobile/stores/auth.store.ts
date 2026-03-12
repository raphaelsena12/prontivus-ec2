import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

const SESSION_TOKEN_KEY = 'nextauth_session_token';

interface AuthUser {
  id: string;
  nome: string;
  email: string;
  clinicaId?: string;
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  isLoading: boolean;
  setToken: (token: string) => Promise<void>;
  setUser: (user: AuthUser) => void;
  loadToken: () => Promise<void>;
  clearAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  isLoading: true,

  setToken: async (token: string) => {
    await SecureStore.setItemAsync(SESSION_TOKEN_KEY, token);
    set({ token });
  },

  setUser: (user: AuthUser) => {
    set({ user });
  },

  loadToken: async () => {
    try {
      const token = await SecureStore.getItemAsync(SESSION_TOKEN_KEY);
      set({ token, isLoading: false });
    } catch {
      set({ token: null, isLoading: false });
    }
  },

  clearAuth: async () => {
    await SecureStore.deleteItemAsync(SESSION_TOKEN_KEY);
    set({ token: null, user: null });
  },
}));
